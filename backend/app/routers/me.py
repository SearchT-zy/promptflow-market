"""个人中心：已购 / 收藏 / 历史 / 统计。"""
from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import error_json, get_current_user
from ..models import Favorite, Purchase, Template, UsageLog, User
from ..serializers import card_from_snapshot

router = APIRouter(tags=["me"])


@router.get("/me/purchases")
def my_purchases(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    rows = (
        db.execute(
            select(Template)
            .join(Purchase, Purchase.template_id == Template.id)
            .where(Purchase.buyer_id == user.id)
        )
        .scalars()
        .all()
    )
    return {"items": [card_from_snapshot(db, t) for t in rows]}


@router.get("/me/favorites")
def my_favorites(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    rows = (
        db.execute(
            select(Template)
            .join(Favorite, Favorite.template_id == Template.id)
            .where(Favorite.user_id == user.id)
            .order_by(Favorite.created_at.desc())
        )
        .scalars()
        .all()
    )
    return {"items": [card_from_snapshot(db, t) for t in rows]}


@router.put("/favorites/{template_id}")
def add_favorite(template_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    t = db.get(Template, template_id)
    if t is None:
        raise error_json("NOT_FOUND", "模板不存在", http_status=404)
    exists = (
        db.execute(
            select(Favorite).where(Favorite.user_id == user.id, Favorite.template_id == template_id)
        )
        .scalar_one_or_none()
    )
    if exists is None:
        db.add(Favorite(user_id=user.id, template_id=template_id))
        db.commit()
    return {"favorited": True}


@router.delete("/favorites/{template_id}")
def remove_favorite(template_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    fav = db.execute(
        select(Favorite).where(Favorite.user_id == user.id, Favorite.template_id == template_id)
    ).scalar_one_or_none()
    if fav:
        db.delete(fav)
        db.commit()
    return {"favorited": False}


@router.get("/me/history")
def my_history(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    rows = (
        db.execute(
            select(UsageLog)
            .where(UsageLog.user_id == user.id)
            .order_by(UsageLog.created_at.desc())
            .limit(100)
        )
        .scalars()
        .all()
    )
    items = []
    for r in rows:
        t = db.get(Template, r.template_id)
        items.append(
            {
                "id": r.id,
                "action": r.action,
                "template_id": r.template_id,
                "template_title": t.title if t else "(已删除)",
                "success": bool(r.success),
                "created_at": r.created_at.isoformat(),
            }
        )
    return {"items": items}


@router.get("/me/stats")
def my_stats(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    favorites = db.query(Favorite).filter(Favorite.user_id == user.id).count()
    purchases = db.query(Purchase).filter(Purchase.buyer_id == user.id).count()
    renders = (
        db.query(UsageLog)
        .filter(UsageLog.user_id == user.id, UsageLog.action == "render")
        .count()
    )
    return {"favorites_count": favorites, "purchases_count": purchases, "render_count": renders}


@router.get("/me/api-keys")
def my_api_keys(user: User = Depends(get_current_user)):
    # V3 企业 API Key，MVP 占位
    return {"items": []}
