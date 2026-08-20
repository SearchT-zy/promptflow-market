import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, type Card, type Category } from '../api';
import { TemplateCard } from '../components/TemplateCard';
import { PageLoading, Spinner } from '../components/Spinner';
import { useTitle } from '../lib/hooks';

export default function HomePage() {
  useTitle();
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [featured, setFeatured] = useState<Card[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    Promise.all([
      api.get<{ items: Card[] }>('/market/featured?limit=6'),
      api.get<{ items: Category[] }>('/market/categories'),
    ])
      .then(([f, c]) => {
        if (!alive) return;
        setFeatured(f.items);
        setCategories(c.items);
      })
      .catch((e) => alive && setError(e?.message || '加载失败'))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  const onSearch = (e: FormEvent) => {
    e.preventDefault();
    const term = q.trim();
    navigate(term ? `/search?q=${encodeURIComponent(term)}` : '/search');
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      {/* Hero + 搜索 */}
      <section className="mx-auto max-w-3xl py-8 text-center">
        <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
          带变量的链式工作流 <span className="text-blue-500">Prompt</span> 模板市场
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-gray-500 dark:text-gray-400">
          搜索、预览、填充变量、实时渲染，一键复制或导出 JSON / API 请求体 / Markdown，直接对接 MCP 与主流模型。
        </p>
        <form onSubmit={onSearch} className="mx-auto mt-6 max-w-xl">
          <div className="relative">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="搜索 Prompt 模板、工作流、作者…"
              className="w-full rounded-xl border border-gray-300 bg-white py-3 pl-11 pr-28 text-base outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
            />
            <svg
              className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
                clipRule="evenodd"
              />
            </svg>
            <button
              type="submit"
              className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-lg bg-blue-600 px-4 py-1.5 text-sm font-medium text-white transition hover:bg-blue-500"
            >
              搜索
            </button>
          </div>
        </form>
        <div className="mt-4 flex flex-wrap justify-center gap-2 text-sm">
          {categories.slice(0, 6).map((c) => (
            <Link
              key={c.slug}
              to={`/search?category=${encodeURIComponent(c.slug)}`}
              className="rounded-full border border-gray-300 px-3 py-1 text-gray-500 transition hover:border-blue-500 hover:text-blue-500 dark:border-gray-700 dark:text-gray-400"
            >
              {c.name}
            </Link>
          ))}
        </div>
      </section>

      {error && (
        <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-500">
          加载失败：{error}
        </div>
      )}

      {loading ? (
        <PageLoading />
      ) : (
        <>
          {/* 精选模板 */}
          <section className="mt-4">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold">🔥 精选模板</h2>
              <Link to="/search" className="text-sm text-blue-500 hover:underline">
                查看全部 →
              </Link>
            </div>
            {featured.length ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {featured.map((t) => (
                  <TemplateCard key={t.id} t={t} />
                ))}
              </div>
            ) : (
              <p className="py-10 text-center text-sm text-gray-400">暂无精选模板</p>
            )}
          </section>

          {/* 分类入口 */}
          <section className="mt-10">
            <h2 className="mb-4 text-xl font-semibold">浏览分类</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
              {categories.map((c) => (
                <Link
                  key={c.slug}
                  to={`/search?category=${encodeURIComponent(c.slug)}`}
                  className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 transition hover:border-blue-500 hover:shadow dark:border-gray-800 dark:bg-gray-900"
                >
                  <span className="text-xl">{c.icon || '📁'}</span>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{c.name}</div>
                    <div className="text-xs text-gray-400">{c.count ?? 0} 个模板</div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
