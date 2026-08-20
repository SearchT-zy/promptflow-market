import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, type TemplateDetail } from '../api';
import { PageLoading } from '../components/Spinner';
import { VariableForm, buildInitialValues, type Values } from '../components/VariableForm';
import { RenderedSteps, joinAllText } from '../components/RenderedSteps';
import { ExportBar } from '../components/ExportBar';
import { renderLocal, missingVariables } from '../lib/render';
import { useDebounced, useTitle } from '../lib/hooks';

export default function UsePage() {
  const { slug } = useParams();
  const [tpl, setTpl] = useState<TemplateDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [values, setValues] = useState<Values>({});

  useTitle(tpl ? `${tpl.title} · 使用` : '使用工作台');

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    api
      .get<TemplateDetail>(`/market/templates/${slug}`)
      .then((d) => {
        if (!alive) return;
        setTpl(d);
        setValues(buildInitialValues(d.variables));
      })
      .catch((e) => alive && setError(e?.message || '加载失败'))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [slug]);

  const debouncedValues = useDebounced(values, 300);
  const rendered = useMemo(
    () => (tpl ? renderLocal(tpl.steps, debouncedValues) : []),
    [tpl, debouncedValues],
  );
  const allText = useMemo(() => joinAllText(rendered), [rendered]);
  const missing = useMemo(
    () => (tpl ? missingVariables(tpl.variables, debouncedValues) : []),
    [tpl, debouncedValues],
  );

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
    <div className="mx-auto max-w-7xl px-4 py-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold">{tpl.title}</h1>
          <p className="mt-0.5 text-sm text-gray-400">
            {tpl.template_type === 'chain' ? `${tpl.step_count} 步链式工作流` : '单条 Prompt 模板'}
          </p>
        </div>
        <Link to={`/t/${tpl.slug}`} className="text-sm text-blue-500 hover:underline">
          ← 返回模板详情
        </Link>
      </div>

      {tpl.can_use === false && (
        <div className="mb-4 rounded-lg border border-yellow-500/40 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-600 dark:text-yellow-400">
          该模板为付费模板，需购买后方可完整使用（MVP 阶段全部免费）。
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* 左：变量表单 */}
        <section className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
          <h2 className="mb-4 font-semibold">填写变量</h2>
          <VariableForm variables={tpl.variables} values={values} onChange={setValues} />
        </section>

        {/* 右：渲染结果 */}
        <section className="min-w-0">
          <div className="mb-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">渲染结果</h2>
            </div>
            <ExportBar
              templateId={tpl.id}
              slug={tpl.slug}
              variables={tpl.variables}
              values={debouncedValues}
              allText={allText}
            />
            {missing.length > 0 && (
              <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-600 dark:text-amber-400">
                尚缺必填变量：{missing.map((m) => m.name).join('、')}
              </div>
            )}
          </div>
          <RenderedSteps rendered={rendered} />
        </section>
      </div>
    </div>
  );
}
