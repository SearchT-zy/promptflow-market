"""创作者后台：数据看板 / 收益 / 提现（V2 占位）。"""
from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..config import settings
from ..database import get_db
from ..deps import error_json, get_current_user
from ..models import RevenueRecord, Template, UsageLog, User

router = APIRouter(prefix="/creator", tags=["creator"])


@router.get("/dashboard")
def dashboard(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    mine = (
        db.execute(select(Template).where(Template.author_id == user.id))
        .scalars()
        .all()
    )
    ids = [t.id for t in mine]

    totals = {"views": 0, "renders": 0, "exports": 0, "shares": 0, "sales": 0, "revenue_cents": 0}
    by_template = []
    if ids:
        for t in mine:
            views = db.query(UsageLog).filter(UsageLog.template_id == t.id, UsageLog.action == "view").count()
            renders = db.query(UsageLog).filter(UsageLog.template_id == t.id, UsageLog.action == "render").count()
            exports = db.query(UsageLog).filter(UsageLog.template_id == t.id, UsageLog.action.like("export%")).count()
            shares = db.query(UsageLog).filter(UsageLog.template_id == t.id, UsageLog.action == "share").count()
            totals["views"] += views
            totals["renders"] += renders
            totals["exports"] += exports
            totals["shares"] += shares
            totals["sales"] += t.sales_count or 0
            by_template.append(
                {
                    "id": t.id,
                    "title": t.title,
                    "views": views,
                    "renders": renders,
                    "exports": exports,
                    "shares": shares,
                    "sales": t.sales_count or 0,
                }
            )
    by_template.sort(key=lambda x: x["renders"], reverse=True)
    return {
        "totals": totals,
        "by_template": by_template,
        "funnel": {
            "views": totals["views"],
            "renders": totals["renders"],
            "exports": totals["exports"],
        },
    }


@router.get("/revenues")
def revenues(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    rows = (
        db.execute(
            select(RevenueRecord)
            .where(RevenueRecord.creator_id == user.id)
            .order_by(RevenueRecord.settled_at.desc())
        )
        .scalars()
        .all()
    )
    return {
        "items": [
            {
                "id": r.id,
                "order_id": r.order_id,
                "gross_cents": r.gross_cents,
                "platform_cents": r.platform_cents,
                "creator_cents": r.creator_cents,
                "type": r.type,
                "settled_at": r.settled_at.isoformat() if r.settled_at else None,
            }
            for r in rows
        ]
    }


@router.post("/withdrawals", status_code=501)
def create_withdrawal(user: User = Depends(get_current_user)):
    raise error_json("TRADE_DISABLED", "MVP 阶段未开放提现（V2 上线）", http_status=501)
