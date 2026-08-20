# PromptFlow（提示流）

面向中文 AI 从业者的「带变量的链式工作流 Prompt 模板」交易市场。创作者上架单条 Prompt 或多步骤 Workflow 模板；使用者搜索、预览、填充 `{{变量}}`、实时渲染出完整 Prompt，一键复制或导出 JSON / API 请求体 / Markdown / 分享链接，对接 MCP、Cursor、DeepSeek、GLM、Kimi、GPT 等模型生态。

> 🔗 开源仓库：https://github.com/SearchT-zy/promptflow-market · License: MIT

> 完整产品需求见 [`PRD.md`](./PRD.md)（v1.0）。本仓库实现 MVP（V1.x）范围：跑通「上传 → 渲染 → 复制/导出」免费闭环（PRD §8.1）。

## 功能（MVP 已实现）

- **模板编辑器（Studio）**：单条 / 线性链式模板；步骤增删排序、温度与输出格式；`{{__prev_output__}}` / `{{__step_N_output__}}` 内置变量；变量可视化定义（string/text/number/select/boolean、必填、默认值、选项）；本地实时预览（300ms 防抖）；版本发布（semver + changelog 必填）、版本对比（diff）、一键回滚
- **变量渲染引擎**：`{{name}}` 单趟替换、变量值 `"""…"""` 三引号 fence 包裹、10,000 字符截断、必填缺失 422 `VARIABLE_MISSING`；变量名 ASCII 白名单 + `__` 前缀保留（防注入）
- **市场广场**：列表筛选（免费/付费、分类、模型）+ 排序（综合/销量/评分/最新/价格）+ 游标分页；详情页（说明文档、变量表、样例输出、版本历史）；关键词搜索（标题/简介/说明/标签）
- **导出四件套**：复制渲染文本；导出模板 JSON（`schema_version` + `source: promptflow`）；生成 API 请求体（openai/deepseek/glm/kimi/claude adapter，curl / Python 两种形态）；导出 GitHub Markdown；分享链接（token、过期时间、最大访问次数、预设变量，免登录填写渲染）
- **账号**：邮箱+密码注册登录（JWT）、创作者角色自动升级
- **审核**：提交时敏感词 + 规则自动过滤（命中拒收并给出明细）；管理员审核队列（预览渲染 + 命中高亮 + 通过/驳回）
- **创作者后台**：作品管理（草稿/审核中/已上架/已驳回/已下架）、数据看板（浏览/渲染/导出漏斗）
- **双模式**：`.env` 设 `MARKETPLACE_ENABLED=false` 即开源自部署模式（关闭交易能力，保留模板库 + 编辑器 + 导出）

## 技术栈

| 层 | 选型 |
|---|---|
| 后端 | Python 3.11 · FastAPI · SQLAlchemy 2（SQLite 开发 / PostgreSQL 生产）· PyJWT · bcrypt |
| 前端 | React 18 · TypeScript · Vite 5 · Tailwind CSS 3 · react-router 6 |
| 数据 | 17 张核心表（PRD §4），金额以「分」存储，UUID 字符串主键，JSON 字段跨库兼容 |

## 目录结构

```
promptflow/
├── PRD.md                  # 产品需求文档
├── docs/api-contract.md    # API 契约（前后端共同依据）
├── backend/                # FastAPI 后端（/api/v1，共 30+ 端点）
│   ├── app/
│   │   ├── main.py         # 入口
│   │   ├── models.py       # 17 张表
│   │   ├── render.py       # 渲染引擎（核心）
│   │   ├── sensitive.py    # 敏感词/规则过滤
│   │   ├── seed.py         # 官方种子（分类/账号/10 套模板）
│   │   └── routers/        # auth/templates/render/market/export/share/me/creator/admin
│   ├── requirements.txt
│   └── .env.example
└── frontend/               # React 前端（18 个页面路由）
```

## 快速开始

### 1. 后端

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate        # Windows；macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
copy .env.example .env        # 按需修改；不改也能跑（默认 SQLite）
uvicorn app.main:app --reload --port 8000
```

- API 文档：http://127.0.0.1:8000/docs
- 首次启动自动建表并写入种子数据（10 套官方模板、分类、演示账号）

### 2. 前端

```bash
cd frontend
npm install
npm run dev                  # http://localhost:5173（/api 已代理到 8000；5173 被占用时 Vite 会自动换端口）
```

> 后端另有 `scripts/smoke.py`（API 全流程 49 项冒烟）与 `scripts/integration_web.py`（前后端联调冒烟），可直接运行。

### 3. 演示账号

| 账号 | 密码 | 角色 |
|---|---|---|
| admin | demo1234 | 管理员（审核/后台） |
| creator | demo1234 | 已认证创作者（10 套官方模板作者） |
| demo | demo1234 | 普通用户 |

## 核心流程演示

1. 打开 http://localhost:5173 → 浏览市场，打开「电商 Listing 三步生成器」
2. 「免费使用」→ 填 `产品名 / 核心卖点 / 目标平台` → 右侧实时渲染（变量值被 `"""…"""` 包裹）
3. 复制单步/全部文本；或导出 JSON / Markdown；或生成 API 请求体（选 deepseek + curl）
4. 用 creator 登录 → Studio 新建链式模板 → 保存草稿 → 发布新版本 → 提交审核
5. 用 admin 登录 → 后台审核队列 → 通过 → 模板出现在市场

## MVP 未包含（PRD §8.2 → V2/V3）

支付/订单/提现/分成、订阅与 Pack、用户评价、企业 API Key 与计量、DAG 分支工作流、站内试运行、PG 中文分词（LIKE 兜底）。

## Docker（可选）

```bash
cd backend
docker build -t promptflow-api .
docker run -p 8000:8000 -v ${PWD}/data:/app/data promptflow-api
```

## License

MIT（模板内容版权归各自创作者，导出物自带来源声明）。
