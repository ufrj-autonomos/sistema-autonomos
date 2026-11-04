import Link from 'next/link';
import { ArrowRight, CheckCheck, Clock3, Globe, Network, Users } from 'lucide-react';
import { requirePageUser } from '@/lib/session';
import { prisma } from '@/lib/prisma';
import { attendanceReport } from '@/lib/attendance/service';
import { formatLabTime } from '@/lib/attendance/format';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Painel da gestão' };
const shortDate = (date: Date) => new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', timeZone: 'America/Sao_Paulo' }).format(date);

export default async function GestaoPage() {
  const user = await requirePageUser(true);
  const [accounts, changes, attendance] = await Promise.allSettled([
    prisma.$transaction([
      prisma.member.count({ where: { status: 'PENDING' } }),
      prisma.member.findMany({ where: { status: 'PENDING' }, orderBy: { createdAt: 'asc' }, take: 3, select: { id: true, name: true, createdAt: true } }),
    ]),
    prisma.$transaction([
      prisma.memberProfileChange.count({ where: { status: 'PENDING' } }),
      prisma.memberProfileChange.findMany({ where: { status: 'PENDING' }, orderBy: { createdAt: 'asc' }, take: 3, select: { id: true, createdAt: true, member: { select: { name: true } } } }),
    ]),
    attendanceReport(),
  ]);
  const accountData = accounts.status === 'fulfilled' ? accounts.value : null;
  const changeData = changes.status === 'fulfilled' ? changes.value : null;
  const presence = attendance.status === 'fulfilled' ? attendance.value : null;
  const total = accountData && changeData ? accountData[0] + changeData[0] : null;
  const inLab = presence?.members.filter(member => member.openVisit && !member.openVisit.needsReview) || [];
  const queues = [
    { title: 'Cadastros para aprovar', count: accountData?.[0], rows: accountData?.[1].map(row => ({ id: row.id, name: row.name, date: row.createdAt })), href: '/gestao/contas', action: 'Revisar cadastros', empty: 'Todos os cadastros foram revisados.', detail: 'Liberação de acesso ao sistema' },
    { title: 'Alterações para o site', count: changeData?.[0], rows: changeData?.[1].map(row => ({ id: row.id, name: row.member.name, date: row.createdAt })), href: '/gestao/integrantes', action: 'Revisar alterações', empty: 'Nenhuma alteração de perfil aguardando revisão.', detail: 'Informações públicas de integrantes' },
  ];
  return <div className="space-y-7">
    <header className="flex flex-wrap items-end justify-between gap-5"><div><h1 className="text-2xl font-semibold tracking-tight">Painel da gestão</h1><p className="mt-2 text-sm text-muted-foreground">Olá, {user.name.split(' ')[0]}. Veja o que precisa de atenção na equipe.</p></div><Link href="/gestao/integrantes" className="workspace-primary"><Users size={16} aria-hidden="true" />Abrir integrantes<ArrowRight size={16} aria-hidden="true" /></Link></header>
    <div className="grid min-w-0 items-start gap-6 xl:grid-cols-[minmax(0,1.65fr)_minmax(300px,1fr)]">
      <section aria-labelledby="pending-heading" className="min-w-0 overflow-hidden rounded-xl border border-border bg-card">
        <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-5 sm:px-6"><div><h2 id="pending-heading" className="text-base font-semibold">Pendências da equipe</h2><p className="mt-1 text-sm text-muted-foreground">O que precisa da sua revisão.</p></div>{total !== null && <span className={`flex min-h-8 min-w-8 items-center justify-center rounded-lg px-2 text-sm font-semibold tabular-nums ${total ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300' : 'bg-muted text-muted-foreground'}`} aria-label={`${total} pendências`}>{total}</span>}</div>
        <div className="divide-y divide-border">{queues.map(queue => <div key={queue.href} className="px-5 py-5 sm:px-6"><div className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-sm font-semibold">{queue.title}{queue.count !== undefined && <span className="ml-2 font-normal tabular-nums text-muted-foreground">{queue.count}</span>}</h3><Link href={queue.href} className="inline-flex min-h-10 items-center gap-2 text-xs font-medium underline-offset-4 hover:underline">{queue.action}<ArrowRight size={14} aria-hidden="true" /></Link></div>
          {queue.rows ? queue.rows.length ? <ul className="mt-2 divide-y divide-border">{queue.rows.map(row => <li key={row.id}><Link href={queue.href} className="group -mx-2 flex min-h-16 items-center gap-3 rounded-md px-2 py-3 hover:bg-accent"><span aria-hidden="true" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-semibold">{row.name.slice(0, 1).toLocaleUpperCase('pt-BR')}</span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{row.name}</span><span className="mt-0.5 block text-xs text-muted-foreground">{queue.detail}</span></span><time dateTime={row.date.toISOString()} className="shrink-0 text-xs text-muted-foreground">{shortDate(row.date)}</time><ChevronArrow /></Link></li>)}</ul> : <p className="mt-4 flex items-center gap-2 py-3 text-sm text-muted-foreground"><CheckCheck size={18} className="shrink-0" aria-hidden="true" />{queue.empty}</p> : <p role="status" className="mt-4 rounded-md bg-muted p-3 text-sm text-muted-foreground">Não foi possível consultar esta fila. Abra a lista para tentar novamente.</p>}
        </div>)}</div>
      </section>
      <div className="space-y-6">
        <section aria-labelledby="presence-heading" className="rounded-xl border border-border bg-card p-5 sm:p-6"><div className="flex items-center justify-between gap-3"><h2 id="presence-heading" className="text-base font-semibold">Presença da semana</h2><Clock3 size={18} className="text-muted-foreground" aria-hidden="true" /></div><p className="mt-1 text-xs text-muted-foreground">Meta de 2 horas no laboratório</p>
          {presence ? <><div className="mb-4 mt-6 flex items-baseline gap-2"><span className="text-3xl font-semibold tracking-tight tabular-nums">{presence.summary.met}</span><span className="text-sm text-muted-foreground">de {presence.summary.requiredMembers} cumpriram a meta</span></div>{presence.summary.requiredMembers > 0 && <progress className="workspace-progress h-2 w-full" value={presence.summary.met} max={presence.summary.requiredMembers} aria-label="Integrantes com meta semanal cumprida" />}<p className="mt-3 text-sm text-muted-foreground">{presence.summary.pending ? `${presence.summary.pending} integrantes ainda em andamento.` : presence.summary.requiredMembers ? 'A equipe cumpriu a meta desta semana.' : 'Nenhum integrante com meta nesta semana.'}</p>{presence.summary.review > 0 && <Link href="/gestao/presenca" className="mt-4 flex min-h-11 items-center justify-between gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 text-sm text-amber-700 dark:text-amber-300">{presence.summary.review} registros para revisar<ArrowRight size={14} /></Link>}</> : <p role="status" className="my-5 text-sm text-muted-foreground">As horas estão indisponíveis agora. Abra o painel para tentar novamente.</p>}
          <Link href="/gestao/presenca" className="workspace-secondary mt-5 w-full justify-between">Acompanhar presença<ArrowRight size={16} aria-hidden="true" /></Link>
        </section>
        <section aria-labelledby="lab-heading" className="rounded-xl border border-border bg-card p-5 sm:p-6"><div className="flex items-center justify-between gap-3"><h2 id="lab-heading" className="text-sm font-semibold">No laboratório agora</h2>{presence && <span className="text-xs tabular-nums text-muted-foreground">{inLab.length}</span>}</div>{!presence ? <p className="mt-4 text-sm text-muted-foreground">Não foi possível consultar as entradas.</p> : inLab.length ? <ul className="mt-3 space-y-3">{inLab.slice(0, 3).map(member => <li key={member.id} className="flex items-center justify-between gap-3 text-sm"><span className="truncate">{member.name}</span><span className="shrink-0 text-xs text-muted-foreground">desde {formatLabTime(member.openVisit!.checkedInAt)}</span></li>)}{inLab.length > 3 && <li><Link href="/gestao/presenca" className="text-xs underline underline-offset-4">Ver mais {inLab.length - 3} integrantes</Link></li>}</ul> : <p className="mt-4 text-sm text-muted-foreground">Nenhuma entrada em aberto no momento.</p>}</section>
      </div>
    </div>
    <section aria-labelledby="tools-heading"><h2 id="tools-heading" className="mb-3 text-sm font-semibold">Continue o trabalho</h2><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{[{ href: '/gestao/integrantes', title: 'Integrantes', description: 'Dados internos e perfis públicos', icon: Users }, { href: '/gestao/presenca', title: 'Presença', description: 'Horas e revisão de registros', icon: Clock3 }, { href: '/gestao/projetos', title: 'Projetos', description: 'Operação e informações do site', icon: Network }, { href: '/gestao/site', title: 'Site institucional', description: 'Conteúdo e mensagens recebidas', icon: Globe }].map(({ href, title, description, icon: Icon }) => <Link href={href} key={href} className="group flex min-h-24 items-center gap-3 rounded-lg border border-border bg-card px-4 py-4 hover:border-input hover:bg-accent"><Icon size={20} strokeWidth={1.6} className="shrink-0 text-muted-foreground" aria-hidden="true" /><span className="min-w-0 flex-1"><span className="block text-sm font-semibold">{title}</span><span className="mt-1 block text-xs leading-relaxed text-muted-foreground">{description}</span></span><ChevronArrow /></Link>)}</div></section>
  </div>;
}
function ChevronArrow() { return <ArrowRight size={14} className="shrink-0 text-muted-foreground" aria-hidden="true" />; }
