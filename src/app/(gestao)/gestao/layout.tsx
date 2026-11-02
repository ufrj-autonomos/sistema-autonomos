import type { ReactNode } from 'react';
import { requirePageUser } from '@/lib/session';
import { ManagementShell } from '@/components/gestao/management-shell';
import { InstitutionalSiteProvider } from '@/components/institutional/site-context';
import { Toaster } from 'sonner';
export default async function ManagementLayout({ children }: { children: ReactNode }) {
  const user = await requirePageUser(true);
  return <ManagementShell initialUser={user}><InstitutionalSiteProvider origin={process.env.INSTITUTIONAL_SITE_URL || 'https://ufrjautonomos.com'}>{children}<Toaster theme="dark" richColors closeButton /></InstitutionalSiteProvider></ManagementShell>;
}
