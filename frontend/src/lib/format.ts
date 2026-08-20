// 展示格式化工具
export function formatPrice(cents: number): string {
  if (cents === 0) return '免费';
  const yuan = cents / 100;
  return `¥${Number.isInteger(yuan) ? yuan : yuan.toFixed(2)}`;
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatCount(n: number | undefined | null): string {
  const v = n ?? 0;
  if (v >= 10000) return `${(v / 10000).toFixed(1)} 万`;
  if (v >= 1000) return `${(v / 1000).toFixed(1)}k`;
  return String(v);
}
