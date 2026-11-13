import { requirePageUser } from '@/lib/session';
import { getFinancialDashboardData } from '@/lib/finance/service';
import { ReimbursementsClient } from '@/components/gestao/reimbursements-client';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Reembolsos — Financeiro — Gestão' };

export default async function ReimbursementsPage() {
  const user = await requirePageUser(true);
  const initialData = await getFinancialDashboardData();
  return <ReimbursementsClient currentUserName={user.name} initialData={initialData} />;
}
