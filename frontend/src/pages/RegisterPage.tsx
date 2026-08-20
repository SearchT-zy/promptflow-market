import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../auth';
import { ApiError } from '../api';
import { btnPrimary, inputCls, ErrorBanner } from '../components/ui';
import { useTitle } from '../lib/hooks';

export default function RegisterPage() {
  useTitle('注册');
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { register } = useAuth();

  const [form, setForm] = useState({
    username: '',
    email: '',
    display_name: '',
    password: '',
    confirm: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const next = searchParams.get('next') || '/';

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const validate = (): string | null => {
    if (!/^[a-zA-Z0-9_-]{3,50}$/.test(form.username))
      return '用户名需为 3-50 位字母、数字、下划线或连字符';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return '请输入有效的邮箱地址';
    if (form.password.length < 6) return '密码至少 6 位';
    if (form.password !== form.confirm) return '两次输入的密码不一致';
    return null;
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    const msg = validate();
    if (msg) return setError(msg);
    setSubmitting(true);
    try {
      await register({
        username: form.username,
        email: form.email,
        password: form.password,
        ...(form.display_name.trim() ? { display_name: form.display_name.trim() } : {}),
      });
      navigate(next, { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '注册失败，请稍后重试');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto flex max-w-md flex-col px-4 py-16">
      <div className="text-center">
        <h1 className="text-2xl font-bold">创建账号</h1>
        <p className="mt-1 text-sm text-gray-400">加入 PromptFlow，沉淀与复用你的 Prompt 资产</p>
      </div>

      <form onSubmit={onSubmit} className="mt-8 space-y-4 rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
        <ErrorBanner message={error} />
        <div>
          <label className="mb-1 block text-sm font-medium">用户名</label>
          <input value={form.username} onChange={set('username')} placeholder="3-50 位字母数字_-" className={inputCls} />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">邮箱</label>
          <input type="email" value={form.email} onChange={set('email')} placeholder="you@example.com" className={inputCls} />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">
            昵称 <span className="text-xs text-gray-400">（可选）</span>
          </label>
          <input value={form.display_name} onChange={set('display_name')} placeholder="展示给其他用户的名字" className={inputCls} />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">密码</label>
          <input type="password" value={form.password} onChange={set('password')} placeholder="至少 6 位" className={inputCls} />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">确认密码</label>
          <input type="password" value={form.confirm} onChange={set('confirm')} placeholder="再次输入密码" className={inputCls} />
        </div>
        <button type="submit" disabled={submitting} className={`${btnPrimary} w-full`}>
          {submitting ? '注册中…' : '注册'}
        </button>
        <p className="text-center text-sm text-gray-500 dark:text-gray-400">
          已有账号？{' '}
          <Link to={`/login?next=${encodeURIComponent(next)}`} className="text-blue-500 hover:underline">
            直接登录
          </Link>
        </p>
      </form>
    </div>
  );
}
