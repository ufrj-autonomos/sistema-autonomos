import { requirePageUser } from '@/lib/session';
import { getGestaoStats } from '@/lib/gestao';
import { getNotificationsAdminDashboard } from '@/lib/notifications';
import { SystemStatus } from '@/components/gestao/system-status';
import { NotificationsAdminPanel } from '@/components/gestao/notifications-admin-panel';
import { SectionHeader } from '@/components/gestao/section-header';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Sistema — Gestão' };

export default async function SystemPage() {
  await requirePageUser(true);
  const [data, notificationsAdmin] = await Promise.all([
    getGestaoStats(),
    getNotificationsAdminDashboard(),
  ]);
  return (
    <div className="space-y-8">
      <SectionHeader
        title="Sistema"
        description="Consulte o estado da conexão, a autenticação, as notificações no app, o catálogo de ensino e os registros operacionais."
      />
      <SystemStatus system={data.system} logs={data.operationalLogs} />
      <NotificationsAdminPanel initialData={notificationsAdmin} />
    </div>
  );
}
