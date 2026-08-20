import { useState } from 'react';
import { api, type Rendered, type Variable } from '../api';
import { CopyButton } from './CopyButton';
import { Modal } from './Modal';
import { Spinner } from './Spinner';
import { ADAPTERS, AS_OPTIONS } from '../lib/constants';
import { btnPrimary, btnSecondary, inputCls, Field } from './ui';

export type Values = Record<string, string>;

function download(content: string, filename: string, mime = 'text/plain') {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

type ModalKind = 'json' | 'markdown' | 'api' | 'share' | null;

export function ExportBar({
  templateId,
  slug,
  variables,
  values,
  allText,
}: {
  templateId: string;
  slug: string;
  variables: Variable[];
  values: Values;
  allText: string;
}) {
  const [kind, setKind] = useState<ModalKind>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [content, setContent] = useState<string>('');
  const [contentType, setContentType] = useState<'text' | 'json' | 'markdown'>('text');
  const [downloadName, setDownloadName] = useState('');

  // API 请求体
  const [adapter, setAdapter] = useState('openai');
  const [as, setAs] = useState('curl');
  const [apiResult, setApiResult] = useState<any>(null);

  // 分享
  const [shareUrl, setShareUrl] = useState('');

  const open = (k: ModalKind) => {
    setKind(k);
    setError(null);
    setContent('');
    setApiResult(null);
    setShareUrl('');
    if (k === 'json') loadJson();
    if (k === 'markdown') loadMarkdown();
  };

  const close = () => setKind(null);

  const loadJson = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get<unknown>(`/templates/${templateId}/export/json`);
      const text = JSON.stringify(data, null, 2);
      setContent(text);
      setContentType('json');
      setDownloadName(`${slug}.promptflow.json`);
    } catch (e: any) {
      setError(e?.message || '导出失败');
    } finally {
      setLoading(false);
    }
  };

  const loadMarkdown = async () => {
    setLoading(true);
    setError(null);
    try {
      const text = await api.getRaw(`/templates/${templateId}/export/markdown`, {
        Accept: 'text/markdown',
      });
      setContent(text);
      setContentType('markdown');
      setDownloadName(`${slug}.md`);
    } catch (e: any) {
      setError(e?.message || '导出失败');
    } finally {
      setLoading(false);
    }
  };

  const genApiBody = async () => {
    setLoading(true);
    setError(null);
    setApiResult(null);
    try {
      const data = await api.post<unknown>(
        `/templates/${templateId}/export/api-body?adapter=${encodeURIComponent(adapter)}&as=${encodeURIComponent(as)}`,
        { variables: values, context: {} },
      );
      setApiResult(data);
    } catch (e: any) {
      setError(e?.message || '生成失败');
    } finally {
      setLoading(false);
    }
  };

  const createShare = async () => {
    setLoading(true);
    setError(null);
    setShareUrl('');
    try {
      const data = await api.post<{ token: string; url: string }>(
        `/templates/${templateId}/share`,
        { preset_variables: values },
      );
      setShareUrl(data.url || `${window.location.origin}/share/${data.token}`);
    } catch (e: any) {
      setError(e?.message || '创建失败');
    } finally {
      setLoading(false);
    }
  };

  // 从 apiResult 提取可复制的代码
  const apiCode = (() => {
    if (!apiResult) return '';
    if (typeof apiResult === 'string') return apiResult;
    const steps = (apiResult as any).steps;
    if (Array.isArray(steps)) {
      return steps
        .map((s: any) => {
          if (as === 'curl' && s.curl) return s.curl;
          if (as === 'python' && s.python) return s.python;
          return JSON.stringify(s.body ?? s, null, 2);
        })
        .join('\n\n');
    }
    return JSON.stringify(apiResult, null, 2);
  })();

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <CopyButton text={allText} label="复制全部" size="md" />
        <button onClick={() => open('json')} className={btnSecondary}>
          导出 JSON
        </button>
        <button onClick={() => open('markdown')} className={btnSecondary}>
          导出 Markdown
        </button>
        <button onClick={() => open('api')} className={btnSecondary}>
          生成 API 请求体
        </button>
        <button onClick={() => open('share')} className={btnSecondary}>
          创建分享链接
        </button>
      </div>

      {/* JSON / Markdown 结果弹窗 */}
      <Modal
        open={kind === 'json' || kind === 'markdown'}
        title={kind === 'json' ? '导出 JSON 模板' : '导出 Markdown 文档'}
        onClose={close}
        wide
        footer={
          <>
            <button onClick={close} className={btnSecondary}>
              关闭
            </button>
            <CopyButton text={content} label="复制内容" size="md" />
            <button onClick={() => download(content, downloadName)} className={btnPrimary}>
              下载文件
            </button>
          </>
        }
      >
        {loading ? (
          <div className="flex justify-center py-10">
            <Spinner className="h-6 w-6 text-blue-500" />
          </div>
        ) : error ? (
          <p className="text-sm text-red-500">{error}</p>
        ) : (
          <pre className="max-h-[50vh] overflow-auto whitespace-pre-wrap rounded-lg bg-gray-50 p-4 font-mono text-xs dark:bg-gray-950">
            {content}
          </pre>
        )}
      </Modal>

      {/* API 请求体弹窗 */}
      <Modal
        open={kind === 'api'}
        title="生成 API 请求体"
        onClose={close}
        wide
        footer={
          apiResult && (
            <>
              <button onClick={close} className={btnSecondary}>
                关闭
              </button>
              <CopyButton text={apiCode} label="复制代码" size="md" />
              <button
                onClick={() =>
                  download(apiCode, `${slug}.${as === 'python' ? 'py' : as === 'curl' ? 'sh' : 'json'}`)
                }
                className={btnPrimary}
              >
                下载
              </button>
            </>
          )
        }
      >
        <div className="mb-4 flex flex-wrap gap-3">
          <div className="min-w-[10rem] flex-1">
            <label className="mb-1 block text-sm font-medium">目标 Adapter</label>
            <select value={adapter} onChange={(e) => setAdapter(e.target.value)} className={inputCls}>
              {ADAPTERS.map((a) => (
                <option key={a.value} value={a.value}>
                  {a.label}
                </option>
              ))}
            </select>
          </div>
          <div className="min-w-[10rem] flex-1">
            <label className="mb-1 block text-sm font-medium">输出形态</label>
            <select value={as} onChange={(e) => setAs(e.target.value)} className={inputCls}>
              {AS_OPTIONS.map((a) => (
                <option key={a.value} value={a.value}>
                  {a.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <button onClick={genApiBody} disabled={loading} className={btnPrimary}>
              {loading ? '生成中…' : '生成'}
            </button>
          </div>
        </div>

        {error && <p className="mb-3 text-sm text-red-500">{error}</p>}
        {apiResult && (
          <div>
            {apiResult && typeof apiResult === 'object' && 'note' in apiResult && (
              <p className="mb-3 rounded-lg bg-yellow-500/10 px-3 py-2 text-sm text-yellow-600 dark:text-yellow-400">
                {(apiResult as any).note}
              </p>
            )}
            <pre className="max-h-[50vh] overflow-auto whitespace-pre-wrap rounded-lg bg-gray-50 p-4 font-mono text-xs dark:bg-gray-950">
              {apiCode}
            </pre>
          </div>
        )}
      </Modal>

      {/* 分享链接弹窗 */}
      <Modal
        open={kind === 'share'}
        title="创建分享链接"
        onClose={close}
        footer={
          shareUrl ? (
            <>
              <button onClick={close} className={btnSecondary}>
                关闭
              </button>
              <CopyButton text={shareUrl} label="复制链接" size="md" />
            </>
          ) : (
            <button onClick={close} className={btnSecondary}>
              关闭
            </button>
          )
        }
      >
        <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
          创建只读分享页，访客无需注册即可填写变量、实时渲染并复制文本。
        </p>
        {!shareUrl && (
          <button onClick={createShare} disabled={loading} className={btnPrimary}>
            {loading ? '创建中…' : '创建分享链接'}
          </button>
        )}
        {error && <p className="mt-3 text-sm text-red-500">{error}</p>}
        {shareUrl && (
          <div className="flex items-center gap-2">
            <input readOnly value={shareUrl} className={`${inputCls} font-mono`} />
          </div>
        )}
      </Modal>
    </>
  );
}
