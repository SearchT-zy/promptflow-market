// 主题切换：Tailwind darkMode:'class'，暗色为默认
export type Theme = 'dark' | 'light';

const KEY = 'pf_theme';

export function getInitialTheme(): Theme {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved === 'light' || saved === 'dark') return saved;
  } catch {
    /* ignore */
  }
  return 'dark';
}

export function applyTheme(t: Theme) {
  const root = document.documentElement;
  if (t === 'dark') root.classList.add('dark');
  else root.classList.remove('dark');
  try {
    localStorage.setItem(KEY, t);
  } catch {
    /* ignore */
  }
}
