"""DB 对象 → API 响应字典。"""
from sqlalchemy.orm import Session

from .models import Category, Template, TemplateVersion, User
from .snapshots import build_snapshot, get_live_snapshot


def iso(dt) -> str | None:
    return dt.isoformat() if dt else None


def user_to_dict(u: User) -> dict:
    return {
        "id": u.id,
        "username": u.username,
        "email": u.email,
        "display_name": u.display_name,
        "avatar_url": u.avatar_url,
        "bio": u.bio,
        "role": u.role,
        "verified": bool(u.verified),
        "balance_cents": u.balance_cents,
        "status": u.status,
        "created_at": iso(u.created_at),
    }


def category_to_dict(c: Category, count: int = 0) -> dict:
    return {"slug": c.slug, "name": c.name, "icon": c.icon, "sort": c.sort, "count": count}


def _base_template_fields(db: Session, t: Template) -> dict:
    return {
        "id": t.id,
        "slug": t.slug,
        "title": t.title,
        "summary": t.summary,
        "category": t.category.slug if t.category else None,
        "category_name": t.category.name if t.category else None,
        "template_type": t.template_type,
        "model_tags": t.model_tags or [],
        "price_cents": t.price_cents,
        "status": t.status,
        "current_version": t.current_version,
        "step_count": t.step_count,
        "cover_url": t.cover_url,
        "view_count": t.view_count,
        "render_count": t.render_count,
        "sales_count": t.sales_count,
        "rating_avg": float(t.rating_avg or 0),
        "rating_count": t.rating_count,
        "review_note": t.review_note,
        "created_at": iso(t.created_at),
        "updated_at": iso(t.updated_at),
        "published_at": iso(t.published_at),
    }


def card_from_snapshot(db: Session, t: Template) -> dict:
    """市场卡片：标题等信息取当前版本快照（发布后与草稿可能不同）。"""
    snap = get_live_snapshot(db, t)
    d = _base_template_fields(db, t)
    d.update(
        {
            "title": snap.get("title") or t.title,
            "summary": snap.get("summary") or t.summary,
            "template_type": snap.get("template_type") or t.template_type,
            "model_tags": snap.get("model_tags") or [],
            "price_cents": snap.get("price_cents", t.price_cents),
            "step_count": len(snap.get("steps", [])),
            "author": {
                "id": t.author.id,
                "display_name": t.author.display_name or t.author.username,
                "avatar_url": t.author.avatar_url,
                "verified": bool(t.author.verified),
            },
        }
    )
    return d


def detail_from_snapshot(db: Session, t: Template, can_use: bool = True, censored: bool = False) -> dict:
    """详情页对象。censored 时正文打码（付费未购，MVP 不出现）。"""
    snap = get_live_snapshot(db, t)
    d = card_from_snapshot(db, t)
    d["doc_md"] = snap.get("doc_md", "")
    d["sample_output"] = snap.get("sample_output", "")
    d["variables"] = snap.get("variables", [])
    steps = snap.get("steps", [])
    if censored:
        half = len(steps[0]["prompt"]) // 2 if steps else 0
        third = max(len(steps[0]["prompt"]) // 3, 1) if steps else 1
        masked = [dict(s) for s in steps]
        if steps:
            p = steps[0]["prompt"]
            start, end = half - third // 2, half + third // 2
            masked[0]["prompt"] = p[:start] + "▇" * (end - start) + p[end:]
        steps = masked
    d["steps"] = steps
    d["can_use"] = can_use
    versions = (
        db.query(TemplateVersion)
        .filter(TemplateVersion.template_id == t.id)
        .order_by(TemplateVersion.published_at.desc())
        .all()
    )
    d["versions"] = [
        {"version": v.version, "changelog": v.changelog, "published_at": iso(v.published_at)}
        for v in versions
    ]
    return d


def template_to_dict(db: Session, t: Template, include_draft: bool = False) -> dict:
    """作者视角完整对象（含草稿内容）。"""
    d = _base_template_fields(db, t)
    d["doc_md"] = t.doc_md or ""
    d["sample_output"] = t.sample_output or ""
    if include_draft:
        snap = build_snapshot(db, t)
        d["steps"] = snap.get("steps", [])
        d["variables"] = snap.get("variables", [])
    else:
        snap = get_live_snapshot(db, t)
        d["steps"] = snap.get("steps", [])
        d["variables"] = snap.get("variables", [])
    return d


def works_item(db: Session, t: Template) -> dict:
    d = _base_template_fields(db, t)
    d.pop("steps", None)
    return d
