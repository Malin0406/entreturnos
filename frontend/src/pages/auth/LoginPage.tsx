import { zodResolver } from '@hookform/resolvers/zod';
import { Lock, Mail } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Field';
import { useAuth } from '../../contexts/AuthContext';
import { errorMessage } from '../../services/api';

const schema = z.object({
  email: z.string().trim().min(1, 'Informe o e-mail.').email('E-mail inválido.'),
  password: z.string().min(1, 'Informe a senha.'),
});

type FormValues = z.infer<typeof schema>;

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState<string | null>(null);
  const from = (location.state as { from?: string } | null)?.from ?? '/';

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: FormValues) => {
    setError(null);
    try {
      await login(values.email, values.password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  const fillDemo = () => {
    setValue('email', 'demo@entreturnos.com', { shouldValidate: true });
    setValue('password', 'Demo@1234', { shouldValidate: true });
  };

  return (
    <div>
      <h1 className="text-3xl font-extrabold tracking-tight text-ink-900">Bem-vindo de volta</h1>
      <p className="mt-2 text-sm text-ink-500">Entre para organizar sua rotina e aproveitar melhor seu tempo.</p>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-4" noValidate>
        <Input
          label="E-mail"
          type="email"
          autoComplete="email"
          placeholder="voce@exemplo.com"
          leftIcon={<Mail className="h-4 w-4" />}
          error={errors.email?.message}
          {...register('email')}
        />
        <Input
          label="Senha"
          type="password"
          autoComplete="current-password"
          placeholder="••••••••"
          leftIcon={<Lock className="h-4 w-4" />}
          error={errors.password?.message}
          {...register('password')}
        />
        <div className="flex justify-end">
          <Link to="/esqueci-senha" className="text-sm font-semibold text-brand-700 hover:underline">
            Esqueci minha senha
          </Link>
        </div>
        {error && (
          <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
            {error}
          </p>
        )}
        <Button type="submit" size="lg" className="w-full" loading={isSubmitting}>
          Entrar
        </Button>
      </form>

      <div className="mt-6 rounded-xl border border-dashed border-brand-300 bg-brand-50/60 p-4">
        <p className="text-sm font-semibold text-brand-800">Conta de demonstração</p>
        <p className="mt-0.5 text-xs text-brand-800/80">demo@entreturnos.com · Demo@1234</p>
        <button type="button" onClick={fillDemo} className="mt-2 text-xs font-bold text-brand-700 hover:underline">
          Preencher automaticamente
        </button>
      </div>

      <p className="mt-6 text-center text-sm text-ink-500">
        Ainda não tem conta?{' '}
        <Link to="/cadastro" className="font-semibold text-brand-700 hover:underline">
          Cadastre-se
        </Link>
      </p>
    </div>
  );
}
