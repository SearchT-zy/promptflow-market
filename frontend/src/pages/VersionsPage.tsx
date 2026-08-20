import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, type VersionInfo } from '../api';
import { Modal } from '../components/Modal';
import { PageLoading } from '../components/Spinner';
import { EmptyState } from '../components/EmptyState';
import { btnDanger, btnPrimary, btnSecondary, inputCls } from '../components/ui';
import { formatDate } from '../lib/format';
import { useTitle } from '../lib/hooks';

interface DiffLine {
  type: 'same' | 'add' | 'del';
  text: string;
}

export default function VersionsPage() {
  const { id } = useParams();
  useTitle('版本管理');

  const [versions, setVersions] = useState<VersionInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [lines, setLines] = useState<DiffLine[] | null>(null);
  const [diffLoading, setDiffLoading] = useState(false);

  const [rollbackTarget, setRollbackTarget] = useState<string | null>(null);
  const [changelog, setChangelog] = useState('');
  const [rollbacking, setRollbacking] = useState(false);

  const loadVersions = () => {
    setLoading(true);
    api
      .get<{ items: VersionInfo[] }>(`/templates/${id}/versions`)
      .then((r) => {
        setVersions(r.items);
        if (r.items.length >= 2) {
          setFrom(r.items[1].version);
          setTo(r.items[0].version);
        } else if (r.items.length === 1) {
          setFrom(r.items[0].version);
          setTo(r.items[0].version);
        }
      })
      .catch((e) => setError(e?.message || '加载失败'))
      .finally(() => setLoading(false));
  };

  useEffect(loadVersions, [id]);

  const runDiff = async (f: string, t: string) => {
    if (!f || !t) {
      setLines(null);
      return;
    }
    setDiffLoading(true);
    setError(null);
    try {
      const res = await api.get<{ lines: DiffLine[] }>(
        `/templates/${id}/diff?from=${encodeURIComponent(f)}&to=${encodeURIComponent(t)}`,
      );
      setLines(res.lines);
    } catch (e: any) {
      setError(e?.message || 'diff 加载失败');
    } finally {
      setDiffLoading(false);
    }
  };

  useEffect(() => {
    if (from && to) runDiff(from, to);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from, to, id]);

  const doRollback = async () => {
    if (!rollbackTarget) return;
    setRollbacking(true);
    setError(null);
    try {
      await api.post(`/templates/${id}/rollback`, {
        version: rollbackTarget,
        ...(changelog.trim() ? { changelog: changelog.trim() } : {}),
      });
      setRollbackTarget(null);
      setChangelog('');
      await loadVersions();
    } catch (e: any) {
      setError(e?.message || '回滚失败');
    } finally {
      setRollbacking(false);
    }
  };

  const lineCls = useMemo(
    () => ({
      same: 'text-gray-500 dark:text-gray-400',
      add: 'bg-green-500/10 text-green-600 dark:text-green-400',
      del: 'bg-red-500/10 text-red-500 line-through',
    }),
    [],
  );

  if (loading) return <PageLoading />;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">版本管理</h1>
        <Link to={`/studio/${id}/edit`} className="text-sm text-blue-500 hover:underline">
          ← 返回编辑器
        </Link>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-500">
          {error}
        </div>
      )}

      {versions.length === 0 ? (
        <EmptyState icon="🗃️" title="暂无版本" description="发布新版本后即可在此查看历史与对比。" />
      ) : (
        <>
          {/* 版本列表 */}
          <div className="mb-8 space-y-3">
            {versions.map((v, idx) => (
              <div
                key={v.version}
                className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3 dark:border-gray-800 dark:bg-gray-900"
              >
                <div>
                  <span className="font-mono font-semibold text-blue-500">
                    v{v.version}
                    {idx === 0 && (
                      <span className="ml-2 rounded bg-green-500/10 px-1.5 py-0.5 text-xs font-normal text-green-500">
                        当前
                      </span>
                    )}
                  </span>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{v.changelog}</p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span className="text-xs text-gray-400">{formatDate(v.published_at)}</span>
                  <button
                    onClick={() => setRollbackTarget(v.version)}
                    className="text-xs text-yellow-500 hover:underline"
                  >
                    回滚到此版本
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* diff 对比 */}
          <section className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
            <h2 className="mb-4 font-semibold">版本对比（diff）</h2>
            <div className="mb-4 flex flex-wrap items-end gap-3">
              <div>
                <label className="mb-1 block text-xs text-gray-500">从版本（from）</label>
                <select value={from} onChange={(e) => setFrom(e.target.value)} className={inputCls}>
                  {versions.map((v) => (
                    <option key={v.version} value={v.version}>
                      v{v.version}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs text-gray-500">到版本（to）</label>
                <select value={to} onChange={(e) => setTo(e.target.value)} className={inputCls}>
                  {versions.map((v) => (
                    <option key={v.version} value={v.version}>
                      v{v.version}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {diffLoading ? (
              <div className="py-8 text-center text-sm text-gray-400">加载 diff…</div>
            ) : lines ? (
              <pre className="max-h-[50vh] overflow-auto rounded-lg bg-gray-50 p-3 font-mono text-xs leading-relaxed dark:bg-gray-950">
                {lines.map((l, i) => (
                  <div key={i} className={`px-2 py-0.5 ${lineCls[l.type]}`}>
                    <span className="mr-3 inline-block w-5 select-none text-right opacity-60">
                      {l.type === 'add' ? '+' : l.type === 'del' ? '-' : ' '}
                    </span>
                    {l.text || ' '}
                  </div>
                ))}
              </pre>
            ) : (
              <p className="py-8 text-center text-sm text-gray-400">选择两个版本查看差异</p>
            )}
          </section>
        </>
      )}

      {/* 回滚确认弹窗 */}
      <Modal
        open={!!rollbackTarget}
        title="确认回滚"
        onClose={() => setRollbackTarget(null)}
        footer={
          <>
            <button onClick={() => setRollbackTarget(null)} className={btnSecondary}>
              取消
            </button>
            <button onClick={doRollback} disabled={rollbacking} className={btnDanger}>
              {rollbacking ? '回滚中…' : '确认回滚'}
            </button>
          </>
        }
      >
        <p className="text-sm text-gray-600 dark:text-gray-300">
          将以版本 <b className="font-mono">v{rollbackTarget}</b> 的内容创建一个新版本（版本号自动递增），不会删除历史版本。
        </p>
        <div className="mt-4">
          <label className="mb-1 block text-sm font-medium">
            回滚说明 <span className="text-xs text-gray-400">（可选）</span>
          </label>
          <textarea
            value={changelog}
            onChange={(e) => setChangelog(e.target.value)}
            rows={3}
            placeholder="说明回滚原因"
            className={inputCls}
          />
        </div>
      </Modal>
    </div>
  );
}
