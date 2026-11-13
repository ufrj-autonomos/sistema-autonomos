import { ManagementOverview } from '@/components/gestao/management-overview';
import { AttendanceCard } from '@/components/attendance/attendance-card';
import { attendanceReport } from '@/lib/attendance/service';
import Link from 'next/link';
import { hasManagementAccess } from '@/lib/access-policy';
import {
  ArrowRight,
  BookOpen,
  ShieldCheck,
  UserCircle,
  CalendarCheck,
  Clock3,
  Users,
  Award,
  TrendingUp,
  Layers,
  Wallet,
} from 'lucide-react';
import { requirePageUser } from '@/lib/session';
import { prisma } from '@/lib/prisma';
import { getMemberDisciplinarySummary } from '@/lib/disciplinary/service';
import { MemberWarningBanner } from '@/components/disciplinary/member-warning-banner';
import { getMemberHomeInsights } from '@/lib/platform-insights';
import {
  MemberWeeklyLabChart,
  MeetingsPerformanceByAreaChart,
} from '@/components/gestao/dashboard-charts';

export const dynamic = 'force-dynamic';

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

  if (hasManagementAccess(user.role)) {
    const personalAttendance = await attendanceReport(undefined, user.id).catch(() => null);

    return (
      <div className="mx-auto w-full max-w-[1680px] px-2.5 sm:px-4 md:px-6 py-6 sm:py-8 space-y-8">
        <ManagementOverview name={user.name} userId={user.id} user={user} />

        <section className="pt-4 border-t border-border">
          <AttendanceCard initial={personalAttendance} />
        </section>
      </div>
    );
  }

  const [disciplinary, courses, attendance, homeInsights] = await Promise.all([
    getMemberDisciplinarySummary(user.id),
    prisma.course.findMany({
      where: { published: true },
      orderBy: { orderIndex: 'asc' },
      select: {
        id: true,
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
  ]);

  const myLabMember = attendance?.members[0] || null;
  const completedHours = myLabMember
    ? Number((myLabMember.completedSeconds / 3600).toFixed(1))
    : 0;
  const requiredHours =
    myLabMember && myLabMember.requiredSeconds > 0
      ? Number((myLabMember.requiredSeconds / 3600).toFixed(1))
      : 2;
  const labPct =
    requiredHours > 0 ? Math.min(100, Math.round((completedHours / requiredHours) * 100)) : 100;

  return (
    <div className="mx-auto w-full max-w-[1600px] px-2.5 sm:px-4 md:px-6 py-6 sm:py-8 space-y-7">
      {/* Cabeçalho Principal do Integrante */}
      <header className="flex flex-wrap items-start justify-between gap-6 border-b border-border pb-6">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-2.5">
            {user.teamSlug === 'harpia' && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 border border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-500/30">
                ☁️ Divisão Harpia · Aeronaves Autônomas (UAV)
              </span>
            )}
            {user.teamSlug === 'nautilus' && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-100 text-sky-800 border border-sky-200 dark:bg-sky-900/30 dark:text-sky-300 dark:border-sky-500/30">
                🌊 Divisão Nautilus · Veículos Subaquáticos (AUV)
              </span>
            )}
            {(!user.teamSlug || user.teamSlug === 'autonomos') && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-zinc-100 text-zinc-800 border border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700">
                🤖 UFRJ Autônomos Geral
              </span>
            )}
            {user.area && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-accent text-foreground border border-border">
                Área: {user.area}
              </span>
            )}
          </div>
          <h1 className="font-display text-3xl font-semibold text-foreground sm:text-4xl">
            Olá, {user.name.split(' ')[0]}.
          </h1>
          <p className="mt-2 max-w-2xl text-sm sm:text-base leading-relaxed text-muted-foreground">
            {user.teamSlug === 'harpia'
              ? 'Acompanhe sua frequência em reuniões, presença semanal no laboratório e o desempenho da Divisão Harpia.'
              : user.teamSlug === 'nautilus'
              ? 'Acompanhe sua frequência em reuniões, presença semanal no laboratório e o desempenho da Divisão Nautilus.'
              : 'Acompanhe sua frequência em reuniões, presença semanal no laboratório e sua trilha técnica na UFRJ Autônomos.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            href="/reunioes"
            className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted transition"
          >
            <CalendarCheck className="h-4 w-4 text-primary" />
            Reuniões
          </Link>
          <Link
            href="/reembolsos"
            className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted transition"
          >
            <Wallet className="h-4 w-4 text-emerald-500" />
            Reembolsos
          </Link>
          <Link
            href="/perfil"
            className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted transition"
          >
            <UserCircle className="h-4 w-4" />
            Meu perfil
          </Link>
          {hasManagementAccess(user.role) && (
            <Link
              href="/gestao"
              className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted transition"
            >
              <ShieldCheck className="h-4 w-4" />
              Abrir gestão
            </Link>
          )}
        </div>
      </header>

      {/* Alerta Disciplinar do Integrante em Vermelho */}
      {disciplinary && <MemberWarningBanner summary={disciplinary} />}

      {/* Alerta de Cadastro Incompleto */}
      {!user.profileCompletedAt && (
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-700 dark:text-amber-200">
          <div>
            <p className="font-medium text-amber-700 dark:text-amber-100">
              Complete seu cadastro de integrante
            </p>
            <p className="mt-1 text-secondary-foreground">
              Adicione seu telefone, curso, DRE, contato de emergência e suas informações para o
              site institucional.
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

      {/* 4 KPIs DE PULSO PESSOAL E DA DIVISÃO */}
      {homeInsights && (
        <section
          aria-label="Resumo de indicadores do integrante"
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
        >
          {/* Card 1: Frequência em Reuniões */}
          <div className="rounded-xl border border-border bg-card p-5 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-semibold uppercase tracking-wider">
                Minhas Reuniões (26.2)
              </span>
              <CalendarCheck className="h-4 w-4 text-primary" />
            </div>
            <div className="mt-3">
              <div className="flex items-baseline gap-2.5">
                <span className="font-display text-3xl font-bold tabular-nums text-foreground">
                  {homeInsights.meetings.ratePct}%
                </span>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    homeInsights.meetings.status.tone === 'green'
                      ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                      : homeInsights.meetings.status.tone === 'yellow'
                      ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                      : homeInsights.meetings.status.tone === 'red'
                      ? 'bg-red-500/15 text-red-600 dark:text-red-400'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {homeInsights.meetings.status.label}
                </span>
              </div>
              <p className="mt-1.5 text-xs text-muted-foreground">
                {homeInsights.meetings.presences} presenças · {homeInsights.meetings.absences}{' '}
                faltas em {homeInsights.meetings.totalMeetings} reuniões
              </p>
            </div>
            <Link
              href="/reunioes"
              className="mt-3 pt-2.5 border-t border-border/60 text-xs font-medium text-primary hover:underline inline-flex items-center justify-between"
            >
              <span>Ver planilha da minha área</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {/* Card 2: Meta Semanal do Laboratório */}
          <div className="rounded-xl border border-border bg-card p-5 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-semibold uppercase tracking-wider">
                Horas no Lab (Semana)
              </span>
              <Clock3 className="h-4 w-4 text-blue-500" />
            </div>
            <div className="mt-3">
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-display text-3xl font-bold tabular-nums text-foreground">
                  {completedHours}h
                </span>
                <span className="text-xs font-mono text-muted-foreground">
                  meta: {requiredHours}h ({labPct}%)
                </span>
              </div>
              <div className="mt-2 h-2 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    completedHours >= requiredHours ? 'bg-emerald-500' : 'bg-blue-500'
                  }`}
                  style={{ width: `${labPct}%` }}
                />
              </div>
            </div>
            <p className="mt-3 pt-2.5 border-t border-border/60 text-xs text-muted-foreground">
              {completedHours >= requiredHours
                ? '✅ Meta semanal concluída!'
                : `Faltam ${Math.max(0, Number((requiredHours - completedHours).toFixed(1)))}h para concluir a semana`}
            </p>
          </div>

          {/* Card 3: Situação Disciplinar */}
          <div className="rounded-xl border border-border bg-card p-5 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-semibold uppercase tracking-wider">
                Status Disciplinar
              </span>
              <Award className="h-4 w-4 text-emerald-500" />
            </div>
            <div className="mt-3">
              <div className="flex items-center gap-2">
                <span className="font-display text-2xl font-bold text-foreground">
                  {disciplinary
                    ? disciplinary.totalWarnings === 0 && disciplinary.avisosCount === 0
                      ? '🟢 Regular'
                      : `🔴 ${disciplinary.totalWarnings} Adv. / ${disciplinary.avisosCount} Av.`
                    : '🟢 Regular'}
                </span>
              </div>
              <p className="mt-1.5 text-xs text-muted-foreground">
                {disciplinary && (disciplinary.totalWarnings > 0 || disciplinary.avisosCount > 0)
                  ? 'Atenção às diretrizes de conduta e presença'
                  : 'Nenhuma advertência ou aviso registrado'}
              </p>
            </div>
            <span className="mt-3 pt-2.5 border-t border-border/60 text-xs text-muted-foreground block">
              Regra: 2 Avisos = 1 Advertência
            </span>
          </div>

          {/* Card 4: Pulso da Divisão */}
          <div className="rounded-xl border border-border bg-card p-5 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-semibold uppercase tracking-wider">
                {homeInsights.teamPulse.teamName}
              </span>
              <Users className="h-4 w-4 text-purple-500" />
            </div>
            <div className="mt-3">
              <p className="font-display text-3xl font-bold tabular-nums text-foreground">
                {homeInsights.teamPulse.activeMembersCount}
              </p>
              <p className="mt-1.5 text-xs text-muted-foreground">
                integrantes ativos · {homeInsights.teamPulse.areaMembersCount} na sua área (
                {user.area || 'Geral'})
              </p>
            </div>
            <span className="mt-3 pt-2.5 border-t border-border/60 text-xs text-muted-foreground block">
              {homeInsights.teamPulse.projects.length} projeto(s) registrados na divisão
            </span>
          </div>
        </section>
      )}

      {/* CHECK-IN DE PRESENÇA NO LABORATÓRIO */}
      <AttendanceCard initial={attendance} />

      {/* GRÁFICOS DE INSIGHTS PESSOAIS & DA DIVISÃO */}
      {homeInsights && (
        <div className="grid items-start gap-6 lg:grid-cols-2 min-w-0 max-w-full overflow-hidden">
          {/* Gráfico 1: Meu Histórico Semanal de Horas no Laboratório */}
          <section className="rounded-xl border border-border bg-card p-4 sm:p-6 shadow-xs min-w-0 max-w-full overflow-hidden">
            <div className="flex items-center justify-between gap-3 border-b border-border/70 pb-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="p-2 rounded-lg bg-blue-500/10 text-blue-500 shrink-0">
                  <TrendingUp className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <h2 className="text-sm sm:text-base font-semibold text-foreground truncate">
                    Minha Evolução Semanal no Laboratório
                  </h2>
                  <p className="text-xs text-muted-foreground truncate">
                    Horas validadas nas últimas 6 semanas comparadas à meta semanal (2h).
                  </p>
                </div>
              </div>
            </div>
            <MemberWeeklyLabChart data={homeInsights.weeklyLabHistory} />
          </section>

          {/* Gráfico 2: Comparativo de Frequência das Áreas da Minha Equipe */}
          <section className="rounded-xl border border-border bg-card p-4 sm:p-6 shadow-xs min-w-0 max-w-full overflow-hidden">
            <div className="flex items-center justify-between gap-3 border-b border-border/70 pb-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500 shrink-0">
                  <CalendarCheck className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <h2 className="text-sm sm:text-base font-semibold text-foreground truncate">
                    Frequência nas Reuniões por Área ({homeInsights.teamPulse.teamName})
                  </h2>
                  <p className="text-xs text-muted-foreground truncate">
                    Desempenho coletivo das áreas da sua divisão no período 26.2.
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
      )}

      {/* HISTÓRICO DAS MINHAS ÚLTIMAS REUNIÕES & PROJETOS DA DIVISÃO */}
      {homeInsights && (
        <div className="grid items-start gap-6 lg:grid-cols-2">
          {/* Últimas Reuniões Contabilizadas do Integrante */}
          <section className="rounded-xl border border-border bg-card p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-border/70 pb-3">
              <div>
                <h2 className="text-base font-semibold text-foreground">
                  Meu Histórico Recente de Reuniões
                </h2>
                <p className="text-xs text-muted-foreground">
                  Suas últimas marcações de presença registradas pela coordenação.
                </p>
              </div>
              <Link href="/reunioes" className="text-xs font-medium text-primary hover:underline">
                Ver todas →
              </Link>
            </div>

            {homeInsights.meetings.recentMeetings.length > 0 ? (
              <ul className="divide-y divide-border/60">
                {homeInsights.meetings.recentMeetings.map((m) => {
                  const cfg = MEETING_BADGE[m.status] || MEETING_BADGE.PRESENT;
                  return (
                    <li key={m.id} className="py-3 flex items-center justify-between gap-3 text-sm">
                      <div className="min-w-0">
                        <p className="font-medium text-foreground truncate">{m.title}</p>
                        <p className="text-xs text-muted-foreground">
                          Área: {m.area} ·{' '}
                          {new Date(`${m.date}T12:00:00Z`).toLocaleDateString('pt-BR', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                          })}
                        </p>
                      </div>
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono font-bold border shrink-0 ${cfg.cls}`}
                      >
                        [{cfg.code}] {cfg.label}
                      </span>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Você ainda não possui presenças registradas em reuniões neste período.
              </p>
            )}
          </section>

          {/* Projetos da Divisão do Integrante */}
          <section className="rounded-xl border border-border bg-card p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-border/70 pb-3">
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-purple-500" />
                <div>
                  <h2 className="text-base font-semibold text-foreground">
                    Projetos de Engenharia ({homeInsights.teamPulse.teamName})
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Iniciativas e veículos desenvolvidos pela sua divisão.
                  </p>
                </div>
              </div>
            </div>

            {homeInsights.teamPulse.projects.length > 0 ? (
              <div className="space-y-2.5">
                {homeInsights.teamPulse.projects.map((proj) => (
                  <div
                    key={proj.id}
                    className="p-3.5 rounded-xl border border-border bg-muted/30 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-foreground">{proj.name}</span>
                        <span className="font-mono text-xs text-muted-foreground">
                          ({proj.year})
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        {proj.tagline}
                      </p>
                    </div>
                    <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-accent border border-border text-foreground shrink-0">
                      {proj.status}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Nenhum projeto listado para esta divisão no momento.
              </p>
            )}
          </section>
        </div>
      )}

      {/* TRILHA DE CAPACITAÇÃO & ENSINO */}
      <section aria-labelledby="courses-heading" className="space-y-4 pt-2">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 id="courses-heading" className="font-display text-xl font-semibold text-foreground">
              Trilhas de Capacitação Técnica
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Módulos de formação contínua em ROS 2, simulação e sistemas autônomos.
            </p>
          </div>
          <Link
            href="/ensino"
            className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-foreground hover:underline"
          >
            Ver grade completa
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {courses.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2">
            {courses.map((course) => {
              const progress = Math.round(course.courseProgress[0]?.percentage || 0);
              return (
                <Link
                  key={course.id}
                  href="/ensino"
                  className="group flex flex-col justify-between rounded-xl border border-border bg-card p-6 hover:border-foreground/30 transition shadow-xs"
                >
                  <div>
                    <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
                      <span>{course.level}</span>
                      <span>
                        {course._count.modules} módulos · {course.durationHours}h
                      </span>
                    </div>
                    <h3 className="mt-3 font-display text-lg font-semibold text-foreground group-hover:underline">
                      {course.title}
                    </h3>
                    {course.subtitle && (
                      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                        {course.subtitle}
                      </p>
                    )}
                  </div>
                  <div className="mt-6">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Progresso na trilha</span>
                      <span className="font-mono font-semibold text-foreground">{progress}%</span>
                    </div>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
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
