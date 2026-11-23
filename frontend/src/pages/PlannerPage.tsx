import { Check, Clock3, Hourglass, Info, ListChecks, RefreshCw, Sparkles, X } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Card, CardHeader } from '../components/ui/Card';
import { Badge, CategoryBadge, EmptyState, ErrorState, PageHeader, Spinner, StatCard } from '../components/ui/Feedback';
import { useToast } from '../contexts/ToastContext';
import { useApi } from '../hooks/useApi';
import { errorMessage } from '../services/api';
import { planningApi } from '../services/endpoints';
import type { FreeSlotsReport, Suggestion, SuggestionList } from '../types';
import { cn } from '../utils/cn';
import { dateFromKey, formatDayMonth, formatMinutes, formatTime, minutesBetween, toDateKey } from '../utils/date';
import { PRIORITY_LABEL, PRIORITY_STYLE } from '../utils/labels';

const dayFmt = new Intl.DateTimeFormat('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit', timeZone: 'UTC' });

function groupByDay(items: Suggestion[]) {
  const groups = new Map<string, Suggestion[]>();
  for (const item of items) {
    const key = toDateKey(item.startAt);
    groups.set(key, [...(groups.get(key) ?? []), item]);
  }
  return Array.from(groups.entries());
}

/** Barra visual com os horários livres do dia dentro da janela de disponibilidade. */
function DayAvailability({ day }: { day: FreeSlotsReport['byDay'][number] }) {
  const todayKey = toDateKey(new Date());
  return (
    <div className="flex items-center gap-3">
      <div className="w-24 shrink-0">
        <p className={cn('text-xs font-semibold capitalize', day.dateKey === todayKey ? 'text-brand-700' : 'text-ink-700')}>
          {day.dateKey === todayKey ? 'Hoje' : dayFmt.format(dateFromKey(day.dateKey)).replace('.', '')}
        </p>
        <p className="text-[11px] text-ink-400">{formatMinutes(day.totalMinutes)}</p>
      </div>
      <div className="flex min-w-0 flex-1 flex-wrap gap-1.5">
        {day.slots.length === 0 ? (
          <span className="text-xs text-ink-400">Sem intervalos livres</span>
        ) : (
          day.slots.map((slot) => (
            <span key={slot.start} className="rounded-lg bg-brand-50 px-2 py-1 text-[11px] font-semibold text-brand-700 ring-1 ring-inset ring-brand-600/10">
              {formatTime(slot.start)}–{formatTime(slot.end)}
            </span>
          ))
        )}
      </div>
    </div>
  );
}

export function PlannerPage() {
  const toast = useToast();
  const suggestions = useApi(() => planningApi.suggestions(), []);
  const slots = useApi(() => planningApi.freeSlots(), []);
  const [generating, setGenerating] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const generate = async () => {
    setGenerating(true);
    try {
      const result: SuggestionList = await planningApi.generate();
      suggestions.setData(result);
      void slots.reload();
      toast.success(
        result.pending.length > 0
          ? `${result.pending.length} sugestão(ões) gerada(s) a partir dos seus horários livres.`
          : 'Nenhuma tarefa coube nos horários livres do período.',
      );
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setGenerating(false);
    }
  };

  const respond = async (suggestion: Suggestion, action: 'accept' | 'reject') => {
    setBusyId(suggestion.id);
    try {
      if (action === 'accept') {
        await planningApi.accept(suggestion.id);
        toast.success(`"${suggestion.task.title}" foi adicionada à sua agenda.`);
      } else {
        await planningApi.reject(suggestion.id);
        toast.info('Sugestão recusada. Esse horário não será sugerido novamente para esta tarefa.');
      }
      await Promise.all([suggestions.reload(), slots.reload()]);
    } catch (error) {
      toast.error(errorMessage(error));
      void suggestions.reload();
    } finally {
      setBusyId(null);
    }
  };

  const pending = suggestions.data?.pending ?? [];
  const history = suggestions.data?.history ?? [];
  const plannedMinutes = pending.reduce((sum, s) => sum + minutesBetween(s.startAt, s.endAt), 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Planejamento inteligente"
        description="O EntreTurnos cruza seus compromissos, deslocamentos e disponibilidade para encaixar suas tarefas nos horários livres."
        actions={
          <Button icon={<RefreshCw className={cn('h-4 w-4', generating && 'animate-spin')} />} loading={false} disabled={generating} onClick={generate}>
            {generating ? 'Calculando…' : 'Gerar sugestões'}
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Tempo livre no período" value={formatMinutes(slots.data?.totalMinutes ?? 0)} icon={<Hourglass className="h-4 w-4" />} tone="green" hint={`Próximos ${slots.data?.days ?? '—'} dias`} />
        <StatCard label="Intervalos livres" value={slots.data?.count ?? 0} icon={<Clock3 className="h-4 w-4" />} tone="blue" hint="Já descontadas pausas e deslocamentos" />
        <StatCard label="Sugestões pendentes" value={pending.length} icon={<Sparkles className="h-4 w-4" />} tone="orange" hint={`${formatMinutes(plannedMinutes)} propostos`} />
        <StatCard label="Aceitas recentemente" value={history.filter((h) => h.status === 'ACCEPTED').length} icon={<ListChecks className="h-4 w-4" />} tone="purple" hint="Viraram blocos na agenda" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <Card>
          <CardHeader title="Sugestões de horários" subtitle="Aceite para reservar o horário na agenda ou recuse para descartá-lo" icon={<Sparkles className="h-4 w-4" />} />
          <div className="p-4 sm:p-5">
            {suggestions.loading && !suggestions.data && <Spinner />}
            {suggestions.error && <ErrorState message={suggestions.error} onRetry={suggestions.reload} />}
            {suggestions.data && pending.length === 0 && (
              <EmptyState
                icon={<Sparkles className="h-5 w-5" />}
                title="Nenhuma sugestão pendente"
                description="Gere sugestões para que o sistema encaixe suas tarefas pendentes nos horários livres."
                action={<Button size="sm" onClick={generate} loading={generating}>Gerar sugestões</Button>}
              />
            )}
            <div className="space-y-6">
              {groupByDay(pending).map(([dateKey, items]) => (
                <section key={dateKey}>
                  <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-ink-500">
                    {dateKey === toDateKey(new Date()) ? 'Hoje' : formatDayMonth(items[0].startAt)}
                  </h3>
                  <ul className="space-y-3">
                    {items.map((s) => (
                      <li key={s.id} className="rounded-2xl border border-ink-200/70 bg-white p-4 transition hover:shadow-card">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                          <div className="flex w-full items-center gap-3 sm:w-28 sm:flex-col sm:items-start sm:gap-0">
                            <p className="text-lg font-extrabold tabular-nums text-ink-900">{formatTime(s.startAt)}</p>
                            <p className="text-xs tabular-nums text-ink-500">até {formatTime(s.endAt)}</p>
                            <p className="text-xs font-semibold text-brand-700 sm:mt-1">{formatMinutes(minutesBetween(s.startAt, s.endAt))}</p>
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="font-semibold text-ink-900">{s.task.title}</p>
                              <Badge className={PRIORITY_STYLE[s.task.priority]}>{PRIORITY_LABEL[s.task.priority]}</Badge>
                              <CategoryBadge name={s.task.category.name} color={s.task.category.color} />
                            </div>
                            <p className="mt-1.5 flex gap-1.5 text-xs text-ink-500">
                              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ink-400" aria-hidden />
                              {s.reason}
                            </p>
                          </div>
                          <div className="flex gap-2 sm:flex-col">
                            <Button size="sm" icon={<Check className="h-3.5 w-3.5" />} loading={busyId === s.id} onClick={() => respond(s, 'accept')}>
                              Aceitar
                            </Button>
                            <Button size="sm" variant="secondary" icon={<X className="h-3.5 w-3.5" />} disabled={busyId === s.id} onClick={() => respond(s, 'reject')}>
                              Recusar
                            </Button>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          </div>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Horários livres" subtitle="Dentro da sua disponibilidade configurada" icon={<Hourglass className="h-4 w-4" />} />
            <div className="space-y-3 p-5">
              {slots.loading && !slots.data && <Spinner />}
              {slots.error && <ErrorState message={slots.error} onRetry={slots.reload} />}
              {slots.data?.byDay.map((day) => (
                <DayAvailability key={day.dateKey} day={day} />
              ))}
              <p className="pt-2 text-xs text-ink-400">
                Ajuste horários de disponibilidade, pausas e tamanho dos blocos em{' '}
                <Link to="/configuracoes" className="font-semibold text-brand-700 hover:underline">
                  Configurações
                </Link>
                .
              </p>
            </div>
          </Card>

          <Card className="p-5">
            <p className="text-sm font-bold text-ink-900">Como as sugestões são calculadas</p>
            <ol className="mt-3 space-y-2 text-xs text-ink-500">
              {[
                'Reúne compromissos únicos, ocorrências dos compromissos fixos e deslocamentos.',
                'Identifica os intervalos livres dentro da sua janela de disponibilidade, reservando pausas de descanso.',
                'Ordena as tarefas pendentes por prioridade e urgência do prazo.',
                'Encaixa cada tarefa conforme o tempo estimado, sem sobrepor nada e respeitando o tamanho máximo de bloco.',
                'Nada entra na agenda sem a sua aprovação.',
              ].map((step, i) => (
                <li key={step} className="flex gap-2">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-50 text-[10px] font-bold text-brand-700">{i + 1}</span>
                  {step}
                </li>
              ))}
            </ol>
          </Card>

          {history.length > 0 && (
            <Card>
              <CardHeader title="Histórico recente" icon={<ListChecks className="h-4 w-4" />} />
              <ul className="divide-y divide-ink-100 px-5 pb-3 pt-2">
                {history.map((h) => (
                  <li key={h.id} className="flex items-center justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-ink-900">{h.task.title}</p>
                      <p className="text-xs text-ink-500">
                        {formatDayMonth(h.startAt)}, {formatTime(h.startAt)}–{formatTime(h.endAt)}
                      </p>
                    </div>
                    <Badge className={h.status === 'ACCEPTED' ? 'bg-brand-50 text-brand-700 ring-brand-600/15' : 'bg-ink-100 text-ink-500 ring-ink-500/15'}>
                      {h.status === 'ACCEPTED' ? 'Aceita' : 'Recusada'}
                    </Badge>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
