"""前后端联调冒烟：通过 Vite dev server（5173）的 /api 代理访问后端。

用法：.venv\Scripts\python.exe scripts\integration_web.py [frontend_url]
前提：前端 dev server 与后端(8000)均已启动。
"""
import json
import sys
import urllib.error
import urllib.request

FRONT = (sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:5173").rstrip("/")

passed, failed = 0, 0


def get(url: str, headers: dict | None = None):
    req = urllib.request.Request(url, headers=headers or {})
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            return r.status, r.read().decode(), r.headers
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode(), e.headers


def post(url: str, body: dict, headers: dict | None = None):
    h = {"Content-Type": "application/json"}
    if headers:
        h.update(headers)
    req = urllib.request.Request(url, data=json.dumps(body, ensure_ascii=False).encode(), headers=h, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            return r.status, json.loads(r.read().decode())
    except urllib.error.HTTPError as e:
        raw = e.read().decode()
        try:
            return e.code, json.loads(raw)
        except Exception:
            return e.code, raw


def check(name, cond, extra=""):
    global passed, failed
    if cond:
        passed += 1
        print(f"  ✓ {name}")
    else:
        failed += 1
        print(f"  ✗ {name}  {extra}")


def main():
    print(f"前端：{FRONT}（通过 /api 代理到后端）\n")

    # 1. SPA 页面
    st, html, _ = get(FRONT + "/")
    check("首页 HTML 200", st == 200 and "PromptFlow" in html, f"st={st}")

    for route in ("/search", "/pricing", "/docs", "/terms", "/login"):
        st, html, _ = get(FRONT + route)
        check(f"SPA 路由 {route} 200", st == 200 and "<div id=\"root\">" in html, f"st={st}")

    # 2. 代理 → 后端
    st, body, _ = get(FRONT + "/api/v1/health")
    check("代理 /api/v1/health", st == 200 and '"ok":true' in body, f"st={st} {body[:120]}")

    st, body, _ = get(FRONT + "/api/v1/meta")
    check("代理 /api/v1/meta", st == 200 and "PromptFlow" in body)

    # 3. 通过代理的完整业务流：登录 → 市场 → 详情 → 渲染 → 分享
    st, r = post(FRONT + "/api/v1/auth/login", {"account": "demo", "password": "demo1234"})
    check("代理登录 demo", st == 200 and r.get("token"), f"st={st} {str(r)[:150]}")
    auth = {"Authorization": f"Bearer {r['token']}"}

    st, body, _ = get(FRONT + "/api/v1/market/templates?page_size=24")
    items = json.loads(body).get("items", [])
    check("代理市场列表 ≥10", st == 200 and len(items) >= 10, f"st={st} len={len(items)}")

    slug = items[0]["slug"] if items else None
    st, body, _ = get(FRONT + f"/api/v1/market/templates/{slug}")
    detail = json.loads(body)
    check("代理详情页数据", st == 200 and detail.get("steps") and detail.get("variables"))

    tid = detail["id"]
    st, r = post(
        FRONT + "/api/v1/render",
        {"template_id": tid, "variables": {"product_name": "测试键盘", "selling_points": "热插拔", "target_platform": "淘宝"}}
        if tid == items[0]["id"] else {"template_id": tid, "variables": {}},
        auth,
    )
    ok = st == 200 and len(r.get("rendered", [])) >= 1
    if not ok:  # 非变量模板兜底：空变量渲染
        st, r = post(FRONT + "/api/v1/render", {"template_id": tid, "variables": {}}, auth)
        ok = st == 200 and len(r.get("rendered", [])) >= 1
    check("代理渲染模板", ok, f"st={st} {str(r)[:150]}")

    st, r = post(FRONT + f"/api/v1/templates/{tid}/share", {"max_visits": 2}, auth)
    check("代理创建分享链接", st == 201 and r.get("token"), f"st={st} {str(r)[:150]}")

    print(f"\n结果：{passed} 通过 / {failed} 失败")
    sys.exit(1 if failed else 0)


if __name__ == "__main__":
    main()
