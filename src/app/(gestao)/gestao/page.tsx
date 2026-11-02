import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { requirePageUser } from '@/lib/session';
import { prisma } from '@/lib/prisma';
import { getGestaoStats } from '@/lib/gestao';
import { attendanceReport } from '@/lib/attendance/service';
import { MANAGEMENT_SECTIONS } from '@/lib/management-navigation';
import { SectionHeader } from '@/components/gestao/section-header';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Visão geral — Gestão' };
const linkStyle = 'inline-flex min-h-11 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-zinc-200 hover:bg-zinc-800 focus-visible:outline-2 focus-visible:outline-offset-2';

export default async function GestaoPage() {
  await requirePageUser(true);
  const [stats, pending, attendance] = await Promise.allSettled([
    getGestaoStats(), prisma.user.count({ where: { status: 'PENDING' } }), attendanceReport(),
  ]);
  const data = stats.status === 'fulfilled' ? stats.value : null;
  const waiting = pending.status === 'fulfilled' ? pending.value : null;
  const presence = attendance.status === 'fulfilled' ? attendance.value : null;
  return <>
    <SectionHeader title="Visão geral" description="Acompanhe a equipe e encontre os sistemas de gestão. Use o menu lateral para trabalhar em cada área." />
    <section aria-labelledby="attention-heading" className="mb-10">
      <h2 id="attention-heading" className="font-display text-xl font-semibold">O que precisa de atenção</h2>
      <div className="mt-4 divide-y divide-zinc-800 border-y border-zinc-800">
        <div className="flex flex-wrap items-center justify-between gap-3 py-5"><div><h3 className="text-sm font-medium">Aprovação de cadastros</h3><p className={`mt-1 text-sm ${waiting ? 'text-amber-300' : 'text-zinc-400'}`}>{waiting === null ? 'Não foi possível consultar os cadastros. Abra a lista para tentar novamente.' : waiting === 0 ? 'Nenhum cadastro aguardando aprovação.' : `${waiting} ${waiting === 1 ? 'pessoa aguarda' : 'pessoas aguardam'} liberação de acesso.`}</p></div><Link href="/gestao/contas" className={linkStyle}>Ver contas<ArrowRight className="h-4 w-4" /></Link></div>
        <div className="flex flex-wrap items-center justify-between gap-3 py-5"><div><h3 className="text-sm font-medium">Presença nesta semana</h3><p className="mt-1 text-sm text-zinc-400">{presence ? `${presence.summary.met} de ${presence.summary.requiredMembers} membros cumpriram a meta de 2 horas. ${presence.summary.pending} ainda em andamento.` : 'Não foi possível consultar as horas. Abra o painel para tentar novamente.'}</p>{!!presence?.summary.review && <p className="mt-1 text-sm text-amber-300">{presence.summary.review} {presence.summary.review === 1 ? 'registro precisa' : 'registros precisam'} de revisão.</p>}</div><Link href="/gestao/presenca" className={linkStyle}>Acompanhar horas<ArrowRight className="h-4 w-4" /></Link></div>
      </div>
    </section>
    <section aria-labelledby="team-summary-heading" className="mb-10">
      <h2 id="team-summary-heading" className="font-display text-xl font-semibold">Equipe e atividade</h2>
      {data ? <dl className="mt-5 grid grid-cols-2 gap-6 sm:grid-cols-4">
        {[{ label: 'Integrantes ativos', value: data.kpis.totalMembers, href: '/gestao/integrantes' }, { label: 'Projetos ativos', value: data.kpis.activeProjects, href: '/gestao/divisoes' }, { label: 'Alunos nos cursos', value: data.kpis.totalStudents, href: '/gestao/sistema' }, { label: 'Divisões cadastradas', value: data.divisions.length, href: '/gestao/divisoes' }].map(item => <div key={item.label}><dt className="text-sm text-zinc-400">{item.label}</dt><dd className="mt-2"><Link href={item.href} className="rounded-sm font-display text-2xl font-semibold tabular-nums hover:underline focus-visible:outline-2 focus-visible:outline-offset-4">{item.value}</Link></dd></div>)}
      </dl> : <p role="alert" className="mt-4 text-sm text-amber-300">Os indicadores estão indisponíveis. Atualize a página para tentar novamente; os demais sistemas continuam acessíveis pelo menu.</p>}
    </section>
    <section aria-labelledby="systems-heading"><h2 id="systems-heading" className="font-display text-xl font-semibold">Sistemas da gestão</h2><div className="mt-4 divide-y divide-zinc-800 border-y border-zinc-800">{MANAGEMENT_SECTIONS.filter(item => item.href !== '/gestao').map(item => <Link key={item.href} href={item.href} className="group flex min-h-20 items-center justify-between gap-5 py-4 focus-visible:outline-2 focus-visible:outline-offset-4"><div><h3 className="text-sm font-medium text-zinc-200 group-hover:text-white">{item.label}</h3><p className="mt-1 text-sm text-zinc-400">{item.description}</p></div><ArrowRight className="mr-3 h-4 w-4 shrink-0 text-zinc-400 group-hover:text-white" /></Link>)}</div></section>
  </>;
}
