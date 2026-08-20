import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ApiError, api, type Card, type Step, type Variable } from '../api';
import { PageLoading } from '../components/Spinner';
import { VariableForm, buildInitialValues, type Values } from '../components/VariableForm';
import { RenderedSteps, joinAllText } from '../components/RenderedSteps';
import { CopyButton } from '../components/CopyButton';
import { renderLocal } from '../lib/render';
import { useDebounced, useTitle } from '../lib/hooks';
import { formatPrice } from '../lib/format';
import { MODEL_LABELS } from '../lib/constants';

interface ShareData {
  template: Card & { doc_md: string; sample_output: string; steps: Step[]; variables: Variable[] };
  preset_variables: Record<string, string>;
  expires_at: string | null;
  max_visits: number | null;
  visit_count: number;
}

export default function SharePage() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState<ShareData | null>(null);
  const [values, setValues] = useState<Values>({});
  const [loading, setLoading] = useState(true);
  const [invalid, setInvalid] = useState(false);

  useTitle(data?.template.title ? `${data.template.title} · 分享` : '分享');

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setInvalid(false);
    api
      .get<ShareData>(`/share/${token}`)
      .then((d) => {
        if (!alive) return;
        setData(d);
        setValues(buildInitialValues(d.template.variables, d.preset_variables));
      })
      .catch((e) => {
        if (!alive) return;
        if (e instanceof ApiError && e.status === 410) setInvalid(true);
      })
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [token]);

  const debounced = useDebounced(values, 300);
  const rendered = useMemo(
    () => (data ? renderLocal(data.template.steps, debounced) : []),
    [data, debounced],
  );
  const allText = useMemo(() => joinAllText(rendered), [rendered]);

  if (loading) return <PageLoading />;

  if (invalid || !data)
    return (
      <div className="mx-auto max-w-3xl px-4 py-24 text-center">
        <p className="text-5xl">🔗</p>
        <h1 className="mt-4 text-xl font-semibold">分享链接已失效</h1>
        <p className="mt-2 text-gray-500 dark:text-gray-400">
          该分享链接可能已过期、达到访问次数上限或被创建者删除。
        </p>
        <Link to="/" className="mt-6 inline-block rounded-lg bg-blue-600 px-5 py-2 font-medium text-white hover:bg-blue-500">
          返回首页
        </Link>
      </div>
    );

  const t = data.template;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      {/* 顶部模板卡 */}
      <div className="mb-6 flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-5 sm:flex-row sm:items-center sm:justify-between dark:border-gray-800 dark:bg-gray-900">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="rounded bg-blue-500/10 px-2 py-0.5 text-blue-500">
              {t.template_type === 'chain' ? `${t.step_count} 步链` : '单条'}
            </span>
            {(t.model_tags || []).map((m) => (
              <span key={m} className="rounded bg-gray-100 px-2 py-0.5 text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                {MODEL_LABELS[m] || m}
              </span>
            ))}
          </div>
          <h1 className="mt-1.5 text-lg font-bold">{t.title}</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t.summary}</p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <span className="font-mono font-semibold">{formatPrice(t.price_cents)}</span>
          <button
            onClick={() =>
              navigate(`/login?next=${encodeURIComponent(window.location.pathname)}`)
            }
            className="rounded-lg border border-blue-500 px-4 py-2 text-sm font-medium text-blue-500 transition hover:bg-blue-500/10"
          >
            ♥ 在 PromptFlow 中收藏
          </button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
          <h2 className="mb-4 font-semibold">填写变量</h2>
          <VariableForm variables={t.variables} values={values} onChange={setValues} />
        </section>
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold">渲染结果</h2>
            <CopyButton text={allText} label="复制全部" size="md" />
          </div>
          <RenderedSteps rendered={rendered} />
        </section>
      </div>
    </div>
  );
}
