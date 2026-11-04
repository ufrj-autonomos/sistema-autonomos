'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ArrowRight, BookOpen, Check, ChevronDown, ChevronRight, Clock3, Globe, Home, LayoutDashboard, LogOut, Menu, Network, Search, Server, ShieldCheck, UserRound, Users, X, type LucideIcon } from 'lucide-react';
import { useSession, type SafeUser } from '@/contexts/auth-context';
import { hasManagementAccess, ROLE_LABELS } from '@/lib/access-policy';
import { getManagementSection } from '@/lib/management-navigation';
import { jumpLinks, workspaceLinks } from '@/lib/workspace-navigation';
import { WorkspaceBrand } from './brand';
import { ThemeChoices, ThemeToggle } from './theme-control';

const icons: Record<string, LucideIcon> = { home: Home, overview: LayoutDashboard, accounts: ShieldCheck, members: Users, attendance: Clock3, divisions: Network, system: Server, institutional: Globe, courses: BookOpen, profile: UserRound };

export function AppShell({ children, management = false, initialUser }: { children: ReactNode; management?: boolean; initialUser?: SafeUser }) {
  const { user, logout } = useSession();
  const person = user || initialUser;
  const staff = hasManagementAccess(person?.role);
  const pathname = usePathname();
  const links = workspaceLinks(management, staff);
  const destinations = jumpLinks(management, staff);
  const current = management ? getManagementSection(pathname) : links.find(item => pathname === item.href || (item.href !== '/' && pathname.startsWith(`${item.href}/`)));
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [leaving, setLeaving] = useState(false);
  const menu = useRef<HTMLDialogElement>(null);
  const search = useRef<HTMLDialogElement>(null);
  const menuTrigger = useRef<HTMLButtonElement>(null);
  const searchTrigger = useRef<HTMLButtonElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  const groups = management ? ['Principal', 'Pessoas', 'Operação', 'Plataforma'] : ['Meu espaço'];
  const title = pathname === '/gestao/presenca/qr' ? 'QR do laboratório' : current?.label || 'Meu espaço';
  const filtered = destinations.filter(item => `${item.label} ${item.description}`.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR').includes(query.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR')));
  function openMenu() { previousFocus.current = document.activeElement as HTMLElement; menu.current?.showModal(); setMenuOpen(true); }
  function openSearch() { previousFocus.current = document.activeElement as HTMLElement; setQuery(''); search.current?.showModal(); setSearchOpen(true); }
  function closeDialogs() { menu.current?.close(); search.current?.close(); }
  useEffect(() => { menu.current?.close(); search.current?.close(); }, [pathname]);
  useEffect(() => {
    if (!menuOpen && !searchOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previous; };
  }, [menuOpen, searchOpen]);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); if (menu.current?.open) menu.current.close(); openSearch(); } };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  function onClosed(kind: 'menu' | 'search') { if (kind === 'menu') setMenuOpen(false); else setSearchOpen(false); previousFocus.current?.focus(); }
  async function signOut() { setLeaving(true); try { await logout(); } finally { setLeaving(false); } }
  function active(href: string) { return current?.href === href; }
  function navigation(mobile = false) {
    return <nav aria-label={management ? 'Ferramentas da gestão' : 'Meu espaço'} className="space-y-6">{groups.map(group => <div key={group}><p className="mb-2 px-3 text-xs font-medium text-muted-foreground">{group}</p><ul className="space-y-1">{links.filter(item => !('group' in item) || item.group === group).map(item => { const Icon = icons[item.icon] || Home; return <li key={item.href}><Link href={item.href} onClick={() => mobile && closeDialogs()} aria-current={active(item.href) ? 'page' : undefined} className={`workspace-nav-link ${active(item.href) ? 'workspace-nav-active' : ''}`}><Icon size={18} strokeWidth={1.7} aria-hidden="true" /><span>{item.label}</span></Link></li>; })}</ul></div>)}</nav>;
  }
  const home = management ? '/gestao' : staff ? '/meu-espaco' : '/';
  const bottom = management ? [{ href: '/gestao', label: 'Painel', icon: LayoutDashboard }, { href: '/gestao/integrantes', label: 'Integrantes', icon: Users }, { href: '/gestao/presenca', label: 'Presença', icon: Clock3 }] : [{ href: home, label: 'Início', icon: Home }, { href: '/presenca', label: 'Presença', icon: Clock3 }, { href: '/ensino', label: 'Cursos', icon: BookOpen }];
  return <div className="workspace min-h-dvh w-full bg-background text-foreground">
    <a href="#workspace-content" className="workspace-skip">Ir para o conteúdo</a>
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-border bg-card lg:flex print:hidden" aria-label="Navegação principal">
      <div className="flex min-h-20 items-center px-6"><WorkspaceBrand href={home} subtitle={management ? 'Área de gestão' : 'Meu espaço'} /></div>
      {staff && <div className="mx-4 mb-5 grid grid-cols-2 gap-1 rounded-lg border border-border bg-background p-1" aria-label="Alternar espaço de trabalho"><Link href="/gestao" aria-current={management ? 'true' : undefined} className={`flex min-h-9 items-center justify-center rounded-md text-xs font-medium ${management ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent'}`}>Gestão</Link><Link href="/meu-espaco" aria-current={!management ? 'true' : undefined} className={`flex min-h-9 items-center justify-center rounded-md text-xs font-medium ${!management ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent'}`}>Meu espaço</Link></div>}
      <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-6">{navigation()}</div>
      {management && <div className="mx-3 border-t border-border py-3"><Link href="/ensino" className="workspace-nav-link text-muted-foreground"><BookOpen size={18} aria-hidden="true" /><span>Cursos</span><ArrowRight size={14} className="ml-auto" aria-hidden="true" /></Link></div>}
      <button ref={menuTrigger} type="button" onClick={openMenu} aria-haspopup="dialog" aria-expanded={menuOpen} className="mx-3 mb-3 flex min-h-16 items-center gap-3 rounded-lg border border-border bg-background px-3 text-left hover:bg-accent"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-secondary text-sm font-semibold" aria-hidden="true">{person?.name?.slice(0, 1).toLocaleUpperCase('pt-BR') || 'A'}</span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{person?.name || 'Minha conta'}</span><span className="mt-0.5 block text-xs text-muted-foreground">Conta e aparência</span></span><ChevronDown size={15} className="text-muted-foreground" /></button>
    </aside>
    <div className="min-w-0 lg:pl-64 print:pl-0">
      <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-border bg-card px-4 sm:px-7 print:hidden">
        <button type="button" onClick={openMenu} aria-label="Abrir menu e conta" aria-haspopup="dialog" aria-expanded={menuOpen} className="workspace-icon-button -ml-2 lg:hidden"><Menu size={20} /></button>
        <nav aria-label="Localização" className="min-w-0 flex-1"><ol className="flex items-center gap-2 text-sm"><li className="hidden text-muted-foreground sm:block"><Link href={home} className="hover:text-foreground">{management ? 'Gestão' : 'Meu espaço'}</Link></li><li className="hidden text-muted-foreground sm:block" aria-hidden="true"><ChevronRight size={14} /></li><li className="truncate font-medium" aria-current="page">{title}</li></ol></nav>
        <button ref={searchTrigger} type="button" onClick={openSearch} aria-haspopup="dialog" aria-expanded={searchOpen} className="flex min-h-10 items-center gap-2 rounded-lg border border-border bg-background px-3 text-sm text-muted-foreground hover:border-input hover:text-foreground"><Search size={16} aria-hidden="true" /><span className="hidden md:inline">Ir para…</span><kbd className="ml-5 hidden text-xs text-muted-foreground xl:inline">Ctrl K</kbd><span className="sr-only md:hidden">Buscar páginas e ferramentas</span></button>
        <ThemeToggle />
      </header>
      <main id="workspace-content" tabIndex={-1} className="workspace-content mx-auto w-full max-w-[1600px] px-4 pb-28 pt-6 outline-none sm:px-7 sm:pt-8 lg:pb-10 print:p-0">{children}</main>
    </div>
    <nav aria-label="Atalhos principais" className="workspace-bottom-nav fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t border-border bg-card lg:hidden print:hidden">{bottom.map(({ href, label, icon: Icon }) => <Link key={href} href={href} aria-current={active(href) ? 'page' : undefined} className={`flex min-h-16 flex-col items-center justify-center gap-1 text-[11px] ${active(href) ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}><span className={`flex h-7 w-12 items-center justify-center rounded-lg ${active(href) ? 'bg-accent' : ''}`}><Icon size={20} strokeWidth={active(href) ? 2 : 1.7} aria-hidden="true" /></span>{label}</Link>)}<button type="button" onClick={openMenu} aria-haspopup="dialog" aria-expanded={menuOpen} className={`flex min-h-16 flex-col items-center justify-center gap-1 text-[11px] ${menuOpen ? 'font-semibold' : 'text-muted-foreground'}`}><Menu size={20} aria-hidden="true" /><span>Menu</span></button></nav>
    <dialog ref={menu} onClose={() => onClosed('menu')} onClick={event => { if (event.target === event.currentTarget) closeDialogs(); }} aria-labelledby="workspace-menu-title" className="workspace-menu fixed inset-0 m-0 h-dvh max-h-none w-full max-w-none overflow-y-auto border-0 bg-card p-0 text-foreground backdrop:bg-black/50 lg:inset-auto lg:right-4 lg:top-20 lg:m-0 lg:h-auto lg:max-h-[calc(100dvh-6rem)] lg:w-96 lg:rounded-xl lg:border lg:border-border lg:shadow-xl">
      <div className="flex min-h-20 items-center justify-between gap-3 border-b border-border px-5"><h2 id="workspace-menu-title" className="font-semibold">{management ? 'Gestão Autônomos' : 'Meu espaço'}</h2><button type="button" onClick={closeDialogs} aria-label="Fechar menu" className="workspace-icon-button"><X size={20} /></button></div>
      <div className="p-5"><p className="text-sm font-semibold">{person?.name}</p><p className="mt-1 break-all text-xs text-muted-foreground">{person?.email}</p><p className="mt-2 text-xs text-muted-foreground">{ROLE_LABELS[person?.role as keyof typeof ROLE_LABELS] || 'Integrante'}</p>
        {staff && <div className="my-5 grid grid-cols-2 gap-2">{[{ href: '/gestao', label: 'Gestão', selected: management }, { href: '/meu-espaco', label: 'Meu espaço', selected: !management }].map(item => <Link onClick={closeDialogs} key={item.href} href={item.href} className={`flex min-h-11 items-center justify-center gap-2 rounded-lg border px-3 text-sm ${item.selected ? 'border-primary bg-primary text-primary-foreground' : 'border-border hover:bg-accent'}`}>{item.selected && <Check size={14} />}{item.label}</Link>)}</div>}
        <div className="my-5 lg:hidden">{navigation(true)}</div>
        <div className="space-y-1 border-t border-border py-3"><Link href="/perfil" onClick={closeDialogs} className="workspace-nav-link"><UserRound size={18} />Meu perfil</Link>{management && <Link href="/ensino" onClick={closeDialogs} className="workspace-nav-link"><BookOpen size={18} />Cursos</Link>}</div>
        <ThemeChoices />
        <button type="button" disabled={leaving} onClick={() => void signOut()} className="workspace-nav-link mt-5 w-full border-t border-border text-muted-foreground disabled:opacity-50"><LogOut size={18} />{leaving ? 'Saindo…' : 'Sair da conta'}</button>
      </div>
    </dialog>
    <dialog ref={search} onClose={() => onClosed('search')} onClick={event => { if (event.target === event.currentTarget) closeDialogs(); }} aria-labelledby="workspace-search-title" className="fixed inset-x-4 top-[10dvh] m-auto w-[calc(100%-2rem)] max-w-xl overflow-hidden rounded-xl border border-border bg-popover p-0 text-popover-foreground shadow-xl backdrop:bg-black/50">
      <div className="flex items-center justify-between border-b border-border px-5 py-3"><h2 id="workspace-search-title" className="text-sm font-semibold">Ir para uma página</h2><button type="button" onClick={closeDialogs} aria-label="Fechar busca" className="workspace-icon-button"><X size={18} /></button></div>
      <div className="flex items-center gap-3 px-5"><Search size={18} className="text-muted-foreground" aria-hidden="true" /><input autoFocus value={query} onChange={event => setQuery(event.target.value)} aria-label="Buscar páginas e ferramentas" placeholder="Integrantes, presença, galeria…" className="h-14 w-full bg-transparent text-base outline-none placeholder:text-muted-foreground" /></div>
      <p className="sr-only" role="status">{filtered.length} páginas encontradas</p><ul className="max-h-[50dvh] space-y-1 overflow-y-auto border-t border-border p-2">{filtered.map(item => { const Icon = icons[item.icon] || Home; return <li key={item.href}><Link href={item.href} onClick={closeDialogs} className="flex min-h-16 items-center gap-3 rounded-lg px-3 py-2 hover:bg-accent focus-visible:bg-accent focus-visible:outline-none"><Icon size={18} className="shrink-0 text-muted-foreground" aria-hidden="true" /><span className="min-w-0 flex-1"><span className="block text-sm font-medium">{item.label}</span><span className="mt-0.5 block text-xs text-muted-foreground">{item.description}</span></span><ArrowRight size={14} className="text-muted-foreground" /></Link></li>; })}{filtered.length === 0 && <li className="px-3 py-8 text-center text-sm text-muted-foreground">Nenhuma página encontrada. Tente outro nome.</li>}</ul>
    </dialog>
  </div>;
}
