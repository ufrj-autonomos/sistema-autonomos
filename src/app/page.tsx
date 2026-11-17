import { ManagementOverview } from '@/components/gestao/management-overview';
import { AttendanceCard } from '@/components/attendance/attendance-card';
import { attendanceReport } from '@/lib/attendance/service';
import Link from 'next/link';
import { hasEffectiveRole, hasManagementAccess } from '@/lib/access-policy';
import {
  AlertCircle,
  ArrowRight,
  Bell,
  BookOpen,
  CalendarCheck,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  GraduationCap,
  Layers,
  Lightbulb,
  Receipt,
  TrendingUp,
  UserCircle,
  Users,
  Wallet,
} from 'lucide-react';
import { requirePageUser } from '@/lib/session';
import { prisma } from '@/lib/prisma';
import { getMemberDisciplinarySummary } from '@/lib/disciplinary/service';
import { MemberWarningBanner } from '@/components/disciplinary/member-warning-banner';
import { getMemberHomeInsights } from '@/lib/platform-insights';
import {
  canAccessEvaluations,
  getHomeAreaEvaluations,
  getPendingEvaluationsSummary,
} from '@/lib/evaluations/service';
import { HomeAreaScoresSection } from '@/components/evaluations/home-area-scores-section';
import {
  MemberWeeklyLabChart,
  MeetingsPerformanceByAreaChart,
} from '@/components/gestao/dashboard-charts';

export const dynamic = 'force-dynamic';

function formatCurrencyCents(cents: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
    (cents || 0) / 100
  );
}

const REIMBURSEMENT_STATUS_LABELS: Record<string, string> = {
  PENDENTE: 'Pendente',
  APROVADO: 'Aprovado',
  AGUARDANDO_REEMBOLSO: 'Aguardando pgto',
  AGUARDANDO_NF: 'Enviar NF',
  PAGO: 'Pago',
  RECUSADO: 'Recusado',
};

const FEEDBACK_STATUS_SHORT: Record<string, string> = {
  RECEBIDA: 'Recebida',
  EM_ANALISE: 'Em análise',
  APROVADA: 'Aceita',
  EM_ANDAMENTO: 'Em andamento',
  APLICADA: 'Aplicada',
  ARQUIVADA: 'Arquivada',
};

const MEETING_BADGE: Record<string, { code: string; label: string; cls: string }> = {
  PRESENT: {
    code: 'P',
    label: 'Presente',
    cls: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
  },
  JUSTIFIED: {
    code: 'J',
    label: 'Justificada',
    cls: 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30',
  },
  LATE: {
    code: 'A',
    label: 'Atraso',
    cls: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30',
  },
  ABSENT: {
    code: 'F',
    label: 'Falta',
    cls: 'bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/30',
  },
  NO_MEETING: {
    code: 'S',
    label: 'Sem Reunião',
    cls: 'bg-zinc-500/15 text-zinc-600 dark:text-zinc-400 border-zinc-500/30',
  },
};

export default async function HomePage() {
  const user = await requirePageUser();

  if (hasManagementAccess(user)) {
    const [personalAttendance, homeInsights, areaEvaluations, pendingEvaluations] =
      await Promise.all([
        attendanceReport(undefined, user.id).catch(() => null),
        getMemberHomeInsights(user),
        getHomeAreaEvaluations(user).catch(() => null),
        canAccessEvaluations(user)
          ? getPendingEvaluationsSummary(user).catch(() => null)
          : Promise.resolve(null),
      ]);

    const userIsAdmin = hasEffectiveRole(user, 'ADMIN');
    const userIsCoordOnly = !userIsAdmin && hasEffectiveRole(user, 'COORDINATOR');

    const missingFields = homeInsights?.profileStatus.missingOperationalFields ?? [];
    const needsOperationalProfile = homeInsights
      ? !homeInsights.profileStatus.isOperationalComplete
      : !user.profileCompletedAt;

    const showEvaluationNotice = Boolean(
      pendingEvaluations &&
        (pendingEvaluations.pendingMembersCount > 0 ||
          pendingEvaluations.pendingAreasCount > 0 ||
          pendingEvaluations.pendingCoordinatorsCount > 0)
    );

    return (
      <div className="mx-auto w-full max-w-[1680px] min-w-0 overflow-x-clip px-2.5 sm:px-4 md:px-6 py-6 sm:py-8 space-y-8">
        {needsOperationalProfile && (
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-800 dark:text-amber-200">
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-amber-800 dark:text-amber-100">
                Complete seu cadastro operacional de integrante
              </p>
              <p className="mt-1 text-xs sm:text-sm text-secondary-foreground">
                {missingFields.length > 0
                  ? `Campos obrigatórios pendentes: ${missingFields.join(', ')}.`
                  : 'Preencha seus dados operacionais obrigatórios em Meu Perfil para regularizar seu cadastro interno.'}
              </p>
            </div>
            <Link
              href="/perfil"
              className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-amber-400 px-4 py-2 font-semibold text-zinc-950 hover:bg-amber-300"
            >
              Completar agora
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        )}

        {showEvaluationNotice && pendingEvaluations && (
          <div
            role="status"
            className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-yellow-500/40 bg-yellow-500/10 p-4 text-sm text-amber-900 dark:text-yellow-100"
          >
            <div className="flex min-w-0 flex-1 items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-yellow-400 text-zinc-950 shadow-2xs">
                <ClipboardCheck className="h-5 w-5" />
              </span>
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-amber-950 dark:text-yellow-100">
                    {userIsCoordOnly
                      ? `Avaliação mensal pendente · ${pendingEvaluations.periodLabel}`
                      : `Avaliações mensais pendentes · ${pendingEvaluations.periodLabel}`}
                  </p>
                  {pendingEvaluations.pendingMembersCount > 0 && (
                    <span className="inline-flex items-center rounded-full bg-yellow-400 px-2 py-0.5 font-mono text-xs font-bold text-zinc-950 tabular-nums">
                      {pendingEvaluations.pendingMembersCount} membro(s)
                    </span>
                  )}
                </div>
                <p className="text-xs sm:text-sm text-amber-900/90 dark:text-yellow-200/90">
                  {pendingEvaluations.pendingMembersCount > 0 ? (
                    userIsCoordOnly ? (
                      <>
                        Faltam{' '}
                        <strong>{pendingEvaluations.pendingMembersCount}</strong>{' '}
                        integrante(s) da sua área (
                        {pendingEvaluations.scopeLabel ?? user.area ?? 'área atual'})
                        sem avaliação lançada neste mês.
                      </>
                    ) : (
                      <>
                        <strong>{pendingEvaluations.pendingMembersCount}</strong>{' '}
                        integrante(s) ainda não foram avaliados pelos coordenadores
                        neste mês
                        {(pendingEvaluations.pendingAreasCount > 0 ||
                          pendingEvaluations.pendingCoordinatorsCount > 0) &&
                          ` (além de ${pendingEvaluations.pendingAreasCount} área(s) e ${pendingEvaluations.pendingCoordinatorsCount} coordenador(es))`}
                        .
                      </>
                    )
                  ) : (
                    <>
                      Todos os membros já foram avaliados, mas ainda há{' '}
                      {pendingEvaluations.pendingAreasCount} área(s) e{' '}
                      {pendingEvaluations.pendingCoordinatorsCount} coordenador(es)
                      sem nota neste mês.
                    </>
                  )}
                </p>
                {pendingEvaluations.pendingMembers.length > 0 && (
                  <p className="text-xs text-amber-900/80 dark:text-yellow-200/80 truncate">
                    Pendentes:{' '}
                    {pendingEvaluations.pendingMembers
                      .slice(0, 4)
                      .map((m) =>
                        userIsAdmin ? `${m.name} (${m.areaLabel})` : m.name
                      )
                      .join(', ')}
                    {pendingEvaluations.pendingMembers.length > 4 &&
                      ` e mais ${pendingEvaluations.pendingMembers.length - 4}`}
                  </p>
                )}
              </div>
            </div>
            <Link
              href="/gestao/avaliacoes"
              className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-lg bg-yellow-400 px-4 py-2 text-sm font-semibold text-zinc-950 hover:bg-yellow-300 transition-colors"
            >
              Avaliar agora
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        )}

        <ManagementOverview name={user.name} userId={user.id} user={user} variant="home" />

        {/* Meu Espaço de Integrante */}
        <section
          id="meu-ponto-lab"
          aria-labelledby="meu-espaco-heading"
          className="scroll-mt-20 pt-6 border-t border-border space-y-4"
        >
          <div>
            <h2
              id="meu-espaco-heading"
              className="font-display text-xl font-semibold text-foreground"
            >
              Meu Espaço de Integrante
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Acompanhe suas próprias horas no laboratório, sua frequência em reuniões e seus pedidos individuais.
            </p>
          </div>

          <div className="grid gap-5 lg:grid-cols-2 items-stretch">
            <AttendanceCard initial={personalAttendance} className="mt-0 h-full" />

            <div className="rounded-xl border border-border bg-card p-5 sm:p-6 flex flex-col justify-between gap-5 shadow-xs">
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-display text-lg font-semibold text-foreground">
                    Resumo Pessoal &amp; Atalhos
                  </h3>
                  {homeInsights && homeInsights.unreadNotificationsCount > 0 && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/40 bg-amber-500/15 px-2.5 py-0.5 text-xs font-semibold text-amber-800 dark:text-amber-300">
                      <Bell className="h-3.5 w-3.5" />
                      {homeInsights.unreadNotificationsCount} notificação(ões)
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div className="rounded-lg border border-border bg-muted/30 p-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Minhas Reuniões
                    </p>
                    <p className="mt-1 font-mono text-xl font-bold text-foreground tabular-nums">
                      {homeInsights ? `${homeInsights.meetings.ratePct}%` : '—'}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {homeInsights
                        ? `${homeInsights.meetings.presences}P · ${homeInsights.meetings.absences}F`
                        : 'Período 26.2'}
                    </p>
                  </div>

                  <div className="rounded-lg border border-border bg-muted/30 p-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Meus Reembolsos
                    </p>
                    <p className="mt-1 font-mono text-xl font-bold text-foreground tabular-nums">
                      {homeInsights
                        ? homeInsights.reimbursements.pendingCount +
                          homeInsights.reimbursements.approvedAwaitingProofCount
                        : 0}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      em aberto ({homeInsights?.reimbursements.paidCount ?? 0} pagos)
                    </p>
                  </div>

                  <div className="rounded-lg border border-border bg-muted/30 p-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Ideias &amp; Bugs
                    </p>
                    <p className="mt-1 font-mono text-xl font-bold text-foreground tabular-nums">
                      {homeInsights?.feedback.submittedCount ?? 0}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {homeInsights?.feedback.repliedCount ?? 0} com retorno
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 border-t border-border/60 pt-4">
                <Link
                  href="/areas"
                  className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-primary/40 bg-primary/10 px-3 text-xs font-semibold text-primary hover:bg-primary/20"
                >
                  <Layers className="h-3.5 w-3.5" />
                  Espaço das Áreas
                </Link>
                <Link
                  href="/reunioes"
                  className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-border bg-background px-3 text-xs font-medium text-foreground hover:bg-accent"
                >
                  <CalendarCheck className="h-3.5 w-3.5 text-primary" />
                  Reuniões
                </Link>
                <Link
                  href="/reembolsos"
                  className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-border bg-background px-3 text-xs font-medium text-foreground hover:bg-accent"
                >
                  <Wallet className="h-3.5 w-3.5 text-emerald-500" />
                  Reembolsos
                </Link>
                <Link
                  href="/melhorias"
                  className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-border bg-background px-3 text-xs font-medium text-foreground hover:bg-accent"
                >
                  <Lightbulb className="h-3.5 w-3.5 text-amber-500" />
                  Ideias &amp; Bugs
                </Link>
                <Link
                  href="/perfil"
                  className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-border bg-background px-3 text-xs font-medium text-foreground hover:bg-accent"
                >
                  <UserCircle className="h-3.5 w-3.5" />
                  Meu Perfil
                </Link>
                <Link
                  href="/ensino"
                  className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-border bg-background px-3 text-xs font-medium text-foreground hover:bg-accent"
                >
                  <GraduationCap className="h-3.5 w-3.5 text-purple-500" />
                  Cursos ROS 2
                </Link>
              </div>
            </div>
          </div>
        </section>

        {areaEvaluations ? (
          <section className="pt-2 border-t border-border">
            <HomeAreaScoresSection data={areaEvaluations} />
          </section>
        ) : null}
      </div>
    );
  }

  const [disciplinary, courses, attendance, homeInsights, areaEvaluations] = await Promise.all([
    getMemberDisciplinarySummary(user.id),
    prisma.course.findMany({
      where: { published: true },
      orderBy: { orderIndex: 'asc' },
      select: {
        id: true,
        slug: true,
        title: true,
        subtitle: true,
        level: true,
        durationHours: true,
        courseProgress: { where: { memberId: user.id }, select: { percentage: true } },
        _count: { select: { modules: true } },
      },
    }),
    attendanceReport(undefined, user.id).catch(() => null),
    getMemberHomeInsights(user),
    getHomeAreaEvaluations(user).catch(() => null),
  ]);

  const missingProfileFields = homeInsights?.profileStatus.missingOperationalFields ?? [];
  const needsOperationalProfile = homeInsights
    ? !homeInsights.profileStatus.isOperationalComplete
    : !user.profileCompletedAt;

  const avgCourseProgress =
    courses.length > 0
      ? Math.round(
          courses.reduce((acc, c) => acc + (c.courseProgress[0]?.percentage || 0), 0) /
            courses.length
        )
      : 0;
  const nextCourse =
    courses.find((c) => Math.round(c.courseProgress[0]?.percentage || 0) < 100) || courses[0] || null;

  return (
    <div className="mx-auto w-full max-w-[1600px] min-w-0 overflow-x-clip px-2.5 sm:px-4 md:px-6 py-6 sm:py-8 space-y-8">
      {/* 1. CABEÇALHO DO INTEGRANTE */}
      <header className="flex flex-wrap items-start justify-between gap-5 border-b border-border pb-6">
        <div className="min-w-0 flex-1 basis-72">
          <div className="flex flex-wrap items-center gap-2 mb-2.5">
            {user.teamSlug === 'harpia' && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 border border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-500/30">
                ☁️ Divisão Harpia · UAV
              </span>
            )}
            {user.teamSlug === 'nautilus' && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-100 text-sky-800 border border-sky-200 dark:bg-sky-900/30 dark:text-sky-300 dark:border-sky-500/30">
                🌊 Divisão Nautilus · AUV
              </span>
            )}
            {(!user.teamSlug || user.teamSlug === 'autonomos') && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-zinc-100 text-zinc-800 border border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700">
                🤖 UFRJ Autônomos
              </span>
            )}
            {user.area && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-accent text-foreground border border-border">
                Área: {user.area}
              </span>
            )}
            {homeInsights && homeInsights.unreadNotificationsCount > 0 && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/35">
                <Bell className="h-3 w-3" />
                {homeInsights.unreadNotificationsCount} notificação(ões)
              </span>
            )}
          </div>
          <h1 className="font-display text-3xl font-semibold text-foreground sm:text-4xl">
            Olá, {user.name.split(' ')[0]}.
          </h1>
          <p className="mt-1.5 max-w-2xl text-sm sm:text-base leading-relaxed text-muted-foreground">
            Tudo o que você precisa na equipe em um só lugar: ponto do laboratório, reuniões, reembolsos, ideias &amp; bugs, seu perfil e capacitação.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/areas"
            className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-primary/40 bg-primary/10 px-4 py-2 text-sm font-semibold text-primary hover:bg-primary/20 transition"
          >
            <Layers className="h-4 w-4" />
            Minha Área &amp; Tarefas
          </Link>
          <Link
            href="/presenca"
            className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition"
          >
            <Clock3 className="h-4 w-4" />
            Ponto no Lab
          </Link>
          <Link
            href="/reunioes"
            className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-border bg-card px-3.5 py-2 text-sm font-medium text-foreground hover:bg-accent transition"
          >
            <CalendarCheck className="h-4 w-4 text-primary" />
            Reuniões
          </Link>
          <Link
            href="/reembolsos"
            className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-border bg-card px-3.5 py-2 text-sm font-medium text-foreground hover:bg-accent transition"
          >
            <Wallet className="h-4 w-4 text-emerald-500" />
            Pedir Reembolso
          </Link>
          <Link
            href="/melhorias"
            className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-border bg-card px-3.5 py-2 text-sm font-medium text-foreground hover:bg-accent transition"
          >
            <Lightbulb className="h-4 w-4 text-amber-500" />
            Ideias &amp; Bugs
          </Link>
          <Link
            href="/perfil"
            className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-border bg-card px-3.5 py-2 text-sm font-medium text-foreground hover:bg-accent transition"
          >
            <UserCircle className="h-4 w-4" />
            Meu Perfil
          </Link>
        </div>
      </header>

      {/* 2. ALERTAS PESSOAIS PRIORITÁRIOS */}
      <div className="space-y-3">
        {disciplinary && <MemberWarningBanner summary={disciplinary} />}

        {needsOperationalProfile && (
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-amber-500/35 bg-amber-500/10 p-4 text-sm text-amber-900 dark:text-amber-200">
            <div className="flex min-w-0 flex-1 items-start gap-3">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
              <div className="min-w-0">
                <p className="font-semibold text-amber-900 dark:text-amber-100">
                  Seu cadastro operacional ainda tem pendências
                </p>
                <p className="mt-0.5 text-xs sm:text-sm text-secondary-foreground">
                  {missingProfileFields.length > 0
                    ? `Campos obrigatórios pendentes: ${missingProfileFields.join(', ')}.`
                    : 'Preencha seus dados operacionais obrigatórios (telefone, curso, DRE, período, CPF e contato de emergência) em Meu Perfil.'}
                </p>
              </div>
            </div>
            <Link
              href="/perfil"
              className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-lg bg-amber-400 px-4 py-2 text-xs sm:text-sm font-semibold text-zinc-950 hover:bg-amber-300"
            >
              Completar cadastro
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        )}

        {homeInsights && homeInsights.reimbursements.approvedAwaitingProofCount > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-sky-500/35 bg-sky-500/10 p-4 text-sm text-sky-900 dark:text-sky-200">
            <div className="flex min-w-0 flex-1 items-start gap-3">
              <Receipt className="mt-0.5 h-5 w-5 shrink-0 text-sky-600 dark:text-sky-400" />
              <div className="min-w-0">
                <p className="font-semibold">
                  Você tem {homeInsights.reimbursements.approvedAwaitingProofCount} reembolso(s) aguardando envio de Nota Fiscal / comprovante
                </p>
                <p className="mt-0.5 text-xs sm:text-sm opacity-90">
                  Envie a NF na tela de reembolsos para concluir o fechamento financeiro.
                </p>
              </div>
            </div>
            <Link
              href="/reembolsos"
              className="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-lg bg-sky-600 px-4 py-2 text-xs sm:text-sm font-semibold text-white hover:bg-sky-500"
            >
              Enviar comprovante
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        )}
      </div>

      {/* 3. BLOCO 1 — MINHA SEMANA NA EQUIPE */}
      <section aria-labelledby="minha-semana-heading" className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 id="minha-semana-heading" className="font-display text-lg font-semibold text-foreground">
            Minha Semana na Equipe
          </h2>
          {disciplinary && (
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-0.5 text-xs font-semibold ${
                disciplinary.totalWarnings === 0 && disciplinary.avisosCount === 0
                  ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                  : 'border-rose-500/35 bg-rose-500/10 text-rose-700 dark:text-rose-300'
              }`}
            >
              {disciplinary.totalWarnings === 0 && disciplinary.avisosCount === 0
                ? 'Situação disciplinar regular'
                : `${disciplinary.totalWarnings} Adv. / ${disciplinary.avisosCount} Av.`}
            </span>
          )}
        </div>

        <div className="grid gap-5 lg:grid-cols-12 items-stretch">
          <div className="lg:col-span-7">
            <AttendanceCard initial={attendance} className="mt-0 h-full" />
          </div>

          <section className="lg:col-span-5 rounded-xl border border-border bg-card p-5 sm:p-6 shadow-xs flex flex-col justify-between gap-4">
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="flex items-center gap-2 font-display text-lg font-semibold text-foreground">
                    <CalendarCheck className="h-5 w-5 text-primary" />
                    Minhas Reuniões (26.2)
                  </h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Frequência acumulada e últimas atas registradas pela coordenação.
                  </p>
                </div>
                {homeInsights && (
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      homeInsights.meetings.status.tone === 'green'
                        ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                        : homeInsights.meetings.status.tone === 'yellow'
                        ? 'bg-amber-500/15 text-amber-800 dark:text-amber-300'
                        : homeInsights.meetings.status.tone === 'red'
                        ? 'bg-red-500/15 text-red-700 dark:text-red-300'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {homeInsights.meetings.ratePct}% · {homeInsights.meetings.status.label}
                  </span>
                )}
              </div>

              {homeInsights && (
                <div className="flex flex-wrap gap-3 text-xs text-muted-foreground border-y border-border/70 py-2.5">
                  <span>
                    <strong className="text-foreground font-mono">{homeInsights.meetings.presences}</strong> presenças
                  </span>
                  <span>·</span>
                  <span>
                    <strong className="text-foreground font-mono">{homeInsights.meetings.absences}</strong> faltas
                  </span>
                  <span>·</span>
                  <span>
                    <strong className="text-foreground font-mono">{homeInsights.meetings.justifiedCount}</strong> justificadas
                  </span>
                  {homeInsights.meetings.lateCount > 0 && (
                    <>
                      <span>·</span>
                      <span>
                        <strong className="text-foreground font-mono">{homeInsights.meetings.lateCount}</strong> atrasos
                      </span>
                    </>
                  )}
                </div>
              )}

              {homeInsights && homeInsights.meetings.recentMeetings.length > 0 ? (
                <ul className="divide-y divide-border/60">
                  {homeInsights.meetings.recentMeetings.slice(0, 4).map((m) => {
                    const cfg = MEETING_BADGE[m.status] || MEETING_BADGE.PRESENT;
                    return (
                      <li key={m.id} className="py-2 flex items-center justify-between gap-2.5 text-xs">
                        <div className="min-w-0">
                          <p className="font-medium text-foreground truncate">{m.title}</p>
                          <p className="text-[11px] text-muted-foreground truncate">
                            {m.area} ·{' '}
                            {new Date(`${m.date}T12:00:00Z`).toLocaleDateString('pt-BR', {
                              day: '2-digit',
                              month: '2-digit',
                            })}
                          </p>
                        </div>
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-mono font-bold border shrink-0 ${cfg.cls}`}
                        >
                          [{cfg.code}] {cfg.label}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="py-4 text-xs text-muted-foreground">
                  Nenhuma reunião registrada para você neste período até o momento.
                </p>
              )}
            </div>

            <Link
              href="/reunioes"
              className="inline-flex min-h-10 items-center justify-between rounded-lg border border-border bg-muted/30 px-3.5 text-xs font-semibold text-foreground hover:bg-accent transition"
            >
              <span>Ver atas e planilha completa</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </section>
        </div>
      </section>

      {/* 4. BLOCO 2 — CENTRAL DE SERVIÇOS DO INTEGRANTE (HUB DE 4 CARDS) */}
      <section aria-labelledby="hub-integrante-heading" className="space-y-3">
        <div>
          <h2 id="hub-integrante-heading" className="font-display text-lg font-semibold text-foreground">
            Central de Serviços do Integrante
          </h2>
          <p className="mt-0.5 text-xs sm:text-sm text-muted-foreground">
            Acompanhe seus reembolsos, ideias enviadas, completude cadastral e trilhas de aprendizado.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {/* Card 1: Meus Reembolsos */}
          <article className="rounded-xl border border-border bg-card p-5 shadow-xs flex flex-col justify-between gap-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <Wallet className="h-4 w-4 text-emerald-500" />
                  Meus Reembolsos
                </span>
                {homeInsights && homeInsights.reimbursements.totalPendingCents > 0 && (
                  <span className="font-mono text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                    {formatCurrencyCents(homeInsights.reimbursements.totalPendingCents)}
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <p className="font-display text-2xl font-bold tabular-nums text-foreground">
                  {homeInsights
                    ? homeInsights.reimbursements.pendingCount +
                      homeInsights.reimbursements.approvedAwaitingProofCount
                    : 0}
                </p>
                <span className="text-xs text-muted-foreground">
                  em andamento · {homeInsights?.reimbursements.paidCount ?? 0} pago(s)
                </span>
              </div>

              {homeInsights && homeInsights.reimbursements.recent.length > 0 ? (
                <ul className="space-y-1.5 border-t border-border/60 pt-2.5 text-xs">
                  {homeInsights.reimbursements.recent.slice(0, 2).map((r) => (
                    <li key={r.id} className="flex items-center justify-between gap-2">
                      <span className="truncate text-foreground font-medium">
                        <span className="font-mono text-muted-foreground mr-1">{r.code}</span>
                        {r.title}
                      </span>
                      <span className="shrink-0 rounded-full border border-border bg-muted/50 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                        {REIMBURSEMENT_STATUS_LABELS[r.status] || r.status}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Nenhuma solicitação de reembolso enviada ainda.
                </p>
              )}
            </div>

            <Link
              href="/reembolsos"
              className="inline-flex min-h-10 items-center justify-between rounded-lg border border-border bg-muted/30 px-3 text-xs font-semibold text-foreground hover:bg-accent transition"
            >
              <span>Abrir reembolsos</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </article>

          {/* Card 2: Mural de Ideias & Bugs */}
          <article className="rounded-xl border border-border bg-card p-5 shadow-xs flex flex-col justify-between gap-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <Lightbulb className="h-4 w-4 text-amber-500" />
                  Ideias &amp; Bugs
                </span>
                {homeInsights && homeInsights.feedback.appliedCount > 0 && (
                  <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300">
                    {homeInsights.feedback.appliedCount} aplicada(s)
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <p className="font-display text-2xl font-bold tabular-nums text-foreground">
                  {homeInsights?.feedback.submittedCount ?? 0}
                </p>
                <span className="text-xs text-muted-foreground">
                  enviada(s) · {homeInsights?.feedback.repliedCount ?? 0} respondida(s)
                </span>
              </div>

              {homeInsights && homeInsights.feedback.recent.length > 0 ? (
                <ul className="space-y-1.5 border-t border-border/60 pt-2.5 text-xs">
                  {homeInsights.feedback.recent.slice(0, 2).map((f) => (
                    <li key={f.id} className="flex items-center justify-between gap-2">
                      <span className="truncate text-foreground font-medium">
                        <span className="font-mono text-primary mr-1">{f.code}</span>
                        {f.title}
                      </span>
                      <span
                        className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium ${
                          f.hasResponse
                            ? 'border-primary/40 bg-primary/10 text-primary'
                            : 'border-border bg-muted/50 text-muted-foreground'
                        }`}
                      >
                        {f.hasResponse ? 'Respondida' : FEEDBACK_STATUS_SHORT[f.status] || f.status}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Envie sugestões de melhoria para a equipe, lab, site ou sistema.
                </p>
              )}
            </div>

            <Link
              href="/melhorias"
              className="inline-flex min-h-10 items-center justify-between rounded-lg border border-border bg-muted/30 px-3 text-xs font-semibold text-foreground hover:bg-accent transition"
            >
              <span>Enviar ou acompanhar</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </article>

          {/* Card 3: Meu Perfil & Vitrine no Site */}
          <article className="rounded-xl border border-border bg-card p-5 shadow-xs flex flex-col justify-between gap-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <UserCircle className="h-4 w-4 text-sky-500" />
                  Perfil &amp; Site
                </span>
                {homeInsights && (
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                      homeInsights.profileStatus.isOperationalComplete
                        ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                        : 'bg-amber-500/15 text-amber-800 dark:text-amber-300'
                    }`}
                  >
                    {homeInsights.profileStatus.isOperationalComplete
                      ? 'Cadastro completo'
                      : `${homeInsights.profileStatus.missingOperationalFields.length} pendente(s)`}
                  </span>
                )}
              </div>

              <div className="space-y-1.5 text-xs text-muted-foreground">
                <p className="flex items-center gap-1.5 text-foreground font-medium">
                  <CheckCircle2
                    className={`h-3.5 w-3.5 ${
                      homeInsights?.profileStatus.isOperationalComplete
                        ? 'text-emerald-500'
                        : 'text-amber-500'
                    }`}
                  />
                  {homeInsights?.profileStatus.isOperationalComplete
                    ? 'Cadastro operacional regularizado'
                    : 'Dados operacionais precisam de revisão'}
                </p>
                <p>
                  Vitrine do site:{' '}
                  {homeInsights?.profileStatus.siteLinked
                    ? homeInsights.profileStatus.hasSitePhoto && homeInsights.profileStatus.hasSiteBio
                      ? 'Foto e bio configuradas'
                      : 'Complete sua foto e bio do site'
                    : 'Aguardando vínculo no site'}
                </p>
                {homeInsights && homeInsights.profileStatus.pendingChangesCount > 0 && (
                  <p className="text-sky-700 dark:text-sky-300 font-medium">
                    {homeInsights.profileStatus.pendingChangesCount} alteração(ões) em revisão pela gestão
                  </p>
                )}
              </div>
            </div>

            <Link
              href="/perfil"
              className="inline-flex min-h-10 items-center justify-between rounded-lg border border-border bg-muted/30 px-3 text-xs font-semibold text-foreground hover:bg-accent transition"
            >
              <span>Atualizar meus dados</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </article>

          {/* Card 4: Capacitação & Cursos ROS 2 */}
          <article className="rounded-xl border border-border bg-card p-5 shadow-xs flex flex-col justify-between gap-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <GraduationCap className="h-4 w-4 text-purple-500" />
                  Capacitação
                </span>
                <span className="font-mono text-xs font-bold text-foreground tabular-nums">
                  {avgCourseProgress}%
                </span>
              </div>

              <div>
                <div className="flex items-baseline gap-2">
                  <p className="font-display text-2xl font-bold tabular-nums text-foreground">
                    {courses.length}
                  </p>
                  <span className="text-xs text-muted-foreground">
                    {courses.length === 1 ? 'trilha publicada' : 'trilhas publicadas'}
                  </span>
                </div>
                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-purple-500 transition-all"
                    style={{ width: `${Math.min(100, Math.max(0, avgCourseProgress))}%` }}
                  />
                </div>
              </div>

              {nextCourse ? (
                <p className="text-xs text-muted-foreground truncate">
                  Em foco: <strong className="text-foreground">{nextCourse.title}</strong>
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Trilhas de ROS 2 e sistemas autônomos.
                </p>
              )}
            </div>

            <Link
              href="/ensino"
              className="inline-flex min-h-10 items-center justify-between rounded-lg border border-border bg-muted/30 px-3 text-xs font-semibold text-foreground hover:bg-accent transition"
            >
              <span>Continuar trilhas</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </article>
        </div>
      </section>

      {/* 5. BLOCO 3 — DESEMPENHO & MINHA DIVISÃO */}
      {homeInsights && (
        <section aria-labelledby="desempenho-divisao-heading" className="space-y-6">
          <div>
            <h2
              id="desempenho-divisao-heading"
              className="font-display text-lg font-semibold text-foreground"
            >
              Desempenho &amp; Minha Divisão
            </h2>
            <p className="mt-0.5 text-xs sm:text-sm text-muted-foreground">
              Evolução das suas horas no laboratório, desempenho das áreas da divisão e projetos em andamento.
            </p>
          </div>

          <div className="grid items-start gap-6 lg:grid-cols-2 min-w-0 max-w-full overflow-hidden">
            <section className="rounded-xl border border-border bg-card p-4 sm:p-6 shadow-xs min-w-0 max-w-full overflow-hidden">
              <div className="flex items-center justify-between gap-3 border-b border-border/70 pb-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="p-2 rounded-lg bg-blue-500/10 text-blue-500 shrink-0">
                    <TrendingUp className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <h3 className="text-sm sm:text-base font-semibold text-foreground truncate">
                      Minha Evolução Semanal no Lab
                    </h3>
                    <p className="text-xs text-muted-foreground truncate">
                      Últimas 6 semanas validadas comparadas à sua meta.
                    </p>
                  </div>
                </div>
              </div>
              <MemberWeeklyLabChart data={homeInsights.weeklyLabHistory} />
            </section>

            <section className="rounded-xl border border-border bg-card p-4 sm:p-6 shadow-xs min-w-0 max-w-full overflow-hidden">
              <div className="flex items-center justify-between gap-3 border-b border-border/70 pb-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500 shrink-0">
                    <CalendarCheck className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <h3 className="text-sm sm:text-base font-semibold text-foreground truncate">
                      Frequência nas Reuniões ({homeInsights.teamPulse.teamName})
                    </h3>
                    <p className="text-xs text-muted-foreground truncate">
                      Comparativo coletivo das áreas no período 26.2.
                    </p>
                  </div>
                </div>
                <Link
                  href="/reunioes"
                  className="text-xs font-medium text-primary hover:underline shrink-0"
                >
                  Detalhes →
                </Link>
              </div>
              {homeInsights.meetings.teamAreaComparison.length > 0 ? (
                <MeetingsPerformanceByAreaChart data={homeInsights.meetings.teamAreaComparison} />
              ) : (
                <p className="py-10 text-center text-sm text-muted-foreground">
                  Nenhuma reunião contabilizada na sua divisão neste período.
                </p>
              )}
            </section>
          </div>
        </section>
      )}

      {/* NOTAS DAS ÁREAS */}
      {areaEvaluations ? (
        <section className="pt-2 border-t border-border">
          <HomeAreaScoresSection data={areaEvaluations} />
        </section>
      ) : null}

      {/* TRILHA DE CAPACITAÇÃO & ENSINO */}
      <section aria-labelledby="courses-heading" className="space-y-4 pt-2 border-t border-border">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 id="courses-heading" className="font-display text-lg font-semibold text-foreground">
              Trilhas de Capacitação Técnica
            </h2>
            <p className="mt-0.5 text-xs sm:text-sm text-muted-foreground">
              Módulos de formação contínua em ROS 2, simulação e sistemas autônomos.
            </p>
          </div>
          <Link
            href="/ensino"
            className="inline-flex min-h-10 items-center gap-2 text-sm font-medium text-foreground hover:underline"
          >
            Ver grade completa
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {courses.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2">
            {courses.map((course) => {
              const progress = Math.round(course.courseProgress[0]?.percentage || 0);
              const courseHref = course.slug === 'ros2-jazzy' ? '/ensino' : '/areas?tab=courses';
              return (
                <Link
                  key={course.id}
                  href={courseHref}
                  className="group flex flex-col justify-between rounded-xl border border-border bg-card p-5 hover:border-foreground/30 transition shadow-xs"
                >
                  <div>
                    <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
                      <span>{course.level}</span>
                      <span>
                        {course._count.modules} módulos · {course.durationHours}h
                      </span>
                    </div>
                    <h3 className="mt-2.5 font-display text-base sm:text-lg font-semibold text-foreground group-hover:underline">
                      {course.title}
                    </h3>
                    {course.subtitle && (
                      <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground line-clamp-2">
                        {course.subtitle}
                      </p>
                    )}
                  </div>
                  <div className="mt-4">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Progresso na trilha</span>
                      <span className="font-mono font-semibold text-foreground">{progress}%</span>
                    </div>
                    <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
                      />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
            <BookOpen className="mb-3 h-5 w-5 text-muted-foreground" />
            Nenhuma trilha publicada no momento.
          </div>
        )}
      </section>
    </div>
  );
}
