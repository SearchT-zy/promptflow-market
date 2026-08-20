"""后台管理：审核队列 / 模板管理 / 用户管理 / 分类 / 标签 / 审计日志（PRD 3.5）。"""
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import error_json, get_admin
from ..models import (
    AdminAuditLog,
    Category,
    Tag,
    Template,
    TemplateTag,
    UsageLog,
    User,
)
from ..schemas import CategoryIn, ReviewActionIn, StatusIn, UserUpdateIn
from ..sensitive import scan_template
from ..serializers import category_to_dict, template_to_dict, user_to_dict
from ..snapshots import build_snapshot

router = APIRouter(prefix="/admin", tags=["admin"])


def _audit(db: Session, admin: User, action: str, target_type: str | None, target_id: str | None, detail: dict | None):
    db.add(
        AdminAuditLog(
            admin_id=admin.id,
            action=action,
            target_type=target_type,
            target_id=target_id,
            detail_json=detail,
        )
    )


# ---------- 审核 ----------

@router.get("/review/queue")
def review_queue(admin: User = Depends(get_admin), db: Session = Depends(get_db)):
    rows = (
        db.execute(
            select(Template)
            .where(Template.status == "reviewing")
            .order_by(Template.updated_at.asc())
        )
        .scalars()
        .all()
    )
    return {
        "items": [
            {
                "id": t.id,
                "slug": t.slug,
                "title": t.title,
                "category_name": t.category.name if t.category else None,
                "author_name": t.author.display_name or t.author.username,
                "submitted_at": t.updated_at.isoformat(),
            }
            for t in rows
        ]
    }


@router.get("/review/{template_id}")
def review_detail(template_id: str, admin: User = Depends(get_admin), db: Session = Depends(get_db)):
    t = db.get(Template, template_id)
    if t is None:
        raise error_json("NOT_FOUND", "模板不存在", http_status=404)
    d = template_to_dict(db, t, include_draft=True)
    d["scan_hits"] = scan_template(build_snapshot(db, t))
    d["author"] = user_to_dict(t.author)
    return d


@router.post("/review/{template_id}")
def review_action(
    template_id: str, body: ReviewActionIn, admin: User = Depends(get_admin), db: Session = Depends(get_db)
):
    t = db.get(Template, template_id)
    if t is None:
        raise error_json("NOT_FOUND", "模板不存在", http_status=404)
    if t.status != "reviewing":
        raise error_json("BAD_STATUS", "模板不在审核队列中", http_status=409)

    if body.action == "approve":
        # 首次通过：若从未发版，自动以当前草稿生成 1.0.0 快照
        if t.current_version == "0.1.0":
            from ..snapshots import create_version

            create_version(db, t, "1.0.0", "首次发布（审核通过）")
            db.refresh(t)
        t.status = "published"
        t.review_note = None
        if t.published_at is None:
            t.published_at = datetime.now(timezone.utc)
    else:
        if not (body.reason or "").strip():
            raise error_json("REASON_REQUIRED", "驳回必须填写理由")
        t.status = "rejected"
        t.review_note = body.reason
    _audit(db, admin, f"review.{body.action}", "template", t.id, {"reason": body.reason})
    db.commit()
    db.refresh(t)
    return template_to_dict(db, t, include_draft=True)


# ---------- 模板管理 ----------

@router.get("/templates")
def admin_templates(
    status: str | None = Query(default=None, pattern="^(draft|reviewing|published|rejected|offline)$"),
    q: str | None = Query(default=None, max_length=100),
    admin: User = Depends(get_admin),
    db: Session = Depends(get_db),
):
    stmt = select(Template).order_by(Template.updated_at.desc())
    if status:
        stmt = stmt.where(Template.status == status)
    rows = db.execute(stmt).scalars().all()
    if q:
        ql = q.lower()
        rows = [t for t in rows if ql in t.title.lower() or ql in (t.summary or "").lower() or ql in t.slug.lower()]
    return {"items": [template_to_dict(db, t) for t in rows[:200]]}


@router.put("/templates/{template_id}/status")
def admin_set_status(
    template_id: str, body: StatusIn, admin: User = Depends(get_admin), db: Session = Depends(get_db)
):
    t = db.get(Template, template_id)
    if t is None:
        raise error_json("NOT_FOUND", "模板不存在", http_status=404)
    t.status = body.status
    if body.status == "offline":
        t.review_note = body.reason
    else:
        t.review_note = None
        if t.published_at is None:
            t.published_at = datetime.now(timezone.utc)
    _audit(db, admin, f"template.{body.status}", "template", t.id, {"reason": body.reason})
    db.commit()
    return {"status": t.status}


# ---------- 用户管理 ----------

@router.get("/users")
def admin_users(q: str | None = Query(default=None), admin: User = Depends(get_admin), db: Session = Depends(get_db)):
    stmt = select(User).order_by(User.created_at.desc())
    rows = db.execute(stmt).scalars().all()
    if q:
        ql = q.lower()
        rows = [
            u
            for u in rows
            if ql in u.username.lower() or ql in (u.email or "").lower() or ql in (u.display_name or "").lower()
        ]
    return {"items": [user_to_dict(u) for u in rows[:200]]}


@router.put("/users/{user_id}")
def admin_update_user(
    user_id: str, body: UserUpdateIn, admin: User = Depends(get_admin), db: Session = Depends(get_db)
):
    u = db.get(User, user_id)
    if u is None:
        raise error_json("NOT_FOUND", "用户不存在", http_status=404)
    if u.id == admin.id and body.status == "banned":
        raise error_json("BAD_ACTION", "不能封禁自己", http_status=409)
    if body.status is not None:
        u.status = body.status
    if body.role is not None:
        u.role = body.role
    if body.verified is not None:
        u.verified = body.verified
    _audit(db, admin, "user.update", "user", u.id, body.model_dump(exclude_none=True))
    db.commit()
    db.refresh(u)
    return user_to_dict(u)


# ---------- 分类 / 标签 ----------

@router.get("/categories")
def admin_categories(admin: User = Depends(get_admin), db: Session = Depends(get_db)):
    cats = db.execute(select(Category).order_by(Category.sort, Category.id)).scalars().all()
    return {"items": [category_to_dict(c) for c in cats]}


@router.post("/categories", status_code=201)
def admin_create_category(body: CategoryIn, admin: User = Depends(get_admin), db: Session = Depends(get_db)):
    if db.execute(select(Category).where(Category.slug == body.slug)).scalar_one_or_none():
        raise error_json("CONFLICT", "分类 slug 已存在", http_status=409)
    c = Category(slug=body.slug, name=body.name, icon=body.icon, sort=body.sort)
    db.add(c)
    _audit(db, admin, "category.create", "category", None, {"slug": body.slug})
    db.commit()
    db.refresh(c)
    return category_to_dict(c)


@router.put("/categories/{slug}")
def admin_update_category(slug: str, body: CategoryIn, admin: User = Depends(get_admin), db: Session = Depends(get_db)):
    c = db.execute(select(Category).where(Category.slug == slug)).scalar_one_or_none()
    if c is None:
        raise error_json("NOT_FOUND", "分类不存在", http_status=404)
    c.name = body.name
    c.icon = body.icon
    c.sort = body.sort
    _audit(db, admin, "category.update", "category", c.id, {"slug": slug})
    db.commit()
    return category_to_dict(c)


@router.delete("/categories/{slug}", status_code=204)
def admin_delete_category(slug: str, admin: User = Depends(get_admin), db: Session = Depends(get_db)):
    c = db.execute(select(Category).where(Category.slug == slug)).scalar_one_or_none()
    if c is None:
        raise error_json("NOT_FOUND", "分类不存在", http_status=404)
    used = db.execute(select(Template).where(Template.category_id == c.id).limit(1)).scalar_one_or_none()
    if used:
        raise error_json("IN_USE", "分类下仍有模板，无法删除", http_status=409)
    _audit(db, admin, "category.delete", "category", c.id, {"slug": slug})
    db.delete(c)
    db.commit()


@router.get("/tags")
def admin_tags(admin: User = Depends(get_admin), db: Session = Depends(get_db)):
    rows = db.execute(select(Tag).order_by(Tag.use_count.desc())).scalars().all()
    return {"items": [{"id": t.id, "name": t.name, "use_count": t.use_count} for t in rows]}


# ---------- 审计与统计 ----------

@router.get("/audit-logs")
def audit_logs(admin: User = Depends(get_admin), db: Session = Depends(get_db)):
    rows = db.execute(select(AdminAuditLog).order_by(AdminAuditLog.created_at.desc()).limit(200)).scalars().all()
    return {
        "items": [
            {
                "id": r.id,
                "admin_id": r.admin_id,
                "action": r.action,
                "target_type": r.target_type,
                "target_id": r.target_id,
                "detail": r.detail_json,
                "created_at": r.created_at.isoformat(),
            }
            for r in rows
        ]
    }


@router.get("/stats")
def admin_stats(admin: User = Depends(get_admin), db: Session = Depends(get_db)):
    users = db.query(User).count()
    templates = db.query(Template).count()
    published = db.query(Template).filter(Template.status == "published").count()
    reviewing = db.query(Template).filter(Template.status == "reviewing").count()
    renders = db.query(UsageLog).filter(UsageLog.action == "render").count()
    return {
        "users": users,
        "templates": templates,
        "published": published,
        "reviewing": reviewing,
        "renders": renders,
    }
