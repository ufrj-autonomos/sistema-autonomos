import { MemberHome } from '@/components/workspace/member-home';
import { requirePageUser } from '@/lib/session';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Meu espaço' };
export default async function PersonalWorkspacePage() {
  return <MemberHome user={await requirePageUser()} />;
}
