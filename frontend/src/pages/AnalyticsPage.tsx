import { useEffect, useState } from 'react';
import { api, type CreatorDashboard } from '../api';
import { PageLoading } from '../components/Spinner';
import { EmptyState } from '../components/EmptyState';
import { formatCount } from '../lib/format';
import { useTitle } from '../lib/hooks';

export default function AnalyticsPage() {
  useTitle('数据看板');
  const [data, setData] = useState<CreatorDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<CreatorDashboard>('/creator/dashboard')
      .then(setData)
      .catch((e) => setError(e?.message || '加载失败'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <PageLoading />;

  if (error || !data)
    return (
      <EmptyState icon="📊" title="加载失败" description={error || undefined} />
    );

  const totals = [
    { label: '浏览', value: data.totals.views, color: 'text-blue-500' },
    { label: '渲染', value: data.totals.renders, color: 'text-green-500' },
    { label: '导出', value: data.totals.exports, color: 'text-purple-500' },
    { label: '分享', value: data.totals.shares, color: 'text-amber-500' },
    { label: '销量', value: data.totals.sales, color: 'text-cyan-500' },
    { label: '收益', value: `¥${(data.totals.revenue_cents / 100).toFixed(2)}`, color: 'text-red-500' },
  ];

  const funnel = [
    { label: '浏览', value: data.funnel.views },
    { label: '渲染', value: data.funnel.renders },
    { label: '导出', value: data.funnel.exports },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold">数据看板</h1>

      {/* 总数卡片 */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {totals.map((t) => (
          <div key={t.label} className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
            <div className="text-xs text-gray-400">{t.label}</div>
            <div className={`mt-1 text-2xl font-bold ${t.color}`}>{t.value}</div>
          </div>
        ))}
      </div>

      {/* 漏斗 */}
      <section className="mt-8 rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
        <h2 className="mb-4 font-semibold">转化漏斗（浏览 → 渲染 → 导出）</h2>
        <div className="space-y-3">
          {funnel.map((f, i) => {
            const pct = funnel[0].value > 0 ? Math.round((f.value / funnel[0].value) * 100) : 0;
            return (
              <div key={f.label}>
                <div className="mb-1 flex justify-between text-sm">
                  <span>{f.label}</span>
                  <span className="text-gray-400">
                    {formatCount(f.value)} · {pct}%
                  </span>
                </div>
                <div className="h-4 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                  <div
                    className={`h-full rounded-full ${['bg-blue-500', 'bg-green-500', 'bg-purple-500'][i]}`}
                    style={{ width: `${Math.max(pct, f.value > 0 ? 3 : 0)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 按模板表格 */}
      <section className="mt-8">
        <h2 className="mb-4 font-semibold">按模板统计</h2>
        {data.by_template.length === 0 ? (
          <EmptyState icon="📈" title="暂无数据" description="发布模板后即可在此查看每个模板的浏览、渲染、导出与分享数据。" />
        ) : (
          <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-gray-500 dark:bg-gray-900 dark:text-gray-400">
                <tr>
                  <th className="px-4 py-2.5 font-medium">模板</th>
                  <th className="px-4 py-2.5 font-medium">浏览</th>
                  <th className="px-4 py-2.5 font-medium">渲染</th>
                  <th className="px-4 py-2.5 font-medium">导出</th>
                  <th className="px-4 py-2.5 font-medium">分享</th>
                  <th className="px-4 py-2.5 font-medium">销量</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {data.by_template.map((t) => (
                  <tr key={t.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/50">
                    <td className="max-w-xs truncate px-4 py-2.5 font-medium">{t.title}</td>
                    <td className="px-4 py-2.5">{t.views}</td>
                    <td className="px-4 py-2.5">{t.renders}</td>
                    <td className="px-4 py-2.5">{t.exports}</td>
                    <td className="px-4 py-2.5">{t.shares}</td>
                    <td className="px-4 py-2.5">{t.sales}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
