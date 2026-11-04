import type { ReactNode } from 'react';
import { requirePageUser } from '@/lib/session';
import { ManagementShell } from '@/components/gestao/management-shell';
import { InstitutionalSiteProvider } from '@/components/institutional/site-context';
export default async function ManagementLayout({ children }: { children: ReactNode }) {
  const user = await requirePageUser(true);
  return <ManagementShell initialUser={user}><InstitutionalSiteProvider origin={process.env.INSTITUTIONAL_SITE_URL || 'https://ufrjautonomos.com'}>{children}</InstitutionalSiteProvider></ManagementShell>;
}
