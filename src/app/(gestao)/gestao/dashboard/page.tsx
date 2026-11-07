import Link from 'next/link';
import { ArrowRight, BarChart3, PieChart as PieIcon, Users } from 'lucide-react';
import { requirePageUser } from '@/lib/session';
import { getManagementAnalytics, analysisWeeks } from '@/lib/management-analytics';
import { formatDuration } from '@/lib/attendance/format';
import {
  WeeklyPresenceChart,
  TeamDistributionChart,
  AreaDistributionChart,
  CoursesDistributionChart,
} from '@/components/gestao/dashboard-charts';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Dashboard — Gestão' };
const panel = 'min-w-0 rounded-xl border border-border bg-card p-5 sm:p-6 shadow-xs';
const button = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-accent';
function date(key: string) { return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', timeZone: 'America/Sao_Paulo' }).format(new Date(`${key}T12:00:00Z`)); }

function Groups({ rows, total, title }: { rows: { label: string; count: number }[]; total: number; title: string }) {
  return <section className={panel}><h2 className="text-base font-semibold">{title}</h2>{rows.length ? <ul className="mt-5 space-y-4">{rows.map(row => <li key={row.label}><div className="mb-2 flex items-baseline justify-between gap-3 text-sm"><span className="min-w-0 break-words">{row.label}</span><span className="shrink-0 tabular-nums text-muted-foreground">{row.count} <span className="ml-2 text-xs">{Math.round(row.count / total * 100)}%</span></span></div><div className="h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden="true"><div className="h-full rounded-full bg-foreground/70" style={{ width: `${row.count / total * 100}%` }} /></div></li>)}</ul> : <p className="mt-5 text-sm text-muted-foreground">Não há integrantes ativos para analisar.</p>}</section>;
}

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ weeks?: string }> }) {
  await requirePageUser(true);
  const params = await searchParams;
  const data = await getManagementAnalytics(analysisWeeks(params.weeks));
  const roster = data.roster, presence = data.presence;

  return (
    <div className="space-y-7">
      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-6">
        <div>
          <h1 className="font-display text-3xl font-semibold">Dashboard da equipe</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Distribuição dos integrantes, qualidade do cadastro e evolução gráfica da presença.
          </p>
        </div>
        <Link href="/gestao/integrantes" className={button}>
          Abrir integrantes
          <ArrowRight size={16} />
        </Link>
      </header>

      {roster ? (
        <>
          <section aria-label="Resumo dos integrantes" className="grid grid-cols-2 gap-x-6 gap-y-5 border-b border-border pb-6 sm:grid-cols-4">
            {[
              { label: 'Integrantes ativos', value: roster.active, detail: `${roster.total} no diretório` },
              { label: 'Inativos', value: roster.inactive, detail: 'Fora das distribuições abaixo' },
              { label: 'Perfis completos', value: roster.complete, detail: 'Entre os integrantes ativos' },
              { label: 'Acessos configurados', value: roster.accessReady, detail: 'Conta aprovada, email e senha' },
            ].map(item => (
              <div key={item.label}>
                <p className="text-sm text-muted-foreground">{item.label}</p>
                <p className="mt-2 font-display text-3xl font-semibold tabular-nums">{item.value ?? '—'}</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{item.detail}</p>
              </div>
            ))}
          </section>

          {/* Gráficos Visuais: Distribuição por Equipe e Área Técnica */}
          <div className="grid items-start gap-6 lg:grid-cols-2">
            <section className={panel}>
              <div className="flex items-center gap-2">
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
              <div className="flex items-center gap-2">
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

          <div className="grid items-start gap-6 lg:grid-cols-2">
            <section className={panel}>
              <h2 className="text-base font-semibold">Qualidade do cadastro</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Pendências entre os integrantes ativos. Uma pessoa pode aparecer em mais de um item.
              </p>
              {roster.missing ? (
                <ul className="mt-4 divide-y divide-border">
                  {roster.missing.map(item => (
                    <li key={item.label} className="flex items-center justify-between gap-4 py-3 text-sm">
                      <span>{item.label}</span>
                      <span className="font-medium tabular-nums">{item.count}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p role="status" className="mt-5 text-sm text-muted-foreground">
                  Não foi possível consultar os dados internos.
                </p>
              )}
              <Link href="/gestao/integrantes" className="mt-4 inline-flex min-h-11 items-center gap-2 text-sm font-medium hover:underline">
                Conferir cadastros
                <ArrowRight size={14} />
              </Link>
            </section>

            <section className={panel}>
              <div className="flex items-center gap-2">
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
            As distribuições consideram os integrantes ativos do diretório. Área e curso usam o dado interno quando informado; equipes sem divisão aparecem como Autônomos.
          </p>
        </>
      ) : (
        <div role="status" className={panel}>
          <h2 className="font-medium">Distribuição de integrantes indisponível</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Não foi possível consultar o diretório. Atualize a página para tentar novamente; os outros indicadores continuam independentes.
          </p>
        </div>
      )}

      {/* Evolução da Presença com Recharts */}
      <section aria-labelledby="presence-analysis-heading" className="space-y-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 id="presence-analysis-heading" className="font-display text-xl font-semibold">
              Evolução da presença
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Semanas encerradas, de segunda a domingo no horário de Brasília.
            </p>
          </div>
          <form className="flex flex-wrap items-end gap-2">
            <label className="text-sm text-muted-foreground">
              Período
              <select name="weeks" defaultValue={data.weeks} className="ml-3 min-h-11 rounded-lg border border-input bg-background px-3 text-foreground">
                <option value="4">4 semanas</option>
                <option value="8">8 semanas</option>
                <option value="12">12 semanas</option>
              </select>
            </label>
            <button type="submit" className={button}>Aplicar</button>
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
                      {date(presence.start)} a {date(presence.end)} · Azul: meta cumprida · Cinza: total com meta · Linha: % adesão
                    </p>
                  </div>
                </div>

                {/* Gráfico Recharts */}
                <WeeklyPresenceChart trend={presence.trend} start={presence.start} end={presence.end} />

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
                        {presence.trend.map(row => (
                          <tr key={row.key}>
                            <th scope="row" className="py-2.5 text-left font-normal">{date(row.key)}</th>
                            <td className="py-2.5 font-mono">{row.met}</td>
                            <td className="py-2.5 font-mono">{row.required}</td>
                            <td className="py-2.5 font-mono">{row.percentage !== null ? `${row.percentage}%` : '—'}</td>
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
                    {presence.totalMet} de {presence.totalRequired} metas individuais cumpridas nas semanas encerradas.
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
                  <Link href="/gestao/presenca" className="mt-3 inline-flex min-h-11 items-center gap-2 text-sm font-medium hover:underline">
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
                  Ordenado por semanas abaixo da meta no período. Novos integrantes só entram nas semanas em que tinham meta.
                </p>
              </div>
              {presence.attention.length ? (
                <div className="max-h-[30rem] overflow-auto" tabIndex={0} role="region" aria-label="Análise de presença por integrante">
                  <table className="w-full min-w-[720px] text-sm">
                    <thead className="sticky top-0 bg-muted/80 backdrop-blur-xs text-left text-muted-foreground border-b border-border">
                      <tr>
                        {['Integrante', 'Área / equipe', 'Cumpridas', 'Abaixo da meta', 'Adesão', 'Horas validadas'].map(title => (
                          <th key={title} scope="col" className="px-5 py-3 font-medium">{title}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {presence.attention.map(member => (
                        <tr key={member.id} className="hover:bg-muted/30 transition-colors">
                          <th scope="row" className="px-5 py-4 text-left font-medium">{member.name}</th>
                          <td className="px-5 py-4 text-muted-foreground">
                            {member.area}
                            <span className="mt-1 block text-xs">{member.team}</span>
                          </td>
                          <td className="px-5 py-4 tabular-nums font-mono">{member.metWeeks}/{member.requiredWeeks}</td>
                          <td className="px-5 py-4 tabular-nums font-mono text-amber-600 dark:text-amber-400 font-semibold">{member.missedWeeks}</td>
                          <td className="px-5 py-4 tabular-nums font-mono font-medium">{member.percentage}%</td>
                          <td className="px-5 py-4 tabular-nums font-mono">{formatDuration(member.seconds)}</td>
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
              A análise de presença está indisponível. Confira se o acompanhamento está configurado e tente atualizar a página.
            </p>
          </div>
        )}
      </section>

      <section className="flex flex-wrap items-center justify-between gap-4 border-t border-border pt-5">
        <div className="text-sm text-muted-foreground">
          <p>Cadastros aguardando aprovação: <strong className="text-foreground">{data.pendingAccounts ?? 'Indisponível'}</strong></p>
          <p className="mt-1">Solicitações para o site: <strong className="text-foreground">{data.pendingSite ?? 'Indisponível'}</strong></p>
        </div>
        <Link href="/gestao" className={button}>
          Revisar pendências
          <ArrowRight size={16} />
        </Link>
      </section>

      <p className="text-xs text-muted-foreground">
        Atualizado em {new Date(data.updatedAt).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}. Somente horas validadas entram na análise; a semana atual fica separada do histórico.
      </p>
    </div>
  );
}
