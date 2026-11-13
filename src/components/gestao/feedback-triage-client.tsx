'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import {
  Archive,
  Bug,
  Check,
  CheckCircle2,
  ClipboardCheck,
  ExternalLink,
  Filter,
  Globe,
  Laptop,
  Lightbulb,
  Paperclip,
  Rocket,
  Search,
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
  FEEDBACK_VALIDITY_META,
  type FeedbackCategoryValue,
  type FeedbackDashboardData,
  type FeedbackItemDTO,
  type FeedbackPriorityValue,
  type FeedbackScopeValue,
  type FeedbackStatusValue,
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

export function FeedbackTriageClient({
  initialData,
}: {
  initialData: FeedbackDashboardData;
}) {
  const [data, setData] = useState<FeedbackDashboardData>(initialData);
  const [scopeFilter, setScopeFilter] = useState<'ALL' | FeedbackScopeValue>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | FeedbackCategoryValue>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'OPEN' | FeedbackStatusValue>('OPEN');
  const [validityFilter, setValidityFilter] = useState<'ALL' | FeedbackValidityValue>('ALL');
  const [sortBy, setSortBy] = useState<'recent' | 'votes' | 'priority'>('recent');
  const [search, setSearch] = useState('');

  // Triage modal
  const [selectedItem, setSelectedItem] = useState<FeedbackItemDTO | null>(null);
  const [status, setStatus] = useState<FeedbackStatusValue>('RECEBIDA');
  const [validity, setValidity] = useState<FeedbackValidityValue>('PENDENTE');
  const [priority, setPriority] = useState<FeedbackPriorityValue>('MEDIA');
  const [assignedArea, setAssignedArea] = useState('');
  const [assignedToId, setAssignedToId] = useState('');
  const [responseNotes, setResponseNotes] = useState('');
  const [saving, setSaving] = useState(false);

  async function refreshTriage() {
    const res = await fetch('/api/melhorias?scope=management', { cache: 'no-store' });
    if (!res.ok) return;
    const json = (await res.json()) as FeedbackDashboardData;
    setData(json);
    if (selectedItem) {
      const updated = json.items.find(i => i.id === selectedItem.id) || null;
      setSelectedItem(updated);
    }
  }

  function openTriageModal(item: FeedbackItemDTO) {
    setSelectedItem(item);
    setStatus(item.status);
    setValidity(item.validity);
    setPriority(item.priority);
    setAssignedArea(item.assignedArea || '');
    setAssignedToId(item.assignedToId || '');
    setResponseNotes(item.responseNotes || '');
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

  async function handleSaveTriage(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedItem) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/melhorias/${selectedItem.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status,
          validity,
          priority,
          assignedArea: assignedArea || null,
          assignedToId: assignedToId || null,
          responseNotes: responseNotes.trim() || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Erro ao salvar avaliação.');
      toast.success(`Triagem de ${json.item.code} atualizada!`);
      setSelectedItem(null);
      await refreshTriage();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(item: FeedbackItemDTO) {
    if (!window.confirm(`Excluir permanentemente "${item.code} — ${item.title}"?`)) return;
    try {
      const res = await fetch(`/api/melhorias/${item.id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Erro ao remover registro.');
      toast.success(`${item.code} removido.`);
      setSelectedItem(null);
      await refreshTriage();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao remover.');
    }
  }

  const filteredItems = useMemo(() => {
    const q = search.trim().toLocaleLowerCase('pt-BR');
    const list = data.items.filter(item => {
      if (scopeFilter !== 'ALL' && item.scope !== scopeFilter) return false;
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
  }, [data.items, scopeFilter, categoryFilter, statusFilter, validityFilter, sortBy, search]);

  const { summary } = data;

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
            Avalie se cada reporte ou ideia procede, defina prioridade e responsável, e marque quando for aplicada na equipe, no laboratório, no sistema ou no site.
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

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">Aguardando Triagem</span>
            <Filter className="h-4 w-4 text-amber-500" />
          </div>
          <p className="mt-2 font-mono text-2xl font-bold text-amber-600 dark:text-amber-400 tabular-nums">
            {summary.pendingTriageCount}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Submissões ainda sem veredito de validade
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">Bugs em Aberto</span>
            <Bug className="h-4 w-4 text-rose-500" />
          </div>
          <p className="mt-2 font-mono text-2xl font-bold text-rose-600 dark:text-rose-400 tabular-nums">
            {summary.openBugsCount}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Erros reportados no sistema, site ou lab
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">Válidas / Em Execução</span>
            <Rocket className="h-4 w-4 text-sky-500" />
          </div>
          <p className="mt-2 font-mono text-2xl font-bold text-foreground tabular-nums">
            {summary.validAcceptedCount}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Aceitas ou em andamento pelos responsáveis
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">Ideias Aplicadas</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </div>
          <p className="mt-2 font-mono text-2xl font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
            {summary.appliedCount}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            de {summary.totalCount} registros totais
          </p>
        </div>
      </div>

      {/* Resumo clicável por Alvo */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {summary.byScope.map(s => {
          const Icon = SCOPE_ICONS[s.scope];
          const active = scopeFilter === s.scope;
          return (
            <button
              key={s.scope}
              type="button"
              onClick={() => setScopeFilter(active ? 'ALL' : s.scope)}
              className={cn(
                'rounded-xl border p-3.5 text-left transition-all cursor-pointer',
                active
                  ? 'border-primary bg-primary/10 shadow-xs'
                  : 'border-border bg-card hover:bg-muted/30'
              )}
            >
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-foreground">
                  <Icon className="h-4 w-4 text-primary" />
                  {s.label}
                </span>
                <span className="font-mono text-sm font-bold text-foreground tabular-nums">
                  {s.count}
                </span>
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">
                {s.appliedCount} {s.appliedCount === 1 ? 'aplicada' : 'aplicadas'}
              </p>
            </button>
          );
        })}
      </div>

      {/* Filtros & Fila de Recepção */}
      <div className="rounded-xl border border-border bg-card overflow-hidden shadow-xs">
        <div className="border-b border-border bg-muted/35 px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: 'OPEN' as const, label: 'Fila Ativa (não concluídas)' },
              { id: 'RECEBIDA' as const, label: 'Novas / Recebidas' },
              { id: 'APROVADA' as const, label: 'Aceitas / Válidas' },
              { id: 'APLICADA' as const, label: 'Aplicadas' },
              { id: 'ALL' as const, label: 'Todas' },
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

          <span className="text-xs text-muted-foreground">
            Exibindo <strong className="text-foreground">{filteredItems.length}</strong> itens
          </span>
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
          <div className="divide-y divide-border">
            {filteredItems.map(item => {
              const scopeMeta = FEEDBACK_SCOPE_META[item.scope];
              const catMeta = FEEDBACK_CATEGORY_META[item.category];
              const statusMeta = FEEDBACK_STATUS_META[item.status];
              const validityMeta = FEEDBACK_VALIDITY_META[item.validity];
              const prioMeta = FEEDBACK_PRIORITY_META[item.priority];

              return (
                <div
                  key={item.id}
                  onClick={() => openTriageModal(item)}
                  className="p-4 hover:bg-muted/25 cursor-pointer flex flex-col lg:flex-row lg:items-center justify-between gap-4 transition-colors"
                >
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="font-mono text-xs font-bold text-primary">
                        {item.code}
                      </span>
                      <span
                        className={cn(
                          'rounded-full border px-2 py-0.5 text-[11px] font-medium',
                          TONE_CLASSES[scopeMeta.tone]
                        )}
                      >
                        {scopeMeta.shortLabel}
                      </span>
                      <span
                        className={cn(
                          'rounded-full border px-2 py-0.5 text-[11px] font-medium',
                          TONE_CLASSES[catMeta.tone]
                        )}
                      >
                        {catMeta.shortLabel}
                      </span>
                      <span
                        className={cn(
                          'rounded-full border px-2 py-0.5 text-[11px] font-semibold',
                          TONE_CLASSES[statusMeta.tone]
                        )}
                      >
                        {statusMeta.shortLabel}
                      </span>
                      <span
                        className={cn(
                          'rounded-full border px-2 py-0.5 text-[11px] font-medium',
                          TONE_CLASSES[validityMeta.tone]
                        )}
                      >
                        Validade: {validityMeta.shortLabel}
                      </span>
                      <span
                        className={cn(
                          'rounded-full border px-2 py-0.5 text-[11px] font-medium',
                          TONE_CLASSES[prioMeta.tone]
                        )}
                      >
                        Prioridade {prioMeta.shortLabel}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/40 px-2 py-0.5 text-[11px] font-mono text-muted-foreground">
                        <ThumbsUp className="h-3 w-3" /> {item.voteCount}
                      </span>
                    </div>

                    <h3 className="text-sm font-semibold text-foreground">{item.title}</h3>
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {item.description}
                    </p>
                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
                      <span>Enviado por: {item.authorDisplayName}</span>
                      <span>Em {new Date(item.createdAt).toLocaleDateString('pt-BR')}</span>
                      {item.pageOrLocation && <span>Local: {item.pageOrLocation}</span>}
                      {item.assignedArea && <span>Área: {item.assignedArea}</span>}
                      {item.assignedToName && <span>Resp.: {item.assignedToName}</span>}
                      {item.attachmentUrl && (
                        <span className="inline-flex items-center gap-1 text-primary">
                          <Paperclip className="h-3 w-3" /> Anexo
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Ações Rápidas na Recepção */}
                  <div
                    className="flex flex-wrap items-center gap-1.5 shrink-0"
                    onClick={e => e.stopPropagation()}
                  >
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
                        className="inline-flex min-h-8 items-center gap-1 rounded-lg border border-sky-500/30 bg-sky-500/10 px-2.5 text-xs font-semibold text-sky-700 hover:bg-sky-500/20 dark:text-sky-300 cursor-pointer"
                      >
                        <Check className="h-3.5 w-3.5" />
                        Marcar Válida
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
                        className="inline-flex min-h-8 items-center gap-1 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-500/20 dark:text-emerald-300 cursor-pointer"
                      >
                        <Rocket className="h-3.5 w-3.5" />
                        Aplicou
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

                    <button
                      type="button"
                      onClick={() => openTriageModal(item)}
                      className="inline-flex min-h-8 items-center rounded-lg bg-foreground px-3 text-xs font-medium text-background hover:bg-foreground/90 cursor-pointer"
                    >
                      Avaliar / Responder
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal de Triagem & Devolutiva */}
      <Dialog open={Boolean(selectedItem)} onOpenChange={open => !open && setSelectedItem(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[92vh] overflow-y-auto border-border bg-card text-foreground">
          {selectedItem && (
            <>
              <DialogHeader>
                <DialogTitle className="font-display flex flex-wrap items-center gap-2">
                  <span className="font-mono text-sm text-primary">{selectedItem.code}</span>
                  <span>{selectedItem.title}</span>
                </DialogTitle>
                <DialogDescription>
                  {FEEDBACK_SCOPE_META[selectedItem.scope].label} ·{' '}
                  {FEEDBACK_CATEGORY_META[selectedItem.category].label} · Enviado por{' '}
                  {selectedItem.authorDisplayName} ({selectedItem.voteCount} apoios)
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="rounded-xl border border-border bg-muted/30 p-3.5 text-sm space-y-2">
                  <p className="text-foreground whitespace-pre-line">{selectedItem.description}</p>
                  {selectedItem.pageOrLocation && (
                    <p className="text-xs text-muted-foreground">
                      <strong className="text-foreground">Local / Tela:</strong>{' '}
                      {selectedItem.pageOrLocation}
                    </p>
                  )}
                  {selectedItem.stepsToReproduce && (
                    <div className="text-xs text-muted-foreground">
                      <strong className="text-foreground">Como reproduzir:</strong>
                      <p className="mt-0.5 whitespace-pre-line">{selectedItem.stepsToReproduce}</p>
                    </div>
                  )}
                  {selectedItem.expectedOutcome && (
                    <p className="text-xs text-muted-foreground">
                      <strong className="text-foreground">Resultado esperado:</strong>{' '}
                      {selectedItem.expectedOutcome}
                    </p>
                  )}
                  {selectedItem.attachmentUrl && (
                    <a
                      href={selectedItem.attachmentUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
                    >
                      <Paperclip className="h-3.5 w-3.5" />
                      {selectedItem.attachmentName || 'Abrir print / anexo'}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>

                <form onSubmit={handleSaveTriage} className="space-y-3.5">
                  <div className="grid gap-3 sm:grid-cols-3">
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
                        Área / Equipe responsável por aplicar
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

                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">
                      Devolutiva oficial para a equipe / motivo da decisão
                    </label>
                    <textarea
                      rows={3}
                      value={responseNotes}
                      onChange={e => setResponseNotes(e.target.value)}
                      placeholder="Ex: Ideia válida! Aplicamos a mudança no sistema hoje / Não procede porque já funciona assim na aba X..."
                      className="w-full rounded-lg border border-input bg-background p-3 text-sm text-foreground"
                    />
                  </div>

                  <DialogFooter className="flex-wrap justify-between gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => void handleDelete(selectedItem)}
                      className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-destructive/30 px-3 text-xs font-semibold text-destructive hover:bg-destructive/10 cursor-pointer"
                    >
                      <Trash2 className="h-4 w-4" />
                      Excluir registro
                    </button>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedItem(null)}
                        className="min-h-10 rounded-lg border border-border px-4 text-xs font-medium text-muted-foreground hover:bg-accent cursor-pointer"
                      >
                        Fechar
                      </button>
                      <button
                        type="submit"
                        disabled={saving}
                        className="inline-flex min-h-10 items-center gap-1.5 rounded-lg bg-primary px-4 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60 cursor-pointer"
                      >
                        <Check className="h-4 w-4" />
                        {saving ? 'Salvando…' : 'Salvar triagem'}
                      </button>
                    </div>
                  </DialogFooter>
                </form>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
