import type { Rendered } from '../api';
import { CopyButton } from './CopyButton';

export function RenderedSteps({ rendered }: { rendered: Rendered[] }) {
  return (
    <div className="space-y-3">
      {rendered.map((s) => (
        <div
          key={s.step}
          className="overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900"
        >
          <div className="flex items-center justify-between gap-2 border-b border-gray-200 px-3 py-2 text-xs dark:border-gray-800">
            <span className="truncate font-medium text-gray-700 dark:text-gray-200">
              步骤 {s.step} · {s.title}
            </span>
            <CopyButton text={s.text} label="复制本步" className="shrink-0" />
          </div>
          <pre className="whitespace-pre-wrap break-words p-3 font-mono text-xs leading-relaxed text-gray-800 dark:text-gray-200">
            {s.text}
          </pre>
        </div>
      ))}
    </div>
  );
}

export function joinAllText(rendered: Rendered[]): string {
  return rendered
    .map((s) => `【步骤 ${s.step} · ${s.title}】\n${s.text}`)
    .join('\n\n---\n\n');
}
