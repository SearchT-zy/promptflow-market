import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, type WorksItem } from '../api';
import { StatusBadge } from '../components/Badge';
import { Modal } from '../components/Modal';
import { PageLoading } from '../components/Spinner';
import { EmptyState } from '../components/EmptyState';
import { btnDanger, btnSecondary } from '../components/ui';
import { formatPrice } from '../lib/format';
import { useTitle } from '../lib/hooks';

export default function WorksPage() {
  useTitle('作品管理');
  const [items, setItems] = useState<WorksItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<{ id: string; action: 'offline' | 'delete' } | null>(null);

  const load = () => {
    setLoading(true);
    setError(null);
    api
      .get<{ items: WorksItem[] }>('/templates/mine')
      .then((r) => setItems(r.items))
      .catch((e) => setError(e?.message || '加载失败'))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const act = async (id: string, fn: () => Promise<unknown>) => {
    setBusyId(id);
    setError(null);
    try {
      await fn();
      await load();
    } catch (e: any) {
      setError(e?.message || '操作失败');
    } finally {
      setBusyId(null);
    }
  };

  const submit = (id: string) => act(id, () => api.post(`/templates/${id}/submit`));
  const offline = (id: string) => act(id, () => api.post(`/templates/${id}/offline`));
  const remove = (id: string) => act(id, () => api.del(`/templates/${id}`));

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">我的作品</h1>
        <Link to="/studio/new" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500">
          + 创建模板
        </Link>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-500">
          {error}
        </div>
      )}

      {loading ? (
        <PageLoading />
      ) : items.length === 0 ? (
        <EmptyState
          icon="📝"
          title="还没有作品"
          description="创建你的第一个 Prompt 模板，开始分享你的提示词工程成果。"
          action={
            <Link to="/studio/new" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500">
              去创作
            </Link>
          }
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-gray-500 dark:bg-gray-900 dark:text-gray-400">
              <tr>
                <th className="px-4 py-3 font-medium">模板</th>
                <th className="px-4 py-3 font-medium">状态</th>
                <th className="px-4 py-3 font-medium">版本</th>
                <th className="px-4 py-3 font-medium">价格</th>
                <th className="px-4 py-3 font-medium">销量</th>
                <th className="px-4 py-3 font-medium">更新时间</th>
                <th className="px-4 py-3 font-medium">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {items.map((t) => (
                <tr key={t.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/50">
                  <td className="max-w-xs px-4 py-3">
                    <div className="truncate font-medium">{t.title}</div>
                    <div className="truncate text-xs text-gray-400">
                      {t.template_type === 'chain' ? `${t.step_count} 步链` : '单条'} · {t.slug}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={t.status} />
                    {t.status === 'rejected' && t.review_note && (
                      <div className="mt-1 max-w-[12rem] truncate text-xs text-red-400" title={t.review_note}>
                        驳回：{t.review_note}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">v{t.current_version}</td>
                  <td className="px-4 py-3">{formatPrice(t.price_cents)}</td>
                  <td className="px-4 py-3">{t.sales_count}</td>
                  <td className="px-4 py-3 text-xs text-gray-400">
                    {t.updated_at ? new Date(t.updated_at).toLocaleDateString('zh-CN') : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1.5">
                      <Link to={`/studio/${t.id}/edit`} className="text-xs text-blue-500 hover:underline">
                        编辑
                      </Link>
                      <Link to={`/studio/${t.id}/versions`} className="text-xs text-blue-500 hover:underline">
                        版本
                      </Link>
                      {(t.status === 'draft' || t.status === 'rejected') && (
                        <button
                          disabled={busyId === t.id}
                          onClick={() => submit(t.id)}
                          className="text-xs text-blue-500 hover:underline disabled:opacity-50"
                        >
                          提交审核
                        </button>
                      )}
                      {t.status === 'published' && (
                        <>
                          <Link to={`/t/${t.slug}`} className="text-xs text-green-500 hover:underline">
                            查看
                          </Link>
                          <button
                            disabled={busyId === t.id}
                            onClick={() => setConfirm({ id: t.id, action: 'offline' })}
                            className="text-xs text-yellow-500 hover:underline disabled:opacity-50"
                          >
                            下架
                          </button>
                        </>
                      )}
                      {(t.status === 'draft' || t.status === 'rejected') && (
                        <button
                          disabled={busyId === t.id}
                          onClick={() => setConfirm({ id: t.id, action: 'delete' })}
                          className="text-xs text-red-500 hover:underline disabled:opacity-50"
                        >
                          删除
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        open={!!confirm}
        title={confirm?.action === 'offline' ? '确认下架' : '确认删除'}
        onClose={() => setConfirm(null)}
        footer={
          <>
            <button onClick={() => setConfirm(null)} className={btnSecondary}>
              取消
            </button>
            <button
              onClick={() => {
                const c = confirm!;
                setConfirm(null);
                if (c.action === 'offline') offline(c.id);
                else remove(c.id);
              }}
              className={btnDanger}
            >
              {confirm?.action === 'offline' ? '确认下架' : '确认删除'}
            </button>
          </>
        }
      >
        {confirm?.action === 'offline'
          ? '下架后该模板将不再在市场中展示，可重新发布新版本后再次提交审核。'
          : '删除后草稿内容不可恢复（仅草稿/已驳回状态可删除）。确定继续吗？'}
      </Modal>
    </div>
  );
}
