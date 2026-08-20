"""分享页：免登录读取（PRD 3.4.5）。"""
from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import error_json
from ..models import ShareLink, Template, UsageLog
from ..serializers import detail_from_snapshot

router = APIRouter(prefix="/share", tags=["share"])


@router.get("/{token}")
def get_share(token: str, db: Session = Depends(get_db)):
    link = db.execute(select(ShareLink).where(ShareLink.token == token)).scalar_one_or_none()
    if link is None or link.status != "active":
        raise error_json("SHARE_INVALID", "分享链接不存在", http_status=410)

    now = datetime.now(timezone.utc)
    if link.expires_at is not None and link.expires_at < now:
        link.status = "revoked"
        db.commit()
        raise error_json("SHARE_INVALID", "分享链接已过期", http_status=410)
    if link.max_visits is not None and link.visit_count >= link.max_visits:
        raise error_json("SHARE_INVALID", "分享链接已达最大访问次数", http_status=410)

    t = db.get(Template, link.template_id)
    if t is None or t.status != "published":
        raise error_json("SHARE_INVALID", "模板已下架", http_status=410)

    link.visit_count = (link.visit_count or 0) + 1
    db.add(UsageLog(user_id=None, template_id=t.id, action="share", success=True))
    t.view_count = (t.view_count or 0) + 1
    db.commit()

    detail = detail_from_snapshot(db, t, can_use=True)
    return {
        "template": detail,
        "preset_variables": link.preset_variables_json or {},
        "expires_at": link.expires_at.isoformat() if link.expires_at else None,
        "max_visits": link.max_visits,
        "visit_count": link.visit_count,
    }
