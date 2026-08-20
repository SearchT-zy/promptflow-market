"""版本快照读写：steps_json + template_variables(草稿) → 不可变 snapshot_json。"""
import re
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from .models import Template, TemplateVersion

SCHEMA_VERSION = "1.0"


def compare_semver(a: str, b: str) -> int:
    """a>b → 1；a==b → 0；a<b → -1。"""

    def parts(s: str) -> tuple[int, ...]:
        nums = re.findall(r"\d+", s or "")
        return tuple(int(n) for n in (nums or ["0", "0", "0"])[:3])

    pa, pb = parts(a), parts(b)
    return (pa > pb) - (pa < pb)


def next_version(current: str) -> str:
    """递增 minor 位：1.2.0 → 1.3.0。"""
    nums = re.findall(r"\d+", current or "0.1.0")
    major, minor = int(nums[0]), int(nums[1]) if len(nums) > 1 else 0
    patch = int(nums[2]) if len(nums) > 2 else 0
    return f"{major}.{minor + 1}.{patch}"


def build_snapshot(db: Session, template: Template) -> dict:
    """从草稿内容组装不可变快照。"""
    from .models import TemplateVariable

    vars_rows = (
        db.execute(
            select(TemplateVariable)
            .where(
                TemplateVariable.template_id == template.id,
                TemplateVariable.version == "draft",
            )
            .order_by(TemplateVariable.sort_order, TemplateVariable.id)
        )
        .scalars()
        .all()
    )
    variables = []
    for v in vars_rows:
        variables.append(
            {
                "name": v.name,
                "label": v.label,
                "description": v.description,
                "var_type": v.var_type,
                "default_value": v.default_value,
                "options": v.options_json,
                "required": v.required,
                "sort_order": v.sort_order,
            }
        )

    steps = template.steps_json.get("steps", []) if isinstance(template.steps_json, dict) else []
    links = [
        {"from": s["id"], "to": steps[i + 1]["id"], "kind": "linear"}
        for i, s in enumerate(sorted(steps, key=lambda x: x.get("order", 0))[:-1])
    ]

    return {
        "schema_version": SCHEMA_VERSION,
        "title": template.title,
        "summary": template.summary,
        "template_type": template.template_type,
        "category": template.category.slug if template.category else None,
        "model_tags": template.model_tags or [],
        "price_cents": template.price_cents,
        "doc_md": template.doc_md or "",
        "sample_output": template.sample_output or "",
        "steps": steps,
        "variables": variables,
        "links": links,
    }


def get_live_snapshot(db: Session, template: Template) -> dict:
    """取当前发布版本的快照；从未发布则回退到草稿内容。"""
    if template.current_version and template.current_version != "0.1.0":
        row = db.execute(
            select(TemplateVersion).where(
                TemplateVersion.template_id == template.id,
                TemplateVersion.version == template.current_version,
            )
        ).scalar_one_or_none()
        if row and isinstance(row.snapshot_json, dict):
            return row.snapshot_json
    return build_snapshot(db, template)


def get_snapshot_by_version(db: Session, template_id: str, version: str) -> dict | None:
    row = db.execute(
        select(TemplateVersion).where(
            TemplateVersion.template_id == template_id,
            TemplateVersion.version == version,
        )
    ).scalar_one_or_none()
    return row.snapshot_json if row and isinstance(row.snapshot_json, dict) else None


def create_version(db: Session, template: Template, version: str, changelog: str) -> TemplateVersion:
    """创建不可变版本快照。不改变模板状态：新模板需经审核后才会 published。"""
    snap = build_snapshot(db, template)
    row = TemplateVersion(
        template_id=template.id,
        version=version,
        snapshot_json=snap,
        changelog=changelog or "",
        published_at=datetime.now(timezone.utc),
    )
    db.add(row)
    template.current_version = version
    template.step_count = len(snap.get("steps", []))
    db.commit()
    db.refresh(row)
    return row
