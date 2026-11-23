import { BarChart3, BookOpen, Briefcase, CheckCircle2, Flame, ListTodo, PieChart as PieIcon, Route, TrendingUp } from 'lucide-react';
import { useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Card, CardHeader } from '../components/ui/Card';
import { EmptyState, ErrorState, PageHeader, Spinner, StatCard, Tabs } from '../components/ui/Feedback';
import { useApi } from '../hooks/useApi';
import { reportApi } from '../services/endpoints';
import { formatHours, formatMinutes } from '../utils/date';

const tooltipStyle = { borderRadius: 12, border: '1px solid #EAECF0', fontSize: 12 };
const axisTick = { fontSize: 12, fill: '#98A2B3' };

type Period = '4' | '8' | '12';

export function ReportsPage() {
  const [weeks, setWeeks] = useState<Period>('8');
  const { data, loading, error, reload } = useApi(() => reportApi.summary(Number(weeks)), [weeks]);

  const weekly = (data?.weekly ?? []).map((w) => ({
    ...w,
    studyHours: Math.round((w.studyMinutes / 60) * 10) / 10,
    workHours: Math.round((w.workMinutes / 60) * 10) / 10,
  }));
  const statusData = data
    ? [
        { name: 'Pendentes', value: data.totals.pending, color: '#F97316' },
        { name: 'Em andamento', value: data.totals.inProgress, color: '#0EA5E9' },
        { name: 'Concluídas', value: data.totals.completed, color: '#12B76A' },
      ].filter((d) => d.value > 0)
    : [];
  const categoryData = (data?.categoryDistribution ?? []).filter((c) => c.minutes > 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Relatórios de produtividade"
        description="Indicadores calculados a partir das suas tarefas, compromissos e sessões Pomodoro."
        actions={
          <Tabs<Period>
            value={weeks}
            onChange={setWeeks}
            tabs={[
              { value: '4', label: '4 semanas' },
              { value: '8', label: '8 semanas' },
              { value: '12', label: '12 semanas' },
            ]}
          />
        }
      />

      {loading && !data && <Spinner label="Calculando indicadores…" />}
      {error && <ErrorState message={error} onRetry={reload} />}

      {data && (
        <>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
            <StatCard label="Concluídas no período" value={data.totals.completedInPeriod} icon={<CheckCircle2 className="h-4 w-4" />} tone="green" />
            <StatCard label="Tarefas pendentes" value={data.totals.pending + data.totals.inProgress} icon={<ListTodo className="h-4 w-4" />} tone="orange" hint={`${data.totals.overdue} atrasada(s)`} />
            <StatCard label="Tempo de estudos" value={formatHours(data.totals.studyMinutes)} icon={<BookOpen className="h-4 w-4" />} tone="purple" hint="Faculdade + estudos" />
            <StatCard label="Tempo de trabalho" value={formatHours(data.totals.workMinutes)} icon={<Briefcase className="h-4 w-4" />} tone="blue" hint="Estágio + trabalho" />
            <StatCard label="Sessões Pomodoro" value={data.totals.focusSessions} icon={<Flame className="h-4 w-4" />} tone="orange" hint={formatMinutes(data.totals.focusMinutes)} />
            <StatCard label="Em deslocamento" value={formatHours(data.totals.commuteMinutes)} icon={<Route className="h-4 w-4" />} tone="gray" />
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <Card>
              <CardHeader title="Tarefas concluídas por semana" subtitle="Comparadas às tarefas com prazo na semana" icon={<BarChart3 className="h-4 w-4" />} />
              <div className="h-72 px-2 pb-4 pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={weekly} margin={{ top: 10, right: 12, left: -16, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#EAECF0" vertical={false} />
                    <XAxis dataKey="label" tick={axisTick} axisLine={false} tickLine={false} />
                    <YAxis allowDecimals={false} tick={axisTick} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={tooltipStyle} labelFormatter={(l) => `Semana de ${l}`} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="completedTasks" name="Concluídas" fill="#12B76A" radius={[6, 6, 0, 0]} maxBarSize={28} />
                    <Bar dataKey="dueTasks" name="Com prazo" fill="#D0D5DD" radius={[6, 6, 0, 0]} maxBarSize={28} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card>
              <CardHeader title="Evolução da produtividade" subtitle="Taxa de conclusão (%) e minutos de foco por semana" icon={<TrendingUp className="h-4 w-4" />} />
              <div className="h-72 px-2 pb-4 pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={weekly} margin={{ top: 10, right: 12, left: -16, bottom: 0 }}>
                    <defs>
                      <linearGradient id="focusGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#F97316" stopOpacity={0.35} />
                        <stop offset="100%" stopColor="#F97316" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="rateGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#12B76A" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="#12B76A" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#EAECF0" vertical={false} />
                    <XAxis dataKey="label" tick={axisTick} axisLine={false} tickLine={false} />
                    <YAxis yAxisId="rate" domain={[0, 100]} tick={axisTick} axisLine={false} tickLine={false} />
                    <YAxis yAxisId="focus" orientation="right" tick={axisTick} axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={tooltipStyle}
                      labelFormatter={(l) => `Semana de ${l}`}
                      formatter={(value: number, name: string) => (name === 'Conclusão' ? [`${value}%`, name] : [`${value} min`, name])}
                    />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Area yAxisId="rate" type="monotone" dataKey="completionRate" name="Conclusão" stroke="#12B76A" strokeWidth={2.5} fill="url(#rateGradient)" />
                    <Area yAxisId="focus" type="monotone" dataKey="focusMinutes" name="Foco" stroke="#F97316" strokeWidth={2.5} fill="url(#focusGradient)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card>
              <CardHeader title="Estudos x trabalho" subtitle="Horas por semana (tempo já transcorrido)" icon={<BookOpen className="h-4 w-4" />} />
              <div className="h-72 px-2 pb-4 pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={weekly} margin={{ top: 10, right: 12, left: -16, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#EAECF0" vertical={false} />
                    <XAxis dataKey="label" tick={axisTick} axisLine={false} tickLine={false} />
                    <YAxis tick={axisTick} axisLine={false} tickLine={false} unit="h" />
                    <Tooltip contentStyle={tooltipStyle} labelFormatter={(l) => `Semana de ${l}`} formatter={(v: number, n: string) => [`${v}h`, n]} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="studyHours" name="Estudos" stackId="time" fill="#6366F1" maxBarSize={32} />
                    <Bar dataKey="workHours" name="Trabalho" stackId="time" fill="#0EA5E9" radius={[6, 6, 0, 0]} maxBarSize={32} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card>
              <CardHeader title="Sessões Pomodoro concluídas" subtitle="Sessões de foco por semana" icon={<Flame className="h-4 w-4" />} />
              <div className="h-72 px-2 pb-4 pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={weekly} margin={{ top: 10, right: 12, left: -16, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#EAECF0" vertical={false} />
                    <XAxis dataKey="label" tick={axisTick} axisLine={false} tickLine={false} />
                    <YAxis allowDecimals={false} tick={axisTick} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={tooltipStyle} labelFormatter={(l) => `Semana de ${l}`} />
                    <Bar dataKey="focusSessions" name="Sessões" fill="#F97316" radius={[6, 6, 0, 0]} maxBarSize={32} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card>
              <CardHeader title="Distribuição por categoria" subtitle="Tempo em compromissos no período" icon={<PieIcon className="h-4 w-4" />} />
              {categoryData.length === 0 ? (
                <EmptyState icon={<PieIcon className="h-5 w-5" />} title="Sem dados no período" />
              ) : (
                <div className="flex flex-col items-center gap-4 p-5 sm:flex-row">
                  <div className="h-56 w-full sm:w-1/2">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={categoryData} dataKey="minutes" nameKey="name" innerRadius="55%" outerRadius="85%" paddingAngle={2}>
                          {categoryData.map((c) => (
                            <Cell key={c.slug} fill={c.color} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={tooltipStyle} formatter={(v: number, n: string) => [formatHours(v), n]} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <ul className="w-full space-y-2 sm:w-1/2">
                    {categoryData.map((c) => (
                      <li key={c.slug} className="flex items-center justify-between gap-2 text-sm">
                        <span className="flex items-center gap-2 text-ink-700">
                          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: c.color }} />
                          {c.name}
                        </span>
                        <span className="font-semibold text-ink-900">
                          {formatHours(c.minutes)} <span className="text-xs font-normal text-ink-400">· {c.tasks} tarefa(s)</span>
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </Card>

            <Card>
              <CardHeader title="Situação das tarefas" subtitle="Todas as tarefas cadastradas" icon={<ListTodo className="h-4 w-4" />} />
              {statusData.length === 0 ? (
                <EmptyState icon={<ListTodo className="h-5 w-5" />} title="Nenhuma tarefa cadastrada" />
              ) : (
                <div className="flex flex-col items-center gap-4 p-5 sm:flex-row">
                  <div className="h-56 w-full sm:w-1/2">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={statusData} dataKey="value" nameKey="name" innerRadius="55%" outerRadius="85%" paddingAngle={2}>
                          {statusData.map((s) => (
                            <Cell key={s.name} fill={s.color} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={tooltipStyle} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <ul className="w-full space-y-2 sm:w-1/2">
                    {statusData.map((s) => (
                      <li key={s.name} className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-2 text-ink-700">
                          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                          {s.name}
                        </span>
                        <span className="font-semibold text-ink-900">{s.value}</span>
                      </li>
                    ))}
                    {data.totals.overdue > 0 && (
                      <li className="pt-1 text-xs font-semibold text-red-600">{data.totals.overdue} tarefa(s) com prazo vencido</li>
                    )}
                  </ul>
                </div>
              )}
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
