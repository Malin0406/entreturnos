import { cn } from '../../utils/cn';

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={cn('h-9 w-9', className)} aria-hidden>
      <rect width="64" height="64" rx="16" fill="#12B76A" />
      <circle cx="32" cy="32" r="17" fill="none" stroke="#fff" strokeWidth="5" />
      <path d="M32 21v11l8 5" fill="none" stroke="#fff" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Logo({ className, subtitle = true }: { className?: string; subtitle?: boolean }) {
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <LogoMark />
      <div className="leading-tight">
        <p className="text-lg font-extrabold tracking-tight text-ink-900">
          Entre<span className="text-brand-600">Turnos</span>
        </p>
        {subtitle && <p className="text-[11px] font-medium text-ink-500">Organizador de rotina</p>}
      </div>
    </div>
  );
}
