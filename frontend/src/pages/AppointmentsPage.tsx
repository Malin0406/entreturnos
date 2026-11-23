import { CalendarClock, CalendarPlus, Clock3, MapPin, Pencil, Plus, Repeat, Route, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { AppointmentFormModal } from '../components/forms/AppointmentFormModal';
import { CommuteFormModal } from '../components/forms/CommuteFormModal';
import { RecurringFormModal } from '../components/forms/RecurringFormModal';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { CategoryBadge, ConfirmDialog, EmptyState, ErrorState, PageHeader, Spinner, Tabs } from '../components/ui/Feedback';
import { useToast } from '../contexts/ToastContext';
import { useApi } from '../hooks/useApi';
import { errorMessage } from '../services/api';
import { appointmentApi, commuteApi, recurringApi } from '../services/endpoints';
import type { Appointment, Commute, RecurringAppointment } from '../types';
import { addDaysToKey, formatDateKey, formatDayMonth, formatTime, toDateKey, zonedToISO } from '../utils/date';
import { COMMUTE_MODE_LABEL, describeWeekdays } from '../utils/labels';

type Tab = 'recurring' | 'single' | 'commutes';

type DeleteTarget =
  | { type: 'recurring'; item: RecurringAppointment }
  | { type: 'single'; item: Appointment }
  | { type: 'commute'; item: Commute };

function IconButton({ label, onClick, danger, children }: { label: string; onClick: () => void; danger?: boolean; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={danger ? 'rounded-lg p-1.5 text-ink-400 hover:bg-red-50 hover:text-red-600' : 'rounded-lg p-1.5 text-ink-400 hover:bg-ink-100 hover:text-ink-700'}
    >
      {children}
    </button>
  );
}

function commuteWhen(commute: Commute) {
  const position = commute.position === 'BEFORE' ? 'Antes de' : 'Depois de';
  if (commute.recurringAppointment) {
    return `${position} ${commute.recurringAppointment.title} (${describeWeekdays(commute.recurringAppointment.weekdays)})`;
  }
  if (commute.appointment) {
    return `${position} ${commute.appointment.title} (${formatDayMonth(commute.appointment.startAt)})`;
  }
  if (commute.startAt) return `Avulso em ${formatDayMonth(commute.startAt)} às ${formatTime(commute.startAt)}`;
  return '—';
}

export function AppointmentsPage() {
  const toast = useToast();
  const [tab, setTab] = useState<Tab>('recurring');
  const todayKey = toDateKey(new Date());

  const recurring = useApi(() => recurringApi.list(), []);
  const single = useApi(
    () => appointmentApi.list(zonedToISO(addDaysToKey(todayKey, -1), '00:00'), zonedToISO(addDaysToKey(todayKey, 120), '00:00')),
    [todayKey],
  );
  const commutes = useApi(() => commuteApi.list(), []);

  const [recurringModal, setRecurringModal] = useState<{ open: boolean; rule?: RecurringAppointment | null }>({ open: false });
  const [singleModal, setSingleModal] = useState<{ open: boolean; appointment?: Appointment | null }>({ open: false });
  const [commuteModal, setCommuteModal] = useState<{ open: boolean; commute?: Commute | null }>({ open: false });
  const [toDelete, setToDelete] = useState<DeleteTarget | null>(null);
  const [deleting, setDeleting] = useState(false);

  const reloadAll = () => {
    void recurring.reload();
    void single.reload();
    void commutes.reload();
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      if (toDelete.type === 'recurring') await recurringApi.remove(toDelete.item.id);
      if (toDelete.type === 'single') await appointmentApi.remove(toDelete.item.id);
      if (toDelete.type === 'commute') await commuteApi.remove(toDelete.item.id);
      toast.success('Excluído com sucesso.');
      setToDelete(null);
      reloadAll();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setDeleting(false);
    }
  };

  const upcoming = (single.data ?? []).filter((a) => new Date(a.endAt).getTime() > Date.now());

  const primaryAction =
    tab === 'recurring' ? (
      <Button icon={<Plus className="h-4 w-4" />} onClick={() => setRecurringModal({ open: true, rule: null })}>
        Novo compromisso fixo
      </Button>
    ) : tab === 'single' ? (
      <Button icon={<CalendarPlus className="h-4 w-4" />} onClick={() => setSingleModal({ open: true, appointment: null })}>
        Novo compromisso
      </Button>
    ) : (
      <Button icon={<Route className="h-4 w-4" />} onClick={() => setCommuteModal({ open: true, commute: null })}>
        Novo deslocamento
      </Button>
    );

  return (
    <div>
      <PageHeader
        title="Compromissos"
        description="Cadastre sua rotina fixa, compromissos pontuais e os deslocamentos entre eles."
        actions={primaryAction}
      />

      <div className="mb-5">
        <Tabs<Tab>
          value={tab}
          onChange={setTab}
          tabs={[
            { value: 'recurring', label: 'Fixos (recorrentes)', count: recurring.data?.length },
            { value: 'single', label: 'Únicos', count: upcoming.length },
            { value: 'commutes', label: 'Deslocamentos', count: commutes.data?.length },
          ]}
        />
      </div>

      {tab === 'recurring' && (
        <>
          {recurring.loading && !recurring.data && <Spinner />}
          {recurring.error && <ErrorState message={recurring.error} onRetry={recurring.reload} />}
          {recurring.data && recurring.data.length === 0 && (
            <Card>
              <EmptyState
                icon={<Repeat className="h-5 w-5" />}
                title="Nenhum compromisso fixo"
                description="Cadastre atividades que se repetem, como estágio, aulas e academia."
                action={<Button size="sm" onClick={() => setRecurringModal({ open: true, rule: null })}>Cadastrar agora</Button>}
              />
            </Card>
          )}
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {recurring.data?.map((rule) => (
              <Card key={rule.id} className="overflow-hidden">
                <div className="h-1.5" style={{ backgroundColor: rule.category.color }} />
                <div className="p-5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-bold text-ink-900">{rule.title}</p>
                      <div className="mt-1">
                        <CategoryBadge name={rule.category.name} color={rule.category.color} />
                      </div>
                    </div>
                    <div className="flex shrink-0">
                      <IconButton label={`Editar ${rule.title}`} onClick={() => setRecurringModal({ open: true, rule })}>
                        <Pencil className="h-4 w-4" />
                      </IconButton>
                      <IconButton label={`Excluir ${rule.title}`} danger onClick={() => setToDelete({ type: 'recurring', item: rule })}>
                        <Trash2 className="h-4 w-4" />
                      </IconButton>
                    </div>
                  </div>
                  <div className="mt-4 space-y-2 text-sm text-ink-700">
                    <p className="flex items-center gap-2">
                      <Repeat className="h-4 w-4 text-ink-400" aria-hidden /> {describeWeekdays(rule.weekdays)}
                    </p>
                    <p className="flex items-center gap-2">
                      <Clock3 className="h-4 w-4 text-ink-400" aria-hidden /> {rule.startTime} às {rule.endTime}
                    </p>
                    {rule.location && (
                      <p className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-ink-400" aria-hidden /> {rule.location}
                      </p>
                    )}
                  </div>
                  <p className="mt-4 text-xs text-ink-500">
                    Desde {formatDateKey(rule.startDate)}
                    {rule.endDate ? ` até ${formatDateKey(rule.endDate)}` : ' · sem data de término'}
                    {rule.commutes.length > 0 && ` · ${rule.commutes.length} deslocamento(s)`}
                  </p>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}

      {tab === 'single' && (
        <Card>
          {single.loading && !single.data && <Spinner />}
          {single.error && <div className="p-4"><ErrorState message={single.error} onRetry={single.reload} /></div>}
          {single.data && upcoming.length === 0 && (
            <EmptyState icon={<CalendarClock className="h-5 w-5" />} title="Nenhum compromisso agendado" description="Compromissos pontuais dos próximos meses aparecerão aqui." />
          )}
          {upcoming.length > 0 && (
            <ul className="divide-y divide-ink-100">
              {upcoming.map((appt) => (
                <li key={appt.id} className="flex items-center gap-4 px-5 py-4">
                  <div className="w-14 shrink-0 rounded-xl bg-ink-50 py-2 text-center">
                    <p className="text-[11px] font-semibold uppercase text-ink-500">{formatDayMonth(appt.startAt).split(',')[0]}</p>
                    <p className="text-lg font-extrabold text-ink-900">{formatDayMonth(appt.startAt).split(' ')[1]}</p>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate font-semibold text-ink-900">{appt.title}</p>
                      <CategoryBadge name={appt.category.name} color={appt.category.color} />
                      {appt.taskId && <span className="text-[11px] font-semibold text-brand-700">Tarefa planejada</span>}
                    </div>
                    <p className="mt-0.5 text-xs text-ink-500">
                      {formatTime(appt.startAt)} às {formatTime(appt.endAt)}
                      {appt.location ? ` · ${appt.location}` : ''}
                    </p>
                  </div>
                  <div className="flex shrink-0">
                    <IconButton label={`Editar ${appt.title}`} onClick={() => setSingleModal({ open: true, appointment: appt })}>
                      <Pencil className="h-4 w-4" />
                    </IconButton>
                    <IconButton label={`Excluir ${appt.title}`} danger onClick={() => setToDelete({ type: 'single', item: appt })}>
                      <Trash2 className="h-4 w-4" />
                    </IconButton>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}

      {tab === 'commutes' && (
        <Card>
          {commutes.loading && !commutes.data && <Spinner />}
          {commutes.error && <div className="p-4"><ErrorState message={commutes.error} onRetry={commutes.reload} /></div>}
          {commutes.data && commutes.data.length === 0 && (
            <EmptyState
              icon={<Route className="h-5 w-5" />}
              title="Nenhum deslocamento cadastrado"
              description="Informe quanto tempo você leva entre seus compromissos: esse intervalo é bloqueado na agenda."
            />
          )}
          {commutes.data && commutes.data.length > 0 && (
            <ul className="divide-y divide-ink-100">
              {commutes.data.map((commute) => (
                <li key={commute.id} className="flex items-center gap-4 px-5 py-4">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-ink-100 text-ink-500">
                    <Route className="h-5 w-5" aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-ink-900">
                      {commute.origin} → {commute.destination}
                    </p>
                    <p className="mt-0.5 text-xs text-ink-500">
                      {commute.durationMinutes} min · {COMMUTE_MODE_LABEL[commute.mode]} · {commuteWhen(commute)}
                    </p>
                  </div>
                  <div className="flex shrink-0">
                    <IconButton label="Editar deslocamento" onClick={() => setCommuteModal({ open: true, commute })}>
                      <Pencil className="h-4 w-4" />
                    </IconButton>
                    <IconButton label="Excluir deslocamento" danger onClick={() => setToDelete({ type: 'commute', item: commute })}>
                      <Trash2 className="h-4 w-4" />
                    </IconButton>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}

      <RecurringFormModal open={recurringModal.open} rule={recurringModal.rule} onClose={() => setRecurringModal({ open: false })} onSaved={reloadAll} />
      <AppointmentFormModal open={singleModal.open} appointment={singleModal.appointment} onClose={() => setSingleModal({ open: false })} onSaved={reloadAll} />
      <CommuteFormModal open={commuteModal.open} commute={commuteModal.commute} onClose={() => setCommuteModal({ open: false })} onSaved={reloadAll} />
      <ConfirmDialog
        open={!!toDelete}
        title="Confirmar exclusão"
        message={
          toDelete?.type === 'recurring'
            ? `Excluir "${toDelete.item.title}"? Todas as ocorrências e deslocamentos vinculados serão removidos.`
            : toDelete?.type === 'single'
              ? `Excluir "${toDelete.item.title}"?`
              : 'Excluir este deslocamento?'
        }
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
}
