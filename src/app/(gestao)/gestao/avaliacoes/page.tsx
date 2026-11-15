import { redirect } from 'next/navigation';
import { requirePageUser } from '@/lib/session';
import { canAccessEvaluations, getEvaluationsWorkspace } from '@/lib/evaluations/service';
import { EvaluationsClient } from '@/components/gestao/evaluations-client';

export const dynamic = 'force-dynamic';
export const metadata = {
  title: 'Avaliações Mensais — Gestão',
  description: 'Avaliação mensal de membros, notas das áreas e coordenação.',
};

export default async function EvaluationsPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const user = await requirePageUser(true);
  if (!canAccessEvaluations(user.role)) {
    redirect('/gestao');
  }

  const params = await searchParams;
  const initialData = await getEvaluationsWorkspace(user, params.period);

  return <EvaluationsClient initialData={initialData} />;
}
