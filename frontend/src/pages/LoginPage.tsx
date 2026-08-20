import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../auth';
import { ApiError } from '../api';
import { btnPrimary, inputCls, ErrorBanner } from '../components/ui';
import { useTitle } from '../lib/hooks';

export default function LoginPage() {
  useTitle('登录');
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login } = useAuth();

  const [account, setAccount] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const next = searchParams.get('next') || '/';

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!account.trim()) return setError('请输入用户名或邮箱');
    if (!password) return setError('请输入密码');
    setSubmitting(true);
    try {
      await login(account.trim(), password);
      navigate(next, { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '登录失败，请稍后重试');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto flex max-w-md flex-col px-4 py-16">
      <div className="text-center">
        <h1 className="text-2xl font-bold">欢迎回来</h1>
        <p className="mt-1 text-sm text-gray-400">登录 PromptFlow 使用模板工作台</p>
      </div>

      <form onSubmit={onSubmit} className="mt-8 space-y-4 rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
        <ErrorBanner message={error} />
        <div>
          <label className="mb-1 block text-sm font-medium">用户名或邮箱</label>
          <input
            value={account}
            onChange={(e) => setAccount(e.target.value)}
            placeholder="zhangsan 或 a@b.com"
            autoComplete="username"
            className={inputCls}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">密码</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••"
            autoComplete="current-password"
            className={inputCls}
          />
        </div>
        <button type="submit" disabled={submitting} className={`${btnPrimary} w-full`}>
          {submitting ? '登录中…' : '登录'}
        </button>
        <p className="text-center text-sm text-gray-500 dark:text-gray-400">
          还没有账号？{' '}
          <Link to={`/register?next=${encodeURIComponent(next)}`} className="text-blue-500 hover:underline">
            立即注册
          </Link>
        </p>
      </form>
    </div>
  );
}
