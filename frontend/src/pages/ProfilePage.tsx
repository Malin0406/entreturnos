import { zodResolver } from '@hookform/resolvers/zod';
import { KeyRound, Trash2, UserRound } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '../components/ui/Button';
import { Card, CardHeader } from '../components/ui/Card';
import { ConfirmDialog, PageHeader } from '../components/ui/Feedback';
import { Input } from '../components/ui/Field';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { errorMessage } from '../services/api';
import { userApi } from '../services/endpoints';
import { initials } from '../utils/cn';
import { formatDate } from '../utils/date';
import { passwordRule } from './auth/RegisterPage';

const profileSchema = z.object({
  name: z.string().trim().min(3, 'Informe o nome completo.').max(100),
  email: z.string().trim().min(1, 'Informe o e-mail.').email('E-mail inválido.'),
});
type ProfileValues = z.infer<typeof profileSchema>;

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Informe a senha atual.'),
    newPassword: passwordRule,
    confirmPassword: z.string().min(1, 'Confirme a nova senha.'),
  })
  .refine((d) => d.newPassword === d.confirmPassword, { message: 'As senhas não coincidem.', path: ['confirmPassword'] });
type PasswordValues = z.infer<typeof passwordSchema>;

export function ProfilePage() {
  const { user, updateUser, logout } = useAuth();
  const toast = useToast();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const profileForm = useForm<ProfileValues>({ resolver: zodResolver(profileSchema) });
  const passwordForm = useForm<PasswordValues>({ resolver: zodResolver(passwordSchema) });

  useEffect(() => {
    if (user) profileForm.reset({ name: user.name, email: user.email });
  }, [user, profileForm]);

  const saveProfile = async (values: ProfileValues) => {
    try {
      const { user: updated } = await userApi.updateProfile(values);
      updateUser(updated);
      toast.success('Dados pessoais atualizados.');
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  const savePassword = async (values: PasswordValues) => {
    try {
      const { message } = await userApi.changePassword(values);
      passwordForm.reset({ currentPassword: '', newPassword: '', confirmPassword: '' });
      toast.success(message);
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  const deleteAccount = async () => {
    setDeleting(true);
    try {
      await userApi.deleteAccount();
      toast.info('Sua conta e todos os dados foram excluídos.');
      logout();
    } catch (err) {
      toast.error(errorMessage(err));
      setDeleting(false);
    }
  };

  if (!user) return null;

  return (
    <div className="space-y-6">
      <PageHeader title="Meu perfil" description="Gerencie seus dados pessoais e a segurança da sua conta." />

      <Card className="flex flex-col items-center gap-4 p-6 sm:flex-row">
        <span className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-400 to-brand-500 text-2xl font-extrabold text-white">
          {initials(user.name)}
        </span>
        <div className="text-center sm:text-left">
          <p className="text-xl font-extrabold text-ink-900">{user.name}</p>
          <p className="text-sm text-ink-500">{user.email}</p>
          <p className="mt-1 text-xs text-ink-400">Membro desde {formatDate(user.createdAt)}</p>
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Dados pessoais" icon={<UserRound className="h-4 w-4" />} />
          <form onSubmit={profileForm.handleSubmit(saveProfile)} className="space-y-4 p-5" noValidate>
            <Input label="Nome completo" error={profileForm.formState.errors.name?.message} {...profileForm.register('name')} />
            <Input label="E-mail" type="email" error={profileForm.formState.errors.email?.message} {...profileForm.register('email')} />
            <div className="flex justify-end">
              <Button type="submit" loading={profileForm.formState.isSubmitting}>
                Salvar dados
              </Button>
            </div>
          </form>
        </Card>

        <Card>
          <CardHeader title="Alterar senha" icon={<KeyRound className="h-4 w-4" />} />
          <form onSubmit={passwordForm.handleSubmit(savePassword)} className="space-y-4 p-5" noValidate>
            <Input label="Senha atual" type="password" autoComplete="current-password" error={passwordForm.formState.errors.currentPassword?.message} {...passwordForm.register('currentPassword')} />
            <Input label="Nova senha" type="password" autoComplete="new-password" hint="Mínimo de 8 caracteres, com letras e números." error={passwordForm.formState.errors.newPassword?.message} {...passwordForm.register('newPassword')} />
            <Input label="Confirmação da nova senha" type="password" autoComplete="new-password" error={passwordForm.formState.errors.confirmPassword?.message} {...passwordForm.register('confirmPassword')} />
            <div className="flex justify-end">
              <Button type="submit" loading={passwordForm.formState.isSubmitting}>
                Alterar senha
              </Button>
            </div>
          </form>
        </Card>
      </div>

      <Card className="border-red-100 p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-bold text-ink-900">Excluir conta</p>
            <p className="text-sm text-ink-500">Remove permanentemente sua conta, tarefas, compromissos e histórico.</p>
          </div>
          <Button variant="danger" icon={<Trash2 className="h-4 w-4" />} onClick={() => setConfirmDelete(true)}>
            Excluir minha conta
          </Button>
        </div>
      </Card>

      <ConfirmDialog
        open={confirmDelete}
        title="Excluir conta permanentemente"
        message="Todos os seus dados serão apagados e não poderão ser recuperados. Deseja continuar?"
        confirmLabel="Excluir conta"
        loading={deleting}
        onConfirm={deleteAccount}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  );
}
