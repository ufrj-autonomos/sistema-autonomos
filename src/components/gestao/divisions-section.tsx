import Link from 'next/link';
import {
  Cpu,
  Radio,
  Award,
  Users,
  CalendarCheck,
  Layers,
  GraduationCap,
  ShieldCheck,
  ArrowRight,
  BarChart3,
} from 'lucide-react';
import { Logo } from '@/components/brand/logo';
import type { DivisionData, ProjectRecord } from './types';
import type { DivisionsDeepAnalytics } from '@/lib/platform-insights';
import {
  DivisionsHeadToHeadChart,
  DivisionsMeetingRateComparisonChart,
} from '@/components/gestao/dashboard-charts';

interface DivisionsSectionProps {
  divisions: DivisionData[];
  projects: ProjectRecord[];
  deepAnalytics?: DivisionsDeepAnalytics | null;
}

export function DivisionsSection({
  divisions,
  projects,
  deepAnalytics,
}: DivisionsSectionProps) {
  const harpiaMetric = deepAnalytics?.harpia;
  const nautilusMetric = deepAnalytics?.nautilus;

  return (
    <section className="space-y-7">
      {/* CABEÇALHO E INDICADORES COMPARATIVOS HEAD-TO-HEAD (HARPIA vs NAUTILUS) */}
      {harpiaMetric && nautilusMetric && (
        <div className="space-y-6">
          {/* 4 KPIs Comparativos Lado a Lado */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {/* KPI 1: Efetivo Ativo */}
            <div className="rounded-xl border border-border bg-card p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-semibold uppercase tracking-wider">
                  Efetivo Ativo por Divisão
                </span>
                <Users className="h-4 w-4 text-primary" />
              </div>
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="p-2.5 rounded-lg bg-purple-500/10 border border-purple-500/20">
                  <span className="text-[11px] font-medium text-purple-700 dark:text-purple-300 block">
                    ☁️ Harpia
                  </span>
                  <span className="font-display text-2xl font-bold text-foreground">
                    {harpiaMetric.activeMembers}
                  </span>
                </div>
                <div className="p-2.5 rounded-lg bg-sky-500/10 border border-sky-500/20">
                  <span className="text-[11px] font-medium text-sky-700 dark:text-sky-300 block">
                    🌊 Nautilus
                  </span>
                  <span className="font-display text-2xl font-bold text-foreground">
                    {nautilusMetric.activeMembers}
                  </span>
                </div>
              </div>
            </div>

            {/* KPI 2: Taxa de Presença em Reuniões 26.2 */}
            <div className="rounded-xl border border-border bg-card p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-semibold uppercase tracking-wider">
                  Presença em Reuniões (26.2)
                </span>
                <CalendarCheck className="h-4 w-4 text-emerald-500" />
              </div>
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="p-2.5 rounded-lg bg-purple-500/10 border border-purple-500/20">
                  <span className="text-[11px] font-medium text-purple-700 dark:text-purple-300 block">
                    ☁️ Harpia ({harpiaMetric.meetingsStats.meetingsHeld} reu.)
                  </span>
                  <span className="font-display text-2xl font-bold text-foreground">
                    {harpiaMetric.meetingsStats.attendanceRatePct}%
                  </span>
                </div>
                <div className="p-2.5 rounded-lg bg-sky-500/10 border border-sky-500/20">
                  <span className="text-[11px] font-medium text-sky-700 dark:text-sky-300 block">
                    🌊 Nautilus ({nautilusMetric.meetingsStats.meetingsHeld} reu.)
                  </span>
                  <span className="font-display text-2xl font-bold text-foreground">
                    {nautilusMetric.meetingsStats.attendanceRatePct}%
                  </span>
                </div>
              </div>
            </div>

            {/* KPI 3: Liderança & Coordenação */}
            <div className="rounded-xl border border-border bg-card p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-semibold uppercase tracking-wider">
                  Liderança & Coordenação
                </span>
                <ShieldCheck className="h-4 w-4 text-amber-500" />
              </div>
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="p-2.5 rounded-lg bg-muted/40 border border-border">
                  <span className="text-[11px] text-muted-foreground block">☁️ Harpia</span>
                  <span className="font-display text-xl font-bold text-foreground">
                    {harpiaMetric.rolesBreakdown.leadership} líderes
                  </span>
                  <span className="text-[10px] text-muted-foreground block">
                    {harpiaMetric.rolesBreakdown.trainees} trainees
                  </span>
                </div>
                <div className="p-2.5 rounded-lg bg-muted/40 border border-border">
                  <span className="text-[11px] text-muted-foreground block">🌊 Nautilus</span>
                  <span className="font-display text-xl font-bold text-foreground">
                    {nautilusMetric.rolesBreakdown.leadership} líderes
                  </span>
                  <span className="text-[10px] text-muted-foreground block">
                    {nautilusMetric.rolesBreakdown.trainees} trainees
                  </span>
                </div>
              </div>
            </div>

            {/* KPI 4: Portfólio de Projetos */}
            <div className="rounded-xl border border-border bg-card p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-semibold uppercase tracking-wider">
                  Projetos Registrados
                </span>
                <Layers className="h-4 w-4 text-indigo-500" />
              </div>
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="p-2.5 rounded-lg bg-muted/40 border border-border">
                  <span className="text-[11px] text-muted-foreground block">☁️ UAV (Aéreo)</span>
                  <span className="font-display text-2xl font-bold text-foreground">
                    {projects.filter((p) => p.division === 'harpia').length}
                  </span>
                </div>
                <div className="p-2.5 rounded-lg bg-muted/40 border border-border">
                  <span className="text-[11px] text-muted-foreground block">
                    🌊 AUV (Subaquático)
                  </span>
                  <span className="font-display text-2xl font-bold text-foreground">
                    {projects.filter((p) => p.division === 'nautilus').length}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* GRÁFICOS COMPARATIVOS HEAD-TO-HEAD ENTRE AS DIVISÕES */}
          {deepAnalytics.headToHeadAreas.length > 0 && (
            <div className="grid items-start gap-6 lg:grid-cols-2">
              <div className="rounded-xl border border-border bg-card p-5 sm:p-6 shadow-xs">
                <div className="flex items-center gap-2.5 border-b border-border/70 pb-3">
                  <span className="p-2 rounded-lg bg-purple-500/10 text-purple-500">
                    <BarChart3 className="h-4 w-4" />
                  </span>
                  <div>
                    <h3 className="text-base font-semibold text-foreground">
                      Comparativo de Efetivo por Área Técnica (Harpia vs Nautilus)
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Quantidade de integrantes ativos alocados em cada área de engenharia.
                    </p>
                  </div>
                </div>
                <DivisionsHeadToHeadChart data={deepAnalytics.headToHeadAreas} />
              </div>

              <div className="rounded-xl border border-border bg-card p-5 sm:p-6 shadow-xs">
                <div className="flex items-center justify-between gap-2 border-b border-border/70 pb-3">
                  <div className="flex items-center gap-2.5">
                    <span className="p-2 rounded-lg bg-sky-500/10 text-sky-500">
                      <CalendarCheck className="h-4 w-4" />
                    </span>
                    <div>
                      <h3 className="text-base font-semibold text-foreground">
                        Frequência em Reuniões por Área (Harpia vs Nautilus %)
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        Comparativo de assiduidade entre as subáreas técnicas no período 26.2.
                      </p>
                    </div>
                  </div>
                  <Link
                    href="/reunioes"
                    className="text-xs font-medium text-primary hover:underline shrink-0"
                  >
                    Ver matriz →
                  </Link>
                </div>
                <DivisionsMeetingRateComparisonChart data={deepAnalytics.headToHeadAreas} />
              </div>
            </div>
          )}
        </div>
      )}

      {/* DOSSIÊ DETALHADO DE CADA DIVISÃO */}
      <div className="flex items-center justify-between pt-2">
        <div>
          <div className="inline-flex items-center gap-1.5 font-mono text-xs uppercase tracking-wider text-muted-foreground">
            <Radio className="h-3.5 w-3.5 text-muted-foreground" />
            <span>ESTRUTURA OPERACIONAL E ENGENHARIA DE CAMPO</span>
          </div>
          <h2 className="font-display text-xl sm:text-2xl font-bold text-foreground mt-1">
            Dossiê por Divisão Robótica
          </h2>
        </div>
        <span className="font-mono text-xs text-muted-foreground hidden sm:inline-block">
          UAV (Aéreo) • AUV (Subaquático)
        </span>
      </div>

      <div className="grid grid-cols-1 2xl:grid-cols-2 gap-6">
        {divisions.map((div) => {
          const isHarpia = div.slug === 'harpia';
          const divProjects = projects.filter((p) => p.division === div.slug);
          const metric = isHarpia ? harpiaMetric : nautilusMetric;

          return (
            <div
              key={div.slug}
              id={div.slug}
              className={`relative overflow-hidden rounded-2xl border blueprint-corners ${
                isHarpia ? 'border-purple-500/30 bg-card' : 'border-blue-500/30 bg-card'
              } p-5 sm:p-6 flex flex-col justify-between transition-all duration-200 hover:border-border shadow-xs`}
            >
              <div className="space-y-5">
                {/* Header da Divisão */}
                <div className="flex flex-wrap items-start justify-between gap-4 pb-5 border-b border-border">
                  <div className="flex items-center gap-3.5">
                    <div
                      className={`flex h-12 w-12 items-center justify-center rounded-xl border p-1 ${
                        isHarpia
                          ? 'border-purple-500/40 bg-purple-100 dark:bg-purple-900/30'
                          : 'border-blue-500/40 bg-blue-100 dark:bg-blue-900/30'
                      }`}
                    >
                      <Logo division={div.slug} variant="badge" size="sm" />
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-display text-lg sm:text-xl font-bold text-foreground">
                          {div.name}
                        </h3>
                        <span className="font-mono text-[11px] text-muted-foreground">
                          (desde {div.founded})
                        </span>
                      </div>
                      <p className="font-mono text-xs text-muted-foreground">{div.fullName}</p>
                    </div>
                  </div>

                  {/* Badge de Status Operacional Real */}
                  <div
                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-mono text-xs font-semibold ${
                      isHarpia
                        ? 'border border-purple-500/40 bg-purple-500/10 text-purple-700 dark:text-purple-300'
                        : 'border border-sky-500/40 bg-sky-500/10 text-sky-700 dark:text-sky-300'
                    }`}
                  >
                    <span className="relative flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-current opacity-75"></span>
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-current"></span>
                    </span>
                    <span>
                      {metric
                        ? `${metric.activeMembers} integrantes ativos · ${metric.meetingsStats.attendanceRatePct}% freq.`
                        : div.status}
                    </span>
                  </div>
                </div>

                {/* Resumo */}
                <p className="text-xs sm:text-sm text-secondary-foreground leading-relaxed">
                  {div.summary}
                </p>

                {/* QUADRO DE LIDERANÇA DA DIVISÃO */}
                {metric && metric.leadership.length > 0 && (
                  <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <h4 className="font-mono text-xs font-semibold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                        <ShieldCheck className="h-3.5 w-3.5 text-amber-500" />
                        Capitania & Coordenação da Divisão ({metric.leadership.length})
                      </h4>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {metric.leadership.map((leader) => (
                        <Link
                          key={leader.id}
                          href={`/gestao/integrantes/${leader.id}`}
                          className="flex items-center justify-between p-2 rounded-lg border border-border bg-card hover:bg-accent/50 transition text-xs"
                        >
                          <div className="min-w-0">
                            <p className="font-semibold text-foreground truncate">{leader.name}</p>
                            <p className="text-[11px] text-muted-foreground truncate">
                              {leader.role} · {leader.area}
                            </p>
                          </div>
                          <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0 ml-1" />
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {/* COMPOSIÇÃO POR SUBÁREA TÉCNICA & FREQUÊNCIA EM REUNIÕES */}
                {metric && metric.areasBreakdown.length > 0 && (
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <h4 className="font-mono text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Subáreas Técnicas & Frequência em Reuniões:
                      </h4>
                      <span className="text-[11px] font-mono text-muted-foreground">
                        {metric.rolesBreakdown.members} membros · {metric.rolesBreakdown.trainees}{' '}
                        trainees
                      </span>
                    </div>

                    <div className="space-y-2">
                      {metric.areasBreakdown.map((areaItem) => (
                        <div
                          key={areaItem.area}
                          className="p-3 rounded-lg border border-border bg-muted/20 space-y-1.5"
                        >
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold text-foreground">{areaItem.area}</span>
                            <div className="flex items-center gap-3 font-mono">
                              <span className="text-foreground font-bold">
                                {areaItem.count} integrante(s) ({areaItem.pct}%)
                              </span>
                              {areaItem.meetingRatePct !== null && (
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                                    areaItem.meetingRatePct >= 80
                                      ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                                      : areaItem.meetingRatePct >= 65
                                      ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300'
                                      : 'bg-red-500/15 text-red-700 dark:text-red-300'
                                  }`}
                                >
                                  Reuniões: {areaItem.meetingRatePct}% ({areaItem.meetingsHeld} reu.)
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                isHarpia ? 'bg-purple-500' : 'bg-sky-500'
                              }`}
                              style={{ width: `${Math.min(100, areaItem.pct)}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* PRINCIPAIS CURSOS DE GRADUAÇÃO DA DIVISÃO */}
                {metric && metric.coursesTop.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-mono text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <GraduationCap className="h-3.5 w-3.5" />
                      Principais Cursos na Divisão:
                    </h4>
                    <div className="flex flex-wrap gap-1.5">
                      {metric.coursesTop.map((c) => (
                        <span
                          key={c.course}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-border bg-muted/40 text-xs text-foreground"
                        >
                          <span>{c.course}</span>
                          <strong className="font-mono text-primary">({c.count})</strong>
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Especificações de Hardware & Sensores (se preenchido) */}
                {div.specs.frame && (
                  <div className="space-y-2.5 rounded-xl border border-border bg-muted/60 p-4">
                    <div className="flex items-center gap-2 font-mono text-xs text-muted-foreground">
                      <Cpu className="h-3.5 w-3.5 text-secondary-foreground" />
                      <span className="uppercase font-semibold tracking-wider text-foreground">
                        Arquitetura de Engenharia & Sensores:
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 font-mono text-xs">
                      <div>
                        <span className="text-muted-foreground">Computação:</span>{' '}
                        <span className="text-foreground">{div.specs.computing}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Autopiloto:</span>{' '}
                        <span className="text-foreground">{div.specs.autopilot}</span>
                      </div>
                      <div className="sm:col-span-2">
                        <span className="text-muted-foreground">Estrutura:</span>{' '}
                        <span className="text-foreground">{div.specs.frame}</span>
                      </div>
                      <div className="sm:col-span-2">
                        <span className="text-muted-foreground">Sensores:</span>{' '}
                        <span className="text-foreground">{div.specs.sensors.join(' • ')}</span>
                      </div>
                    </div>

                    {/* Software Stack Chips */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-border">
                      {div.specs.softwareStack.map((tech, i) => (
                        <span
                          key={i}
                          className={`rounded px-2 py-0.5 font-mono text-[10px] ${
                            isHarpia
                              ? 'bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-200 border border-purple-500/30'
                              : 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-200 border border-blue-500/30'
                          }`}
                        >
                          {tech}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Projetos Cadastrados da Divisão */}
                <div>
                  <div className="flex items-center justify-between mb-2.5">
                    <h4 className="font-mono text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Projetos Cadastrados da Divisão ({divProjects.length}):
                    </h4>
                    <Link
                      href="/gestao/projetos"
                      className="text-xs font-medium text-primary hover:underline"
                    >
                      Gerenciar projetos →
                    </Link>
                  </div>
                  <div className="space-y-2">
                    {divProjects.map((proj) => (
                      <div
                        key={proj.id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-lg border border-border bg-muted/60 hover:border-border transition-colors"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-xs sm:text-sm text-foreground">
                              {proj.name}
                            </span>
                            <span className="font-mono text-[10px] text-muted-foreground">
                              ({proj.year})
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                            {proj.tagline}
                          </p>
                        </div>
                        <span
                          className={`font-mono text-[10px] uppercase font-medium px-2 py-0.5 rounded shrink-0 self-start sm:self-auto ${
                            proj.status.includes('Operacional')
                              ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20'
                              : proj.status.includes('tanque')
                              ? 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20'
                              : 'bg-accent text-secondary-foreground border border-border'
                          }`}
                        >
                          {proj.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Lista Expansível de Todos os Integrantes Ativos da Divisão */}
                {metric && metric.activeRoster.length > 0 && (
                  <details className="rounded-xl border border-border bg-muted/20 px-4 py-2 text-xs">
                    <summary className="min-h-10 flex items-center justify-between cursor-pointer font-semibold text-foreground">
                      <span>
                        Ver lista nominal dos {metric.activeRoster.length} integrantes ativos de{' '}
                        {div.name}
                      </span>
                      <span className="text-muted-foreground font-mono">Expandir ↓</span>
                    </summary>
                    <div className="max-h-60 overflow-y-auto divide-y divide-border/60 mt-2 pt-2 border-t border-border">
                      {metric.activeRoster.map((member) => (
                        <div
                          key={member.id}
                          className="py-2 flex items-center justify-between gap-2"
                        >
                          <Link
                            href={`/gestao/integrantes/${member.id}`}
                            className="font-medium text-foreground hover:underline truncate"
                          >
                            {member.name}
                          </Link>
                          <span className="text-muted-foreground font-mono shrink-0">
                            {member.role} · {member.area}
                          </span>
                        </div>
                      ))}
                    </div>
                  </details>
                )}
              </div>

              {/* Rodapé da Divisão: Métricas e Competições */}
              <div className="mt-6 pt-4 border-t border-border flex flex-wrap items-center justify-between gap-4 font-mono text-xs text-muted-foreground">
                <div className="flex items-center gap-4">
                  <span>
                    <strong className="text-foreground">{div.stats.membersCount}</strong>{' '}
                    Integrantes ativos
                  </span>
                  <span>•</span>
                  <span>
                    <strong className="text-foreground">{div.stats.projectsCount}</strong> Projetos
                  </span>
                  {metric && (
                    <>
                      <span>•</span>
                      <span>
                        <strong className="text-foreground">
                          {metric.meetingsStats.meetingsHeld}
                        </strong>{' '}
                        Reuniões (26.2)
                      </span>
                    </>
                  )}
                </div>

                {div.competitions.length > 0 && (
                  <div className="flex items-center gap-1.5 text-secondary-foreground">
                    <Award className="h-3.5 w-3.5 text-amber-700 dark:text-amber-400" />
                    <span>{div.competitions.join(' • ')}</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
