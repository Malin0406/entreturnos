import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useToast } from '../../contexts/ToastContext';
import { errorMessage } from '../../services/api';
import { appointmentApi, commuteApi, recurringApi } from '../../services/endpoints';
import type { Appointment, Commute, ConflictItem, RecurringAppointment } from '../../types';
import { addDaysToKey, formatDayMonth, formatTime, toDateKey, toTimeString, zonedToISO } from '../../utils/date';
import { COMMUTE_MODE_LABEL, describeWeekdays } from '../../utils/labels';
import { Button } from '../ui/Button';
import { Input, Select } from '../ui/Field';
import { Modal } from '../ui/Modal';
import { ConflictAlert, extractConflicts } from './ConflictAlert';

type LinkType = 'recurring' | 'appointment' | 'standalone';

const schema = z
  .object({
    origin: z.string().trim().min(1, 'Informe a origem.').max(150),
    destination: z.string().trim().min(1, 'Informe o destino.').max(150),
    durationMinutes: z.coerce
      .number({ invalid_type_error: 'Informe a duração.' })
      .int()
      .min(1, 'Mínimo de 1 minuto.')
      .max(600, 'Máximo de 10 horas.'),
    mode: z.enum(['WALK', 'BUS', 'SUBWAY', 'CAR', 'BIKE', 'RIDE_APP', 'OTHER']),
    linkType: z.enum(['recurring', 'appointment', 'standalone']),
    position: z.enum(['BEFORE', 'AFTER']),
    recurringAppointmentId: z.string().optional(),
    appointmentId: z.string().optional(),
    date: z.string().optional(),
    time: z.string().optional(),
  })
  .superRefine((d, ctx) => {
    if (d.linkType === 'recurring' && !d.recurringAppointmentId)
      ctx.addIssue({ code: 'custom', message: 'Selecione o compromisso fixo.', path: ['recurringAppointmentId'] });
    if (d.linkType === 'appointment' && !d.appointmentId)
      ctx.addIssue({ code: 'custom', message: 'Selecione o compromisso.', path: ['appointmentId'] });
    if (d.linkType === 'standalone') {
      if (!d.date) ctx.addIssue({ code: 'custom', message: 'Informe a data.', path: ['date'] });
      if (!d.time) ctx.addIssue({ code: 'custom', message: 'Informe o horário.', path: ['time'] });
    }
  });

type FormValues = z.infer<typeof schema>;

interface CommuteFormModalProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  commute?: Commute | null;
}

export function CommuteFormModal({ open, onClose, onSaved, commute }: CommuteFormModalProps) {
  const toast = useToast();
  const [rules, setRules] = useState<RecurringAppointment[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [conflicts, setConflicts] = useState<ConflictItem[] | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const linkType = watch('linkType');

  useEffect(() => {
    if (!open) return;
    setConflicts(null);
    setSubmitError(null);
    const todayKey = toDateKey(new Date());
    void Promise.all([
      recurringApi.list(),
      appointmentApi.list(zonedToISO(addDaysToKey(todayKey, -30), '00:00'), zonedToISO(addDaysToKey(todayKey, 90), '00:00')),
    ])
      .then(([r, a]) => {
        setRules(r);
        setAppointments(a.filter((appt) => !appt.taskId));
      })
      .catch(() => undefined);

    const type: LinkType = commute?.recurringAppointmentId
      ? 'recurring'
      : commute?.appointmentId
        ? 'appointment'
        : commute?.startAt
          ? 'standalone'
          : 'recurring';
    reset({
      origin: commute?.origin ?? '',
      destination: commute?.destination ?? '',
      durationMinutes: commute?.durationMinutes ?? 30,
      mode: commute?.mode ?? 'BUS',
      linkType: type,
      position: commute?.position ?? 'AFTER',
      recurringAppointmentId: commute?.recurringAppointmentId ?? '',
      appointmentId: commute?.appointmentId ?? '',
      date: commute?.startAt ? toDateKey(commute.startAt) : todayKey,
      time: commute?.startAt ? toTimeString(commute.startAt) : '07:00',
    });
  }, [open, commute, reset]);

  const save = async (values: FormValues, force: boolean) => {
    setSubmitError(null);
    const payload = {
      origin: values.origin,
      destination: values.destination,
      durationMinutes: values.durationMinutes,
      mode: values.mode,
      position: values.position,
      recurringAppointmentId: values.linkType === 'recurring' ? values.recurringAppointmentId || null : null,
      appointmentId: values.linkType === 'appointment' ? values.appointmentId || null : null,
      startAt: values.linkType === 'standalone' && values.date && values.time ? zonedToISO(values.date, values.time) : null,
      force,
    };
    try {
      if (commute) await commuteApi.update(commute.id, payload);
      else await commuteApi.create(payload);
      toast.success(commute ? 'Deslocamento atualizado.' : 'Deslocamento cadastrado.');
      onSaved();
      onClose();
    } catch (error) {
      const found = extractConflicts(error);
      if (found) setConflicts(found);
      else setSubmitError(errorMessage(error));
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={commute ? 'Editar deslocamento' : 'Novo deslocamento'}
      description="O tempo de deslocamento ocupa a agenda e nunca recebe sugestões de tarefas."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          {conflicts ? (
            <Button loading={isSubmitting} onClick={handleSubmit((v) => save(v, true))}>
              Salvar mesmo assim
            </Button>
          ) : (
            <Button type="submit" form="commute-form" loading={isSubmitting}>
              Salvar
            </Button>
          )}
        </>
      }
    >
      <form id="commute-form" onSubmit={handleSubmit((v) => save(v, false))} className="space-y-4" noValidate>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Local de origem" placeholder="Ex.: Estágio" error={errors.origin?.message} {...register('origin')} />
          <Input label="Local de destino" placeholder="Ex.: Faculdade" error={errors.destination?.message} {...register('destination')} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Duração estimada (min)"
            type="number"
            min={1}
            error={errors.durationMinutes?.message}
            {...register('durationMinutes', { onChange: () => setConflicts(null) })}
          />
          <Select label="Tipo de deslocamento" error={errors.mode?.message} {...register('mode')}>
            {Object.entries(COMMUTE_MODE_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </div>
        <Select label="Quando acontece" {...register('linkType', { onChange: () => setConflicts(null) })}>
          <option value="recurring">Vinculado a um compromisso fixo (todas as ocorrências)</option>
          <option value="appointment">Vinculado a um compromisso único</option>
          <option value="standalone">Avulso, em data e horário específicos</option>
        </Select>

        {linkType === 'recurring' && (
          <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
            <Select label="Compromisso fixo relacionado" error={errors.recurringAppointmentId?.message} {...register('recurringAppointmentId')}>
              <option value="">Selecione…</option>
              {rules.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.title} — {describeWeekdays(r.weekdays)}, {r.startTime}–{r.endTime}
                </option>
              ))}
            </Select>
            <Select label="Posição" {...register('position')}>
              <option value="AFTER">Depois</option>
              <option value="BEFORE">Antes</option>
            </Select>
          </div>
        )}

        {linkType === 'appointment' && (
          <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
            <Select label="Compromisso relacionado" error={errors.appointmentId?.message} {...register('appointmentId')}>
              <option value="">Selecione…</option>
              {appointments.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.title} — {formatDayMonth(a.startAt)}, {formatTime(a.startAt)}
                </option>
              ))}
            </Select>
            <Select label="Posição" {...register('position')}>
              <option value="AFTER">Depois</option>
              <option value="BEFORE">Antes</option>
            </Select>
          </div>
        )}

        {linkType === 'standalone' && (
          <div className="grid grid-cols-2 gap-4">
            <Input label="Data" type="date" error={errors.date?.message} {...register('date')} />
            <Input label="Horário de saída" type="time" error={errors.time?.message} {...register('time')} />
          </div>
        )}

        {conflicts && <ConflictAlert conflicts={conflicts} />}
        {submitError && (
          <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
            {submitError}
          </p>
        )}
      </form>
    </Modal>
  );
}
