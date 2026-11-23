import { ArrowDownUp, ListTodo, Plus, Search, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { TaskFormModal } from '../components/forms/TaskFormModal';
import { TaskItem } from '../components/TaskItem';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { ConfirmDialog, EmptyState, ErrorState, PageHeader, Spinner } from '../components/ui/Feedback';
import { Input, Select } from '../components/ui/Field';
import { useToast } from '../contexts/ToastContext';
import { useApi } from '../hooks/useApi';
import { useCategories } from '../hooks/useCategories';
import { errorMessage } from '../services/api';
import { taskApi, type TaskFilters } from '../services/endpoints';
import type { Priority, Task, TaskStatus } from '../types';
import { cn } from '../utils/cn';
import { deadlineState } from '../utils/date';

export function TasksPage() {
  const toast = useToast();
  const categories = useCategories();
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState(params.get('busca') ?? '');
  const [debounced, setDebounced] = useState(search);
  const [filters, setFilters] = useState<Required<Pick<TaskFilters, 'status' | 'priority' | 'categoryId' | 'sort' | 'order'>>>({
    status: '',
    priority: '',
    categoryId: '',
    sort: 'dueDate',
    order: 'asc',
  });
  const [modal, setModal] = useState<{ open: boolean; task?: Task | null }>({ open: false });
  const [toDelete, setToDelete] = useState<Task | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Busca vinda do cabeçalho.
  useEffect(() => {
    const term = params.get('busca');
    if (term !== null) setSearch(term);
  }, [params]);

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebounced(search.trim()), 300);
    return () => window.clearTimeout(timeout);
  }, [search]);

  const { data, loading, error, reload, setData } = useApi(
    () => taskApi.list({ ...filters, search: debounced || undefined }),
    [filters, debounced],
  );

  // Mantém a ordenação escolhida, mas mostra as concluídas por último.
  const tasks = useMemo(
    () => [...(data ?? [])].sort((a, b) => Number(a.status === 'COMPLETED') - Number(b.status === 'COMPLETED')),
    [data],
  );
  const summary = useMemo(
    () => ({
      overdue: tasks.filter((t) => deadlineState(t.dueDate, t.status === 'COMPLETED') === 'overdue').length,
      soon: tasks.filter((t) => deadlineState(t.dueDate, t.status === 'COMPLETED') === 'soon').length,
    }),
    [tasks],
  );

  const toggle = async (task: Task) => {
    const next: TaskStatus = task.status === 'COMPLETED' ? 'PENDING' : 'COMPLETED';
    // Atualização otimista.
    setData((list) => list?.map((t) => (t.id === task.id ? { ...t, status: next } : t)) ?? list);
    try {
      await taskApi.setStatus(task.id, next);
      toast.success(next === 'COMPLETED' ? 'Tarefa concluída! 🎉' : 'Tarefa reaberta.');
      void reload();
    } catch (err) {
      toast.error(errorMessage(err));
      void reload();
    }
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await taskApi.remove(toDelete.id);
      toast.success('Tarefa excluída.');
      setToDelete(null);
      void reload();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setDeleting(false);
    }
  };

  const clearSearch = () => {
    setSearch('');
    if (params.has('busca')) setParams({}, { replace: true });
  };

  const hasFilters = filters.status || filters.priority || filters.categoryId || debounced;

  return (
    <div>
      <PageHeader
        title="Minhas tarefas"
        description="Atividades acadêmicas, profissionais e pessoais com prazos e prioridades."
        actions={
          <Button icon={<Plus className="h-4 w-4" />} onClick={() => setModal({ open: true, task: null })}>
            Nova tarefa
          </Button>
        }
      />

      {(summary.overdue > 0 || summary.soon > 0) && (
        <div className="mb-4 flex flex-wrap gap-2">
          {summary.overdue > 0 && (
            <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-700 ring-1 ring-inset ring-red-600/15">
              {summary.overdue} tarefa(s) atrasada(s)
            </span>
          )}
          {summary.soon > 0 && (
            <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 ring-1 ring-inset ring-amber-600/15">
              {summary.soon} vencendo em até 48h
            </span>
          )}
        </div>
      )}

      <Card className="mb-5 p-4">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[1.4fr_repeat(4,1fr)_auto]">
          <div className="relative">
            <Input
              aria-label="Buscar tarefas"
              placeholder="Buscar por título ou descrição"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              leftIcon={<Search className="h-4 w-4" />}
            />
            {search && (
              <button type="button" onClick={clearSearch} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-700" aria-label="Limpar busca">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <Select aria-label="Filtrar por status" value={filters.status} onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value as TaskStatus | '' }))}>
            <option value="">Todos os status</option>
            <option value="PENDING">Pendente</option>
            <option value="IN_PROGRESS">Em andamento</option>
            <option value="COMPLETED">Concluída</option>
          </Select>
          <Select aria-label="Filtrar por prioridade" value={filters.priority} onChange={(e) => setFilters((f) => ({ ...f, priority: e.target.value as Priority | '' }))}>
            <option value="">Todas as prioridades</option>
            <option value="HIGH">Alta</option>
            <option value="MEDIUM">Média</option>
            <option value="LOW">Baixa</option>
          </Select>
          <Select aria-label="Filtrar por categoria" value={filters.categoryId} onChange={(e) => setFilters((f) => ({ ...f, categoryId: e.target.value }))}>
            <option value="">Todas as categorias</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
          <Select
            aria-label="Ordenar por"
            value={filters.sort}
            onChange={(e) => setFilters((f) => ({ ...f, sort: e.target.value as 'dueDate' | 'createdAt' | 'priority' }))}
          >
            <option value="dueDate">Ordenar por prazo</option>
            <option value="priority">Ordenar por prioridade</option>
            <option value="createdAt">Ordenar por criação</option>
          </Select>
          <Button
            variant="secondary"
            onClick={() => setFilters((f) => ({ ...f, order: f.order === 'asc' ? 'desc' : 'asc' }))}
            icon={<ArrowDownUp className={cn('h-4 w-4 transition', filters.order === 'desc' && 'rotate-180')} />}
            aria-label={filters.order === 'asc' ? 'Ordem crescente' : 'Ordem decrescente'}
          >
            {filters.order === 'asc' ? 'Crescente' : 'Decrescente'}
          </Button>
        </div>
      </Card>

      {loading && !data && <Spinner />}
      {error && <ErrorState message={error} onRetry={reload} />}
      {data && tasks.length === 0 && (
        <Card>
          <EmptyState
            icon={<ListTodo className="h-5 w-5" />}
            title={hasFilters ? 'Nenhuma tarefa encontrada' : 'Nenhuma tarefa cadastrada'}
            description={hasFilters ? 'Ajuste os filtros ou a busca.' : 'Cadastre suas atividades para receber sugestões de horários.'}
            action={!hasFilters ? <Button size="sm" onClick={() => setModal({ open: true, task: null })}>Criar tarefa</Button> : undefined}
          />
        </Card>
      )}
      {tasks.length > 0 && (
        <ul className={cn('space-y-2 transition-opacity', loading && 'opacity-60')}>
          {tasks.map((task) => (
            <TaskItem key={task.id} task={task} onToggle={toggle} onEdit={(t) => setModal({ open: true, task: t })} onDelete={setToDelete} />
          ))}
        </ul>
      )}

      <TaskFormModal open={modal.open} task={modal.task} onClose={() => setModal({ open: false })} onSaved={() => void reload()} />
      <ConfirmDialog
        open={!!toDelete}
        title="Excluir tarefa"
        message={`Deseja excluir "${toDelete?.title ?? ''}"? Esta ação não pode ser desfeita.`}
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
}
