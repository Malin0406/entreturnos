import { CalendarCheck2, Route, Sparkles } from 'lucide-react';
import { Navigate, Outlet } from 'react-router-dom';
import { Logo } from '../components/layout/Logo';
import { useAuth } from '../contexts/AuthContext';
import { FullScreenLoader } from './AppLayout';

const HIGHLIGHTS = [
  { icon: CalendarCheck2, title: 'Rotina em um só lugar', text: 'Faculdade, estágio, trabalho e vida pessoal juntos.' },
  { icon: Route, title: 'Deslocamentos considerados', text: 'O tempo no trânsito também ocupa a sua agenda.' },
  { icon: Sparkles, title: 'Planejamento inteligente', text: 'Sugestões de horários livres para suas tarefas.' },
];

/** Layout das páginas públicas (login, cadastro, recuperação de acesso). */
export function AuthLayout() {
  const { user, loading } = useAuth();
  if (loading) return <FullScreenLoader />;
  if (user) return <Navigate to="/" replace />;

  return (
    <div className="grid min-h-screen bg-white lg:grid-cols-[1fr_1.05fr]">
      <div className="flex flex-col px-6 py-8 sm:px-12">
        <Logo />
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-10">
          <Outlet />
        </div>
        <p className="text-center text-xs text-ink-400">© {new Date().getFullYear()} EntreTurnos</p>
      </div>

      <div className="relative hidden overflow-hidden bg-gradient-to-br from-brand-700 via-brand-600 to-sky-600 lg:block">
        <div className="absolute -right-24 -top-24 h-96 w-96 rounded-full bg-white/10" aria-hidden />
        <div className="absolute -bottom-32 -left-16 h-[28rem] w-[28rem] rounded-full bg-white/5" aria-hidden />
        <div className="relative flex h-full flex-col justify-center px-14 py-16 text-white">
          <p className="text-sm font-semibold uppercase tracking-widest text-brand-100">EntreTurnos</p>
          <h2 className="mt-3 max-w-lg text-4xl font-extrabold leading-tight">
            Sua rotina organizada. Seu tempo melhor aproveitado.
          </h2>
          <ul className="mt-10 space-y-5">
            {HIGHLIGHTS.map(({ icon: Icon, title, text }) => (
              <li key={title} className="flex gap-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/15">
                  <Icon className="h-5 w-5" aria-hidden />
                </span>
                <span>
                  <span className="block font-bold">{title}</span>
                  <span className="block text-sm text-brand-50/90">{text}</span>
                </span>
              </li>
            ))}
          </ul>

          <div className="mt-12 max-w-md rounded-2xl bg-white/95 p-5 text-ink-900 shadow-pop">
            <p className="text-xs font-semibold text-ink-500">Hoje · horário livre identificado</p>
            <div className="mt-3 space-y-2 text-sm">
              <div className="flex items-center gap-3 rounded-xl bg-sky-50 px-3 py-2">
                <span className="font-semibold tabular-nums text-sky-700">08:00</span> Estágio
              </div>
              <div className="flex items-center gap-3 rounded-xl bg-ink-100 px-3 py-2">
                <span className="font-semibold tabular-nums text-ink-500">17:00</span> Deslocamento
              </div>
              <div className="flex items-center gap-3 rounded-xl border-2 border-dashed border-brand-400 bg-brand-50 px-3 py-2">
                <span className="font-semibold tabular-nums text-brand-700">18:00</span> Livre: revisar slides (30 min)
              </div>
              <div className="flex items-center gap-3 rounded-xl bg-indigo-50 px-3 py-2">
                <span className="font-semibold tabular-nums text-indigo-700">19:00</span> Faculdade
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
