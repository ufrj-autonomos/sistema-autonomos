import Link from 'next/link';
import { ArrowRight, Check, Clock3 } from 'lucide-react';
import { getManagementOverview } from '@/lib/management-overview';
import { formatDuration } from '@/lib/attendance/format';
import { weekRange } from '@/lib/attendance/time';
import { siteAssetUrl, SITE_PROFILE_FIELDS } from '@/lib/site-profile-changes';
import { getMemberDisciplinarySummary } from '@/lib/disciplinary/service';
import { MemberWarningBanner } from '@/components/disciplinary/member-warning-banner';

const action = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring';
function date(value: string | Date) { return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', timeZone: 'America/Sao_Paulo' }).format(typeof value === 'string' ? new Date(`${value}T12:00:00Z`) : value); }
function period(key: string) { return `${date(key)} a ${date(weekRange(key).sunday)}`; }

export async function ManagementOverview({ name, userId }: { name: string; userId?: string }) {
  const overview = await getManagementOverview();
  const disciplinary = userId ? await getMemberDisciplinarySummary(userId) : null;
  const current = overview.current;
  const previous = overview.previous;
  const siteOrigin = process.env.INSTITUTIONAL_SITE_URL || 'https://ufrjautonomos.com';
  return <div className="space-y-7">
    <header className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-6"><div><h1 className="font-display text-3xl font-semibold">Visão geral</h1><p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">Olá, {name.split(' ')[0]}. Acompanhe as solicitações para o site e a presença da equipe.</p></div><Link href="/gestao/integrantes" className={action}>Integrantes<ArrowRight size={16} aria-hidden="true" /></Link></header>
    {disciplinary && <MemberWarningBanner summary={disciplinary} />}
    <div className="grid min-w-0 items-start gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(280px,1fr)]">
      <section aria-labelledby="site-requests-heading" className="min-w-0 overflow-hidden rounded-xl border border-border bg-card">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border p-5 sm:px-6"><div><h2 id="site-requests-heading" className="text-base font-semibold">Solicitações para o site</h2><p className="mt-1 text-sm text-muted-foreground">Alterações e fotos dos integrantes aguardando aprovação.</p></div>{overview.siteRequests && <span className={`rounded-md px-2.5 py-1 text-sm font-semibold tabular-nums ${overview.siteRequests.total ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300' : 'bg-muted text-muted-foreground'}`} aria-label={`${overview.siteRequests.total} solicitações pendentes`}>{overview.siteRequests.total}</span>}</div>
        {overview.siteRequests ? overview.siteRequests.rows.length ? <ul className="divide-y divide-border px-5 sm:px-6">{overview.siteRequests.rows.map(request => {
          const changes = request.changes && typeof request.changes === 'object' && !Array.isArray(request.changes) ? request.changes as Record<string, unknown> : {};
          const fields = SITE_PROFILE_FIELDS.filter(field => field.key in changes).map(field => field.label);
          const photo = siteAssetUrl(changes.photo, siteOrigin);
          return <li key={request.id} className="flex flex-wrap items-center gap-3 py-4">{photo ? <img src={photo} alt={`Foto proposta por ${request.member.name}`} width={40} height={40} className="h-10 w-10 shrink-0 rounded-lg border border-border object-cover" loading="lazy" /> : <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted text-sm font-semibold">{request.member.name.slice(0, 1)}</span>}<div className="min-w-0 flex-1 basis-32"><p className="break-words text-sm font-medium">{request.member.name}</p><p className="mt-1 break-words text-xs leading-relaxed text-muted-foreground">{fields.length ? fields.join(' · ') : 'Alteração de perfil'}</p><time dateTime={request.createdAt.toISOString()} className="mt-1 block text-xs text-muted-foreground">Enviado em {date(request.createdAt)}</time></div><Link href="/gestao/integrantes#alteracoes-do-site" className="inline-flex min-h-11 items-center gap-2 rounded-md px-2 text-sm font-medium hover:bg-accent">Revisar<ArrowRight size={14} aria-hidden="true" /></Link></li>;
        })}</ul> : <p className="flex items-center gap-3 px-5 py-10 text-sm text-muted-foreground sm:px-6"><Check size={20} className="shrink-0" aria-hidden="true" />Nenhuma alteração ou foto aguardando aprovação.</p> : <p role="status" className="px-5 py-8 text-sm text-muted-foreground sm:px-6">Não foi possível consultar as solicitações agora. Abra a lista de integrantes para tentar novamente.</p>}
        <div className="border-t border-border px-5 py-3 sm:px-6"><Link href="/gestao/integrantes#alteracoes-do-site" className="inline-flex min-h-11 items-center gap-2 text-sm font-medium hover:underline underline-offset-4">{overview.siteRequests && overview.siteRequests.total > overview.siteRequests.rows.length ? `Ver todas as ${overview.siteRequests.total} solicitações` : 'Abrir integrantes e aprovações'}<ArrowRight size={15} aria-hidden="true" /></Link></div>
      </section>
      <div className="space-y-5">
        <section aria-labelledby="current-presence-heading" className="rounded-xl border border-border bg-card p-5 sm:p-6"><div className="flex items-center justify-between gap-3"><h2 id="current-presence-heading" className="text-base font-semibold">Presença nesta semana</h2><Clock3 size={18} className="text-muted-foreground" aria-hidden="true" /></div><p className="mt-1 text-xs text-muted-foreground">{period(overview.currentWeek)} · horário de Brasília</p>
          {current ? <><p className="mt-6 text-base leading-relaxed"><strong className="font-display text-3xl font-semibold tabular-nums">{current.summary.met}</strong><span className="text-muted-foreground"> de {current.summary.requiredMembers} integrantes</span><span className="mt-1 block text-sm">cumpriram a meta semanal.</span></p>{current.summary.requiredMembers > 0 ? <><progress value={current.summary.met} max={current.summary.requiredMembers} aria-label="Integrantes com meta semanal cumprida" className="overview-progress mt-4 h-2 w-full" /><p className="mt-3 text-sm text-muted-foreground">{current.summary.pending} ainda em andamento. Meta padrão: 2 horas.</p><details className="mt-3 text-sm"><summary className="min-h-11 cursor-pointer py-3 font-medium">Ver quem cumpriu a meta</summary>{current.summary.met ? <ul className="max-h-52 space-y-2 overflow-y-auto pb-3 text-muted-foreground">{current.members.filter(member => member.status === 'MET').map(member => <li key={member.id}>{member.name}</li>)}</ul> : <p className="pb-3 text-muted-foreground">Ninguém cumpriu a meta até o momento.</p>}</details></> : <p className="mt-3 text-sm text-muted-foreground">Nenhum integrante com meta nesta semana.</p>}{current.summary.review > 0 && <p className="mt-3 text-sm text-amber-700 dark:text-amber-300">{current.summary.review} registros aguardam revisão.</p>}</> : <p role="status" className="my-6 text-sm text-muted-foreground">Não foi possível consultar as horas desta semana.</p>}
          <Link href="/gestao/presenca" className={`${action} mt-5 w-full justify-between`}>Acompanhar presença<ArrowRight size={16} aria-hidden="true" /></Link>
        </section>
        <div className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border px-5 py-4 transition-colors ${
          overview.pendingAccounts
            ? 'border-amber-500/40 bg-amber-500/10 dark:bg-amber-950/20 text-amber-900 dark:text-amber-200'
            : 'border-border bg-card'
        }`}>
          <div>
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium">Cadastros para aprovar</p>
              {Boolean(overview.pendingAccounts) && (
                <span className="inline-flex items-center rounded-full bg-amber-500/20 px-2 py-0.5 text-xs font-semibold text-amber-700 dark:text-amber-300">
                  {overview.pendingAccounts}
                </span>
              )}
            </div>
            <p className={`mt-1 text-sm ${overview.pendingAccounts ? 'text-amber-800/80 dark:text-amber-300/80' : 'text-muted-foreground'}`}>
              {overview.pendingAccounts === null
                ? 'Consulta indisponível'
                : overview.pendingAccounts
                ? `${overview.pendingAccounts} ${overview.pendingAccounts === 1 ? 'cadastro aguardando liberação' : 'cadastros aguardando liberação'}`
                : 'Nenhum cadastro pendente'}
            </p>
          </div>
          <Link
            href="/gestao/contas"
            className={`inline-flex min-h-11 items-center gap-2 text-sm font-medium hover:underline ${
              overview.pendingAccounts ? 'text-amber-950 dark:text-amber-100 font-semibold' : ''
            }`}
          >
            Ver contas<ArrowRight size={14} aria-hidden="true" />
          </Link>
        </div>
      </div>
    </div>
    <section aria-labelledby="previous-presence-heading" className="min-w-0 overflow-hidden rounded-xl border border-border bg-card"><div className="flex flex-wrap items-start justify-between gap-4 border-b border-border p-5 sm:px-6"><div><h2 id="previous-presence-heading" className="text-base font-semibold">Abaixo da meta na semana passada{overview.belowTarget && <span className="ml-2 text-sm font-normal tabular-nums text-muted-foreground">({overview.belowTarget.length})</span>}</h2><p className="mt-1 text-sm text-muted-foreground">{period(overview.previousWeek)} · apenas horas validadas. Pessoas sem meta no período não entram nesta lista.</p></div><Link href={`/gestao/presenca?week=${overview.previousWeek}`} className={action}>Ver semana passada<ArrowRight size={16} aria-hidden="true" /></Link></div>
      {overview.belowTarget ? overview.belowTarget.length ? <div className="max-h-[28rem] overflow-auto" tabIndex={0} role="region" aria-label="Integrantes abaixo da meta na semana passada"><table className="w-full min-w-[580px] text-sm"><thead className="sticky top-0 bg-muted text-muted-foreground"><tr><th scope="col" className="px-5 py-3 text-left font-medium sm:px-6">Integrante</th><th scope="col" className="px-5 py-3 text-left font-medium">Área</th><th scope="col" className="px-5 py-3 text-right font-medium">Validadas</th><th scope="col" className="px-5 py-3 text-right font-medium sm:px-6">Faltaram</th></tr></thead><tbody className="divide-y divide-border">{overview.belowTarget.map(member => <tr key={member.id}><th scope="row" className="px-5 py-4 text-left font-medium sm:px-6">{member.name}{member.pendingReviews > 0 && <span className="mt-1 block text-xs font-normal text-amber-700 dark:text-amber-300">{member.pendingReviews} registro(s) em revisão</span>}</th><td className="px-5 py-4 text-muted-foreground">{member.area}</td><td className="whitespace-nowrap px-5 py-4 text-right tabular-nums">{formatDuration(member.completedSeconds)}</td><td className="whitespace-nowrap px-5 py-4 text-right tabular-nums text-muted-foreground sm:px-6">{formatDuration(member.remainingSeconds)}</td></tr>)}</tbody></table></div> : <p className="px-5 py-8 text-sm text-muted-foreground sm:px-6">{previous?.summary.requiredMembers ? 'Todos os integrantes com meta cumpriram as horas da semana passada.' : 'Não havia integrantes com meta de presença nessa semana.'}</p> : <p role="status" className="px-5 py-8 text-sm text-muted-foreground sm:px-6">Não foi possível consultar a semana passada. Abra o painel de presença para tentar novamente.</p>}
    </section>
    <nav aria-label="Atalhos da gestão" className="flex flex-wrap gap-3"><Link href="/gestao/dashboard" className={action}>Dashboard da equipe<ArrowRight size={15} aria-hidden="true" /></Link><Link href="/gestao/advertencias" className={action}>Gestão disciplinar<ArrowRight size={15} aria-hidden="true" /></Link><Link href="/gestao/projetos" className={action}>Projetos<ArrowRight size={15} aria-hidden="true" /></Link><Link href="/gestao/site" className={action}>Site institucional<ArrowRight size={15} aria-hidden="true" /></Link><Link href="/gestao/presenca/qr" className={action}>QR do laboratório<ArrowRight size={15} aria-hidden="true" /></Link></nav>
  </div>;
}
