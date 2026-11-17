'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Boxes, ChartNoAxesCombined, ClipboardCheck, ScrollText, ArrowLeft, ArrowUpRight, ChevronRight, ChevronDown, Clock3, LayoutDashboard, Lightbulb, Globe, LogOut, Mail, Menu, Network, Server, ShieldAlert, ShieldCheck, Users, UserMinus, Wallet, Eye, FolderKanban, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ThemeToggle } from '@/components/layout/theme-toggle';
import { NotificationBell } from '@/components/layout/notification-bell';
import { hasManagementAccess, ROLE_LABELS } from '@/lib/access-policy';
import { useSession } from '@/contexts/auth-context';
import type { SafeUser } from '@/lib/session';
import { getManagementSection, managementSectionsForRole, INSTITUTIONAL_LINKS } from '@/lib/management-navigation';

const icons = {
  analytics: ChartNoAxesCombined,
  logs: ScrollText,
  overview: LayoutDashboard,
  accounts: ShieldCheck,
  members: Users,
  alumni: UserMinus,
  disciplinary: ShieldAlert,
  evaluations: ClipboardCheck,
  attendance: Clock3,
  divisions: Network,
  finance: Wallet,
  assets: Boxes,
  siteMembers: Eye,
  projects: FolderKanban,
  feedback: Lightbulb,
  emails: Mail,
  system: Server,
  institutional: Globe,
};
const focus = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring';

export function ManagementShell({
  children,
  initialUser,
  initialBadges,
}: {
  children: ReactNode;
  initialUser: SafeUser;
  initialBadges?: Record<string, number>;
}) {
  const pathname = usePathname();
  const section = getManagementSection(pathname);
  const { user, isLoading, logout } = useSession();
  const router = useRouter();
  const mobileMenu = useRef<HTMLDialogElement>(null);
  const menuTrigger = useRef<HTMLButtonElement>(null);
  const [leaving, setLeaving] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  const [badges, setBadges] = useState<Record<string, number>>(initialBadges ?? {});
  const currentUser = user || initialUser;
  const isQr = pathname === '/gestao/presenca/qr';

  const refreshBadges = useCallback(async () => {
    try {
      const res = await fetch('/api/gestao/pendencies', { cache: 'no-store' });
      if (!res.ok) return;
      const json = (await res.json()) as { navBadges?: Record<string, number> };
      if (json?.navBadges) setBadges(json.navBadges);
    } catch {
      // ignora erro transiente em atualização silenciosa
    }
  }, []);

  useEffect(() => {
    void refreshBadges();
  }, [pathname, refreshBadges]);

  useEffect(() => {
    const onFocus = () => void refreshBadges();
    window.addEventListener('focus', onFocus);
    window.addEventListener('gestao-pendencies-refresh', onFocus);
    const interval = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        void refreshBadges();
      }
    }, 60_000);
    return () => {
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('gestao-pendencies-refresh', onFocus);
      window.clearInterval(interval);
    };
  }, [refreshBadges]);

  const totalSidebarPendencies = useMemo(
    () =>
      Object.entries(badges).reduce(
        (acc, [href, count]) => (href === '/gestao' ? acc : acc + (count || 0)),
        0
      ),
    [badges]
  );

  function toggleGroup(group: string) {
    setCollapsedGroups(prev => ({ ...prev, [group]: !prev[group] }));
  }
  useEffect(() => { mobileMenu.current?.close(); }, [pathname]);
  useEffect(() => {
    const desktop = window.matchMedia('(min-width: 1024px)');
    const closeOnDesktop = () => { if (desktop.matches) mobileMenu.current?.close(); };
    desktop.addEventListener('change', closeOnDesktop);
    return () => desktop.removeEventListener('change', closeOnDesktop);
  }, []);
  useEffect(() => { if (!isLoading && user && !hasManagementAccess(user)) router.replace('/'); }, [user, isLoading, router]);
  function closeMenu() { mobileMenu.current?.close(); menuTrigger.current?.focus(); }
  async function signOut() { setLeaving(true); try { await logout(); } finally { setLeaving(false); } }
  function navigation(mobile = false) {
    return <div className="flex h-full min-h-0 flex-col">
      <div className="flex min-h-20 items-center justify-between border-b border-border px-5">
        <Link href="/gestao" onClick={() => mobile && closeMenu()} className={`flex items-center gap-3 rounded-sm ${focus}`} aria-label="Gestão UFRJ Autônomos, visão geral">
          <span aria-hidden="true"><img src="/images/logos/autonomos/symbol-white.svg" alt="" width={32} height={32} className="brand-dark h-8 w-8" /><img src="/images/logos/autonomos/symbol-dark.svg" alt="" width={32} height={32} className="brand-light h-8 w-8" /></span>
          <span><span className="block text-sm font-semibold text-foreground">UFRJ Autônomos</span><span className="mt-0.5 block text-xs text-muted-foreground">Área de gestão</span></span>
        </Link>
        {mobile && <button type="button" onClick={closeMenu} aria-label="Fechar menu da gestão" className={`flex h-11 w-11 items-center justify-center rounded-lg text-secondary-foreground hover:bg-accent ${focus}`}><X className="h-5 w-5" /></button>}
      </div>
      <nav aria-label="Sistemas de gestão" className="flex-1 overflow-y-auto px-3 py-6">
        {['Principal', 'Pessoas', 'Financeiro', 'Site', 'Sistema'].map(group => {
          const items = managementSectionsForRole(currentUser).filter(item => item.group === group);
          if (!items.length) return null;
          const isPrincipal = group === 'Principal';
          const isGroupActive = items.some(item => section?.href === item.href);
          const groupPendingCount = items.reduce(
            (sum, item) => (item.href === '/gestao' ? sum : sum + (badges[item.href] ?? 0)),
            0
          );
          // Se o grupo tiver pendências ativas ou rota ativa, inicia expandido (salvo recolhimento manual)
          const isCollapsed =
            !isPrincipal && (collapsedGroups[group] ?? (!isGroupActive && groupPendingCount === 0));

          return (
            <div key={group} className="mb-5 last:mb-0">
              {isPrincipal ? (
                <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{group}</p>
              ) : (
                <button
                  type="button"
                  onClick={() => toggleGroup(group)}
                  aria-expanded={!isCollapsed}
                  className={`flex w-full items-center justify-between gap-2 rounded-md px-3 py-1.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground hover:bg-accent/40 hover:text-foreground transition-colors cursor-pointer ${focus}`}
                >
                  <span>{group}</span>
                  <span className="flex items-center gap-1.5">
                    {groupPendingCount > 0 && (
                      <span
                        aria-label={`${groupPendingCount} pendência(s) em ${group}`}
                        className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-yellow-500/20 px-1.5 font-mono text-[10px] font-bold text-yellow-700 dark:text-yellow-300 tabular-nums"
                      >
                        {groupPendingCount > 99 ? '99+' : groupPendingCount}
                      </span>
                    )}
                    <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${isCollapsed ? '-rotate-90 text-muted-foreground/60' : 'rotate-0 text-muted-foreground'}`} />
                  </span>
                </button>
              )}
              {!isCollapsed && (
                <ul className="mt-1 space-y-1">
                  {items.map(item => {
                    const active = section?.href === item.href;
                    const Icon = icons[item.icon];
                    const badgeCount = badges[item.href] ?? 0;
                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          onClick={() => mobile && closeMenu()}
                          aria-current={active && !isQr ? 'page' : undefined}
                          className={`flex min-h-10 items-center gap-3 rounded-lg px-3 py-2 text-sm ${focus} ${
                            active
                              ? 'bg-accent font-medium text-foreground'
                              : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'
                          }`}
                        >
                          <Icon aria-hidden="true" className="h-[18px] w-[18px] shrink-0" />
                          <span className="min-w-0 flex-1 truncate">{item.label}</span>
                          {badgeCount > 0 && (
                            <span
                              aria-label={`${badgeCount} pendência(s)`}
                              className={cn(
                                'ml-auto inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full px-1.5 font-mono text-[11px] font-bold tabular-nums',
                                item.href === '/gestao'
                                  ? 'border border-primary/30 bg-primary/15 text-primary'
                                  : 'bg-yellow-400 text-zinc-950 shadow-2xs'
                              )}
                            >
                              {badgeCount > 99 ? '99+' : badgeCount}
                            </span>
                          )}
                        </Link>
                        {active && item.icon === 'institutional' && (
                          <ul className="ml-8 mt-1 border-l border-border pl-2">
                            {INSTITUTIONAL_LINKS.map(([label, path]) => (
                              <li key={path}>
                                <Link
                                  href={`/gestao/site${path}`}
                                  onClick={() => mobile && closeMenu()}
                                  aria-current={pathname === `/gestao/site${path}` ? 'page' : undefined}
                                  className={`flex min-h-9 items-center rounded-md px-3 py-1.5 text-xs ${focus} ${
                                    pathname === `/gestao/site${path}`
                                      ? 'font-medium text-foreground underline underline-offset-4'
                                      : 'text-muted-foreground hover:text-foreground'
                                  }`}
                                >
                                  {label}
                                </Link>
                              </li>
                            ))}
                          </ul>
                        )}
                        {active && item.icon === 'attendance' && (
                          <ul className="ml-8 mt-1 border-l border-border pl-2">
                            <li>
                              <Link
                                href="/gestao/presenca/qr"
                                onClick={() => mobile && closeMenu()}
                                aria-current={isQr ? 'page' : undefined}
                                className={`flex min-h-11 items-center rounded-md px-3 text-sm ${focus} ${
                                  isQr
                                    ? 'text-foreground underline underline-offset-4'
                                    : 'text-muted-foreground hover:text-foreground'
                                }`}
                              >
                                QR para impressão
                              </Link>
                            </li>
                          </ul>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          );
        })}
      </nav>
      <div className="border-t border-border p-3">
        <Link href="/" className={`flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm text-secondary-foreground hover:bg-accent ${focus}`}><ArrowLeft className="h-[18px] w-[18px]" />Área do membro<ArrowUpRight className="ml-auto h-4 w-4 text-muted-foreground" /></Link>
        <div className="mt-3 flex items-center gap-3 border-t border-border px-3 pt-4">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent text-sm font-semibold" aria-hidden="true">{currentUser.name.slice(0, 1).toLocaleUpperCase('pt-BR')}</div>
          <div className="min-w-0 flex-1"><p className="truncate text-sm text-foreground" title={currentUser.name}>{currentUser.name}</p><p className="mt-0.5 text-xs text-muted-foreground">{ROLE_LABELS[currentUser.role as keyof typeof ROLE_LABELS] || 'Conta aprovada'}</p></div>
          <button type="button" disabled={leaving} onClick={() => void signOut()} aria-label={leaving ? 'Saindo da conta' : 'Sair da conta'} title="Sair da conta" className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-50 ${focus}`}><LogOut className="h-[18px] w-[18px]" /></button>
        </div>
      </div>
    </div>;
  }
  return <div className="management-workspace min-h-dvh w-full bg-background text-foreground">
    <a href="#management-content" className="fixed left-4 top-3 z-[100] -translate-y-24 rounded-lg bg-primary px-4 py-3 text-primary-foreground focus:translate-y-0">Ir para o conteúdo</a>
    <aside aria-label="Navegação da gestão" className="fixed inset-y-0 left-0 z-40 hidden w-64 border-r border-border bg-background lg:block print:hidden">{navigation()}</aside>
    <dialog ref={mobileMenu} aria-label="Menu da gestão" onClick={event => { if (event.target === event.currentTarget) closeMenu(); }} className="fixed inset-y-0 left-0 m-0 h-dvh max-h-none w-80 max-w-[90vw] border-0 bg-background p-0 text-foreground backdrop:bg-black/70 lg:hidden print:hidden">
      {navigation(true)}
    </dialog>
    <div className="min-w-0 lg:pl-64 print:pl-0">
      <header className="sticky top-0 z-30 flex min-h-16 items-center gap-3 border-b border-border bg-background px-3 sm:px-5 lg:px-6 print:hidden">
        <button ref={menuTrigger} type="button" onClick={() => mobileMenu.current?.showModal()} aria-label={totalSidebarPendencies > 0 ? `Abrir menu da gestão (${totalSidebarPendencies} pendências)` : 'Abrir menu da gestão'} aria-haspopup="dialog" className={`relative -ml-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-secondary-foreground hover:bg-accent lg:hidden ${focus}`}>
          <Menu className="h-5 w-5" />
          {totalSidebarPendencies > 0 && (
            <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-yellow-400 px-1 font-mono text-[9px] font-bold leading-none text-zinc-950 ring-2 ring-background tabular-nums">
              {totalSidebarPendencies > 99 ? '99+' : totalSidebarPendencies}
            </span>
          )}
        </button>
        <nav aria-label="Localização" className="min-w-0 flex-1"><ol className="flex items-center gap-2 text-sm"><li><Link href="/gestao" className={`rounded-sm text-muted-foreground hover:text-foreground ${focus}`}>Gestão</Link></li><li aria-hidden="true"><ChevronRight className="h-3.5 w-3.5 text-muted-foreground" /></li><li className="truncate text-foreground">{isQr ? <Link href="/gestao/presenca" className={`rounded-sm hover:text-foreground ${focus}`}>{section?.label}</Link> : <span aria-current="page">{section?.label || 'Página não encontrada'}</span>}</li>{isQr && <><li aria-hidden="true"><ChevronRight className="h-3.5 w-3.5 text-muted-foreground" /></li><li aria-current="page" className="truncate text-foreground">QR code</li></>}</ol></nav>
        <ThemeToggle /><NotificationBell /><span className="hidden items-center gap-2 text-xs text-muted-foreground sm:inline-flex"><ShieldCheck className="h-4 w-4" />Acesso à gestão</span>
      </header>
      <main id="management-content" tabIndex={-1} className="mx-auto w-full max-w-[1720px] min-w-0 overflow-x-clip px-2.5 sm:px-4 lg:px-6 py-5 sm:py-7 outline-none print:p-0">{children}</main>
    </div>
  </div>;
}
