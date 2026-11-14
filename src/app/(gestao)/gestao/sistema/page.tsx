import { requirePageUser } from '@/lib/session';
import { getGestaoStats } from '@/lib/gestao';
import { getEmailLogsDashboard } from '@/lib/email-logs';
import { SystemStatus } from '@/components/gestao/system-status';
import { EmailLogsPanel } from '@/components/gestao/email-logs-panel';
import { SectionHeader } from '@/components/gestao/section-header';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Sistema — Gestão' };

export default async function SystemPage() {
  await requirePageUser(true);
  const [data, emailLogs] = await Promise.all([
    getGestaoStats(),
    getEmailLogsDashboard({ limit: 80 }),
  ]);
  return (
    <div className="space-y-8">
      <SectionHeader
        title="Sistema"
        description="Consulte o estado da conexão, a autenticação, o catálogo de ensino e o log de e-mails enviados aos membros."
      />
      <SystemStatus system={data.system} logs={data.operationalLogs} />
      <EmailLogsPanel initialData={emailLogs} />
    </div>
  );
}
