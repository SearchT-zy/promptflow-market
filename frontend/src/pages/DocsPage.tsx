import { NavLink } from 'react-router-dom';
import { useTitle } from '../lib/hooks';

const tabCls = ({ isActive }: { isActive: boolean }) =>
  `block rounded-lg px-3 py-2 text-sm font-medium transition ${
    isActive
      ? 'bg-blue-500/10 text-blue-500'
      : 'text-gray-600 hover:text-blue-500 dark:text-gray-300 dark:hover:text-blue-400'
  }`;

const JSON_SCHEMA = `{
  "schema_version": "1.0",
  "source": "promptflow",
  "url": "https://promptflow.example.com/t/{slug}",
  "exported_at": "2026-08-19T00:00:00Z",
  "template": {
    "title": "电商 Listing 三步生成器",
    "slug": "ecom-listing-3step",
    "template_type": "chain",
    "category": "ecommerce-listing",
    "model_tags": ["deepseek", "glm"],
    "price_cents": 0,
    "doc_md": "说明文档 Markdown…",
    "steps": [
      {
        "id": "s1",
        "order": 1,
        "title": "提取产品卖点",
        "prompt": "…{{product_name}}…",
        "model_hint": "deepseek-chat",
        "temperature": 0.3,
        "output_format": "markdown"
      }
    ],
    "variables": [
      {
        "name": "product_name",
        "label": "产品名",
        "description": "要生成文案的产品",
        "var_type": "string",
        "default_value": null,
        "options": null,
        "required": true,
        "sort_order": 1
      }
    ]
  }
}`;

const ENDPOINTS: { method: string; path: string; desc: string; auth: string }[] = [
  { method: 'POST', path: '/api/v1/auth/register', desc: '注册', auth: '公开' },
  { method: 'POST', path: '/api/v1/auth/login', desc: '登录，签发 JWT', auth: '公开' },
  { method: 'GET', path: '/api/v1/auth/me', desc: '当前用户信息', auth: 'Bearer' },
  { method: 'POST', path: '/api/v1/templates', desc: '创建模板（草稿）', auth: 'Bearer' },
  { method: 'GET', path: '/api/v1/templates/mine', desc: '我的作品列表', auth: 'Bearer' },
  { method: 'GET', path: '/api/v1/templates/{id}', desc: '编辑视角详情', auth: 'Bearer' },
  { method: 'PUT', path: '/api/v1/templates/{id}', desc: '更新草稿（含变量）', auth: 'Bearer' },
  { method: 'POST', path: '/api/v1/templates/{id}/versions', desc: '发布新版本', auth: 'Bearer' },
  { method: 'POST', path: '/api/v1/templates/{id}/rollback', desc: '回滚到指定版本', auth: 'Bearer' },
  { method: 'GET', path: '/api/v1/templates/{id}/diff', desc: '版本对比', auth: 'Bearer' },
  { method: 'POST', path: '/api/v1/templates/{id}/submit', desc: '提交审核', auth: 'Bearer' },
  { method: 'POST', path: '/api/v1/render', desc: '渲染模板', auth: 'Bearer' },
  { method: 'GET', path: '/api/v1/market/templates', desc: '市场列表（筛选+游标分页）', auth: '公开' },
  { method: 'GET', path: '/api/v1/market/search', desc: '全文检索', auth: '公开' },
  { method: 'GET', path: '/api/v1/market/templates/{slug}', desc: '公开详情', auth: '公开' },
  { method: 'GET', path: '/api/v1/market/categories', desc: '分类目录', auth: '公开' },
  { method: 'GET', path: '/api/v1/market/featured', desc: '首页精选', auth: '公开' },
  { method: 'GET', path: '/api/v1/templates/{id}/export/json', desc: '导出模板 JSON', auth: 'Bearer' },
  { method: 'GET', path: '/api/v1/templates/{id}/export/markdown', desc: '导出 GitHub 用 MD', auth: 'Bearer' },
  { method: 'POST', path: '/api/v1/templates/{id}/export/api-body', desc: '生成 API 请求体', auth: 'Bearer' },
  { method: 'POST', path: '/api/v1/templates/{id}/share', desc: '创建分享链接', auth: 'Bearer' },
  { method: 'GET', path: '/api/v1/share/{token}', desc: '分享页数据', auth: '公开' },
  { method: 'GET', path: '/api/v1/me/favorites', desc: '我的收藏', auth: 'Bearer' },
  { method: 'PUT', path: '/api/v1/favorites/{template_id}', desc: '收藏', auth: 'Bearer' },
  { method: 'DELETE', path: '/api/v1/favorites/{template_id}', desc: '取消收藏', auth: 'Bearer' },
  { method: 'GET', path: '/api/v1/me/history', desc: '调用记录', auth: 'Bearer' },
  { method: 'GET', path: '/api/v1/creator/dashboard', desc: '创作者数据看板', auth: 'Bearer' },
  { method: 'GET', path: '/api/v1/admin/review/queue', desc: '审核队列', auth: 'admin' },
  { method: 'POST', path: '/api/v1/admin/review/{id}', desc: '审核通过/驳回', auth: 'admin' },
  { method: 'GET', path: '/api/v1/admin/templates', desc: '模板管理列表', auth: 'admin' },
  { method: 'GET', path: '/api/v1/admin/users', desc: '用户管理列表', auth: 'admin' },
  { method: 'GET', path: '/api/v1/meta', desc: '应用元信息', auth: '公开' },
  { method: 'GET', path: '/api/v1/health', desc: '健康检查', auth: '公开' },
];

const methodColor: Record<string, string> = {
  GET: 'bg-green-500/15 text-green-500',
  POST: 'bg-blue-500/15 text-blue-500',
  PUT: 'bg-amber-500/15 text-amber-500',
  DELETE: 'bg-red-500/15 text-red-500',
};

export function DocsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex max-w-6xl gap-8 px-4 py-8">
      <aside className="hidden w-52 shrink-0 md:block">
        <nav className="sticky top-20 space-y-1">
          <NavLink to="/docs" end className={tabCls}>
            概述与导出格式
          </NavLink>
          <NavLink to="/docs/api" className={tabCls}>
            API 端点表
          </NavLink>
        </nav>
      </aside>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

export function DocsPage() {
  useTitle('开发者文档');
  return (
    <DocsLayout>
      <h1 className="text-2xl font-bold">开发者文档</h1>
      <p className="mt-2 text-gray-500 dark:text-gray-400">
        PromptFlow 模板可导出为 JSON（供 MCP Server / Agent 加载）、GitHub README 风格 Markdown，以及可直接调用的 API 请求体。
      </p>

      <Section title="导出格式">
        <ul className="list-disc space-y-2 pl-5 text-sm text-gray-600 dark:text-gray-300">
          <li>
            <b>JSON 模板</b>：与平台内部一致的 schema（含 <code>steps</code>、<code>variables</code>、元信息），顶层含{' '}
            <code>schema_version</code> 保证向前兼容，<code>source: "promptflow"</code> + 模板 URL 保留来源。
          </li>
          <li>
            <b>Markdown 文档</b>：模板说明、变量表、使用方法、每步 Prompt（代码块）、License 声明与来源链接，适配 GitHub 开源分发。
          </li>
          <li>
            <b>API 请求体</b>：渲染后的 <code>messages</code> 数组 + 建议参数（temperature 等），多步骤生成请求序列并标注步骤依赖；支持 OpenAI 兼容 / DeepSeek / GLM / Kimi / Claude adapter，输出 cURL / Python / JSON 三种形态。
          </li>
          <li>
            <b>分享链接</b>：只读分享页，访客免登录即可填写变量、实时渲染、复制文本。
          </li>
        </ul>
      </Section>

      <Section title="JSON Schema 示例">
        <pre className="overflow-x-auto rounded-xl bg-gray-50 p-4 font-mono text-xs leading-relaxed dark:bg-gray-900">
          {JSON_SCHEMA}
        </pre>
      </Section>

      <Section title="变量渲染规则">
        <ul className="list-disc space-y-2 pl-5 text-sm text-gray-600 dark:text-gray-300">
          <li>变量语法 <code>{'{{name}}'}</code>，命名规则 <code>^[a-zA-Z_][a-zA-Z0-9_]{'{0,63}'}$</code>，禁止 <code>__</code> 前缀。</li>
          <li>单次替换、非递归：变量值中若含 <code>{'{{'}</code>，按字面文本输出，不二次解析（防注入）。</li>
          <li>用户变量值以 <code>"""值"""</code> 三引号包裹注入，与模板正文隔离。</li>
          <li>单变量值长度上限 10,000 字符，超出截断并加 <code>…[截断]</code>。</li>
          <li>内置变量：<code>{'{{__prev_output__}}'}</code>（上一步输出）、<code>{'{{__step_N_output__}}'}</code>（指定第 N 步输出）。</li>
        </ul>
      </Section>

      <Section title="MCP 接入说明">
        <p className="text-sm text-gray-600 dark:text-gray-300">
          通过「导出 JSON」获取模板 schema 后，可在自研 Agent / MCP Server 中加载：
        </p>
        <ol className="mt-2 list-decimal space-y-2 pl-5 text-sm text-gray-600 dark:text-gray-300">
          <li>下载 <code>*.promptflow.json</code> 模板文件；</li>
          <li>解析 <code>template.steps</code> 与 <code>template.variables</code>；</li>
          <li>用用户输入填充变量后，对每步 <code>prompt</code> 做 <code>{'{{name}}'}</code> 替换（单趟、三引号 fence、10000 截断）；</li>
          <li>链式模板将第 N 步模型输出回填至 <code>context</code> 后渲染第 N+1 步；</li>
          <li>或直接调用平台 <code>POST /api/v1/render</code> 由服务端渲染。</li>
        </ol>
      </Section>
    </DocsLayout>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="mb-3 text-lg font-semibold">{title}</h2>
      {children}
    </section>
  );
}

export function DocsApiPage() {
  useTitle('API 文档');
  return (
    <DocsLayout>
      <h1 className="text-2xl font-bold">API 端点表</h1>
      <p className="mt-2 text-gray-500 dark:text-gray-400">
        前缀 <code>/api/v1</code>，JSON；认证 <code>Authorization: Bearer &lt;jwt&gt;</code>。错误格式统一为{' '}
        <code>{'{"error":{"code":"...","message":"...","details":[...]}}'}</code>。
      </p>
      <div className="mt-6 overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-gray-500 dark:bg-gray-900 dark:text-gray-400">
            <tr>
              <th className="px-4 py-2.5 font-medium">方法</th>
              <th className="px-4 py-2.5 font-medium">路径</th>
              <th className="px-4 py-2.5 font-medium">说明</th>
              <th className="px-4 py-2.5 font-medium">认证</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {ENDPOINTS.map((e) => (
              <tr key={e.method + e.path} className="hover:bg-gray-50 dark:hover:bg-gray-900/50">
                <td className="px-4 py-2">
                  <span className={`rounded px-1.5 py-0.5 font-mono text-xs font-semibold ${methodColor[e.method]}`}>
                    {e.method}
                  </span>
                </td>
                <td className="px-4 py-2 font-mono text-xs text-gray-700 dark:text-gray-200">{e.path}</td>
                <td className="px-4 py-2 text-gray-500 dark:text-gray-400">{e.desc}</td>
                <td className="px-4 py-2 text-gray-500 dark:text-gray-400">{e.auth}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </DocsLayout>
  );
}
