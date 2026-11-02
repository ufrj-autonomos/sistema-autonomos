import { requirePageUser } from '@/lib/session';
import { UserManagement } from '@/components/admin/user-management';
export const metadata = { title: 'Contas e permissões — Gestão' };
export default async function AccountsPage() {
  await requirePageUser(true);
  return <UserManagement standalone />;
}
