import { useCallback, useEffect, useState } from 'react';
import { api, type Card, type HistoryItem } from '../api';
import { useAuth } from '../auth';
import { TemplateCard } from '../components/TemplateCard';
import { PageLoading } from '../components/Spinner';
import { EmptyState } from '../components/EmptyState';
import { RoleBadge } from '../components/Badge';
import { formatDate } from '../lib/format';
import { useTitle } from '../lib/hooks';

type Tab = 'purchases' | 'favorites' | 'history';

const TABS: { key: Tab; label: string }[] = [
  { key: 'purchases', label: '已购模板' },
  { key: 'favorites', label: '我的收藏' },
  { key: 'history', label: '调用记录' },
];

const ACTION_LABEL: Record<string, string> = {
  view: '浏览',
  render: '渲染',
  export_json: '导出 JSON',
  export_md: '导出 Markdown',
  export_api: '导出 API',
  share: '分享',
};

export default function MePage() {
  useTitle('个人中心');
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>('purchases');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [favorites, setFavorites] = useState<Card[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [stats, setStats] = useState<{ favorites_count: number; purchases_count: number; render_count: number } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (tab === 'favorites') {
        const r = await api.get<{ items: Card[] }>('/me/favorites');
        setFavorites(r.items);
      } else if (tab === 'history') {
        const r = await api.get<{ items: HistoryItem[] }>('/me/history');
        setHistory(r.items);
      }
    } catch (e: any) {
      setError(e?.message || '加载失败');
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    api
      .get<{ favorites_count: number; purchases_count: number; render_count: number }>('/me/stats')
      .then(setStats)
      .catch(() => {});
  }, []);

  const unfavorite = async (id: string) => {
    try {
      await api.del(`/favorites/${id}`);
      setFavorites((prev) => prev.filter((t) => t.id !== id));
    } catch (e: any) {
      setError(e?.message || '操作失败');
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-center gap-4">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-500/20 text-xl font-semibold text-blue-500">
          {(user?.display_name || user?.username || '?').slice(0, 1).toUpperCase()}
        </span>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold">{user?.display_name || user?.username}</h1>
            {user && <RoleBadge role={user.role} />}
          </div>
          <p className="text-sm text-gray-400">{user?.email}</p>
        </div>
        {stats && (
          <div className="ml-auto flex gap-6 text-sm text-gray-500 dark:text-gray-400">
            <span>收藏 <b className="text-gray-900 dark:text-gray-100">{stats.favorites_count}</b></span>
            <span>已购 <b className="text-gray-900 dark:text-gray-100">{stats.purchases_count}</b></span>
            <span>渲染 <b className="text-gray-900 dark:text-gray-100">{stats.render_count}</b></span>
          </div>
        )}
      </div>

      <div className="mb-6 flex gap-1 border-b border-gray-200 dark:border-gray-800">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`border-b-2 px-4 py-2 text-sm font-medium transition ${
              tab === t.key
                ? 'border-blue-500 text-blue-500'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-500">
          {error}
        </div>
      )}

      {loading ? (
        <PageLoading />
      ) : tab === 'purchases' ? (
        <EmptyState
          icon="🛒"
          title="暂无已购模板"
          description="MVP 阶段全部模板免费，无需购买即可使用。付费交易将在 V2 开放。"
        />
      ) : tab === 'favorites' ? (
        favorites.length ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {favorites.map((t) => (
              <div key={t.id} className="relative">
                <TemplateCard t={t} />
                <button
                  onClick={() => unfavorite(t.id)}
                  className="absolute right-3 top-3 rounded-full bg-black/50 px-2 py-0.5 text-xs text-white opacity-0 transition hover:opacity-100"
                  title="取消收藏"
                >
                  取消收藏
                </button>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState icon="♥️" title="暂无收藏" description="在模板详情页或工作台收藏你喜欢的模板。" />
        )
      ) : history.length ? (
        <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-gray-500 dark:bg-gray-900 dark:text-gray-400">
              <tr>
                <th className="px-4 py-2.5 font-medium">动作</th>
                <th className="px-4 py-2.5 font-medium">模板</th>
                <th className="px-4 py-2.5 font-medium">结果</th>
                <th className="px-4 py-2.5 font-medium">时间</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {history.map((h) => (
                <tr key={h.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/50">
                  <td className="px-4 py-2.5">
                    <span className="rounded bg-blue-500/10 px-2 py-0.5 text-xs text-blue-500">
                      {ACTION_LABEL[h.action] || h.action}
                    </span>
                  </td>
                  <td className="max-w-xs truncate px-4 py-2.5">{h.template_title || '—'}</td>
                  <td className="px-4 py-2.5">
                    {h.success ? (
                      <span className="text-green-500">成功</span>
                    ) : (
                      <span className="text-red-500">失败</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-xs text-gray-400">{formatDate(h.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState icon="🕘" title="暂无调用记录" description="渲染或导出模板后，记录将显示在这里。" />
      )}
    </div>
  );
}
