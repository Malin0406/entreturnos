import { useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { Sidebar } from '../components/layout/Sidebar';
import { LogoMark } from '../components/layout/Logo';
import { useAuth } from '../contexts/AuthContext';

export function FullScreenLoader() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-surface">
      <LogoMark className="h-12 w-12 animate-pulse" />
      <p className="text-sm text-ink-500">Carregando sua rotina…</p>
    </div>
  );
}

/** Layout das páginas privadas: exige usuário autenticado. */
export function AppLayout() {
  const { user, loading } = useAuth();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  if (loading) return <FullScreenLoader />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;

  return (
    <div className="min-h-screen bg-surface">
      <a href="#conteudo" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60] focus:rounded-lg focus:bg-white focus:px-3 focus:py-2">
        Pular para o conteúdo
      </a>
      <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} />
      <div className="lg:pl-72">
        <Header onMenu={() => setMenuOpen(true)} />
        <main id="conteudo" className="mx-auto max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
