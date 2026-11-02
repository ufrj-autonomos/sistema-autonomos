import Link from 'next/link';
import { ExternalLink } from 'lucide-react';
import { InstitutionalSiteProvider } from '@/components/institutional/site-context';
import { Toaster } from 'sonner';
import { requirePageUser } from '@/lib/session';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Site institucional — Gestão' };
export default async function InstitutionalLayout({ children }: { children: React.ReactNode }) {
  await requirePageUser(true);
  return <InstitutionalSiteProvider origin={process.env.INSTITUTIONAL_SITE_URL || 'https://ufrjautonomos.com'}><div className="min-w-0"><div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4"><Link href="/gestao/site" className="text-sm font-medium text-foreground hover:underline">Administração do site institucional</Link><a href={process.env.INSTITUTIONAL_SITE_URL || 'https://ufrjautonomos.com'} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center text-sm text-muted-foreground hover:text-foreground">Ver site público<ExternalLink className="ml-2 h-4 w-4" /></a></div>{children}<Toaster theme="dark" richColors closeButton /></div></InstitutionalSiteProvider>;
}
