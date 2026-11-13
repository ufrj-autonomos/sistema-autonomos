import Link from 'next/link';
import { ExternalLink } from 'lucide-react';
import { requirePageUser } from '@/lib/session';
import { SiteSubnav } from '@/components/institutional/site-subnav';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Site institucional — Gestão' };
export default async function InstitutionalLayout({ children }: { children: React.ReactNode }) {
  await requirePageUser(true);
  return <div className="min-w-0">
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <Link href="/gestao/site" className="text-sm font-medium text-foreground hover:underline">Administração do site institucional</Link>
      <a href={process.env.INSTITUTIONAL_SITE_URL || 'https://ufrjautonomos.com'} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-10 items-center rounded-lg border border-border px-3 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground">Ver site público<ExternalLink className="ml-2 h-3.5 w-3.5" /></a>
    </div>
    <SiteSubnav />
    {children}
  </div>;
}
