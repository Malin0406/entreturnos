import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, MailCheck } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { z } from 'zod';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Field';
import { errorMessage } from '../../services/api';
import { authApi } from '../../services/endpoints';

const schema = z.object({ email: z.string().trim().min(1, 'Informe o e-mail.').email('E-mail inválido.') });
type FormValues = z.infer<typeof schema>;

export function ForgotPasswordPage() {
  const [result, setResult] = useState<{ message: string; resetToken: string | null } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: FormValues) => {
    setError(null);
    try {
      setResult(await authApi.forgotPassword(values.email));
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  return (
    <div>
      <Link to="/login" className="mb-6 inline-flex items-center gap-1.5 text-sm font-semibold text-ink-500 hover:text-ink-900">
        <ArrowLeft className="h-4 w-4" /> Voltar ao login
      </Link>
      <h1 className="text-3xl font-extrabold tracking-tight text-ink-900">Recuperar acesso</h1>
      <p className="mt-2 text-sm text-ink-500">Informe seu e-mail para gerar um link de redefinição de senha.</p>

      {result ? (
        <div className="mt-8 rounded-2xl border border-brand-200 bg-brand-50 p-5">
          <MailCheck className="h-6 w-6 text-brand-600" aria-hidden />
          <p className="mt-2 text-sm font-semibold text-brand-900">{result.message}</p>
          {result.resetToken ? (
            <>
              <p className="mt-2 text-xs text-brand-800">
                Ambiente de desenvolvimento: como esta versão não envia e-mails, o link de redefinição é exibido aqui (e
                também no console da API).
              </p>
              <Link
                to={`/redefinir-senha?token=${result.resetToken}`}
                className="mt-4 inline-flex rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
              >
                Redefinir minha senha
              </Link>
            </>
          ) : (
            <p className="mt-2 text-xs text-brand-800">Verifique as instruções recebidas para continuar.</p>
          )}
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-4" noValidate>
          <Input label="E-mail" type="email" autoComplete="email" error={errors.email?.message} {...register('email')} />
          {error && (
            <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
              {error}
            </p>
          )}
          <Button type="submit" size="lg" className="w-full" loading={isSubmitting}>
            Gerar link de redefinição
          </Button>
        </form>
      )}
    </div>
  );
}
