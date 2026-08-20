import { useCallback, useEffect, useState } from 'react';
import {
  api,
  type Category,
  type TemplateFull,
  type User,
  type Variable,
} from '../api';
import { Modal } from '../components/Modal';
import { PageLoading } from '../components/Spinner';
import { StatusBadge, RoleBadge, Badge } from '../components/Badge';
import { Markdown } from '../components/Markdown';
import { btnDanger, btnPrimary, btnSecondary, inputCls } from '../components/ui';
import { formatDate, formatPrice } from '../lib/format';
import { useTitle } from '../lib/hooks';

type Tab = 'review' | 'templates' | 'users' | 'categories' | 'audit';

const TABS: { key: Tab; label: string }[] = [
  { key: 'review', label: '审核队列' },
  { key: 'templates', label: '模板管理' },
  { key: 'users', label: '用户管理' },
  { key: 'categories', label: '分类管理' },
  { key: 'audit', label: '审计日志' },
];

export default function AdminPage() {
  useTitle('管理后台');
  const [tab, setTab] = useState<Tab>('review');
  const [stats, setStats] = useState<{ users: number; templates: number; published: number; reviewing: number; renders: number } | null>(null);

  useEffect(() => {
    api
      .get('/admin/stats')
      .then((s: any) => setStats(s))
      .catch(() => {});
  }, []);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="text-2xl font-bold">管理后台</h1>
      {stats && (
        <div className="mt-4 flex flex-wrap gap-4 text-sm text-gray-500 dark:text-gray-400">
          <Stat label="用户" value={stats.users} />
          <Stat label="模板总数" value={stats.templates} />
          <Stat label="已发布" value={stats.published} />
          <Stat label="审核中" value={stats.reviewing} />
          <Stat label="渲染次数" value={stats.renders} />
        </div>
      )}

      <div className="mt-6 flex gap-1 border-b border-gray-200 dark:border-gray-800">
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

      <div className="mt-6">
        {tab === 'review' && <ReviewTab />}
        {tab === 'templates' && <TemplatesTab />}
        {tab === 'users' && <UsersTab />}
        {tab === 'categories' && <CategoriesTab />}
        {tab === 'audit' && <AuditTab />}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <span className="rounded-lg border border-gray-200 px-3 py-1.5 dark:border-gray-800">
      {label} <b className="text-gray-900 dark:text-gray-100">{value}</b>
    </span>
  );
}

/* ---------------- 审核队列 ---------------- */

interface ReviewItem {
  id: string;
  slug: string;
  title: string;
  category_name: string | null;
  author_name: string | null;
  submitted_at: string;
}
type ReviewDetail = TemplateFull & { scan_hits: string[] };

function Highlight({ text, hits }: { text: string; hits: string[] }) {
  if (!hits.length) return <>{text}</>;
  const lower = new Set(hits.map((h) => h.toLowerCase()));
  const escaped = hits.map((h) => h.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).filter(Boolean);
  const re = new RegExp(`(${escaped.join('|')})`, 'gi');
  const parts = text.split(re);
  return (
    <>
      {parts.map((p, i) =>
        lower.has(p.toLowerCase()) ? <mark key={i}>{p}</mark> : <span key={i}>{p}</span>,
      )}
    </>
  );
}

function ReviewTab() {
  const [queue, setQueue] = useState<ReviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<ReviewDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [modal, setModal] = useState<null | { id: string; action: 'approve' | 'reject' }>(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    api
      .get<{ items: ReviewItem[] }>('/admin/review/queue')
      .then((r) => setQueue(r.items))
      .catch((e) => setError(e?.message || '加载失败'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(load, [load]);

  const openDetail = async (item: ReviewItem) => {
    setDetailLoading(true);
    setError(null);
    try {
      const d = await api.get<ReviewDetail>(`/admin/review/${item.id}`);
      setDetail(d);
    } catch (e: any) {
      setError(e?.message || '加载失败');
    } finally {
      setDetailLoading(false);
    }
  };

  const doReview = async () => {
    if (!modal) return;
    if (modal.action === 'reject' && !reason.trim()) {
      setError('驳回时必须填写原因');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await api.post(`/admin/review/${modal.id}`, {
        action: modal.action,
        ...(reason.trim() ? { reason: reason.trim() } : {}),
      });
      setModal(null);
      setReason('');
      setDetail(null);
      load();
    } catch (e: any) {
      setError(e?.message || '操作失败');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      {error && <Banner>{error}</Banner>}
      {loading ? (
        <PageLoading />
      ) : queue.length === 0 ? (
        <p className="py-10 text-center text-sm text-gray-400">审核队列为空</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-gray-500 dark:bg-gray-900 dark:text-gray-400">
              <tr>
                <th className="px-4 py-2.5 font-medium">模板</th>
                <th className="px-4 py-2.5 font-medium">分类</th>
                <th className="px-4 py-2.5 font-medium">作者</th>
                <th className="px-4 py-2.5 font-medium">提交时间</th>
                <th className="px-4 py-2.5 font-medium">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {queue.map((q) => (
                <tr key={q.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/50">
                  <td className="px-4 py-2.5 font-medium">{q.title}</td>
                  <td className="px-4 py-2.5">{q.category_name || '—'}</td>
                  <td className="px-4 py-2.5">{q.author_name || '—'}</td>
                  <td className="px-4 py-2.5 text-xs text-gray-400">{formatDate(q.submitted_at)}</td>
                  <td className="px-4 py-2.5">
                    <button onClick={() => openDetail(q)} className="text-blue-500 hover:underline">
                      审核
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 审核工作台 */}
      <Modal open={!!detail} title="审核工作台" onClose={() => setDetail(null)} wide>
        {detailLoading ? (
          <div className="py-10 text-center text-gray-400">加载中…</div>
        ) : detail ? (
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold">{detail.title}</h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{detail.summary}</p>
            </div>

            {detail.scan_hits.length > 0 && (
              <div className="rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm">
                <div className="font-medium text-red-500">敏感词命中：</div>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {detail.scan_hits.map((h) => (
                    <Badge key={h} className="border-red-500/40 bg-red-500/10 text-red-500">
                      {h}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <div>
              <div className="mb-1 text-xs font-medium text-gray-400">说明文档</div>
              <div className="rounded-lg border border-gray-200 p-3 dark:border-gray-800">
                <Highlight text={detail.doc_md || '（无）'} hits={detail.scan_hits} />
              </div>
            </div>

            <div>
              <div className="mb-1 text-xs font-medium text-gray-400">步骤内容</div>
              <div className="space-y-2">
                {detail.steps.map((s, i) => (
                  <div key={s.id || i} className="rounded-lg border border-gray-200 p-3 dark:border-gray-800">
                    <div className="mb-1 text-xs font-medium">步骤 {i + 1} · {s.title}</div>
                    <pre className="whitespace-pre-wrap break-words font-mono text-xs leading-relaxed">
                      <Highlight text={s.prompt} hits={detail.scan_hits} />
                    </pre>
                  </div>
                ))}
              </div>
            </div>

            <VarTable variables={detail.variables} />

            <div className="flex justify-end gap-2 border-t border-gray-200 pt-4 dark:border-gray-800">
              <button onClick={() => setModal({ id: detail.id, action: 'reject' })} className={btnDanger}>
                驳回
              </button>
              <button onClick={() => setModal({ id: detail.id, action: 'approve' })} className={btnPrimary}>
                通过
              </button>
            </div>
          </div>
        ) : null}
      </Modal>

      {/* 通过/驳回原因弹窗 */}
      <Modal
        open={!!modal}
        title={modal?.action === 'approve' ? '确认通过' : '驳回原因'}
        onClose={() => setModal(null)}
        footer={
          <>
            <button onClick={() => setModal(null)} className={btnSecondary}>
              取消
            </button>
            <button onClick={doReview} disabled={busy} className={modal?.action === 'approve' ? btnPrimary : btnDanger}>
              {busy ? '处理中…' : modal?.action === 'approve' ? '确认通过' : '确认驳回'}
            </button>
          </>
        }
      >
        {error && <Banner>{error}</Banner>}
        <label className="mb-1 block text-sm font-medium">
          {modal?.action === 'approve' ? '备注' : '驳回原因'}（{modal?.action === 'approve' ? '可选' : '必填'}）
        </label>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          placeholder={modal?.action === 'approve' ? '可填写审核备注' : '请说明驳回原因，将通知作者'}
          className={inputCls}
        />
      </Modal>
    </div>
  );
}

function VarTable({ variables }: { variables: Variable[] }) {
  if (!variables.length) return null;
  return (
    <div>
      <div className="mb-1 text-xs font-medium text-gray-400">变量定义</div>
      <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-800">
        <table className="w-full text-xs">
          <thead className="bg-gray-50 text-left text-gray-500 dark:bg-gray-900 dark:text-gray-400">
            <tr>
              <th className="px-3 py-1.5 font-medium">变量名</th>
              <th className="px-3 py-1.5 font-medium">类型</th>
              <th className="px-3 py-1.5 font-medium">必填</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {variables.map((v) => (
              <tr key={v.name}>
                <td className="px-3 py-1.5 font-mono">{v.name}</td>
                <td className="px-3 py-1.5">{v.var_type}</td>
                <td className="px-3 py-1.5">{v.required ? '是' : '否'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Banner({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-4 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-500">
      {children}
    </div>
  );
}

/* ---------------- 模板管理 ---------------- */

function TemplatesTab() {
  const [items, setItems] = useState<any[]>([]);
  const [status, setStatus] = useState('');
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    const p = new URLSearchParams();
    if (status) p.set('status', status);
    if (q) p.set('q', q);
    api
      .get<{ items: any[] }>(`/admin/templates?${p.toString()}`)
      .then((r) => setItems(r.items))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [status, q]);

  useEffect(load, [load]);

  const setTemplateStatus = async (id: string, s: string) => {
    setBusyId(id);
    try {
      await api.put(`/admin/templates/${id}/status`, { status: s });
      load();
    } catch (e: any) {
      alert(e?.message || '操作失败');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="搜索标题…"
          className={`${inputCls} max-w-xs`}
        />
        <select value={status} onChange={(e) => setStatus(e.target.value)} className={`${inputCls} max-w-[10rem]`}>
          <option value="">全部状态</option>
          <option value="draft">草稿</option>
          <option value="reviewing">审核中</option>
          <option value="published">已发布</option>
          <option value="rejected">已驳回</option>
          <option value="offline">已下架</option>
        </select>
      </div>
      {loading ? (
        <PageLoading />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-gray-500 dark:bg-gray-900 dark:text-gray-400">
              <tr>
                <th className="px-4 py-2.5 font-medium">模板</th>
                <th className="px-4 py-2.5 font-medium">状态</th>
                <th className="px-4 py-2.5 font-medium">价格</th>
                <th className="px-4 py-2.5 font-medium">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {items.map((t) => (
                <tr key={t.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/50">
                  <td className="max-w-xs px-4 py-2.5">
                    <div className="truncate font-medium">{t.title}</div>
                    <div className="truncate text-xs text-gray-400">{t.slug}</div>
                  </td>
                  <td className="px-4 py-2.5">
                    <StatusBadge status={t.status} />
                  </td>
                  <td className="px-4 py-2.5">{formatPrice(t.price_cents ?? 0)}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex flex-wrap gap-1.5">
                      {t.status === 'published' && (
                        <button
                          disabled={busyId === t.id}
                          onClick={() => setTemplateStatus(t.id, 'offline')}
                          className="text-xs text-yellow-500 hover:underline disabled:opacity-50"
                        >
                          下架
                        </button>
                      )}
                      {t.status === 'offline' && (
                        <button
                          disabled={busyId === t.id}
                          onClick={() => setTemplateStatus(t.id, 'published')}
                          className="text-xs text-green-500 hover:underline disabled:opacity-50"
                        >
                          重新上架
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
    </div>
  );
}

/* ---------------- 用户管理 ---------------- */

function UsersTab() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    api
      .get<{ items: User[] }>('/admin/users')
      .then((r) => setUsers(r.items))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(load, [load]);

  const updateUser = async (id: string, patch: Record<string, unknown>) => {
    setBusyId(id);
    try {
      await api.put(`/admin/users/${id}`, patch);
      load();
    } catch (e: any) {
      alert(e?.message || '操作失败');
    } finally {
      setBusyId(null);
    }
  };

  if (loading) return <PageLoading />;

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 text-left text-gray-500 dark:bg-gray-900 dark:text-gray-400">
          <tr>
            <th className="px-4 py-2.5 font-medium">用户</th>
            <th className="px-4 py-2.5 font-medium">角色</th>
            <th className="px-4 py-2.5 font-medium">状态</th>
            <th className="px-4 py-2.5 font-medium">认证</th>
            <th className="px-4 py-2.5 font-medium">操作</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
          {users.map((u) => (
            <tr key={u.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/50">
              <td className="px-4 py-2.5">
                <div className="font-medium">{u.display_name || u.username}</div>
                <div className="text-xs text-gray-400">
                  {u.username} · {u.email}
                </div>
              </td>
              <td className="px-4 py-2.5">
                <select
                  value={u.role}
                  onChange={(e) => updateUser(u.id, { role: e.target.value })}
                  disabled={busyId === u.id}
                  className="rounded border border-gray-300 px-2 py-1 text-xs dark:border-gray-700 dark:bg-gray-900"
                >
                  <option value="user">user</option>
                  <option value="creator">creator</option>
                  <option value="enterprise">enterprise</option>
                  <option value="admin">admin</option>
                </select>
              </td>
              <td className="px-4 py-2.5">
                <Badge className={u.status === 'active' ? 'text-green-500' : 'text-red-500'}>
                  {u.status === 'active' ? '正常' : '已封禁'}
                </Badge>
              </td>
              <td className="px-4 py-2.5">
                <label className="flex items-center gap-1.5 text-xs">
                  <input
                    type="checkbox"
                    checked={u.verified}
                    onChange={(e) => updateUser(u.id, { verified: e.target.checked })}
                    disabled={busyId === u.id}
                    className="accent-blue-600"
                  />
                  {u.verified ? '已认证' : '未认证'}
                </label>
              </td>
              <td className="px-4 py-2.5">
                <button
                  disabled={busyId === u.id}
                  onClick={() => updateUser(u.id, { status: u.status === 'active' ? 'banned' : 'active' })}
                  className={`text-xs hover:underline disabled:opacity-50 ${u.status === 'active' ? 'text-red-500' : 'text-green-500'}`}
                >
                  {u.status === 'active' ? '封禁' : '解封'}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ---------------- 分类管理 ---------------- */

function CategoriesTab() {
  const [cats, setCats] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ slug: '', name: '', icon: '', sort: '' });
  const [editing, setEditing] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    api
      .get<{ items: Category[] }>('/admin/categories')
      .then((r) => setCats(r.items))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(load, [load]);

  const create = async () => {
    if (!form.slug.trim() || !form.name.trim()) {
      alert('slug 与名称必填');
      return;
    }
    try {
      await api.post('/admin/categories', {
        slug: form.slug.trim(),
        name: form.name.trim(),
        ...(form.icon.trim() ? { icon: form.icon.trim() } : {}),
        ...(form.sort ? { sort: parseInt(form.sort) } : {}),
      });
      setForm({ slug: '', name: '', icon: '', sort: '' });
      load();
    } catch (e: any) {
      alert(e?.message || '创建失败');
    }
  };

  const remove = async (slug: string) => {
    if (!confirm(`确定删除分类「${slug}」？`)) return;
    try {
      await api.del(`/admin/categories/${slug}`);
      load();
    } catch (e: any) {
      alert(e?.message || '删除失败');
    }
  };

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end gap-2 rounded-xl border border-gray-200 p-4 dark:border-gray-800">
        <MiniInput label="slug" value={form.slug} onChange={(v) => setForm({ ...form, slug: v })} placeholder="code-dev" />
        <MiniInput label="名称" value={form.name} onChange={(v) => setForm({ ...form, name: v })} placeholder="代码开发" />
        <MiniInput label="图标" value={form.icon} onChange={(v) => setForm({ ...form, icon: v })} placeholder="💻" />
        <MiniInput label="排序" value={form.sort} onChange={(v) => setForm({ ...form, sort: v })} placeholder="1" />
        <button onClick={create} className={btnPrimary}>
          新增分类
        </button>
      </div>

      {loading ? (
        <PageLoading />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-gray-500 dark:bg-gray-900 dark:text-gray-400">
              <tr>
                <th className="px-4 py-2.5 font-medium">图标</th>
                <th className="px-4 py-2.5 font-medium">slug</th>
                <th className="px-4 py-2.5 font-medium">名称</th>
                <th className="px-4 py-2.5 font-medium">排序</th>
                <th className="px-4 py-2.5 font-medium">模板数</th>
                <th className="px-4 py-2.5 font-medium">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {cats.map((c) => (
                <tr key={c.slug} className="hover:bg-gray-50 dark:hover:bg-gray-900/50">
                  <td className="px-4 py-2.5 text-lg">{c.icon || '📁'}</td>
                  <td className="px-4 py-2.5 font-mono text-xs">{c.slug}</td>
                  <td className="px-4 py-2.5">{c.name}</td>
                  <td className="px-4 py-2.5">{c.sort}</td>
                  <td className="px-4 py-2.5">{c.count ?? 0}</td>
                  <td className="px-4 py-2.5">
                    <button onClick={() => remove(c.slug)} className="text-xs text-red-500 hover:underline">
                      删除
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function MiniInput({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs text-gray-400">{label}</label>
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={`${inputCls} w-32`} />
    </div>
  );
}

/* ---------------- 审计日志 ---------------- */

function AuditTab() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<{ items: any[] }>('/admin/audit-logs')
      .then((r) => setLogs(r.items))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <PageLoading />;

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 text-left text-gray-500 dark:bg-gray-900 dark:text-gray-400">
          <tr>
            <th className="px-4 py-2.5 font-medium">时间</th>
            <th className="px-4 py-2.5 font-medium">管理员</th>
            <th className="px-4 py-2.5 font-medium">动作</th>
            <th className="px-4 py-2.5 font-medium">对象类型</th>
            <th className="px-4 py-2.5 font-medium">对象 ID</th>
            <th className="px-4 py-2.5 font-medium">详情</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
          {logs.map((l) => (
            <tr key={l.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/50">
              <td className="px-4 py-2.5 text-xs text-gray-400">{formatDate(l.created_at)}</td>
              <td className="px-4 py-2.5 font-mono text-xs">{l.admin_id}</td>
              <td className="px-4 py-2.5">
                <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/30">{l.action}</Badge>
              </td>
              <td className="px-4 py-2.5">{l.target_type}</td>
              <td className="px-4 py-2.5 font-mono text-xs">{l.target_id}</td>
              <td className="max-w-xs truncate px-4 py-2.5 text-xs text-gray-500 dark:text-gray-400">
                {typeof l.detail === 'string' ? l.detail : JSON.stringify(l.detail)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {logs.length === 0 && <p className="py-10 text-center text-sm text-gray-400">暂无审计日志</p>}
    </div>
  );
}
