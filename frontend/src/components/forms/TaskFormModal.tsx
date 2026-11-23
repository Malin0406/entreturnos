import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useToast } from '../../contexts/ToastContext';
import { useCategories } from '../../hooks/useCategories';
import { errorMessage } from '../../services/api';
import { taskApi } from '../../services/endpoints';
import type { Task } from '../../types';
import { toDateKey, toTimeString, zonedToISO } from '../../utils/date';
import { Button } from '../ui/Button';
import { Input, Select, Textarea } from '../ui/Field';
import { Modal } from '../ui/Modal';

const schema = z
  .object({
    title: z.string().trim().min(1, 'Informe o título.').max(150, 'Máximo de 150 caracteres.'),
    description: z.string().max(2000, 'Máximo de 2000 caracteres.').optional(),
    categoryId: z.string().min(1, 'Selecione a categoria.'),
    dueDate: z.string().optional(),
    dueTime: z.string().optional(),
    estimatedMinutes: z.coerce
      .number({ invalid_type_error: 'Informe o tempo estimado.' })
      .int('Use minutos inteiros.')
      .min(5, 'Mínimo de 5 minutos.')
      .max(1440, 'Máximo de 24 horas.'),
    priority: z.enum(['LOW', 'MEDIUM', 'HIGH']),
    status: z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED']),
  })
  .refine((d) => !d.dueTime || !!d.dueDate, { message: 'Informe a data do prazo.', path: ['dueDate'] });

type FormValues = z.infer<typeof schema>;

interface TaskFormModalProps {
  open: boolean;
  onClose: () => void;
  onSaved: (task: Task) => void;
  task?: Task | null;
}

export function TaskFormModal({ open, onClose, onSaved, task }: TaskFormModalProps) {
  const categories = useCategories();
  const toast = useToast();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (!open) return;
    setSubmitError(null);
    reset({
      title: task?.title ?? '',
      description: task?.description ?? '',
      categoryId: task?.categoryId ?? categories.find((c) => c.slug === 'estudos')?.id ?? categories[0]?.id ?? '',
      dueDate: task?.dueDate ? toDateKey(task.dueDate) : '',
      dueTime: task?.dueDate ? toTimeString(task.dueDate) : '',
      estimatedMinutes: task?.estimatedMinutes ?? 30,
      priority: task?.priority ?? 'MEDIUM',
      status: task?.status ?? 'PENDING',
    });
  }, [open, task, categories, reset]);

  const onSubmit = async (values: FormValues) => {
    setSubmitError(null);
    const payload = {
      title: values.title,
      description: values.description?.trim() || null,
      categoryId: values.categoryId,
      dueDate: values.dueDate ? zonedToISO(values.dueDate, values.dueTime || '23:59') : null,
      estimatedMinutes: values.estimatedMinutes,
      priority: values.priority,
      status: values.status,
    };
    try {
      const saved = task ? await taskApi.update(task.id, payload) : await taskApi.create(payload);
      toast.success(task ? 'Tarefa atualizada.' : 'Tarefa criada.');
      onSaved(saved);
      onClose();
    } catch (error) {
      setSubmitError(errorMessage(error));
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={task ? 'Editar tarefa' : 'Nova tarefa'}
      description="Atividades acadêmicas, profissionais ou pessoais."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="task-form" loading={isSubmitting}>
            {task ? 'Salvar alterações' : 'Criar tarefa'}
          </Button>
        </>
      }
    >
      <form id="task-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <Input label="Título" placeholder="Ex.: Resumo de Engenharia de Software" error={errors.title?.message} {...register('title')} />
        <Textarea label="Descrição" placeholder="Detalhes, links, observações…" error={errors.description?.message} {...register('description')} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Select label="Categoria" error={errors.categoryId?.message} {...register('categoryId')}>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
          <Input
            label="Tempo estimado (min)"
            type="number"
            min={5}
            step={5}
            error={errors.estimatedMinutes?.message}
            {...register('estimatedMinutes')}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Prazo de entrega" type="date" error={errors.dueDate?.message} {...register('dueDate')} />
          <Input label="Horário do prazo" type="time" hint="Padrão: 23:59" error={errors.dueTime?.message} {...register('dueTime')} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Select label="Prioridade" error={errors.priority?.message} {...register('priority')}>
            <option value="HIGH">Alta</option>
            <option value="MEDIUM">Média</option>
            <option value="LOW">Baixa</option>
          </Select>
          <Select label="Status" error={errors.status?.message} {...register('status')}>
            <option value="PENDING">Pendente</option>
            <option value="IN_PROGRESS">Em andamento</option>
            <option value="COMPLETED">Concluída</option>
          </Select>
        </div>
        {submitError && (
          <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
            {submitError}
          </p>
        )}
      </form>
    </Modal>
  );
}
