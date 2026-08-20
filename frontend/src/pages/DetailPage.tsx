import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, type TemplateDetail } from '../api';
import { useAuth } from '../auth';
import { Markdown } from '../components/Markdown';
import { PageLoading } from '../components/Spinner';
import { CopyButton } from '../components/CopyButton';
import { Badge } from '../components/Badge';
import { renderLocal } from '../lib/render';
import { buildInitialValues } from '../components/VariableForm';
import { RenderedSteps } from '../components/RenderedSteps';
import { formatDate, formatPrice } from '../lib/format';
import { MODEL_LABELS } from '../lib/constants';
import { useTitle } from '../lib/hooks';

const VAR_TYPE_LABEL: Record<string, string> = {
  string: '字符串',
  text: '多行文本',
  number: '数字',
  select: '下拉选择',
  boolean: '布尔',
};

export default function DetailPage() {
  const { slug } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tpl, setTpl] = useState<TemplateDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useTitle(tpl?.title);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    api
      .get<TemplateDetail>(`/market/templates/${slug}`)
      .then((d) => alive && setTpl(d))
      .catch((e) => alive && setError(e?.message || '加载失败'))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [slug]);

  const demoValues = useMemo(
    () => (tpl ? buildInitialValues(tpl.variables) : {}),
    [tpl],
  );
  const demoRendered = useMemo(
    () => (tpl ? renderLocal(tpl.steps, demoValues) : []),
    [tpl, demoValues],
  );

  const goUse = () => {
    const target = `/t/${slug}/use`;
    if (!user) navigate(`/login?next=${encodeURIComponent(target)}`);
    else navigate(target);
  };

  if (loading) return <PageLoading />;
  if (error || !tpl)
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <p className="text-4xl">😕</p>
        <p className="mt-3 text-gray-500">{error || '模板不存在'}</p>
        <Link to="/" className="mt-4 inline-block text-blue-500 hover:underline">
          返回首页
        </Link>
      </div>
    );

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      {/* 头图与标题区 */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/30">
              {tpl.template_type === 'chain' ? `${tpl.step_count} 步链` : '单条'}
            </Badge>
            {tpl.category_name && (
              <Badge className="bg-gray-500/10 text-gray-500 border-gray-500/30">
                {tpl.category_name}
              </Badge>
            )}
            {(tpl.model_tags || []).map((m) => (
              <Badge key={m} className="bg-gray-500/10 text-gray-500 border-gray-500/30">
                {MODEL_LABELS[m] || m}
              </Badge>
            ))}
          </div>
          <h1 className="mt-2 text-2xl font-bold md:text-3xl">{tpl.title}</h1>
          <p className="mt-2 text-gray-500 dark:text-gray-400">{tpl.summary}</p>
          <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-gray-400">
            <span className="flex items-center gap-1.5">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-500/20 text-xs text-blue-500">
                {(tpl.author?.display_name || '?').slice(0, 1)}
              </span>
              {tpl.author?.display_name || '匿名'}
              {tpl.author?.verified && <span title="已认证">✔️</span>}
            </span>
            <span>★ {tpl.rating_count > 0 ? Number(tpl.rating_avg).toFixed(1) : '暂无评分'}</span>
            <span>销量 {tpl.sales_count}</span>
            <span>浏览 {tpl.view_count}</span>
            {tpl.published_at && <span>更新于 {formatDate(tpl.published_at)}</span>}
          </div>
        </div>

        {/* 价格与购买按钮 */}
        <div className="shrink-0 rounded-xl border border-gray-200 bg-white p-4 text-center dark:border-gray-800 dark:bg-gray-900">
          <div className="font-mono text-2xl font-bold">{formatPrice(tpl.price_cents)}</div>
          <button
            onClick={goUse}
            className="mt-3 w-full rounded-lg bg-blue-600 px-8 py-2.5 font-medium text-white transition hover:bg-blue-500"
          >
            {tpl.price_cents === 0 ? '免费使用' : '立即使用'}
          </button>
          <p className="mt-2 text-xs text-gray-400">登录后填写变量即可使用</p>
        </div>
      </div>

      {/* 说明文档 */}
      {tpl.doc_md && (
        <section className="mt-8 rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
          <h2 className="mb-3 text-lg font-semibold">模板说明</h2>
          <Markdown md={tpl.doc_md} />
        </section>
      )}

      {/* 变量列表 */}
      <section className="mt-8">
        <h2 className="mb-3 text-lg font-semibold">模板变量</h2>
        {tpl.variables.length ? (
          <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-gray-500 dark:bg-gray-900 dark:text-gray-400">
                <tr>
                  <th className="px-4 py-2.5 font-medium">变量名</th>
                  <th className="px-4 py-2.5 font-medium">类型</th>
                  <th className="px-4 py-2.5 font-medium">说明</th>
                  <th className="px-4 py-2.5 font-medium">默认值</th>
                  <th className="px-4 py-2.5 font-medium">必填</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {tpl.variables.map((v) => (
                  <tr key={v.name}>
                    <td className="px-4 py-2.5 font-mono text-blue-500">{v.name}</td>
                    <td className="px-4 py-2.5">{VAR_TYPE_LABEL[v.var_type] || v.var_type}</td>
                    <td className="px-4 py-2.5 text-gray-500 dark:text-gray-400">{v.description || '—'}</td>
                    <td className="px-4 py-2.5 font-mono text-xs text-gray-500 dark:text-gray-400">
                      {v.default_value ?? '—'}
                    </td>
                    <td className="px-4 py-2.5">{v.required ? '✅ 是' : '否'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-gray-400">此模板无需填写变量。</p>
        )}
      </section>

      {/* 预览演示 */}
      <section className="mt-8">
        <h2 className="mb-3 text-lg font-semibold">预览演示（示例变量填充）</h2>
        <RenderedSteps rendered={demoRendered} />
      </section>

      {/* 样例输出 */}
      {tpl.sample_output && (
        <section className="mt-8 rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
          <h2 className="mb-3 text-lg font-semibold">样例输出</h2>
          <pre className="whitespace-pre-wrap break-words rounded-lg bg-gray-50 p-4 font-mono text-xs leading-relaxed dark:bg-gray-950">
            {tpl.sample_output}
          </pre>
        </section>
      )}

      {/* 版本历史与 changelog */}
      <section className="mt-8">
        <h2 className="mb-3 text-lg font-semibold">版本历史</h2>
        <div className="space-y-3">
          {tpl.versions.map((v) => (
            <div
              key={v.version}
              className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono font-semibold text-blue-500">
                  v{v.version}
                  {v.version === tpl.versions[0]?.version && (
                    <span className="ml-2 rounded bg-green-500/10 px-1.5 py-0.5 text-xs font-normal text-green-500">
                      当前
                    </span>
                  )}
                </span>
                <span className="text-xs text-gray-400">{formatDate(v.published_at)}</span>
              </div>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{v.changelog}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 分享入口 */}
      <section className="mt-8 flex items-center justify-between rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
        <div>
          <h2 className="font-semibold">分享此模板</h2>
          <p className="mt-1 text-sm text-gray-400">
            复制链接分享给朋友；登录后使用工作台可生成只读分享页。
          </p>
        </div>
        <CopyButton
          text={typeof window !== 'undefined' ? window.location.href : ''}
          label="复制链接"
          size="md"
        />
      </section>
    </div>
  );
}
