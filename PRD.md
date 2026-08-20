# PromptFlow（提示流）— AI 工作流 Prompt 模板交易市场 PRD

| 文档属性 | 内容 |
|---|---|
| 产品名称 | PromptFlow（提示流） |
| 文档版本 | v1.0 |
| 撰写日期 | 2026-08-19 |
| 文档状态 | 初稿（待评审） |
| 产品形态 | 线上 SaaS 付费市场 + 开源自部署模板库（双模式） |
| 目标读者 | 产品、研发、运营、法务合规 |

---

## 1. 产品概述、目标、解决痛点

### 1.1 一句话定位

**PromptFlow 是一个面向中文 AI 从业者的「带变量的链式工作流 Prompt 模板」交易市场**：创作者上架单条 Prompt 或多步骤 Workflow 模板并定价售卖；使用者搜索、预览、填充 `{{变量}}`、实时渲染出完整 Prompt，一键复制或导出 JSON / API 请求体 / Markdown / 分享链接，直接对接 MCP、Cursor、DeepSeek、GLM、Kimi、GPT 等模型生态。

### 1.2 与普通 Prompt 库的本质区别

| 维度 | 普通 Prompt 库（如多数提示词网站） | PromptFlow |
|---|---|---|
| 内容单元 | 单条静态提示词 | 单条模板 + **多步骤链式 Workflow**（步骤间上下文传递） |
| 复用方式 | 整段复制后手工改内容 | **占位变量 `{{var}}`**，页面填表即渲染，可重复参数化使用 |
| 交付物 | 一段文本 | 文本 + **JSON（MCP/Agent 可消费）** + **API 请求体** + Markdown + 分享页 |
| 商业模式 | 浏览/收藏 | 买断 / 订阅 / 模板包（pack）交易，创作者分成 |
| 面向对象 | C 端爱好者 | 开发者、提示词工程师、创客、**企业批量采购与 API 调用** |

### 1.3 解决的痛点

| # | 痛点 | 现状表现 | PromptFlow 解法 |
|---|---|---|---|
| P1 | Prompt 资产散落、无法复用 | 好提示词散落在微信收藏、飞书文档、聊天记录里，换个人/换个项目就找不到了 | 结构化模板 + 分类 + 全文检索 + 账号资产库 |
| P2 | 单条 Prompt 表达不了链式流程 | 真实业务（需求分析→代码生成→评审）需要多轮串联，用户只能自己手工拼接 | 多步骤 Workflow 模板，步骤输出自动作为下一步上下文 |
| P3 | 复制后手改占位符易错 | 「把下面 XXX 换成你的主题」式提示词，改漏、改错频繁 | 变量系统：可视化定义变量（名称/说明/默认值/必填），填表渲染 |
| P4 | 优质创作者缺乏变现渠道 | 提示词工程师产出靠知识星球/公众号间接变现，无标准定价与交付物 | 上架售卖、订阅、pack 打包，平台分成结算 |
| P5 | 缺乏质量筛选 | 网上 prompt 良莠不齐，试错成本高 | 评分评价 + 销量排序 + 样例输出 + 试用预览 |
| P6 | 企业 AI 落地缺标准化模板资产 | 各业务线重复造轮子，提示词质量不可控 | 企业批量采购 + API 调用 + 私有化部署（开源版） |

### 1.4 产品目标与核心指标

| 阶段 | 时间 | 目标 | 北星指标 |
|---|---|---|---|
| MVP（V1.x） | 上线后 3 个月 | 跑通「上传→渲染→复制/导出」免费闭环，验证供需 | **周渲染次数**（每周成功渲染的模板次数） |
| V2 | 上线后 6 个月 | 打开交易（支付/订单/分成），验证付费意愿 | 付费转化率、GMV |
| V3 | 上线后 12 个月 | 企业版 + 订阅 + API 计量 | 企业客户数、MRR |

辅助指标：上架模板数（供给）、周活创作者、搜索→详情转化率、详情→渲染转化率、（V2 起）详情→购买转化率。

### 1.5 双模式产品形态

- **SaaS 模式**（promptflow.example.com）：全功能，含交易、订阅、企业服务，平台运营。
- **开源模式**（GitHub 自部署）：同一 codebase，通过启动配置 `MARKETPLACE_ENABLED=false` 关闭交易/订单/提现模块，仅保留模板库 + 编辑器 + 导出，供团队内部沉淀 Prompt 资产。两条模式共享数据模型，开源版不依赖支付与短信等服务。

---

## 2. 三类用户画像

### 2.1 创作者（卖家）

| 属性 | 描述 |
|---|---|
| 身份 | 提示词工程师、独立开发者、AI 讲师/博主、垂直领域（电商/教育/法律）专家 |
| 典型场景 | 一位 AI 讲师打磨出「三步生成电商 Listing」的链式模板：步骤1 提取产品卖点，步骤2 生成多平台文案，步骤3 输出 A/B 测试建议。她把变量设计为 `{{product_name}}、{{selling_points}}、{{target_platform}}`（显示名：产品名/核心卖点/目标平台），上架定价 ¥9.9 |
| 核心诉求 | ① 省心的上架与版本维护；② 有尊严的定价与分成；③ 看得见的数据反馈（浏览/试用/购买漏斗）；④ 被抄袭时能维权 |
| 付费意愿 | 平台抽成即成本；部分愿为 Pro 订阅（数据分析、私有模板、API）付费 |
| 成功标准 | 月分成收入 ≥ ¥1,000；模板评分 ≥ 4.5 |

### 2.2 普通使用者（买家）

| 属性 | 描述 |
|---|---|
| 身份 | 程序员、产品经理、运营、学生、内容创作者 |
| 典型场景 | 一位后端程序员要在 Cursor 里做「代码评审 Agent」，搜到「代码评审三步链」模板，在详情页填入 `{{language}}=Python、{{code_snippet}}`，实时看到渲染结果满意，免费模板直接复制；付费模板 ¥6 买断后导出 API 请求体接入自己的脚本 |
| 核心诉求 | ① 搜得到、看得懂（变量说明清晰）；② 买前能试用预览；③ 复制/导出即用，不折腾；④ 适配我在用的模型 |
| 付费意愿 | 单次 ¥1~¥29 买断为主，对高频使用的创作者/品类愿订阅 |
| 成功标准 | 5 分钟内从「搜索」到「拿到可用的最终 Prompt」 |

### 2.3 企业用户

| 属性 | 描述 |
|---|---|
| 身份 | 中小企业技术负责人、AI 落地团队、外包/代运营公司 |
| 典型场景 | 一家电商代运营公司批量采购 20 套「Listing 生成」「客服话术」「数据周报」工作流模板，通过 API Key 在内部系统中调用渲染接口，直接产出各客户账号的内容 |
| 核心诉求 | ① 批量授权与统一结算（对公）；② 稳定的渲染/导出 API；③ 内部模板资产私有化（开源版自部署）；④ SLA 与合规 |
| 付费意愿 | 年度框架采购 ¥10,000 起；私有化部署 ¥50,000/年起 |
| 成功标准 | 内部业务线人均提效可量化；模板资产可管控 |

---

## 3. 完整 PRD 功能拆解

### 3.1 模板创作编辑器（Studio）

#### 3.1.1 单条 Prompt 模板编辑
- Markdown 编辑器（带语法高亮与工具栏），正文可直接书写 `{{变量}}`；
- 字数统计、token 估算（按中文 ~1.6 字/token 粗估并标注为估算值）；
- 自动扫描正文中的 `{{xxx}}` 提取为变量清单，提示作者补齐变量元信息（见 3.1.3）。

#### 3.1.2 多步骤链式 Workflow
- 步骤列表可视化编排：新增/删除/拖拽排序步骤，每步含：步骤标题、Prompt 正文、建议模型参数（temperature）、期望输出格式（markdown/json/text）；
- **上下文传递（核心）**：步骤 N 的正文可引用内置变量——
  - `{{__prev_output__}}`：上一步的完整输出；
  - `{{__step_1_output__}}`：指定第 1 步输出（跳步引用）；
  - 编辑器中以上内置变量用不同颜色标识，禁止用户自定义同名变量（保留前缀 `__`）；
- MVP 仅支持**线性链**（1→2→3…）；V2 扩展为 DAG（并行/条件分支），数据结构从第一天起按图设计（见 4.2 steps_json）；
- 提供「运行说明文档」字段：告诉使用者每一步应把输出粘贴回哪个对话框（当使用者手动在 ChatGPT/DeepSeek 网页中执行时）。

#### 3.1.3 变量系统（可视化定义）
- 语法：`{{name}}`（name 为变量名，显示标签可中文），命名规则 `^[a-zA-Z_][a-zA-Z0-9_]{0,63}$`（ASCII 白名单，防注入第一步）；
- 每个变量的元信息：变量名、显示标签、说明（placeholder 提示语）、类型（string / text 多行 / number / select 枚举 / boolean）、默认值、是否必填、select 的选项列表；
- 渲染规则（写进产品而非隐藏在实现里）：
  1. **单次替换、非递归**——变量值中若再含 `{{`，按字面文本输出，不二次解析（防注入核心规则）；
  2. 用户变量值统一以 `“””…“””`（三引号）包裹注入渲染结果，并在渲染预览中以浅色底纹标注「这是外部输入」；
  3. 单变量值长度上限 10,000 字符，超出截断并提示；
  4. 必填变量缺失时渲染报 422，逐项列出缺失变量。

#### 3.1.4 模型适配标签
- 预置适配模型标签：DeepSeek、GLM（智谱）、Kimi（月之暗面）、GPT 系列、Claude、通义、本地开源（Ollama）；
- 标注两层信息：①「已验证」——作者实测过并附样例输出；②「理论兼容」——未实测；
- 导出 API 请求体时按所选模型生成对应 adapter（见 3.4.3）。

#### 3.1.5 模板分类标签
- 一级分类（官方维护）：代码开发、Agent 工作流、文档处理、硬件嵌入式、电商 Listing、数据分析、教学备课、营销文案、法律合规、更多；
- 自由标签（作者自定义，审核后进入公共标签池）；
- 单模板：1 个一级分类 + ≤5 个标签。

#### 3.1.6 版本管理
- 每次发布生成不可变版本快照（语义化版本：`1.0.0`，修改说明必填）；
- 已购用户永远访问其购买时锁定的版本，可手动升级到新版本（免费升级为默认策略）；
- 支持版本对比（diff 视图）与一键回滚（回滚 = 以旧版本内容创建新版本，不删除历史）；
- 修改日志（changelog）在详情页对所有人可见。

#### 3.1.7 预览功能
- 编辑器右侧实时预览面板：填入测试变量值 → 前端本地即时渲染（输入防抖 300ms）；
- 多步骤模式逐步骤 Tab 展示渲染结果，标注内置变量的注入位置；
- 「试运行」按钮（V2）：直接调用所选模型 API 实测（作者绑定自己的 API Key 或消耗平台体验额度）。

### 3.2 市场广场

#### 3.2.1 列表与筛选
- 筛选维度：免费/付费、一级分类、适配模型、价格区间；
- 排序：综合（默认，按销量×评分×新鲜度加权）、销量、评分、最新上架、价格升降序；
- 分页：游标分页（cursor），每页 24 个卡片。

#### 3.2.2 模板卡片
- 信息：封面图（可自动用模板首步文字生成占位卡）、标题、一句话简介、标签（分类+模型）、价格（免费/¥x.x）、销量、评分（★4.8 · 37 条）、作者（头像+昵称+认证标识）、步骤数徽标（如「3 步链」）。

#### 3.2.3 模板详情页
- 区块顺序：头图与标题区 → 价格与购买按钮（免费则显示「免费使用」）→ 说明文档（Markdown）→ **变量列表**（名称/类型/说明/默认值表格）→ 预览演示（官方示例变量填充后的渲染结果）→ 样例输出（作者上传的模型真实输出）→ 版本历史与 changelog → 用户评价；
- 免费模板：登录后直接进入「使用」页（变量填写+渲染+复制/导出）；
- 付费模板：购买前可免登录预览**部分渲染结果**（变量示例值由作者指定，正文对未购用户打码显示中间 30% 内容），购买后解锁全文。

#### 3.2.4 搜索
- 全文检索范围：标题、简介、说明文档、标签、作者名（SQLite 用 FTS5，PostgreSQL 用 tsvector + 中文分词扩展 zhparser/pg_jieba，MVP 先用 LIKE + ngram 兜底）；
- 搜索框支持 `标签:电商 模型:GLM` 过滤语法（V2）；
- 空结果页展示热门模板与推荐分类。

### 3.3 交易与收益

#### 3.3.1 付费模式
| 模式 | 说明 | 定价建议 |
|---|---|---|
| 单模板买断 | 一次付费永久使用（含该版本起后续免费更新） | ¥1 ~ ¥99 |
| 模板包（Pack） | 多个模板打包出售，如「电商全流程 10 件套」 | ¥19.9 ~ ¥199 |
| 创作者订阅 | 按月订阅某创作者的**全部模板** + 后续新作 | ¥9.9 ~ ¥49/月 |
| 平台会员（V3） | 订阅平台精选库 | ¥29/月 |

#### 3.3.2 分成机制
- 默认分成：**创作者 70% / 平台 30%**（以实付金额、扣除支付通道费后计算）；拉新期（前 6 个月）新创作者首 3 笔订单平台仅抽 10%；
- 订阅收入：按订阅期内该创作者模板被实际使用的占比按月结算（简化为：订阅费的 70% 归创作者，按其订阅者消费的模板数加权分配）；
- 结算规则：可提现余额满 ¥100 可申请，T+7 审核后打款；平台开具给买家的发票与创作者给平台的发票分离（合规要求见第 9 章「二清风险」）。

#### 3.3.3 创作者后台
- 作品管理：草稿/审核中/已上架/已下架状态流转，编辑、提审、下架；
- 订单统计：按日/周/月的销量与金额曲线，TOP 模板排行；
- 收益提现：余额、流水明细、提现申请与记录；
- 数据看板（漏斗）：浏览 → 详情 → 渲染试用 → 购买，各环节转化率；变量使用统计（哪个变量最常被填错——来自 422 报错埋点，帮作者改进说明文案）。

#### 3.3.4 用户个人中心
- 我的已购（含版本锁定信息）、我的收藏、我的创作（入口）、调用记录（渲染/导出/API 调用流水）、账户设置（API Key 管理、通知偏好）。

### 3.4 导出与集成能力（差异化重点）

#### 3.4.1 复制渲染完成的最终 Prompt 文本
- 一键复制单步或多步骤全部渲染文本；多步骤提供「分步复制」（每步一个复制按钮，适配在网页版 Chat 中手动逐轮粘贴的使用方式）。

#### 3.4.2 导出 JSON 模板
- 导出与平台内部一致的模板 schema（含 steps、variables、元信息），可直接被 MCP Server / 自研 Agent 加载；
- JSON 顶层含 `schema_version` 字段保证向前兼容，`source: "promptflow"` + 模板 URL 保留来源（开源分发时的自然回流）。

#### 3.4.3 生成 API 请求体
- 选择目标 adapter：OpenAI 兼容（DeepSeek / GLM / Kimi 均兼容此格式）、原生各家格式、cURL / Python SDK 两种代码形态；
- 生成物 = 渲染后的 messages 数组 + 建议参数（temperature 等），多步骤生成请求序列（标注步骤依赖）；
- 示例见 5.3。

#### 3.4.4 导出 Markdown 文档
- 生成适配 GitHub README 的文档：模板说明、变量表、使用方法、每步 Prompt（代码块）、License 声明；服务于作者在 GitHub 开源分发并反链市场页。

#### 3.4.5 导出为可分享网页链接
- 生成只读分享页 `https://…/share/{token}`：访客**无需注册**即可填写变量、实时渲染、复制文本（付费模板分享页默认打码，作者可显式关闭分享）；
- token 可设过期时间与最大访问次数；分享页带模板卡与「在 PromptFlow 中收藏」回流入口。

### 3.5 后台管理（Admin）

- **审核上架**：队列（按提交时间）、审核工作台（预览渲染 + 变量检查 + 敏感词命中高亮）、通过/驳回（驳回理由通知作者）；
- **违规内容过滤**：两级——提交时自动过滤（敏感词库 + 规则：禁止「生成恶意软件/钓鱼页面/违规内容」类模板直接拒收并记录）+ 人工复审；上线后举报入口 + 下架流程；
- **订单管理**：查询、退款（退款自动联动分成冲正）、对账导出；
- **分成配置**：全局比例、拉新策略、创作者个别比例（签约）；
- **标签管理**：一级分类维护、公共标签池合并/清理；
- **用户管理**：封禁、实名/认证审核（创作者认证）。

---

## 4. 数据库核心表设计

> 存储策略：开发/自部署用 SQLite，生产 SaaS 用 PostgreSQL；经 SQLAlchemy ORM 抽象，JSON 字段在 PG 用 JSONB、SQLite 用 TEXT(JSON)。金额一律以「分」为整数存储。共 17 张核心表。

### 4.1 表清单总览

| # | 表名 | 用途 |
|---|---|---|
| 1 | users | 用户与角色 |
| 2 | categories | 一级分类 |
| 3 | tags | 标签池 |
| 4 | templates | 模板主表 |
| 5 | template_versions | 版本快照 |
| 6 | template_variables | 变量定义 |
| 7 | template_tags | 模板-标签多对多 |
| 8 | orders | 订单 |
| 9 | purchases | 已购授权 |
| 10 | reviews | 评价 |
| 11 | favorites | 收藏 |
| 12 | usage_logs | 渲染/导出/调用流水 |
| 13 | revenue_records | 分成流水 |
| 14 | withdrawals | 提现申请 |
| 15 | api_keys | 企业/个人 API Key |
| 16 | share_links | 分享链接 |
| 17 | admin_audit_logs | 后台操作审计 |

### 4.2 核心表结构

#### users

| 字段 | 类型 | 约束/说明 |
|---|---|---|
| id | UUID | PK |
| username | VARCHAR(50) | UNIQUE，`^[a-zA-Z0-9_-]{3,50}$` |
| email | VARCHAR(255) | UNIQUE |
| password_hash | VARCHAR(255) | bcrypt |
| role | VARCHAR(20) | `user / creator / enterprise / admin` |
| display_name | VARCHAR(100) | 昵称 |
| avatar_url | VARCHAR(500) | |
| bio | VARCHAR(500) | 创作者简介 |
| verified | BOOLEAN | 创作者认证 |
| balance_cents | INTEGER | 可提现余额（分），DEFAULT 0 |
| status | VARCHAR(20) | `active / banned` |
| created_at / updated_at | TIMESTAMPTZ | |

#### templates

| 字段 | 类型 | 约束/说明 |
|---|---|---|
| id | UUID | PK |
| slug | VARCHAR(120) | UNIQUE，URL 用 |
| author_id | UUID | FK→users.id，INDEX |
| title | VARCHAR(200) | |
| summary | VARCHAR(500) | 一句话简介 |
| category_id | INTEGER | FK→categories.id |
| cover_url | VARCHAR(500) | |
| template_type | VARCHAR(20) | `single / chain` |
| steps_json | JSONB | 步骤定义（结构见下） |
| doc_md | TEXT | 说明文档 Markdown |
| model_tags | JSONB | `["deepseek","glm","kimi","gpt"]` |
| price_cents | INTEGER | DEFAULT 0（免费），CHECK ≥ 0 |
| status | VARCHAR(20) | `draft / reviewing / published / rejected / offline` |
| current_version | VARCHAR(20) | 如 `1.2.0` |
| sales_count | INTEGER | 冗余计数，DEFAULT 0 |
| rating_avg | NUMERIC(3,2) | 冗余均值 |
| rating_count | INTEGER | |
| view_count / render_count | INTEGER | 看板埋点冗余 |
| created_at / updated_at / published_at | TIMESTAMPTZ | |

**steps_json 结构（线性链，为 DAG 预留）：**

```json
{
  "schema_version": "1.0",
  "steps": [
    {
      "id": "s1",
      "order": 1,
      "title": "提取产品卖点",
      "prompt": "你是电商专家。分析产品：{{product_name}}，卖点：{{selling_points}}…",
      "model_hint": "deepseek-chat",
      "temperature": 0.3,
      "output_format": "markdown"
    },
    {
      "id": "s2",
      "order": 2,
      "title": "生成平台文案",
      "prompt": "基于以下分析结果：{{__prev_output__}}\n为 {{target_platform}} 生成 3 版文案…",
      "model_hint": "glm-4",
      "temperature": 0.7,
      "output_format": "markdown"
    }
  ],
  "links": [
    { "from": "s1", "to": "s2", "kind": "linear" }
  ]
}
```

#### template_versions

| 字段 | 类型 | 约束/说明 |
|---|---|---|
| id | UUID | PK |
| template_id | UUID | FK→templates.id，INDEX(template_id, version) |
| version | VARCHAR(20) | semver |
| snapshot_json | JSONB | 整个模板不可变快照（steps+变量+文档） |
| changelog | VARCHAR(1000) | 必填修改说明 |
| published_at | TIMESTAMPTZ | |

#### template_variables

| 字段 | 类型 | 约束/说明 |
|---|---|---|
| id | UUID | PK |
| template_id | UUID | FK，INDEX |
| version | VARCHAR(20) | 随版本快照锁定 |
| name | VARCHAR(64) | `^[a-zA-Z_][a-zA-Z0-9_]{0,63}$`，UNIQUE(template_id, version, name) |
| label | VARCHAR(100) | 显示名（可中文） |
| description | VARCHAR(500) | 填写说明 |
| var_type | VARCHAR(20) | `string / text / number / select / boolean` |
| default_value | TEXT | |
| options_json | JSONB | select 的选项 |
| required | BOOLEAN | DEFAULT true |
| sort_order | INTEGER | 表单显示顺序 |

#### orders / purchases / reviews / favorites

| 表 | 关键字段 |
|---|---|
| orders | id, order_no(UNIQUE), buyer_id(FK), template_id(FK), order_type(`buyout/pack/subscribe`), pack_id, amount_cents, channel(`wechat/alipay`), status(`pending/paid/refunded/closed`), paid_at, created_at |
| purchases | id, buyer_id, template_id, locked_version(购买时锁定), order_id(FK), granted_at；UNIQUE(buyer_id, template_id) |
| reviews | id, template_id, user_id, rating(CHECK 1~5), content(1000), reply(作者回复), status, created_at；UNIQUE(template_id, user_id) 且仅已购可评 |
| favorites | id, user_id, template_id, created_at；UNIQUE(user_id, template_id) |

#### 结算与授权类

| 表 | 关键字段 |
|---|---|
| revenue_records | id, order_id, creator_id, gross_cents, channel_fee_cents, platform_cents, creator_cents, type(`sale/refund`), settled_at |
| withdrawals | id, creator_id, amount_cents, status(`applying/paid/rejected`), bank_info_json, applied_at, paid_at |
| usage_logs | id, user_id(可空-匿名分享页), template_id, action(`view/render/export_json/export_md/export_api/share`), variables_filled_json(脱敏后), success, created_at；按月分区 |
| api_keys | id, owner_id, key_hash(UNIQUE，仅存哈希), scope(`render/export`), rate_limit, status, last_used_at |
| share_links | id, token(UNIQUE), template_id, created_by, preset_variables_json, expires_at, max_visits, visit_count, status |
| admin_audit_logs | id, admin_id, action, target_type, target_id, detail_json, created_at |

#### categories / tags / template_tags

| 表 | 关键字段 |
|---|---|
| categories | id, slug(UNIQUE), name, sort, icon |
| tags | id, name(UNIQUE), use_count |
| template_tags | template_id, tag_id（联合 PK） |

### 4.3 关键 DDL（PostgreSQL 表达，SQLite 等价改写）

```sql
CREATE TABLE templates (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug            VARCHAR(120) NOT NULL UNIQUE,
    author_id       UUID NOT NULL REFERENCES users(id),
    title           VARCHAR(200) NOT NULL,
    summary         VARCHAR(500) NOT NULL DEFAULT '',
    category_id     INTEGER REFERENCES categories(id),
    cover_url       VARCHAR(500),
    template_type   VARCHAR(20) NOT NULL CHECK (template_type IN ('single','chain')),
    steps_json      JSONB NOT NULL,
    doc_md          TEXT NOT NULL DEFAULT '',
    model_tags      JSONB NOT NULL DEFAULT '[]',
    price_cents     INTEGER NOT NULL DEFAULT 0 CHECK (price_cents >= 0),
    status          VARCHAR(20) NOT NULL DEFAULT 'draft'
                    CHECK (status IN ('draft','reviewing','published','rejected','offline')),
    current_version VARCHAR(20) NOT NULL DEFAULT '0.1.0',
    sales_count     INTEGER NOT NULL DEFAULT 0,
    rating_avg      NUMERIC(3,2) NOT NULL DEFAULT 0,
    rating_count    INTEGER NOT NULL DEFAULT 0,
    view_count      INTEGER NOT NULL DEFAULT 0,
    render_count    INTEGER NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    published_at    TIMESTAMPTZ
);

-- 市场列表主查询索引：分类+状态；排序字段
CREATE INDEX idx_templates_market ON templates(category_id, status, published_at DESC);
CREATE INDEX idx_templates_author ON templates(author_id, status);
CREATE INDEX idx_templates_model_tags ON templates USING GIN(model_tags);

-- 渲染鉴权高频查询
CREATE UNIQUE INDEX idx_purchases_bt ON purchases(buyer_id, template_id);

-- 版本回滚定位
CREATE UNIQUE INDEX idx_version_lookup ON template_versions(template_id, version);
```

FTS（PG 方案）：

```sql
ALTER TABLE templates ADD COLUMN search_tsv tsvector
  GENERATED ALWAYS AS (to_tsvector('simple', title || ' ' || summary || ' ' || doc_md)) STORED;
CREATE INDEX idx_templates_fts ON templates USING GIN(search_tsv);
```

---

## 5. 核心API接口清单

- 风格：REST，前缀 `/api/v1`，JSON；认证 JWT（Bearer），企业调用用 `X-API-Key`；
- 错误规范：`{"error": {"code": "VARIABLE_MISSING", "message": "...", "details": [...]}}`；
- 渲染/导出接口对已购或免费模板放行，付费未购返回 `402 PURCHASE_REQUIRED`。

### 5.1 端点总表（30 个）

| 分组 | 方法与路径 | 说明 |
|---|---|---|
| Auth | POST /auth/register | 注册 |
| | POST /auth/login | 登录，签发 JWT |
| | GET /auth/me | 当前用户信息 |
| Templates | POST /templates | 创建模板（草稿） |
| | GET /templates/mine | 我的作品列表 |
| | GET /templates/{id} | 编辑视角详情 |
| | PUT /templates/{id} | 更新草稿（含变量定义） |
| | POST /templates/{id}/versions | 保存并发布新版本 |
| | GET /templates/{id}/versions | 版本列表 |
| | POST /templates/{id}/rollback | 回滚到指定版本 |
| | POST /templates/{id}/submit | 提交审核 |
| | POST /templates/{id}/offline | 下架 |
| Render | POST /render | 渲染（草稿预览/正式使用共用，鉴权策略不同） |
| Market | GET /market/templates | 列表：筛选+排序+游标分页 |
| | GET /market/search?q= | 全文检索 |
| | GET /market/templates/{slug} | 公开详情（含变量表、评价） |
| | GET /market/categories | 分类目录 |
| Export | GET /templates/{id}/export/json | 导出模板 JSON |
| | GET /templates/{id}/export/markdown | 导出 GitHub 用 MD |
| | POST /templates/{id}/export/api-body?adapter= | 生成 API 请求体/代码 |
| | POST /templates/{id}/share | 创建分享链接 |
| | GET /share/{token} | 分享页数据（匿名可访问） |
| Trade | POST /orders | 创建订单 |
| | GET /orders/{order_no} | 订单详情/支付状态 |
| | GET /me/purchases | 已购列表 |
| | POST /templates/{id}/reviews | 评价（已购限定） |
| | PUT /favorites/{template_id} / DELETE | 收藏/取消 |
| Creator | GET /creator/dashboard | 数据看板 |
| | GET /creator/revenues | 收益流水 |
| | POST /creator/withdrawals | 申请提现 |
| Admin | GET /admin/review/queue、POST /admin/review/{id} | 审核队列/通过驳回 |
| | PUT /admin/config/commission | 分成配置 |
| Enterprise | POST /enterprise/api-keys、GET /enterprise/usage | Key 管理、用量（V3） |

### 5.2 渲染引擎接口（核心）

```
POST /api/v1/render
Authorization: Bearer <jwt>
{
  "template_id": "8f2c…",
  "version": "1.2.0",           // 可省略，默认当前版
  "step": null,                  // null=渲染全部步骤；数字=仅渲染某步
  "variables": {
    "product_name": "无线机械键盘 K87",
    "selling_points": "热插拔轴体、三模连接",
    "target_platform": "淘宝"
  },
  "context": {                   // 手动链式执行时回填的上一步真实输出
    "s1_output": "…上一步模型实际输出…"
  }
}
```

```
200 OK
{
  "template_id": "8f2c…", "version": "1.2.0",
  "rendered": [
    { "step": 1, "title": "提取产品卖点", "text": "你是电商专家。分析产品：“”\"无线机械键盘 K87“”\"…" },
    { "step": 2, "title": "生成平台文案", "text": "基于以下分析结果：“”\"…(context.s1_output)…“”\"\n为 淘宝 生成 3 版文案…" }
  ],
  "warnings": []
}

422 VARIABLE_MISSING
{ "error": { "code": "VARIABLE_MISSING",
  "details": [{"name": "target_platform", "reason": "required"}] } }
```

> 渲染算法：按步骤 order 顺序，对每步 prompt 做一次 `{{name}}` 替换；`__prev_output__`/`__step_N_output__` 优先取 `context`，其次取本次请求内前序步骤的渲染占位（正式链式执行时前序应是模型输出，由调用方回填）；替换函数为单趟正则、值不再解析。

### 5.3 导出示例：API 请求体

```
POST /api/v1/templates/{id}/export/api-body?adapter=openai
{ "variables": { "product_name": "…", "selling_points": "…", "target_platform": "淘宝" }, "as": "curl" }
```

```
200 OK
{
  "adapter": "openai",           // deepseek/glm/kimi 复用 openai 兼容格式，仅 base_url 不同
  "base_url": "https://api.deepseek.com/v1/chat/completions",
  "steps": [
    { "step": 1,
      "curl": "curl https://api.deepseek.com/v1/chat/completions \\\n  -H 'Authorization: Bearer $KEY' \\\n  -d '{…rendered messages…}'",
      "body": { "model": "deepseek-chat", "temperature": 0.3,
                "messages": [ {"role":"system","content":"…"},
                              {"role":"user","content":"…rendered…"} ] } }
  ],
  "note": "第 2 步请将第 1 步的模型输出回填至 {{__prev_output__}} 后再请求"
}
```

### 5.4 其他核心端点示例

```
POST /api/v1/templates   （创建链式模板）
{
  "title": "电商 Listing 三步生成器", "summary": "卖点提取→多平台文案→A/B 建议",
  "template_type": "chain",
  "category": "ecommerce-listing",
  "model_tags": ["deepseek","glm"],
  "price_cents": 900,
  "steps": [ {…s1…}, {…s2…}, {…s3…} ],
  "variables": [
    { "name": "product_name", "label": "产品名", "var_type": "string",
      "description": "要生成文案的产品", "required": true },
    { "name": "target_platform", "label": "目标平台", "var_type": "select",
      "options": ["淘宝","拼多多","抖音","亚马逊"], "default": "淘宝" }
  ]
}
→ 201 { "id": "…", "slug": "ecom-listing-3step", "status": "draft" }
```

```
GET /api/v1/market/templates?category=code-dev&price=free&model=deepseek&sort=sales&cursor=
→ 200 { "items": [ {卡片字段…} ], "next_cursor": "eyJv…", "total_est": 132 }
```

```
POST /api/v1/orders   （V2）
{ "template_id": "8f2c…", "order_type": "buyout", "channel": "wechat" }
→ 201 { "order_no": "PF20260819…", "amount_cents": 900,
        "pay_params": { "…微信预支付单…" } }
```

---

## 6. 盈利模式

| 收入线 | 定价 | 说明 |
|---|---|---|
| ① 交易抽成 | 30%（拉新期 10~15%） | 买断/Pack/订阅全量抽成，主收入 |
| ② 创作者 SaaS 订阅（Pro） | ¥29/月 | 数据看板进阶、私有（不上架）模板无限、API 渲染额度 10k 次/月、自定义分享域名 |
| ③ 企业版 | 私有化 ¥50,000/年起；席位授权 ¥200/人/年 | 批量采购折扣、私有化部署（即开源版+商业授权+SLA）、专属审核通道 |
| ④ API 计量分成（V3） | 按渲染调用次数 | 企业用模板 API 跑量后，按调用对创作者二次分成，平台抽 40% |

定价原则：C 端低价高频（¥1~¥99）打渗透；企业侧高客单支撑毛利；抽成对标 App Store（30%）但以拉新期低抽成换供给。

---

## 7. 页面清单（路由规划）

| 路由 | 页面 | 权限 |
|---|---|---|
| `/` | 首页：精选+分类入口+搜索框 | 公开 |
| `/search` | 搜索结果（含筛选侧栏） | 公开 |
| `/t/:slug` | 模板详情页 | 公开（购买/使用需登录） |
| `/t/:slug/use` | 变量填写→渲染→复制/导出工作台 | 登录+免费或已购 |
| `/login` `/register` `/forgot-password` | 账号 | 公开 |
| `/studio/new` `/studio/:id/edit` | 模板编辑器（单条/链式、变量、预览） | 创作者 |
| `/studio/:id/versions` | 版本管理与回滚 | 创作者 |
| `/dashboard/works` | 创作者作品管理（状态流转） | 创作者 |
| `/dashboard/analytics` | 数据看板（漏斗） | 创作者 |
| `/dashboard/earnings` | 收益与流水 | 创作者 |
| `/dashboard/withdrawals` | 提现 | 创作者 |
| `/me/purchases` | 已购模板 | 登录 |
| `/me/favorites` | 我的收藏 | 登录 |
| `/me/history` | 调用记录 | 登录 |
| `/me/api-keys` | API Key 管理 | 登录 |
| `/share/:token` | 分享渲染页（免登录填变量） | 公开 |
| `/pricing` | 定价页 | 公开 |
| `/docs` `/docs/api` | 开发者文档（导出格式、API、MCP 接入） | 公开 |
| `/admin/review` | 审核工作台 | 管理员 |
| `/admin/orders` | 订单与退款 | 管理员 |
| `/admin/commissions` | 分成配置 | 管理员 |
| `/admin/tags` | 分类/标签管理 | 管理员 |
| `/admin/users` | 用户管理 | 管理员 |
| `/terms` `/privacy` `/report` | 协议、隐私、举报 | 公开 |

---

## 8. MVP 最小可行产品

**MVP 目标假设**：「带变量的链式模板 + 一键复制/导出」比普通 prompt 库有显著更高的复用意愿 —— 用周渲染次数验证。

### 8.1 MVP 保留（V1.0）

| 模块 | 范围 |
|---|---|
| 编辑器 | 单条 + 线性链式；变量可视化定义（5 类型+必填+默认值）；本地实时预览；版本保存与回滚 |
| 变量引擎 | `{{var}}` 渲染 + 内置 `__prev_output__`/`__step_N_output__`；防注入三规则（单次替换/fence 包裹/长度上限） |
| 市场 | 列表+筛选+排序、详情页（说明/变量表/预览演示）、LIKE+ngram 搜索 |
| 账号 | 注册/登录（邮箱+密码，JWT）、创作者角色 |
| 导出 | 复制文本、JSON、Markdown、API 请求体（openai 兼容 adapter）、分享链接 |
| 审核 | 敏感词自动过滤 + 人工审核队列（Admin 简版） |
| 全部模板免费 | 无订单/支付/评价/订阅 |

### 8.2 MVP 砍掉（及去向）

| 砍掉 | 理由 | 去向 |
|---|---|---|
| 支付/订单/提现/分成 | 免费闭环验证期不背支付合规成本 | V2 |
| 订阅、Pack 打包 | 依赖交易体系 | V2 |
| 用户评价体系 | 冷启动无评价数据，先用销量+官方精选 | V2 |
| 推荐算法/个性化 | 数据不足 | V2+ |
| 企业 API Key/计量 | 先用个人渲染接口兜底 | V3 |
| LLM 自动审核 | 人工审核量可控（<200/月） | V2 |
| DAG 分支工作流 | 线性覆盖 90% 场景，数据结构已预留 | V2 |
| 站内试运行（调模型） | 用户用自己 key 在外部跑 | V2 |
| PG FTS 中文分词 | LIKE+ngram 先顶 | V1.1 |

### 8.3 里程碑（每迭代 2 周）

1. **S1**：账号 + 模板 CRUD + 变量定义（SQLite）
2. **S2**：渲染引擎 + 编辑器预览 + 版本管理
3. **S3**：市场列表/详情/搜索 + 分享页
4. **S4**：导出四件套 + 敏感词过滤 + 人工审核队列 + 开源版 feature flag 剥离 → 上线

### 8.4 开源版

同一仓库，`.env` 中 `MARKETPLACE_ENABLED=false` 即关闭交易相关路由与页面（订单/提现/评价/admin 交易部分），保留模板库+编辑器+导出；README 提供 Docker Compose 一键自部署（SQLite）。

---

## 9. 风险点 & 避坑清单

| # | 风险 | 影响 | 对策 |
|---|---|---|---|
| R1 | 恶意 Prompt 模板上架（钓鱼/恶意代码生成/违规内容） | 平台合规、下架整改 | 提交时敏感词+规则硬拦截；人工审核；用户协议明确禁止清单；举报-下架 SLA 24h |
| R2 | **变量注入 / Prompt Injection** | 渲染产物被注入越权指令 | 变量名 ASCII 白名单；值单次替换不递归；三引号 fence 包裹+预览高亮外部输入；10k 长度上限；值过敏感词过滤 |
| R3 | **支付二清合规**（平台代收再分账 = 无证支付清算） | 资金违规、牌照风险 | V2 接微信支付「服务商分账」/支付宝「直付通」，钱不过平台账户；余额仅记账不设资金池；或初期挂靠爱发电/面包多等成熟通道 |
| R4 | 模板抄袭/搬运盗卖 | 创作者流失 | 投诉-下架流程；原创声明+首发时间存证（版本快照即证据）；相似度检测（远期） |
| R5 | 免费模板「复制即走」留存低 | DAU 低 | 分享页/导出物带来源水印与回流链接；账号保存渲染历史与变量预设；高频品类做订阅锁定 |
| R6 | 模型 API 格式碎片化 | 导出适配成本高 | 以 OpenAI 兼容格式为事实标准（DeepSeek/GLM/Kimi 均兼容），adapter 只 diff base_url 与参数名；每月回归验证 |
| R7 | 冷启动供需死循环 | 无内容→无用户→无创作者 | 官方种子模板 50+（含 10 个精品链式）；首批 20 位签约创作者零抽成 3 个月；开源版 GitHub 导流 |
| R8 | SQLite→PostgreSQL 迁移踩坑 | 上线事故 | 全程 SQLAlchemy ORM；禁用 PG 专有特性于业务逻辑（FTS 走抽象接口）；CI 双库跑同一套测试 |
| R9 | 低价竞争与比价 | 劣币驱逐良币 | 官方精选/评分权重对抗纯销量排序；最低定价 ¥1 防滥用 |
| R10 | ICP/EDI/生成式AI 合规 | 关停风险 | 上线前完成 ICP 备案；交易功能上线前评估增值电信 EDI 许可；接入模型侧已有备案则输出类合规可控；隐私政策明示变量数据用途 |
| R11 | steps_json schema 演进破坏旧模板 | 渲染崩溃 | schema_version 字段+只增不改原则+迁移器；版本快照永不重写 |

---

## 10. 简单前端页面示例（markdown 伪代码）

> React 18 + Tailwind CSS，暗色主题示例（`bg-gray-950`），实际支持暗/亮双主题切换。

### 10.1 市场广场卡片网格

```tsx
// pages/MarketPage.tsx —— 市场广场
function MarketPage() {
  const { data, filters, setFilters } = useMarketQuery();   // GET /market/templates
  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <SearchBar onSearch={q => setFilters({ ...filters, q })} />

      <div className="flex">
        {/* 筛选侧栏 */}
        <aside className="w-56 p-4 space-y-4">
          <FilterGroup title="价格" options={["免费", "付费"]} onClick={v => setFilters({ ...filters, price: v })} />
          <FilterGroup title="分类" options={CATEGORIES} onClick={v => setFilters({ ...filters, category: v })} />
          <FilterGroup title="适配模型" options={MODELS} multi onClick={v => setFilters({ ...filters, models: v })} />
          <SortSelect value={filters.sort} onChange={sort => setFilters({ ...filters, sort })} />
        </aside>

        {/* 卡片网格 */}
        <main className="flex-1 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 p-4">
          {data.items.map(t => <TemplateCard key={t.id} t={t} />)}
        </main>
      </div>
    </div>
  );
}

function TemplateCard({ t }: { t: Template }) {
  return (
    <Link to={`/t/${t.slug}`} className="rounded-xl border border-gray-800 bg-gray-900
                                       hover:border-blue-500 transition p-4">
      <div className="flex justify-between">
        <span className="text-xs bg-blue-900/50 text-blue-300 rounded px-2 py-0.5">
          {t.template_type === "chain" ? `${t.stepCount} 步链` : "单条"}
        </span>
        <span className="font-mono text-sm">{t.price_cents === 0 ? "免费" : `¥${t.price_cents / 100}`}</span>
      </div>
      <h3 className="mt-2 font-semibold truncate">{t.title}</h3>
      <p className="text-sm text-gray-400 line-clamp-2">{t.summary}</p>
      <div className="mt-2 flex flex-wrap gap-1">
        {t.model_tags.map(m => <Tag key={m}>{m}</Tag>)}
      </div>
      <div className="mt-3 flex justify-between text-xs text-gray-500">
        <span>★ {t.rating_avg} ({t.rating_count})</span>
        <span>销量 {t.sales_count}</span>
      </div>
    </Link>
  );
}
```

### 10.2 详情页：变量填写 → 实时渲染工作台

```tsx
// pages/UsePage.tsx —— /t/:slug/use
function UsePage() {
  const { template } = useTemplate();                 // GET /market/templates/:slug
  const [values, setValues] = useState<Record<string, string>>({});
  const rendered = useMemo(() =>
      renderLocal(template.steps, values),            // 前端本地渲染
    [template, values]);

  return (
    <div className="grid md:grid-cols-2 gap-4 p-6">
      {/* 左：变量表单 */}
      <section className="space-y-4">
        <h2 className="font-semibold">填写变量</h2>
        {template.variables.map(v => (
          <label key={v.name} className="block">
            <span className="text-sm text-gray-300">
              {v.label} {v.required && <em className="text-red-400">*</em>}
            </span>
            <p className="text-xs text-gray-500">{v.description}</p>
            {v.var_type === "select"
              ? <select value={values[v.name] ?? v.default_value ?? ""}
                        onChange={e => setValues({ ...values, [v.name]: e.target.value })}>
                  {v.options.map(o => <option key={o}>{o}</option>)}
                </select>
              : <textarea rows={v.var_type === "text" ? 4 : 1}
                          value={values[v.name] ?? v.default_value ?? ""}
                          onChange={e => setValues({ ...values, [v.name]: e.target.value })} />}
          </label>
        ))}
      </section>

      {/* 右：渲染结果 */}
      <section>
        <div className="flex justify-between">
          <h2 className="font-semibold">渲染结果</h2>
          <ExportBar templateId={template.id} values={values} />   {/* 复制/JSON/MD/API体/分享 */}
        </div>
        {rendered.map(s => (
          <div key={s.step} className="mt-3 rounded-lg bg-gray-900 border border-gray-800">
            <div className="flex justify-between px-3 py-1.5 text-xs border-b border-gray-800">
              <span>步骤 {s.step} · {s.title}</span>
              <CopyButton text={s.text} />                          {/* 分步复制 */}
            </div>
            <pre className="p-3 text-xs whitespace-pre-wrap">{s.text}</pre>
          </div>
        ))}
      </section>
    </div>
  );
}
```

### 10.3 核心渲染函数（前端本地版，与后端 /render 同算法）

```ts
// lib/render.ts —— 单次替换、非递归、fence 包裹（防注入）
const VAR_RE = /\{\{\s*([a-zA-Z_][\w]{0,63})\s*\}\}/g;   // 仅匹配白名单变量名
const BUILTIN = new Set(["__prev_output__"]);

export function renderLocal(steps: Step[], values: Record<string, string>): Rendered[] {
  return steps.map((s, i) => {
    const text = s.prompt.replace(VAR_RE, (_, name) => {
      if (BUILTIN.has(name)) return `》》此处粘贴第 ${i} 步模型的输出《《`;
      const raw = values[name] ?? "";
      const val = raw.length > 10_000 ? raw.slice(0, 10_000) + "…[截断]" : raw;
      return `“””${val}“””`;          // fence 包裹：外部输入与模板正文隔离
    });                                 // 注意：val 中若含 {{ }} 不会被再次解析（单趟 replace）
    return { step: i + 1, title: s.title, text };
  });
}
```

### 10.4 编辑器：链式步骤面板（简版）

```tsx
// pages/StudioPage.tsx —— /studio/:id/edit
function StudioPage() {
  const { draft, setDraft } = useDraft();
  return (
    <div className="grid md:grid-cols-[1fr_320px]">
      <section className="p-4 space-y-4">
        {draft.steps.map((step, i) => (
          <div key={step.id} className="rounded-lg border border-gray-800 bg-gray-900">
            <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-800">
              <GripVertical />  {/* 拖拽排序 */}
              <span className="text-sm font-medium">步骤 {i + 1}</span>
              <input value={step.title} onChange={e => renameStep(step.id, e.target.value)}
                     className="bg-transparent flex-1 outline-none" />
              <button onClick={() => removeStep(step.id)}>✕</button>
            </div>
            <textarea rows={6} value={step.prompt}
                      onChange={e => updateStep(step.id, { prompt: e.target.value })}
                      className="w-full bg-transparent p-3 font-mono text-xs" />
            <div className="px-3 py-2 flex gap-2 text-xs">
              <InsertVarButton onInsert={v => insertAtCursor(step.id, `{{${v}}}`)} />
              {i > 0 && <button onClick={() => insertAtCursor(step.id, "{{__prev_output__}}")}
                                className="text-purple-400">↩ 插入上一步输出</button>}
              <ParamSelect label="temperature" value={step.temperature} />
            </div>
          </div>
        ))}
        <button onClick={addStep} className="w-full border-dashed border-gray-700 rounded-lg py-3">
          + 添加步骤
        </button>
      </section>

      {/* 右侧：变量定义 + 实时预览 */}
      <aside className="border-l border-gray-800 p-4 space-y-6">
        <VariablePanel vars={draft.variables} onChange={v => setDraft({ ...draft, variables: v })} />
        <PreviewPanel steps={draft.steps} variables={draft.variables} />  {/* 试变量→本地渲染 */}
        <div className="flex gap-2">
          <button onClick={saveDraft}>保存草稿</button>
          <button onClick={publishVersion} className="bg-blue-600">发布新版本</button>
        </div>
      </aside>
    </div>
  );
}
```

---

## 附：术语表

| 术语 | 定义 |
|---|---|
| 模板（Template） | 带变量的单条 Prompt 或多步骤 Workflow 的可售卖单元 |
| 链式工作流（Chain） | 步骤 1→2→…→N，后步可引用前步输出的模板形态 |
| 变量（Variable） | `{{name}}` 占位符及其元信息（类型/默认值/必填） |
| 内置变量 | `__prev_output__` 等保留变量，承载步骤间上下文 |
| 渲染（Render） | 用具体值替换变量、产出最终可用 Prompt 的过程 |
| Pack | 多个模板的打包售卖形态 |
| Adapter | 导出 API 请求体时的目标模型格式转换器 |
