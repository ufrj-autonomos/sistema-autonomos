import { PendingMinutesBanner } from '@/components/meetings/pending-minutes-banner';
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
  searchParams: Promise<{ period?: string; area?: string; meeting?: string; ata?: string }>;
}) {
  const user = await requirePageUser();
  const params = await searchParams;
  const { period = '26.2' } = params;
  const initialData = await getMeetingsDashboardData(user, period);

  return <><div className="mx-auto max-w-[1680px] px-4 pt-6"><PendingMinutesBanner user={user} /></div><MeetingsView initialData={initialData} user={user} initialArea={params.area} initialMeetingId={params.meeting} openMinutes={params.ata === '1'} /></>;
}

