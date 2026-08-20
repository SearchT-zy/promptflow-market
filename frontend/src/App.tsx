import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import { AuthProvider, useAuth } from './auth';
import { Navbar } from './components/Navbar';
import { PageLoading } from './components/Spinner';

import HomePage from './pages/HomePage';
import SearchPage from './pages/SearchPage';
import DetailPage from './pages/DetailPage';
import UsePage from './pages/UsePage';
import SharePage from './pages/SharePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import StudioPage from './pages/StudioPage';
import VersionsPage from './pages/VersionsPage';
import WorksPage from './pages/WorksPage';
import AnalyticsPage from './pages/AnalyticsPage';
import MePage from './pages/MePage';
import AdminPage from './pages/AdminPage';
import { DocsPage, DocsApiPage } from './pages/DocsPage';
import PricingPage from './pages/PricingPage';
import { TermsPage, PrivacyPage } from './pages/StaticPages';
import NotFoundPage from './pages/NotFoundPage';

function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <PageLoading label="正在验证登录状态…" />;
  if (!user) {
    const next = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?next=${next}`} replace />;
  }
  return <>{children}</>;
}

function RequireAdmin({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  if (user?.role !== 'admin') {
    return (
      <div className="mx-auto max-w-3xl px-4 py-24 text-center">
        <p className="text-5xl">🔒</p>
        <h1 className="mt-4 text-xl font-semibold">无权访问</h1>
        <p className="mt-2 text-gray-500 dark:text-gray-400">该页面仅管理员可访问。</p>
      </div>
    );
  }
  return <>{children}</>;
}

function Shell() {
  return (
    <div className="flex min-h-screen flex-col bg-gray-50 text-gray-900 dark:bg-gray-950 dark:text-gray-100">
      <Navbar />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/t/:slug" element={<DetailPage />} />
          <Route
            path="/t/:slug/use"
            element={
              <RequireAuth>
                <UsePage />
              </RequireAuth>
            }
          />
          <Route path="/share/:token" element={<SharePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          <Route
            path="/studio/new"
            element={
              <RequireAuth>
                <StudioPage />
              </RequireAuth>
            }
          />
          <Route
            path="/studio/:id/edit"
            element={
              <RequireAuth>
                <StudioPage />
              </RequireAuth>
            }
          />
          <Route
            path="/studio/:id/versions"
            element={
              <RequireAuth>
                <VersionsPage />
              </RequireAuth>
            }
          />

          <Route
            path="/dashboard/works"
            element={
              <RequireAuth>
                <WorksPage />
              </RequireAuth>
            }
          />
          <Route
            path="/dashboard/analytics"
            element={
              <RequireAuth>
                <AnalyticsPage />
              </RequireAuth>
            }
          />

          <Route
            path="/me"
            element={
              <RequireAuth>
                <MePage />
              </RequireAuth>
            }
          />

          <Route
            path="/admin"
            element={
              <RequireAuth>
                <RequireAdmin>
                  <AdminPage />
                </RequireAdmin>
              </RequireAuth>
            }
          />

          <Route path="/docs" element={<DocsPage />} />
          <Route path="/docs/api" element={<DocsApiPage />} />
          <Route path="/pricing" element={<PricingPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />

          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>
      <footer className="border-t border-gray-200 py-6 text-center text-xs text-gray-400 dark:border-gray-800">
        PromptFlow · AI 工作流 Prompt 模板市场 —— MVP 阶段全部模板免费
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Shell />
      </AuthProvider>
    </BrowserRouter>
  );
}
