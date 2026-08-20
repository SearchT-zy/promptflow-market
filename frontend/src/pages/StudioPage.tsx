import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ApiError,
  api,
  type Category,
  type OutputFormat,
  type TemplateFull,
  type TemplateType,
  type VarType,
} from '../api';
import { Modal } from '../components/Modal';
import { PageLoading } from '../components/Spinner';
import { VariableForm, type Values } from '../components/VariableForm';
import { RenderedSteps } from '../components/RenderedSteps';
import { extractVariableNames, renderLocal, validateVarName } from '../lib/render';
import { MODEL_OPTIONS, OUTPUT_FORMATS, VAR_TYPES } from '../lib/constants';
import { btnPrimary, btnSecondary, inputCls } from '../components/ui';
import { useDebounced, useTitle } from '../lib/hooks';

interface StepDraft {
  id: string;
  order: number;
  title: string;
  prompt: string;
  model_hint: string;
  temperature: number;
  output_format: OutputFormat;
}

interface VarDraft {
  name: string;
  label: string;
  description: string;
  var_type: VarType;
  default_value: string;
  options: string[];
  required: boolean;
}

interface Draft {
  title: string;
  summary: string;
  category: string;
  model_tags: string[];
  price_cents: number;
  doc_md: string;
  sample_output: string;
  template_type: TemplateType;
  steps: StepDraft[];
  variables: VarDraft[];
}

function emptyStep(id: string): StepDraft {
  return { id, order: 1, title: '', prompt: '', model_hint: '', temperature: 0.3, output_format: 'markdown' };
}
function emptyVar(): VarDraft {
  return { name: '', label: '', description: '', var_type: 'string', default_value: '', options: [], required: true };
}

function fromFull(t: TemplateFull): Draft {
  return {
    title: t.title,
    summary: t.summary,
    category: t.category,
    model_tags: t.model_tags || [],
    price_cents: t.price_cents,
    doc_md: t.doc_md || '',
    sample_output: t.sample_output || '',
    template_type: t.template_type,
    steps: (t.steps || []).map((s, i) => ({
      id: s.id || `s${i + 1}`,
      order: s.order ?? i + 1,
      title: s.title,
      prompt: s.prompt,
      model_hint: s.model_hint || '',
      temperature: s.temperature ?? 0.3,
      output_format: s.output_format || 'markdown',
    })),
    variables: (t.variables || []).map((v) => ({
      name: v.name,
      label: v.label,
      description: v.description || '',
      var_type: v.var_type,
      default_value: v.default_value || '',
      options: v.options || [],
      required: v.required,
    })),
  };
}

function buildBody(d: Draft) {
  return {
    title: d.title,
    summary: d.summary,
    template_type: d.template_type,
    category: d.category,
    model_tags: d.model_tags,
    price_cents: d.price_cents,
    doc_md: d.doc_md,
    sample_output: d.sample_output,
    steps: d.steps.map((s) => ({
      title: s.title,
      prompt: s.prompt,
      ...(s.model_hint ? { model_hint: s.model_hint } : {}),
      temperature: s.temperature,
      output_format: s.output_format,
    })),
    variables: d.variables.map((v, idx) => ({
      name: v.name,
      label: v.label,
      ...(v.description ? { description: v.description } : {}),
      var_type: v.var_type,
      ...(v.default_value !== '' ? { default_value: v.default_value } : {}),
      ...(v.var_type === 'select' && v.options.length ? { options: v.options } : {}),
      required: v.required,
      sort_order: idx + 1,
    })),
  };
}

function formatDetails(details: unknown): string {
  if (Array.isArray(details)) return details.map((d) => (typeof d === 'string' ? d : JSON.stringify(d))).join('；');
  if (typeof details === 'string') return details;
  if (details) return JSON.stringify(details);
  return '';
}

const semverRe = /^(\d+)\.(\d+)\.(\d+)$/;
function cmpVersion(a: string, b: string): number {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    if ((pa[i] || 0) !== (pb[i] || 0)) return (pa[i] || 0) - (pb[i] || 0);
  }
  return 0;
}

/** 建议版本号：minor + 1（如 1.2.0 → 1.3.0） */
function bumpMinor(v: string): string {
  const m = /^(\d+)\.(\d+)\.(\d+)$/.exec(v);
  if (!m) return v;
  return `${m[1]}.${Number(m[2]) + 1}.0`;
}

export default function StudioPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = !id;

  const [draft, setDraft] = useState<Draft | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [currentVersion, setCurrentVersion] = useState('0.0.0');
  const [typeChosen, setTypeChosen] = useState<TemplateType | null>(null);

  // 发布弹窗
  const [publishOpen, setPublishOpen] = useState(false);
  const [pubVersion, setPubVersion] = useState('');
  const [pubChangelog, setPubChangelog] = useState('');
  const [publishing, setPublishing] = useState(false);

  // 预览
  const [previewValues, setPreviewValues] = useState<Values>({});

  const taRefs = useRef<Record<string, HTMLTextAreaElement | null>>({});

  useTitle(draft ? `${draft.title || '未命名模板'} · 编辑器` : '模板编辑器');

  useEffect(() => {
    api
      .get<{ items: Category[] }>('/market/categories')
      .then((r) => setCategories(r.items))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!id) {
      setDraft(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    api
      .get<TemplateFull>(`/templates/${id}`)
      .then((t) => {
        setDraft(fromFull(t));
        setCurrentVersion(t.current_version || '0.0.0');
        setTypeChosen(t.template_type);
      })
      .catch((e) => setError(e?.message || '加载失败'))
      .finally(() => setLoading(false));
  }, [id]);

  const startNew = (t: TemplateType) => {
    setTypeChosen(t);
    setCurrentVersion('0.0.0');
    const steps = t === 'chain' ? [emptyStep('s1'), emptyStep('s2')] : [emptyStep('s1')];
    setDraft({
      title: '',
      summary: '',
      category: '',
      model_tags: [],
      price_cents: 0,
      doc_md: '',
      sample_output: '',
      template_type: t,
      steps,
      variables: [emptyVar()],
    });
  };

  const patch = (p: Partial<Draft>) => setDraft((d) => (d ? { ...d, ...p } : d));

  const updateStep = (stepId: string, p: Partial<StepDraft>) =>
    setDraft((d) =>
      d ? { ...d, steps: d.steps.map((s) => (s.id === stepId ? { ...s, ...p } : s)) } : d,
    );

  const addStep = () =>
    setDraft((d) => {
      if (!d) return d;
      const nextId = `s${Date.now()}`;
      return {
        ...d,
        steps: [...d.steps, { ...emptyStep(nextId), order: d.steps.length + 1 }],
      };
    });

  const removeStep = (stepId: string) =>
    setDraft((d) =>
      d ? { ...d, steps: d.steps.filter((s) => s.id !== stepId).map((s, i) => ({ ...s, order: i + 1 })) } : d,
    );

  const moveStep = (idx: number, dir: -1 | 1) =>
    setDraft((d) => {
      if (!d) return d;
      const steps = [...d.steps];
      const j = idx + dir;
      if (j < 0 || j >= steps.length) return d;
      [steps[idx], steps[j]] = [steps[j], steps[idx]];
      return { ...d, steps: steps.map((s, i) => ({ ...s, order: i + 1 })) };
    });

  const insertAtCursor = (stepId: string, text: string) => {
    if (!draft) return;
    const ta = taRefs.current[stepId];
    const step = draft.steps.find((s) => s.id === stepId);
    if (!step) return;
    let newPrompt: string;
    let pos: number;
    if (ta) {
      const start = ta.selectionStart ?? step.prompt.length;
      const end = ta.selectionEnd ?? start;
      newPrompt = step.prompt.slice(0, start) + text + step.prompt.slice(end);
      pos = start + text.length;
    } else {
      newPrompt = step.prompt + text;
      pos = newPrompt.length;
    }
    updateStep(stepId, { prompt: newPrompt });
    setTimeout(() => {
      const el = taRefs.current[stepId];
      if (el) {
        el.focus();
        el.setSelectionRange(pos, pos);
      }
    }, 0);
  };

  const updateVar = (idx: number, p: Partial<VarDraft>) =>
    setDraft((d) =>
      d ? { ...d, variables: d.variables.map((v, i) => (i === idx ? { ...v, ...p } : v)) } : d,
    );
  const addVar = (name?: string) =>
    setDraft((d) =>
      d
        ? { ...d, variables: [...d.variables, name ? { ...emptyVar(), name } : emptyVar()] }
        : d,
    );
  const removeVar = (idx: number) =>
    setDraft((d) => (d ? { ...d, variables: d.variables.filter((_, i) => i !== idx) } : d));

  const varErrors = useMemo(() => {
    if (!draft) return {};
    const seen = new Set<string>();
    const errs: Record<string, string> = {};
    draft.variables.forEach((v, idx) => {
      if (!v.name) {
        errs[`${idx}`] = '变量名不能为空';
        return;
      }
      const check = validateVarName(v.name);
      if (!check.ok) errs[`${idx}`] = check.reason || '变量名非法';
      else if (seen.has(v.name)) errs[`${idx}`] = '变量名重复';
      else seen.add(v.name);
    });
    return errs;
  }, [draft]);

  // 自动扫描步骤正文中的 {{变量}}，找出「已引用但未定义」的变量
  const referencedUndefined = useMemo(() => {
    if (!draft) return [] as string[];
    const all = new Set<string>();
    draft.steps.forEach((s) => extractVariableNames(s.prompt).forEach((n) => all.add(n)));
    const defined = new Set(draft.variables.map((v) => v.name).filter(Boolean));
    return Array.from(all)
      .filter((n) => !n.startsWith('__') && !defined.has(n))
      .sort();
  }, [draft]);

  const previewDebounced = useDebounced(previewValues, 300);
  const previewRendered = useMemo(
    () => (draft ? renderLocal(draft.steps, previewDebounced) : []),
    [draft, previewDebounced],
  );

  const saveDraft = useCallback(async (): Promise<string | null> => {
    if (!draft) return null;
    if (!draft.title.trim()) {
      setError('请先填写模板标题');
      return null;
    }
    const bad = Object.keys(varErrors).length > 0;
    if (bad) {
      setError('存在非法或重复的变量名，请修正后再保存');
      return null;
    }
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      if (id) {
        await api.put(`/templates/${id}`, buildBody(draft));
        setSuccess('草稿已保存');
        return id;
      }
      const created = await api.post<TemplateFull>('/templates', buildBody(draft));
      setSuccess('草稿已创建');
      navigate(`/studio/${created.id}/edit`, { replace: true });
      return created.id;
    } catch (e: any) {
      setError(e?.message || '保存失败');
      return null;
    } finally {
      setSaving(false);
    }
  }, [draft, id, navigate, varErrors]);

  const submitReview = async () => {
    const tid = await saveDraft();
    if (!tid) return;
    setSaving(true);
    try {
      await api.post(`/templates/${tid}/submit`);
      setSuccess('已提交审核，等待管理员处理');
    } catch (e: any) {
      if (e instanceof ApiError && e.code === 'CONTENT_REJECTED') {
        setError(`内容命中敏感词，无法提交审核：${formatDetails(e.details)}`);
      } else {
        setError(e?.message || '提交失败');
      }
    } finally {
      setSaving(false);
    }
  };

  const doPublish = async () => {
    if (!semverRe.test(pubVersion.trim())) {
      setError('版本号需为语义化版本，如 1.0.0');
      return;
    }
    if (cmpVersion(pubVersion.trim(), currentVersion) <= 0) {
      setError(`版本号必须大于当前版本 v${currentVersion}`);
      return;
    }
    if (!pubChangelog.trim()) {
      setError('修改说明（changelog）为必填');
      return;
    }
    setPublishing(true);
    setError(null);
    try {
      const tid = await saveDraft();
      if (!tid) {
        setPublishing(false);
        return;
      }
      await api.post(`/templates/${tid}/versions`, {
        version: pubVersion.trim(),
        changelog: pubChangelog.trim(),
      });
      setPublishOpen(false);
      setSuccess('新版本已发布');
      setPubVersion('');
      setPubChangelog('');
    } catch (e: any) {
      setError(e?.message || '发布失败');
    } finally {
      setPublishing(false);
    }
  };

  const openPublish = () => {
    setPubVersion(bumpMinor(currentVersion));
    setPubChangelog('');
    setError(null);
    setPublishOpen(true);
  };

  // 新模板：先选择单条/链式
  if (!isNew && loading) return <PageLoading />;
  if (isNew && !typeChosen) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <h1 className="text-2xl font-bold">创建新模板</h1>
        <p className="mt-2 text-gray-500 dark:text-gray-400">选择你要创建的模板形态（创建后不可更改）。</p>
        <div className="mt-8 grid gap-5 sm:grid-cols-2">
          <button
            onClick={() => startNew('single')}
            className="rounded-2xl border-2 border-gray-200 p-8 text-left transition hover:border-blue-500 dark:border-gray-800"
          >
            <div className="text-3xl">📄</div>
            <h2 className="mt-3 text-lg font-semibold">单条 Prompt</h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              一条带变量的 Prompt，填入变量即得最终提示词。
            </p>
          </button>
          <button
            onClick={() => startNew('chain')}
            className="rounded-2xl border-2 border-gray-200 p-8 text-left transition hover:border-blue-500 dark:border-gray-800"
          >
            <div className="text-3xl">🔗</div>
            <h2 className="mt-3 text-lg font-semibold">链式 Workflow</h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              多步骤串联，步骤间通过内置变量传递上下文。
            </p>
          </button>
        </div>
      </div>
    );
  }

  if (!draft) return <PageLoading />;

  const isChain = draft.template_type === 'chain';

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      {/* 顶部 */}
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <Link to={isNew ? '/dashboard/works' : `/studio/${id}/versions`} className="text-sm text-gray-400 hover:text-blue-500">
          ← {isNew ? '作品管理' : '返回'}
        </Link>
        <span className="rounded bg-blue-500/10 px-2 py-0.5 text-xs font-medium text-blue-500">
          {isChain ? '链式工作流' : '单条模板'}
        </span>
        <span className="font-mono text-xs text-gray-400">v{currentVersion}</span>
        <input
          value={draft.title}
          onChange={(e) => patch({ title: e.target.value })}
          placeholder="模板标题（必填）"
          className="min-w-0 flex-1 rounded-lg border border-gray-300 bg-transparent px-3 py-1.5 text-lg font-semibold outline-none focus:border-blue-500 dark:border-gray-700"
        />
      </div>

      {(error || success) && (
        <div
          className={`mb-4 rounded-lg border px-4 py-3 text-sm ${
            error
              ? 'border-red-500/40 bg-red-500/10 text-red-500'
              : 'border-green-500/40 bg-green-500/10 text-green-500'
          }`}
        >
          {error || success}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        {/* 左：基本信息 + 步骤 */}
        <section className="min-w-0 space-y-5">
          <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
            <h2 className="mb-3 font-semibold">基本信息</h2>
            <div className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium">一句话简介</label>
                  <input
                    value={draft.summary}
                    onChange={(e) => patch({ summary: e.target.value })}
                    placeholder="一句话介绍这个模板"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">一级分类</label>
                  <select
                    value={draft.category}
                    onChange={(e) => patch({ category: e.target.value })}
                    className={inputCls}
                  >
                    <option value="">请选择分类</option>
                    {categories.map((c) => (
                      <option key={c.slug} value={c.slug}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">适配模型</label>
                <div className="flex flex-wrap gap-2">
                  {MODEL_OPTIONS.map((m) => {
                    const on = draft.model_tags.includes(m.value);
                    return (
                      <button
                        key={m.value}
                        type="button"
                        onClick={() =>
                          patch({
                            model_tags: on
                              ? draft.model_tags.filter((x) => x !== m.value)
                              : [...draft.model_tags, m.value],
                          })
                        }
                        className={`rounded-full border px-3 py-1 text-xs transition ${
                          on
                            ? 'border-blue-500 bg-blue-500/10 text-blue-500'
                            : 'border-gray-300 text-gray-500 hover:border-blue-500 dark:border-gray-700 dark:text-gray-400'
                        }`}
                      >
                        {m.label}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium">价格（分，MVP 填 0）</label>
                  <input
                    type="number"
                    min={0}
                    value={draft.price_cents}
                    onChange={(e) => patch({ price_cents: Math.max(0, parseInt(e.target.value) || 0) })}
                    className={inputCls}
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">运行说明文档（Markdown）</label>
                <textarea
                  rows={4}
                  value={draft.doc_md}
                  onChange={(e) => patch({ doc_md: e.target.value })}
                  placeholder="告诉使用者如何使用这个模板、每一步把输出粘贴回哪个对话框…"
                  className={`${inputCls} font-mono`}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">样例输出</label>
                <textarea
                  rows={4}
                  value={draft.sample_output}
                  onChange={(e) => patch({ sample_output: e.target.value })}
                  placeholder="作者上传的模型真实输出示例"
                  className={`${inputCls} font-mono`}
                />
              </div>
            </div>
          </div>

          {/* 步骤面板 */}
          <div className="space-y-3">
            <h2 className="font-semibold">步骤</h2>
            {draft.steps.map((step, i) => (
              <div
                key={step.id}
                className="rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900"
              >
                <div className="flex items-center gap-2 border-b border-gray-200 px-3 py-2 dark:border-gray-800">
                  <span className="text-sm font-medium text-gray-500 dark:text-gray-400">步骤 {i + 1}</span>
                  <input
                    value={step.title}
                    onChange={(e) => updateStep(step.id, { title: e.target.value })}
                    placeholder="步骤标题"
                    className="flex-1 bg-transparent text-sm outline-none placeholder:text-gray-400"
                  />
                  {isChain && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => moveStep(i, -1)}
                        disabled={i === 0}
                        className="rounded px-1 text-gray-400 hover:text-blue-500 disabled:opacity-30"
                        title="上移"
                      >
                        ↑
                      </button>
                      <button
                        onClick={() => moveStep(i, 1)}
                        disabled={i === draft.steps.length - 1}
                        className="rounded px-1 text-gray-400 hover:text-blue-500 disabled:opacity-30"
                        title="下移"
                      >
                        ↓
                      </button>
                    </div>
                  )}
                  {draft.steps.length > 1 && (
                    <button
                      onClick={() => removeStep(step.id)}
                      className="rounded px-1 text-gray-400 hover:text-red-500"
                      title="删除步骤"
                    >
                      ✕
                    </button>
                  )}
                </div>
                <textarea
                  ref={(el) => {
                    taRefs.current[step.id] = el;
                  }}
                  rows={6}
                  value={step.prompt}
                  onChange={(e) => updateStep(step.id, { prompt: e.target.value })}
                  placeholder={`在此书写步骤 ${i + 1} 的 Prompt，可用 {{变量名}} 引用变量`}
                  className="w-full resize-y bg-transparent p-3 font-mono text-xs leading-relaxed outline-none"
                />
                <div className="flex flex-wrap items-center gap-2 border-t border-gray-200 px-3 py-2 text-xs dark:border-gray-800">
                  {isChain && i > 0 && (
                    <button
                      onClick={() => insertAtCursor(step.id, '{{__prev_output__}}')}
                      className="rounded bg-purple-500/10 px-2 py-1 text-purple-500 hover:bg-purple-500/20"
                    >
                      ↩ 插入上一步输出
                    </button>
                  )}
                  <span className="text-gray-400">temperature</span>
                  <input
                    type="number"
                    step={0.1}
                    min={0}
                    max={2}
                    value={step.temperature}
                    onChange={(e) => updateStep(step.id, { temperature: parseFloat(e.target.value) || 0 })}
                    className="w-20 rounded border border-gray-300 bg-transparent px-2 py-1 dark:border-gray-700"
                  />
                  <span className="text-gray-400">输出格式</span>
                  <select
                    value={step.output_format}
                    onChange={(e) => updateStep(step.id, { output_format: e.target.value as OutputFormat })}
                    className="rounded border border-gray-300 bg-transparent px-2 py-1 dark:border-gray-700 dark:bg-gray-900"
                  >
                    {OUTPUT_FORMATS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                  <span className="text-gray-400">模型提示</span>
                  <input
                    value={step.model_hint}
                    onChange={(e) => updateStep(step.id, { model_hint: e.target.value })}
                    placeholder="如 deepseek-chat"
                    className="w-32 rounded border border-gray-300 bg-transparent px-2 py-1 dark:border-gray-700"
                  />
                  <span className="ml-auto shrink-0 text-gray-400">
                    {step.prompt.length} 字 · ≈ {Math.ceil(step.prompt.length / 1.6)} token
                    <span className="text-gray-500">（估算值）</span>
                  </span>
                </div>
              </div>
            ))}

            {isChain && (
              <button
                onClick={addStep}
                className="w-full rounded-xl border border-dashed border-gray-300 py-3 text-sm text-gray-500 transition hover:border-blue-500 hover:text-blue-500 dark:border-gray-700"
              >
                + 添加步骤
              </button>
            )}
          </div>
        </section>

        {/* 右：变量 + 预览 */}
        <aside className="space-y-5">
          <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-semibold">变量定义</h2>
              <button onClick={() => addVar()} className="text-sm text-blue-500 hover:underline">
                + 添加变量
              </button>
            </div>
            <p className="mb-3 rounded bg-gray-100 px-3 py-2 text-xs text-gray-500 dark:bg-gray-800 dark:text-gray-400">
              变量名规则：<code>^[a-zA-Z_][a-zA-Z0-9_]{'{0,63}'}$</code>，且禁止 <code>__</code> 前缀（保留给内置变量）。
            </p>
            {referencedUndefined.length > 0 && (
              <div className="mb-3 rounded-lg border border-amber-500/40 bg-amber-500/10 p-2.5">
                <div className="mb-1.5 text-xs font-medium text-amber-600 dark:text-amber-400">
                  已引用但未定义的变量（点击补建）：
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {referencedUndefined.map((n) => (
                    <button
                      key={n}
                      onClick={() => addVar(n)}
                      className="rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 font-mono text-xs text-amber-600 transition hover:bg-amber-500/20 dark:text-amber-400"
                      title={`点击补建变量 ${n}`}
                    >
                      {`{{${n}}}`} +
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="space-y-3">
              {draft.variables.map((v, idx) => (
                <div key={idx} className="rounded-lg border border-gray-200 p-3 dark:border-gray-800">
                  <div className="flex items-center gap-2">
                    <input
                      value={v.name}
                      onChange={(e) => updateVar(idx, { name: e.target.value })}
                      placeholder="变量名"
                      className={`w-32 rounded border px-2 py-1 font-mono text-xs outline-none dark:bg-gray-900 ${
                        varErrors[`${idx}`] ? 'border-red-500' : 'border-gray-300 dark:border-gray-700'
                      }`}
                    />
                    <input
                      value={v.label}
                      onChange={(e) => updateVar(idx, { label: e.target.value })}
                      placeholder="显示标签（可中文）"
                      className="min-w-0 flex-1 rounded border border-gray-300 px-2 py-1 text-xs outline-none focus:border-blue-500 dark:border-gray-700 dark:bg-gray-900"
                    />
                    <button
                      onClick={() => removeVar(idx)}
                      className="text-gray-400 hover:text-red-500"
                      title="删除变量"
                    >
                      ✕
                    </button>
                  </div>
                  {varErrors[`${idx}`] && (
                    <p className="mt-1 text-xs text-red-500">{varErrors[`${idx}`]}</p>
                  )}
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <select
                      value={v.var_type}
                      onChange={(e) => updateVar(idx, { var_type: e.target.value as VarType })}
                      className="rounded border border-gray-300 px-2 py-1 text-xs dark:border-gray-700 dark:bg-gray-900"
                    >
                      {VAR_TYPES.map((t) => (
                        <option key={t.value} value={t.value}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                    <label className="flex items-center gap-1.5 text-xs text-gray-500">
                      <input
                        type="checkbox"
                        checked={v.required}
                        onChange={(e) => updateVar(idx, { required: e.target.checked })}
                        className="accent-blue-600"
                      />
                      必填
                    </label>
                  </div>
                  <input
                    value={v.description}
                    onChange={(e) => updateVar(idx, { description: e.target.value })}
                    placeholder="填写说明（placeholder 提示语）"
                    className="mt-2 w-full rounded border border-gray-300 px-2 py-1 text-xs outline-none focus:border-blue-500 dark:border-gray-700 dark:bg-gray-900"
                  />
                  {v.var_type === 'select' ? (
                    <input
                      value={v.options.join(', ')}
                      onChange={(e) =>
                        updateVar(idx, {
                          options: e.target.value.split(/[,，]/).map((s) => s.trim()).filter(Boolean),
                        })
                      }
                      placeholder="选项，逗号分隔：淘宝, 拼多多, 抖音"
                      className="mt-2 w-full rounded border border-gray-300 px-2 py-1 text-xs outline-none focus:border-blue-500 dark:border-gray-700 dark:bg-gray-900"
                    />
                  ) : (
                    <input
                      value={v.default_value}
                      onChange={(e) => updateVar(idx, { default_value: e.target.value })}
                      placeholder={v.var_type === 'boolean' ? '默认：true / false' : '默认值'}
                      className="mt-2 w-full rounded border border-gray-300 px-2 py-1 text-xs outline-none focus:border-blue-500 dark:border-gray-700 dark:bg-gray-900"
                    />
                  )}
                </div>
              ))}
              {draft.variables.length === 0 && (
                <p className="py-4 text-center text-sm text-gray-400">尚未定义变量</p>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
            <h2 className="mb-3 font-semibold">实时预览</h2>
            <p className="mb-3 text-xs text-gray-400">填入测试变量值，本地即时渲染（300ms 防抖）。</p>
            {draft.variables.length ? (
              <div className="mb-4 max-h-72 space-y-2 overflow-y-auto pr-1">
                <VariableForm
                  variables={draft.variables.map((v, i) => ({
                    name: v.name || `__unnamed_${i}`,
                    label: v.label || v.name || '(未命名)',
                    description: v.description || null,
                    var_type: v.var_type,
                    default_value: v.default_value || null,
                    options: v.options,
                    required: v.required,
                    sort_order: i,
                  }))}
                  values={previewValues}
                  onChange={setPreviewValues}
                />
              </div>
            ) : (
              <p className="mb-4 text-sm text-gray-400">定义变量后即可在此预览。</p>
            )}
            <RenderedSteps rendered={previewRendered} />
          </div>
        </aside>
      </div>

      {/* 底部操作栏 */}
      <div className="sticky bottom-4 mt-6 flex flex-wrap items-center gap-2 rounded-xl border border-gray-200 bg-white/95 p-3 shadow-lg backdrop-blur dark:border-gray-800 dark:bg-gray-900/95">
        <button onClick={saveDraft} disabled={saving} className={btnSecondary}>
          {saving ? '保存中…' : '保存草稿'}
        </button>
        <button onClick={openPublish} disabled={saving || isNew} className={btnPrimary}>
          发布新版本
        </button>
        <button onClick={submitReview} disabled={saving} className={btnSecondary}>
          提交审核
        </button>
        {!isNew && (
          <Link to={`/studio/${id}/versions`} className={`${btnSecondary} ml-auto`}>
            版本管理 →
          </Link>
        )}
        {isNew && <span className="ml-auto text-xs text-gray-400">先保存草稿后可发布新版本</span>}
      </div>

      {/* 发布弹窗 */}
      <Modal
        open={publishOpen}
        title="发布新版本"
        onClose={() => setPublishOpen(false)}
        footer={
          <>
            <button onClick={() => setPublishOpen(false)} className={btnSecondary}>
              取消
            </button>
            <button onClick={doPublish} disabled={publishing} className={btnPrimary}>
              {publishing ? '发布中…' : '确认发布'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">
              版本号 <span className="text-xs text-gray-400">（semver，需大于 v{currentVersion}）</span>
            </label>
            <input
              value={pubVersion}
              onChange={(e) => setPubVersion(e.target.value)}
              placeholder="如 1.0.0"
              className={`${inputCls} font-mono`}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">
              修改说明（changelog）<em className="ml-0.5 not-italic text-red-400">*</em>
            </label>
            <textarea
              value={pubChangelog}
              onChange={(e) => setPubChangelog(e.target.value)}
              rows={3}
              placeholder="本版本更新了什么？"
              className={inputCls}
            />
          </div>
          <p className="text-xs text-gray-400">
            发布后模板将生成不可变版本快照，并对所有人可见 changelog。
          </p>
        </div>
      </Modal>
    </div>
  );
}
