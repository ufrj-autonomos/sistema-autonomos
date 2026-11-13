'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import {
  Bug,
  CheckCircle2,
  Clock3,
  ExternalLink,
  EyeOff,
  Globe,
  Laptop,
  Lightbulb,
  Paperclip,
  Plus,
  Rocket,
  Search,
  ShieldCheck,
  Sparkles,
  ThumbsUp,
  Trash2,
  Upload,
  Users,
  Wrench,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  FEEDBACK_CATEGORY_META,
  FEEDBACK_SCOPE_META,
  FEEDBACK_STATUS_META,
  FEEDBACK_VALIDITY_META,
  type FeedbackCategoryValue,
  type FeedbackDashboardData,
  type FeedbackItemDTO,
  type FeedbackScopeValue,
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

export function MemberFeedbackClient({
  initialData,
  canManage,
}: {
  initialData: FeedbackDashboardData;
  canManage: boolean;
}) {
  const [data, setData] = useState<FeedbackDashboardData>(initialData);
  const [tab, setTab] = useState<'board' | 'mine' | 'applied'>('board');
  const [scopeFilter, setScopeFilter] = useState<'ALL' | FeedbackScopeValue>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | FeedbackCategoryValue>('ALL');
  const [search, setSearch] = useState('');

  // Form state
  const [formOpen, setFormOpen] = useState(true);
  const [scope, setScope] = useState<FeedbackScopeValue>('SISTEMA');
  const [category, setCategory] = useState<FeedbackCategoryValue>('IDEIA');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [pageOrLocation, setPageOrLocation] = useState('');
  const [stepsToReproduce, setStepsToReproduce] = useState('');
  const [expectedOutcome, setExpectedOutcome] = useState('');
  const [attachmentUrl, setAttachmentUrl] = useState('');
  const [attachmentName, setAttachmentName] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [votingId, setVotingId] = useState<string | null>(null);

  async function refreshBoard() {
    const res = await fetch('/api/melhorias?scope=member', { cache: 'no-store' });
    if (!res.ok) return;
    const json = (await res.json()) as FeedbackDashboardData;
    setData(json);
  }

  async function handleFileUpload(file: File) {
    setUploadingFile(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/financeiro/upload', { method: 'POST', body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Erro ao enviar anexo.');
      setAttachmentUrl(json.url);
      setAttachmentName(json.name || file.name);
      toast.success('Print / anexo enviado!');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Falha ao enviar arquivo.');
    } finally {
      setUploadingFile(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (title.trim().length < 3) {
      toast.error('Escreva um título curto e descritivo.');
      return;
    }
    if (description.trim().length < 8) {
      toast.error('Detalhe melhor o problema, ideia ou melhoria.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/melhorias', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scope,
          category,
          title: title.trim(),
          description: description.trim(),
          pageOrLocation: pageOrLocation.trim() || null,
          stepsToReproduce: stepsToReproduce.trim() || null,
          expectedOutcome: expectedOutcome.trim() || null,
          attachmentUrl: attachmentUrl.trim() || null,
          attachmentName: attachmentName.trim() || null,
          isAnonymous,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Erro ao enviar registro.');

      toast.success(`${json.item.code} enviado para a gestão!`);
      setTitle('');
      setDescription('');
      setPageOrLocation('');
      setStepsToReproduce('');
      setExpectedOutcome('');
      setAttachmentUrl('');
      setAttachmentName('');
      setIsAnonymous(false);
      await refreshBoard();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao enviar.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleVote(item: FeedbackItemDTO) {
    setVotingId(item.id);
    try {
      const res = await fetch(`/api/melhorias/${item.id}/vote`, { method: 'POST' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Erro ao apoiar.');
      setData(prev => ({
        ...prev,
        items: prev.items.map(i =>
          i.id === item.id
            ? { ...i, viewerHasVoted: json.voted, voteCount: json.voteCount }
            : i
        ),
      }));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao registrar apoio.');
    } finally {
      setVotingId(null);
    }
  }

  async function handleWithdraw(item: FeedbackItemDTO) {
    if (!window.confirm(`Remover "${item.code} — ${item.title}"?`)) return;
    try {
      const res = await fetch(`/api/melhorias/${item.id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Não foi possível excluir.');
      toast.success(`${item.code} removido.`);
      await refreshBoard();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao remover.');
    }
  }

  const myItems = useMemo(() => data.items.filter(i => i.isMine), [data.items]);
  const appliedItems = useMemo(
    () => data.items.filter(i => i.status === 'APLICADA'),
    [data.items]
  );

  const filteredItems = useMemo(() => {
    const q = search.trim().toLocaleLowerCase('pt-BR');
    const source =
      tab === 'mine' ? myItems : tab === 'applied' ? appliedItems : data.items;

    return source.filter(item => {
      if (scopeFilter !== 'ALL' && item.scope !== scopeFilter) return false;
      if (categoryFilter !== 'ALL' && item.category !== categoryFilter) return false;
      if (q) {
        const hay = `${item.code} ${item.title} ${item.description} ${item.pageOrLocation || ''} ${item.responseNotes || ''}`.toLocaleLowerCase('pt-BR');
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [data.items, myItems, appliedItems, tab, scopeFilter, categoryFilter, search]);

  const showReproFields = category === 'BUG' || category === 'PROBLEMA_LAB';

  return (
    <div className="mx-auto w-full max-w-[1400px] px-3 sm:px-6 py-6 sm:py-8 space-y-6">
      {/* Header */}
      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-5">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-0.5 text-xs font-medium text-primary">
            <Lightbulb className="h-3.5 w-3.5" />
            Ouvidoria Técnica &amp; Melhoria Contínua
          </span>
          <h1 className="mt-2 font-display text-3xl font-bold text-foreground">
            Bugs, Melhorias &amp; Ideias
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Reporte problemas, proponha melhorias ou envie novas ideias para o{' '}
            <strong className="text-foreground">Sistema Interno</strong>,{' '}
            <strong className="text-foreground">Site Institucional</strong>,{' '}
            <strong className="text-foreground">Laboratório</strong> ou{' '}
            <strong className="text-foreground">Equipe</strong> e acompanhe a avaliação da gestão.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {canManage && (
            <Link
              href="/gestao/melhorias"
              className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-primary/30 bg-primary/10 px-3.5 text-xs font-semibold text-primary hover:bg-primary/15"
            >
              <ShieldCheck className="h-4 w-4" />
              Abrir Recepção &amp; Triagem (Gestão)
            </Link>
          )}
          <button
            type="button"
            onClick={() => setFormOpen(v => !v)}
            className="inline-flex min-h-10 items-center gap-1.5 rounded-lg bg-primary px-4 text-xs font-semibold text-primary-foreground hover:bg-primary/90 cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            {formOpen ? 'Recolher formulário' : 'Nova Ideia / Bug'}
          </button>
        </div>
      </header>

      {/* KPIs */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Total no Mural
          </p>
          <p className="mt-1.5 font-mono text-2xl font-bold text-foreground tabular-nums">
            {data.summary.totalCount}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {myItems.length} enviadas por você
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Aguardando Triagem
          </p>
          <p className="mt-1.5 font-mono text-2xl font-bold text-amber-600 dark:text-amber-400 tabular-nums">
            {data.summary.pendingTriageCount}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {data.summary.openBugsCount} bugs em aberto
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Validadas / Em Execução
          </p>
          <p className="mt-1.5 font-mono text-2xl font-bold text-sky-600 dark:text-sky-400 tabular-nums">
            {data.summary.validAcceptedCount}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Ideias e melhorias aceitas pela equipe
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Já Aplicadas
          </p>
          <p className="mt-1.5 font-mono text-2xl font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
            {data.summary.appliedCount}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Implementadas no sistema, site, lab ou equipe
          </p>
        </div>
      </div>

      {/* Formulário de Nova Submissão */}
      {formOpen && (
        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-border bg-card p-5 shadow-xs space-y-5"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-display text-lg font-semibold text-foreground flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              Enviar Bug, Melhoria ou Nova Ideia
            </h2>
            <span className="text-xs text-muted-foreground">
              Qualquer membro pode enviar e acompanhar o retorno.
            </span>
          </div>

          {/* Escolha do Alvo */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              1. Para onde é esse reporte ou ideia?
            </label>
            <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
              {(['SISTEMA', 'SITE', 'LABORATORIO', 'EQUIPE'] as FeedbackScopeValue[]).map(sc => {
                const meta = FEEDBACK_SCOPE_META[sc];
                const Icon = SCOPE_ICONS[sc];
                const active = scope === sc;
                return (
                  <button
                    key={sc}
                    type="button"
                    onClick={() => setScope(sc)}
                    className={cn(
                      'rounded-xl border p-3 text-left transition-all cursor-pointer',
                      active
                        ? 'border-primary bg-primary/10 shadow-xs'
                        : 'border-border bg-background/60 hover:bg-accent/50'
                    )}
                  >
                    <div className="flex items-center gap-2 font-semibold text-xs text-foreground">
                      <Icon className={cn('h-4 w-4', active ? 'text-primary' : 'text-muted-foreground')} />
                      <span>{meta.label}</span>
                    </div>
                    <p className="mt-1 text-[11px] text-muted-foreground leading-snug">
                      {meta.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tipo */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              2. Tipo de registro
            </label>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(FEEDBACK_CATEGORY_META) as FeedbackCategoryValue[]).map(cat => {
                const meta = FEEDBACK_CATEGORY_META[cat];
                const active = category === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategory(cat)}
                    className={cn(
                      'min-h-9 rounded-lg border px-3 text-xs font-semibold transition-colors cursor-pointer inline-flex items-center gap-1.5',
                      active
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-border bg-background text-muted-foreground hover:text-foreground'
                    )}
                  >
                    {cat === 'BUG' && <Bug className="h-3.5 w-3.5" />}
                    {cat === 'IDEIA' && <Lightbulb className="h-3.5 w-3.5" />}
                    {cat === 'MELHORIA' && <Rocket className="h-3.5 w-3.5" />}
                    {meta.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Campos principais */}
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                Título resumido *
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Ex: Botão de presença não carrega no celular / Instalar suporte de solda"
                className="min-h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                Tela / página / local (opcional)
              </label>
              <input
                type="text"
                value={pageOrLocation}
                onChange={e => setPageOrLocation(e.target.value)}
                placeholder={FEEDBACK_SCOPE_META[scope].locationPlaceholder}
                className="min-h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              Descrição detalhada *
            </label>
            <textarea
              required
              rows={3}
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Explique o que está acontecendo, qual é a sua proposta ou por que essa ideia ajudaria a equipe..."
              className="w-full rounded-lg border border-input bg-background p-3 text-sm text-foreground"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {showReproFields && (
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  Como reproduzir o problema (opcional)
                </label>
                <textarea
                  rows={2}
                  value={stepsToReproduce}
                  onChange={e => setStepsToReproduce(e.target.value)}
                  placeholder="1. Entre na tela X&#10;2. Clique em Y..."
                  className="w-full rounded-lg border border-input bg-background p-2.5 text-sm text-foreground"
                />
              </div>
            )}
            <div className={showReproFields ? '' : 'sm:col-span-2'}>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                Como deveria ficar / benefício esperado (opcional)
              </label>
              <textarea
                rows={2}
                value={expectedOutcome}
                onChange={e => setExpectedOutcome(e.target.value)}
                placeholder="O que muda positivamente se implementarmos isso?"
                className="w-full rounded-lg border border-input bg-background p-2.5 text-sm text-foreground"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
            <div className="flex flex-wrap items-center gap-3">
              <label className="inline-flex min-h-9 cursor-pointer items-center gap-1.5 rounded-lg border border-dashed border-border bg-muted/30 px-3 text-xs font-medium text-foreground hover:bg-muted/60">
                <Upload className="h-3.5 w-3.5 text-primary" />
                {uploadingFile
                  ? 'Enviando print/foto…'
                  : attachmentName
                    ? `Anexado: ${attachmentName}`
                    : 'Anexar print ou foto (opcional)'}
                <input
                  type="file"
                  accept="image/*,.pdf"
                  className="sr-only"
                  disabled={uploadingFile}
                  onChange={e => {
                    const f = e.target.files?.[0];
                    if (f) void handleFileUpload(f);
                    e.target.value = '';
                  }}
                />
              </label>
              {attachmentUrl && (
                <button
                  type="button"
                  onClick={() => {
                    setAttachmentUrl('');
                    setAttachmentName('');
                  }}
                  className="text-xs text-destructive hover:underline cursor-pointer"
                >
                  Remover anexo
                </button>
              )}

              <label className="inline-flex items-center gap-2 text-xs text-muted-foreground cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isAnonymous}
                  onChange={e => setIsAnonymous(e.target.checked)}
                  className="h-4 w-4 rounded border-input accent-primary"
                />
                <EyeOff className="h-3.5 w-3.5" />
                Enviar de forma anônima
              </label>
            </div>

            <button
              type="submit"
              disabled={submitting || uploadingFile}
              className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-primary px-5 text-xs font-semibold text-primary-foreground shadow-xs hover:bg-primary/90 disabled:opacity-60 cursor-pointer"
            >
              <CheckCircle2 className="h-4 w-4" />
              {submitting ? 'Enviando…' : 'Enviar para avaliação'}
            </button>
          </div>
        </form>
      )}

      {/* Mural & Acompanhamento */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-xs">
        <div className="border-b border-border bg-muted/35 px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: 'board' as const, label: `Mural Completo (${data.items.length})` },
              { id: 'mine' as const, label: `Minhas Submissões (${myItems.length})` },
              { id: 'applied' as const, label: `Já Aplicadas (${appliedItems.length})` },
            ].map(t => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={cn(
                  'min-h-9 rounded-lg px-3 text-xs font-medium transition-colors cursor-pointer',
                  tab === t.id
                    ? 'bg-primary text-primary-foreground shadow-xs'
                    : 'bg-background text-muted-foreground hover:text-foreground border border-border'
                )}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[200px]">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="search"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Buscar código, título…"
                className="min-h-9 w-full rounded-lg border border-input bg-background pl-9 pr-3 text-xs text-foreground"
              />
            </div>

            <select
              value={scopeFilter}
              onChange={e => setScopeFilter(e.target.value as typeof scopeFilter)}
              className="min-h-9 rounded-lg border border-input bg-background px-2.5 text-xs text-foreground"
            >
              <option value="ALL">Todos os alvos</option>
              {(['SISTEMA', 'SITE', 'LABORATORIO', 'EQUIPE'] as FeedbackScopeValue[]).map(sc => (
                <option key={sc} value={sc}>
                  {FEEDBACK_SCOPE_META[sc].shortLabel}
                </option>
              ))}
            </select>

            <select
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value as typeof categoryFilter)}
              className="min-h-9 rounded-lg border border-input bg-background px-2.5 text-xs text-foreground"
            >
              <option value="ALL">Todos os tipos</option>
              {(Object.keys(FEEDBACK_CATEGORY_META) as FeedbackCategoryValue[]).map(cat => (
                <option key={cat} value={cat}>
                  {FEEDBACK_CATEGORY_META[cat].shortLabel}
                </option>
              ))}
            </select>
          </div>
        </div>

        {filteredItems.length === 0 ? (
          <div className="px-6 py-12 text-center space-y-2">
            <Lightbulb className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="text-sm font-medium text-foreground">
              Nenhum registro encontrado nessa aba.
            </p>
            <p className="text-xs text-muted-foreground">
              Use o formulário acima para reportar bugs ou sugerir ideias para a equipe.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filteredItems.map(item => {
              const scopeMeta = FEEDBACK_SCOPE_META[item.scope];
              const catMeta = FEEDBACK_CATEGORY_META[item.category];
              const statusMeta = FEEDBACK_STATUS_META[item.status];
              const validityMeta = FEEDBACK_VALIDITY_META[item.validity];

              return (
                <div key={item.id} className="p-4 sm:p-5 flex flex-col sm:flex-row gap-4 justify-between">
                  <div className="flex gap-3.5 min-w-0 flex-1">
                    {/* Upvote column */}
                    <button
                      type="button"
                      disabled={votingId === item.id}
                      onClick={() => void handleVote(item)}
                      className={cn(
                        'flex flex-col items-center justify-center rounded-xl border px-2.5 py-2 min-w-[54px] h-fit shrink-0 transition-colors cursor-pointer',
                        item.viewerHasVoted
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border bg-muted/30 text-muted-foreground hover:text-foreground'
                      )}
                      title="Apoiar / concordar com esta ideia ou bug"
                    >
                      <ThumbsUp className="h-4 w-4" />
                      <span className="mt-1 font-mono text-xs font-bold tabular-nums">
                        {item.voteCount}
                      </span>
                    </button>

                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="font-mono text-xs font-semibold text-primary">
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
                        {item.validity !== 'PENDENTE' && (
                          <span
                            className={cn(
                              'rounded-full border px-2 py-0.5 text-[11px] font-medium',
                              TONE_CLASSES[validityMeta.tone]
                            )}
                          >
                            {validityMeta.shortLabel}
                          </span>
                        )}
                      </div>

                      <h3 className="text-base font-semibold text-foreground">{item.title}</h3>
                      <p className="text-sm text-muted-foreground whitespace-pre-line">
                        {item.description}
                      </p>

                      {(item.pageOrLocation || item.expectedOutcome || item.attachmentUrl) && (
                        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                          {item.pageOrLocation && (
                            <span>
                              <strong className="text-foreground">Local/Tela:</strong>{' '}
                              {item.pageOrLocation}
                            </span>
                          )}
                          {item.expectedOutcome && (
                            <span>
                              <strong className="text-foreground">Esperado:</strong>{' '}
                              {item.expectedOutcome}
                            </span>
                          )}
                          {item.attachmentUrl && (
                            <a
                              href={item.attachmentUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-primary hover:underline"
                            >
                              <Paperclip className="h-3.5 w-3.5" />
                              {item.attachmentName || 'Ver anexo'}
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          )}
                        </div>
                      )}

                      {item.responseNotes && (
                        <div className="rounded-xl border border-primary/25 bg-primary/5 p-3 text-xs space-y-1">
                          <div className="flex flex-wrap items-center justify-between gap-2 font-semibold text-primary">
                            <span>Retorno da Gestão {item.reviewedByName ? `(${item.reviewedByName})` : ''}</span>
                            {item.appliedAt && (
                              <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                Aplicada em {new Date(item.appliedAt).toLocaleDateString('pt-BR')}
                              </span>
                            )}
                          </div>
                          <p className="text-foreground whitespace-pre-line">{item.responseNotes}</p>
                        </div>
                      )}

                      <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
                        <span>Por: {item.authorDisplayName}</span>
                        <span className="inline-flex items-center gap-1">
                          <Clock3 className="h-3 w-3" />
                          {new Date(item.createdAt).toLocaleDateString('pt-BR')}
                        </span>
                        {item.assignedArea && <span>Responsável: {item.assignedArea}</span>}
                      </div>
                    </div>
                  </div>

                  {item.isMine && item.status === 'RECEBIDA' && (
                    <div className="shrink-0">
                      <button
                        type="button"
                        onClick={() => void handleWithdraw(item)}
                        className="inline-flex min-h-8 items-center gap-1 rounded-lg border border-border px-2.5 text-xs text-destructive hover:bg-destructive/10 cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Retirar
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
