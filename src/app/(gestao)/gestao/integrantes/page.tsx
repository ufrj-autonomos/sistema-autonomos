import { requirePageUser } from '@/lib/session';
import { getGestaoStats } from '@/lib/gestao';
import { TeamRoster } from '@/components/gestao/team-roster';
import { SectionHeader } from '@/components/gestao/section-header';
export const metadata = { title: 'Integrantes — Gestão' };
export default async function MembersPage() {
  await requirePageUser(true);
  const data = await getGestaoStats();
  return <><SectionHeader title="Integrantes" description="Consulte as pessoas da equipe por divisão, área de atuação ou nome." /><TeamRoster initialMembers={data.members} /></>;
}
