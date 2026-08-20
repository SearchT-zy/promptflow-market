import type { ReactNode } from 'react';
import { STATUS_META } from '../lib/constants';
import type { TemplateStatus } from '../api';

export function Badge({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${className}`}
    >
      {children}
    </span>
  );
}

export function StatusBadge({ status }: { status: TemplateStatus }) {
  const meta = STATUS_META[status] ?? STATUS_META.draft;
  return (
    <Badge className={meta.badge}>
      <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
      {meta.label}
    </Badge>
  );
}

export function RoleBadge({ role }: { role: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    admin: { label: '管理员', cls: 'bg-purple-500/15 text-purple-500 border-purple-500/30' },
    creator: { label: '创作者', cls: 'bg-blue-500/15 text-blue-500 border-blue-500/30' },
    enterprise: { label: '企业', cls: 'bg-cyan-500/15 text-cyan-500 border-cyan-500/30' },
    user: { label: '用户', cls: 'bg-gray-500/15 text-gray-400 border-gray-500/30' },
  };
  const m = map[role] ?? map.user;
  return <Badge className={m.cls}>{m.label}</Badge>;
}
