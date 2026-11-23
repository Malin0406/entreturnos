import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { useToast } from '../../contexts/ToastContext';
import { useCategories } from '../../hooks/useCategories';
import { errorMessage } from '../../services/api';
import { recurringApi } from '../../services/endpoints';
import type { ConflictItem, RecurringAppointment } from '../../types';
import { toDateKey } from '../../utils/date';
import { Button } from '../ui/Button';
import { Input, Select, Textarea, WeekdayPicker } from '../ui/Field';
import { Modal } from '../ui/Modal';
import { ConflictAlert, extractConflicts } from './ConflictAlert';

const schema = z
  .object({
    title: z.string().trim().min(1, 'Informe o título.').max(150),
    categoryId: z.string().min(1, 'Selecione a categoria.'),
    weekdays: z.array(z.number()).min(1, 'Selecione ao menos um dia da semana.'),
    startTime: z.string().min(1, 'Informe o início.'),
    endTime: z.string().min(1, 'Informe o fim.'),
    startDate: z.string().min(1, 'Informe a data de início.'),
    endDate: z.string().optional(),
    location: z.string().max(150).optional(),
    description: z.string().max(2000).optional(),
  })
  .refine((d) => d.endTime > d.startTime, { message: 'O fim deve ser após o início.', path: ['endTime'] })
  .refine((d) => !d.endDate || d.endDate >= d.startDate, {
    message: 'O término deve ser igual ou posterior ao início.',
    path: ['endDate'],
  });

type FormValues = z.infer<typeof schema>;

interface RecurringFormModalProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  rule?: RecurringAppointment | null;
}

export function RecurringFormModal({ open, onClose, onSaved, rule }: RecurringFormModalProps) {
  const categories = useCategories();
  const toast = useToast();
  const [conflicts, setConflicts] = useState<ConflictItem[] | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (!open) return;
    setConflicts(null);
    setSubmitError(null);
    reset({
      title: rule?.title ?? '',
      categoryId: rule?.categoryId ?? categories.find((c) => c.slug === 'faculdade')?.id ?? categories[0]?.id ?? '',
      weekdays: rule?.weekdays ?? [1, 2, 3, 4, 5],
      startTime: rule?.startTime ?? '08:00',
      endTime: rule?.endTime ?? '12:00',
      startDate: rule?.startDate ?? toDateKey(new Date()),
      endDate: rule?.endDate ?? '',
      location: rule?.location ?? '',
      description: rule?.description ?? '',
    });
  }, [open, rule, categories, reset]);

  const save = async (values: FormValues, force: boolean) => {
    setSubmitError(null);
    const payload = {
      title: values.title,
      categoryId: values.categoryId,
      weekdays: values.weekdays,
      startTime: values.startTime,
      endTime: values.endTime,
      startDate: values.startDate,
      endDate: values.endDate || null,
      location: values.location?.trim() || null,
      description: values.description?.trim() || null,
      force,
    };
    try {
      if (rule) await recurringApi.update(rule.id, payload);
      else await recurringApi.create(payload);
      toast.success(rule ? 'Compromisso fixo atualizado.' : 'Compromisso fixo cadastrado.');
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
      title={rule ? 'Editar compromisso fixo' : 'Novo compromisso fixo'}
      description="Atividades que se repetem toda semana, como estágio, aulas ou academia."
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
            <Button type="submit" form="recurring-form" loading={isSubmitting}>
              Salvar
            </Button>
          )}
        </>
      }
    >
      <form id="recurring-form" onSubmit={handleSubmit((v) => save(v, false))} className="space-y-4" noValidate>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Título" placeholder="Ex.: Faculdade — Engenharia" error={errors.title?.message} {...register('title')} />
          <Select label="Categoria" error={errors.categoryId?.message} {...register('categoryId')}>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </div>
        <Controller
          control={control}
          name="weekdays"
          render={({ field }) => (
            <WeekdayPicker
              label="Dias da semana"
              value={field.value ?? []}
              onChange={(days) => {
                setConflicts(null);
                field.onChange(days);
              }}
              error={errors.weekdays?.message}
            />
          )}
        />
        <div className="grid grid-cols-2 gap-4">
          <Input label="Horário inicial" type="time" error={errors.startTime?.message} {...register('startTime')} />
          <Input label="Horário final" type="time" error={errors.endTime?.message} {...register('endTime')} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Input label="Data de início" type="date" error={errors.startDate?.message} {...register('startDate')} />
          <Input label="Data de término" type="date" hint="Opcional" error={errors.endDate?.message} {...register('endDate')} />
        </div>
        <Input label="Local" placeholder="Opcional" error={errors.location?.message} {...register('location')} />
        <Textarea label="Descrição" placeholder="Opcional" rows={2} error={errors.description?.message} {...register('description')} />
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
