export function Spinner({ className = '' }: { className?: string }) {
  return (
    <span
      className={`inline-block h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent align-middle ${className}`}
      role="status"
      aria-label="加载中"
    />
  );
}

export function PageLoading({ label = '加载中…' }: { label?: string }) {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-gray-400">
      <Spinner className="h-7 w-7 text-blue-500" />
      <span className="text-sm">{label}</span>
    </div>
  );
}
