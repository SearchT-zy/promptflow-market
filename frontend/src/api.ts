// PromptFlow 前端 API 封装 —— 严格对齐 docs/api-contract.md
// 后端前缀 /api/v1，认证 Bearer <jwt>（localStorage key: pf_token）

export const BASE = '/api/v1';
export const TOKEN_KEY = 'pf_token';

export type Role = 'user' | 'creator' | 'enterprise' | 'admin';
export type TemplateStatus = 'draft' | 'reviewing' | 'published' | 'rejected' | 'offline';
export type TemplateType = 'single' | 'chain';
export type VarType = 'string' | 'text' | 'number' | 'select' | 'boolean';
export type OutputFormat = 'markdown' | 'json' | 'text';

export interface User {
  id: string;
  username: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  role: Role;
  verified: boolean;
  balance_cents: number;
  status: 'active' | 'banned';
  created_at: string;
}

export interface Variable {
  name: string;
  label: string;
  description: string | null;
  var_type: VarType;
  default_value: string | null;
  options: string[] | null;
  required: boolean;
  sort_order: number;
}

export interface Step {
  id: string;
  order: number;
  title: string;
  prompt: string;
  model_hint: string | null;
  temperature: number;
  output_format: OutputFormat;
}

export interface CardAuthor {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  verified: boolean;
}

/** 市场卡片 */
export interface Card {
  id: string;
  slug: string;
  title: string;
  summary: string;
  category: string;
  category_name: string | null;
  model_tags: string[];
  price_cents: number;
  template_type: TemplateType;
  step_count: number;
  sales_count: number;
  rating_avg: number;
  rating_count: number;
  view_count: number;
  author: CardAuthor;
  published_at: string | null;
  cover_url: string | null;
}

/** 作者视角完整模板对象（GET /templates/{id}） */
export interface TemplateFull {
  id: string;
  slug: string;
  title: string;
  summary: string;
  category: string;
  category_name: string | null;
  template_type: TemplateType;
  model_tags: string[];
  price_cents: number;
  status: TemplateStatus;
  current_version: string;
  step_count: number;
  doc_md: string;
  sample_output: string;
  steps: Step[];
  variables: Variable[];
  cover_url: string | null;
  view_count: number;
  render_count: number;
  sales_count: number;
  rating_avg: number;
  rating_count: number;
  review_note: string | null;
  created_at: string;
  updated_at: string;
  published_at: string | null;
}

export interface VersionInfo {
  version: string;
  changelog: string;
  published_at: string | null;
}

/** 公开详情对象（GET /market/templates/{slug}） */
export interface TemplateDetail extends Card {
  doc_md: string;
  sample_output: string;
  steps: Step[];
  variables: Variable[];
  can_use: boolean;
  versions: VersionInfo[];
}

/** 作品管理列表项（template 去除 steps/variables/doc_md/sample_output） */
export type WorksItem = Omit<TemplateFull, 'steps' | 'variables' | 'doc_md' | 'sample_output'>;

export interface Rendered {
  step: number;
  title: string;
  text: string;
}

export interface Category {
  slug: string;
  name: string;
  icon: string | null;
  sort: number;
  count: number;
}

export interface Paged<T> {
  items: T[];
  next_cursor: string | null;
  has_more: boolean;
  total_est: number;
}

export interface HistoryItem {
  id: string;
  action: 'view' | 'render' | 'export_json' | 'export_md' | 'export_api' | 'share';
  template_id: string;
  template_title: string;
  success: boolean;
  created_at: string;
}

export interface CreatorDashboard {
  totals: {
    views: number;
    renders: number;
    exports: number;
    shares: number;
    sales: number;
    revenue_cents: number;
  };
  by_template: {
    id: string;
    title: string;
    views: number;
    renders: number;
    exports: number;
    shares: number;
    sales: number;
  }[];
  funnel: { views: number; renders: number; exports: number };
}

export class ApiError extends Error {
  code: string;
  details: unknown;
  status: number;

  constructor(code: string, message: string, details: unknown, status: number) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.details = details;
    this.status = status;
  }
}

export interface ApiFetchOptions {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
  /** 需要 raw text（如导出 markdown），跳过 JSON 解析 */
  raw?: boolean;
}

function redirectToLogin() {
  const next = window.location.pathname + window.location.search;
  if (
    !window.location.pathname.startsWith('/login') &&
    !window.location.pathname.startsWith('/register')
  ) {
    window.location.assign(`/login?next=${encodeURIComponent(next)}`);
  }
}

/**
 * fetch 封装：自动带 Bearer，401 清 token 跳 /login，
 * 后端错误抛 ApiError{code,message,details}。
 */
export async function apiFetch<T = unknown>(path: string, opts: ApiFetchOptions = {}): Promise<T> {
  const token = localStorage.getItem(TOKEN_KEY);
  const headers: Record<string, string> = { ...(opts.headers || {}) };

  let body: string | undefined;
  if (opts.body !== undefined) {
    if (typeof opts.body === 'string') {
      body = opts.body;
    } else {
      headers['Content-Type'] = 'application/json';
      body = JSON.stringify(opts.body);
    }
  }
  if (token) headers['Authorization'] = `Bearer ${token}`;

  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      method: opts.method || 'GET',
      headers,
      body,
    });
  } catch (e) {
    throw new ApiError('NETWORK_ERROR', '网络请求失败，请确认后端已启动', null, 0);
  }

  if (res.status === 401) {
    localStorage.removeItem(TOKEN_KEY);
    redirectToLogin();
    throw new ApiError('UNAUTHORIZED', '未登录或登录已过期', null, 401);
  }

  const contentType = res.headers.get('content-type') || '';
  let data: unknown = null;
  if (contentType.includes('application/json')) {
    data = await res.json().catch(() => null);
  } else {
    data = await res.text().catch(() => '');
  }

  if (!res.ok) {
    const errObj =
      data && typeof data === 'object' && 'error' in (data as Record<string, unknown>)
        ? ((data as Record<string, unknown>).error as Record<string, unknown>)
        : null;
    const code = errObj?.code ? String(errObj.code) : `HTTP_${res.status}`;
    const message = errObj?.message
      ? String(errObj.message)
      : typeof data === 'string'
        ? data
        : '请求失败';
    const details = errObj?.details ?? null;
    throw new ApiError(code, message, details, res.status);
  }

  if (opts.raw) return data as T;
  return data as T;
}

// 便捷方法
export const api = {
  get: <T = unknown>(path: string, headers?: Record<string, string>) =>
    apiFetch<T>(path, { headers }),
  getRaw: (path: string, headers?: Record<string, string>) =>
    apiFetch<string>(path, { raw: true, headers }),
  post: <T = unknown>(path: string, body?: unknown) => apiFetch<T>(path, { method: 'POST', body }),
  put: <T = unknown>(path: string, body?: unknown) => apiFetch<T>(path, { method: 'PUT', body }),
  del: <T = unknown>(path: string) => apiFetch<T>(path, { method: 'DELETE' }),
};
