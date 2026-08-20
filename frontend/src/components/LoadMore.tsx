import { Spinner } from './Spinner';

export function LoadMore({
  hasMore,
  loading,
  onLoad,
}: {
  hasMore: boolean;
  loading: boolean;
  onLoad: () => void;
}) {
  if (!hasMore) {
    return (
      <p className="py-8 text-center text-sm text-gray-400 dark:text-gray-500">没有更多了</p>
    );
  }
  return (
    <div className="flex justify-center py-8">
      <button
        onClick={onLoad}
        disabled={loading}
        className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-6 py-2.5 text-sm font-medium text-gray-700 transition hover:border-blue-500 hover:text-blue-500 disabled:opacity-60 dark:border-gray-700 dark:text-gray-200 dark:hover:border-blue-500 dark:hover:text-blue-400"
      >
        {loading && <Spinner className="h-4 w-4" />}
        {loading ? '加载中…' : '加载更多'}
      </button>
    </div>
  );
}
