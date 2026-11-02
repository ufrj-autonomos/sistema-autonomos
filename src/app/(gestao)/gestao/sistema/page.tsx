import { requirePageUser } from '@/lib/session';
import { getGestaoStats } from '@/lib/gestao';
import { SystemStatus } from '@/components/gestao/system-status';
import { SectionHeader } from '@/components/gestao/section-header';
export const metadata = { title: 'Sistema — Gestão' };
export default async function SystemPage() {
  await requirePageUser(true);
  const data = await getGestaoStats();
  return <><SectionHeader title="Sistema" description="Consulte o estado da conexão, a autenticação e o conteúdo de ensino verificado nesta consulta." /><SystemStatus system={data.system} logs={data.operationalLogs} /></>;
}
