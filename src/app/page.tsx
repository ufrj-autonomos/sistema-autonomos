import { redirect } from 'next/navigation';
import { MemberHome } from '@/components/workspace/member-home';
import { requirePageUser } from '@/lib/session';
import { hasManagementAccess } from '@/lib/access-policy';
export const dynamic = 'force-dynamic';
export default async function HomePage() {
  const user = await requirePageUser();
  if (hasManagementAccess(user.role)) redirect('/gestao');
  return <MemberHome user={user} />;
}
