import { AlertTriangle } from 'lucide-react';
import { ApiError } from '../../services/api';
import type { ConflictItem } from '../../types';
import { formatDayMonth, formatTime } from '../../utils/date';

/** Extrai a lista de conflitos de uma resposta 409 da API. */
export function extractConflicts(error: unknown): ConflictItem[] | null {
  if (error instanceof ApiError && error.status === 409) {
    const details = error.details as { conflicts?: ConflictItem[] } | undefined;
    return details?.conflicts ?? [];
  }
  return null;
}

export function ConflictAlert({ conflicts }: { conflicts: ConflictItem[] }) {
  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-3.5" role="alert">
      <div className="flex items-center gap-2 text-sm font-semibold text-amber-800">
        <AlertTriangle className="h-4 w-4" aria-hidden />
        Conflito de horário
      </div>
      <p className="mt-1 text-xs text-amber-800">Este horário se sobrepõe a:</p>
      <ul className="mt-2 space-y-1">
        {conflicts.map((c) => (
          <li key={`${c.title}-${c.start}`} className="text-xs text-amber-900">
            <strong>{c.title}</strong> — {formatDayMonth(c.start)}, {formatTime(c.start)} às {formatTime(c.end)}
          </li>
        ))}
      </ul>
      <p className="mt-2 text-xs text-amber-800">Ajuste o horário ou salve mesmo assim.</p>
    </div>
  );
}
