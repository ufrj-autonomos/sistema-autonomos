import { requirePageUser } from '@/lib/session';
import { getFinancialDashboardData } from '@/lib/finance/service';
import { CashbookClient } from '@/components/gestao/cashbook-client';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Livro Caixa — Financeiro — Gestão' };

export default async function CashbookPage() {
  await requirePageUser(true);
  const initialData = await getFinancialDashboardData();
  return <CashbookClient initialData={initialData} />;
}
