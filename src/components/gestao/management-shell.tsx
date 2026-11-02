'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ArrowLeft, ArrowUpRight, ChevronRight, Clock3, LayoutDashboard, Globe, LogOut, Menu, Network, Server, ShieldCheck, Users, X } from 'lucide-react';
import { useSession } from '@/contexts/auth-context';
import type { SafeUser } from '@/lib/session';
import { getManagementSection, MANAGEMENT_SECTIONS, INSTITUTIONAL_LINKS } from '@/lib/management-navigation';

const icons = { overview: LayoutDashboard, accounts: ShieldCheck, members: Users, attendance: Clock3, divisions: Network, system: Server, institutional: Globe };
const focus = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-300';

export function ManagementShell({ children, initialUser }: { children: ReactNode; initialUser: SafeUser }) {
  const pathname = usePathname();
  const section = getManagementSection(pathname);
  const { user, isLoading, logout } = useSession();
  const router = useRouter();
  const mobileMenu = useRef<HTMLDialogElement>(null);
  const menuTrigger = useRef<HTMLButtonElement>(null);
  const [leaving, setLeaving] = useState(false);
  const currentUser = user || initialUser;
  const isQr = pathname === '/gestao/presenca/qr';
  useEffect(() => { mobileMenu.current?.close(); }, [pathname]);
  useEffect(() => {
    const desktop = window.matchMedia('(min-width: 1024px)');
    const closeOnDesktop = () => { if (desktop.matches) mobileMenu.current?.close(); };
    desktop.addEventListener('change', closeOnDesktop);
    return () => desktop.removeEventListener('change', closeOnDesktop);
  }, []);
  useEffect(() => { if (!isLoading && user && user.role !== 'ADMIN') router.replace('/'); }, [user, isLoading, router]);
  function closeMenu() { mobileMenu.current?.close(); menuTrigger.current?.focus(); }
  async function signOut() { setLeaving(true); try { await logout(); } finally { setLeaving(false); } }
  function navigation(mobile = false) {
    return <div className="flex h-full min-h-0 flex-col">
      <div className="flex min-h-20 items-center justify-between border-b border-zinc-800 px-5">
        <Link href="/gestao" onClick={() => mobile && closeMenu()} className={`flex items-center gap-3 rounded-sm ${focus}`} aria-label="Gestão UFRJ Autônomos, visão geral">
          <img src="/images/logos/autonomos/symbol-white.svg" alt="" width={32} height={32} className="h-8 w-8" />
          <span><span className="block text-sm font-semibold text-zinc-100">UFRJ Autônomos</span><span className="mt-0.5 block text-xs text-zinc-400">Área de gestão</span></span>
        </Link>
        {mobile && <button type="button" onClick={closeMenu} aria-label="Fechar menu da gestão" className={`flex h-11 w-11 items-center justify-center rounded-lg text-zinc-300 hover:bg-zinc-800 ${focus}`}><X className="h-5 w-5" /></button>}
      </div>
      <nav aria-label="Sistemas de gestão" className="flex-1 overflow-y-auto px-3 py-6">
        {['Principal', 'Pessoas', 'Operação', 'Plataforma'].map(group => <div key={group} className="mb-6 last:mb-0">
          <p className="mb-2 px-3 text-xs font-medium text-zinc-400">{group}</p>
          <ul className="space-y-1">{MANAGEMENT_SECTIONS.filter(item => item.group === group).map(item => {
            const active = section?.href === item.href;
            const Icon = icons[item.icon];
            return <li key={item.href}><Link href={item.href} onClick={() => mobile && closeMenu()} aria-current={active && !isQr ? 'page' : undefined} className={`flex min-h-11 items-center gap-3 rounded-lg px-3 py-2.5 text-sm ${focus} ${active ? 'bg-zinc-800 font-medium text-white' : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-100'}`}><Icon aria-hidden="true" className="h-[18px] w-[18px] shrink-0" /><span>{item.label}</span></Link>
            {active && item.icon === 'institutional' && <ul className="ml-8 mt-1 border-l border-zinc-700 pl-2">{INSTITUTIONAL_LINKS.map(([label, path]) => <li key={path}><Link href={`/gestao/site${path}`} onClick={() => mobile && closeMenu()} aria-current={pathname === `/gestao/site${path}` ? 'page' : undefined} className={`flex min-h-10 items-center rounded-md px-3 py-2 text-sm ${focus} ${pathname === `/gestao/site${path}` ? 'text-white underline underline-offset-4' : 'text-zinc-400 hover:text-white'}`}>{label}</Link></li>)}</ul>}
            {active && item.icon === 'attendance' && <ul className="ml-8 mt-1 border-l border-zinc-700 pl-2"><li><Link href="/gestao/presenca/qr" onClick={() => mobile && closeMenu()} aria-current={isQr ? 'page' : undefined} className={`flex min-h-11 items-center rounded-md px-3 text-sm ${focus} ${isQr ? 'text-white underline underline-offset-4' : 'text-zinc-400 hover:text-white'}`}>QR para impressão</Link></li></ul>}</li>;
          })}</ul>
        </div>)}
      </nav>
      <div className="border-t border-zinc-800 p-3">
        <Link href="/" className={`flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm text-zinc-300 hover:bg-zinc-800 ${focus}`}><ArrowLeft className="h-[18px] w-[18px]" />Área do membro<ArrowUpRight className="ml-auto h-4 w-4 text-zinc-400" /></Link>
        <div className="mt-3 flex items-center gap-3 border-t border-zinc-800 px-3 pt-4">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-zinc-800 text-sm font-semibold" aria-hidden="true">{currentUser.name.slice(0, 1).toLocaleUpperCase('pt-BR')}</div>
          <div className="min-w-0 flex-1"><p className="truncate text-sm text-zinc-200" title={currentUser.name}>{currentUser.name}</p><p className="mt-0.5 text-xs text-zinc-400">Administrador</p></div>
          <button type="button" disabled={leaving} onClick={() => void signOut()} aria-label={leaving ? 'Saindo da conta' : 'Sair da conta'} title="Sair da conta" className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-zinc-400 hover:bg-zinc-800 hover:text-white disabled:opacity-50 ${focus}`}><LogOut className="h-[18px] w-[18px]" /></button>
        </div>
      </div>
    </div>;
  }
  return <div className="management-workspace min-h-dvh w-full bg-[#0A0A0B] text-zinc-100">
    <a href="#management-content" className="fixed left-4 top-3 z-[100] -translate-y-24 rounded-lg bg-white px-4 py-3 text-zinc-950 focus:translate-y-0">Ir para o conteúdo</a>
    <aside aria-label="Navegação da gestão" className="fixed inset-y-0 left-0 z-40 hidden w-64 border-r border-zinc-800 bg-[#101012] lg:block print:hidden">{navigation()}</aside>
    <dialog ref={mobileMenu} aria-label="Menu da gestão" onClick={event => { if (event.target === event.currentTarget) closeMenu(); }} className="fixed inset-y-0 left-0 m-0 h-dvh max-h-none w-80 max-w-[90vw] border-0 bg-[#101012] p-0 text-zinc-100 backdrop:bg-black/70 lg:hidden print:hidden">
      {navigation(true)}
    </dialog>
    <div className="min-w-0 lg:pl-64 print:pl-0">
      <header className="sticky top-0 z-30 flex min-h-16 items-center gap-3 border-b border-zinc-800 bg-[#0A0A0B] px-4 sm:px-8 print:hidden">
        <button ref={menuTrigger} type="button" onClick={() => mobileMenu.current?.showModal()} aria-label="Abrir menu da gestão" aria-haspopup="dialog" className={`-ml-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-zinc-300 hover:bg-zinc-800 lg:hidden ${focus}`}><Menu className="h-5 w-5" /></button>
        <nav aria-label="Localização" className="min-w-0 flex-1"><ol className="flex items-center gap-2 text-sm"><li><Link href="/gestao" className={`rounded-sm text-zinc-400 hover:text-white ${focus}`}>Gestão</Link></li><li aria-hidden="true"><ChevronRight className="h-3.5 w-3.5 text-zinc-500" /></li><li className="truncate text-zinc-200">{isQr ? <Link href="/gestao/presenca" className={`rounded-sm hover:text-white ${focus}`}>{section?.label}</Link> : <span aria-current="page">{section?.label || 'Página não encontrada'}</span>}</li>{isQr && <><li aria-hidden="true"><ChevronRight className="h-3.5 w-3.5 text-zinc-500" /></li><li aria-current="page" className="truncate text-zinc-200">QR code</li></>}</ol></nav>
        <span className="hidden items-center gap-2 text-xs text-zinc-400 sm:inline-flex"><ShieldCheck className="h-4 w-4" />Acesso administrativo</span>
      </header>
      <main id="management-content" tabIndex={-1} className="mx-auto w-full max-w-[1600px] px-4 py-7 outline-none sm:px-8 sm:py-9 print:p-0">{children}</main>
    </div>
  </div>;
}
