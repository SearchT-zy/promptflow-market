"""PromptFlow API 全流程冒烟测试（标准库 urllib，无第三方依赖）。

用法：.venv\Scripts\python.exe scripts\smoke.py [base_url]
覆盖：注册/登录/me、创建链式模板、发布版本、提交审核、敏感词拦截、
管理员审核、市场列表/详情/搜索/分类/精选、渲染（含 422 与内置变量）、
导出 JSON/MD/API 请求体、分享链接、收藏、历史、看板、审计。
"""
import json
import sys
import urllib.error
import urllib.parse
import urllib.request

BASE = (sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:8000") + "/api/v1"

passed, failed = 0, 0
token: dict[str, str] = {}


def req(method: str, path: str, body: dict | None = None, who: str | None = None,
        headers: dict | None = None) -> tuple[int, dict | str]:
    url = BASE + path
    data = json.dumps(body, ensure_ascii=False).encode() if body is not None else None
    h = {"Content-Type": "application/json"}
    if who and token.get(who):
        h["Authorization"] = f"Bearer {token[who]}"
    if headers:
        h.update(headers)
    r = urllib.request.Request(url, data=data, headers=h, method=method)
    try:
        with urllib.request.urlopen(r, timeout=30) as resp:
            raw = resp.read().decode()
            ct = resp.headers.get("Content-Type", "")
            return resp.status, (raw if "markdown" in ct else (json.loads(raw) if raw else {}))
    except urllib.error.HTTPError as e:
        raw = e.read().decode()
        try:
            return e.code, json.loads(raw)
        except Exception:
            return e.code, raw


def err(r) -> dict:
    if isinstance(r, dict):
        if "error" in r:
            return r["error"]
        if isinstance(r.get("detail"), dict) and "error" in r["detail"]:
            return r["detail"]["error"]
    return {}


def check(name: str, cond: bool, extra: str = ""):
    global passed, failed
    if cond:
        passed += 1
        print(f"  ✓ {name}")
    else:
        failed += 1
        print(f"  ✗ {name}  {extra}")


def main():
    print(f"目标：{BASE}\n")

    # ---- auth ----
    print("[auth]")
    import random
    uname = f"smoke_{random.randint(1000, 9999)}"
    st, r = req("POST", "/auth/register", {"username": uname, "email": f"{uname}@smoketest.com",
                                           "password": "test1234", "display_name": "冒烟用户"})
    check("注册 201", st == 201, str(r))
    token["user"] = r.get("token", "")

    st, r = req("POST", "/auth/login", {"account": uname, "password": "test1234"})
    check("登录 200", st == 200, str(r))

    st, r = req("POST", "/auth/login", {"account": uname, "password": "wrongpass"})
    check("错误密码 401", st == 401)

    st, r = req("GET", "/auth/me", who="user")
    check("me 返回用户", st == 200 and r.get("username") == uname, str(r))

    # ---- admin 登录 ----
    st, r = req("POST", "/auth/login", {"account": "admin", "password": "demo1234"})
    check("admin 登录", st == 200, str(r))
    token["admin"] = r.get("token", "")

    # ---- 创建链式模板 ----
    print("[templates]")
    body = {
        "title": "冒烟链式模板",
        "summary": "两步链冒烟",
        "template_type": "chain",
        "category": "code-dev",
        "model_tags": ["deepseek"],
        "doc_md": "# 说明\n测试文档",
        "steps": [
            {"title": "第一步", "prompt": "分析主题：{{topic}}", "temperature": 0.3},
            {"title": "第二步", "prompt": "基于：{{__prev_output__}} 展开写 {{topic}}，并引用 {{__step_1_output__}}", "temperature": 0.5},
        ],
        "variables": [
            {"name": "topic", "label": "主题", "var_type": "string", "required": True},
        ],
    }
    st, r = req("POST", "/templates", body, who="user")
    check("创建模板 201", st == 201, str(r))
    tid = r.get("id", "")
    check("slug 自动生成", bool(r.get("slug")))
    check("创建后为草稿", r.get("status") == "draft")

    st, r = req("POST", "/templates", {**body, "variables": [{"name": "__bad", "label": "x"}]}, who="user")
    check("保留前缀变量被拒 422", st == 422 and err(r).get("code") == "INVALID_VARIABLE", str(r))

    # ---- 草稿渲染（作者）----
    print("[render]")
    st, r = req("POST", "/render", {"template_id": tid, "variables": {"topic": "测试主题"}}, who="user")
    check("草稿渲染(作者) 200", st == 200 and len(r.get("rendered", [])) == 2, str(r))
    txt = r["rendered"][1]["text"]
    check("变量被 fence 包裹", '"""测试主题"""' in txt, txt)
    check("内置变量缺省占位", "【⚠ 此处粘贴第 1 步模型的输出】" in txt, txt)

    st, r = req("POST", "/render", {"template_id": tid, "variables": {}}, who="user")
    check("缺必填变量 422 VARIABLE_MISSING", st == 422 and err(r).get("code") == "VARIABLE_MISSING", str(r))

    st, r = req("POST", "/render", {"template_id": tid, "variables": {"topic": "t"}, "context": {"s1_output": "上一步真实输出"}}, who="user")
    check("context 回填 __prev_output__", st == 200 and '"""上一步真实输出"""' in r["rendered"][1]["text"], str(r))

    # ---- 审核流转（先测敏感词拦截）----
    print("[review]")
    st, r = req("PUT", f"/templates/{tid}", {**body, "doc_md": "本模板教大家生成恶意软件"}, who="user")
    st, r = req("POST", f"/templates/{tid}/submit", who="user")
    check("敏感词拦截 422 CONTENT_REJECTED", st == 422 and err(r).get("code") == "CONTENT_REJECTED", str(r))
    st, r = req("PUT", f"/templates/{tid}", body, who="user")
    st, r = req("POST", f"/templates/{tid}/submit", who="user")
    check("正常提交 → reviewing", st == 200 and r.get("status") == "reviewing", str(r))

    st, r = req("GET", "/admin/review/queue", who="admin")
    check("审核队列可见", st == 200 and any(i["id"] == tid for i in r["items"]), str(r))
    st, r = req("GET", f"/admin/review/{tid}", who="admin")
    check("审核详情含 scan_hits", st == 200 and "scan_hits" in r)
    st, r = req("POST", f"/admin/review/{tid}", {"action": "approve"}, who="admin")
    check("审核通过 → published", st == 200 and r.get("status") == "published", str(r))
    st, r = req("GET", f"/templates/{tid}/versions", who="user")
    check("首审通过自动生成 1.0.0", st == 200 and any(v["version"] == "1.0.0" for v in r["items"]), str(r))

    # ---- 版本发布与回滚 ----
    print("[versions]")
    st, r = req("POST", f"/templates/{tid}/versions", {"version": "1.1.0", "changelog": "v1.1"}, who="user")
    check("发布 1.1.0（已上架模板直接生效）", st == 201, str(r))
    st, r = req("POST", f"/templates/{tid}/versions", {"version": "1.1.0", "changelog": "重复"}, who="user")
    check("重复版本被拒", st == 422)
    st, r = req("POST", f"/templates/{tid}/versions", {"version": "0.9.0", "changelog": "更低版本"}, who="user")
    check("更低版本被拒", st == 422)
    st, r = req("GET", f"/templates/{tid}/versions", who="user")
    check("版本列表", st == 200 and len(r["items"]) >= 2)

    # ---- 市场 ----
    print("[market]")
    st, r = req("GET", "/market/templates?sort=newest&page_size=5")
    check("市场列表", st == 200 and len(r["items"]) > 0 and all("author" in i for i in r["items"]), str(r)[:200])
    st, r = req("GET", "/market/templates?category=code-dev&price=free")
    check("分类+价格筛选", st == 200)
    st, r = req("GET", "/market/search?q=" + urllib.parse.quote("冒烟链式"))
    check("搜索命中", st == 200 and any(i["title"] == "冒烟链式模板" for i in r["items"]), str(r)[:300])
    st, r = req("GET", "/market/categories")
    check("分类目录含计数", st == 200 and len(r["items"]) >= 10 and "count" in r["items"][0])
    st, r = req("GET", "/market/featured")
    check("精选列表", st == 200 and len(r["items"]) > 0)
    slug = None
    st, r = req("GET", "/market/search?q=" + urllib.parse.quote("冒烟链式"))
    if r.get("items"):
        slug = r["items"][0]["slug"]
    st, r = req("GET", f"/market/templates/{slug}")
    check("详情页(公开)", st == 200 and r.get("can_use") is True and "versions" in r and "variables" in r, str(r)[:200])

    # ---- 导出 ----
    print("[export]")
    st, r = req("GET", f"/templates/{tid}/export/json", who="user")
    check("导出 JSON 带 schema_version+source", st == 200 and r.get("schema_version") == "1.0" and r.get("source") == "promptflow", str(r)[:200])
    st, r = req("GET", f"/templates/{tid}/export/markdown", who="user")
    check("导出 Markdown", st == 200 and "冒烟链式模板" in r)
    st, r = req("POST", f"/templates/{tid}/export/api-body?adapter=deepseek&as=curl",
                {"variables": {"topic": "API 导出"}}, who="user")
    check("API 请求体(deepseek/curl)", st == 200 and r["base_url"] == "https://api.deepseek.com/v1/chat/completions"
          and len(r["steps"]) == 2 and "curl" in r["steps"][0], str(r)[:200])
    st, r = req("POST", f"/templates/{tid}/share", {"max_visits": 3, "preset_variables": {"topic": "预置主题"}}, who="user")
    check("创建分享链接", st == 201 and r.get("token"), str(r))
    st, r = req("GET", f"/share/{r['token']}")
    check("分享页(免登录)", st == 200 and r["preset_variables"] == {"topic": "预置主题"} and r["visit_count"] == 1, str(r)[:200])

    # ---- 收藏/历史 ----
    print("[me]")
    st, r = req("PUT", f"/favorites/{tid}", who="user")
    check("收藏", st == 200 and r.get("favorited") is True)
    st, r = req("GET", "/me/favorites", who="user")
    check("收藏列表", st == 200 and any(i["id"] == tid for i in r["items"]))
    st, r = req("GET", "/me/history", who="user")
    check("调用记录", st == 200 and any(i["action"] == "render" for i in r["items"]))
    st, r = req("GET", "/me/stats", who="user")
    check("个人统计", st == 200 and r["favorites_count"] >= 1)

    # ---- 创作者看板 / 回滚 / 下架 ----
    print("[creator]")
    st, r = req("GET", "/creator/dashboard", who="user")
    check("数据看板", st == 200 and r["totals"]["renders"] >= 1, str(r)[:200])
    st, r = req("POST", f"/templates/{tid}/rollback", {"version": "1.0.0"}, who="user")
    check("回滚生成新版本 1.2.0", st == 201 and r.get("version") == "1.2.0", str(r))
    st, r = req("GET", f"/templates/{tid}/diff?from=1.0.0&to=1.1.0", who="user")
    check("版本 diff", st == 200 and "lines" in r)
    st, r = req("POST", f"/templates/{tid}/offline", who="user")
    check("下架", st == 200 and r.get("status") == "offline")

    # ---- admin 其它 ----
    print("[admin]")
    st, r = req("GET", "/admin/stats", who="admin")
    check("admin 统计", st == 200 and r["templates"] >= 11)
    st, r = req("GET", "/admin/audit-logs", who="admin")
    check("审计日志", st == 200 and len(r["items"]) >= 1)
    st, r = req("GET", "/admin/users", who="admin")
    check("用户列表", st == 200 and len(r["items"]) >= 4)
    st, r = req("GET", "/admin/review/queue", who="user")
    check("普通用户访问 admin 被拒 403", st == 403)

    # ---- meta / 权限 ----
    st, r = req("GET", "/meta")
    check("meta", st == 200 and r["app_name"] == "PromptFlow")
    st, r = req("GET", "/templates/mine")
    check("未登录访问 mine 401", st == 401)

    print(f"\n结果：{passed} 通过 / {failed} 失败")
    sys.exit(1 if failed else 0)


if __name__ == "__main__":
    main()
