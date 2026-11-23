import { Compass } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { EmptyState } from '../components/ui/Feedback';

export function NotFoundPage() {
  return (
    <Card>
      <EmptyState
        icon={<Compass className="h-5 w-5" />}
        title="Página não encontrada"
        description="O endereço acessado não existe ou foi movido."
        action={
          <Link to="/" className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700">
            Voltar para a visão geral
          </Link>
        }
      />
    </Card>
  );
}
