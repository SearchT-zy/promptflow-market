"""模板 CRUD + 版本管理（创作者）。"""
import re
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import error_json, get_current_user
from ..models import Category, Template, TemplateVariable, TemplateVersion, User
from ..render import validate_variable_name
from ..schemas import PublishVersionIn, RollbackIn, TemplateIn
from ..sensitive import scan_template
from ..serializers import template_to_dict, works_item
from ..snapshots import (
    build_snapshot,
    compare_semver,
    create_version,
    get_snapshot_by_version,
    next_version,
)

router = APIRouter(prefix="/templates", tags=["templates"])

SLUG_OK_RE = re.compile(r"[a-z0-9-]")


def _gen_slug(db: Session, title: str) -> str:
    base = re.sub(r"[^a-z0-9]+", "-", title.lower()).strip("-")[:60]
    if not base:
        base = "t"
    slug, i = base, 0
    while db.execute(select(Template).where(Template.slug == slug)).scalar_one_or_none():
        i += 1
        slug = f"{base}-{i}"
    return slug[:120]


def _normalize_steps(steps: list[dict]) -> dict:
    """steps 输入 → steps_json（分配 id/order）。"""
    out = []
    for i, s in enumerate(steps, start=1):
        out.append(
            {
                "id": s.get("id") or f"s{i}",
                "order": i,
                "title": s.get("title", f"步骤 {i}"),
                "prompt": s.get("prompt", ""),
                "model_hint": s.get("model_hint"),
                "temperature": s.get("temperature") if s.get("temperature") is not None else None,
                "output_format": s.get("output_format", "markdown"),
            }
        )
    links = [{"from": out[i]["id"], "to": out[i + 1]["id"], "kind": "linear"} for i in range(len(out) - 1)]
    return {"schema_version": "1.0", "steps": out, "links": links}


def _set_variables(db: Session, template_id: str, variables: list[dict]) -> list[dict]:
    """整体替换草稿变量（version='draft'），返回错误列表。"""
    from ..render import validate_variables

    errors = validate_variables(variables)
    if errors:
        return errors
    db.execute(delete(TemplateVariable).where(TemplateVariable.template_id == template_id))
    for i, v in enumerate(variables):
        db.add(
            TemplateVariable(
                template_id=template_id,
                version="draft",
                name=v["name"],
                label=v.get("label") or v["name"],
                description=v.get("description") or "",
                var_type=v.get("var_type", "string"),
                default_value=None if v.get("default_value") is None else str(v["default_value"]),
                options_json=v.get("options") or None,
                required=bool(v.get("required", True)),
                sort_order=v.get("sort_order", i),
            )
        )
    return []


def _get_owned_template(db: Session, template_id: str, user: User) -> Template:
    t = db.get(Template, template_id)
    if t is None:
        raise error_json("NOT_FOUND", "模板不存在", http_status=404)
    if t.author_id != user.id and user.role != "admin":
        raise error_json("FORBIDDEN", "无权操作该模板", http_status=403)
    return t


@router.post("", status_code=201)
def create_template(body: TemplateIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if not body.steps:
        raise error_json("NO_STEPS", "至少需要一个步骤")
    if body.template_type == "single" and len(body.steps) > 1:
        raise error_json("SINGLE_ONE_STEP", "单条模板只允许一个步骤")

    # 变量名校验
    var_errs = []
    seen = set()
    for v in body.variables:
        reason = validate_variable_name(v.name)
        if reason:
            var_errs.append({"name": v.name, "reason": reason})
        elif v.name in seen:
            var_errs.append({"name": v.name, "reason": "duplicate"})
        seen.add(v.name)
    if var_errs:
        raise error_json("INVALID_VARIABLE", "变量定义不合法", var_errs)

    category = None
    if body.category:
        category = db.execute(select(Category).where(Category.slug == body.category)).scalar_one_or_none()
        if category is None:
            raise error_json("BAD_CATEGORY", "分类不存在")

    t = Template(
        id=str(uuid.uuid4()),
        slug=_gen_slug(db, body.title),
        author_id=user.id,
        title=body.title,
        summary=body.summary,
        category_id=category.id if category else None,
        template_type=body.template_type,
        steps_json=_normalize_steps([s.model_dump() for s in body.steps]),
        doc_md=body.doc_md,
        sample_output=body.sample_output,
        model_tags=body.model_tags,
        price_cents=body.price_cents if body.price_cents else 0,
        status="draft",
        step_count=len(body.steps),
    )
    db.add(t)
    db.flush()
    _set_variables(db, t.id, [v.model_dump() for v in body.variables])
    if user.role == "user":  # 首次创作自动升级创作者
        user.role = "creator"
    db.commit()
    db.refresh(t)
    return template_to_dict(db, t, include_draft=True)


@router.get("/mine")
def my_templates(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    rows = (
        db.execute(
            select(Template)
            .where(Template.author_id == user.id)
            .order_by(Template.updated_at.desc())
        )
        .scalars()
        .all()
    )
    return {"items": [works_item(db, t) for t in rows]}


@router.get("/{template_id}")
def get_template(template_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    t = _get_owned_template(db, template_id, user)
    return template_to_dict(db, t, include_draft=True)


@router.put("/{template_id}")
def update_template(
    template_id: str, body: TemplateIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    t = _get_owned_template(db, template_id, user)
    if t.status == "reviewing":
        raise error_json("REVIEW_LOCKED", "模板审核中，不能编辑", http_status=409)
    if not body.steps:
        raise error_json("NO_STEPS", "至少需要一个步骤")
    if body.template_type == "single" and len(body.steps) > 1:
        raise error_json("SINGLE_ONE_STEP", "单条模板只允许一个步骤")

    var_errs = []
    seen = set()
    for v in body.variables:
        reason = validate_variable_name(v.name)
        if reason:
            var_errs.append({"name": v.name, "reason": reason})
        elif v.name in seen:
            var_errs.append({"name": v.name, "reason": "duplicate"})
        seen.add(v.name)
    if var_errs:
        raise error_json("INVALID_VARIABLE", "变量定义不合法", var_errs)

    category = None
    if body.category:
        category = db.execute(select(Category).where(Category.slug == body.category)).scalar_one_or_none()
        if category is None:
            raise error_json("BAD_CATEGORY", "分类不存在")

    t.title = body.title
    t.summary = body.summary
    t.category_id = category.id if category else None
    t.steps_json = _normalize_steps([s.model_dump() for s in body.steps])
    t.doc_md = body.doc_md
    t.sample_output = body.sample_output
    t.model_tags = body.model_tags
    t.price_cents = body.price_cents if body.price_cents else 0
    t.step_count = len(body.steps)
    if t.status == "rejected":
        t.review_note = None
    _set_variables(db, t.id, [v.model_dump() for v in body.variables])
    db.commit()
    db.refresh(t)
    return template_to_dict(db, t, include_draft=True)


@router.delete("/{template_id}", status_code=204)
def delete_template(template_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    t = _get_owned_template(db, template_id, user)
    if t.status not in ("draft", "rejected"):
        raise error_json("CANNOT_DELETE", "仅草稿/被驳回模板可删除", http_status=409)
    # 清理关联数据（SQLite 无级联删除）
    from ..models import Favorite, ShareLink, TemplateVersion, UsageLog

    for model in (TemplateVersion, TemplateVariable, Favorite, ShareLink, UsageLog):
        db.execute(delete(model).where(model.template_id == t.id))
    db.delete(t)
    db.commit()


# ---------- 版本 ----------

@router.post("/{template_id}/versions", status_code=201)
def publish_version(
    template_id: str, body: PublishVersionIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    t = _get_owned_template(db, template_id, user)
    if t.status == "reviewing":
        raise error_json("REVIEW_LOCKED", "模板审核中，不能发布版本", http_status=409)
    if compare_semver(body.version, t.current_version) <= 0:
        raise error_json(
            "INVALID_VERSION",
            f"新版本号必须大于当前版本 {t.current_version}（semver 格式 x.y.z）",
        )
    existing = db.execute(
        select(TemplateVersion).where(
            TemplateVersion.template_id == t.id, TemplateVersion.version == body.version
        )
    ).scalar_one_or_none()
    if existing:
        raise error_json("INVALID_VERSION", "该版本号已存在")
    if not body.changelog.strip():
        raise error_json("CHANGELOG_REQUIRED", "修改说明（changelog）必填")
    row = create_version(db, t, body.version, body.changelog)
    return {
        "version": row.version,
        "changelog": row.changelog,
        "published_at": row.published_at.isoformat(),
        "status": t.status,
    }


@router.get("/{template_id}/versions")
def list_versions(template_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    t = _get_owned_template(db, template_id, user)
    rows = (
        db.execute(
            select(TemplateVersion)
            .where(TemplateVersion.template_id == t.id)
            .order_by(TemplateVersion.published_at.desc())
        )
        .scalars()
        .all()
    )
    return {
        "items": [
            {"version": v.version, "changelog": v.changelog, "published_at": v.published_at.isoformat()}
            for v in rows
        ]
    }


@router.post("/{template_id}/rollback", status_code=201)
def rollback_version(
    template_id: str, body: RollbackIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    t = _get_owned_template(db, template_id, user)
    if compare_semver(body.version, t.current_version) >= 0:
        raise error_json("INVALID_VERSION", "只能回滚到更早的版本")
    snap = get_snapshot_by_version(db, t.id, body.version)
    if snap is None:
        raise error_json("NOT_FOUND", "目标版本不存在", http_status=404)
    # 回滚 = 以旧版本内容创建新版本，不删除历史
    new_ver = next_version(t.current_version)
    changelog = body.changelog or f"回滚至 {body.version}"
    row = create_version(db, t, new_ver, changelog)
    return {"version": row.version, "changelog": row.changelog, "published_at": row.published_at.isoformat()}


def _lcs_diff(a: list[str], b: list[str]) -> list[dict]:
    """简单 LCS 逐行 diff。"""
    n, m = len(a), len(b)
    dp = [[0] * (m + 1) for _ in range(n + 1)]
    for i in range(n - 1, -1, -1):
        for j in range(m - 1, -1, -1):
            dp[i][j] = dp[i + 1][j + 1] + 1 if a[i] == b[j] else max(dp[i + 1][j], dp[i][j + 1])
    out, i, j = [], 0, 0
    while i < n and j < m:
        if a[i] == b[j]:
            out.append({"type": "same", "text": a[i]})
            i, j = i + 1, j + 1
        elif dp[i + 1][j] >= dp[i][j + 1]:
            out.append({"type": "del", "text": a[i]})
            i += 1
        else:
            out.append({"type": "add", "text": b[j]})
            j += 1
    out += [{"type": "del", "text": x} for x in a[i:]]
    out += [{"type": "add", "text": x} for x in b[j:]]
    return out


def _snapshot_to_lines(snap: dict) -> list[str]:
    import json

    blob = {
        "title": snap.get("title"),
        "summary": snap.get("summary"),
        "doc_md": snap.get("doc_md"),
        "steps": snap.get("steps"),
        "variables": snap.get("variables"),
    }
    return json.dumps(blob, ensure_ascii=False, indent=2).splitlines()


@router.get("/{template_id}/diff")
def diff_versions(
    template_id: str,
    frm: str = Query(..., alias="from"),
    to: str = Query(...),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    t = _get_owned_template(db, template_id, user)
    a = get_snapshot_by_version(db, t.id, frm)
    b = get_snapshot_by_version(db, t.id, to)
    if a is None or b is None:
        raise error_json("NOT_FOUND", "对比版本不存在", http_status=404)
    return {"lines": _lcs_diff(_snapshot_to_lines(a), _snapshot_to_lines(b))}


# ---------- 状态流转 ----------

@router.post("/{template_id}/submit")
def submit_review(template_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    t = _get_owned_template(db, template_id, user)
    if t.status not in ("draft", "rejected", "offline"):
        raise error_json("BAD_STATUS", f"当前状态 {t.status} 不可提交审核", http_status=409)
    hits = scan_template(build_snapshot(db, t))
    if hits:
        raise error_json("CONTENT_REJECTED", "内容命中敏感词/违规规则，请修改后重试", hits)
    t.status = "reviewing"
    t.review_note = None
    db.commit()
    return {"status": t.status}


@router.post("/{template_id}/offline")
def offline_template(template_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    t = _get_owned_template(db, template_id, user)
    if t.status != "published":
        raise error_json("BAD_STATUS", "仅已上架模板可下架", http_status=409)
    t.status = "offline"
    db.commit()
    return {"status": t.status}
