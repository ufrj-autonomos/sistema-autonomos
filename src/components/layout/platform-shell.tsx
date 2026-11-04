'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { ArrowLeft, LayoutDashboard } from 'lucide-react';
import { useSession } from '@/contexts/auth-context';
import { hasManagementAccess } from '@/lib/access-policy';
import { isManagementPage } from '@/lib/management-navigation';
import { AppShell } from '@/components/workspace/app-shell';
import { WorkspaceBrand } from '@/components/workspace/brand';
import { ThemeToggle } from '@/components/workspace/theme-control';

export function PlatformShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { user } = useSession();
  if (isManagementPage(pathname)) return children;
  const auth = ['/login', '/register', '/forgot-password', '/reset-password'].includes(pathname);
  const course = pathname === '/ensino' || pathname.startsWith('/curso/') || pathname.startsWith('/ensino/curso/');
  if (auth) return <div className="flex min-h-dvh flex-col bg-background"><header className="flex h-20 items-center justify-between gap-4 px-5 sm:px-10"><WorkspaceBrand href="/login" subtitle="Sistema da equipe" /><ThemeToggle /></header><main className="flex flex-1 flex-col">{children}</main><footer className="px-5 py-6 text-center text-xs text-muted-foreground">UFRJ Autônomos · Equipe de robótica da UFRJ</footer></div>;
  if (course) return <><header className="flex h-16 shrink-0 items-center justify-between gap-3 border-b border-border bg-card px-4 sm:px-7"><Link href={hasManagementAccess(user?.role) ? '/gestao' : '/'} className="inline-flex min-h-11 items-center gap-2 rounded-md text-sm text-muted-foreground hover:text-foreground"><ArrowLeft size={17} aria-hidden="true" /><span className="hidden sm:inline">{hasManagementAccess(user?.role) ? 'Voltar à gestão' : 'Meu espaço'}</span><span className="sm:hidden">Voltar</span></Link><Link href="/ensino" className="text-sm font-semibold">Autônomos <span className="ml-2 border-l border-border pl-2 font-normal text-muted-foreground">Ensino</span></Link><div className="flex items-center gap-1"><Link href={hasManagementAccess(user?.role) ? '/gestao' : '/perfil'} aria-label={hasManagementAccess(user?.role) ? 'Abrir gestão' : 'Meu perfil'} className="workspace-icon-button"><LayoutDashboard size={18} /></Link><ThemeToggle /></div></header><main className="course-workspace flex min-w-0 flex-1 flex-col">{children}</main></>;
  return <AppShell>{children}</AppShell>;
}
