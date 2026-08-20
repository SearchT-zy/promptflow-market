"""渲染引擎接口（PRD 5.2，核心）。"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import error_json, get_current_user
from ..models import Purchase, Template, UsageLog, User
from ..render import render_steps
from ..schemas import RenderIn
from ..snapshots import build_snapshot, get_live_snapshot, get_snapshot_by_version

router = APIRouter(prefix="/render", tags=["render"])


def _sanitize_variables(variables: dict) -> dict:
    return {k: f"[{len(str(v))}字符]" for k, v in variables.items()}


@router.post("")
def render(body: RenderIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    t = db.get(Template, body.template_id)
    if t is None:
        raise error_json("NOT_FOUND", "模板不存在", http_status=404)

    is_author = t.author_id == user.id or user.role == "admin"

    if t.status == "published":
        if body.version:
            snap = get_snapshot_by_version(db, t.id, body.version)
            if snap is None:
                raise error_json("NOT_FOUND", "指定版本不存在", http_status=404)
        else:
            snap = get_live_snapshot(db, t)
    elif is_author:
        # 草稿预览（作者本人）
        snap = build_snapshot(db, t)
    else:
        raise error_json("NOT_FOUND", "模板不存在或未发布", http_status=404)

    # 付费未购 → 402（MVP 全部免费，此分支为 V2 预留）
    price = int(snap.get("price_cents", 0))
    if price > 0 and not is_author:
        purchased = (
            db.query(Purchase)
            .filter(Purchase.buyer_id == user.id, Purchase.template_id == t.id)
            .first()
        )
        if purchased is None:
            raise error_json("PURCHASE_REQUIRED", "请先购买该模板", http_status=402)

    steps = snap.get("steps", [])
    var_defs = snap.get("variables", [])
    rendered, warnings, missing = render_steps(
        steps, var_defs, body.variables, body.context, step_filter=body.step
    )
    if missing:
        raise error_json("VARIABLE_MISSING", "必填变量缺失", missing)

    # 埋点
    db.add(
        UsageLog(
            user_id=user.id,
            template_id=t.id,
            action="render",
            variables_filled_json=_sanitize_variables(body.variables),
            success=True,
        )
    )
    if t.status == "published":
        t.render_count = (t.render_count or 0) + 1
    db.commit()

    return {
        "template_id": t.id,
        "version": body.version or t.current_version,
        "rendered": rendered,
        "warnings": warnings,
    }
