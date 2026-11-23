import { AlarmClock, Check, Clock3, Pencil, Trash2, TriangleAlert } from 'lucide-react';
import type { Task } from '../types';
import { cn } from '../utils/cn';
import { deadlineState, formatMinutes, relativeDeadline } from '../utils/date';
import { PRIORITY_LABEL, PRIORITY_STYLE, STATUS_LABEL, STATUS_STYLE } from '../utils/labels';
import { Badge, CategoryBadge } from './ui/Feedback';

interface TaskItemProps {
  task: Task;
  onToggle: (task: Task) => void;
  onEdit?: (task: Task) => void;
  onDelete?: (task: Task) => void;
  compact?: boolean;
}

/** Item de tarefa com alerta visual de prazo e marcação de conclusão. */
export function TaskItem({ task, onToggle, onEdit, onDelete, compact }: TaskItemProps) {
  const done = task.status === 'COMPLETED';
  const state = deadlineState(task.dueDate, done);

  return (
    <li
      className={cn(
        'group flex items-start gap-3 rounded-xl border bg-white p-3 transition',
        state === 'overdue' ? 'border-red-200 bg-red-50/40' : state === 'soon' ? 'border-amber-200 bg-amber-50/30' : 'border-ink-200/70',
        !compact && 'hover:shadow-card',
      )}
    >
      <button
        type="button"
        onClick={() => onToggle(task)}
        className={cn(
          'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition',
          done ? 'border-brand-600 bg-brand-600 text-white' : 'border-ink-300 hover:border-brand-500',
        )}
        aria-label={done ? `Reabrir tarefa ${task.title}` : `Concluir tarefa ${task.title}`}
        aria-pressed={done}
      >
        {done && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
      </button>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className={cn('text-sm font-semibold', done ? 'text-ink-400 line-through' : 'text-ink-900')}>{task.title}</p>
          <Badge className={PRIORITY_STYLE[task.priority]}>{PRIORITY_LABEL[task.priority]}</Badge>
          {!compact && <Badge className={STATUS_STYLE[task.status]}>{STATUS_LABEL[task.status]}</Badge>}
        </div>
        {!compact && task.description && <p className="mt-1 line-clamp-2 text-xs text-ink-500">{task.description}</p>}
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-500">
          <CategoryBadge name={task.category.name} color={task.category.color} />
          <span className="inline-flex items-center gap-1">
            <Clock3 className="h-3 w-3" aria-hidden /> {formatMinutes(task.estimatedMinutes)}
          </span>
          {task.dueDate && (
            <span
              className={cn(
                'inline-flex items-center gap-1 font-medium',
                state === 'overdue' && 'text-red-600',
                state === 'soon' && 'text-amber-700',
              )}
            >
              {state === 'overdue' ? <TriangleAlert className="h-3 w-3" aria-hidden /> : <AlarmClock className="h-3 w-3" aria-hidden />}
              {done ? 'Concluída' : relativeDeadline(task.dueDate)}
            </span>
          )}
        </div>
      </div>

      {(onEdit || onDelete) && (
        <div className="flex shrink-0 gap-0.5 opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100 sm:focus-within:opacity-100">
          {onEdit && (
            <button type="button" onClick={() => onEdit(task)} className="rounded-lg p-1.5 text-ink-400 hover:bg-ink-100 hover:text-ink-700" aria-label={`Editar ${task.title}`}>
              <Pencil className="h-4 w-4" />
            </button>
          )}
          {onDelete && (
            <button type="button" onClick={() => onDelete(task)} className="rounded-lg p-1.5 text-ink-400 hover:bg-red-50 hover:text-red-600" aria-label={`Excluir ${task.title}`}>
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      )}
    </li>
  );
}
