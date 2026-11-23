import { zodResolver } from '@hookform/resolvers/zod';
import { Bell, CalendarRange, SlidersHorizontal, Timer } from 'lucide-react';
import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '../components/ui/Button';
import { Card, CardHeader } from '../components/ui/Card';
import { ErrorState, PageHeader, Spinner } from '../components/ui/Feedback';
import { Input, Toggle, WeekdayPicker } from '../components/ui/Field';
import { usePomodoro } from '../contexts/PomodoroContext';
import { useToast } from '../contexts/ToastContext';
import { useApi } from '../hooks/useApi';
import { errorMessage } from '../services/api';
import { userApi } from '../services/endpoints';

const int = (min: number, max: number, label: string) =>
  z.coerce
    .number({ invalid_type_error: `Informe ${label}.` })
    .int('Use números inteiros.')
    .min(min, `Mínimo: ${min}.`)
    .max(max, `Máximo: ${max}.`);

const schema = z
  .object({
    availabilityStart: z.string().min(1, 'Informe o início.'),
    availabilityEnd: z.string().min(1, 'Informe o fim.'),
    availableWeekdays: z.array(z.number()).min(1, 'Selecione ao menos um dia.'),
    breakMinutes: int(0, 60, 'a pausa'),
    minSlotMinutes: int(5, 240, 'o intervalo mínimo'),
    maxTaskBlockMinutes: int(15, 480, 'o bloco máximo'),
    planningHorizonDays: int(1, 14, 'o horizonte'),
    pomodoroFocusMinutes: int(1, 120, 'o foco'),
    pomodoroShortBreakMinutes: int(1, 60, 'a pausa curta'),
    pomodoroLongBreakMinutes: int(1, 90, 'a pausa longa'),
    pomodoroCyclesBeforeLong: int(1, 12, 'os ciclos'),
    notifyTaskDeadlines: z.boolean(),
    notifyAppointments: z.boolean(),
    notifySuggestions: z.boolean(),
    deadlineAlertHours: int(1, 168, 'a antecedência'),
    appointmentAlertMinutes: int(5, 1440, 'a antecedência'),
  })
  .refine((d) => d.availabilityEnd > d.availabilityStart, { message: 'O fim deve ser após o início.', path: ['availabilityEnd'] });

type FormValues = z.infer<typeof schema>;

export function SettingsPage() {
  const toast = useToast();
  const pomodoro = usePomodoro();
  const { data, loading, error, reload } = useApi(() => userApi.getPreferences(), []);
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (data) reset(data);
  }, [data, reset]);

  const onSubmit = async (values: FormValues) => {
    try {
      const saved = await userApi.updatePreferences(values);
      reset(saved);
      await pomodoro.reloadDurations();
      toast.success('Configurações salvas. As próximas sugestões usarão essas preferências.');
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  if (loading && !data) return <Spinner />;
  if (error) return <ErrorState message={error} onRetry={reload} />;

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6">
      <PageHeader
        title="Configurações"
        description="Defina sua disponibilidade, como o planejamento deve funcionar, o Pomodoro e as notificações."
        actions={
          <Button type="submit" loading={isSubmitting} disabled={!isDirty}>
            Salvar configurações
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Disponibilidade habitual" subtitle="Janela em que o sistema pode sugerir tarefas" icon={<CalendarRange className="h-4 w-4" />} />
          <div className="space-y-4 p-5">
            <div className="grid grid-cols-2 gap-4">
              <Input label="Disponível a partir de" type="time" error={errors.availabilityStart?.message} {...register('availabilityStart')} />
              <Input label="Disponível até" type="time" error={errors.availabilityEnd?.message} {...register('availabilityEnd')} />
            </div>
            <Controller
              control={control}
              name="availableWeekdays"
              render={({ field }) => (
                <WeekdayPicker label="Dias disponíveis" value={field.value ?? []} onChange={field.onChange} error={errors.availableWeekdays?.message} />
              )}
            />
          </div>
        </Card>

        <Card>
          <CardHeader title="Preferências de planejamento" subtitle="Regras usadas pelo planejamento inteligente" icon={<SlidersHorizontal className="h-4 w-4" />} />
          <div className="grid gap-4 p-5 sm:grid-cols-2">
            <Input label="Pausa entre atividades (min)" type="number" hint="Descanso reservado antes e depois de cada bloco." error={errors.breakMinutes?.message} {...register('breakMinutes')} />
            <Input label="Menor intervalo útil (min)" type="number" hint="Intervalos menores são ignorados." error={errors.minSlotMinutes?.message} {...register('minSlotMinutes')} />
            <Input label="Bloco máximo por tarefa (min)" type="number" hint="Tarefas longas são divididas em blocos." error={errors.maxTaskBlockMinutes?.message} {...register('maxTaskBlockMinutes')} />
            <Input label="Horizonte de planejamento (dias)" type="number" hint="Quantos dias à frente analisar." error={errors.planningHorizonDays?.message} {...register('planningHorizonDays')} />
          </div>
        </Card>

        <Card>
          <CardHeader title="Pomodoro" subtitle="Duração padrão das sessões" icon={<Timer className="h-4 w-4" />} />
          <div className="grid gap-4 p-5 sm:grid-cols-2">
            <Input label="Foco (min)" type="number" error={errors.pomodoroFocusMinutes?.message} {...register('pomodoroFocusMinutes')} />
            <Input label="Pausa curta (min)" type="number" error={errors.pomodoroShortBreakMinutes?.message} {...register('pomodoroShortBreakMinutes')} />
            <Input label="Pausa longa (min)" type="number" error={errors.pomodoroLongBreakMinutes?.message} {...register('pomodoroLongBreakMinutes')} />
            <Input label="Ciclos até a pausa longa" type="number" error={errors.pomodoroCyclesBeforeLong?.message} {...register('pomodoroCyclesBeforeLong')} />
          </div>
        </Card>

        <Card>
          <CardHeader title="Notificações" subtitle="O que deve aparecer na central de notificações" icon={<Bell className="h-4 w-4" />} />
          <div className="divide-y divide-ink-100 px-5 pb-2">
            <Controller
              control={control}
              name="notifyTaskDeadlines"
              render={({ field }) => (
                <Toggle label="Prazos de tarefas" description="Tarefas próximas do vencimento e atrasadas." checked={!!field.value} onChange={field.onChange} />
              )}
            />
            <Controller
              control={control}
              name="notifyAppointments"
              render={({ field }) => (
                <Toggle label="Compromissos próximos" description="Aviso antes de cada compromisso." checked={!!field.value} onChange={field.onChange} />
              )}
            />
            <Controller
              control={control}
              name="notifySuggestions"
              render={({ field }) => (
                <Toggle label="Sugestões de horários" description="Quando novas sugestões forem geradas." checked={!!field.value} onChange={field.onChange} />
              )}
            />
          </div>
          <div className="grid gap-4 border-t border-ink-100 p-5 sm:grid-cols-2">
            <Input label="Avisar prazos com antecedência de (h)" type="number" error={errors.deadlineAlertHours?.message} {...register('deadlineAlertHours')} />
            <Input label="Avisar compromissos com antecedência de (min)" type="number" error={errors.appointmentAlertMinutes?.message} {...register('appointmentAlertMinutes')} />
          </div>
        </Card>
      </div>

      <div className="flex justify-end">
        <Button type="submit" size="lg" loading={isSubmitting} disabled={!isDirty}>
          Salvar configurações
        </Button>
      </div>
    </form>
  );
}
