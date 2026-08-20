"""变量规则与渲染引擎（PRD 3.1.3 / 5.2，前端 renderLocal 同算法）。

渲染规则：
1. 单次替换、非递归——变量值中若再含 {{ 大括号占位符，按字面文本输出，不二次解析；
2. 用户变量值统一以三引号 fence 包裹注入，预览中高亮外部输入；
3. 单变量值长度上限 10,000 字符，超出截断并提示；
4. 必填变量缺失时渲染报 422 VARIABLE_MISSING，逐项列出缺失变量。
"""
import re

from .deps import error_json

# 变量名白名单（ASCII，防注入第一步）；`__` 前缀保留给内置变量
VAR_NAME_RE = re.compile(r"^[a-zA-Z_][a-zA-Z0-9_]{0,63}$")
# 单趟替换：仅匹配白名单形态的占位符
VAR_RE = re.compile(r"\{\{\s*([a-zA-Z_]\w{0,63})\s*\}\}")
BUILTIN_PREV_RE = re.compile(r"__prev_output__")
BUILTIN_STEP_RE = re.compile(r"__step_(\d+)_output__")

RESERVED_PREFIX = "__"
MAX_VALUE_LEN = 10_000
FENCE = '"""'

VAR_TYPES = ("string", "text", "number", "select", "boolean")

BUILTIN_PLACEHOLDER = "【⚠ 此处粘贴第 {n} 步模型的输出】"


def validate_variable_name(name: str) -> str | None:
    """返回错误原因；合法返回 None。"""
    if not VAR_NAME_RE.match(name or ""):
        return "bad_name"
    if name.startswith(RESERVED_PREFIX):
        return "reserved"
    return None


def validate_variables(variables: list[dict]) -> list[dict]:
    """校验变量定义列表，返回错误列表 [{name, reason}]。"""
    errors = []
    seen: set[str] = set()
    for v in variables:
        name = (v or {}).get("name", "")
        reason = validate_variable_name(name)
        if reason:
            errors.append({"name": name, "reason": reason})
            continue
        if name in seen:
            errors.append({"name": name, "reason": "duplicate"})
        seen.add(name)
        vt = v.get("var_type", "string")
        if vt not in VAR_TYPES:
            errors.append({"name": name, "reason": "bad_type"})
    return errors


def normalize_variable(v: dict, sort_order: int) -> dict:
    """把输入变量定义规整为统一结构。"""
    return {
        "name": v["name"],
        "label": v.get("label") or v["name"],
        "description": v.get("description") or "",
        "var_type": v.get("var_type", "string"),
        "default_value": None if v.get("default_value") is None else str(v["default_value"]),
        "options": v.get("options") or None,
        "required": bool(v.get("required", True)),
        "sort_order": v.get("sort_order", sort_order),
    }


def _fence(value: str, warnings: list[dict], name: str) -> str:
    if len(value) > MAX_VALUE_LEN:
        warnings.append({"name": name, "message": f"变量值超过 {MAX_VALUE_LEN} 字符，已截断"})
        value = value[:MAX_VALUE_LEN] + "…[截断]"
    return f"{FENCE}{value}{FENCE}"


def _render_step_text(prompt: str, variables: dict, var_defs: dict, context: dict, step_no: int, warnings: list) -> str:
    def repl(m: re.Match) -> str:
        raw_name = m.group(1)
        name = raw_name.strip()

        if name == "__prev_output__":
            prev = step_no - 1
            key = f"s{prev}_output"
            val = context.get(key)
            if val:
                return _fence(val, warnings, name)
            return BUILTIN_PLACEHOLDER.format(n=prev)

        m_step = BUILTIN_STEP_RE.match(name)
        if m_step:
            n = int(m_step.group(1))
            key = f"s{n}_output"
            val = context.get(key)
            if val:
                return _fence(val, warnings, name)
            return BUILTIN_PLACEHOLDER.format(n=n)

        # 用户变量
        val = variables.get(name)
        if val is None:
            val = ""
        return _fence(str(val), warnings, name)

    # 单趟替换：替换函数的返回值不会被再次扫描
    return VAR_RE.sub(repl, prompt)


def collect_missing(variable_defs: list[dict], values: dict, prompts: list[str]) -> list[dict]:
    """找出「被步骤引用且必填但未提供」的变量。"""
    referenced: set[str] = set()
    for prompt in prompts:
        for m in VAR_RE.finditer(prompt or ""):
            name = m.group(1).strip()
            if not name.startswith(RESERVED_PREFIX):
                referenced.add(name)

    missing: list[dict] = []
    for v in variable_defs:
        if not v.get("required"):
            continue
        if v["name"] not in referenced:
            continue
        if (values.get(v["name"]) is None) or str(values[v["name"]]).strip() == "":
            missing.append({"name": v["name"], "reason": "required"})
    return missing


def render_steps(
    steps: list[dict], variables_defs: list[dict], values: dict,
    context: dict | None = None, step_filter: int | None = None, check_required: bool = True,
) -> tuple[list[dict], list[dict], dict]:
    """渲染链式步骤。

    返回 (rendered, warnings, missing)；missing 非空时调用方应抛 422。
    rendered: [{step, title, text}]
    """
    context = context or {}
    warnings: list[dict] = []

    ordered = sorted(steps, key=lambda s: s.get("order", 0))
    targets = ordered if step_filter is None else [s for s in ordered if s.get("order") == step_filter]
    if step_filter is not None and not targets:
        raise error_json("STEP_NOT_FOUND", f"步骤 {step_filter} 不存在", http_status=404)

    prompts = [s.get("prompt", "") for s in targets]
    missing = collect_missing(variables_defs, values, prompts) if check_required else []

    rendered = []
    for s in targets:
        rendered.append(
            {
                "step": s.get("order", 0),
                "title": s.get("title", ""),
                "text": _render_step_text(
                    s.get("prompt", ""), values, variables_defs, context, s.get("order", 0), warnings
                ),
            }
        )
    return rendered, warnings, missing
