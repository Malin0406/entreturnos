import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { z } from 'zod';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Field';
import { useToast } from '../../contexts/ToastContext';
import { errorMessage } from '../../services/api';
import { authApi } from '../../services/endpoints';
import { passwordRule } from './RegisterPage';

const schema = z
  .object({ password: passwordRule, confirmPassword: z.string().min(1, 'Confirme a senha.') })
  .refine((d) => d.password === d.confirmPassword, { message: 'As senhas não coincidem.', path: ['confirmPassword'] });
type FormValues = z.infer<typeof schema>;

export function ResetPasswordPage() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const navigate = useNavigate();
  const toast = useToast();
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: FormValues) => {
    setError(null);
    try {
      const { message } = await authApi.resetPassword({ token, ...values });
      toast.success(message);
      navigate('/login', { replace: true });
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  if (!token) {
    return (
      <div>
        <h1 className="text-2xl font-extrabold text-ink-900">Link inválido</h1>
        <p className="mt-2 text-sm text-ink-500">O link de redefinição está incompleto ou expirou.</p>
        <Link to="/esqueci-senha" className="mt-6 inline-block font-semibold text-brand-700 hover:underline">
          Solicitar novo link
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-3xl font-extrabold tracking-tight text-ink-900">Definir nova senha</h1>
      <p className="mt-2 text-sm text-ink-500">Escolha uma senha forte que você não use em outros serviços.</p>
      <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-4" noValidate>
        <Input label="Nova senha" type="password" autoComplete="new-password" hint="Mínimo de 8 caracteres, com letras e números." error={errors.password?.message} {...register('password')} />
        <Input label="Confirmação da nova senha" type="password" autoComplete="new-password" error={errors.confirmPassword?.message} {...register('confirmPassword')} />
        {error && (
          <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
            {error}
          </p>
        )}
        <Button type="submit" size="lg" className="w-full" loading={isSubmitting}>
          Salvar nova senha
        </Button>
      </form>
    </div>
  );
}
