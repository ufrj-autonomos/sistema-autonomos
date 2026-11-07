import Link from 'next/link';
import {
  ArrowRight,
  BarChart3,
  PieChart as PieIcon,
  Users,
  CalendarCheck,
  ShieldAlert,
  Layers,
  Award,
  CheckCircle2,
} from 'lucide-react';
import { requirePageUser } from '@/lib/session';
import { getManagementAnalytics, analysisWeeks } from '@/lib/management-analytics';
import { getExtendedDashboardInsights } from '@/lib/platform-insights';
import { formatDuration } from '@/lib/attendance/format';
import {
  WeeklyPresenceChart,
  TeamDistributionChart,
  AreaDistributionChart,
  CoursesDistributionChart,
  AreaByTeamStackedChart,
  RolesHierarchyChart,
  MeetingsPerformanceByAreaChart,
  DisciplinaryHealthChart,
} from '@/components/gestao/dashboard-charts';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Dashboard — Gestão' };

const panel = 'min-w-0 rounded-xl border border-border bg-card p-5 sm:p-6 shadow-xs';
const button =
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-accent transition-colors';

function date(key: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    timeZone: 'America/Sao_Paulo',
  }).format(new Date(`${key}T12:00:00Z`));
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ weeks?: string }>;
}) {
  const user = await requirePageUser(true);
  const params = await searchParams;
  const [data, extended] = await Promise.all([
    getManagementAnalytics(analysisWeeks(params.weeks)),
    getExtendedDashboardInsights(user),
  ]);
  const roster = data.roster;
  const presence = data.presence;

  return (
    <div className="space-y-7">
      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-6">
        <div>
          <h1 className="font-display text-3xl font-semibold text-foreground">
            Dashboard analítico da equipe
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">
            Inteligência operacional consolidada: alocação entre divisões e áreas técnicas,
            pirâmide de cargos, frequência em reuniões 26.2, saúde disciplinar e evolução semanal
            de horas no laboratório.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <Link href="/gestao/divisoes" className={button}>
            Comparar divisões
          </Link>
          <Link href="/gestao/integrantes" className={button}>
            Abrir integrantes
            <ArrowRight size={16} />
          </Link>
        </div>
      </header>

      {roster ? (
        <>
          {/* 6 KPIs ESTRATÉGICOS DE GESTÃO */}
          <section
            aria-label="Indicadores estratégicos da equipe"
            className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-6"
          >
            <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Integrantes Ativos
              </p>
              <p className="mt-2 font-display text-3xl font-bold tabular-nums text-foreground">
                {roster.active}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {roster.total} no diretório ({roster.inactive} inativos)
              </p>
            </div>

            <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Reuniões (26.2)
              </p>
              <p className="mt-2 font-display text-3xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                {extended ? `${extended.summaryMetrics.meetingsOverallRate}%` : '—'}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {extended
                  ? `${extended.summaryMetrics.totalMeetingsHeld} reuniões contabilizadas`
                  : 'Taxa média de presença'}
              </p>
            </div>

            <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Adesão Lab ({data.weeks} sem)
              </p>
              <p className="mt-2 font-display text-3xl font-bold tabular-nums text-blue-600 dark:text-blue-400">
                {presence?.percentage !== null && presence?.percentage !== undefined
                  ? `${presence.percentage}%`
                  : '—'}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {presence
                  ? `${presence.totalMet}/${presence.totalRequired} metas cumpridas`
                  : 'Histórico semanal'}
              </p>
            </div>

            <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Saúde Disciplinar
              </p>
              <p className="mt-2 font-display text-3xl font-bold tabular-nums text-foreground">
                {extended ? `${extended.summaryMetrics.regularMembersPct}%` : '—'}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                integrantes regulares sem ocorrências
              </p>
            </div>

            <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Renovação (Trainees)
              </p>
              <p className="mt-2 font-display text-3xl font-bold tabular-nums text-purple-600 dark:text-purple-400">
                {extended ? `${extended.summaryMetrics.traineeRatioPct}%` : '—'}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                da equipe ativa em fase trainee
              </p>
            </div>

            <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Perfis & Acessos
              </p>
              <p className="mt-2 font-display text-3xl font-bold tabular-nums text-foreground">
                {roster.complete ?? '—'}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                completos · {roster.accessReady ?? '—'} contas ativas
              </p>
            </div>
          </section>

          {/* LINHA 1: DISTRIBUIÇÃO POR EQUIPE & DISTRIBUIÇÃO POR ÁREA TÉCNICA */}
          <div className="grid items-start gap-6 lg:grid-cols-2">
            <section className={panel}>
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                  <PieIcon className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-base font-semibold">Integrantes por equipe</h2>
                  <p className="text-xs text-muted-foreground">
                    Divisões robóticas Harpia, Nautilus e Geral ({roster.active} ativos).
                  </p>
                </div>
              </div>
              <TeamDistributionChart teams={roster.teams} total={roster.active} />
            </section>

            <section className={panel}>
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500">
                  <BarChart3 className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-base font-semibold">Integrantes por área</h2>
                  <p className="text-xs text-muted-foreground">
                    Distribuição pelas áreas técnicas e operacionais da iniciativa.
                  </p>
                </div>
              </div>
              <AreaDistributionChart areas={roster.areas} total={roster.active} />
            </section>
          </div>

          {/* LINHA 2 (NOVO): MATRIZ ÁREA x DIVISÃO & ESTRUTURA DE CARGOS POR DIVISÃO */}
          {extended && (
            <div className="grid items-start gap-6 lg:grid-cols-2">
              <section className={panel}>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-lg bg-purple-500/10 text-purple-500">
                      <Layers className="h-4 w-4" />
                    </div>
                    <div>
                      <h2 className="text-base font-semibold">
                        Alocação de Áreas por Divisão (Harpia vs Nautilus)
                      </h2>
                      <p className="text-xs text-muted-foreground">
                        Identifique gargalos de engenharia comparando o efetivo de cada área entre
                        as divisões.
                      </p>
                    </div>
                  </div>
                </div>
                <AreaByTeamStackedChart data={extended.areaByTeamMatrix} />
              </section>

              <section className={panel}>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-lg bg-amber-500/10 text-amber-500">
                      <Award className="h-4 w-4" />
                    </div>
                    <div>
                      <h2 className="text-base font-semibold">
                        Pirâmide de Senioridade & Cargos por Divisão
                      </h2>
                      <p className="text-xs text-muted-foreground">
                        Equilíbrio entre Liderança (Capitães/Coordenadores), Membros Efetivos e
                        Trainees.
                      </p>
                    </div>
                  </div>
                </div>
                <RolesHierarchyChart data={extended.rolesByTeam} />
              </section>
            </div>
          )}

          {/* LINHA 3 (NOVO): FREQUÊNCIA EM REUNIÕES POR ÁREA & PANORAMA DISCIPLINAR */}
          {extended && (
            <div className="grid items-start gap-6 lg:grid-cols-2">
              <section className={panel}>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500">
                      <CalendarCheck className="h-4 w-4" />
                    </div>
                    <div>
                      <h2 className="text-base font-semibold">
                        Taxa de Presença em Reuniões por Área (26.2)
                      </h2>
                      <p className="text-xs text-muted-foreground">
                        Comparativo de engajamento nas reuniões semanais de cada área.
                      </p>
                    </div>
                  </div>
                  <Link
                    href="/reunioes"
                    className="text-xs font-medium text-primary hover:underline shrink-0"
                  >
                    Abrir reuniões →
                  </Link>
                </div>
                {extended.meetingsByArea.length > 0 ? (
                  <MeetingsPerformanceByAreaChart data={extended.meetingsByArea} />
                ) : (
                  <p className="py-10 text-center text-sm text-muted-foreground">
                    Sem reuniões registradas no período.
                  </p>
                )}
              </section>

              <section className={panel}>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-lg bg-red-500/10 text-red-500">
                      <ShieldAlert className="h-4 w-4" />
                    </div>
                    <div>
                      <h2 className="text-base font-semibold">
                        Distribuição Disciplinar & Ocorrências por Área
                      </h2>
                      <p className="text-xs text-muted-foreground">
                        Monitoramento de avisos e advertências consolidadas na equipe.
                      </p>
                    </div>
                  </div>
                  <Link
                    href="/gestao/advertencias"
                    className="text-xs font-medium text-red-600 dark:text-red-400 hover:underline shrink-0"
                  >
                    Gerenciar →
                  </Link>
                </div>

                <DisciplinaryHealthChart
                  regulares={extended.disciplinaryStats.regulares}
                  atencao={extended.disciplinaryStats.atencao}
                  alerta={extended.disciplinaryStats.alerta}
                  expulsao={extended.disciplinaryStats.expulsao}
                />

                {extended.disciplinaryStats.byArea.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-border/60">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                      Ocorrências concentradas por área
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {extended.disciplinaryStats.byArea.map((item) => (
                        <div
                          key={item.area}
                          className="p-2 rounded-lg border border-border bg-muted/20 flex items-center justify-between text-xs"
                        >
                          <span className="font-medium text-foreground truncate">{item.area}</span>
                          <span className="font-mono text-muted-foreground shrink-0 ml-1">
                            {item.advertencias} adv · {item.avisos} av
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </section>
            </div>
          )}

          {/* LINHA 4: QUALIDADE DO CADASTRO & CURSOS DE GRADUAÇÃO */}
          <div className="grid items-start gap-6 lg:grid-cols-2">
            <section className={panel}>
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500">
                  <CheckCircle2 className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-base font-semibold">Qualidade do cadastro</h2>
                  <p className="text-xs text-muted-foreground">
                    Pendências entre os integrantes ativos. Uma pessoa pode aparecer em mais de um
                    item.
                  </p>
                </div>
              </div>
              {roster.missing ? (
                <ul className="mt-4 divide-y divide-border">
                  {roster.missing.map((item) => {
                    const pctMissing =
                      roster.active > 0 ? Math.round((item.count / roster.active) * 100) : 0;
                    return (
                      <li key={item.label} className="py-3 space-y-1.5 text-sm">
                        <div className="flex items-center justify-between gap-4">
                          <span>{item.label}</span>
                          <span className="font-mono font-semibold tabular-nums">
                            {item.count}{' '}
                            <span className="text-xs font-normal text-muted-foreground">
                              ({pctMissing}%)
                            </span>
                          </span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              item.count === 0
                                ? 'bg-emerald-500'
                                : pctMissing > 30
                                ? 'bg-amber-500'
                                : 'bg-blue-500'
                            }`}
                            style={{ width: `${Math.min(100, pctMissing)}%` }}
                          />
                        </div>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p role="status" className="mt-5 text-sm text-muted-foreground">
                  Não foi possível consultar os dados internos.
                </p>
              )}
              <Link
                href="/gestao/integrantes"
                className="mt-4 inline-flex min-h-11 items-center gap-2 text-sm font-medium hover:underline"
              >
                Conferir cadastros
                <ArrowRight size={14} />
              </Link>
            </section>

            <section className={panel}>
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-500">
                  <PieIcon className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-base font-semibold">Cursos de graduação</h2>
                  <p className="text-xs text-muted-foreground">
                    Distribuição acadêmica dos integrantes ({roster.active} ativos).
                  </p>
                </div>
              </div>
              <CoursesDistributionChart courses={roster.courses} total={roster.active} />
            </section>
          </div>

          <p className="text-xs leading-relaxed text-muted-foreground">
            As distribuições consideram os integrantes ativos do diretório. Área e curso usam o dado
            interno quando informado; equipes sem divisão aparecem como Autônomos.
          </p>
        </>
      ) : (
        <div role="status" className={panel}>
          <h2 className="font-medium">Distribuição de integrantes indisponível</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Não foi possível consultar o diretório. Atualize a página para tentar novamente; os
            outros indicadores continuam independentes.
          </p>
        </div>
      )}

      {/* EVOLUÇÃO DA PRESENÇA NO LABORATÓRIO COM RECHARTS */}
      <section aria-labelledby="presence-analysis-heading" className="space-y-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 id="presence-analysis-heading" className="font-display text-xl font-semibold">
              Evolução da presença no laboratório
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Semanas encerradas, de segunda a domingo no horário de Brasília.
            </p>
          </div>
          <form className="flex flex-wrap items-end gap-2">
            <label className="text-sm text-muted-foreground">
              Período
              <select
                name="weeks"
                defaultValue={data.weeks}
                className="ml-3 min-h-11 rounded-lg border border-input bg-background px-3 text-foreground"
              >
                <option value="4">4 semanas</option>
                <option value="8">8 semanas</option>
                <option value="12">12 semanas</option>
              </select>
            </label>
            <button type="submit" className={button}>
              Aplicar
            </button>
          </form>
        </div>

        {presence ? (
          <>
            <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_280px]">
              <figure className={panel}>
                <div className="flex items-center justify-between border-b border-border/70 pb-3">
                  <div>
                    <figcaption className="text-base font-semibold text-foreground">
                      Cumprimento de meta semanal
                    </figcaption>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {date(presence.start)} a {date(presence.end)} · Azul: meta cumprida · Cinza:
                      total com meta · Linha: % adesão
                    </p>
                  </div>
                </div>

                {/* Gráfico Recharts */}
                <WeeklyPresenceChart
                  trend={presence.trend}
                  start={presence.start}
                  end={presence.end}
                />

                {/* Tabela de acessibilidade */}
                <details className="mt-4 border-t border-border pt-3 text-sm">
                  <summary className="min-h-11 cursor-pointer py-2 font-medium text-muted-foreground hover:text-foreground">
                    Ver dados do gráfico em tabela
                  </summary>
                  <div className="overflow-x-auto mt-2">
                    <table className="w-full min-w-[420px] text-sm">
                      <thead>
                        <tr className="text-left text-muted-foreground border-b border-border">
                          <th className="py-2.5 font-medium">Semana</th>
                          <th className="py-2.5 font-medium">Cumpriram</th>
                          <th className="py-2.5 font-medium">Com meta</th>
                          <th className="py-2.5 font-medium">Adesão</th>
                          <th className="py-2.5 font-medium">Horas validadas</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {presence.trend.map((row) => (
                          <tr key={row.key}>
                            <th scope="row" className="py-2.5 text-left font-normal">
                              {date(row.key)}
                            </th>
                            <td className="py-2.5 font-mono">{row.met}</td>
                            <td className="py-2.5 font-mono">{row.required}</td>
                            <td className="py-2.5 font-mono">
                              {row.percentage !== null ? `${row.percentage}%` : '—'}
                            </td>
                            <td className="py-2.5 font-mono">{formatDuration(row.seconds)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </details>
              </figure>

              <div className="space-y-5">
                <section className={panel}>
                  <h3 className="text-sm font-semibold">Adesão no período</h3>
                  <p className="mt-4 font-display text-3xl font-semibold tabular-nums">
                    {presence.percentage === null ? '—' : `${presence.percentage}%`}
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {presence.totalMet} de {presence.totalRequired} metas individuais cumpridas nas
                    semanas encerradas.
                  </p>
                </section>
                <section className={panel}>
                  <h3 className="text-sm font-semibold">Semana atual · em andamento</h3>
                  <p className="mt-4 text-lg font-medium tabular-nums">
                    {presence.current.met} de {presence.current.required}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    integrantes cumpriram a meta. {presence.current.pending} ainda em andamento.
                  </p>
                  <p className="mt-4 text-sm text-muted-foreground">
                    {presence.review} registros em revisão no período consultado.
                  </p>
                  <Link
                    href="/gestao/presenca"
                    className="mt-3 inline-flex min-h-11 items-center gap-2 text-sm font-medium hover:underline"
                  >
                    Acompanhar presença
                    <ArrowRight size={14} />
                  </Link>
                </section>
              </div>
            </div>

            <section className="min-w-0 overflow-hidden rounded-xl border border-border bg-card shadow-xs">
              <div className="p-5 sm:px-6">
                <h3 className="text-base font-semibold">Acompanhamento individual</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Ordenado por semanas abaixo da meta no período. Novos integrantes só entram nas
                  semanas em que tinham meta.
                </p>
              </div>
              {presence.attention.length ? (
                <div
                  className="max-h-[30rem] overflow-auto"
                  tabIndex={0}
                  role="region"
                  aria-label="Análise de presença por integrante"
                >
                  <table className="w-full min-w-[720px] text-sm">
                    <thead className="sticky top-0 bg-muted/80 backdrop-blur-xs text-left text-muted-foreground border-b border-border">
                      <tr>
                        {[
                          'Integrante',
                          'Área / equipe',
                          'Cumpridas',
                          'Abaixo da meta',
                          'Adesão',
                          'Horas validadas',
                        ].map((title) => (
                          <th key={title} scope="col" className="px-5 py-3 font-medium">
                            {title}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {presence.attention.map((member) => (
                        <tr key={member.id} className="hover:bg-muted/30 transition-colors">
                          <th scope="row" className="px-5 py-4 text-left font-medium">
                            {member.name}
                          </th>
                          <td className="px-5 py-4 text-muted-foreground">
                            {member.area}
                            <span className="mt-1 block text-xs">{member.team}</span>
                          </td>
                          <td className="px-5 py-4 tabular-nums font-mono">
                            {member.metWeeks}/{member.requiredWeeks}
                          </td>
                          <td className="px-5 py-4 tabular-nums font-mono text-amber-600 dark:text-amber-400 font-semibold">
                            {member.missedWeeks}
                          </td>
                          <td className="px-5 py-4 tabular-nums font-mono font-medium">
                            {member.percentage}%
                          </td>
                          <td className="px-5 py-4 tabular-nums font-mono">
                            {formatDuration(member.seconds)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="px-5 pb-6 text-sm text-muted-foreground">
                  Não há metas individuais nas semanas encerradas deste período.
                </p>
              )}
            </section>
          </>
        ) : (
          <div role="status" className={panel}>
            <p className="text-sm text-muted-foreground">
              A análise de presença está indisponível. Confira se o acompanhamento está configurado
              e tente atualizar a página.
            </p>
          </div>
        )}
      </section>

      <section className="flex flex-wrap items-center justify-between gap-4 border-t border-border pt-5">
        <div className="text-sm text-muted-foreground">
          <p>
            Cadastros aguardando aprovação:{' '}
            <strong className="text-foreground">{data.pendingAccounts ?? 'Indisponível'}</strong>
          </p>
          <p className="mt-1">
            Solicitações para o site:{' '}
            <strong className="text-foreground">{data.pendingSite ?? 'Indisponível'}</strong>
          </p>
        </div>
        <Link href="/gestao" className={button}>
          Revisar pendências
          <ArrowRight size={16} />
        </Link>
      </section>

      <p className="text-xs text-muted-foreground">
        Atualizado em{' '}
        {new Date(data.updatedAt).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}.
        Somente horas validadas entram na análise; a semana atual fica separada do histórico.
      </p>
    </div>
  );
}
