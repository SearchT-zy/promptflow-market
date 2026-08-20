"""导出四件套：JSON / Markdown / API 请求体 / 分享链接（PRD 3.4）。"""
import json
import secrets
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy.orm import Session

from ..config import settings
from ..database import get_db
from ..deps import error_json, get_current_user
from ..models import ShareLink, Template, UsageLog, User
from ..render import render_steps
from ..schemas import ApiBodyIn, ShareIn
from ..serializers import detail_from_snapshot
from ..snapshots import build_snapshot, get_live_snapshot

router = APIRouter(prefix="/templates", tags=["export"])

ADAPTERS = {
    "openai": {"base_url": "https://api.openai.com/v1/chat/completions", "model": "gpt-4o-mini"},
    "deepseek": {"base_url": "https://api.deepseek.com/v1/chat/completions", "model": "deepseek-chat"},
    "glm": {"base_url": "https://open.bigmodel.cn/api/paas/v4/chat/completions", "model": "glm-4-flash"},
    "kimi": {"base_url": "https://api.moonshot.cn/v1/chat/completions", "model": "moonshot-v1-8k"},
    "claude": {"base_url": "https://api.anthropic.com/v1/messages", "model": "claude-3-5-sonnet-latest"},
}

SYSTEM_PROMPT = "你是 PromptFlow 模板执行助手，请严格遵循用户指令完成输出。"


def _resolve_template(db: Session, user: User, template_id: str) -> tuple[Template, dict]:
    t = db.get(Template, template_id)
    if t is None:
        raise error_json("NOT_FOUND", "模板不存在", http_status=404)
    is_author = t.author_id == user.id or user.role == "admin"
    if t.status != "published" and not is_author:
        raise error_json("NOT_FOUND", "模板不存在或未发布", http_status=404)
    snap = get_live_snapshot(db, t) if t.status == "published" else build_snapshot(db, t)
    return t, snap


def _log(db: Session, user: User, template_id: str, action: str):
    db.add(UsageLog(user_id=user.id, template_id=template_id, action=action, success=True))
    db.commit()


@router.get("/{template_id}/export/json")
def export_json(template_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    t, snap = _resolve_template(db, user, template_id)
    _log(db, user, t.id, "export_json")
    return {
        "schema_version": "1.0",
        "source": "promptflow",
        "url": f"{settings.public_base_url}/t/{t.slug}",
        "exported_at": datetime.now(timezone.utc).isoformat(),
        "template": {
            "title": snap.get("title"),
            "slug": t.slug,
            "template_type": snap.get("template_type"),
            "category": snap.get("category"),
            "model_tags": snap.get("model_tags", []),
            "price_cents": snap.get("price_cents", 0),
            "doc_md": snap.get("doc_md", ""),
            "steps": snap.get("steps", []),
            "variables": snap.get("variables", []),
        },
    }


def _md_table(headers: list[str], rows: list[list[str]]) -> str:
    lines = ["| " + " | ".join(headers) + " |", "|" + "|".join(["---"] * len(headers)) + "|"]
    for r in rows:
        lines.append("| " + " | ".join(str(c).replace("|", "\\|").replace("\n", "<br>") for c in r) + " |")
    return "\n".join(lines)


@router.get("/{template_id}/export/markdown")
def export_markdown(template_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    t, snap = _resolve_template(db, user, template_id)
    _log(db, user, t.id, "export_md")

    vars_rows = [
        [v["name"], v["label"], v["var_type"], "是" if v.get("required") else "否", v.get("default_value") or "-", v.get("description") or "-"]
        for v in snap.get("variables", [])
    ]
    steps_md = []
    for i, s in enumerate(snap.get("steps", []), start=1):
        steps_md.append(f"### 步骤 {i}：{s.get('title', '')}\n\n```text\n{s.get('prompt', '')}\n```")
    steps_block = "\n\n".join(steps_md)

    md = f"""# {snap.get('title')}

> 来源：[PromptFlow]({settings.public_base_url}/t/{t.slug}) · 模板类型：{snap.get('template_type')} · 价格：{'免费' if not snap.get('price_cents') else f"¥{snap.get('price_cents') / 100:.2f}"}

{snap.get('summary', '')}

## 模板说明

{snap.get('doc_md') or '（作者未提供说明）'}

## 变量表

{_md_table(['变量名', '显示名', '类型', '必填', '默认值', '说明'], vars_rows) if vars_rows else '（无变量）'}

## 使用方法

1. 复制各步骤 Prompt；
2. 将 `{{{{变量}}}}` 替换为实际内容，或将上一步模型的输出回填到 `{{{{__prev_output__}}}}` 处；
3. 多步骤模板请按步骤顺序逐轮执行，把每步输出粘贴回下一步。

## 各步骤 Prompt

{steps_block}

## License

本模板由 PromptFlow 创作者发布。用于自用时请保留本说明与来源链接；商业再分发请先取得创作者授权。
"""
    return Response(content=md, media_type="text/markdown; charset=utf-8")


@router.post("/{template_id}/export/api-body")
def export_api_body(
    template_id: str,
    body: ApiBodyIn,
    adapter: str = Query(default="openai", pattern="^(openai|deepseek|glm|kimi|claude)$"),
    as_: str = Query(default="json", alias="as", pattern="^(json|curl|python)$"),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    t, snap = _resolve_template(db, user, template_id)
    cfg = ADAPTERS[adapter]
    steps = snap.get("steps", [])
    rendered, _warnings, missing = render_steps(
        steps, snap.get("variables", []), body.variables, body.context
    )
    if missing:
        raise error_json("VARIABLE_MISSING", "必填变量缺失", missing)
    _log(db, user, t.id, "export_api")

    out_steps = []
    for i, (s, r) in enumerate(zip(steps, rendered), start=1):
        model = s.get("model_hint") or cfg["model"]
        temperature = s.get("temperature") if s.get("temperature") is not None else 0.7
        payload = {
            "model": model,
            "temperature": temperature,
            "messages": [
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": r["text"]},
            ],
        }
        curl = (
            f"curl {cfg['base_url']} \\\n"
            f"  -H 'Content-Type: application/json' \\\n"
            f"  -H 'Authorization: Bearer $KEY' \\\n"
            f"  -d '{json.dumps(payload, ensure_ascii=False)}'"
        )
        python = (
            "import requests\n\n"
            f"resp = requests.post(\n    {cfg['base_url']!r},\n"
            "    headers={'Authorization': 'Bearer ' + KEY, 'Content-Type': 'application/json'},\n"
            f"    json={json.dumps(payload, ensure_ascii=False, indent=2)},\n)\n"
            "print(resp.json())"
        )
        out_steps.append(
            {"step": r["step"], "title": r["title"], "body": payload, "curl": curl, "python": python}
        )

    note = ""
    if len(steps) > 1:
        note = "多步骤模板：请按步骤顺序请求，将每一步的模型输出回填至下一步的 {{__prev_output__}} 后再发起请求。"
    return {"adapter": adapter, "as": as_, "base_url": cfg["base_url"], "steps": out_steps, "note": note}


@router.post("/{template_id}/share", status_code=201)
def create_share(
    template_id: str, body: ShareIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    t, snap = _resolve_template(db, user, template_id)
    token = secrets.token_urlsafe(24)
    expires_at = None
    if body.expires_in_seconds:
        expires_at = datetime.now(timezone.utc) + timedelta(seconds=body.expires_in_seconds)
    link = ShareLink(
        token=token,
        template_id=t.id,
        created_by=user.id,
        preset_variables_json=body.preset_variables or {},
        expires_at=expires_at,
        max_visits=body.max_visits,
    )
    db.add(link)
    _log(db, user, t.id, "share")
    return {
        "token": token,
        "url": f"{settings.public_base_url}/share/{token}",
        "expires_at": expires_at.isoformat() if expires_at else None,
        "max_visits": body.max_visits,
    }
