import { requirePageUser } from '@/lib/session';
import { hasManagementAccess } from '@/lib/access-policy';
import { getFeedbackDashboardData } from '@/lib/feedback/service';
import { MemberFeedbackClient } from '@/components/feedback/member-feedback-client';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Bugs, Melhorias & Ideias' };

export default async function MemberFeedbackPage() {
  const user = await requirePageUser(false);
  const initialData = await getFeedbackDashboardData(user, 'member');
  return (
    <MemberFeedbackClient
      initialData={initialData}
      canManage={hasManagementAccess(user.role)}
    />
  );
}
