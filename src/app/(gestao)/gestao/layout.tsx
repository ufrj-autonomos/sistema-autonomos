import type { ReactNode } from 'react';
import { requirePageUser } from '@/lib/session';
import { ManagementShell } from '@/components/gestao/management-shell';
export default async function ManagementLayout({ children }: { children: ReactNode }) {
  const user = await requirePageUser(true);
  return <ManagementShell initialUser={user}>{children}</ManagementShell>;
}
