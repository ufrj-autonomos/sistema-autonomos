import Link from 'next/link';
import {
  ArrowRight,
  Clock3,
  Users,
  CalendarCheck,
  ShieldAlert,
  UserCheck,
  BarChart3,
  AlertTriangle,
  Award,
  Sparkles,
  CheckCircle2,
  ListChecks,
  Wallet,
  Lightbulb,
  Mail,
  FileText,
  Boxes,
  UserCog,
  Globe,
  Wrench,
} from 'lucide-react';
import { getManagementOverview } from '@/lib/management-overview';
import { getExecutiveOverviewInsights } from '@/lib/platform-insights';
import {
  getManagementPendencies,
  type ManagementPendencyQueue,
  type PendencyTone,
} from '@/lib/management-pendencies';
import { formatDuration } from '@/lib/attendance/format';
import { weekRange } from '@/lib/attendance/time';
import { getMemberDisciplinarySummary } from '@/lib/disciplinary/service';
import { MemberWarningBanner } from '@/components/disciplinary/member-warning-banner';
import {
  MeetingsPerformanceByAreaChart,
  DisciplinaryHealthChart,
} from '@/components/gestao/dashboard-charts';
import type { SafeUser } from '@/lib/session';

const action =
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring transition-colors';

const TONE_CARD_STYLES: Record<
  PendencyTone,
  {
    border: string;
    badge: string;
    iconBg: string;
    cta: string;
  }
> = {
  rose: {
    border: 'border-rose-500/35 bg-rose-500/[0.04]',
    badge: 'bg-rose-600 text-white',
    iconBg: 'bg-rose-500/15 text-rose-600 dark:text-rose-400',
    cta: 'bg-rose-600 text-white hover:bg-rose-500',
  },
  amber: {
    border: 'border-amber-500/35 bg-amber-500/[0.04]',
    badge: 'bg-amber-500 text-zinc-950',
    iconBg: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
    cta: 'bg-amber-500 text-zinc-950 hover:bg-amber-400',
  },
  violet: {
    border: 'border-violet-500/35 bg-violet-500/[0.04]',
    badge: 'bg-violet-600 text-white',
    iconBg: 'bg-violet-500/15 text-violet-600 dark:text-violet-400',
    cta: 'bg-violet-600 text-white hover:bg-violet-500',
  },
  blue: {
    border: 'border-blue-500/35 bg-blue-500/[0.04]',
    badge: 'bg-blue-600 text-white',
    iconBg: 'bg-blue-500/15 text-blue-600 dark:text-blue-400',
    cta: 'bg-blue-600 text-white hover:bg-blue-500',
  },
};

function QueueIcon({ queueKey }: { queueKey: ManagementPendencyQueue['key'] }) {
  switch (queueKey) {
    case 'reimbursements':
    case 'cashEntries':
      return <Wallet className="h-4 w-4 shrink-0" />;
    case 'feedback':
      return <Lightbulb className="h-4 w-4 shrink-0" />;
    case 'attendance':
      return <Clock3 className="h-4 w-4 shrink-0" />;
    case 'accounts':
      return <UserCheck className="h-4 w-4 shrink-0" />;
    case 'siteChanges':
      return <Award className="h-4 w-4 shrink-0" />;
    case 'emailChanges':
      return <Mail className="h-4 w-4 shrink-0" />;
    case 'meetingMinutes':
      return <FileText className="h-4 w-4 shrink-0" />;
    case 'incompleteProfiles':
      return <UserCog className="h-4 w-4 shrink-0" />;
    case 'disciplinaryRisk':
      return <ShieldAlert className="h-4 w-4 shrink-0" />;
    case 'assets':
      return <Boxes className="h-4 w-4 shrink-0" />;
  }
}

function PendencyQueueCard({ queue }: { queue: ManagementPendencyQueue }) {
  const tone = TONE_CARD_STYLES[queue.tone];
  return (
    <article
      className={`flex min-w-0 max-w-full flex-col justify-between overflow-hidden rounded-xl border p-4 sm:p-5 shadow-xs ${tone.border}`}
    >
      <div className="space-y-3 min-w-0">
        <div className="flex items-start justify-between gap-2 min-w-0">
          <div className="flex min-w-0 items-center gap-2.5">
            <span
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${tone.iconBg}`}
            >
              <QueueIcon queueKey={queue.key} />
            </span>
            <div className="min-w-0">
              <span className="block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {queue.kind === 'approval' ? 'Decisão necessária' : 'Radar operacional'}
              </span>
              <h3 className="text-sm font-semibold text-foreground leading-snug break-words">
                {queue.title}
              </h3>
            </div>
          </div>
          <span
            className={`inline-flex h-6 min-w-6 shrink-0 items-center justify-center rounded-full px-2 font-mono text-xs font-bold tabular-nums ${tone.badge}`}
          >
            {queue.count}
          </span>
        </div>

        <p className="text-xs leading-relaxed text-muted-foreground">{queue.subtitle}</p>

        {queue.items.length > 0 && (
          <ul className="divide-y divide-border/70 rounded-lg border border-border/80 bg-card/90 px-3 min-w-0">
            {queue.items.map((item) => (
              <li key={item.id} className="flex min-w-0 items-center justify-between gap-2 py-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium text-foreground">{item.primary}</p>
                  {item.secondary && (
                    <p className="truncate text-[11px] text-muted-foreground">{item.secondary}</p>
                  )}
                </div>
                {item.href ? (
                  <Link
                    href={item.href}
                    className="shrink-0 rounded-md border border-border bg-background px-2 py-1 text-[11px] font-semibold text-primary hover:bg-accent"
                  >
                    Abrir
                  </Link>
                ) : (
                  item.badge && (
                    <span className="shrink-0 rounded-md border border-border bg-muted/60 px-2 py-0.5 font-mono text-[10px] font-semibold text-foreground whitespace-nowrap">
                      {item.badge}
                    </span>
                  )
                )}
              </li>
            ))}
          </ul>
        )}

        {queue.count > queue.items.length && (
          <p className="text-[11px] font-medium text-muted-foreground">
            + {queue.count - queue.items.length} outro(s) registro(s) nesta fila
          </p>
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2 pt-3 border-t border-border/60">
        <Link
          href={queue.href}
          className={`inline-flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${tone.cta}`}
        >
          <span className="truncate">{queue.ctaLabel}</span>
          <ArrowRight className="h-3.5 w-3.5 shrink-0" />
        </Link>
        {queue.secondaryHref && queue.secondaryLabel && (
          <Link
            href={queue.secondaryHref}
            className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-xs font-medium text-foreground hover:bg-accent transition-colors"
          >
            <Mail className="h-3.5 w-3.5 shrink-0" />
            <span>{queue.secondaryLabel}</span>
          </Link>
        )}
      </div>
    </article>
  );
}

function date(value: string | Date) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    timeZone: 'America/Sao_Paulo',
  }).format(typeof value === 'string' ? new Date(`${value}T12:00:00Z`) : value);
}

function period(key: string) {
  return `${date(key)} a ${date(weekRange(key).sunday)}`;
}

export async function ManagementOverview({
  name,
  userId,
  user,
  variant = 'gestao',
}: {
  name: string;
  userId?: string;
  user?: SafeUser;
  variant?: 'gestao' | 'home';
}) {
  const [overview, disciplinary, insights, pendencies] = await Promise.all([
    getManagementOverview(),
    userId ? getMemberDisciplinarySummary(userId) : Promise.resolve(null),
    getExecutiveOverviewInsights(user),
    getManagementPendencies(user),
  ]);

  const current = overview.current;
  const firstName = name.split(' ')[0];
  const isHome = variant === 'home';

  const currentLabPct =
    current && current.summary.requiredMembers > 0
      ? Math.round((current.summary.met / current.summary.requiredMembers) * 100)
      : 0;

  const canHandleMinutes = !user || ['COORDINATOR', 'ADMIN'].includes(user.role);
  const visibleQueues = pendencies.queues.filter(
    (q) => q.key !== 'meetingMinutes' || canHandleMinutes || q.count > 0
  );
  const activeQueues = visibleQueues.filter((q) => q.count > 0);
  const clearQueues = visibleQueues.filter((q) => q.count === 0);

  const approvalQueues = activeQueues.filter((q) => q.kind === 'approval');
  const attentionQueues = activeQueues.filter((q) => q.kind === 'attention');
  const lowFreqMembers = insights?.meetingsOverview.lowFrequencyMembers || [];
  const labBelowTarget = overview.belowTarget || [];

  const disciplinaryAlertCount = insights
    ? insights.disciplinaryOverview.atencaoCount +
      insights.disciplinaryOverview.alertaCount +
      insights.disciplinaryOverview.expulsosCount
    : 0;

  const totalRadarsCount =
    pendencies.totalAttention +
    (lowFreqMembers.length > 0 ? 1 : 0) +
    (labBelowTarget.length > 0 ? 1 : 0);

  return (
    <div className="space-y-8 min-w-0 max-w-full">
      {/* 1. CABEÇALHO EXECUTIVO */}
      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-6 min-w-0">
        <div className="min-w-0 flex-1 basis-72">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
              <Sparkles className="h-3.5 w-3.5 shrink-0" />
              {isHome ? 'Painel do Membro de Gestão' : 'Centro de Comando Operacional'}
            </span>
            {user?.role === 'COORDINATOR' && user.teamSlug && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-accent text-foreground border border-border">
                Coordenação ·{' '}
                {user.teamSlug === 'harpia'
                  ? 'Divisão Harpia'
                  : user.teamSlug === 'nautilus'
                  ? 'Divisão Nautilus'
                  : 'UFRJ Autônomos'}
              </span>
            )}
            {pendencies.totalApprovals > 0 ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-rose-600 px-2.5 py-0.5 text-xs font-semibold text-white">
                {pendencies.totalApprovals} decisão(ões) imediata(s)
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                Filas de decisão em dia
              </span>
            )}
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-semibold text-foreground">
            {isHome ? `Olá, ${firstName}.` : 'Visão geral da gestão'}
          </h1>
          <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            {isHome
              ? 'Priorize as aprovações e triagens pendentes, acompanhe os radares da equipe e acesse seu ponto pessoal logo abaixo.'
              : `Olá, ${firstName}. Central única de decisões, radares de frequência, presença semanal no lab, saúde disciplinar e módulos da equipe.`}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {isHome ? (
            <>
              <a href="#meu-ponto-lab" className={action}>
                <Clock3 size={16} aria-hidden="true" />
                Meu ponto &amp; espaço
              </a>
              <Link href="/gestao/emails" className={action}>
                <Mail size={16} aria-hidden="true" />
                E-mails
              </Link>
              <Link href="/gestao" className={action}>
                Visão geral completa
                <ArrowRight size={16} aria-hidden="true" />
              </Link>
            </>
          ) : (
            <>
              <Link href="/gestao/integrantes" className={action}>
                <Users size={16} aria-hidden="true" />
                Integrantes
              </Link>
              <Link href="/gestao/emails" className={action}>
                <Mail size={16} aria-hidden="true" />
                E-mails
              </Link>
              <Link href="/gestao/dashboard" className={action}>
                <BarChart3 size={16} aria-hidden="true" />
                Analytics
              </Link>
            </>
          )}
        </div>
      </header>

      {/* Banner Disciplinar Pessoal */}
      {disciplinary && <MemberWarningBanner summary={disciplinary} />}

      {/* 2. PULSO OPERACIONAL (4 KPIs SEM DUPLICAÇÃO) */}
      <section
        aria-label="Pulso operacional da equipe"
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
      >
        <div className="rounded-xl border border-border bg-card p-4 sm:p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">Fila de Decisão</span>
            <ListChecks
              className={`h-4 w-4 ${pendencies.totalApprovals > 0 ? 'text-rose-500' : 'text-emerald-500'}`}
            />
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <p className="font-display text-3xl font-bold tabular-nums text-foreground">
                {pendencies.totalApprovals}
              </p>
              <span className="text-xs text-muted-foreground">para aprovar/triar</span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {pendencies.totalAttention} em atenção · {pendencies.totalAll} pendentes totais
            </p>
          </div>
          <a
            href="#secao-aprovacoes"
            className="mt-3 pt-2.5 border-t border-border/60 text-xs font-medium text-primary hover:underline inline-flex items-center justify-between"
          >
            <span>Ir para fila prioritária</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </a>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 sm:p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">Lab · Esta Semana</span>
            <Clock3 className="h-4 w-4 text-blue-500" />
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <p className="font-display text-3xl font-bold tabular-nums text-foreground">
                {current ? `${current.summary.met}/${current.summary.requiredMembers}` : '—'}
              </p>
              {current && current.summary.requiredMembers > 0 && (
                <span className="text-xs font-mono font-semibold text-blue-600 dark:text-blue-400">
                  ({currentLabPct}%)
                </span>
              )}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {current
                ? `${current.summary.inLab} no lab agora · ${current.summary.pending} em andamento`
                : 'Consulta indisponível'}
            </p>
          </div>
          <Link
            href="/gestao/presenca"
            className="mt-3 pt-2.5 border-t border-border/60 text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center justify-between"
          >
            <span>Gerenciar presença</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 sm:p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">Reuniões (26.2)</span>
            <CalendarCheck className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <p className="font-display text-3xl font-bold tabular-nums text-foreground">
                {insights ? `${insights.meetingsOverview.overallRate}%` : '—'}
              </p>
              <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                frequência
              </span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {insights
                ? `${insights.meetingsOverview.totalMeetings} reuniões · ${lowFreqMembers.length} abaixo de 75%`
                : 'Sem dados no período'}
            </p>
          </div>
          <Link
            href="/reunioes"
            className="mt-3 pt-2.5 border-t border-border/60 text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:underline inline-flex items-center justify-between"
          >
            <span>Abrir reuniões</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 sm:p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">Efetivo &amp; Disciplinar</span>
            <Users className="h-4 w-4 text-purple-500" />
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <p className="font-display text-3xl font-bold tabular-nums text-foreground">
                {insights ? insights.rosterSummary.totalActive : '—'}
              </p>
              <span className="text-xs text-muted-foreground">ativos</span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {insights
                ? `${insights.rosterSummary.harpiaCount} Harpia · ${insights.rosterSummary.nautilusCount} Nautilus · ${disciplinaryAlertCount} ocorrência(s)`
                : 'Quadro operacional'}
            </p>
          </div>
          <Link
            href="/gestao/advertencias"
            className="mt-3 pt-2.5 border-t border-border/60 text-xs font-medium text-purple-600 dark:text-purple-400 hover:underline inline-flex items-center justify-between"
          >
            <span>Quadro disciplinar</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </section>

      {/* 3. CENTRAL DE AÇÃO DA GESTÃO */}
      <section aria-labelledby="pendencies-center-heading" className="min-w-0 max-w-full space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-4 sm:px-5 shadow-xs">
          <div className="flex min-w-0 items-center gap-3">
            <span
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                pendencies.totalApprovals > 0
                  ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                  : totalRadarsCount > 0
                  ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                  : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
              }`}
            >
              <ListChecks className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <h2 id="pendencies-center-heading" className="text-base sm:text-lg font-semibold text-foreground">
                Central de Decisões &amp; Radares
              </h2>
              <p className="text-xs text-muted-foreground">
                Organizado por prioridade: primeiro o que exige sua aprovação/triagem, depois os radares de cobrança e acompanhamento.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 tabular-nums ${
                pendencies.totalApprovals > 0
                  ? 'bg-rose-600 text-white'
                  : 'border border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
              }`}
            >
              {pendencies.totalApprovals} decisões imediatas
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/60 px-3 py-1 text-foreground tabular-nums">
              {totalRadarsCount} itens em radar
            </span>
          </div>
        </div>

        {/* SEÇÃO A: DECISÕES & TRIAGENS IMEDIATAS */}
        <div id="secao-aprovacoes" className="scroll-mt-20 space-y-3 min-w-0 max-w-full">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground">
                Seção A · Decisões &amp; Triagens Imediatas
              </h3>
              <p className="text-xs text-muted-foreground">
                Aprovações, pedidos do site, justificativas, contas e ideias/bugs esperando uma resposta da gestão.
              </p>
            </div>
          </div>

          {approvalQueues.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 min-w-0 max-w-full">
              {approvalQueues.map((queue) => (
                <PendencyQueueCard key={queue.key} queue={queue} />
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-800 dark:text-emerald-200">
              <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <div>
                <p className="font-semibold">Nenhuma decisão imediata pendente</p>
                <p className="text-xs opacity-90">
                  Reembolsos, triagens de ideias/bugs, contas, alterações do site, e-mails e justificativas estão em dia.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* SEÇÃO B: RADARES DE ATENÇÃO & COBRANÇA */}
        <div id="secao-atencao" className="scroll-mt-20 space-y-3 min-w-0 max-w-full">
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground">
              Seção B · Radares de Atenção &amp; Cobrança
            </h3>
            <p className="text-xs text-muted-foreground">
              Acompanhamento contínuo de cadastros incompletos, disciplina, baixa frequência em reuniões e meta semanal no lab.
            </p>
          </div>

          {attentionQueues.length > 0 || lowFreqMembers.length > 0 || labBelowTarget.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 min-w-0 max-w-full">
              {attentionQueues.map((queue) => (
                <PendencyQueueCard key={queue.key} queue={queue} />
              ))}

              {/* Radar Compacto: Baixa Frequência em Reuniões (< 75%) */}
              {lowFreqMembers.length > 0 && (
                <article className="flex min-w-0 max-w-full flex-col justify-between overflow-hidden rounded-xl border border-amber-500/35 bg-amber-500/[0.04] p-4 sm:p-5 shadow-xs">
                  <div className="space-y-3 min-w-0">
                    <div className="flex items-start justify-between gap-2 min-w-0">
                      <div className="flex min-w-0 items-center gap-2.5">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400">
                          <AlertTriangle className="h-4 w-4" />
                        </span>
                        <div className="min-w-0">
                          <span className="block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                            Radar operacional
                          </span>
                          <h4 className="text-sm font-semibold text-foreground leading-snug break-words">
                            Baixa frequência em reuniões (&lt; 75%)
                          </h4>
                        </div>
                      </div>
                      <span className="inline-flex h-6 min-w-6 shrink-0 items-center justify-center rounded-full bg-amber-500 px-2 font-mono text-xs font-bold text-zinc-950 tabular-nums">
                        {lowFreqMembers.length}
                      </span>
                    </div>

                    <p className="text-xs leading-relaxed text-muted-foreground">
                      Integrantes com maior acúmulo de faltas nas reuniões de área (período 26.2).
                    </p>

                    <ul className="divide-y divide-border/70 rounded-lg border border-border/80 bg-card/90 px-3 min-w-0">
                      {lowFreqMembers.slice(0, 5).map((m) => (
                        <li key={m.id} className="flex min-w-0 items-center justify-between gap-2 py-2">
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-xs font-medium text-foreground">{m.name}</p>
                            <p className="truncate text-[11px] text-muted-foreground">{m.area}</p>
                          </div>
                          <div className="shrink-0 text-right">
                            <span className="font-mono text-xs font-bold text-red-600 dark:text-red-400 tabular-nums">
                              {m.pct.toFixed(0)}%
                            </span>
                            <span className="block whitespace-nowrap text-[10px] text-muted-foreground">
                              {m.absences} falta(s) em {m.meetings}
                            </span>
                          </div>
                        </li>
                      ))}
                    </ul>

                    {lowFreqMembers.length > 5 && (
                      <p className="text-[11px] font-medium text-muted-foreground">
                        + {lowFreqMembers.length - 5} outro(s) integrante(s) neste radar
                      </p>
                    )}
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-2 pt-3 border-t border-border/60">
                    <Link
                      href="/reunioes"
                      className="inline-flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-lg bg-amber-500 px-3 py-2 text-xs font-semibold text-zinc-950 hover:bg-amber-400 transition-colors"
                    >
                      <span className="truncate">Abrir reuniões</span>
                      <ArrowRight className="h-3.5 w-3.5 shrink-0" />
                    </Link>
                    <Link
                      href="/gestao/emails?situation=MEETING_LOW_ATTENDANCE"
                      className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-xs font-medium text-foreground hover:bg-accent transition-colors"
                    >
                      <Mail className="h-3.5 w-3.5 shrink-0" />
                      <span>Notificar</span>
                    </Link>
                  </div>
                </article>
              )}

              {/* Radar Compacto: Abaixo da Meta do Lab na Semana Passada */}
              {labBelowTarget.length > 0 && (
                <article className="flex min-w-0 max-w-full flex-col justify-between overflow-hidden rounded-xl border border-rose-500/35 bg-rose-500/[0.04] p-4 sm:p-5 shadow-xs">
                  <div className="space-y-3 min-w-0">
                    <div className="flex items-start justify-between gap-2 min-w-0">
                      <div className="flex min-w-0 items-center gap-2.5">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-rose-500/15 text-rose-600 dark:text-rose-400">
                          <Clock3 className="h-4 w-4" />
                        </span>
                        <div className="min-w-0">
                          <span className="block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                            Radar operacional
                          </span>
                          <h4 className="text-sm font-semibold text-foreground leading-snug break-words">
                            Abaixo da meta do lab (semana passada)
                          </h4>
                        </div>
                      </div>
                      <span className="inline-flex h-6 min-w-6 shrink-0 items-center justify-center rounded-full bg-rose-600 px-2 font-mono text-xs font-bold text-white tabular-nums">
                        {labBelowTarget.length}
                      </span>
                    </div>

                    <p className="text-xs leading-relaxed text-muted-foreground">
                      Semana {period(overview.previousWeek)} · apenas integrantes com meta semanal ativa.
                    </p>

                    <ul className="divide-y divide-border/70 rounded-lg border border-border/80 bg-card/90 px-3 min-w-0">
                      {labBelowTarget.slice(0, 5).map((m) => (
                        <li key={m.id} className="flex min-w-0 items-center justify-between gap-2 py-2">
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-xs font-medium text-foreground">{m.name}</p>
                            <p className="truncate text-[11px] text-muted-foreground">
                              {m.area}
                              {m.pendingReviews > 0 ? ` · ${m.pendingReviews} rev.` : ''}
                            </p>
                          </div>
                          <div className="shrink-0 text-right">
                            <span className="font-mono text-xs font-bold text-rose-600 dark:text-rose-400 tabular-nums whitespace-nowrap">
                              {formatDuration(m.completedSeconds)}
                            </span>
                            <span className="block whitespace-nowrap text-[10px] text-muted-foreground tabular-nums">
                              faltam {formatDuration(m.remainingSeconds)}
                            </span>
                          </div>
                        </li>
                      ))}
                    </ul>

                    {labBelowTarget.length > 5 && (
                      <p className="text-[11px] font-medium text-muted-foreground">
                        + {labBelowTarget.length - 5} outro(s) integrante(s) abaixo da meta
                      </p>
                    )}
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-2 pt-3 border-t border-border/60">
                    <Link
                      href={`/gestao/presenca?week=${overview.previousWeek}`}
                      className="inline-flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-lg bg-rose-600 px-3 py-2 text-xs font-semibold text-white hover:bg-rose-500 transition-colors"
                    >
                      <span className="truncate">Ver semana passada</span>
                      <ArrowRight className="h-3.5 w-3.5 shrink-0" />
                    </Link>
                    <Link
                      href="/gestao/emails?situation=LAB_BELOW_GOAL"
                      className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-xs font-medium text-foreground hover:bg-accent transition-colors"
                    >
                      <Mail className="h-3.5 w-3.5 shrink-0" />
                      <span>Cobrar</span>
                    </Link>
                  </div>
                </article>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-800 dark:text-emerald-200">
              <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <p className="font-medium">Nenhum radar operacional com alerta no momento.</p>
            </div>
          )}
        </div>

        {/* BARRA DE FILAS EM DIA */}
        {clearQueues.length > 0 && (
          <div className="rounded-xl border border-border bg-muted/25 px-4 py-3 min-w-0">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="inline-flex items-center gap-1 font-semibold text-emerald-700 dark:text-emerald-400 mr-1">
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                Filas em dia:
              </span>
              {clearQueues.map((q) => (
                <Link
                  key={q.key}
                  href={q.href}
                  className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
                >
                  <span>{q.shortLabel}</span>
                  <span className="font-mono text-[10px] text-emerald-600 dark:text-emerald-400">
                    (0)
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* 4. ANÁLISE & MAPA DE MÓDULOS DA GESTÃO (EXCLUSIVO DE /gestao) */}
      {!isHome && (
        <div className="space-y-8 pt-2 border-t border-border">
          {insights && (
            <div className="grid items-start gap-6 lg:grid-cols-2 min-w-0 max-w-full overflow-hidden">
              <section className="rounded-xl border border-border bg-card p-4 sm:p-6 shadow-xs min-w-0 max-w-full overflow-hidden">
                <div className="flex items-center justify-between gap-3 border-b border-border/70 pb-3">
                  <div className="min-w-0">
                    <h2 className="text-sm sm:text-base font-semibold text-foreground truncate">
                      Frequência em Reuniões por Área (Período 26.2)
                    </h2>
                    <p className="mt-0.5 text-xs text-muted-foreground truncate">
                      Taxa de presença acumulada nas reuniões de área registradas na plataforma.
                    </p>
                  </div>
                  <Link
                    href="/reunioes"
                    className="text-xs font-medium text-primary hover:underline shrink-0"
                  >
                    Ver matriz →
                  </Link>
                </div>
                {insights.meetingsOverview.areaPerformance.length > 0 ? (
                  <MeetingsPerformanceByAreaChart data={insights.meetingsOverview.areaPerformance} />
                ) : (
                  <p className="py-10 text-center text-sm text-muted-foreground">
                    Nenhuma reunião registrada no período atual.
                  </p>
                )}
              </section>

              <section className="rounded-xl border border-border bg-card p-4 sm:p-6 shadow-xs space-y-4 min-w-0 max-w-full overflow-hidden">
                <div className="flex items-center justify-between gap-3 border-b border-border/70 pb-3">
                  <div className="min-w-0">
                    <h2 className="text-sm sm:text-base font-semibold text-foreground truncate">
                      Saúde Disciplinar &amp; Ocorrências Recentes
                    </h2>
                    <p className="mt-0.5 text-xs text-muted-foreground truncate">
                      Proporção de integrantes regulares vs advertidos (2 avisos = 1 advertência).
                    </p>
                  </div>
                  <Link
                    href="/gestao/advertencias"
                    className="text-xs font-medium text-red-600 dark:text-red-400 hover:underline shrink-0"
                  >
                    Abrir gestão →
                  </Link>
                </div>

                <DisciplinaryHealthChart
                  regulares={insights.disciplinaryOverview.regularesCount}
                  atencao={insights.disciplinaryOverview.atencaoCount}
                  alerta={insights.disciplinaryOverview.alertaCount}
                  expulsao={insights.disciplinaryOverview.expulsosCount}
                />

                {insights.disciplinaryOverview.recentOccurrences.length > 0 && (
                  <div className="pt-2 border-t border-border/60">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                      Últimas ocorrências aplicadas
                    </p>
                    <ul className="divide-y divide-border/60 text-xs">
                      {insights.disciplinaryOverview.recentOccurrences.slice(0, 3).map((occ) => (
                        <li key={occ.id} className="py-2 flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <span className="font-semibold text-foreground">{occ.memberName}</span>
                            <span className="text-muted-foreground"> ({occ.memberArea})</span>
                            <p className="text-muted-foreground truncate mt-0.5">{occ.reason}</p>
                          </div>
                          <span
                            className={`shrink-0 px-2 py-0.5 rounded-full font-medium ${
                              occ.type === 'AVISO'
                                ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300'
                                : 'bg-red-500/15 text-red-700 dark:text-red-300'
                            }`}
                          >
                            {occ.type === 'AVISO' ? 'Aviso' : 'Advertência'}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </section>
            </div>
          )}

          {/* Mapa de Módulos da Gestão (4 Grupos) */}
          <section aria-labelledby="management-modules-heading" className="space-y-4">
            <div>
              <h2
                id="management-modules-heading"
                className="text-base sm:text-lg font-semibold text-foreground"
              >
                Mapa de Módulos da Gestão
              </h2>
              <p className="text-xs text-muted-foreground">
                Acesso direto às principais frentes administrativas da UFRJ Autônomos.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-xl border border-border bg-card p-4 shadow-xs space-y-3">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-foreground">
                  <Users className="h-4 w-4 text-primary" />
                  <span>Pessoas &amp; Acesso</span>
                </div>
                <ul className="space-y-1.5 text-sm">
                  <li>
                    <Link href="/gestao/integrantes" className="flex items-center justify-between rounded-lg px-2 py-1.5 hover:bg-accent text-foreground">
                      <span>Integrantes Ativos</span>
                      <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                    </Link>
                  </li>
                  <li>
                    <Link href="/gestao/contas" className="flex items-center justify-between rounded-lg px-2 py-1.5 hover:bg-accent text-foreground">
                      <span>Contas &amp; Permissões</span>
                      <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                    </Link>
                  </li>
                  <li>
                    <Link href="/gestao/ex-membros" className="flex items-center justify-between rounded-lg px-2 py-1.5 hover:bg-accent text-foreground">
                      <span>Ex-membros (Alumni)</span>
                      <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                    </Link>
                  </li>
                  <li>
                    <Link href="/gestao/divisoes" className="flex items-center justify-between rounded-lg px-2 py-1.5 hover:bg-accent text-foreground">
                      <span>Divisões (Harpia &amp; Nautilus)</span>
                      <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                    </Link>
                  </li>
                </ul>
              </div>

              <div className="rounded-xl border border-border bg-card p-4 shadow-xs space-y-3">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-foreground">
                  <Wrench className="h-4 w-4 text-blue-500" />
                  <span>Operação &amp; Rituais</span>
                </div>
                <ul className="space-y-1.5 text-sm">
                  <li>
                    <Link href="/gestao/presenca" className="flex items-center justify-between rounded-lg px-2 py-1.5 hover:bg-accent text-foreground">
                      <span>Presença no Laboratório</span>
                      <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                    </Link>
                  </li>
                  <li>
                    <Link href="/gestao/presenca/qr" className="flex items-center justify-between rounded-lg px-2 py-1.5 hover:bg-accent text-foreground">
                      <span>QR Code do Lab</span>
                      <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                    </Link>
                  </li>
                  <li>
                    <Link href="/reunioes" className="flex items-center justify-between rounded-lg px-2 py-1.5 hover:bg-accent text-foreground">
                      <span>Reuniões &amp; Atas</span>
                      <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                    </Link>
                  </li>
                  <li>
                    <Link href="/gestao/advertencias" className="flex items-center justify-between rounded-lg px-2 py-1.5 hover:bg-accent text-foreground">
                      <span>Gestão Disciplinar</span>
                      <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                    </Link>
                  </li>
                </ul>
              </div>

              <div className="rounded-xl border border-border bg-card p-4 shadow-xs space-y-3">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-foreground">
                  <Wallet className="h-4 w-4 text-emerald-500" />
                  <span>Financeiro, Patrimônio &amp; Melhorias</span>
                </div>
                <ul className="space-y-1.5 text-sm">
                  <li>
                    <Link href="/gestao/financeiro/reembolsos" className="flex items-center justify-between rounded-lg px-2 py-1.5 hover:bg-accent text-foreground">
                      <span>Reembolsos</span>
                      <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                    </Link>
                  </li>
                  <li>
                    <Link href="/gestao/financeiro/caixa" className="flex items-center justify-between rounded-lg px-2 py-1.5 hover:bg-accent text-foreground">
                      <span>Livro Caixa</span>
                      <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                    </Link>
                  </li>
                  <li>
                    <Link href="/gestao/financeiro/patrimonio" className="flex items-center justify-between rounded-lg px-2 py-1.5 hover:bg-accent text-foreground">
                      <span>Patrimônio &amp; Compras</span>
                      <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                    </Link>
                  </li>
                  <li>
                    <Link href="/gestao/melhorias" className="flex items-center justify-between rounded-lg px-2 py-1.5 hover:bg-accent text-foreground">
                      <span>Ideias &amp; Bugs</span>
                      <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                    </Link>
                  </li>
                </ul>
              </div>

              <div className="rounded-xl border border-border bg-card p-4 shadow-xs space-y-3">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-foreground">
                  <Globe className="h-4 w-4 text-amber-500" />
                  <span>Comunicação, Site &amp; Ensino</span>
                </div>
                <ul className="space-y-1.5 text-sm">
                  <li>
                    <Link href="/gestao/emails" className="flex items-center justify-between rounded-lg px-2 py-1.5 hover:bg-accent text-foreground">
                      <span>Central de E-mails</span>
                      <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                    </Link>
                  </li>
                  <li>
                    <Link href="/gestao/site" className="flex items-center justify-between rounded-lg px-2 py-1.5 hover:bg-accent text-foreground">
                      <span>Conteúdo do Site</span>
                      <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                    </Link>
                  </li>
                  <li>
                    <Link href="/gestao/site/membros" className="flex items-center justify-between rounded-lg px-2 py-1.5 hover:bg-accent text-foreground">
                      <span>Exibição de Membros</span>
                      <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                    </Link>
                  </li>
                  <li>
                    <Link href="/gestao/projetos" className="flex items-center justify-between rounded-lg px-2 py-1.5 hover:bg-accent text-foreground">
                      <span>Projetos</span>
                      <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                    </Link>
                  </li>
                  <li>
                    <Link href="/gestao/sistema" className="flex items-center justify-between rounded-lg px-2 py-1.5 hover:bg-accent text-foreground">
                      <span>Sistema &amp; Ensino</span>
                      <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                    </Link>
                  </li>
                </ul>
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
