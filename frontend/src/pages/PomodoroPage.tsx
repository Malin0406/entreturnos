import { Brain, Coffee, Flame, Pause, Play, RotateCcw, SkipForward, Timer } from 'lucide-react';
import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Card, CardHeader } from '../components/ui/Card';
import { EmptyState, PageHeader, ProgressRing, StatCard } from '../components/ui/Feedback';
import { Select } from '../components/ui/Field';
import { formatClock, usePomodoro } from '../contexts/PomodoroContext';
import { useApi } from '../hooks/useApi';
import { pomodoroApi, taskApi } from '../services/endpoints';
import type { PomodoroType } from '../types';
import { cn } from '../utils/cn';
import { formatDayMonth, formatMinutes, formatTime } from '../utils/date';
import { POMODORO_LABEL } from '../utils/labels';

const MODE_STYLE: Record<PomodoroType, { color: string; track: string; icon: typeof Brain; text: string }> = {
  FOCUS: { color: '#F97316', track: '#FFEDD5', icon: Brain, text: 'text-orange-600' },
  SHORT_BREAK: { color: '#12B76A', track: '#D1FADF', icon: Coffee, text: 'text-brand-600' },
  LONG_BREAK: { color: '#0EA5E9', track: '#E0F2FE', icon: Coffee, text: 'text-sky-600' },
};

export function PomodoroPage() {
  const pomodoro = usePomodoro();
  const tasks = useApi(() => taskApi.list({ sort: 'dueDate', order: 'asc' }), []);
  const today = useApi(() => pomodoroApi.today(), []);
  const history = useApi(() => pomodoroApi.list(12), []);

  // Recarrega estatísticas sempre que uma sessão é registrada.
  useEffect(() => {
    if (pomodoro.savedCount > 0) {
      void today.reload();
      void history.reload();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pomodoro.savedCount]);

  const style = MODE_STYLE[pomodoro.mode];
  const ModeIcon = style.icon;
  const openTasks = (tasks.data ?? []).filter((t) => t.status !== 'COMPLETED');
  const cyclePosition = pomodoro.completedFocus % pomodoro.cyclesBeforeLong;

  return (
    <div className="space-y-6">
      <PageHeader title="Pomodoro" description="Concentre-se em blocos de foco com pausas programadas. O temporizador continua ativo enquanto você navega." />

      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <Card className="flex flex-col items-center px-5 py-8">
          <div className="inline-flex rounded-xl bg-ink-100 p-1" role="tablist" aria-label="Modo do temporizador">
            {(['FOCUS', 'SHORT_BREAK', 'LONG_BREAK'] as PomodoroType[]).map((mode) => (
              <button
                key={mode}
                type="button"
                role="tab"
                aria-selected={pomodoro.mode === mode}
                onClick={() => pomodoro.switchMode(mode)}
                className={cn(
                  'rounded-lg px-3 py-1.5 text-xs font-semibold transition sm:px-4 sm:text-sm',
                  pomodoro.mode === mode ? 'bg-white text-ink-900 shadow-sm' : 'text-ink-500 hover:text-ink-900',
                )}
              >
                {POMODORO_LABEL[mode]}
              </button>
            ))}
          </div>

          <div className="my-8">
            <ProgressRing value={pomodoro.progress} size={260} stroke={16} color={style.color} track={style.track}>
              <ModeIcon className={cn('h-6 w-6', style.text)} aria-hidden />
              <span className="mt-1 text-6xl font-extrabold tabular-nums tracking-tight text-ink-900" aria-live="off">
                {formatClock(pomodoro.remainingMs)}
              </span>
              <span className={cn('mt-1 text-sm font-semibold', style.text)}>
                {pomodoro.status === 'paused' ? 'Pausado' : POMODORO_LABEL[pomodoro.mode]}
              </span>
            </ProgressRing>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button variant="secondary" size="lg" icon={<RotateCcw className="h-4 w-4" />} onClick={pomodoro.reset} disabled={pomodoro.status === 'idle' && pomodoro.progress === 0}>
              Reiniciar
            </Button>
            {pomodoro.status === 'idle' && (
              <Button size="lg" className="min-w-[9rem]" icon={<Play className="h-4 w-4" />} onClick={pomodoro.start}>
                Iniciar
              </Button>
            )}
            {pomodoro.status === 'running' && (
              <Button size="lg" className="min-w-[9rem]" icon={<Pause className="h-4 w-4" />} onClick={pomodoro.pause}>
                Pausar
              </Button>
            )}
            {pomodoro.status === 'paused' && (
              <Button size="lg" className="min-w-[9rem]" icon={<Play className="h-4 w-4" />} onClick={pomodoro.resume}>
                Retomar
              </Button>
            )}
            <Button variant="secondary" size="lg" icon={<SkipForward className="h-4 w-4" />} onClick={pomodoro.skip}>
              {pomodoro.mode === 'FOCUS' ? 'Ir para pausa' : 'Ir para foco'}
            </Button>
          </div>

          <div className="mt-8 flex items-center gap-2" aria-label={`Ciclo ${cyclePosition} de ${pomodoro.cyclesBeforeLong}`}>
            {Array.from({ length: pomodoro.cyclesBeforeLong }, (_, i) => (
              <span key={i} className={cn('h-2.5 w-8 rounded-full', i < cyclePosition ? 'bg-orange-500' : 'bg-ink-200')} />
            ))}
          </div>
          <p className="mt-2 text-xs text-ink-500">
            Pausa longa a cada {pomodoro.cyclesBeforeLong} ciclos de foco · {pomodoro.durations.FOCUS}/{pomodoro.durations.SHORT_BREAK}/
            {pomodoro.durations.LONG_BREAK} min (
            <Link to="/configuracoes" className="font-semibold text-brand-700 hover:underline">
              alterar
            </Link>
            )
          </p>

          <div className="mt-6 w-full max-w-sm">
            <Select
              label="Associar a uma tarefa"
              value={pomodoro.taskId ?? ''}
              onChange={(e) => pomodoro.setTaskId(e.target.value || null)}
              hint="A sessão de foco concluída será registrada nesta tarefa."
            >
              <option value="">Sem tarefa associada</option>
              {openTasks.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title}
                </option>
              ))}
            </Select>
          </div>
        </Card>

        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <StatCard label="Sessões de foco hoje" value={today.data?.focusSessions ?? 0} icon={<Flame className="h-4 w-4" />} tone="orange" />
            <StatCard label="Minutos focados hoje" value={formatMinutes(today.data?.focusMinutes ?? 0)} icon={<Timer className="h-4 w-4" />} tone="green" />
          </div>

          <Card>
            <CardHeader title="Sessões recentes" icon={<Timer className="h-4 w-4" />} />
            <div className="p-4">
              {history.data && history.data.length === 0 && (
                <EmptyState icon={<Timer className="h-5 w-5" />} title="Nenhuma sessão registrada" description="Conclua um ciclo de foco para começar seu histórico." />
              )}
              <ul className="divide-y divide-ink-100">
                {history.data?.map((session) => {
                  const s = MODE_STYLE[session.type];
                  const Icon = s.icon;
                  return (
                    <li key={session.id} className="flex items-center gap-3 py-2.5">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: s.track }}>
                        <Icon className={cn('h-4 w-4', s.text)} aria-hidden />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-ink-900">
                          {POMODORO_LABEL[session.type]} · {session.durationMinutes} min
                        </p>
                        <p className="truncate text-xs text-ink-500">{session.task?.title ?? 'Sem tarefa associada'}</p>
                      </div>
                      <p className="shrink-0 text-right text-xs text-ink-400">
                        {formatDayMonth(session.startedAt)}
                        <br />
                        {formatTime(session.startedAt)}
                      </p>
                    </li>
                  );
                })}
              </ul>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
