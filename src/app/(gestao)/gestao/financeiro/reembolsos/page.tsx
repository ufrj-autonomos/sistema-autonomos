import { requirePageUser } from '@/lib/session';
import { ReimbursementsClient } from '@/components/gestao/reimbursements-client';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Reembolsos — Financeiro — Gestão' };

export default async function ReimbursementsPage() {
  const user = await requirePageUser(true);
  return <ReimbursementsClient currentUserName={user.name} />;
}
