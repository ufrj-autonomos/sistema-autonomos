import { requirePageUser } from '@/lib/session';
import { getInventoryDashboardData } from '@/lib/assets/service';
import { AssetsClient } from '@/components/gestao/assets-client';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Patrimônio — Financeiro — Gestão' };

export default async function AssetsPage() {
  await requirePageUser(true);
  const initialData = await getInventoryDashboardData();
  return <AssetsClient initialData={initialData} />;
}
