import { Link } from 'react-router-dom';
import type { Card } from '../api';
import { formatCount, formatPrice } from '../lib/format';
import { MODEL_LABELS } from '../lib/constants';

export function TemplateCard({ t }: { t: Card }) {
  return (
    <Link
      to={`/t/${t.slug}`}
      className="group flex flex-col rounded-xl border border-gray-200 bg-white p-4 transition hover:-translate-y-0.5 hover:border-blue-500 hover:shadow-lg dark:border-gray-800 dark:bg-gray-900"
    >
      <div className="flex items-start justify-between gap-2">
        <span className="rounded bg-blue-500/10 px-2 py-0.5 text-xs font-medium text-blue-500">
          {t.template_type === 'chain' ? `${t.step_count} 步链` : '单条'}
        </span>
        <span className="font-mono text-sm font-semibold text-gray-700 dark:text-gray-200">
          {formatPrice(t.price_cents)}
        </span>
      </div>

      <h3 className="mt-2.5 line-clamp-1 font-semibold text-gray-900 group-hover:text-blue-500 dark:text-gray-100">
        {t.title}
      </h3>
      <p className="mt-1 line-clamp-2 text-sm text-gray-500 dark:text-gray-400">{t.summary}</p>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {t.category_name && (
          <span className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-500 dark:bg-gray-800 dark:text-gray-400">
            {t.category_name}
          </span>
        )}
        {(t.model_tags || []).slice(0, 4).map((m) => (
          <span
            key={m}
            className="rounded bg-gray-100 px-2 py-0.5 font-mono text-xs text-gray-500 dark:bg-gray-800 dark:text-gray-400"
          >
            {MODEL_LABELS[m] || m}
          </span>
        ))}
      </div>

      <div className="mt-auto flex items-center justify-between border-t border-gray-100 pt-3 text-xs text-gray-400 dark:border-gray-800 dark:text-gray-500">
        <span className="flex items-center gap-1">
          <span className="text-amber-400">★</span>
          {t.rating_count > 0 ? `${Number(t.rating_avg).toFixed(1)} (${t.rating_count})` : '暂无评分'}
        </span>
        <span className="flex items-center gap-3">
          <span>销量 {formatCount(t.sales_count)}</span>
          <span className="flex items-center gap-1">
            {t.author?.avatar_url ? (
              <img
                src={t.author.avatar_url}
                alt=""
                className="h-4 w-4 rounded-full object-cover"
              />
            ) : (
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-blue-500/20 text-[10px] text-blue-500">
                {(t.author?.display_name || '?').slice(0, 1)}
              </span>
            )}
            <span className="max-w-[6rem] truncate">{t.author?.display_name || '匿名'}</span>
          </span>
        </span>
      </div>
    </Link>
  );
}
