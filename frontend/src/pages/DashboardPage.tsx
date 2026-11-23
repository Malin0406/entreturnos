import {
  ArrowRight,
  BookOpen,
  CalendarClock,
  CalendarPlus,
  CheckCircle2,
  Hourglass,
  ListTodo,
  Plus,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Bar, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { EventRow } from '../components/dashboard/EventRow';
import { MiniCalendar } from '../components/dashboard/MiniCalendar';
import { AppointmentFormModal } from '../components/forms/AppointmentFormModal';
import { TaskFormModal } from '../components/forms/TaskFormModal';
import { TaskItem } from '../components/TaskItem';
import { Button } from '../components/ui/Button';
import { Card, CardHeader } from '../components/ui/Card';
import { EmptyState, ErrorState, ProgressRing, Spinner, StatCard } from '../components/ui/Feedback';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { useApi } from '../hooks/useApi';
import { errorMessage } from '../services/api';
import { dashboardApi, taskApi } from '../services/endpoints';
import type { Task } from '../types';
import { firstName } from '../utils/cn';
import { dateFromKey, formatDayMonth, formatHours, formatMinutes, formatTime, greeting, toDateKey } from '../utils/date';

const weekdayFmt = new Intl.DateTimeFormat('pt-BR', { weekday: 'short', timeZone: 'UTC' });

export function DashboardPage() {
  const { user } = useAuth();
  const toast = useToast();
  const { data, loading, error, reload } = useApi(() => dashboardApi.overview(), []);
  const [taskModal, setTaskModal] = useState(false);
  const [appointmentModal, setAppointmentModal] = useState(false);

  const toggleTask = async (task: Task) => {
    try {
      await taskApi.setStatus(task.id, task.status === 'COMPLETED' ? 'PENDING' : 'COMPLETED');
      toast.success(task.status === 'COMPLETED' ? 'Tarefa reaberta.' : 'Tarefa concluída! 🎉');
      void reload();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  if (loading && !data) return <Spinner label="Montando sua visão geral…" />;
  if (error || !data) return <ErrorState message={error ?? 'Não foi possível carregar.'} onRetry={reload} />;

  const todayKey = toDateKey(new Date());
  const chartData = data.weeklyChart.map((d) => ({
    ...d,
    day: weekdayFmt.format(dateFromKey(d.dateKey)).replace('.', ''),
    isToday: d.dateKey === todayKey,
  }));
  const nextEvent = data.upcomingEvents[0];
  const totalOpen = data.counts.pending + data.counts.inProgress;
  const doneRatio = data.counts.completedThisWeek + totalOpen === 0 ? 0 : data.counts.completedThisWeek / (data.counts.completedThisWeek + totalOpen);

  return (
    <div className="space-y-6">
      {/* Saudação + atalhos */}
      <div className="flex flex-col gap-4 rounded-2xl bg-gradient-to-r from-brand-600 via-brand-600 to-sky-600 p-6 text-white shadow-card sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">
            {greeting()}, {user ? firstName(user.name) : ''}! Vamos organizar seu dia?
          </h1>
          <p className="mt-1 text-sm text-brand-50/90">
            {data.counts.overdue > 0
              ? `Você tem ${data.counts.overdue} tarefa${data.counts.overdue > 1 ? 's' : ''} atrasada${data.counts.overdue > 1 ? 's' : ''} e ${formatMinutes(data.freeTime.today.totalMinutes)} livres hoje.`
              : `Hoje você ainda tem ${formatMinutes(data.freeTime.today.totalMinutes)} livres para encaixar suas tarefas.`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" className="border-white/0 bg-white text-brand-700 hover:bg-brand-50" icon={<Plus className="h-4 w-4" />} onClick={() => setTaskModal(true)}>
            Nova tarefa
          </Button>
          <Button className="bg-white/15 shadow-none hover:bg-white/25" icon={<CalendarPlus className="h-4 w-4" />} onClick={() => setAppointmentModal(true)}>
            Novo compromisso
          </Button>
        </div>
      </div>

      {/* Indicadores */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Tarefas pendentes" value={totalOpen} icon={<ListTodo className="h-4 w-4" />} tone="orange" hint={`${data.counts.inProgress} em andamento · ${data.counts.overdue} atrasada(s)`} />
        <StatCard label="Tarefas concluídas" value={data.counts.completed} icon={<CheckCircle2 className="h-4 w-4" />} tone="green" hint={`+${data.counts.completedThisWeek} nesta semana`} />
        <StatCard
          label="Próximos compromissos"
          value={data.upcomingEvents.length}
          icon={<CalendarClock className="h-4 w-4" />}
          tone="blue"
          hint={nextEvent ? `${nextEvent.title.slice(0, 18)}${nextEvent.title.length > 18 ? '…' : ''} · ${formatTime(nextEvent.start)}` : 'Nos próximos 7 dias'}
        />
        <StatCard label="Estudos planejados" value={formatHours(data.studyMinutesWeek)} icon={<BookOpen className="h-4 w-4" />} tone="purple" hint="Faculdade + estudos na semana" />
        <StatCard label="Horários livres hoje" value={data.freeTime.today.count} icon={<Hourglass className="h-4 w-4" />} tone="gray" hint={`${formatMinutes(data.freeTime.today.totalMinutes)} disponíveis`} />
        <StatCard label="Progresso semanal" value={`${data.weeklyProgress}%`} icon={<TrendingUp className="h-4 w-4" />} tone="green" hint="Concluídas vs. previstas" />
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        {/* Agenda de hoje */}
        <Card className="xl:col-span-2">
          <CardHeader
            title="Resumo do dia"
            subtitle={`${data.todayEvents.filter((e) => e.kind !== 'COMMUTE').length} compromisso(s) · ${data.todayEvents.filter((e) => e.kind === 'COMMUTE').length} deslocamento(s)`}
            icon={<CalendarClock className="h-4 w-4" />}
            action={
              <Link to="/agenda" className="inline-flex items-center gap-1 text-xs font-semibold text-brand-700 hover:underline">
                Ver agenda <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            }
          />
          <div className="p-3 sm:p-4">
            {data.todayEvents.length === 0 ? (
              <EmptyState icon={<CalendarClock className="h-5 w-5" />} title="Nada agendado para hoje" description="Aproveite o dia livre ou planeje suas tarefas." />
            ) : (
              <ul className="space-y-1">
                {data.todayEvents.map((event) => (
                  <EventRow key={event.id} event={event} />
                ))}
              </ul>
            )}
            {data.freeTime.todaySlots.length > 0 && (
              <div className="mt-3 rounded-xl border border-dashed border-brand-300 bg-brand-50/50 p-3">
                <p className="text-xs font-semibold text-brand-800">Intervalos livres hoje</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {data.freeTime.todaySlots.map((slot) => (
                    <span key={slot.start} className="rounded-lg bg-white px-2.5 py-1 text-xs font-semibold text-brand-700 shadow-sm">
                      {formatTime(slot.start)}–{formatTime(slot.end)} · {formatMinutes(slot.minutes)}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Calendário compacto */}
        <Card className="p-5">
          <MiniCalendar />
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        {/* Produtividade semanal */}
        <Card className="xl:col-span-2">
          <CardHeader title="Produtividade semanal" subtitle="Tarefas concluídas e minutos de foco (Pomodoro) por dia" icon={<TrendingUp className="h-4 w-4" />} />
          <div className="h-72 px-2 pb-4 pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 10, right: 12, left: -12, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#EAECF0" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 12, fill: '#667085' }} axisLine={false} tickLine={false} />
                <YAxis yAxisId="tasks" allowDecimals={false} tick={{ fontSize: 12, fill: '#98A2B3' }} axisLine={false} tickLine={false} />
                <YAxis yAxisId="focus" orientation="right" tick={{ fontSize: 12, fill: '#98A2B3' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ borderRadius: 12, border: '1px solid #EAECF0', fontSize: 12 }}
                  formatter={(value: number, name: string) => (name === 'Foco (min)' ? [`${value} min`, name] : [value, name])}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar yAxisId="tasks" dataKey="completed" name="Tarefas concluídas" fill="#12B76A" radius={[6, 6, 0, 0]} maxBarSize={36} />
                <Line yAxisId="focus" type="monotone" dataKey="focusMinutes" name="Foco (min)" stroke="#F97316" strokeWidth={2.5} dot={{ r: 3 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Indicador de tarefas concluídas + tempo disponível */}
        <Card className="flex flex-col p-5">
          <p className="text-base font-bold text-ink-900">Tarefas concluídas</p>
          <p className="text-xs text-ink-500">Nesta semana, em relação às abertas</p>
          <div className="my-5 flex justify-center">
            <ProgressRing value={doneRatio} size={150} stroke={14}>
              <span className="text-3xl font-extrabold text-ink-900">{data.counts.completedThisWeek}</span>
              <span className="text-xs text-ink-500">de {data.counts.completedThisWeek + totalOpen}</span>
            </ProgressRing>
          </div>
          <div className="mt-auto space-y-3 rounded-xl bg-ink-50 p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-ink-500">Tempo disponível</p>
            <div className="flex justify-between text-sm">
              <span className="text-ink-500">Hoje</span>
              <span className="font-bold text-ink-900">{formatMinutes(data.freeTime.today.totalMinutes)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-ink-500">Até o fim da semana</span>
              <span className="font-bold text-ink-900">{formatMinutes(data.freeTime.week.totalMinutes)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-ink-500">Foco na semana</span>
              <span className="font-bold text-ink-900">{formatMinutes(data.focusMinutesWeek)}</span>
            </div>
            <Link
              to="/planejamento"
              className="mt-1 flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-3 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
            >
              <Sparkles className="h-4 w-4" />
              {data.pendingSuggestions > 0 ? `Ver ${data.pendingSuggestions} sugestões` : 'Planejar meu tempo'}
            </Link>
          </div>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Tarefas prioritárias */}
        <Card>
          <CardHeader
            title="Tarefas prioritárias"
            subtitle="Ordenadas por prioridade e prazo"
            icon={<ListTodo className="h-4 w-4" />}
            action={
              <Link to="/tarefas" className="inline-flex items-center gap-1 text-xs font-semibold text-brand-700 hover:underline">
                Ver todas <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            }
          />
          <div className="p-4">
            {data.priorityTasks.length === 0 ? (
              <EmptyState
                icon={<CheckCircle2 className="h-5 w-5" />}
                title="Tudo em dia!"
                description="Nenhuma tarefa pendente no momento."
                action={<Button size="sm" variant="soft" onClick={() => setTaskModal(true)}>Criar tarefa</Button>}
              />
            ) : (
              <ul className="space-y-2">
                {data.priorityTasks.map((task) => (
                  <TaskItem key={task.id} task={task} onToggle={toggleTask} compact />
                ))}
              </ul>
            )}
          </div>
        </Card>

        {/* Próximos compromissos */}
        <Card>
          <CardHeader
            title="Próximos compromissos"
            subtitle="Nos próximos 7 dias"
            icon={<CalendarClock className="h-4 w-4" />}
            action={
              <Button size="sm" variant="soft" icon={<Plus className="h-3.5 w-3.5" />} onClick={() => setAppointmentModal(true)}>
                Cadastrar
              </Button>
            }
          />
          <div className="p-3 sm:p-4">
            {data.upcomingEvents.length === 0 ? (
              <EmptyState icon={<CalendarClock className="h-5 w-5" />} title="Nenhum compromisso próximo" />
            ) : (
              <ul className="space-y-1">
                {data.upcomingEvents.map((event) => (
                  <EventRow key={event.id} event={event} showDate={toDateKey(event.start) === todayKey ? 'Hoje' : formatDayMonth(event.start)} />
                ))}
              </ul>
            )}
          </div>
        </Card>
      </div>

      <TaskFormModal open={taskModal} onClose={() => setTaskModal(false)} onSaved={() => void reload()} />
      <AppointmentFormModal open={appointmentModal} onClose={() => setAppointmentModal(false)} onSaved={() => void reload()} />
    </div>
  );
}
