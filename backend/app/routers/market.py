"""市场广场：列表/筛选/排序/游标分页、详情、搜索、分类、精选。"""
import base64
import json

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import error_json, get_current_user_optional
from ..models import Category, Purchase, Template, UsageLog, User
from ..serializers import card_from_snapshot, category_to_dict, detail_from_snapshot
from ..snapshots import get_live_snapshot

router = APIRouter(prefix="/market", tags=["market"])

DEFAULT_PAGE_SIZE = 24
MAX_PAGE_SIZE = 100


def _published_templates(db: Session) -> list[Template]:
    return (
        db.execute(
            select(Template)
            .where(Template.status == "published")
            .order_by(Template.published_at.desc(), Template.id.desc())
        )
        .scalars()
        .all()
    )


def _encode_cursor(offset: int) -> str:
    return base64.urlsafe_b64encode(json.dumps({"o": offset}).encode()).decode()


def _decode_cursor(cursor: str | None) -> int:
    if not cursor:
        return 0
    try:
        data = json.loads(base64.urlsafe_b64decode(cursor.encode()).decode())
        return max(int(data.get("o", 0)), 0)
    except Exception:
        return 0


def _sort_key(t: dict, sort: str):
    if sort == "sales":
        return (t["sales_count"], t["published_at"] or "")
    if sort == "rating":
        return (t["rating_avg"], t["rating_count"])
    if sort == "newest":
        return (t["published_at"] or "",)
    if sort == "price_asc":
        return (-t["price_cents"],)  # 免费(0)在前
    if sort == "price_desc":
        return (t["price_cents"],)
    # default 综合：销量×评分×新鲜度加权
    import math
    import datetime

    try:
        age_days = max((datetime.datetime.now(datetime.timezone.utc) - (
            datetime.datetime.fromisoformat(t["published_at"]) if t["published_at"] else datetime.datetime.now(datetime.timezone.utc)
        )).days, 0)
    except Exception:
        age_days = 0
    fresh = 1.0 / (1.0 + age_days / 30.0)
    score = t["sales_count"] * 0.5 + t["rating_avg"] * 8 * 0.3 + math.log1p(t["view_count"]) * 0.2
    return (score * (0.8 + 0.2 * fresh),)


def _filter_and_sort(items: list[dict], *, category, price, models, q, sort) -> list[dict]:
    out = items
    if category:
        out = [t for t in out if t["category"] == category]
    if price == "free":
        out = [t for t in out if t["price_cents"] == 0]
    elif price == "paid":
        out = [t for t in out if t["price_cents"] > 0]
    if models:
        out = [t for t in out if any(m in (t["model_tags"] or []) for m in models)]
    if q:
        ql = q.lower()
        out = [
            t
            for t in out
            if ql in (t["title"] or "").lower()
            or ql in (t["summary"] or "").lower()
            or ql in (t["doc_md"] or "").lower()
            or ql in " ".join(t["model_tags"] or []).lower()
        ]
    out.sort(key=lambda t: _sort_key(t, sort), reverse=True)
    return out


def _list_response(db: Session, items: list[dict], cursor: str | None, page_size: int) -> dict:
    offset = _decode_cursor(cursor)
    page = items[offset : offset + page_size]
    next_cursor = _encode_cursor(offset + page_size) if offset + page_size < len(items) else None
    return {
        "items": page,
        "next_cursor": next_cursor,
        "has_more": next_cursor is not None,
        "total_est": len(items),
    }


@router.get("/templates")
def list_templates(
    category: str | None = None,
    price: str | None = Query(default=None, pattern="^(free|paid)$"),
    model: str | None = None,  # 支持逗号分隔多选：model=deepseek,glm
    sort: str = Query(default="default", pattern="^(default|sales|rating|newest|price_asc|price_desc)$"),
    cursor: str | None = None,
    page_size: int = Query(default=DEFAULT_PAGE_SIZE, ge=1, le=MAX_PAGE_SIZE),
    db: Session = Depends(get_db),
):
    rows = _published_templates(db)
    cards = [card_from_snapshot(db, t) for t in rows]
    models = [m.strip() for m in (model or "").split(",") if m.strip()]
    filtered = _filter_and_sort(cards, category=category, price=price, models=models, q=None, sort=sort)
    return _list_response(db, filtered, cursor, page_size)


@router.get("/search")
def search(
    q: str = Query(default="", max_length=200),
    category: str | None = None,
    price: str | None = Query(default=None, pattern="^(free|paid)$"),
    model: str | None = None,
    sort: str = Query(default="default", pattern="^(default|sales|rating|newest|price_asc|price_desc)$"),
    cursor: str | None = None,
    page_size: int = Query(default=DEFAULT_PAGE_SIZE, ge=1, le=MAX_PAGE_SIZE),
    db: Session = Depends(get_db),
):
    rows = _published_templates(db)
    cards = []
    for t in rows:
        card = card_from_snapshot(db, t)
        card["doc_md"] = get_live_snapshot(db, t).get("doc_md", "")  # 参与检索
        cards.append(card)
    models = [m.strip() for m in (model or "").split(",") if m.strip()]
    filtered = _filter_and_sort(cards, category=category, price=price, models=models, q=q, sort=sort)
    for c in filtered:
        c.pop("doc_md", None)
    return _list_response(db, filtered, cursor, page_size)


@router.get("/categories")
def list_categories(db: Session = Depends(get_db)):
    cats = db.execute(select(Category).order_by(Category.sort, Category.id)).scalars().all()
    counts = dict(
        db.execute(
            select(Template.category_id, func.count(Template.id))
            .where(Template.status == "published", Template.category_id.isnot(None))
            .group_by(Template.category_id)
        ).all()
    )
    return {"items": [category_to_dict(c, counts.get(c.id, 0)) for c in cats]}


@router.get("/featured")
def featured(limit: int = Query(default=6, ge=1, le=24), db: Session = Depends(get_db)):
    rows = sorted(_published_templates(db), key=lambda t: t.render_count or 0, reverse=True)[:limit]
    return {"items": [card_from_snapshot(db, t) for t in rows]}


@router.get("/templates/{slug}")
def template_detail(
    slug: str, user: User | None = Depends(get_current_user_optional), db: Session = Depends(get_db)
):
    t = db.execute(select(Template).where(Template.slug == slug)).scalar_one_or_none()
    if t is None or t.status != "published":
        raise error_json("NOT_FOUND", "模板不存在", http_status=404)

    is_author = user is not None and (t.author_id == user.id or user.role == "admin")
    snap = get_live_snapshot(db, t)
    price = int(snap.get("price_cents", 0))

    purchased = False
    if user is not None:
        purchased = (
            db.query(Purchase)
            .filter(Purchase.buyer_id == user.id, Purchase.template_id == t.id)
            .first()
            is not None
        )
    can_use = price == 0 or purchased or is_author
    censored = price > 0 and not purchased and not is_author

    # 埋点
    db.add(UsageLog(user_id=user.id if user else None, template_id=t.id, action="view", success=True))
    t.view_count = (t.view_count or 0) + 1
    db.commit()

    return detail_from_snapshot(db, t, can_use=can_use, censored=censored)
