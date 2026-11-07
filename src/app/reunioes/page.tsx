import { Metadata } from 'next';
import { requirePageUser } from '@/lib/session';
import { getMeetingsDashboardData } from '@/lib/meetings/service';
import { MeetingsView } from '@/components/meetings/meetings-view';

export const metadata: Metadata = {
  title: 'Controle de Reuniões & Presença',
  description: 'Contabilidade de presenças em reuniões e métricas de engajamento da equipe.',
};

export default async function MeetingsPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const user = await requirePageUser();
  const { period = '26.2' } = await searchParams;
  const initialData = await getMeetingsDashboardData(user, period);

  return <MeetingsView initialData={initialData} user={user} />;
}

