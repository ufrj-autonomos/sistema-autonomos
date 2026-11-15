'use client';

import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Award,
  BarChart3,
  Calendar,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  Eye,
  Layers,
  Lock,
  MessageSquareText,
  Pencil,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  TrendingUp,
  Users,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type {
  AreaEvaluationRowDTO,
  CoordinatorEvaluationRowDTO,
  EvaluatedMemberRowDTO,
  EvaluationsWorkspaceDTO,
} from '@/lib/evaluations/types';
import {
  AreaScoresComparisonChart,
  CargoAverageChart,
  ScoreDistributionChart,
  SemesterEvolutionChart,
} from './evaluations-charts';

type ActiveTab = 'dashboard' | 'members' | 'areas' | 'coordinators';

type EditorTarget =
  | {
      kind: 'member';
      id: string;
      title: string;
      subtitle: string;
      existingId?: string;
      score: number | null;
      notes: string;
      metricsSummary: { label: string; value: string }[];
    }
  | {
      kind: 'area';
      scopeKey: string;
      title: string;
      subtitle: string;
      score: number | null;
      notes: string;
      metricsSummary: { label: string; value: string }[];
    }
  | {
      kind: 'coordinator';
      id: string;
      title: string;
      subtitle: string;
      score: number | null;
      notes: string;
      metricsSummary: { label: string; value: string }[];
    };

function scoreBadgeMeta(score: number | null) {
  if (score === null) {
    return {
      cls: 'border-border bg-muted/60 text-muted-foreground',
      text: 'Pendente',
    };
  }
  if (score >= 8.5) {
    return {
      cls: 'border-emerald-500/35 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
      text: 'Excelente',
    };
  }
  if (score >= 7.0) {
    return {
      cls: 'border-sky-500/35 bg-sky-500/15 text-sky-700 dark:text-sky-300',
      text: 'Bom',
    };
  }
  if (score >= 5.0) {
    return {
      cls: 'border-amber-500/35 bg-amber-500/15 text-amber-800 dark:text-amber-300',
      text: 'Atenção',
    };
  }
  return {
    cls: 'border-red-500/35 bg-red-500/15 text-red-700 dark:text-red-300',
    text: 'Crítico',
  };
}

function formatScoreValue(score: number | null | undefined) {
  if (score === null || score === undefined) return '—';
  return score.toFixed(1).replace('.', ',');
}

function formatDateTimeBr(iso: string) {
  try {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'America/Sao_Paulo',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

const QUICK_SCORES = [5, 6, 7, 7.5, 8, 8.5, 9, 9.5, 10];

export function EvaluationsClient({
  initialData,
}: {
  initialData: EvaluationsWorkspaceDTO;
}) {
  const [data, setData] = useState<EvaluationsWorkspaceDTO>(initialData);
  const [activeTab, setActiveTab] = useState<ActiveTab>(
    initialData.isAdmin ? 'dashboard' : 'members'
  );
  const [loadingPeriod, setLoadingPeriod] = useState(false);

  // Filters for members tab
  const [search, setSearch] = useState('');
  const [teamFilter, setTeamFilter] = useState<'all' | 'harpia' | 'nautilus' | 'autonomos'>('all');
  const [areaFilter, setAreaFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'evaluated'>('all');

  // New semester inline input (ADMIN only)
  const [addingPeriod, setAddingPeriod] = useState(false);
  const [newPeriodCode, setNewPeriodCode] = useState('');

  // Unified evaluation modal state
  const [editor, setEditor] = useState<EditorTarget | null>(null);
  const [scoreInput, setScoreInput] = useState<string>('8.0');
  const [notesInput, setNotesInput] = useState<string>('');
  const [saving, setSaving] = useState(false);

  async function reloadPeriod(periodCode: string) {
    setLoadingPeriod(true);
    try {
      const res = await fetch(`/api/gestao/evaluations?period=${encodeURIComponent(periodCode)}`, {
        cache: 'no-store',
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Erro ao carregar semestre.');
      setData(json as EvaluationsWorkspaceDTO);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao trocar de semestre.');
    } finally {
      setLoadingPeriod(false);
    }
  }

  function handleAddCustomPeriod() {
    const clean = newPeriodCode.trim();
    if (!/^[a-zA-Z0-9._-]{2,20}$/.test(clean)) {
      toast.error('Informe um código válido (ex: 27.1 ou 26.1).');
      return;
    }
    setAddingPeriod(false);
    setNewPeriodCode('');
    void reloadPeriod(clean);
  }

  function openMemberEditor(row: EvaluatedMemberRowDTO) {
    setScoreInput(row.evaluation ? String(row.evaluation.score) : '8.0');
    setNotesInput(row.evaluation?.notes ?? '');
    setEditor({
      kind: 'member',
      id: row.memberId,
      title: row.name,
      subtitle: `${row.cargoLabel} · ${row.area} · ${row.teamName}`,
      existingId: row.evaluation?.id,
      score: row.evaluation?.score ?? null,
      notes: row.evaluation?.notes ?? '',
      metricsSummary: [
        {
          label: 'Adesão no Lab (4 sem)',
          value:
            row.metrics.labAdherencePct !== null
              ? `${row.metrics.labAdherencePct}% (${row.metrics.labHours4Weeks}h)`
              : `${row.metrics.labHours4Weeks}h (sem meta)`,
        },
        {
          label: `Reuniões (${data.selectedPeriod})`,
          value:
            row.metrics.meetingsPct !== null
              ? `${row.metrics.meetingsPct}% (${row.metrics.meetingsCount} reuniões)`
              : 'Sem reuniões contabilizadas',
        },
        {
          label: 'Disciplinar',
          value: `${row.metrics.disciplinaryLabel} (${row.metrics.warningsCount} adv. · ${row.metrics.avisosCount} aviso)`,
        },
      ],
    });
  }

  function openAreaEditor(row: AreaEvaluationRowDTO) {
    setScoreInput(row.evaluation ? String(row.evaluation.score) : '8.0');
    setNotesInput(row.evaluation?.notes ?? '');
    const metricsSummary = [
      { label: 'Integrantes ativos', value: String(row.metrics.activeMembersCount) },
      {
        label: 'Adesão Lab (4 sem)',
        value: row.metrics.labAdherencePct !== null ? `${row.metrics.labAdherencePct}%` : 'Sem meta',
      },
      {
        label: `Reuniões (${data.selectedPeriod})`,
        value: row.metrics.meetingsPct !== null ? `${row.metrics.meetingsPct}%` : 'Sem reuniões',
      },
      { label: 'Advertências na área', value: String(row.metrics.warningsCount) },
    ];
    if (typeof row.metrics.memberAvgScore === 'number') {
      metricsSummary.push({
        label: 'Média interna dos membros',
        value: `${formatScoreValue(row.metrics.memberAvgScore)}/10 (${row.metrics.evaluatedMembersCount ?? 0}/${row.metrics.totalEvaluableMembersCount ?? 0})`,
      });
    }
    setEditor({
      kind: 'area',
      scopeKey: row.scopeKey,
      title: row.label,
      subtitle: `Nota oficial da área · Semestre ${data.selectedPeriod}`,
      score: row.evaluation?.score ?? null,
      notes: row.evaluation?.notes ?? '',
      metricsSummary,
    });
  }

  function openCoordinatorEditor(row: CoordinatorEvaluationRowDTO) {
    if (row.isSelf) return;
    setScoreInput(row.evaluation ? String(row.evaluation.score) : '8.0');
    setNotesInput(row.evaluation?.notes ?? '');
    setEditor({
      kind: 'coordinator',
      id: row.coordinatorId,
      title: row.name,
      subtitle: `${row.cargoLabel} · ${row.area} · ${row.teamName}`,
      score: row.evaluation?.score ?? null,
      notes: row.evaluation?.notes ?? '',
      metricsSummary: [
        {
          label: 'Avaliações da própria área',
          value: `${row.metrics.areaMembersEvaluated}/${row.metrics.areaMembersTotal} (${row.metrics.areaCoveragePct ?? 0}%)`,
        },
        {
          label: 'Adesão Lab da área',
          value: row.metrics.labAdherencePct !== null ? `${row.metrics.labAdherencePct}%` : 'Sem meta',
        },
        {
          label: `Reuniões da área (${data.selectedPeriod})`,
          value: row.metrics.meetingsPct !== null ? `${row.metrics.meetingsPct}%` : 'Sem reuniões',
        },
      ],
    });
  }

  async function submitEditor(e: React.FormEvent) {
    e.preventDefault();
    if (!editor) return;

    const numericScore = Number(scoreInput.replace(',', '.'));
    if (!Number.isFinite(numericScore) || numericScore < 0 || numericScore > 10) {
      toast.error('Informe uma nota válida entre 0 e 10.');
      return;
    }

    setSaving(true);
    try {
      let endpoint = '/api/gestao/evaluations/members';
      let payload: Record<string, unknown> = {
        periodCode: data.selectedPeriod,
        score: numericScore,
        notes: notesInput,
      };

      if (editor.kind === 'member') {
        endpoint = '/api/gestao/evaluations/members';
        payload = { ...payload, memberId: editor.id };
      } else if (editor.kind === 'area') {
        endpoint = '/api/gestao/evaluations/areas';
        payload = { ...payload, scopeKey: editor.scopeKey };
      } else {
        endpoint = '/api/gestao/evaluations/coordinators';
        payload = { ...payload, coordinatorId: editor.id };
      }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Não foi possível salvar a avaliação.');

      toast.success('Avaliação salva com sucesso!');
      setEditor(null);
      await reloadPeriod(data.selectedPeriod);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar avaliação.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteMemberEvaluation(evaluationId: string) {
    setSaving(true);
    try {
      const res = await fetch(`/api/gestao/evaluations/members/${evaluationId}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Não foi possível remover a avaliação.');
      toast.success('Avaliação removida.');
      setEditor(null);
      await reloadPeriod(data.selectedPeriod);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao remover avaliação.');
    } finally {
      setSaving(false);
    }
  }

  const availableAreasForFilter = useMemo(() => {
    const set = new Set<string>();
    for (const m of data.members) {
      if (teamFilter !== 'all' && m.teamSlug !== teamFilter) continue;
      set.add(m.area);
    }
    return [...set].sort();
  }, [data.members, teamFilter]);

  const filteredMembers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return data.members.filter((m) => {
      if (teamFilter !== 'all' && m.teamSlug !== teamFilter) return false;
      if (areaFilter !== 'all' && m.area !== areaFilter) return false;
      if (statusFilter === 'pending' && m.evaluation !== null) return false;
      if (statusFilter === 'evaluated' && m.evaluation === null) return false;
      if (q) {
        const hay = `${m.name} ${m.area} ${m.teamName} ${m.cargoLabel} ${m.email ?? ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [data.members, teamFilter, areaFilter, statusFilter, search]);

  const membersProgress = useMemo(() => {
    const total = data.members.length;
    const evaluated = data.members.filter((m) => m.evaluation !== null).length;
    const pct = total > 0 ? Math.round((evaluated / total) * 100) : 0;
    const avg =
      evaluated > 0
        ? data.members.reduce((sum, m) => sum + (m.evaluation?.score ?? 0), 0) / evaluated
        : null;
    return { total, evaluated, pending: total - evaluated, pct, avg };
  }, [data.members]);

  const tabs: { key: ActiveTab; label: string; icon: typeof ClipboardCheck; badge?: number }[] = [
    ...(data.isAdmin
      ? [{ key: 'dashboard' as const, label: 'Dashboard de Notas', icon: BarChart3 }]
      : []),
    {
      key: 'members',
      label: data.isAdmin ? 'Avaliação de Membros' : 'Minha Área (Membros)',
      icon: Users,
      badge: membersProgress.pending > 0 ? membersProgress.pending : undefined,
    },
    {
      key: 'areas',
      label: data.isAdmin ? 'Nota das Áreas' : 'Nota das Áreas (Visualizar)',
      icon: data.isAdmin ? Layers : Eye,
    },
    ...(data.isAdmin
      ? [
          {
            key: 'coordinators' as const,
            label: 'Nota dos Coordenadores',
            icon: ShieldCheck,
            badge:
              data.coordinators.filter((c) => !c.isSelf && c.evaluation === null).length || undefined,
          },
        ]
      : []),
  ];

  return (
    <div className="space-y-6">
      {/* CABEÇALHO */}
      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-6">
        <div className="min-w-0 flex-1 basis-72 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold',
                data.isAdmin
                  ? 'border-purple-500/35 bg-purple-500/10 text-purple-700 dark:text-purple-300'
                  : 'border-amber-500/35 bg-amber-500/10 text-amber-800 dark:text-amber-300'
              )}
            >
              {data.isAdmin ? (
                <>
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Acesso Administrador
                </>
              ) : (
                <>
                  <Lock className="h-3.5 w-3.5" />
                  Coordenador · {data.coordinatorScope?.label ?? 'Sem área vinculada'}
                </>
              )}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/50 px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
              Notas individuais confidenciais
            </span>
          </div>

          <h1 className="font-display text-2xl sm:text-3xl font-semibold text-foreground">
            Avaliações Semestrais
          </h1>
          <p className="max-w-3xl text-sm text-muted-foreground">
            {data.isAdmin
              ? 'Gerencie avaliações semestrais de integrantes, notas oficiais das áreas (exibidas na Home), avaliação da coordenação e dashboard analítico.'
              : 'Avalie semestralmente os integrantes da sua área (0 a 10 + observação escrita) e consulte as notas oficiais das áreas.'}
          </p>
        </div>

        {/* SELETOR DE SEMESTRE */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <label htmlFor="evaluation-period-select" className="text-xs font-medium text-muted-foreground">
              Semestre:
            </label>
            <select
              id="evaluation-period-select"
              value={data.selectedPeriod}
              disabled={loadingPeriod}
              onChange={(e) => void reloadPeriod(e.target.value)}
              className="bg-transparent text-sm font-semibold text-foreground focus:outline-none cursor-pointer"
            >
              {data.periods.map((p) => (
                <option key={p.code} value={p.code} className="bg-card text-foreground">
                  {p.code} {p.isCurrent ? '(Atual)' : ''}
                </option>
              ))}
            </select>
          </div>

          {data.isAdmin && !addingPeriod && (
            <button
              type="button"
              onClick={() => setAddingPeriod(true)}
              className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-xs font-medium text-foreground hover:bg-accent transition cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              Outro semestre
            </button>
          )}

          {data.isAdmin && addingPeriod && (
            <div className="flex items-center gap-1.5 rounded-lg border border-border bg-card p-1">
              <input
                type="text"
                placeholder="ex: 27.1"
                value={newPeriodCode}
                onChange={(e) => setNewPeriodCode(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddCustomPeriod();
                  if (e.key === 'Escape') setAddingPeriod(false);
                }}
                className="w-24 rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <button
                type="button"
                onClick={handleAddCustomPeriod}
                className="rounded-md bg-primary px-2.5 py-1 text-xs font-semibold text-primary-foreground hover:bg-primary/90 cursor-pointer"
              >
                Abrir
              </button>
              <button
                type="button"
                onClick={() => setAddingPeriod(false)}
                aria-label="Cancelar novo semestre"
                className="rounded-md p-1 text-muted-foreground hover:bg-accent cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>
      </header>

      {/* AVISO CASO COORDENADOR NÃO TENHA ÁREA */}
      {!data.isAdmin && !data.coordinatorScope && (
        <div className="rounded-xl border border-amber-500/35 bg-amber-500/10 p-4 text-sm text-amber-900 dark:text-amber-200 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
          <div>
            <p className="font-semibold">Sua conta de coordenador ainda não possui uma área vinculada.</p>
            <p className="mt-1 text-xs opacity-90">
              Peça a um administrador para definir sua divisão (Harpia, Nautilus ou Geral) e sua área técnica em Integrantes / Contas para liberar sua lista de membros.
            </p>
          </div>
        </div>
      )}

      {/* NAVEGAÇÃO POR ABAS */}
      <nav aria-label="Seções de avaliação" className="flex flex-wrap gap-2 border-b border-border pb-3">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                'inline-flex min-h-10 items-center gap-2 rounded-lg border px-3.5 py-2 text-sm font-medium transition-colors cursor-pointer',
                active
                  ? 'border-primary/40 bg-primary text-primary-foreground shadow-xs'
                  : 'border-border bg-card text-muted-foreground hover:bg-accent hover:text-foreground'
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span>{tab.label}</span>
              {tab.badge !== undefined && tab.badge > 0 && (
                <span
                  className={cn(
                    'inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 font-mono text-[11px] font-bold tabular-nums',
                    active
                      ? 'bg-primary-foreground/20 text-primary-foreground'
                      : 'bg-yellow-400 text-zinc-950'
                  )}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* ABA 1: DASHBOARD (EXCLUSIVO ADMIN) */}
      {activeTab === 'dashboard' && data.isAdmin && data.dashboard && (
        <section aria-label="Dashboard de notas e avaliações" className="space-y-6">
          {/* KPIs */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-xl border border-border bg-card p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Média dos Membros
                </p>
                <Users className="h-4 w-4 text-emerald-500" />
              </div>
              <p className="mt-2 font-display text-3xl font-bold tabular-nums text-foreground">
                {data.dashboard.kpis.memberAverage !== null
                  ? `${formatScoreValue(data.dashboard.kpis.memberAverage)}/10`
                  : '—'}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {data.dashboard.kpis.memberEvaluatedCount} de {data.dashboard.kpis.memberTotalCount}{' '}
                membros avaliados em {data.selectedPeriod}
              </p>
            </div>

            <div className="rounded-xl border border-border bg-card p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Média das Áreas
                </p>
                <Layers className="h-4 w-4 text-purple-500" />
              </div>
              <p className="mt-2 font-display text-3xl font-bold tabular-nums text-foreground">
                {data.dashboard.kpis.areaAverage !== null
                  ? `${formatScoreValue(data.dashboard.kpis.areaAverage)}/10`
                  : '—'}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {data.dashboard.kpis.areaEvaluatedCount} de {data.dashboard.kpis.areaTotalCount} áreas com nota lançada
              </p>
            </div>

            <div className="rounded-xl border border-border bg-card p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Média da Coordenação
                </p>
                <ShieldCheck className="h-4 w-4 text-amber-500" />
              </div>
              <p className="mt-2 font-display text-3xl font-bold tabular-nums text-foreground">
                {data.dashboard.kpis.coordinatorAverage !== null
                  ? `${formatScoreValue(data.dashboard.kpis.coordinatorAverage)}/10`
                  : '—'}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {data.dashboard.kpis.coordinatorEvaluatedCount} de{' '}
                {data.dashboard.kpis.coordinatorTotalCount} coordenadores avaliados
              </p>
            </div>

            <div className="rounded-xl border border-border bg-card p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Área Destaque ({data.selectedPeriod})
                </p>
                <Award className="h-4 w-4 text-sky-500" />
              </div>
              <p className="mt-2 font-display text-2xl font-bold text-foreground truncate">
                {data.dashboard.kpis.topArea ? data.dashboard.kpis.topArea.label : '—'}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {data.dashboard.kpis.topArea
                  ? `Nota oficial ${formatScoreValue(data.dashboard.kpis.topArea.score)}/10`
                  : 'Nenhuma nota de área lançada'}
              </p>
            </div>
          </div>

          {/* GRÁFICOS LINHA 1 */}
          <div className="grid gap-6 lg:grid-cols-12">
            <div className="lg:col-span-7 min-w-0 rounded-xl border border-border bg-card p-5 shadow-xs">
              <div className="flex items-center justify-between border-b border-border/70 pb-3">
                <div>
                  <h2 className="text-base font-semibold text-foreground">
                    Comparativo por Área: Nota Oficial vs. Média dos Membros
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Cruza a nota atribuída à área pela administração com a média individual dos integrantes.
                  </p>
                </div>
                <TrendingUp className="h-4 w-4 text-purple-500 shrink-0" />
              </div>
              <AreaScoresComparisonChart data={data.dashboard.areaComparison} />
            </div>

            <div className="lg:col-span-5 min-w-0 rounded-xl border border-border bg-card p-5 shadow-xs">
              <div className="flex items-center justify-between border-b border-border/70 pb-3">
                <div>
                  <h2 className="text-base font-semibold text-foreground">
                    Distribuição de Notas Individuais
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Faixas de nota (0–10) entre membros e coordenadores em {data.selectedPeriod}.
                  </p>
                </div>
                <BarChart3 className="h-4 w-4 text-emerald-500 shrink-0" />
              </div>
              <ScoreDistributionChart data={data.dashboard.scoreDistribution} />
            </div>
          </div>

          {/* GRÁFICOS LINHA 2 */}
          <div className="grid gap-6 lg:grid-cols-12">
            <div className="lg:col-span-5 min-w-0 rounded-xl border border-border bg-card p-5 shadow-xs">
              <div className="border-b border-border/70 pb-3">
                <h2 className="text-base font-semibold text-foreground">
                  Média por Cargo / Vínculo
                </h2>
                <p className="text-xs text-muted-foreground">
                  Comparação entre Trainees, Membros, Gestão e Coordenação.
                </p>
              </div>
              <CargoAverageChart data={data.dashboard.byCargoAverage} />
            </div>

            <div className="lg:col-span-7 min-w-0 rounded-xl border border-border bg-card p-5 shadow-xs">
              <div className="border-b border-border/70 pb-3">
                <h2 className="text-base font-semibold text-foreground">
                  Evolução Entre Semestres
                </h2>
                <p className="text-xs text-muted-foreground">
                  Histórico comparativo das médias de membros, áreas e coordenação ao longo dos ciclos.
                </p>
              </div>
              <SemesterEvolutionChart data={data.dashboard.semesterTrend} />
            </div>
          </div>

          {/* TABELA DE COBERTURA POR ÁREA */}
          <div className="rounded-xl border border-border bg-card p-5 shadow-xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-semibold text-foreground">
                  Preenchimento e Médias por Área ({data.selectedPeriod})
                </h2>
                <p className="text-xs text-muted-foreground">
                  Acompanhe quantos membros cada coordenação já avaliou neste semestre.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    <th className="py-2.5 pr-4">Área / Divisão</th>
                    <th className="py-2.5 px-3">Cobertura</th>
                    <th className="py-2.5 px-3">Média Membros</th>
                    <th className="py-2.5 pl-3 text-right">Nota da Área</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {data.dashboard.coverageByArea.map((row) => (
                    <tr key={row.scopeKey} className="hover:bg-accent/30">
                      <td className="py-3 pr-4 font-medium text-foreground">{row.label}</td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2.5">
                          <div className="h-2 w-24 overflow-hidden rounded-full bg-muted">
                            <div
                              className={cn(
                                'h-full rounded-full',
                                row.pct === 100
                                  ? 'bg-emerald-500'
                                  : row.pct > 0
                                    ? 'bg-sky-500'
                                    : 'bg-muted-foreground/30'
                              )}
                              style={{ width: `${row.pct}%` }}
                            />
                          </div>
                          <span className="font-mono text-xs text-muted-foreground tabular-nums">
                            {row.evaluated}/{row.total} ({row.pct}%)
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-3 font-mono text-sm font-semibold text-foreground tabular-nums">
                        {row.memberAvg !== null ? `${formatScoreValue(row.memberAvg)}/10` : '—'}
                      </td>
                      <td className="py-3 pl-3 text-right font-mono text-sm font-bold text-foreground tabular-nums">
                        {row.areaScore !== null ? `${formatScoreValue(row.areaScore)}/10` : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {/* ABA 2: AVALIAÇÃO DE MEMBROS */}
      {activeTab === 'members' && (
        <section aria-label="Avaliação semestral dos membros" className="space-y-5">
          {/* Resumo + barra de progresso */}
          <div className="rounded-xl border border-border bg-card p-4 sm:p-5 shadow-xs space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-foreground">
                  {data.isAdmin
                    ? `Integrantes avaliáveis (${data.selectedPeriod})`
                    : `Integrantes de ${data.coordinatorScope?.label ?? 'sua área'} (${data.selectedPeriod})`}
                </h2>
                <p className="text-xs text-muted-foreground">
                  {membersProgress.evaluated} de {membersProgress.total} avaliados ·{' '}
                  {membersProgress.pending} pendente(s)
                  {membersProgress.avg !== null &&
                    ` · Média do conjunto: ${formatScoreValue(membersProgress.avg)}/10`}
                </p>
              </div>
              <span className="font-mono text-sm font-bold text-foreground tabular-nums">
                {membersProgress.pct}% concluído
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all duration-300"
                style={{ width: `${membersProgress.pct}%` }}
              />
            </div>
          </div>

          {/* Filtros */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar integrante por nome, e-mail ou cargo..."
                className="w-full rounded-lg border border-border bg-card pl-9 pr-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            {data.isAdmin && (
              <>
                <select
                  value={teamFilter}
                  onChange={(e) => {
                    setTeamFilter(e.target.value as typeof teamFilter);
                    setAreaFilter('all');
                  }}
                  aria-label="Filtrar por divisão"
                  className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring cursor-pointer"
                >
                  <option value="all">Todas as divisões</option>
                  <option value="harpia">Harpia</option>
                  <option value="nautilus">Nautilus</option>
                  <option value="autonomos">Geral (Autônomos)</option>
                </select>

                <select
                  value={areaFilter}
                  onChange={(e) => setAreaFilter(e.target.value)}
                  aria-label="Filtrar por área"
                  className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring cursor-pointer"
                >
                  <option value="all">Todas as áreas</option>
                  {availableAreasForFilter.map((area) => (
                    <option key={area} value={area}>
                      {area}
                    </option>
                  ))}
                </select>
              </>
            )}

            <div className="flex items-center rounded-lg border border-border bg-card p-1">
              {(
                [
                  { id: 'all', label: 'Todos' },
                  { id: 'pending', label: 'Pendentes' },
                  { id: 'evaluated', label: 'Avaliados' },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setStatusFilter(opt.id)}
                  className={cn(
                    'rounded-md px-3 py-1 text-xs font-medium transition-colors cursor-pointer',
                    statusFilter === opt.id
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Lista de membros */}
          {filteredMembers.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-card/50 p-10 text-center text-sm text-muted-foreground">
              Nenhum integrante encontrado com os filtros atuais.
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {filteredMembers.map((row) => {
                const badge = scoreBadgeMeta(row.evaluation?.score ?? null);
                return (
                  <article
                    key={row.memberId}
                    className="rounded-xl border border-border bg-card p-4 sm:p-5 shadow-xs flex flex-col justify-between gap-4"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-accent text-sm font-semibold text-foreground">
                            {row.avatar ? (
                              <img
                                src={row.avatar}
                                alt={row.name}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              row.name.slice(0, 1).toUpperCase()
                            )}
                          </div>
                          <div className="min-w-0">
                            <h3 className="truncate font-semibold text-sm text-foreground">
                              {row.name}
                            </h3>
                            <p className="truncate text-xs text-muted-foreground">
                              {row.cargoLabel} · {row.area} ·{' '}
                              {row.teamSlug === 'harpia'
                                ? 'Harpia'
                                : row.teamSlug === 'nautilus'
                                  ? 'Nautilus'
                                  : 'Geral'}
                            </p>
                          </div>
                        </div>

                        <div
                          className={cn(
                            'shrink-0 rounded-lg border px-2.5 py-1 text-center min-w-[60px]',
                            badge.cls
                          )}
                        >
                          <span className="block font-mono text-base font-bold leading-none tabular-nums">
                            {formatScoreValue(row.evaluation?.score)}
                          </span>
                          <span className="mt-0.5 block text-[10px] font-medium">
                            {row.evaluation ? '/ 10' : 'Pendente'}
                          </span>
                        </div>
                      </div>

                      {/* Métricas objetivas de apoio */}
                      <div className="grid grid-cols-3 gap-2 rounded-lg border border-border/70 bg-muted/30 p-2.5 text-center">
                        <div>
                          <p className="text-[10px] uppercase text-muted-foreground">Lab (4 sem)</p>
                          <p className="font-mono text-xs font-semibold text-foreground">
                            {row.metrics.labAdherencePct !== null
                              ? `${row.metrics.labAdherencePct}%`
                              : '—'}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] uppercase text-muted-foreground">Reuniões</p>
                          <p className="font-mono text-xs font-semibold text-foreground">
                            {row.metrics.meetingsPct !== null
                              ? `${row.metrics.meetingsPct}%`
                              : '—'}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] uppercase text-muted-foreground">Disciplinar</p>
                          <p
                            className={cn(
                              'font-mono text-xs font-semibold',
                              row.metrics.warningsCount > 0
                                ? 'text-amber-600 dark:text-amber-400'
                                : 'text-emerald-600 dark:text-emerald-400'
                            )}
                          >
                            {row.metrics.warningsCount === 0 && row.metrics.avisosCount === 0
                              ? 'OK'
                              : `${row.metrics.warningsCount} adv/${row.metrics.avisosCount} av`}
                          </p>
                        </div>
                      </div>

                      {row.evaluation ? (
                        <div className="space-y-1 text-xs">
                          <p className="text-muted-foreground line-clamp-3 flex items-start gap-1.5">
                            <MessageSquareText className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                            <span>
                              {row.evaluation.notes || (
                                <em className="opacity-75">Sem observação escrita.</em>
                              )}
                            </span>
                          </p>
                          <p className="text-[11px] text-muted-foreground/80">
                            Por {row.evaluation.evaluatorName} ·{' '}
                            {formatDateTimeBr(row.evaluation.updatedAt)}
                          </p>
                        </div>
                      ) : (
                        <p className="text-xs italic text-muted-foreground">
                          Ainda não avaliado neste semestre ({data.selectedPeriod}).
                        </p>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => openMemberEditor(row)}
                      className={cn(
                        'inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition cursor-pointer',
                        row.evaluation
                          ? 'border border-border bg-background text-foreground hover:bg-accent'
                          : 'bg-primary text-primary-foreground hover:bg-primary/90'
                      )}
                    >
                      {row.evaluation ? (
                        <>
                          <Pencil className="h-3.5 w-3.5" />
                          Editar avaliação
                        </>
                      ) : (
                        <>
                          <ClipboardCheck className="h-3.5 w-3.5" />
                          Avaliar integrante
                        </>
                      )}
                    </button>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* ABA 3: NOTA DAS ÁREAS */}
      {activeTab === 'areas' && (
        <section aria-label="Notas das áreas" className="space-y-5">
          <div className="rounded-xl border border-border bg-card p-4 sm:p-5 shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-foreground">
                Nota das Áreas · Semestre {data.selectedPeriod}
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground">
                {data.isAdmin
                  ? 'Lance ou ajuste a nota oficial de cada área com apoio das métricas reais do semestre. Todas as notas lançadas aparecem automaticamente na Home.'
                  : 'Modo somente leitura: apenas administradores podem lançar ou editar notas das áreas. As notas oficiais ficam disponíveis para toda a equipe na Home.'}
              </p>
            </div>
            {!data.isAdmin && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/60 px-3 py-1 text-xs font-semibold text-muted-foreground">
                <Eye className="h-3.5 w-3.5" />
                Somente leitura
              </span>
            )}
          </div>

          {(['harpia', 'nautilus', 'autonomos'] as const).map((slug) => {
            const groupAreas = data.areas.filter((a) => a.teamSlug === slug);
            if (groupAreas.length === 0) return null;
            const groupTitle =
              slug === 'harpia'
                ? 'Divisão Harpia (UAV)'
                : slug === 'nautilus'
                  ? 'Divisão Nautilus (AUV)'
                  : 'Geral (Autônomos)';

            return (
              <div key={slug} className="space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {groupTitle}
                </h3>

                <div
                  className={cn(
                    'grid gap-4',
                    groupAreas.length === 2
                      ? 'grid-cols-1 md:grid-cols-2'
                      : 'grid-cols-1 md:grid-cols-3'
                  )}
                >
                  {groupAreas.map((row) => {
                    const badge = scoreBadgeMeta(row.evaluation?.score ?? null);
                    return (
                      <article
                        key={row.scopeKey}
                        className={cn(
                          'rounded-xl border bg-card p-5 shadow-xs flex flex-col justify-between gap-4',
                          row.isUserArea
                            ? 'border-primary/50 ring-1 ring-primary/20'
                            : 'border-border'
                        )}
                      >
                        <div className="space-y-4">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <h4 className="font-display text-lg font-semibold text-foreground">
                                  {row.area === 'Gestão' ? 'Gente e Gestão' : row.area}
                                </h4>
                                {row.isUserArea && (
                                  <span className="rounded-full border border-primary/40 bg-primary/15 px-2 py-0.5 text-[10px] font-semibold text-primary">
                                    Sua área
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground">{row.teamName}</p>
                            </div>

                            <div
                              className={cn(
                                'shrink-0 rounded-lg border px-3 py-1.5 text-center min-w-[68px]',
                                badge.cls
                              )}
                            >
                              <span className="block font-mono text-xl font-bold leading-none tabular-nums">
                                {formatScoreValue(row.evaluation?.score)}
                              </span>
                              <span className="mt-0.5 block text-[10px] font-medium">
                                {row.evaluation ? '/ 10' : 'Pendente'}
                              </span>
                            </div>
                          </div>

                          {/* Métricas de referência do semestre */}
                          <div className="grid grid-cols-2 gap-2 rounded-lg border border-border/70 bg-muted/30 p-3 text-xs">
                            <div>
                              <span className="text-muted-foreground">Ativos:</span>{' '}
                              <strong className="font-mono text-foreground">
                                {row.metrics.activeMembersCount}
                              </strong>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Lab (4 sem):</span>{' '}
                              <strong className="font-mono text-foreground">
                                {row.metrics.labAdherencePct !== null
                                  ? `${row.metrics.labAdherencePct}%`
                                  : '—'}
                              </strong>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Reuniões:</span>{' '}
                              <strong className="font-mono text-foreground">
                                {row.metrics.meetingsPct !== null
                                  ? `${row.metrics.meetingsPct}%`
                                  : '—'}
                              </strong>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Advertências:</span>{' '}
                              <strong className="font-mono text-foreground">
                                {row.metrics.warningsCount}
                              </strong>
                            </div>
                            {typeof row.metrics.totalEvaluableMembersCount === 'number' && (
                              <div className="col-span-2 pt-1.5 border-t border-border/50 flex items-center justify-between">
                                <span className="text-muted-foreground">
                                  Média membros ({row.metrics.evaluatedMembersCount ?? 0}/
                                  {row.metrics.totalEvaluableMembersCount}):
                                </span>
                                <strong className="font-mono text-foreground">
                                  {row.metrics.memberAvgScore !== null &&
                                  row.metrics.memberAvgScore !== undefined
                                    ? `${formatScoreValue(row.metrics.memberAvgScore)}/10`
                                    : '—'}
                                </strong>
                              </div>
                            )}
                          </div>

                          {row.evaluation ? (
                            <div className="space-y-1 text-xs">
                              <p className="text-muted-foreground flex items-start gap-1.5">
                                <MessageSquareText className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                                <span>
                                  {row.evaluation.notes || (
                                    <em className="opacity-75">Sem observação escrita.</em>
                                  )}
                                </span>
                              </p>
                              <p className="text-[11px] text-muted-foreground/80">
                                Atualizada por {row.evaluation.evaluatorName} em{' '}
                                {formatDateTimeBr(row.evaluation.updatedAt)}
                              </p>
                            </div>
                          ) : (
                            <p className="text-xs italic text-muted-foreground">
                              Nota da área ainda não lançada neste semestre.
                            </p>
                          )}
                        </div>

                        {data.isAdmin && (
                          <button
                            type="button"
                            onClick={() => openAreaEditor(row)}
                            className={cn(
                              'inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition cursor-pointer',
                              row.evaluation
                                ? 'border border-border bg-background text-foreground hover:bg-accent'
                                : 'bg-primary text-primary-foreground hover:bg-primary/90'
                            )}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                            {row.evaluation ? 'Editar nota da área' : 'Lançar nota da área'}
                          </button>
                        )}
                      </article>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </section>
      )}

      {/* ABA 4: NOTA DOS COORDENADORES (EXCLUSIVO ADMIN) */}
      {activeTab === 'coordinators' && data.isAdmin && (
        <section aria-label="Avaliação dos coordenadores" className="space-y-5">
          <div className="rounded-xl border border-border bg-card p-4 sm:p-5 shadow-xs">
            <h2 className="text-base font-semibold text-foreground">
              Avaliação dos Coordenadores · Semestre {data.selectedPeriod}
            </h2>
            <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
              Seção exclusiva da administração para avaliar o desempenho semestral de cada coordenador. Coordenadores não visualizam avaliações individuais da coordenação.
            </p>
          </div>

          {data.coordinators.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-card/50 p-10 text-center text-sm text-muted-foreground">
              Nenhum coordenador ativo identificado no momento.
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {data.coordinators.map((row) => {
                const badge = scoreBadgeMeta(row.isSelf ? null : (row.evaluation?.score ?? null));
                return (
                  <article
                    key={row.coordinatorId}
                    className="rounded-xl border border-border bg-card p-5 shadow-xs flex flex-col justify-between gap-4"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-accent text-sm font-semibold text-foreground">
                            {row.avatar ? (
                              <img
                                src={row.avatar}
                                alt={row.name}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              row.name.slice(0, 1).toUpperCase()
                            )}
                          </div>
                          <div className="min-w-0">
                            <h3 className="truncate font-semibold text-sm text-foreground">
                              {row.name}
                            </h3>
                            <p className="truncate text-xs text-muted-foreground">
                              {row.cargoLabel} · {row.area} ·{' '}
                              {row.teamSlug === 'harpia'
                                ? 'Harpia'
                                : row.teamSlug === 'nautilus'
                                  ? 'Nautilus'
                                  : 'Geral'}
                            </p>
                          </div>
                        </div>

                        {!row.isSelf ? (
                          <div
                            className={cn(
                              'shrink-0 rounded-lg border px-2.5 py-1 text-center min-w-[60px]',
                              badge.cls
                            )}
                          >
                            <span className="block font-mono text-base font-bold leading-none tabular-nums">
                              {formatScoreValue(row.evaluation?.score)}
                            </span>
                            <span className="mt-0.5 block text-[10px] font-medium">
                              {row.evaluation ? '/ 10' : 'Pendente'}
                            </span>
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                            <Lock className="h-3 w-3" />
                            Privado
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-3 gap-2 rounded-lg border border-border/70 bg-muted/30 p-2.5 text-center">
                        <div>
                          <p className="text-[10px] uppercase text-muted-foreground">Aval. Área</p>
                          <p className="font-mono text-xs font-semibold text-foreground">
                            {row.metrics.areaMembersEvaluated}/{row.metrics.areaMembersTotal}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] uppercase text-muted-foreground">Lab Área</p>
                          <p className="font-mono text-xs font-semibold text-foreground">
                            {row.metrics.labAdherencePct !== null
                              ? `${row.metrics.labAdherencePct}%`
                              : '—'}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] uppercase text-muted-foreground">Reuniões</p>
                          <p className="font-mono text-xs font-semibold text-foreground">
                            {row.metrics.meetingsPct !== null
                              ? `${row.metrics.meetingsPct}%`
                              : '—'}
                          </p>
                        </div>
                      </div>

                      {row.isSelf ? (
                        <p className="text-xs text-muted-foreground italic">
                          Autoavaliação desabilitada e nota própria oculta por política de sigilo.
                        </p>
                      ) : row.evaluation ? (
                        <div className="space-y-1 text-xs">
                          <p className="text-muted-foreground line-clamp-3 flex items-start gap-1.5">
                            <MessageSquareText className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                            <span>
                              {row.evaluation.notes || (
                                <em className="opacity-75">Sem observação escrita.</em>
                              )}
                            </span>
                          </p>
                          <p className="text-[11px] text-muted-foreground/80">
                            Por {row.evaluation.evaluatorName} ·{' '}
                            {formatDateTimeBr(row.evaluation.updatedAt)}
                          </p>
                        </div>
                      ) : (
                        <p className="text-xs italic text-muted-foreground">
                          Coordenação ainda não avaliada em {data.selectedPeriod}.
                        </p>
                      )}
                    </div>

                    {!row.isSelf && (
                      <button
                        type="button"
                        onClick={() => openCoordinatorEditor(row)}
                        className={cn(
                          'inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition cursor-pointer',
                          row.evaluation
                            ? 'border border-border bg-background text-foreground hover:bg-accent'
                            : 'bg-primary text-primary-foreground hover:bg-primary/90'
                        )}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        {row.evaluation ? 'Editar avaliação' : 'Avaliar coordenador'}
                      </button>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* MODAL UNIFICADO DE AVALIAÇÃO */}
      {editor && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 sm:p-4 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
          aria-labelledby="evaluation-modal-title"
          onClick={(e) => {
            if (e.target === e.currentTarget && !saving) setEditor(null);
          }}
        >
          <div className="w-full max-w-lg max-h-[92dvh] overflow-y-auto rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-2xl space-y-5">
            <div className="flex items-start justify-between gap-3 border-b border-border pb-4">
              <div className="min-w-0">
                <h2
                  id="evaluation-modal-title"
                  className="font-display text-lg font-semibold text-foreground truncate"
                >
                  {editor.title}
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">{editor.subtitle}</p>
              </div>
              <button
                type="button"
                disabled={saving}
                onClick={() => setEditor(null)}
                aria-label="Fechar janela de avaliação"
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Indicadores do semestre */}
            <div className="rounded-xl border border-border/80 bg-muted/30 p-3.5 space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Clock3 className="h-3.5 w-3.5" />
                Indicadores de referência ({data.selectedPeriod})
              </p>
              <div className="space-y-1.5">
                {editor.metricsSummary.map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center justify-between gap-3 text-xs"
                  >
                    <span className="text-muted-foreground">{item.label}</span>
                    <span className="font-mono font-semibold text-foreground">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>

            <form onSubmit={submitEditor} className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="evaluation-score-input"
                    className="text-sm font-medium text-foreground"
                  >
                    Nota geral (0 a 10)
                  </label>
                  <span className="font-mono text-xs text-muted-foreground">
                    Semestre {data.selectedPeriod}
                  </span>
                </div>

                <input
                  id="evaluation-score-input"
                  type="number"
                  step="0.1"
                  min="0"
                  max="10"
                  required
                  value={scoreInput}
                  onChange={(e) => setScoreInput(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3.5 py-2.5 font-mono text-lg font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />

                <div className="flex flex-wrap gap-1.5 pt-1">
                  {QUICK_SCORES.map((val) => {
                    const active = Number(scoreInput.replace(',', '.')) === val;
                    return (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setScoreInput(val.toFixed(1))}
                        className={cn(
                          'rounded-md border px-2.5 py-1 font-mono text-xs font-medium transition cursor-pointer',
                          active
                            ? 'border-primary bg-primary text-primary-foreground'
                            : 'border-border bg-background text-muted-foreground hover:bg-accent hover:text-foreground'
                        )}
                      >
                        {val.toFixed(1).replace('.', ',')}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="evaluation-notes-input"
                  className="text-sm font-medium text-foreground"
                >
                  Observação escrita / Feedback do semestre
                </label>
                <textarea
                  id="evaluation-notes-input"
                  rows={4}
                  value={notesInput}
                  onChange={(e) => setNotesInput(e.target.value)}
                  placeholder="Descreva pontos fortes, entregas, comprometimento e pontos de melhoria neste semestre..."
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border">
                {editor.kind === 'member' && editor.existingId ? (
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => void handleDeleteMemberEvaluation(editor.existingId!)}
                    className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-red-500/35 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-700 dark:text-red-300 hover:bg-red-500/20 disabled:opacity-50 cursor-pointer"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Limpar nota
                  </button>
                ) : (
                  <span />
                )}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => setEditor(null)}
                    className="inline-flex min-h-10 items-center justify-center rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-accent disabled:opacity-50 cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 cursor-pointer"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    {saving ? 'Salvando...' : 'Salvar avaliação'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
