# PromptFlow API 契约 v1（前端实现依据）

后端：FastAPI，前缀 `/api/v1`，JSON。认证：`Authorization: Bearer <jwt>`。
错误格式统一：`{"error": {"code": "...", "message": "...", "details": [...]}}`
HTTP 状态：400 参数错 / 401 未登录 / 402 PURCHASE_REQUIRED / 403 无权限 / 404 / 409 冲突 / 422 业务错误（VARIABLE_MISSING、CONTENT_REJECTED 等）。
MVP 全部模板免费，前端可认为所有已发布模板 can_use=true（但仍按接口返回为准）。
开发时前端 dev server 用 Vite proxy 把 `/api` 转发到 `http://127.0.0.1:8000`。

## 通用对象

user:
```json
{"id":"uuid","username":"zhangsan","email":"a@b.com","display_name":"张三",
 "avatar_url":null,"bio":null,"role":"user|creator|enterprise|admin",
 "verified":false,"balance_cents":0,"status":"active","created_at":"2026-08-19T00:00:00Z"}
```

variable:
```json
{"name":"product_name","label":"产品名","description":"要生成文案的产品",
 "var_type":"string|text|number|select|boolean","default_value":null,
 "options":["淘宝","拼多多"] ,"required":true,"sort_order":1}
```

step:
```json
{"id":"s1","order":1,"title":"提取产品卖点","prompt":"...{{product_name}}...",
 "model_hint":"deepseek-chat","temperature":0.3,"output_format":"markdown"}
```

template（作者视角完整对象，GET /templates/{id} 返回）:
```json
{"id":"uuid","slug":"ecom-listing-3step","title":"电商 Listing 三步生成器",
 "summary":"一句话简介","category":"ecommerce-listing","category_name":"电商 Listing",
 "template_type":"single|chain","model_tags":["deepseek","glm"],
 "price_cents":0,"status":"draft|reviewing|published|rejected|offline",
 "current_version":"1.0.0","step_count":3,
 "doc_md":"说明文档 Markdown","sample_output":"作者上传的样例输出文本",
 "steps":[step...],"variables":[variable...],
 "cover_url":null,"view_count":0,"render_count":0,"sales_count":0,
 "rating_avg":0,"rating_count":0,
 "review_note":"驳回原因(可空)","created_at":"...","updated_at":"...","published_at":"..."}
```

card（市场卡片）:
```json
{"id":"uuid","slug":"...","title":"...","summary":"...",
 "category":"ecommerce-listing","category_name":"电商 Listing",
 "model_tags":["deepseek"],"price_cents":0,"template_type":"chain",
 "step_count":3,"sales_count":12,"rating_avg":0,"rating_count":0,
 "view_count":345,"author":{"id":"uuid","display_name":"张三","avatar_url":null,"verified":true},
 "published_at":"...","cover_url":null}
```

## 端点明细

### Auth
- `POST /auth/register` body `{"username","email","password","display_name"?}` → 201 `{"token":"jwt","user":user}`。409=用户名/邮箱已存在。密码 ≥6 位。
- `POST /auth/login` body `{"account":"用户名或邮箱","password"}` → 200 `{"token","user"}`。401 凭据错误。
- `GET /auth/me` → 200 `user`（401 未登录）。

### Templates（创作者，需登录）
- `POST /templates` 创建草稿，body：
  ```json
  {"title","summary","template_type":"single|chain","category":"code-dev",
   "model_tags":["deepseek"],"price_cents":0,"doc_md":"","sample_output":"",
   "steps":[{"title","prompt","model_hint"?,"temperature"?,"output_format"?}],
   "variables":[{"name","label","description"?,"var_type","default_value"?,"options"?,"required"?,"sort_order"?}]}
  ```
  → 201 完整 template 对象（status=draft，slug 服务端生成）。变量名校验失败 → 422 `{"error":{"code":"INVALID_VARIABLE","details":[{"name":"...","reason":"bad_name|reserved|duplicate"}]}}`。单条模板 steps 只允许 1 个。
- `GET /templates/mine` → `{"items":[worksItem]}`；worksItem = template 对象去除 steps/variables/doc_md/sample_output。
- `GET /templates/{id}` → 作者视角完整 template 对象（含草稿内容）。403 非作者。
- `PUT /templates/{id}` → 整体替换草稿，body 同 POST；status=reviewing 时 409；返回完整对象。
- `POST /templates/{id}/versions` body `{"version":"1.0.0","changelog":"修改说明(必填)"}` → 201 `{"version","changelog","published_at"}`。版本必须为 semver 且 > 当前版本，否则 422 INVALID_VERSION。发布后模板状态自动变 published。
- `GET /templates/{id}/versions` → `{"items":[{"version","changelog","published_at"}]}`（新→旧）。
- `POST /templates/{id}/rollback` body `{"version":"1.0.0","changelog"?}` → 201 `{"version":"新版本号","changelog","published_at"}`（以旧版本内容创建新版本，版本号自动递增）。
- `GET /templates/{id}/diff?from=1.0.0&to=1.2.0` → `{"lines":[{"type":"same|add|del","text":"..."}]}`（快照逐行 diff）。
- `POST /templates/{id}/submit` → 敏感词扫描；通过 → `{"status":"reviewing"}`；命中 → 422 `{"error":{"code":"CONTENT_REJECTED","details":["命中词或规则描述..."]}}`。
- `POST /templates/{id}/offline` → 已发布模板下架 → `{"status":"offline"}`。
- `DELETE /templates/{id}` → 仅 draft/rejected 可删。

### Render
- `POST /render` body `{"template_id","version"?,"step"?,"variables":{},"context":{"s1_output":"..."}?}`
  - 200 `{"template_id","version","rendered":[{"step":1,"title":"...","text":"渲染文本"}],"warnings":[]}`
  - 422 `{"error":{"code":"VARIABLE_MISSING","details":[{"name":"...","reason":"required"}]}}`
  - 403 非作者渲染他人草稿；404 模板不存在；402 付费未购（MVP 不出现）。
  - 渲染规则：`{{name}}` 单趟正则替换（`\{\{\s*[a-zA-Z_]\w{0,63}\s*\}\}`）；用户变量值用 `"""值"""` 三引号包裹；值超 10000 字符截断并加 `…[截断]`，并在 warnings 提示；`__prev_output__` 取 context[`s{i-1}_output`]，缺省渲染为 `【⚠ 此处粘贴第 {i-1} 步模型的输出】`；`__step_N_output__` 取 context[`s{N}_output`]，缺省渲染为 `【⚠ 此处粘贴第 {N} 步模型的输出】`。值不再二次解析。前端 renderLocal 的占位文案必须与此完全一致。

### Market
- `GET /market/templates?category=&price=free|paid&model=&sort=&cursor=&page_size=24`
  - sort ∈ `default|sales|rating|newest|price_asc|price_desc`（缺省 default）
  - → `{"items":[card],"next_cursor":"...|null","has_more":false,"total_est":132}`
- `GET /market/templates/{slug}` → 详情对象（card 全部字段 + doc_md + sample_output + steps + variables + can_use + versions:`[{"version","changelog","published_at"}]`）。
- `GET /market/search?q=关键词&sort=&cursor=` → 同列表响应（q 匹配标题/简介/说明/标签）。
- `GET /market/categories` → `{"items":[{"slug","name","icon","sort","count"}]}`。
- `GET /market/featured?limit=6` → `{"items":[card]}`（首页精选，按 render_count 降序）。

### Export（需登录）
- `GET /templates/{id}/export/json` → JSON 模板 schema：`{"schema_version":"1.0","source":"promptflow","url":"https://promptflow.example.com/t/{slug}","exported_at":"...","template":{"title","slug","template_type","category","model_tags","price_cents","doc_md","steps":[...],"variables":[...]}}`
- `GET /templates/{id}/export/markdown` → `text/markdown`，内容为 GitHub README 风格文档（模板说明/变量表/使用方法/每步 Prompt 代码块/License/来源链接）。前端用 fetch + `Accept: text/markdown` 拿纯文本展示/下载。
- `POST /templates/{id}/export/api-body?adapter=openai|deepseek|glm|kimi|claude&as=json|curl|python`
  body `{"variables":{},"context"?:{}}`
  → `{"adapter","base_url","steps":[{"step","title","body":{"model","temperature","messages":[...]},"curl":"...","python":"..."}],"note":"第 2 步请将第 1 步的模型输出回填至 {{__prev_output__}} 后再请求"}`
  - base_url：openai=`https://api.openai.com/v1/chat/completions`，deepseek=`https://api.deepseek.com/v1/chat/completions`，glm=`https://open.bigmodel.cn/api/paas/v4/chat/completions`，kimi=`https://api.moonshot.cn/v1/chat/completions`，claude=`https://api.anthropic.com/v1/messages`
  - model 默认：openai=`gpt-4o-mini`，deepseek=`deepseek-chat`，glm=`glm-4-flash`，kimi=`moonshot-v1-8k`，claude=`claude-3-5-sonnet-latest`；若步骤 model_hint 非空则用 model_hint。
- `POST /templates/{id}/share` body `{"expires_in_seconds"?,"max_visits"?,"preset_variables"?:{}}` → 201 `{"token","url":"https://promptflow.example.com/share/{token}","expires_at":null|"..","max_visits":null|100}`
- `GET /share/{token}`（免登录）→ 200 `{"template":{card+doc_md+steps+variables},"preset_variables":{},"expires_at":null,"max_visits":null,"visit_count":1}`；失效 → 410 `{"error":{"code":"SHARE_INVALID","message":"分享链接已失效"}}`。

### Me / Favorites
- `GET /me/purchases` → `{"items":[]}`（MVP 空）。
- `GET /me/favorites` → `{"items":[card]}`。
- `PUT /favorites/{template_id}` → `{"favorited":true}`；`DELETE /favorites/{template_id}` → `{"favorited":false}`。
- `GET /me/history` → `{"items":[{"id","action":"view|render|export_json|export_md|export_api|share","template_id","template_title","success","created_at"}]}`（新→旧，限 100 条）。
- `GET /me/stats` → `{"favorites_count":1,"purchases_count":0,"render_count":3}`。
- `GET /me/api-keys` → `{"items":[]}`（V3，占位）。

### Creator Dashboard
- `GET /creator/dashboard` → `{"totals":{"views":12,"renders":5,"exports":2,"shares":1,"sales":0,"revenue_cents":0},"by_template":[{"id","title","views","renders","exports","shares","sales"}],"funnel":{"views":12,"renders":5,"exports":2}}`
- `GET /creator/revenues` → `{"items":[]}`（V2 占位）。
- `POST /creator/withdrawals` → 501 `{"error":{"code":"TRADE_DISABLED","message":"MVP 阶段未开放提现"}}`。

### Admin（role=admin）
- `GET /admin/review/queue` → `{"items":[{"id","slug","title","category_name","author_name","submitted_at"}]}`。
- `GET /admin/review/{id}` → 完整 template 对象 + `"scan_hits":["命中词..."]`（敏感词扫描结果，供审核工作台高亮）。
- `POST /admin/review/{id}` body `{"action":"approve|reject","reason"?}` → 200 更新后的 template 对象（approve→published；reject→rejected 且 review_note=reason）。
- `GET /admin/templates?status=&q=` → `{"items":[template 精简对象]}`。
- `PUT /admin/templates/{id}/status` body `{"status":"offline|published","reason"?}` → 200。
- `GET /admin/users` → `{"items":[user]}`；`PUT /admin/users/{id}` body `{"status"?:"active|banned","role"?:"user|creator|admin","verified"?}` → 200。
- `GET /admin/categories` / `POST /admin/categories`（body `{"slug","name","icon"?,"sort"?}`）/ `PUT /admin/categories/{slug}` / `DELETE /admin/categories/{slug}`。
- `GET /admin/tags` → `{"items":[{"id","name","use_count"}]}`。
- `GET /admin/audit-logs` → `{"items":[{"id","admin_id","action","target_type","target_id","detail","created_at"}]}`。
- `GET /admin/stats` → `{"users":3,"templates":10,"published":8,"reviewing":1,"renders":20}`。

### Meta
- `GET /meta` → `{"app_name":"PromptFlow","version":"1.0.0","marketplace_enabled":true}`
- `GET /health` → `{"ok":true}`

## 前端页面路由（MVP）

| 路由 | 页面 | 要点 |
|---|---|---|
| `/` | 首页 | 搜索框+精选模板(card 网格)+分类入口 |
| `/search?q=` | 搜索页 | 结果+侧栏筛选（价格/分类/模型）+排序 |
| `/t/:slug` | 详情页 | 头图标题/免费使用按钮/说明文档(md)/变量表/样例输出/版本历史与changelog/来源分享 |
| `/t/:slug/use` | 使用工作台 | 左变量表单（按类型渲染控件），右渲染结果（分步卡片+分步复制+一键全部复制），ExportBar：JSON/MD/API体(adapter+as选择)/分享链接；本地实时渲染(300ms防抖) |
| `/login` `/register` | 账号 | 表单+错误提示；成功后存 token 跳转 |
| `/studio/new` `/studio/:id/edit` | 编辑器 | 左步骤面板（single 模式隐藏"添加步骤"），链式可增删拖拽排序+插入 `{{__prev_output__}}` 按钮；右变量面板（增删/类型/必填/默认值/选项）+预览面板（试填变量本地渲染）+保存草稿/发布新版本(changelog 必填弹窗)/提交审核 |
| `/studio/:id/versions` | 版本管理 | 版本列表+changelog+diff 对比（选择两个版本）+回滚按钮 |
| `/dashboard/works` | 作品管理 | 状态标签(draft/reviewing/published/rejected/offline)+提交审核/下架/删除/编辑入口 |
| `/dashboard/analytics` | 数据看板 | totals+按模板表+funnel |
| `/me` | 个人中心 | 三 tab：已购(空态)/收藏/历史 |
| `/share/:token` | 分享页(免登录) | 顶部模板卡+变量表单(预填 preset)+本地渲染+复制+「在 PromptFlow 中收藏」跳转登录 |
| `/admin` | 管理员 | tab：审核队列(工作台:查看+通过/驳回)/模板管理/用户管理/分类管理/审计日志 |
| `/docs` `/docs/api` | 开发者文档 | 静态说明+导出格式示例 |
| `/pricing` | 定价页 | 静态（MVP 说明全部免费） |
| `/terms` `/privacy` | 协议 | 静态占位 |

## 设计规范
- 暗色默认：`bg-gray-950` 底、卡片 `bg-gray-900 border-gray-800`、主色 blue-600/500、代码 `font-mono`；右上角明暗切换（`dark` class 策略：html 加 class，Tailwind darkMode:'class'）。
- 卡片：见 PRD 10.1；渲染工作台：见 PRD 10.2；本地渲染函数：见 PRD 10.3（变量值以 `"""…"""` fence、`__prev_output__` 占位 `》》此处粘贴第 N 步模型的输出《《`、单趟替换、10000 截断）。
- 中文 UI。日期显示用本地格式。金额 `price_cents/100` 显示 ¥，0 显示「免费」。
- 鉴权：localStorage key `pf_token`；请求封装 api.ts：`apiFetch(path, {method, body})` 自动带 Bearer、401 时清 token 跳 /login、后端错误抛 `ApiError{code,message,details}`。
- npm 依赖：react@18、react-dom@18、react-router-dom@6、marked、dompurify；dev：vite@5、@vitejs/plugin-react、typescript、tailwindcss@3.4、postcss、autoprefixer、@types/react、@types/react-dom。`build` 脚本用 `vite build`（不跑 tsc，tsconfig strict:false 宽松）。
- Vite proxy：`/api` → `http://127.0.0.1:8000`。
- 项目结构：`frontend/src/{api.ts,auth.tsx,lib/render.ts,lib/md.ts,components/*,pages/*}`；路由在 `App.tsx`。
