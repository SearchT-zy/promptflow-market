import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth';
import { ThemeToggle } from './ThemeToggle';

const navLinkCls = ({ isActive }: { isActive: boolean }) =>
  `rounded-md px-3 py-1.5 text-sm font-medium transition ${
    isActive
      ? 'bg-blue-500/10 text-blue-500'
      : 'text-gray-600 hover:text-blue-500 dark:text-gray-300 dark:hover:text-blue-400'
  }`;

export function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const isCreator = user && (user.role === 'creator' || user.role === 'admin');
  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const onSearch = (e: FormEvent) => {
    e.preventDefault();
    const term = q.trim();
    navigate(term ? `/search?q=${encodeURIComponent(term)}` : '/search');
  };

  return (
    <header className="sticky top-0 z-40 border-b border-gray-200 bg-white/90 backdrop-blur dark:border-gray-800 dark:bg-gray-950/90">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-3 px-4">
        <Link to="/" className="flex items-center gap-2 text-lg font-bold tracking-tight">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600 text-sm text-white">
            P
          </span>
          <span>
            Prompt<span className="text-blue-500">Flow</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          <NavLink to="/" end className={navLinkCls}>
            首页
          </NavLink>
          <NavLink to="/docs" className={navLinkCls}>
            文档
          </NavLink>
          <NavLink to="/pricing" className={navLinkCls}>
            定价
          </NavLink>
          {isCreator && (
            <>
              <NavLink to="/studio/new" className={navLinkCls}>
                创作
              </NavLink>
              <NavLink to="/dashboard/works" className={navLinkCls}>
                作品管理
              </NavLink>
              <NavLink to="/dashboard/analytics" className={navLinkCls}>
                数据看板
              </NavLink>
            </>
          )}
          {isAdmin && (
            <NavLink to="/admin" className={navLinkCls}>
              管理后台
            </NavLink>
          )}
        </nav>

        <form onSubmit={onSearch} className="ml-auto hidden flex-1 max-w-xs sm:block">
          <div className="relative">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="搜索 Prompt 模板…"
              className="w-full rounded-lg border border-gray-300 bg-gray-50 py-1.5 pl-9 pr-3 text-sm outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
            />
            <svg
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
                clipRule="evenodd"
              />
            </svg>
          </div>
        </form>

        <div className="ml-auto flex items-center gap-2 sm:ml-0">
          <ThemeToggle />

          {!user ? (
            <div className="flex items-center gap-2">
              <Link
                to="/login"
                className="rounded-lg px-3 py-1.5 text-sm font-medium text-gray-600 transition hover:text-blue-500 dark:text-gray-300"
              >
                登录
              </Link>
              <Link
                to="/register"
                className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-blue-500"
              >
                注册
              </Link>
            </div>
          ) : (
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMenuOpen((v) => !v)}
                className="flex items-center gap-2 rounded-lg border border-gray-200 px-2 py-1 transition hover:border-blue-500 dark:border-gray-800"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-500/20 text-xs font-semibold text-blue-500">
                  {(user.display_name || user.username || '?').slice(0, 1).toUpperCase()}
                </span>
                <span className="hidden max-w-[8rem] truncate text-sm sm:block">
                  {user.display_name || user.username}
                </span>
                <svg className="h-3.5 w-3.5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                  <path
                    fillRule="evenodd"
                    d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>

              {menuOpen && (
                <div className="absolute right-0 mt-2 w-44 overflow-hidden rounded-xl border border-gray-200 bg-white py-1 shadow-xl dark:border-gray-800 dark:bg-gray-900">
                  <Link
                    to="/me"
                    onClick={() => setMenuOpen(false)}
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800"
                  >
                    个人中心
                  </Link>
                  {isCreator && (
                    <Link
                      to="/dashboard/works"
                      onClick={() => setMenuOpen(false)}
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800"
                    >
                      作品管理
                    </Link>
                  )}
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      logout();
                    }}
                    className="block w-full px-4 py-2 text-left text-sm text-red-500 hover:bg-gray-100 dark:hover:bg-gray-800"
                  >
                    退出登录
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
