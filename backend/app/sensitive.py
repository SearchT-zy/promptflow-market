"""提交时敏感词与规则过滤（PRD 3.5 两级审核的第一级）。
命中即拒收并记录；通过后进入人工审核队列。
"""
import re

# 词库（MVP 内置；生产可外接词库服务）
SENSITIVE_WORDS = [
    "恶意软件", "木马", "钓鱼页面", "钓鱼网站", "勒索软件", "病毒制作",
    "盗号", "刷单教程", "诈骗话术", "套现", "洗钱", "违禁品制作",
    "人肉搜索", "开盒", "翻墙教程", "色情内容", "博彩推广",
]

# 规则：按意图匹配（命中直接拒收）
INTENT_RULES = [
    (re.compile(r"(生成|编写|制作|设计).{0,8}(恶意软件|木马|病毒|勒索|钓鱼)"), "禁止生成恶意软件类模板"),
    (re.compile(r"(仿冒|伪造).{0,6}(网站|页面|链接)"), "禁止仿冒/钓鱼页面类模板"),
    (re.compile(r"(破解|绕过).{0,8}(验证|支付|风控|版权|DRM)"), "禁止破解/绕过类模板"),
    (re.compile(r"(非法|违规|违法).{0,8}(获取|收集|售卖).{0,6}(个人信息|数据)"), "禁止违规获取个人信息类模板"),
    (re.compile(r"(制作|生成).{0,6}(违禁|管制).{0,6}(物品|药品|武器)"), "禁止违禁品制作类模板"),
]


def scan_text(text: str) -> list[str]:
    """返回命中的词/规则描述列表。"""
    hits: list[str] = []
    if not text:
        return hits
    low = text.lower()
    for w in SENSITIVE_WORDS:
        if w in text:
            hits.append(f"命中敏感词：{w}")
    for pat, desc in INTENT_RULES:
        if pat.search(text):
            hits.append(f"命中规则：{desc}")
    return hits


def scan_template(template_dict: dict) -> list[str]:
    """扫描模板整体内容。template_dict 为快照/草稿结构。"""
    fields = [
        template_dict.get("title", ""),
        template_dict.get("summary", ""),
        template_dict.get("doc_md", ""),
        template_dict.get("sample_output", ""),
    ]
    for s in template_dict.get("steps", []):
        fields.append(s.get("title", ""))
        fields.append(s.get("prompt", ""))
    for v in template_dict.get("variables", []):
        fields.append(v.get("label", ""))
        fields.append(v.get("description", ""))
        fields.append(v.get("default_value") or "")

    hits: list[str] = []
    seen: set[str] = set()
    for f in fields:
        for h in scan_text(f or ""):
            if h not in seen:
                seen.add(h)
                hits.append(h)
    return hits
