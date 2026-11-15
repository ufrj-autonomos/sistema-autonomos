'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import {
  Archive,
  Bug,
  Check,
  ChevronDown,
  ClipboardCheck,
  ExternalLink,
  Filter,
  Globe,
  Laptop,
  Lightbulb,
  MessageSquare,
  Paperclip,
  Rocket,
  Search,
  Send,
  ThumbsUp,
  Trash2,
  Users,
  Wrench,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/institutional/ui/dialog';
import {
  FEEDBACK_ASSIGNED_AREAS,
  FEEDBACK_CATEGORY_META,
  FEEDBACK_PRIORITY_META,
  FEEDBACK_SCOPE_META,
  FEEDBACK_STATUS_META,
  FEEDBACK_TARGET_TEAM_META,
  FEEDBACK_VALIDITY_META,
  getFeedbackCardBorderClasses,
  type FeedbackCategoryValue,
  type FeedbackDashboardData,
  type FeedbackItemDTO,
  type FeedbackPriorityValue,
  type FeedbackScopeValue,
  type FeedbackStatusValue,
  type FeedbackTargetTeamValue,
  type FeedbackValidityValue,
} from '@/lib/feedback/constants';
import { cn } from '@/lib/utils';

const SCOPE_ICONS: Record<FeedbackScopeValue, typeof Laptop> = {
  SISTEMA: Laptop,
  SITE: Globe,
  LABORATORIO: Wrench,
  EQUIPE: Users,
};

const TONE_CLASSES: Record<string, string> = {
  slate: 'border-border bg-muted/60 text-muted-foreground',
  sky: 'border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300',
  indigo: 'border-indigo-500/30 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300',
  violet: 'border-violet-500/30 bg-violet-500/10 text-violet-700 dark:text-violet-300',
  amber: 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300',
  emerald: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  rose: 'border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300',
};

const REPLY_QUICK_TEMPLATES = [
  {
    label: 'Pedir detalhes',
    text: 'Recebemos sua sugestão! Para conseguirmos avaliar melhor, você pode detalhar o contexto, em qual tela/situação isso acontece e qual resultado espera?',
  },
  {
    label: 'Pedir melhoria na ideia',
    text: 'A ideia tem um ótimo ponto de partida! Você poderia refinar a proposta explicando como ela funcionaria na prática para a equipe ou quais recursos seriam necessários?',
  },
  {
    label: 'Aceita / Em roadmap',
    text: 'Ideia/reporte validado! Já priorizamos com o time responsável e vamos atuar nisso em breve.',
  },
  {
    label: 'Não procede / Duplicada',
    text: 'Avaliamos este registro e no momento ele não será aplicado (motivo: já existe fluxo equivalente / duplicado / fora do escopo atual).',
  },
] as const;

export function FeedbackTriageClient({
  initialData,
}: {
  initialData: FeedbackDashboardData;
}) {
  const [data, setData] = useState<FeedbackDashboardData>(initialData);
  const [scopeFilter, setScopeFilter] = useState<'ALL' | FeedbackScopeValue>('ALL');
  const [targetTeamFilter, setTargetTeamFilter] = useState<'ALL' | FeedbackTargetTeamValue>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | FeedbackCategoryValue>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'OPEN' | FeedbackStatusValue>('OPEN');
  const [validityFilter, setValidityFilter] = useState<'ALL' | FeedbackValidityValue>('ALL');
  const [sortBy, setSortBy] = useState<'recent' | 'votes' | 'priority'>('recent');
  const [search, setSearch] = useState('');
  const [expandedIds, setExpandedIds] = useState<string[]>([]);

  function toggleExpand(id: string) {
    setExpandedIds(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]));
  }

  // Dialog 1: Avaliar (Triagem técnica/gestão — sem bug de reabertura pós-triagem)
  const [reviewTarget, setReviewTarget] = useState<FeedbackItemDTO | null>(null);
  const [status, setStatus] = useState<FeedbackStatusValue>('RECEBIDA');
  const [validity, setValidity] = useState<FeedbackValidityValue>('PENDENTE');
  const [priority, setPriority] = useState<FeedbackPriorityValue>('MEDIA');
  const [targetTeam, setTargetTeam] = useState<FeedbackTargetTeamValue>('TECH');
  const [assignedArea, setAssignedArea] = useState('');
  const [assignedToId, setAssignedToId] = useState('');
  const [savingReview, setSavingReview] = useState(false);

  // Dialog 2: Responder (Devolutiva direta para o autor)
  const [replyTarget, setReplyTarget] = useState<FeedbackItemDTO | null>(null);
  const [replyNotes, setReplyNotes] = useState('');
  const [replyStatus, setReplyStatus] = useState<'' | FeedbackStatusValue>('');
  const [savingReply, setSavingReply] = useState(false);

  async function refreshTriage() {
    const res = await fetch('/api/melhorias?scope=management', { cache: 'no-store' });
    if (!res.ok) return;
    const json = (await res.json()) as FeedbackDashboardData;
    setData(json);
  }

  function openEvaluateModal(item: FeedbackItemDTO) {
    setReplyTarget(null);
    setReviewTarget(item);
    setStatus(item.status);
    setValidity(item.validity);
    setPriority(item.priority);
    setTargetTeam(item.targetTeam);
    setAssignedArea(item.assignedArea || '');
    setAssignedToId(item.assignedToId || '');
  }

  function openReplyModal(item: FeedbackItemDTO) {
    setReviewTarget(null);
    setReplyTarget(item);
    setReplyNotes(item.responseNotes || '');
    setReplyStatus('');
  }

  async function quickAction(
    item: FeedbackItemDTO,
    patch: {
      status?: FeedbackStatusValue;
      validity?: FeedbackValidityValue;
      responseNotes?: string;
    },
    successMsg: string
  ) {
    try {
      const res = await fetch(`/api/melhorias/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Erro ao atualizar registro.');
      toast.success(successMsg);
      await refreshTriage();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro na ação rápida.');
    }
  }

  async function handleSaveReview(e: React.FormEvent) {
    e.preventDefault();
    if (!reviewTarget) return;
    const targetId = reviewTarget.id;
    const targetCode = reviewTarget.code;
    setSavingReview(true);
    try {
      const res = await fetch(`/api/melhorias/${targetId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status,
          validity,
          priority,
          targetTeam,
          assignedArea: assignedArea || null,
          assignedToId: assignedToId || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Erro ao salvar avaliação.');
      setReviewTarget(null);
      toast.success(`Avaliação de ${json.item?.code || targetCode} salva!`);
      await refreshTriage();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar avaliação.');
    } finally {
      setSavingReview(false);
    }
  }

  async function handleSendReply(e: React.FormEvent) {
    e.preventDefault();
    if (!replyTarget) return;
    const trimmed = replyNotes.trim();
    if (trimmed.length < 3) {
      toast.error('Escreva uma resposta para enviar ao integrante.');
      return;
    }
    const targetId = replyTarget.id;
    const targetCode = replyTarget.code;
    setSavingReply(true);
    try {
      const res = await fetch(`/api/melhorias/${targetId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          responseNotes: trimmed,
          ...(replyStatus ? { status: replyStatus } : {}),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Erro ao enviar resposta.');
      setReplyTarget(null);
      toast.success(`Resposta enviada para ${json.item?.code || targetCode}!`);
      await refreshTriage();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao enviar resposta.');
    } finally {
      setSavingReply(false);
    }
  }

  async function handleDelete(item: FeedbackItemDTO) {
    if (!window.confirm(`Excluir permanentemente "${item.code} — ${item.title}"?`)) return;
    try {
      const res = await fetch(`/api/melhorias/${item.id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Erro ao remover registro.');
      toast.success(`${item.code} removido.`);
      setReviewTarget(null);
      setReplyTarget(null);
      await refreshTriage();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao remover.');
    }
  }

  const filteredItems = useMemo(() => {
    const q = search.trim().toLocaleLowerCase('pt-BR');
    const list = data.items.filter(item => {
      if (scopeFilter !== 'ALL' && item.scope !== scopeFilter) return false;
      if (targetTeamFilter !== 'ALL' && item.targetTeam !== targetTeamFilter) return false;
      if (categoryFilter !== 'ALL' && item.category !== categoryFilter) return false;
      if (statusFilter === 'OPEN') {
        if (item.status === 'APLICADA' || item.status === 'ARQUIVADA') return false;
      } else if (statusFilter !== 'ALL' && item.status !== statusFilter) {
        return false;
      }
      if (validityFilter !== 'ALL' && item.validity !== validityFilter) return false;
      if (q) {
        const hay = `${item.code} ${item.title} ${item.description} ${item.authorDisplayName} ${item.pageOrLocation || ''} ${item.assignedArea || ''}`.toLocaleLowerCase('pt-BR');
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    if (sortBy === 'votes') {
      return [...list].sort((a, b) => b.voteCount - a.voteCount);
    }
    if (sortBy === 'priority') {
      return [...list].sort(
        (a, b) =>
          FEEDBACK_PRIORITY_META[b.priority].rank - FEEDBACK_PRIORITY_META[a.priority].rank
      );
    }
    return list;
  }, [data.items, scopeFilter, targetTeamFilter, categoryFilter, statusFilter, validityFilter, sortBy, search]);

  const { summary } = data;
  const techStat = summary.byTargetTeam?.find(t => t.targetTeam === 'TECH');
  const mgmtStat = summary.byTargetTeam?.find(t => t.targetTeam === 'MANAGEMENT');
  const hasActiveFilters =
    scopeFilter !== 'ALL' ||
    targetTeamFilter !== 'ALL' ||
    categoryFilter !== 'ALL' ||
    validityFilter !== 'ALL' ||
    search.trim() !== '' ||
    statusFilter !== 'OPEN';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-primary">
            <ClipboardCheck className="h-3 w-3" />
            Recepção &amp; Triagem da Gestão
          </span>
          <h1 className="mt-1.5 font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Bugs, Melhorias &amp; Ideias Recebidas
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Avalie se cada reporte ou ideia procede, defina prioridade e responsável, e responda diretamente ao integrante.
          </p>
        </div>

        <Link
          href="/melhorias"
          className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-border bg-background px-3.5 text-xs font-semibold text-foreground hover:bg-accent"
        >
          <Lightbulb className="h-4 w-4 text-primary" />
          Abrir Visão dos Membros (/melhorias)
        </Link>
      </div>

      {/* KPI Unificado Clicável (4 Cards) */}
      <div className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
        <button
          type="button"
          onClick={() => {
            setValidityFilter(prev => (prev === 'PENDENTE' ? 'ALL' : 'PENDENTE'));
            setStatusFilter('OPEN');
          }}
          className={cn(
            'rounded-xl border p-4 text-left shadow-xs transition-all cursor-pointer',
            validityFilter === 'PENDENTE'
              ? 'border-amber-500 bg-amber-500/10 ring-1 ring-amber-500/30'
              : 'border-border bg-card hover:bg-muted/30'
          )}
        >
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">Aguardando Triagem</span>
            <Filter className="h-4 w-4 text-amber-500" />
          </div>
          <p className="mt-2 font-mono text-2xl font-bold text-amber-600 dark:text-amber-400 tabular-nums">
            {summary.pendingTriageCount}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Submissões ainda sem avaliação de validade
          </p>
        </button>

        <button
          type="button"
          onClick={() => {
            setCategoryFilter(prev => (prev === 'BUG' ? 'ALL' : 'BUG'));
            setStatusFilter('OPEN');
          }}
          className={cn(
            'rounded-xl border p-4 text-left shadow-xs transition-all cursor-pointer',
            categoryFilter === 'BUG'
              ? 'border-rose-500 bg-rose-500/10 ring-1 ring-rose-500/30'
              : 'border-border bg-card hover:bg-muted/30'
          )}
        >
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">Bugs em Aberto</span>
            <Bug className="h-4 w-4 text-rose-500" />
          </div>
          <p className="mt-2 font-mono text-2xl font-bold text-rose-600 dark:text-rose-400 tabular-nums">
            {summary.openBugsCount}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Erros reportados aguardando correção
          </p>
        </button>

        <button
          type="button"
          onClick={() => setTargetTeamFilter(prev => (prev === 'TECH' ? 'ALL' : 'TECH'))}
          className={cn(
            'rounded-xl border p-4 text-left shadow-xs transition-all cursor-pointer',
            targetTeamFilter === 'TECH'
              ? 'border-indigo-500 bg-indigo-500/10 ring-1 ring-indigo-500/30'
              : 'border-border bg-card hover:bg-muted/30'
          )}
        >
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">Time de Tecnologia</span>
            <Laptop className="h-4 w-4 text-indigo-500" />
          </div>
          <p className="mt-2 font-mono text-2xl font-bold text-indigo-600 dark:text-indigo-400 tabular-nums">
            {techStat?.openCount ?? 0}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            em aberto · {techStat?.count ?? 0} no total
          </p>
        </button>

        <button
          type="button"
          onClick={() => setTargetTeamFilter(prev => (prev === 'MANAGEMENT' ? 'ALL' : 'MANAGEMENT'))}
          className={cn(
            'rounded-xl border p-4 text-left shadow-xs transition-all cursor-pointer',
            targetTeamFilter === 'MANAGEMENT'
              ? 'border-amber-500 bg-amber-500/10 ring-1 ring-amber-500/30'
              : 'border-border bg-card hover:bg-muted/30'
          )}
        >
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">Gestão</span>
            <Users className="h-4 w-4 text-amber-500" />
          </div>
          <p className="mt-2 font-mono text-2xl font-bold text-foreground tabular-nums">
            {mgmtStat?.openCount ?? 0}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            em aberto · {mgmtStat?.count ?? 0} no total ({summary.appliedCount} aplicadas)
          </p>
        </button>
      </div>

      {/* Filtros & Fila de Recepção */}
      <div className="rounded-xl border border-border bg-card overflow-hidden shadow-xs">
        <div className="border-b border-border bg-muted/35 px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: 'OPEN' as const, label: 'Fila Ativa' },
              { id: 'RECEBIDA' as const, label: 'Novas' },
              { id: 'APROVADA' as const, label: 'Aceitas / Válidas' },
              { id: 'APLICADA' as const, label: `Aplicadas (${summary.appliedCount})` },
              { id: 'ALL' as const, label: `Todas (${summary.totalCount})` },
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id)}
                className={cn(
                  'min-h-8 rounded-lg px-3 text-xs font-medium transition-colors cursor-pointer',
                  statusFilter === tab.id
                    ? 'bg-primary text-primary-foreground shadow-xs'
                    : 'bg-background text-muted-foreground hover:text-foreground border border-border'
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span>
              Exibindo <strong className="text-foreground">{filteredItems.length}</strong> itens
            </span>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={() => {
                  setScopeFilter('ALL');
                  setTargetTeamFilter('ALL');
                  setCategoryFilter('ALL');
                  setValidityFilter('ALL');
                  setStatusFilter('OPEN');
                  setSearch('');
                }}
                className="font-semibold text-primary hover:underline cursor-pointer"
              >
                Limpar filtros
              </button>
            )}
          </div>
        </div>

        {/* Pills compactos por Alvo / Escopo */}
        <div className="border-b border-border/80 bg-muted/15 px-4 py-2.5 flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setScopeFilter('ALL')}
            className={cn(
              'min-h-7 rounded-full border px-2.5 text-[11px] font-medium transition-colors cursor-pointer',
              scopeFilter === 'ALL'
                ? 'border-foreground bg-foreground text-background'
                : 'border-border bg-card text-muted-foreground hover:text-foreground'
            )}
          >
            Todos os alvos
          </button>
          {summary.byScope.map(s => {
            const Icon = SCOPE_ICONS[s.scope];
            const active = scopeFilter === s.scope;
            return (
              <button
                key={s.scope}
                type="button"
                onClick={() => setScopeFilter(active ? 'ALL' : s.scope)}
                className={cn(
                  'inline-flex min-h-7 items-center gap-1.5 rounded-full border px-2.5 text-[11px] font-medium transition-colors cursor-pointer',
                  active
                    ? 'border-primary bg-primary/15 text-primary font-semibold'
                    : 'border-border bg-card text-muted-foreground hover:text-foreground'
                )}
              >
                <Icon className="h-3 w-3" />
                <span>{FEEDBACK_SCOPE_META[s.scope].shortLabel}</span>
                <span className="font-mono text-[10px] opacity-80">({s.count})</span>
              </button>
            );
          })}
        </div>

        <div className="border-b border-border px-4 py-3 flex flex-wrap items-center gap-2.5">
          <div className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por código FB-, título, autor, tela ou descrição…"
              className="min-h-10 w-full rounded-lg border border-input bg-background pl-9 pr-3 text-sm text-foreground"
            />
          </div>

          <select
            value={targetTeamFilter}
            onChange={e => setTargetTeamFilter(e.target.value as typeof targetTeamFilter)}
            className="min-h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground"
          >
            <option value="ALL">Todas as equipes (Tech / Gestão)</option>
            <option value="TECH">Time de Tecnologia</option>
            <option value="MANAGEMENT">Gestão</option>
          </select>

          <select
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value as typeof categoryFilter)}
            className="min-h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground"
          >
            <option value="ALL">Todos os tipos</option>
            {(Object.keys(FEEDBACK_CATEGORY_META) as FeedbackCategoryValue[]).map(cat => (
              <option key={cat} value={cat}>
                {FEEDBACK_CATEGORY_META[cat].label}
              </option>
            ))}
          </select>

          <select
            value={validityFilter}
            onChange={e => setValidityFilter(e.target.value as typeof validityFilter)}
            className="min-h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground"
          >
            <option value="ALL">Qualquer validade</option>
            {(Object.keys(FEEDBACK_VALIDITY_META) as FeedbackValidityValue[]).map(val => (
              <option key={val} value={val}>
                {FEEDBACK_VALIDITY_META[val].shortLabel}
              </option>
            ))}
          </select>

          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value as typeof sortBy)}
            className="min-h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground"
          >
            <option value="recent">Mais recentes</option>
            <option value="votes">Mais apoiadas (+ votos)</option>
            <option value="priority">Maior prioridade</option>
          </select>
        </div>

        <div className="border-b border-border bg-muted/20 px-4 py-2 text-[11px] text-muted-foreground flex flex-wrap items-center justify-between gap-2">
          <span>
            <strong className="text-foreground">Legenda visual (cards válidos):</strong> borda colorida = tipo · barra esquerda = prioridade (Crítica vermelha · Alta laranja · Média azul · Baixa cinza)
          </span>
        </div>

        {filteredItems.length === 0 ? (
          <div className="px-6 py-12 text-center space-y-2">
            <ClipboardCheck className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="text-sm font-medium text-foreground">
              Nenhum registro nessa fila com os filtros atuais.
            </p>
            <p className="text-xs text-muted-foreground">
              Altere o filtro acima para visualizar ideias aplicadas, arquivadas ou outros escopos.
            </p>
          </div>
        ) : (
          <div className="p-4 space-y-3.5">
            {filteredItems.map(item => {
              const scopeMeta = FEEDBACK_SCOPE_META[item.scope];
              const catMeta = FEEDBACK_CATEGORY_META[item.category];
              const statusMeta = FEEDBACK_STATUS_META[item.status];
              const validityMeta = FEEDBACK_VALIDITY_META[item.validity];
              const prioMeta = FEEDBACK_PRIORITY_META[item.priority];
              const teamMeta = FEEDBACK_TARGET_TEAM_META[item.targetTeam];
              const hasExtraDetails = Boolean(
                item.pageOrLocation ||
                  item.stepsToReproduce ||
                  item.expectedOutcome ||
                  item.attachmentUrl
              );
              const isExpanded = expandedIds.includes(item.id);

              return (
                <article
                  key={item.id}
                  className={cn(
                    'rounded-xl bg-card p-4 sm:p-5 space-y-3.5 transition-all shadow-2xs',
                    getFeedbackCardBorderClasses(item)
                  )}
                >
                  {/* Header do Card */}
                  <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-border/60 pb-2.5">
                    <div className="flex flex-wrap items-center gap-2 min-w-0">
                      <span
                        className={cn(
                          'rounded-full border px-2.5 py-0.5 text-[11px] font-semibold',
                          TONE_CLASSES[catMeta.tone]
                        )}
                      >
                        {catMeta.shortLabel}
                      </span>
                      <span className="font-mono text-xs font-bold text-primary">
                        {item.code}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        Para <strong className="font-medium text-foreground">{teamMeta.shortLabel}</strong> · {scopeMeta.shortLabel}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                      <span
                        className={cn(
                          'rounded-full border px-2.5 py-0.5 text-[11px] font-semibold',
                          TONE_CLASSES[statusMeta.tone]
                        )}
                      >
                        {statusMeta.shortLabel}
                      </span>
                      {item.validity === 'VALIDA' ? (
                        <span
                          className={cn(
                            'rounded-full border px-2.5 py-0.5 text-[11px] font-semibold',
                            TONE_CLASSES[prioMeta.tone]
                          )}
                        >
                          Válida · {prioMeta.shortLabel}
                        </span>
                      ) : item.validity !== 'PENDENTE' ? (
                        <span
                          className={cn(
                            'rounded-full border px-2.5 py-0.5 text-[11px] font-medium',
                            TONE_CLASSES[validityMeta.tone]
                          )}
                        >
                          {validityMeta.shortLabel}
                        </span>
                      ) : null}
                      <span
                        title="Apoios dos integrantes"
                        className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/40 px-2 py-0.5 text-[11px] font-mono text-muted-foreground tabular-nums"
                      >
                        <ThumbsUp className="h-3 w-3" /> {item.voteCount}
                      </span>
                    </div>
                  </div>

                  {/* Corpo do Card */}
                  <div className="space-y-2.5">
                    <h3 className="text-base font-semibold text-foreground leading-snug">
                      {item.title}
                    </h3>
                    <p
                      className={cn(
                        'text-sm text-muted-foreground leading-relaxed whitespace-pre-line',
                        !isExpanded && 'line-clamp-3'
                      )}
                    >
                      {item.description}
                    </p>

                    {hasExtraDetails && (
                      <div>
                        <button
                          type="button"
                          onClick={() => toggleExpand(item.id)}
                          aria-expanded={isExpanded}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline cursor-pointer"
                        >
                          {isExpanded ? 'Ocultar detalhes técnicos' : 'Ver detalhes técnicos'}
                          <ChevronDown
                            className={cn('h-3.5 w-3.5 transition-transform', isExpanded && 'rotate-180')}
                          />
                        </button>

                        {isExpanded && (
                          <div className="mt-2 rounded-lg border border-border bg-muted/25 p-3 text-xs space-y-1.5 text-muted-foreground">
                            {item.pageOrLocation && (
                              <p>
                                <strong className="text-foreground">Local / Tela:</strong>{' '}
                                {item.pageOrLocation}
                              </p>
                            )}
                            {item.stepsToReproduce && (
                              <div>
                                <strong className="text-foreground">Como reproduzir:</strong>
                                <p className="mt-0.5 whitespace-pre-line">{item.stepsToReproduce}</p>
                              </div>
                            )}
                            {item.expectedOutcome && (
                              <p>
                                <strong className="text-foreground">Resultado esperado:</strong>{' '}
                                {item.expectedOutcome}
                              </p>
                            )}
                            {item.attachmentUrl && (
                              <a
                                href={item.attachmentUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 font-medium text-primary hover:underline pt-1"
                              >
                                <Paperclip className="h-3.5 w-3.5" />
                                {item.attachmentName || 'Abrir print / anexo'}
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {item.responseNotes && (
                      <div className="rounded-lg border border-primary/25 bg-primary/5 px-3 py-2 text-xs">
                        <span className="font-semibold text-primary">Resposta enviada: </span>
                        <span className="text-foreground whitespace-pre-line">{item.responseNotes}</span>
                      </div>
                    )}
                  </div>

                  {/* Rodapé: Metadados à esquerda + Ações organizadas à direita */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-border/60 pt-3">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      <span>Por <strong className="font-medium text-foreground">{item.authorDisplayName}</strong></span>
                      <span>{new Date(item.createdAt).toLocaleDateString('pt-BR')}</span>
                      {item.assignedArea && <span>Subárea: {item.assignedArea}</span>}
                      {item.assignedToName && <span>Resp.: {item.assignedToName}</span>}
                      {!isExpanded && item.pageOrLocation && <span>Local: {item.pageOrLocation}</span>}
                      {!isExpanded && item.attachmentUrl && (
                        <span className="inline-flex items-center gap-1 text-primary">
                          <Paperclip className="h-3 w-3" /> Anexo
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      {/* Ações secundárias rápidas */}
                      <div className="flex flex-wrap items-center gap-1.5">
                        {item.validity !== 'VALIDA' && item.status !== 'ARQUIVADA' && (
                          <button
                            type="button"
                            onClick={() =>
                              void quickAction(
                                item,
                                {
                                  validity: 'VALIDA',
                                  status: item.status === 'RECEBIDA' ? 'APROVADA' : item.status,
                                },
                                `${item.code} marcada como válida!`
                              )
                            }
                            className="inline-flex min-h-8 items-center gap-1 rounded-lg border border-sky-500/30 bg-sky-500/10 px-2.5 text-xs font-medium text-sky-700 hover:bg-sky-500/20 dark:text-sky-300 cursor-pointer"
                          >
                            <Check className="h-3.5 w-3.5" />
                            Validar
                          </button>
                        )}

                        {item.status !== 'APLICADA' && (
                          <button
                            type="button"
                            onClick={() =>
                              void quickAction(
                                item,
                                { status: 'APLICADA', validity: 'VALIDA' },
                                `${item.code} marcada como aplicada!`
                              )
                            }
                            className="inline-flex min-h-8 items-center gap-1 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2.5 text-xs font-medium text-emerald-700 hover:bg-emerald-500/20 dark:text-emerald-300 cursor-pointer"
                          >
                            <Rocket className="h-3.5 w-3.5" />
                            Aplicada
                          </button>
                        )}

                        {item.status !== 'ARQUIVADA' && item.status !== 'APLICADA' && (
                          <button
                            type="button"
                            onClick={() =>
                              void quickAction(
                                item,
                                { status: 'ARQUIVADA', validity: 'INVALIDA_OU_DUPLICADA' },
                                `${item.code} arquivada.`
                              )
                            }
                            className="inline-flex min-h-8 items-center gap-1 rounded-lg border border-border px-2.5 text-xs font-medium text-muted-foreground hover:bg-accent cursor-pointer"
                            title="Marcar como não aplicável e arquivar"
                          >
                            <Archive className="h-3.5 w-3.5" />
                            Arquivar
                          </button>
                        )}
                      </div>

                      <span className="hidden sm:inline-block h-5 w-px bg-border" aria-hidden="true" />

                      {/* Ações principais de triagem e devolutiva */}
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => openEvaluateModal(item)}
                          className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-primary px-3 text-xs font-semibold text-primary-foreground hover:bg-primary/90 cursor-pointer"
                        >
                          <ClipboardCheck className="h-3.5 w-3.5" />
                          Avaliar
                        </button>

                        <button
                          type="button"
                          onClick={() => openReplyModal(item)}
                          className={cn(
                            'inline-flex min-h-9 items-center gap-1.5 rounded-lg border px-3 text-xs font-semibold cursor-pointer',
                            item.responseNotes
                              ? 'border-primary/40 bg-primary/10 text-primary hover:bg-primary/15'
                              : 'border-border bg-background text-foreground hover:bg-accent'
                          )}
                        >
                          <MessageSquare className="h-3.5 w-3.5" />
                          {item.responseNotes ? 'Editar Resposta' : 'Responder'}
                        </button>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal 1: Avaliar / Triagem (sem abrir novamente após salvar) */}
      <Dialog open={Boolean(reviewTarget)} onOpenChange={open => !open && setReviewTarget(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[92vh] overflow-y-auto border-border bg-card text-foreground">
          {reviewTarget && (
            <>
              <DialogHeader>
                <DialogTitle className="font-display flex flex-wrap items-center gap-2">
                  <span className="font-mono text-sm text-primary">{reviewTarget.code}</span>
                  <span>Avaliar: {reviewTarget.title}</span>
                </DialogTitle>
                <DialogDescription>
                  {FEEDBACK_SCOPE_META[reviewTarget.scope].label} ·{' '}
                  {FEEDBACK_CATEGORY_META[reviewTarget.category].label} · Enviado por{' '}
                  {reviewTarget.authorDisplayName} ({reviewTarget.voteCount} apoios)
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="rounded-xl border border-border bg-muted/30 p-3.5 text-sm space-y-2">
                  <p className="text-foreground whitespace-pre-line">{reviewTarget.description}</p>
                  {reviewTarget.pageOrLocation && (
                    <p className="text-xs text-muted-foreground">
                      <strong className="text-foreground">Local / Tela:</strong>{' '}
                      {reviewTarget.pageOrLocation}
                    </p>
                  )}
                  {reviewTarget.stepsToReproduce && (
                    <div className="text-xs text-muted-foreground">
                      <strong className="text-foreground">Como reproduzir:</strong>
                      <p className="mt-0.5 whitespace-pre-line">{reviewTarget.stepsToReproduce}</p>
                    </div>
                  )}
                  {reviewTarget.expectedOutcome && (
                    <p className="text-xs text-muted-foreground">
                      <strong className="text-foreground">Resultado esperado:</strong>{' '}
                      {reviewTarget.expectedOutcome}
                    </p>
                  )}
                  {reviewTarget.attachmentUrl && (
                    <a
                      href={reviewTarget.attachmentUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
                    >
                      <Paperclip className="h-3.5 w-3.5" />
                      {reviewTarget.attachmentName || 'Abrir print / anexo'}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>

                <form onSubmit={handleSaveReview} className="space-y-3.5">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-muted-foreground">
                        Equipe responsável (Tecnologia vs Gestão)
                      </label>
                      <select
                        value={targetTeam}
                        onChange={e => setTargetTeam(e.target.value as FeedbackTargetTeamValue)}
                        className="min-h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground"
                      >
                        <option value="TECH">Time de Tecnologia</option>
                        <option value="MANAGEMENT">Gestão</option>
                      </select>
                    </div>

                    <div>
                      <label className="mb-1 block text-xs font-medium text-muted-foreground">
                        Validade da ideia / bug
                      </label>
                      <select
                        value={validity}
                        onChange={e => setValidity(e.target.value as FeedbackValidityValue)}
                        className="min-h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground"
                      >
                        {(Object.keys(FEEDBACK_VALIDITY_META) as FeedbackValidityValue[]).map(v => (
                          <option key={v} value={v}>
                            {FEEDBACK_VALIDITY_META[v].label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-muted-foreground">
                        Status de execução
                      </label>
                      <select
                        value={status}
                        onChange={e => setStatus(e.target.value as FeedbackStatusValue)}
                        className="min-h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground"
                      >
                        {(Object.keys(FEEDBACK_STATUS_META) as FeedbackStatusValue[]).map(s => (
                          <option key={s} value={s}>
                            {FEEDBACK_STATUS_META[s].label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="mb-1 block text-xs font-medium text-muted-foreground">
                        Prioridade
                      </label>
                      <select
                        value={priority}
                        onChange={e => setPriority(e.target.value as FeedbackPriorityValue)}
                        className="min-h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground"
                      >
                        {(Object.keys(FEEDBACK_PRIORITY_META) as FeedbackPriorityValue[]).map(p => (
                          <option key={p} value={p}>
                            {FEEDBACK_PRIORITY_META[p].label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-muted-foreground">
                        Subárea / Frente responsável por aplicar
                      </label>
                      <select
                        value={assignedArea}
                        onChange={e => setAssignedArea(e.target.value)}
                        className="min-h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground"
                      >
                        <option value="">Definir área responsável…</option>
                        {FEEDBACK_ASSIGNED_AREAS.map(a => (
                          <option key={a} value={a}>
                            {a}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="mb-1 block text-xs font-medium text-muted-foreground">
                        Membro responsável
                      </label>
                      <select
                        value={assignedToId}
                        onChange={e => setAssignedToId(e.target.value)}
                        className="min-h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground"
                      >
                        <option value="">Sem responsável individual</option>
                        {(data.members || []).map(m => (
                          <option key={m.id} value={m.id}>
                            {m.name} ({m.area})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <DialogFooter className="flex-wrap justify-between gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => void handleDelete(reviewTarget)}
                      className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-destructive/30 px-3 text-xs font-semibold text-destructive hover:bg-destructive/10 cursor-pointer"
                    >
                      <Trash2 className="h-4 w-4" />
                      Excluir registro
                    </button>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setReviewTarget(null)}
                        className="min-h-10 rounded-lg border border-border px-4 text-xs font-medium text-muted-foreground hover:bg-accent cursor-pointer"
                      >
                        Fechar
                      </button>
                      <button
                        type="submit"
                        disabled={savingReview}
                        className="inline-flex min-h-10 items-center gap-1.5 rounded-lg bg-primary px-4 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60 cursor-pointer"
                      >
                        <Check className="h-4 w-4" />
                        {savingReview ? 'Salvando…' : 'Salvar avaliação'}
                      </button>
                    </div>
                  </DialogFooter>
                </form>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal 2: Responder diretamente ao autor */}
      <Dialog open={Boolean(replyTarget)} onOpenChange={open => !open && setReplyTarget(null)}>
        <DialogContent className="sm:max-w-xl max-h-[92vh] overflow-y-auto border-border bg-card text-foreground">
          {replyTarget && (
            <>
              <DialogHeader>
                <DialogTitle className="font-display flex flex-wrap items-center gap-2">
                  <span className="font-mono text-sm text-primary">{replyTarget.code}</span>
                  <span>Responder ao integrante</span>
                </DialogTitle>
                <DialogDescription>
                  Para {replyTarget.authorDisplayName} · {replyTarget.title} (gera notificação no app)
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleSendReply} className="space-y-4">
                <div className="rounded-xl border border-border bg-muted/30 p-3 text-xs text-muted-foreground whitespace-pre-line max-h-36 overflow-y-auto">
                  {replyTarget.description}
                </div>

                <div className="space-y-1.5">
                  <span className="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Atalhos de resposta
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {REPLY_QUICK_TEMPLATES.map(tpl => (
                      <button
                        key={tpl.label}
                        type="button"
                        onClick={() => setReplyNotes(tpl.text)}
                        className="rounded-full border border-border bg-muted/40 px-2.5 py-1 text-[11px] font-medium text-foreground hover:bg-accent cursor-pointer"
                      >
                        {tpl.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">
                    Mensagem para {replyTarget.authorDisplayName} *
                  </label>
                  <textarea
                    required
                    rows={4}
                    value={replyNotes}
                    onChange={e => setReplyNotes(e.target.value)}
                    placeholder="Escreva sua resposta: peça mais detalhes, oriente como melhorar a ideia ou informe os próximos passos…"
                    className="w-full rounded-lg border border-input bg-background p-3 text-sm text-foreground"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">
                    Atualizar status junto com a resposta (opcional)
                  </label>
                  <select
                    value={replyStatus}
                    onChange={e => setReplyStatus(e.target.value as '' | FeedbackStatusValue)}
                    className="min-h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground"
                  >
                    <option value="">Manter status atual ({FEEDBACK_STATUS_META[replyTarget.status].shortLabel})</option>
                    {(Object.keys(FEEDBACK_STATUS_META) as FeedbackStatusValue[]).map(s => (
                      <option key={s} value={s}>
                        Mudar para: {FEEDBACK_STATUS_META[s].label}
                      </option>
                    ))}
                  </select>
                </div>

                <DialogFooter className="gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setReplyTarget(null)}
                    className="min-h-10 rounded-lg border border-border px-4 text-xs font-medium text-muted-foreground hover:bg-accent cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={savingReply}
                    className="inline-flex min-h-10 items-center gap-1.5 rounded-lg bg-primary px-4 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60 cursor-pointer"
                  >
                    <Send className="h-3.5 w-3.5" />
                    {savingReply ? 'Enviando…' : 'Enviar resposta'}
                  </button>
                </DialogFooter>
              </form>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
