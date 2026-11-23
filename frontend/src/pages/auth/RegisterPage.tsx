import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Field';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { errorMessage } from '../../services/api';

export const passwordRule = z
  .string()
  .min(8, 'A senha deve ter pelo menos 8 caracteres.')
  .max(72, 'Máximo de 72 caracteres.')
  .regex(/[A-Za-z]/, 'A senha deve conter ao menos uma letra.')
  .regex(/\d/, 'A senha deve conter ao menos um número.');

const schema = z
  .object({
    name: z.string().trim().min(3, 'Informe o nome completo.').max(100),
    email: z.string().trim().min(1, 'Informe o e-mail.').email('E-mail inválido.'),
    password: passwordRule,
    confirmPassword: z.string().min(1, 'Confirme a senha.'),
  })
  .refine((d) => d.password === d.confirmPassword, { message: 'As senhas não coincidem.', path: ['confirmPassword'] });

type FormValues = z.infer<typeof schema>;

export function RegisterPage() {
  const { register: signUp } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: FormValues) => {
    setError(null);
    try {
      await signUp(values);
      toast.success('Conta criada! Comece cadastrando seus compromissos fixos.');
      navigate('/', { replace: true });
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  return (
    <div>
      <h1 className="text-3xl font-extrabold tracking-tight text-ink-900">Crie sua conta</h1>
      <p className="mt-2 text-sm text-ink-500">Leva menos de um minuto. Depois é só cadastrar sua rotina.</p>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-4" noValidate>
        <Input label="Nome completo" autoComplete="name" placeholder="Seu nome" error={errors.name?.message} {...register('name')} />
        <Input label="E-mail" type="email" autoComplete="email" placeholder="voce@exemplo.com" error={errors.email?.message} {...register('email')} />
        <Input
          label="Senha"
          type="password"
          autoComplete="new-password"
          hint="Mínimo de 8 caracteres, com letras e números."
          error={errors.password?.message}
          {...register('password')}
        />
        <Input
          label="Confirmação de senha"
          type="password"
          autoComplete="new-password"
          error={errors.confirmPassword?.message}
          {...register('confirmPassword')}
        />
        {error && (
          <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
            {error}
          </p>
        )}
        <Button type="submit" size="lg" className="w-full" loading={isSubmitting}>
          Criar conta
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-ink-500">
        Já tem conta?{' '}
        <Link to="/login" className="font-semibold text-brand-700 hover:underline">
          Entrar
        </Link>
      </p>
    </div>
  );
}
