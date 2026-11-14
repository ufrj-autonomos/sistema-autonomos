import { requirePageUser } from '@/lib/session';
import { getGestaoStats } from '@/lib/gestao';
import { SystemStatus } from '@/components/gestao/system-status';
import { SectionHeader } from '@/components/gestao/section-header';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Sistema — Gestão' };

export default async function SystemPage() {
  await requirePageUser(true);
  const data = await getGestaoStats();
  return (
    <div className="space-y-8">
      <SectionHeader
        title="Sistema"
        description="Consulte o estado da conexão, a autenticação, o catálogo de ensino e os registros operacionais."
      />
      <SystemStatus system={data.system} logs={data.operationalLogs} />
    </div>
  );
}
