import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api, type Card, type Category, type Paged } from '../api';
import { LoadMore } from '../components/LoadMore';
import { PageLoading } from '../components/Spinner';
import { TemplateCard } from '../components/TemplateCard';
import { EmptyState } from '../components/EmptyState';
import { MODEL_OPTIONS, SORT_OPTIONS } from '../lib/constants';
import { useTitle } from '../lib/hooks';

function buildParams(
  q: string,
  category: string,
  price: string,
  modelParam: string,
  sort: string,
  cursor?: string,
) {
  const p = new URLSearchParams();
  if (q) p.set('q', q);
  if (category) p.set('category', category);
  if (price) p.set('price', price);
  if (modelParam) p.set('model', modelParam);
  if (sort && sort !== 'default') p.set('sort', sort);
  p.set('page_size', '24');
  if (cursor) p.set('cursor', cursor);
  return p.toString();
}

export default function SearchPage() {
  useTitle('搜索');
  const [searchParams, setSearchParams] = useSearchParams();

  const q = searchParams.get('q') || '';
  const category = searchParams.get('category') || '';
  const price = searchParams.get('price') || '';
  const modelParam = searchParams.get('model') || '';
  const sort = searchParams.get('sort') || 'default';

  const models = useMemo(
    () => new Set(modelParam.split(',').filter(Boolean)),
    [modelParam],
  );

  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<Card[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<{ items: Category[] }>('/market/categories')
      .then((r) => setCategories(r.items))
      .catch(() => {});
  }, []);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    const endpoint = q ? '/market/search' : '/market/templates';
    api
      .get<Paged<Card>>(`${endpoint}?${buildParams(q, category, price, modelParam, sort)}`)
      .then((res) => {
        if (!alive) return;
        setItems(res.items);
        setNextCursor(res.next_cursor);
        setHasMore(res.has_more);
        setTotal(res.total_est);
      })
      .catch((e) => alive && setError(e?.message || '加载失败'))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [q, category, price, modelParam, sort]);

  const loadMore = async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const endpoint = q ? '/market/search' : '/market/templates';
      const res = await api.get<Paged<Card>>(
        `${endpoint}?${buildParams(q, category, price, modelParam, sort, nextCursor || '')}`,
      );
      setItems((prev) => [...prev, ...res.items]);
      setNextCursor(res.next_cursor);
      setHasMore(res.has_more);
    } catch (e: any) {
      setError(e?.message || '加载失败');
    } finally {
      setLoadingMore(false);
    }
  };

  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    setSearchParams(next);
  };

  const toggleModel = (m: string) => {
    const nextSet = new Set(models);
    if (nextSet.has(m)) nextSet.delete(m);
    else nextSet.add(m);
    const next = new URLSearchParams(searchParams);
    if (nextSet.size) next.set('model', Array.from(nextSet).join(','));
    else next.delete('model');
    setSearchParams(next);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <div className="mb-4">
        <h1 className="text-xl font-semibold">
          {q ? `“${q}” 的搜索结果` : '模板市场'}
        </h1>
        <p className="mt-0.5 text-sm text-gray-400">共 {total} 个模板</p>
      </div>

      <div className="flex gap-6">
        {/* 侧栏筛选 */}
        <aside className="hidden w-52 shrink-0 space-y-6 lg:block">
          <FilterGroup title="价格">
            {[
              { v: '', label: '全部' },
              { v: 'free', label: '免费' },
              { v: 'paid', label: '付费' },
            ].map((o) => (
              <Radio
                key={o.v}
                checked={price === o.v}
                label={o.label}
                onClick={() => setParam('price', o.v)}
              />
            ))}
          </FilterGroup>

          <FilterGroup title="分类">
            <Radio checked={!category} label="全部" onClick={() => setParam('category', '')} />
            {categories.map((c) => (
              <Radio
                key={c.slug}
                checked={category === c.slug}
                label={c.name}
                onClick={() => setParam('category', c.slug)}
              />
            ))}
          </FilterGroup>

          <FilterGroup title="适配模型（多选）">
            {MODEL_OPTIONS.map((m) => (
              <label
                key={m.value}
                className="flex cursor-pointer items-center gap-2 py-0.5 text-sm text-gray-600 dark:text-gray-300"
              >
                <input
                  type="checkbox"
                  checked={models.has(m.value)}
                  onChange={() => toggleModel(m.value)}
                  className="h-4 w-4 accent-blue-600"
                />
                {m.label}
              </label>
            ))}
          </FilterGroup>

          <FilterGroup title="排序">
            <select
              value={sort}
              onChange={(e) => setParam('sort', e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-sm outline-none focus:border-blue-500 dark:border-gray-700 dark:bg-gray-900"
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </FilterGroup>
        </aside>

        {/* 卡片网格 */}
        <main className="min-w-0 flex-1">
          {error && (
            <div className="mb-4 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-500">
              加载失败：{error}
            </div>
          )}

          {loading ? (
            <PageLoading />
          ) : items.length === 0 ? (
            <EmptyState
              icon="🔍"
              title="没有找到匹配的模板"
              description="试试更换关键词，或清除筛选条件。"
            />
          ) : (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {items.map((t) => (
                  <TemplateCard key={t.id} t={t} />
                ))}
              </div>
              <LoadMore hasMore={hasMore} loading={loadingMore} onLoad={loadMore} />
            </>
          )}
        </main>
      </div>
    </div>
  );
}

function FilterGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">{title}</h3>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

function Radio({
  checked,
  label,
  onClick,
}: {
  checked: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`block w-full rounded-md px-2 py-1 text-left text-sm transition ${
        checked
          ? 'bg-blue-500/10 font-medium text-blue-500'
          : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
      }`}
    >
      {label}
    </button>
  );
}
