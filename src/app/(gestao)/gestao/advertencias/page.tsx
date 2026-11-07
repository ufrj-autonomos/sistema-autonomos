import { requirePageUser } from '@/lib/session';
import { getDisciplinaryDashboardData } from '@/lib/disciplinary/service';
import { DisciplinaryManagement } from '@/components/gestao/disciplinary-management';

export const metadata = {
  title: 'Gestão Disciplinar — Gestão',
  description: 'Acompanhamento de avisos e advertências dos integrantes da equipe.',
};

export const dynamic = 'force-dynamic';

export default async function DisciplinaryPage() {
  const user = await requirePageUser(true);
  const data = await getDisciplinaryDashboardData(user);

  return <DisciplinaryManagement initialData={data} currentUserId={user.id} />;
}

