import { requirePageUser } from '@/lib/session';
import { ManagementOverview } from '@/components/gestao/management-overview';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Visão geral — Gestão' };
export default async function GestaoPage() {
  const user = await requirePageUser(true);
  return <ManagementOverview name={user.name} />;
}
