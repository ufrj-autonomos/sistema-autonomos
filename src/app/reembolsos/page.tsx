import { requirePageUser } from '@/lib/session';
import { getMemberReimbursementsData } from '@/lib/finance/service';
import { MemberReimbursementsClient } from '@/components/finance/member-reimbursements-client';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Meus Reembolsos' };

export default async function MemberReimbursementsPage() {
  const user = await requirePageUser(false);
  const initialData = await getMemberReimbursementsData(user.id);
  const defaultTeam =
    user.teamSlug === 'harpia' ? 'Harpia' : user.teamSlug === 'nautilus' ? 'Nautilus' : 'Geral';

  return <MemberReimbursementsClient initialData={initialData} defaultTeam={defaultTeam} />;
}
