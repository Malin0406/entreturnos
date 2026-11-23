import {
  BarChart3,
  CalendarClock,
  CalendarDays,
  CheckSquare,
  LayoutDashboard,
  LogOut,
  Settings,
  Sparkles,
  Timer,
  UserRound,
  X,
} from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { cn } from '../../utils/cn';
import { Logo } from './Logo';

const MAIN_NAV = [
  { to: '/', label: 'Visão geral', icon: LayoutDashboard, end: true },
  { to: '/agenda', label: 'Minha agenda', icon: CalendarDays },
  { to: '/compromissos', label: 'Compromissos', icon: CalendarClock },
  { to: '/tarefas', label: 'Minhas tarefas', icon: CheckSquare },
  { to: '/planejamento', label: 'Planejamento inteligente', icon: Sparkles },
  { to: '/pomodoro', label: 'Pomodoro', icon: Timer },
  { to: '/relatorios', label: 'Relatórios', icon: BarChart3 },
];

const ACCOUNT_NAV = [
  { to: '/perfil', label: 'Meu perfil', icon: UserRound },
  { to: '/configuracoes', label: 'Configurações', icon: Settings },
];

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

function NavItem({ to, label, icon: Icon, end, onClick }: (typeof MAIN_NAV)[number] & { onClick: () => void }) {
  return (
    <NavLink
      to={to}
      end={end}
      onClick={onClick}
      className={({ isActive }) =>
        cn(
          'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors',
          isActive ? 'bg-brand-50 text-brand-700' : 'text-ink-500 hover:bg-ink-50 hover:text-ink-900',
        )
      }
    >
      {({ isActive }) => (
        <>
          <Icon className={cn('h-[18px] w-[18px]', isActive ? 'text-brand-600' : 'text-ink-400 group-hover:text-ink-700')} aria-hidden />
          {label}
        </>
      )}
    </NavLink>
  );
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const { logout } = useAuth();

  return (
    <>
      {open && <div className="fixed inset-0 z-40 bg-ink-900/40 lg:hidden" onClick={onClose} aria-hidden />}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-ink-200/70 bg-white transition-transform lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
        aria-label="Menu principal"
      >
        <div className="flex h-[72px] items-center justify-between px-6">
          <Logo />
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-ink-400 hover:bg-ink-100 lg:hidden"
            aria-label="Fechar menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-6 overflow-y-auto px-4 py-4">
          <div className="space-y-1">
            <p className="px-3 pb-1 text-[11px] font-bold uppercase tracking-wider text-ink-400">Menu</p>
            {MAIN_NAV.map((item) => (
              <NavItem key={item.to} {...item} onClick={onClose} />
            ))}
          </div>
          <div className="space-y-1">
            <p className="px-3 pb-1 text-[11px] font-bold uppercase tracking-wider text-ink-400">Conta</p>
            {ACCOUNT_NAV.map((item) => (
              <NavItem key={item.to} {...item} end={false} onClick={onClose} />
            ))}
          </div>
        </nav>

        <div className="p-4">
          <div className="mb-3 rounded-2xl bg-gradient-to-br from-brand-600 to-brand-800 p-4 text-white">
            <Sparkles className="h-5 w-5 text-brand-200" aria-hidden />
            <p className="mt-2 text-sm font-bold">Encontre seu tempo livre</p>
            <p className="mt-1 text-xs text-brand-100">Gere sugestões que respeitam seus compromissos e deslocamentos.</p>
            <NavLink
              to="/planejamento"
              onClick={onClose}
              className="mt-3 inline-flex rounded-lg bg-white/15 px-3 py-1.5 text-xs font-semibold hover:bg-white/25"
            >
              Planejar agora
            </NavLink>
          </div>
          <button
            type="button"
            onClick={logout}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-ink-500 transition hover:bg-red-50 hover:text-red-600"
          >
            <LogOut className="h-[18px] w-[18px]" aria-hidden />
            Sair
          </button>
        </div>
      </aside>
    </>
  );
}
