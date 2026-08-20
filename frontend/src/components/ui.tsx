import type { ReactNode } from 'react';

export const inputCls =
  'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:opacity-60 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100';

export const btnPrimary =
  'inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60';

export const btnSecondary =
  'inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:border-blue-500 hover:text-blue-500 disabled:opacity-60 dark:border-gray-700 dark:text-gray-200 dark:hover:border-blue-500 dark:hover:text-blue-400';

export const btnDanger =
  'inline-flex items-center justify-center gap-2 rounded-lg border border-red-500/40 px-4 py-2 text-sm font-medium text-red-500 transition hover:bg-red-500/10 disabled:opacity-60';

export function Field({
  label,
  description,
  required,
  error,
  children,
}: {
  label: ReactNode;
  description?: ReactNode;
  required?: boolean;
  error?: string | null;
  children: ReactNode;
}) {
  return (
    <div>
      <label className="block">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
          {label}
          {required && <em className="ml-0.5 not-italic text-red-400">*</em>}
        </span>
        {description && (
          <p className="mb-1 mt-0.5 text-xs text-gray-500 dark:text-gray-400">{description}</p>
        )}
        {children}
      </label>
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}

export function ErrorBanner({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-2.5 text-sm text-red-500">
      {message}
    </div>
  );
}
