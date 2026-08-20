// 前端本地渲染 —— 严格对齐 PRD 10.3 与 api-contract.md 的渲染规则
// 单趟正则替换、白名单变量名、"""值""" fence、10000 截断、内置变量占位。

import type { Rendered, Step } from '../api';

// 仅匹配白名单变量名（ASCII 白名单，防注入第一步）
const VAR_RE = /\{\{\s*([a-zA-Z_]\w{0,63})\s*\}\}/g;

const STEP_OUTPUT_RE = /^__step_(\d+)_output__$/;

const MAX_LEN = 10_000;

/** 变量值 fence 包裹 + 长度截断（单次替换，值不再二次解析） */
export function fence(raw: string): string {
  const v = typeof raw === 'string' ? raw : raw == null ? '' : String(raw);
  const val = v.length > MAX_LEN ? v.slice(0, MAX_LEN) + '…[截断]' : v;
  return `"""${val}"""`;
}

/** 提取文本中所有 `{{name}}` 变量名（去重，含内置变量） */
export function extractVariableNames(text: string): string[] {
  const re = /\{\{\s*([a-zA-Z_]\w{0,63})\s*\}\}/g;
  const names = new Set<string>();
  for (const m of text.matchAll(re)) names.add(m[1]);
  return Array.from(names);
}

/**
 * 本地渲染模板步骤。
 * @param steps 步骤数组
 * @param values 用户变量值（name -> value）
 * @param context 回填上下文 {`s{N}_output`: string}，命中时注入 `"""输出"""` 而不是占位
 */
export function renderLocal(
  steps: Step[],
  values: Record<string, string>,
  context: Record<string, string> = {},
): Rendered[] {
  return steps.map((s, i) => {
    const stepNo = i + 1; // 1-based
    const text = s.prompt.replace(VAR_RE, (_m, name: string) => {
      // 内置变量：上一步输出
      if (name === '__prev_output__') {
        // 上一步的步骤编号 = i（0-based 时上一步即第 i 步）
        const prevNo = i;
        const out = context[`s${prevNo}_output`];
        if (out !== undefined && out !== '') return fence(out);
        // 占位文案与后端 render.py 完全一致（api-contract.md）
        return `【⚠ 此处粘贴第 ${prevNo} 步模型的输出】`;
      }
      // 内置变量：指定第 N 步输出
      const m = STEP_OUTPUT_RE.exec(name);
      if (m) {
        const n = parseInt(m[1], 10);
        const out = context[`s${n}_output`];
        if (out !== undefined && out !== '') return fence(out);
        return `【⚠ 此处粘贴第 ${n} 步模型的输出】`;
      }
      // 普通用户变量
      const raw = values[name] ?? '';
      return fence(raw);
    });
    return { step: stepNo, title: s.title, text };
  });
}

/** 校验变量名是否缺失（必填变量且值为空/undefined 时返回缺失列表） */
export function missingVariables(
  variables: { name: string; required: boolean }[],
  values: Record<string, string>,
): { name: string; reason: string }[] {
  return variables
    .filter((v) => v.required)
    .filter((v) => {
      const val = values[v.name];
      return val === undefined || val === null || val === '';
    })
    .map((v) => ({ name: v.name, reason: 'required' }));
}

/** 变量名合法性校验（PRD 3.1.3：^[a-zA-Z_][a-zA-Z0-9_]{0,63}$ 且禁止 __ 前缀） */
export function validateVarName(name: string): { ok: boolean; reason?: string } {
  if (!/^[a-zA-Z_][a-zA-Z0-9_]{0,63}$/.test(name)) {
    return { ok: false, reason: '变量名需匹配 ^[a-zA-Z_][a-zA-Z0-9_]{0,63}$' };
  }
  if (name.startsWith('__')) {
    return { ok: false, reason: '禁止使用 __ 前缀（保留给内置变量）' };
  }
  return { ok: true };
}
