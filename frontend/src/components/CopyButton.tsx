import { useRef, useState } from 'react';

async function copyText(text: string): Promise<void> {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(text);
    return;
  }
  // 非安全上下文回退
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.select();
  document.execCommand('copy');
  document.body.removeChild(ta);
}

export function CopyButton({
  text,
  label = '复制',
  copiedLabel = '已复制',
  className = '',
  size = 'sm',
}: {
  text: string;
  label?: string;
  copiedLabel?: string;
  className?: string;
  size?: 'sm' | 'md';
}) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onCopy = async () => {
    try {
      await copyText(text);
      setCopied(true);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  };

  return (
    <button
      type="button"
      onClick={onCopy}
      className={`inline-flex items-center gap-1 rounded-md border border-gray-300 px-2.5 font-medium text-gray-600 transition hover:border-blue-500 hover:text-blue-500 dark:border-gray-700 dark:text-gray-300 dark:hover:border-blue-500 dark:hover:text-blue-400 ${
        size === 'sm' ? 'py-1 text-xs' : 'py-1.5 text-sm'
      } ${copied ? 'border-green-500 text-green-500 dark:border-green-500 dark:text-green-400' : ''} ${className}`}
      title={label}
    >
      {copied ? (
        <>
          <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
            <path
              fillRule="evenodd"
              d="M16.7 5.3a1 1 0 010 1.4l-8 8a1 1 0 01-1.4 0l-4-4a1 1 0 111.4-1.4L8 12.6l7.3-7.3a1 1 0 011.4 0z"
              clipRule="evenodd"
            />
          </svg>
          {copiedLabel}
        </>
      ) : (
        <>
          <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
            <path d="M8 3a1 1 0 000 2h6a1 1 0 011 1v8a1 1 0 102 0V6a3 3 0 00-3-3H8z" />
            <path d="M4 7a1 1 0 011-1h8a1 1 0 011 1v10a1 1 0 01-1 1H5a1 1 0 01-1-1V7z" />
          </svg>
          {label}
        </>
      )}
    </button>
  );
}
