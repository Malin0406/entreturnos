import type { DateSelectArg, EventClickArg, EventDropArg, EventInput, EventSourceFuncArg } from '@fullcalendar/core';
import ptBrLocale from '@fullcalendar/core/locales/pt-br';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin, { type EventResizeDoneArg } from '@fullcalendar/interaction';
import luxonPlugin from '@fullcalendar/luxon3';
import FullCalendar from '@fullcalendar/react';
import timeGridPlugin from '@fullcalendar/timegrid';
import { CalendarPlus, Repeat, Route } from 'lucide-react';
import { useCallback, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AppointmentFormModal, type AppointmentDefaults } from '../components/forms/AppointmentFormModal';
import { CommuteFormModal } from '../components/forms/CommuteFormModal';
import { extractConflicts } from '../components/forms/ConflictAlert';
import { RecurringFormModal } from '../components/forms/RecurringFormModal';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { PageHeader } from '../components/ui/Feedback';
import { useToast } from '../contexts/ToastContext';
import { useCategories } from '../hooks/useCategories';
import { errorMessage } from '../services/api';
import { appointmentApi, calendarApi, commuteApi, recurringApi } from '../services/endpoints';
import type { Appointment, CalendarEvent, Commute, RecurringAppointment } from '../types';
import { TIMEZONE } from '../utils/date';
import { COMMUTE_COLOR } from '../utils/labels';

function toFullCalendarEvent(event: CalendarEvent): EventInput {
  const color = event.kind === 'COMMUTE' ? COMMUTE_COLOR : (event.category?.color ?? '#64748B');
  return {
    id: event.id,
    title: event.title,
    start: event.start,
    end: event.end,
    backgroundColor: color,
    borderColor: color,
    textColor: '#fff',
    editable: event.kind === 'APPOINTMENT',
    classNames: [event.kind === 'COMMUTE' ? 'event-commute' : '', event.taskId ? 'event-task' : ''].filter(Boolean),
    extendedProps: { source: event },
  };
}

/** "2026-11-23T10:00:00-03:00" → { date, time } no fuso do calendário. */
function splitZoned(value: string) {
  return { date: value.slice(0, 10), time: value.length > 10 ? value.slice(11, 16) : '' };
}

export function AgendaPage() {
  const toast = useToast();
  const categories = useCategories();
  const [params] = useSearchParams();
  const calendarRef = useRef<FullCalendar>(null);

  const [appointmentModal, setAppointmentModal] = useState<{ open: boolean; appointment?: Appointment | null; defaults?: AppointmentDefaults }>({ open: false });
  const [recurringModal, setRecurringModal] = useState<{ open: boolean; rule?: RecurringAppointment | null }>({ open: false });
  const [commuteModal, setCommuteModal] = useState<{ open: boolean; commute?: Commute | null }>({ open: false });

  const refetch = useCallback(() => calendarRef.current?.getApi().refetchEvents(), []);

  const loadEvents = useCallback(
    async (info: EventSourceFuncArg) => {
      const events = await calendarApi.events(info.start.toISOString(), info.end.toISOString());
      return events.map(toFullCalendarEvent);
    },
    [],
  );

  const onSelect = (info: DateSelectArg) => {
    const start = splitZoned(info.startStr);
    const end = splitZoned(info.endStr);
    const defaults: AppointmentDefaults = info.allDay
      ? { date: start.date, startTime: '09:00', endTime: '10:00' }
      : { date: start.date, startTime: start.time, endTime: end.date === start.date ? end.time : '23:59' };
    setAppointmentModal({ open: true, appointment: null, defaults });
    info.view.calendar.unselect();
  };

  const onEventClick = async (info: EventClickArg) => {
    const source = info.event.extendedProps.source as CalendarEvent;
    try {
      if (source.kind === 'APPOINTMENT') {
        setAppointmentModal({ open: true, appointment: await appointmentApi.get(source.sourceId) });
      } else if (source.kind === 'RECURRING') {
        setRecurringModal({ open: true, rule: await recurringApi.get(source.sourceId) });
      } else {
        setCommuteModal({ open: true, commute: await commuteApi.get(source.sourceId) });
      }
    } catch (error) {
      toast.error(errorMessage(error));
    }
  };

  /** Arrastar ou redimensionar um compromisso único atualiza seu horário. */
  const onMove = async (info: EventDropArg | EventResizeDoneArg) => {
    const source = info.event.extendedProps.source as CalendarEvent;
    if (source.kind !== 'APPOINTMENT' || !info.event.start || !info.event.end) {
      info.revert();
      return;
    }
    try {
      const current = await appointmentApi.get(source.sourceId);
      await appointmentApi.update(current.id, {
        title: current.title,
        description: current.description,
        location: current.location,
        categoryId: current.categoryId,
        startAt: new Date(info.event.startStr).toISOString(),
        endAt: new Date(info.event.endStr).toISOString(),
      });
      toast.success('Horário atualizado.');
      refetch();
    } catch (error) {
      info.revert();
      const conflicts = extractConflicts(error);
      toast.error(conflicts ? `Conflito com: ${conflicts.map((c) => c.title).join(', ')}` : errorMessage(error));
    }
  };

  const initialDate = params.get('data') ?? undefined;

  return (
    <div>
      <PageHeader
        title="Minha agenda"
        description="Clique em um horário vazio para criar um compromisso. Arraste compromissos únicos para remarcar."
        actions={
          <>
            <Button variant="secondary" icon={<Route className="h-4 w-4" />} onClick={() => setCommuteModal({ open: true, commute: null })}>
              Deslocamento
            </Button>
            <Button variant="secondary" icon={<Repeat className="h-4 w-4" />} onClick={() => setRecurringModal({ open: true, rule: null })}>
              Compromisso fixo
            </Button>
            <Button icon={<CalendarPlus className="h-4 w-4" />} onClick={() => setAppointmentModal({ open: true, appointment: null })}>
              Novo compromisso
            </Button>
          </>
        }
      />

      <div className="mb-4 flex flex-wrap gap-x-4 gap-y-2" aria-label="Legenda de categorias">
        {categories.map((c) => (
          <span key={c.id} className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-500">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: c.color }} />
            {c.name}
          </span>
        ))}
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-500">
          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: COMMUTE_COLOR }} />
          Deslocamento
        </span>
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-500">
          <span className="h-2.5 w-2.5 rounded-sm border border-dashed border-ink-500" />
          Tarefa planejada
        </span>
      </div>

      <Card className="p-3 sm:p-5">
        <FullCalendar
          ref={calendarRef}
          plugins={[luxonPlugin, dayGridPlugin, timeGridPlugin, interactionPlugin]}
          timeZone={TIMEZONE}
          locale={ptBrLocale}
          initialView={window.innerWidth < 768 ? 'timeGridDay' : 'timeGridWeek'}
          initialDate={initialDate}
          headerToolbar={{ left: 'prev,next today', center: 'title', right: 'timeGridDay,timeGridWeek,dayGridMonth' }}
          buttonText={{ today: 'Hoje', day: 'Dia', week: 'Semana', month: 'Mês' }}
          height="auto"
          contentHeight={680}
          slotMinTime="05:00:00"
          slotMaxTime="24:00:00"
          scrollTime="07:00:00"
          slotDuration="00:30:00"
          nowIndicator
          selectable
          selectMirror
          dayMaxEvents={3}
          allDaySlot={false}
          eventTimeFormat={{ hour: '2-digit', minute: '2-digit', hour12: false }}
          slotLabelFormat={{ hour: '2-digit', minute: '2-digit', hour12: false }}
          events={loadEvents}
          select={onSelect}
          eventClick={onEventClick}
          eventDrop={onMove}
          eventResize={onMove}
        />
      </Card>

      <AppointmentFormModal
        open={appointmentModal.open}
        appointment={appointmentModal.appointment}
        defaults={appointmentModal.defaults}
        onClose={() => setAppointmentModal({ open: false })}
        onSaved={refetch}
      />
      <RecurringFormModal open={recurringModal.open} rule={recurringModal.rule} onClose={() => setRecurringModal({ open: false })} onSaved={refetch} />
      <CommuteFormModal open={commuteModal.open} commute={commuteModal.commute} onClose={() => setCommuteModal({ open: false })} onSaved={refetch} />
    </div>
  );
}
