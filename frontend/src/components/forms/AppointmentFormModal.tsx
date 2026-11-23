import { zodResolver } from '@hookform/resolvers/zod';
import { Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useToast } from '../../contexts/ToastContext';
import { useCategories } from '../../hooks/useCategories';
import { errorMessage } from '../../services/api';
import { appointmentApi } from '../../services/endpoints';
import type { Appointment, ConflictItem } from '../../types';
import { toDateKey, toTimeString, zonedToISO } from '../../utils/date';
import { Button } from '../ui/Button';
import { ConfirmDialog } from '../ui/Feedback';
import { Input, Select, Textarea } from '../ui/Field';
import { Modal } from '../ui/Modal';
import { ConflictAlert, extractConflicts } from './ConflictAlert';

const schema = z
  .object({
    title: z.string().trim().min(1, 'Informe o título.').max(150),
    categoryId: z.string().min(1, 'Selecione a categoria.'),
    date: z.string().min(1, 'Informe a data.'),
    startTime: z.string().min(1, 'Informe o início.'),
    endTime: z.string().min(1, 'Informe o fim.'),
    location: z.string().max(150).optional(),
    description: z.string().max(2000).optional(),
  })
  .refine((d) => d.endTime > d.startTime, { message: 'O fim deve ser após o início.', path: ['endTime'] });

type FormValues = z.infer<typeof schema>;

export interface AppointmentDefaults {
  date?: string;
  startTime?: string;
  endTime?: string;
}

interface AppointmentFormModalProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  appointment?: Appointment | null;
  defaults?: AppointmentDefaults;
}

export function AppointmentFormModal({ open, onClose, onSaved, appointment, defaults }: AppointmentFormModalProps) {
  const categories = useCategories();
  const toast = useToast();
  const [conflicts, setConflicts] = useState<ConflictItem[] | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (!open) return;
    setConflicts(null);
    setSubmitError(null);
    reset({
      title: appointment?.title ?? '',
      categoryId: appointment?.categoryId ?? categories.find((c) => c.slug === 'pessoal')?.id ?? categories[0]?.id ?? '',
      date: appointment ? toDateKey(appointment.startAt) : (defaults?.date ?? toDateKey(new Date())),
      startTime: appointment ? toTimeString(appointment.startAt) : (defaults?.startTime ?? '09:00'),
      endTime: appointment ? toTimeString(appointment.endAt) : (defaults?.endTime ?? '10:00'),
      location: appointment?.location ?? '',
      description: appointment?.description ?? '',
    });
  }, [open, appointment, defaults, categories, reset]);

  const save = async (values: FormValues, force: boolean) => {
    setSubmitError(null);
    const payload = {
      title: values.title,
      categoryId: values.categoryId,
      startAt: zonedToISO(values.date, values.startTime),
      endAt: zonedToISO(values.date, values.endTime),
      location: values.location?.trim() || null,
      description: values.description?.trim() || null,
      force,
    };
    try {
      if (appointment) await appointmentApi.update(appointment.id, payload);
      else await appointmentApi.create(payload);
      toast.success(appointment ? 'Compromisso atualizado.' : 'Compromisso cadastrado.');
      onSaved();
      onClose();
    } catch (error) {
      const found = extractConflicts(error);
      if (found) setConflicts(found);
      else setSubmitError(errorMessage(error));
    }
  };

  const handleDelete = async () => {
    if (!appointment) return;
    setDeleting(true);
    try {
      await appointmentApi.remove(appointment.id);
      toast.success('Compromisso excluído.');
      setConfirmDelete(false);
      onSaved();
      onClose();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        title={appointment ? 'Editar compromisso' : 'Novo compromisso'}
        description="Compromisso com data e horário definidos."
        footer={
          <div className="flex w-full flex-wrap items-center justify-between gap-2">
            {appointment ? (
              <Button variant="ghost" className="text-red-600 hover:bg-red-50 hover:text-red-700" icon={<Trash2 className="h-4 w-4" />} onClick={() => setConfirmDelete(true)}>
                Excluir
              </Button>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <Button variant="secondary" onClick={onClose}>
                Cancelar
              </Button>
              {conflicts ? (
                <Button variant="primary" loading={isSubmitting} onClick={handleSubmit((v) => save(v, true))}>
                  Salvar mesmo assim
                </Button>
              ) : (
                <Button type="submit" form="appointment-form" loading={isSubmitting}>
                  Salvar
                </Button>
              )}
            </div>
          </div>
        }
      >
        <form id="appointment-form" onSubmit={handleSubmit((v) => save(v, false))} className="space-y-4" noValidate>
          <Input label="Título" placeholder="Ex.: Consulta médica" error={errors.title?.message} {...register('title')} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Select label="Categoria" error={errors.categoryId?.message} {...register('categoryId')}>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
            <Input label="Data" type="date" error={errors.date?.message} {...register('date')} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Início" type="time" error={errors.startTime?.message} {...register('startTime', { onChange: () => setConflicts(null) })} />
            <Input label="Fim" type="time" error={errors.endTime?.message} {...register('endTime', { onChange: () => setConflicts(null) })} />
          </div>
          <Input label="Local" placeholder="Opcional" error={errors.location?.message} {...register('location')} />
          <Textarea label="Descrição" placeholder="Opcional" error={errors.description?.message} {...register('description')} />
          {conflicts && <ConflictAlert conflicts={conflicts} />}
          {submitError && (
            <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
              {submitError}
            </p>
          )}
        </form>
      </Modal>
      <ConfirmDialog
        open={confirmDelete}
        title="Excluir compromisso"
        message={`Deseja excluir "${appointment?.title ?? ''}"? Deslocamentos vinculados também serão removidos.`}
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
      />
    </>
  );
}
