import type { Variable } from '../api';
import { Field, inputCls } from './ui';

export type Values = Record<string, string>;

/** 计算初始值：优先 preset，其次 default_value */
export function buildInitialValues(
  vars: Variable[],
  preset?: Record<string, string>,
): Values {
  const v: Values = {};
  for (const x of vars) {
    if (preset && preset[x.name] !== undefined && preset[x.name] !== null) {
      v[x.name] = String(preset[x.name]);
    } else if (x.default_value !== null && x.default_value !== undefined) {
      v[x.name] = String(x.default_value);
    } else {
      v[x.name] = x.var_type === 'boolean' ? 'false' : '';
    }
  }
  return v;
}

function Control({
  v,
  value,
  onChange,
}: {
  v: Variable;
  value: string;
  onChange: (val: string) => void;
}) {
  switch (v.var_type) {
    case 'text':
      return (
        <textarea
          rows={4}
          value={value}
          placeholder={v.description || ''}
          onChange={(e) => onChange(e.target.value)}
          className={`${inputCls} font-mono`}
        />
      );
    case 'number':
      return (
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={inputCls}
        />
      );
    case 'select':
      return (
        <select value={value} onChange={(e) => onChange(e.target.value)} className={inputCls}>
          <option value="">请选择…</option>
          {(v.options || []).map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      );
    case 'boolean':
      return (
        <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700">
          <input
            type="checkbox"
            checked={value === 'true'}
            onChange={(e) => onChange(e.target.checked ? 'true' : 'false')}
            className="h-4 w-4 accent-blue-600"
          />
          <span className="text-sm text-gray-600 dark:text-gray-300">
            {value === 'true' ? '是' : '否'}
          </span>
        </label>
      );
    default:
      return (
        <input
          type="text"
          value={value}
          placeholder={v.description || ''}
          onChange={(e) => onChange(e.target.value)}
          className={inputCls}
        />
      );
  }
}

export function VariableForm({
  variables,
  values,
  onChange,
}: {
  variables: Variable[];
  values: Values;
  onChange: (values: Values) => void;
}) {
  if (!variables.length) {
    return <p className="text-sm text-gray-400">该模板无需填写变量。</p>;
  }
  return (
    <div className="space-y-4">
      {variables.map((v) => (
        <Field
          key={v.name}
          label={v.label || v.name}
          description={v.description}
          required={v.required}
        >
          <Control v={v} value={values[v.name] ?? ''} onChange={(val) => onChange({ ...values, [v.name]: val })} />
        </Field>
      ))}
    </div>
  );
}
