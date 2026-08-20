import { Link } from 'react-router-dom';
import { useTitle } from '../lib/hooks';

export default function NotFoundPage() {
  useTitle('页面不存在');
  return (
    <div className="mx-auto flex max-w-3xl flex-col items-center px-4 py-28 text-center">
      <p className="text-6xl font-bold text-blue-500">404</p>
      <h1 className="mt-4 text-xl font-semibold">页面不存在</h1>
      <p className="mt-2 text-gray-500 dark:text-gray-400">你访问的页面可能已被移除或地址有误。</p>
      <Link
        to="/"
        className="mt-6 rounded-lg bg-blue-600 px-5 py-2 font-medium text-white transition hover:bg-blue-500"
      >
        返回首页
      </Link>
    </div>
  );
}
