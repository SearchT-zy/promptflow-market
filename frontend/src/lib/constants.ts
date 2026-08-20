// 共享常量
import type { OutputFormat, TemplateStatus, VarType } from '../api';

export const MODEL_OPTIONS: { value: string; label: string }[] = [
  { value: 'deepseek', label: 'DeepSeek' },
  { value: 'glm', label: 'GLM（智谱）' },
  { value: 'kimi', label: 'Kimi（月之暗面）' },
  { value: 'gpt', label: 'GPT 系列' },
  { value: 'claude', label: 'Claude' },
  { value: 'tongyi', label: '通义千问' },
  { value: 'ollama', label: '本地开源（Ollama）' },
];

export const MODEL_LABELS: Record<string, string> = Object.fromEntries(
  MODEL_OPTIONS.map((m) => [m.value, m.label]),
);

export const OUTPUT_FORMATS: { value: OutputFormat; label: string }[] = [
  { value: 'markdown', label: 'Markdown' },
  { value: 'json', label: 'JSON' },
  { value: 'text', label: '纯文本' },
];

export const VAR_TYPES: { value: VarType; label: string }[] = [
  { value: 'string', label: '字符串（单行）' },
  { value: 'text', label: '文本（多行）' },
  { value: 'number', label: '数字' },
  { value: 'select', label: '下拉选择' },
  { value: 'boolean', label: '布尔（开关）' },
];

export const STATUS_META: Record<
  TemplateStatus,
  { label: string; badge: string; dot: string }
> = {
  draft: {
    label: '草稿',
    badge: 'bg-gray-500/15 text-gray-400 dark:text-gray-300 border-gray-500/30',
    dot: 'bg-gray-400',
  },
  reviewing: {
    label: '审核中',
    badge: 'bg-blue-500/15 text-blue-500 border-blue-500/30',
    dot: 'bg-blue-500',
  },
  published: {
    label: '已发布',
    badge: 'bg-green-500/15 text-green-500 border-green-500/30',
    dot: 'bg-green-500',
  },
  rejected: {
    label: '已驳回',
    badge: 'bg-red-500/15 text-red-500 border-red-500/30',
    dot: 'bg-red-500',
  },
  offline: {
    label: '已下架',
    badge: 'bg-yellow-500/15 text-yellow-500 border-yellow-500/30',
    dot: 'bg-yellow-500',
  },
};

export const SORT_OPTIONS: { value: string; label: string }[] = [
  { value: 'default', label: '综合排序' },
  { value: 'sales', label: '销量' },
  { value: 'rating', label: '评分' },
  { value: 'newest', label: '最新上架' },
  { value: 'price_asc', label: '价格从低到高' },
  { value: 'price_desc', label: '价格从高到低' },
];

export const ADAPTERS: { value: string; label: string; baseUrl: string }[] = [
  { value: 'openai', label: 'OpenAI 兼容', baseUrl: 'https://api.openai.com/v1/chat/completions' },
  { value: 'deepseek', label: 'DeepSeek', baseUrl: 'https://api.deepseek.com/v1/chat/completions' },
  { value: 'glm', label: 'GLM（智谱）', baseUrl: 'https://open.bigmodel.cn/api/paas/v4/chat/completions' },
  { value: 'kimi', label: 'Kimi', baseUrl: 'https://api.moonshot.cn/v1/chat/completions' },
  { value: 'claude', label: 'Claude', baseUrl: 'https://api.anthropic.com/v1/messages' },
];

export const AS_OPTIONS = [
  { value: 'curl', label: 'cURL' },
  { value: 'python', label: 'Python SDK' },
  { value: 'json', label: 'JSON 请求体' },
];
