"""种子数据：官方分类、管理员/演示账号、10 套官方模板（含 3 套链式）。"""
from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from .models import Category, Template, TemplateVariable, UsageLog, User
from .security import hash_password
from .snapshots import create_version

CATEGORIES = [
    ("code-dev", "代码开发", "💻"),
    ("agent-workflow", "Agent 工作流", "🤖"),
    ("doc-processing", "文档处理", "📄"),
    ("hardware-embedded", "硬件嵌入式", "🔌"),
    ("ecommerce-listing", "电商 Listing", "🛒"),
    ("data-analysis", "数据分析", "📊"),
    ("teaching-prep", "教学备课", "📚"),
    ("marketing-copy", "营销文案", "✍️"),
    ("legal-compliance", "法律合规", "⚖️"),
    ("more", "更多", "✨"),
]

# 模板种子：title/summary/category/type/model_tags/doc/sample/steps/variables
TEMPLATES = [
    {
        "title": "电商 Listing 三步生成器",
        "summary": "卖点提取 → 多平台文案 → A/B 测试建议，一条链搞定上架文案",
        "category": "ecommerce-listing",
        "type": "chain",
        "models": ["deepseek", "glm"],
        "doc": """## 使用方法
1. 填入产品名、核心卖点、目标平台；
2. 依次执行三个步骤，把每步输出粘贴到下一步的 `{{__prev_output__}}` 处（或直接导出 API 请求体按序列调用）；
3. 步骤 3 会基于前两步产出 A/B 测试建议。

## 适用模型
DeepSeek / GLM 效果最佳，其他 OpenAI 兼容模型理论兼容。""",
        "sample": """【步骤1 示例输出】
- 核心卖点：热插拔轴体（自由更换手感）
- 差异点：三模连接覆盖桌面/移动场景
- 目标人群：程序员、重度打字用户""",
        "steps": [
            {
                "title": "提取产品卖点",
                "prompt": "你是资深电商运营专家。请分析以下产品信息，提炼出 5 个核心卖点，并按「用户价值」排序：\n\n产品名称：{{product_name}}\n产品卖点：{{selling_points}}\n\n输出 Markdown 列表，每个卖点包含：卖点描述、对应的用户痛点、与竞品的差异点。",
                "temperature": 0.3,
                "output_format": "markdown",
            },
            {
                "title": "生成平台文案",
                "prompt": "基于以下卖点分析结果：\n{{__prev_output__}}\n\n请为「{{target_platform}}」平台生成 3 版商品文案（标题 + 5 个 bullet 卖点 + 短描述），适配该平台的文案风格与关键词习惯。输出 Markdown。",
                "temperature": 0.7,
                "output_format": "markdown",
            },
            {
                "title": "输出 A/B 测试建议",
                "prompt": "基于以下已生成文案：\n{{__prev_output__}}\n\n请设计 3 组 A/B 测试方案（每组说明测试变量、对照组设计、预期指标与判断标准），并指出哪一版文案最可能在「{{target_platform}}」获得高点击。",
                "temperature": 0.5,
                "output_format": "markdown",
            },
        ],
        "variables": [
            {"name": "product_name", "label": "产品名", "var_type": "string", "description": "要生成文案的产品名称", "required": True},
            {"name": "selling_points", "label": "核心卖点", "var_type": "text", "description": "产品卖点，可用顿号/换行分隔", "required": True},
            {"name": "target_platform", "label": "目标平台", "var_type": "select", "description": "文案投放的平台", "options": ["淘宝", "拼多多", "抖音", "亚马逊"], "default": "淘宝", "required": True},
        ],
    },
    {
        "title": "代码评审三步链",
        "summary": "规范检查 → 逻辑与安全评审 → 可执行改进清单，Cursor 里直接跑",
        "category": "code-dev",
        "type": "chain",
        "models": ["deepseek", "gpt", "glm"],
        "doc": """## 使用方法
在 Cursor / DeepSeek 网页版中逐轮粘贴执行；或导出 API 请求体接入脚本。

步骤 2、3 引用上一步输出，请勿跳步。""",
        "sample": "【示例】第一步会输出规范问题清单（命名/复杂度/重复代码），第二步输出逻辑与安全缺陷，第三步给出可直接应用的修复 diff 建议。",
        "steps": [
            {
                "title": "代码规范检查",
                "prompt": "你是资深 {{language}} 工程师。请对以下代码做静态规范检查：\n\n```{{language}}\n{{code_snippet}}\n```\n\n检查项：命名规范、函数复杂度、重复代码、错误处理。输出 Markdown 表格：问题位置 | 严重程度 | 说明。",
                "temperature": 0.2,
                "output_format": "markdown",
            },
            {
                "title": "逻辑与安全评审",
                "prompt": "上一步规范检查结果：\n{{__prev_output__}}\n\n原始代码：\n```{{language}}\n{{code_snippet}}\n```\n\n请继续做逻辑正确性与安全评审：边界条件、并发/资源泄漏、注入风险、越权。逐条给出「风险描述 + 触发场景 + 修复方向」。",
                "temperature": 0.3,
                "output_format": "markdown",
            },
            {
                "title": "输出修复清单",
                "prompt": "结合以下两步评审结果：\n{{__step_1_output__}}\n{{__step_2_output__}}\n\n请输出一份按优先级排序的可执行修复清单：每项包含「问题摘要、建议改法（含代码示例）、预估工作量」。最后给出本次评审的总体风险评级（高/中/低）。",
                "temperature": 0.4,
                "output_format": "markdown",
            },
        ],
        "variables": [
            {"name": "language", "label": "编程语言", "var_type": "select", "options": ["Python", "JavaScript", "TypeScript", "Go", "Java", "C++"], "default": "Python", "required": True},
            {"name": "code_snippet", "label": "代码片段", "var_type": "text", "description": "粘贴待评审的代码", "required": True},
        ],
    },
    {
        "title": "需求分析→技术方案 二步链",
        "summary": "一句话需求进，结构化技术方案出，开发者提效神器",
        "category": "agent-workflow",
        "type": "chain",
        "models": ["deepseek", "kimi"],
        "doc": "先做需求澄清与拆解，再基于拆解结果产出技术方案。适合快速评审想法与写设计文档。",
        "sample": "【示例】输入「做一个团队内部的知识库问答机器人」，步骤1 输出需求拆解与待确认问题清单，步骤2 输出模块划分/技术选型/里程碑。",
        "steps": [
            {
                "title": "需求澄清与拆解",
                "prompt": "你是产品 + 技术双栖顾问。请对以下需求做澄清与拆解：\n\n需求目标：{{project_goal}}\n约束条件：{{constraints}}\n\n输出：① 需求重述；② 功能点拆解（P0/P1/P2）；③ 待与需求方确认的问题清单（≤8 个）；④ 关键风险。",
                "temperature": 0.4,
                "output_format": "markdown",
            },
            {
                "title": "产出技术方案",
                "prompt": "基于以下需求拆解：\n{{__prev_output__}}\n\n请产出技术方案：模块划分与职责、数据模型要点、技术选型建议（含备选）、接口清单、开发里程碑（按 2 周迭代）。明确标注需要人工决策的点。",
                "temperature": 0.5,
                "output_format": "markdown",
            },
        ],
        "variables": [
            {"name": "project_goal", "label": "需求目标", "var_type": "text", "description": "用一两句话描述要做什么", "required": True},
            {"name": "constraints", "label": "约束条件", "var_type": "text", "description": "预算/时间/技术栈/合规等约束，没有可填「无」", "default": "无", "required": False},
        ],
    },
    {
        "title": "会议纪要转行动清单",
        "summary": "粘贴原始纪要，自动产出待办、负责人与 DDL",
        "category": "doc-processing",
        "type": "single",
        "models": ["glm", "kimi", "deepseek"],
        "doc": "把零散的会议记录变成可直接同步到任务系统的行动清单。",
        "sample": "【示例】输出包含：决议摘要、行动项表格（事项/负责人/截止时间）、遗留问题。",
        "steps": [
            {
                "title": "纪要整理",
                "prompt": "你是高效的项目助理。请把以下会议记录整理为结构化纪要：\n\n{{meeting_notes}}\n\n参会人：{{attendees}}\n\n输出 Markdown：① 会议主题与结论摘要（≤5 条）；② 行动项表格（事项 | 负责人 | 截止时间 | 状态）；③ 未决问题与建议跟进方式。若记录中没有明确截止时间，请标注「待确认」而不要编造。",
                "temperature": 0.2,
                "output_format": "markdown",
            }
        ],
        "variables": [
            {"name": "meeting_notes", "label": "会议记录", "var_type": "text", "description": "粘贴原始纪要/录音转写文本", "required": True},
            {"name": "attendees", "label": "参会人", "var_type": "string", "description": "参会人名单，逗号分隔", "default": "", "required": False},
        ],
    },
    {
        "title": "数据周报解读助手",
        "summary": "把枯燥的数据表变成业务洞察与下周动作",
        "category": "data-analysis",
        "type": "single",
        "models": ["deepseek", "glm"],
        "doc": "粘贴指标数据（表格/JSON 均可），输出趋势解读、异常归因与可执行建议。",
        "sample": "【示例】会自动识别环比异常项，并给出「拆解到渠道/人群」的下钻建议。",
        "steps": [
            {
                "title": "周报解读",
                "prompt": "你是数据产品分析师。请解读以下业务数据：\n\n{{metrics_data}}\n\n业务背景：{{business_context}}\n\n输出：① 核心指标变化速览（环比/同比，Markdown 表格）；② 3 个最重要的异常/亮点及其可能归因；③ 本周值得做的 3 个动作（可执行、可衡量）。数据不足处明确说明，不要虚构数字。",
                "temperature": 0.4,
                "output_format": "markdown",
            }
        ],
        "variables": [
            {"name": "metrics_data", "label": "指标数据", "var_type": "text", "description": "粘贴数据表格/JSON/截图转文字", "required": True},
            {"name": "business_context", "label": "业务背景", "var_type": "string", "description": "如「本地生活小程序，暑期旺季」", "default": "", "required": False},
        ],
    },
    {
        "title": "小红书爆款文案生成器",
        "summary": "标题党 + 正文 + 话题标签，一次生成 3 版",
        "category": "marketing-copy",
        "type": "single",
        "models": ["glm", "kimi", "deepseek"],
        "doc": "适配小红书平台语感，提供多语气版本，标注违规词风险。",
        "sample": "【示例】每版含：爆款标题（含 emoji）、正文（含钩子/信任状/行动号召）、话题标签 8-10 个。",
        "steps": [
            {
                "title": "生成小红书文案",
                "prompt": "你是小红书爆款文案写手。请为以下产品生成 3 版种草文案：\n\n产品：{{product_name}}\n核心卖点：{{selling_points}}\n语气风格：{{tone}}\n\n每版包含：① 标题（20 字内，含 emoji，制造好奇或共鸣）；② 正文（150-300 字：痛点钩子 → 使用体验 → 效果/信任状 → 行动号召）；③ 话题标签 8-10 个。最后附一段「平台违禁词自查提示」。",
                "temperature": 0.8,
                "output_format": "markdown",
            }
        ],
        "variables": [
            {"name": "product_name", "label": "产品", "var_type": "string", "description": "产品名称", "required": True},
            {"name": "selling_points", "label": "核心卖点", "var_type": "text", "required": True},
            {"name": "tone", "label": "语气风格", "var_type": "select", "options": ["真实体验分享", "干货测评", "好物安利", "轻幽默"], "default": "真实体验分享", "required": True},
        ],
    },
    {
        "title": "教案生成器",
        "summary": "输入课题与学段，产出完整 45 分钟教案",
        "category": "teaching-prep",
        "type": "single",
        "models": ["glm", "deepseek", "gpt"],
        "doc": "含教学目标、重难点、教学环节时间轴、课堂提问设计与作业。",
        "sample": "【示例】教案含：三维目标、重难点、导入/新授/练习/小结四环节、预设追问 5 个、分层作业。",
        "steps": [
            {
                "title": "生成教案",
                "prompt": "你是资深{{subject}}教师。请为以下课题设计一节 {{duration_minutes}} 分钟的教案：\n\n学段：{{grade}}\n课题：{{lesson_topic}}\n\n输出 Markdown：① 教学目标（知识与技能/过程与方法/情感态度）；② 教学重难点；③ 教学环节时间轴（导入/新授/练习/小结，标注每环节时长）；④ 预设课堂提问（≥5 个，含追问逻辑）；⑤ 板书设计；⑥ 分层作业（基础/提高）。符合新课标要求。",
                "temperature": 0.5,
                "output_format": "markdown",
            }
        ],
        "variables": [
            {"name": "subject", "label": "学科", "var_type": "string", "description": "如：初中数学", "required": True},
            {"name": "grade", "label": "学段年级", "var_type": "string", "description": "如：初二", "required": True},
            {"name": "lesson_topic", "label": "课题", "var_type": "string", "description": "如：一元二次方程的解法", "required": True},
            {"name": "duration_minutes", "label": "课时(分钟)", "var_type": "number", "default": "45", "required": False},
        ],
    },
    {
        "title": "客服话术润色器",
        "summary": "输入用户消息，输出安抚 + 解决方案 + 话术检查",
        "category": "ecommerce-listing",
        "type": "single",
        "models": ["glm", "kimi"],
        "doc": "面向电商客服，输出可直接回复的话术，并标注平台红线词。",
        "sample": "【示例】输出 2 版回复（标准版/暖心版）+ 红线词自查 + 升级处理建议。",
        "steps": [
            {
                "title": "润色客服回复",
                "prompt": "你是{{brand_tone}}的资深电商客服。用户发来消息：\n\n{{customer_message}}\n\n请输出：① 2 版可直接发送的回复（标准版、暖心版），每版 ≤150 字；② 话术检查：是否使用了平台禁止的绝对化承诺、诱导好评等表述；③ 若问题超出权限，给出升级处理建议（转接话术）。",
                "temperature": 0.6,
                "output_format": "markdown",
            }
        ],
        "variables": [
            {"name": "customer_message", "label": "用户消息", "var_type": "text", "description": "粘贴用户原话", "required": True},
            {"name": "brand_tone", "label": "品牌语气", "var_type": "select", "options": ["亲切热情", "专业克制", "幽默轻松"], "default": "亲切热情", "required": True},
        ],
    },
    {
        "title": "法律文书初稿生成（律师审核前用）",
        "summary": "合同/函件初稿生成，明确标注需律师把关的条款",
        "category": "legal-compliance",
        "type": "single",
        "models": ["deepseek", "glm"],
        "doc": """⚠️ 本模板仅生成**草稿**，不能替代律师意见。
输出会明确标注风险条款与待确认项。""",
        "sample": "【示例】生成协议草稿 + 「需律师重点审核的 5 处条款」清单。",
        "steps": [
            {
                "title": "生成文书初稿",
                "prompt": "你是法律文书起草助理。请起草一份 {{document_type}} 的初稿：\n\n基本事实：\n{{case_facts}}\n\n要求：① 结构完整、用语规范；② 涉及金额/期限/违约责任处用占位符【待填写】标注；③ 文末附「需执业律师重点审核的条款清单」与「常见风险提示」。再次强调：本稿仅供参考，不构成法律意见。",
                "temperature": 0.3,
                "output_format": "markdown",
            }
        ],
        "variables": [
            {"name": "document_type", "label": "文书类型", "var_type": "select", "options": ["合作协议", "服务合同", "律师函", "催款函", "保密协议", "解除协议通知"], "default": "合作协议", "required": True},
            {"name": "case_facts", "label": "基本事实", "var_type": "text", "description": "双方主体、背景、诉求等", "required": True},
        ],
    },
    {
        "title": "嵌入式驱动代码注释生成器",
        "summary": "给裸驱动代码补全寄存器级注释与文档头",
        "category": "hardware-embedded",
        "type": "single",
        "models": ["deepseek", "gpt"],
        "doc": "针对 MCU 寄存器配置代码生成逐行注释与模块文档头，适合维护祖传代码。",
        "sample": "【示例】输出带注释的完整代码 + 寄存器位域说明表 + 使用注意事项。",
        "steps": [
            {
                "title": "生成驱动注释",
                "prompt": "你是嵌入式驱动专家。请为以下 {{mcu_model}} 驱动代码补充注释：\n\n```c\n{{driver_code}}\n```\n\n要求：① 模块文件头注释（功能/寄存器基址/中断说明/依赖）；② 关键寄存器配置逐行注释（含位域含义）；③ 若代码存在明显配置隐患（时钟、时序、volatile 缺失等），在文末列出「风险提示」。输出完整注释后的代码 + 风险提示。",
                "temperature": 0.2,
                "output_format": "markdown",
            }
        ],
        "variables": [
            {"name": "driver_code", "label": "驱动代码", "var_type": "text", "description": "粘贴寄存器级驱动代码", "required": True},
            {"name": "mcu_model", "label": "MCU 型号", "var_type": "string", "description": "如：STM32F103C8T6", "required": True},
        ],
    },
]


def seed(db: Session) -> dict:
    """幂等种子：分类、账号、官方模板。"""
    result = {"categories": 0, "users": 0, "templates": 0}

    # 分类
    if db.execute(select(Category).limit(1)).scalar_one_or_none() is None:
        for i, (slug, name, icon) in enumerate(CATEGORIES):
            db.add(Category(slug=slug, name=name, icon=icon, sort=i))
        result["categories"] = len(CATEGORIES)

    # 账号
    accounts = [
        ("admin", "admin@promptflow.local", "管理员", "admin", True),
        ("creator", "creator@promptflow.local", "演示创作者", "creator", True),
        ("demo", "demo@promptflow.local", "演示用户", "user", False),
    ]
    created_users = {}
    for username, email, display, role, verified in accounts:
        u = db.execute(select(User).where(User.username == username)).scalar_one_or_none()
        if u is None:
            u = User(
                username=username,
                email=email,
                password_hash=hash_password("demo1234"),
                role=role,
                display_name=display,
                verified=verified,
                bio="PromptFlow 官方演示账号" if username != "demo" else None,
            )
            db.add(u)
            result["users"] += 1
        created_users[username] = u
    db.commit()

    # 官方模板（幂等：按标题判断）
    author = created_users["creator"]
    cat_by_slug = {c.slug: c for c in db.execute(select(Category)).scalars().all()}
    for spec in TEMPLATES:
        existing = db.execute(select(Template).where(Template.title == spec["title"])).scalar_one_or_none()
        if existing is not None:
            continue
        t = Template(
            slug=spec.get("slug") or _slug(db, spec["title"]),
            author_id=author.id,
            title=spec["title"],
            summary=spec["summary"],
            category_id=cat_by_slug[spec["category"]].id,
            template_type=spec["type"],
            steps_json=_steps_json(spec["steps"]),
            doc_md=spec.get("doc", ""),
            sample_output=spec.get("sample", ""),
            model_tags=spec.get("models", []),
            price_cents=0,
            status="draft",
        )
        db.add(t)
        db.flush()
        for i, v in enumerate(spec["variables"]):
            db.add(
                TemplateVariable(
                    template_id=t.id,
                    version="draft",
                    name=v["name"],
                    label=v.get("label") or v["name"],
                    description=v.get("description", ""),
                    var_type=v.get("var_type", "string"),
                    default_value=str(v["default"]) if v.get("default") is not None else None,
                    options_json=v.get("options"),
                    required=v.get("required", True),
                    sort_order=i,
                )
            )
        db.commit()
        create_version(db, t, "1.0.0", "官方首发版本")
        # 官方种子直接上架（跳过审核）
        t.status = "published"
        t.published_at = datetime.now(timezone.utc)
        db.commit()
        result["templates"] += 1

    # 少量模拟埋点数据（让精选/排序有区分度）
    published = db.execute(select(Template).where(Template.status == "published")).scalars().all()
    if db.execute(select(UsageLog).limit(1)).scalar_one_or_none() is None:
        demo_user = created_users["demo"]
        for idx, t in enumerate(published):
            for _ in range((len(published) - idx) * 3):
                db.add(UsageLog(user_id=demo_user.id, template_id=t.id, action="view", success=True))
                t.view_count = (t.view_count or 0) + 1
            for _ in range(len(published) - idx):
                db.add(UsageLog(user_id=demo_user.id, template_id=t.id, action="render", success=True))
                t.render_count = (t.render_count or 0) + 1
        db.commit()

    return result


def _slug(db: Session, title: str) -> str:
    import re
    import uuid

    base = re.sub(r"[^a-z0-9]+", "-", title.lower()).strip("-")[:40] or "t"
    return f"{base}-{uuid.uuid4().hex[:4]}"


def _steps_json(steps: list[dict]) -> dict:
    out = []
    for i, s in enumerate(steps, start=1):
        out.append(
            {
                "id": f"s{i}",
                "order": i,
                "title": s.get("title", f"步骤 {i}"),
                "prompt": s["prompt"],
                "model_hint": None,
                "temperature": s.get("temperature"),
                "output_format": s.get("output_format", "markdown"),
            }
        )
    links = [{"from": out[i]["id"], "to": out[i + 1]["id"], "kind": "linear"} for i in range(len(out) - 1)]
    return {"schema_version": "1.0", "steps": out, "links": links}
