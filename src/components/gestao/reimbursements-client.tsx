'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  CreditCard,
  DollarSign,
  FileWarning,
  Filter,
  Landmark,
  Paperclip,
  Plus,
  Receipt,
  Search,
  Wallet,
  X,
  XCircle,
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
  FINANCE_CATEGORIES,
  FINANCE_FUNDS,
  FINANCE_TEAMS,
  FINANCIAL_STATUS_META,
  PIX_KEY_TYPES,
  formatBRL,
  formatFinanceDate,
  type FinancialDashboardData,
  type FinancialEntryDTO,
  type FinancialEntryStatusValue,
} from '@/lib/finance/constants';
import {
  AttachmentGallery,
  ReceiptUploader,
  type UploadedAttachmentDraft,
} from '@/components/finance/attachment-gallery';
import { cn } from '@/lib/utils';

const TEAM_STYLE: Record<string, string> = {
  Harpia: 'bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/30',
  Nautilus: 'bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/30',
  Geral: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
};

export function ReimbursementsClient({
  currentUserName,
  initialData,
}: {
  currentUserName: string;
  initialData: FinancialDashboardData;
}) {
  const [data, setData] = useState<FinancialDashboardData>(initialData);
  const [teamFilter, setTeamFilter] = useState<'all' | string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'OPEN' | FinancialEntryStatusValue>('all');
  const [categoryFilter, setCategoryFilter] = useState<'all' | string>('all');
  const [search, setSearch] = useState('');
  const [selectedItem, setSelectedItem] = useState<FinancialEntryDTO | null>(null);
  const [creatingOpen, setCreatingOpen] = useState(false);

  // Detail modal interactive states
  const [detailAmount, setDetailAmount] = useState('');
  const [detailReviewNotes, setDetailReviewNotes] = useState('');
  const [detailProofDrafts, setDetailProofDrafts] = useState<UploadedAttachmentDraft[]>([]);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Form states for new reimbursement modal
  const [formTitle, setFormTitle] = useState('');
  const [formRequesterId, setFormRequesterId] = useState('');
  const [formTeam, setFormTeam] = useState<string>('Geral');
  const [formCategory, setFormCategory] = useState<string>('Eletrônica');
  const [formFundSource, setFormFundSource] = useState<string>('Dinheiro Livre');
  const [formAmount, setFormAmount] = useState('');
  const [formPurchaseDate, setFormPurchaseDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [formPixKeyType, setFormPixKeyType] = useState<string>('CPF');
  const [formPixKey, setFormPixKey] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [formDrafts, setFormDrafts] = useState<UploadedAttachmentDraft[]>([]);
  const [creatingLoading, setCreatingLoading] = useState(false);

  const items = useMemo(
    () => data.entries.filter(e => e.type === 'SAIDA' && e.isReimbursement),
    [data.entries]
  );

  async function refreshData(reopenId?: string) {
    const res = await fetch('/api/financeiro?scope=management', { cache: 'no-store' });
    if (!res.ok) return;
    const json = (await res.json()) as FinancialDashboardData;
    setData({ entries: json.entries, summary: json.summary, members: json.members });
    if (reopenId) {
      const updated = json.entries.find(e => e.id === reopenId) || null;
      setSelectedItem(updated);
      if (updated) {
        setDetailAmount((updated.amountCents / 100).toFixed(2).replace('.', ','));
        setDetailReviewNotes(updated.reviewNotes || '');
      }
    }
  }

  function openDetail(item: FinancialEntryDTO) {
    setSelectedItem(item);
    setDetailAmount((item.amountCents / 100).toFixed(2).replace('.', ','));
    setDetailReviewNotes(item.reviewNotes || '');
    setDetailProofDrafts([]);
  }

  const metrics = useMemo(() => {
    const awaiting = items.filter(
      i => i.status === 'AGUARDANDO_REEMBOLSO' || i.status === 'PENDENTE' || i.status === 'AGUARDANDO_NF'
    );
    const approved = items.filter(i => i.status === 'APROVADO');
    const paid = items.filter(i => i.status === 'PAGO');
    return {
      awaitingCents: awaiting.reduce((acc, i) => acc + i.amountCents, 0),
      awaitingCount: awaiting.length,
      approvedCents: approved.reduce((acc, i) => acc + i.amountCents, 0),
      approvedCount: approved.length,
      paidCents: paid.reduce((acc, i) => acc + i.amountCents, 0),
      paidCount: paid.length,
      freeCashBalanceCents: data.summary.freeCashBalanceCents,
    };
  }, [items, data.summary.freeCashBalanceCents]);

  const filtered = useMemo(() => {
    const q = search.trim().toLocaleLowerCase('pt-BR');
    return items.filter(item => {
      if (teamFilter !== 'all' && item.team !== teamFilter) return false;
      if (statusFilter === 'OPEN') {
        if (
          item.status !== 'AGUARDANDO_REEMBOLSO' &&
          item.status !== 'PENDENTE' &&
          item.status !== 'AGUARDANDO_NF' &&
          item.status !== 'APROVADO'
        ) {
          return false;
        }
      } else if (statusFilter !== 'all' && item.status !== statusFilter) {
        return false;
      }
      if (categoryFilter !== 'all' && item.category !== categoryFilter) return false;
      if (q) {
        const hay = `${item.code} ${item.title} ${item.requesterName} ${item.category} ${item.pixKey || ''} ${item.description || ''}`.toLocaleLowerCase('pt-BR');
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [items, teamFilter, statusFilter, categoryFilter, search]);

  async function updateEntryStatus(
    id: string,
    code: string,
    nextStatus: FinancialEntryStatusValue,
    extra?: { amountCents?: number; reviewNotes?: string; addAttachments?: UploadedAttachmentDraft[] }
  ) {
    setUpdatingId(id);
    try {
      const res = await fetch(`/api/financeiro/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: nextStatus,
          ...(extra?.amountCents !== undefined ? { amountCents: extra.amountCents } : {}),
          ...(extra?.reviewNotes !== undefined ? { reviewNotes: extra.reviewNotes } : {}),
          ...(extra?.addAttachments?.length ? { addAttachments: extra.addAttachments } : {}),
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error || 'Não foi possível atualizar a solicitação.');
        return;
      }
      setDetailProofDrafts([]);
      await refreshData(selectedItem?.id === id ? id : undefined);
      toast.success(`Solicitação ${code} atualizada para "${FINANCIAL_STATUS_META[nextStatus].label}".`);
    } catch {
      toast.error('Erro de conexão ao atualizar solicitação.');
    } finally {
      setUpdatingId(null);
    }
  }

  async function handleSaveDetailsOnly() {
    if (!selectedItem) return;
    const numeric = Number(detailAmount.replace(/\./g, '').replace(',', '.'));
    if (!Number.isFinite(numeric) || numeric < 0) {
      toast.error('Valor inválido.');
      return;
    }
    setUpdatingId(selectedItem.id);
    try {
      const res = await fetch(`/api/financeiro/${selectedItem.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amountCents: Math.round(numeric * 100),
          reviewNotes: detailReviewNotes,
          addAttachments: detailProofDrafts,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error || 'Erro ao salvar.');
        return;
      }
      setDetailProofDrafts([]);
      await refreshData(selectedItem.id);
      toast.success(`Detalhes de ${selectedItem.code} salvos!`);
    } catch {
      toast.error('Erro de conexão.');
    } finally {
      setUpdatingId(null);
    }
  }

  async function handleCreateSubmit(e: React.FormEvent) {
    e.preventDefault();
    const numeric = Number(formAmount.replace(/\./g, '').replace(',', '.'));
    if (!formTitle.trim() || !Number.isFinite(numeric) || numeric < 0) {
      toast.error('Preencha descrição e valor válido.');
      return;
    }

    setCreatingLoading(true);
    try {
      const selectedMember = data.members.find(m => m.id === formRequesterId);
      const res = await fetch('/api/financeiro', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'SAIDA',
          isReimbursement: true,
          title: formTitle.trim(),
          requesterId: formRequesterId || null,
          requesterName: selectedMember?.name || currentUserName,
          team: formTeam,
          category: formCategory,
          fundSource: formFundSource,
          amountCents: Math.round(numeric * 100),
          occurredAt: formPurchaseDate || null,
          status: 'AGUARDANDO_REEMBOLSO',
          pixKey: formPixKey.trim() || null,
          pixKeyType: formPixKey.trim() ? formPixKeyType : null,
          description: formNotes.trim() || null,
          attachments: formDrafts,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error || 'Erro ao criar reembolso.');
        return;
      }

      toast.success(`Solicitação ${json.entry.code} registrada no banco!`);
      setCreatingOpen(false);
      setFormTitle('');
      setFormAmount('');
      setFormPixKey('');
      setFormNotes('');
      setFormDrafts([]);
      await refreshData();
    } catch {
      toast.error('Erro de conexão ao registrar solicitação.');
    } finally {
      setCreatingLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-5">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-300">
              <Wallet className="h-3.5 w-3.5" />
              Módulo Financeiro · Dados em Tempo Real
            </span>
            <Link
              href="/gestao/financeiro/caixa"
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-0.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              <Landmark className="h-3 w-3" /> Abrir Livro Caixa (Saldo: {formatBRL(metrics.freeCashBalanceCents)})
            </Link>
          </div>
          <h1 className="font-display text-3xl font-semibold text-foreground">
            Gestão de Reembolsos
          </h1>
          <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground leading-relaxed">
            Confira solicitações de reembolso da equipe, notas fiscais importadas do Drive e novos pedidos dos membros, copie chaves PIX e registre comprovantes de pagamento.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setCreatingOpen(true)}
          className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          Nova solicitação de reembolso
        </button>
      </header>

      {/* KPIs Financeiros */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">Aguardando Reembolso</span>
            <Clock className="h-4 w-4 text-amber-500" />
          </div>
          <p className="mt-3 font-display text-2xl font-bold tabular-nums text-amber-600 dark:text-amber-400">
            {formatBRL(metrics.awaitingCents)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {metrics.awaitingCount} {metrics.awaitingCount === 1 ? 'solicitação em aberto' : 'solicitações em aberto'}
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">Aprovado para Pagamento</span>
            <CreditCard className="h-4 w-4 text-blue-500" />
          </div>
          <p className="mt-3 font-display text-2xl font-bold tabular-nums text-blue-600 dark:text-blue-400">
            {formatBRL(metrics.approvedCents)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {metrics.approvedCount} PIX aguardando envio
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Reembolsado</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </div>
          <p className="mt-3 font-display text-2xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
            {formatBRL(metrics.paidCents)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {metrics.paidCount} pagamentos concluídos
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">Saldo Dinheiro Livre</span>
            <DollarSign className="h-4 w-4 text-primary" />
          </div>
          <p className="mt-3 font-display text-2xl font-bold tabular-nums text-foreground">
            {formatBRL(metrics.freeCashBalanceCents)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Disponível em caixa antes dos pendentes
          </p>
        </div>
      </div>

      {/* Filtros por Divisão, Status, Categoria e Busca */}
      <div className="rounded-xl border border-border bg-card overflow-hidden shadow-xs">
        <div className="border-b border-border bg-muted/35 px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { value: 'all', label: 'Todas as Divisões' },
              { value: 'Harpia', label: '☁️ Harpia' },
              { value: 'Nautilus', label: '🌊 Nautilus' },
              { value: 'Geral', label: '🤖 Autônomos (Geral)' },
            ].map(tab => (
              <button
                key={tab.value}
                type="button"
                onClick={() => setTeamFilter(tab.value)}
                className={cn(
                  'rounded-lg px-3 py-1.5 text-xs font-medium border transition-colors cursor-pointer',
                  teamFilter === tab.value
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-background/70 text-muted-foreground border-border hover:text-foreground'
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            {(
              [
                { value: 'all', label: 'Todos' },
                { value: 'OPEN', label: 'Em aberto' },
                { value: 'AGUARDANDO_REEMBOLSO', label: 'Aguardando Reembolso' },
                { value: 'APROVADO', label: 'Aprovado' },
                { value: 'PAGO', label: 'Pago' },
                { value: 'AGUARDANDO_NF', label: 'Aguardando NF' },
                { value: 'RECUSADO', label: 'Recusado' },
              ] as const
            ).map(st => (
              <button
                key={st.value}
                type="button"
                onClick={() => setStatusFilter(st.value)}
                className={cn(
                  'rounded-md px-2.5 py-1 transition-colors cursor-pointer',
                  statusFilter === st.value
                    ? 'bg-accent font-semibold text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {st.label}
              </button>
            ))}
          </div>
        </div>

        <div className="border-b border-border bg-muted/15 p-4 grid gap-3 sm:grid-cols-[minmax(14rem,1fr)_14rem]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <input
              type="search"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por código, descrição, solicitante ou chave PIX…"
              className="min-h-10 w-full rounded-lg border border-input bg-background pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground"
            />
          </div>
          <select
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
            aria-label="Filtrar por categoria"
            className="min-h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground"
          >
            <option value="all">Todas as categorias</option>
            {FINANCE_CATEGORIES.map(cat => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        {/* Tabela de Reembolsos */}
        {filtered.length === 0 ? (
          <div className="py-16 px-4 text-center">
            <Filter className="mx-auto h-8 w-8 text-muted-foreground mb-3" />
            <p className="text-sm font-medium text-foreground">Nenhuma solicitação encontrada</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Ajuste os filtros acima ou registre uma nova solicitação de reembolso.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border bg-muted/40 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Código / Despesa</th>
                  <th className="px-4 py-3 font-medium">Solicitante</th>
                  <th className="px-4 py-3 font-medium">Divisão</th>
                  <th className="px-4 py-3 font-medium">Categoria</th>
                  <th className="px-4 py-3 font-medium">Comprov.</th>
                  <th className="px-4 py-3 font-medium text-right">Valor</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map(item => {
                  const statusMeta = FINANCIAL_STATUS_META[item.status];
                  const isOpen =
                    item.status === 'AGUARDANDO_REEMBOLSO' ||
                    item.status === 'PENDENTE' ||
                    item.status === 'AGUARDANDO_NF';

                  return (
                    <tr key={item.id} className="hover:bg-muted/25 transition-colors">
                      <td className="px-4 py-3.5 max-w-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[11px] font-semibold text-muted-foreground">
                            {item.code}
                          </span>
                          <span className="text-[11px] text-muted-foreground">
                            · {formatFinanceDate(item.occurredAt)}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => openDetail(item)}
                          className="mt-0.5 block text-left font-medium text-foreground hover:underline cursor-pointer line-clamp-1"
                        >
                          {item.title}
                        </button>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          {item.requesterAvatar ? (
                            <img
                              src={item.requesterAvatar}
                              alt={item.requesterName}
                              className="h-6 w-6 rounded-full object-cover border border-border shrink-0"
                            />
                          ) : (
                            <div className="h-6 w-6 rounded-full bg-muted border border-border flex items-center justify-center text-[10px] font-mono text-muted-foreground shrink-0">
                              {item.requesterName.slice(0, 2).toUpperCase()}
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="font-medium text-foreground text-xs truncate">
                              {item.requesterName}
                            </p>
                            <p className="text-[11px] text-muted-foreground truncate">
                              {item.requesterArea || 'Autônomos'}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <span
                          className={cn(
                            'inline-flex rounded-full border px-2 py-0.5 font-mono text-[11px]',
                            TEAM_STYLE[item.team] || TEAM_STYLE.Geral
                          )}
                        >
                          {item.team}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-xs text-muted-foreground">{item.category}</td>
                      <td className="px-4 py-3.5">
                        {item.attachments.length > 0 ? (
                          <button
                            type="button"
                            onClick={() => openDetail(item)}
                            className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary hover:bg-primary/20 cursor-pointer"
                          >
                            <Paperclip className="h-3 w-3" /> {item.attachments.length}
                          </button>
                        ) : (
                          <span className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                            Sem anexo
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono font-semibold tabular-nums text-foreground">
                        {item.amountCents > 0 ? (
                          formatBRL(item.amountCents)
                        ) : (
                          <span className="text-amber-600 dark:text-amber-400 text-xs">
                            A definir
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span
                          className={cn(
                            'inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-medium',
                            statusMeta.cls
                          )}
                        >
                          {statusMeta.label}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          {isOpen && (
                            <>
                              <button
                                type="button"
                                disabled={updatingId === item.id}
                                onClick={() => updateEntryStatus(item.id, item.code, 'APROVADO')}
                                className="inline-flex h-8 items-center gap-1 rounded-md bg-emerald-600 px-2.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-60 cursor-pointer"
                                title="Aprovar solicitação"
                              >
                                <Check className="h-3.5 w-3.5" /> Aprovar
                              </button>
                              <button
                                type="button"
                                disabled={updatingId === item.id}
                                onClick={() => updateEntryStatus(item.id, item.code, 'RECUSADO')}
                                className="inline-flex h-8 items-center justify-center rounded-md border border-red-500/30 bg-red-500/10 px-2 text-xs text-red-700 dark:text-red-300 hover:bg-red-500/20 cursor-pointer"
                                title="Recusar solicitação"
                              >
                                <XCircle className="h-3.5 w-3.5" />
                              </button>
                            </>
                          )}
                          {item.status === 'APROVADO' && (
                            <button
                              type="button"
                              disabled={updatingId === item.id}
                              onClick={() => updateEntryStatus(item.id, item.code, 'PAGO')}
                              className="inline-flex h-8 items-center gap-1 rounded-md bg-blue-600 px-2.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-60 cursor-pointer"
                            >
                              <DollarSign className="h-3.5 w-3.5" /> Marcar Pago
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => openDetail(item)}
                            className="inline-flex h-8 items-center gap-1 rounded-md border border-border px-2.5 text-xs text-foreground hover:bg-accent cursor-pointer"
                          >
                            <Receipt className="h-3.5 w-3.5" /> Detalhes
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de Detalhes / Nota Fiscal / PIX */}
      <Dialog open={Boolean(selectedItem)} onOpenChange={open => !open && setSelectedItem(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto border-border bg-card text-foreground">
          <DialogHeader>
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-xs text-muted-foreground">{selectedItem?.code}</span>
              {selectedItem && (
                <span
                  className={cn(
                    'inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-medium',
                    FINANCIAL_STATUS_META[selectedItem.status].cls
                  )}
                >
                  {FINANCIAL_STATUS_META[selectedItem.status].label}
                </span>
              )}
            </div>
            <DialogTitle className="font-display text-lg font-semibold pt-1">
              {selectedItem?.title}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Solicitado por {selectedItem?.requesterName}
              {selectedItem?.requesterArea ? ` (${selectedItem.requesterArea})` : ''} · Divisão{' '}
              {selectedItem?.team}
            </DialogDescription>
          </DialogHeader>

          {selectedItem && (
            <div className="space-y-4 text-sm">
              <div className="grid sm:grid-cols-2 gap-3 rounded-xl border border-border bg-muted/30 p-4">
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">
                    Valor do reembolso (R$)
                  </label>
                  <input
                    value={detailAmount}
                    onChange={e => setDetailAmount(e.target.value)}
                    className="min-h-10 w-full rounded-lg border border-input bg-background px-3 font-mono text-lg font-bold text-foreground"
                  />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Data da compra / Categoria</p>
                  <p className="font-mono text-sm font-medium text-foreground mt-1.5">
                    {formatFinanceDate(selectedItem.occurredAt)}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {selectedItem.category} · {selectedItem.fundSource}
                  </p>
                </div>
              </div>

              {selectedItem.pixKey ? (
                <div className="rounded-xl border border-border p-3.5 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">
                      Chave PIX ({selectedItem.pixKeyType || 'PIX'})
                    </p>
                    <p className="font-mono text-xs font-semibold text-foreground truncate mt-0.5">
                      {selectedItem.pixKey}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard?.writeText(selectedItem.pixKey || '');
                      toast.success('Chave PIX copiada!');
                    }}
                    className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border px-3 text-xs font-medium hover:bg-accent cursor-pointer shrink-0"
                  >
                    <Copy className="h-3.5 w-3.5" /> Copiar PIX
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-800 dark:text-amber-200">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />
                  <span>
                    Membro ainda não informou a chave PIX na plataforma. Assim que ele atualizar em{' '}
                    <strong>/reembolsos</strong>, ela aparecerá aqui automaticamente.
                  </span>
                </div>
              )}

              {selectedItem.description && (
                <div className="rounded-lg bg-muted/40 p-3 text-xs text-secondary-foreground border border-border/60">
                  <strong className="text-foreground">Observações do pedido:</strong>{' '}
                  {selectedItem.description}
                </div>
              )}

              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  Nota / Parecer da Tesouraria (visível ao membro)
                </label>
                <textarea
                  rows={2}
                  value={detailReviewNotes}
                  onChange={e => setDetailReviewNotes(e.target.value)}
                  placeholder="Ex: Reembolso pago via PIX na conta do Itaú, ou informe se falta NF..."
                  className="w-full rounded-lg border border-input bg-background p-2.5 text-xs text-foreground"
                />
              </div>

              <div className="space-y-2 border-t border-border pt-3">
                <p className="text-xs font-semibold text-foreground">
                  Comprovantes e Notas Fiscais ({selectedItem.attachments.length})
                </p>
                <AttachmentGallery
                  attachments={selectedItem.attachments}
                  driveFolderUrl={selectedItem.driveFolderUrl}
                />
                <ReceiptUploader
                  drafts={detailProofDrafts}
                  onAdd={d => setDetailProofDrafts(prev => [...prev, d])}
                  onRemove={idx => setDetailProofDrafts(prev => prev.filter((_, i) => i !== idx))}
                  kind="PAYMENT_PROOF"
                  label="Anexar comprovante de transferência PIX / documento adicional"
                />
              </div>
            </div>
          )}

          <DialogFooter className="flex-wrap justify-between gap-2 border-t border-border pt-3">
            <div className="flex flex-wrap items-center gap-2">
              {selectedItem &&
                (selectedItem.status === 'AGUARDANDO_REEMBOLSO' ||
                  selectedItem.status === 'PENDENTE' ||
                  selectedItem.status === 'AGUARDANDO_NF') && (
                  <>
                    <button
                      type="button"
                      disabled={updatingId === selectedItem.id}
                      onClick={() =>
                        updateEntryStatus(selectedItem.id, selectedItem.code, 'RECUSADO', {
                          reviewNotes: detailReviewNotes,
                          addAttachments: detailProofDrafts,
                        })
                      }
                      className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-red-500/30 bg-red-500/10 px-3 text-xs font-medium text-red-700 dark:text-red-300 hover:bg-red-500/20 cursor-pointer"
                    >
                      <X className="h-3.5 w-3.5" /> Recusar
                    </button>
                    <button
                      type="button"
                      disabled={updatingId === selectedItem.id}
                      onClick={() =>
                        updateEntryStatus(selectedItem.id, selectedItem.code, 'AGUARDANDO_NF', {
                          reviewNotes: detailReviewNotes,
                          addAttachments: detailProofDrafts,
                        })
                      }
                      className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-orange-500/30 bg-orange-500/10 px-3 text-xs font-medium text-orange-700 dark:text-orange-300 hover:bg-orange-500/20 cursor-pointer"
                    >
                      <FileWarning className="h-3.5 w-3.5" /> Pedir NF
                    </button>
                    <button
                      type="button"
                      disabled={updatingId === selectedItem.id}
                      onClick={() => {
                        const numeric = Number(detailAmount.replace(/\./g, '').replace(',', '.'));
                        updateEntryStatus(selectedItem.id, selectedItem.code, 'APROVADO', {
                          amountCents: Number.isFinite(numeric) ? Math.round(numeric * 100) : undefined,
                          reviewNotes: detailReviewNotes,
                          addAttachments: detailProofDrafts,
                        });
                      }}
                      className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 text-xs font-semibold text-white hover:bg-emerald-700 cursor-pointer"
                    >
                      <Check className="h-3.5 w-3.5" /> Aprovar reembolso
                    </button>
                  </>
                )}

              {selectedItem &&
                (selectedItem.status === 'APROVADO' ||
                  selectedItem.status === 'AGUARDANDO_REEMBOLSO') && (
                  <button
                    type="button"
                    disabled={updatingId === selectedItem.id}
                    onClick={() => {
                      const numeric = Number(detailAmount.replace(/\./g, '').replace(',', '.'));
                      updateEntryStatus(selectedItem.id, selectedItem.code, 'PAGO', {
                        amountCents: Number.isFinite(numeric) ? Math.round(numeric * 100) : undefined,
                        reviewNotes: detailReviewNotes,
                        addAttachments: detailProofDrafts,
                      });
                    }}
                    className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 text-xs font-semibold text-white hover:bg-blue-700 cursor-pointer"
                  >
                    <DollarSign className="h-3.5 w-3.5" /> Confirmar pagamento PIX
                  </button>
                )}
            </div>

            <div className="flex items-center gap-2">
              {selectedItem && (
                <button
                  type="button"
                  disabled={updatingId === selectedItem.id}
                  onClick={handleSaveDetailsOnly}
                  className="inline-flex min-h-9 items-center rounded-lg border border-border bg-background px-3 text-xs font-medium hover:bg-accent cursor-pointer"
                >
                  Salvar dados
                </button>
              )}
              <button
                type="button"
                onClick={() => setSelectedItem(null)}
                className="inline-flex min-h-9 items-center rounded-lg border border-border px-3.5 text-xs font-medium hover:bg-accent cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Nova Solicitação de Reembolso */}
      <Dialog open={creatingOpen} onOpenChange={setCreatingOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto border-border bg-card text-foreground">
          <DialogHeader>
            <DialogTitle className="font-display text-lg font-semibold">
              Nova Solicitação de Reembolso
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Registre um reembolso diretamente no banco de dados da tesouraria.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateSubmit} className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground" htmlFor="rmb-title">
                Descrição da compra / despesa *
              </label>
              <input
                id="rmb-title"
                required
                value={formTitle}
                onChange={e => setFormTitle(e.target.value)}
                placeholder="Ex: Hélices de fibra de carbono 10x4.5"
                className="min-h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground" htmlFor="rmb-member">
                Membro Solicitante *
              </label>
              <select
                id="rmb-member"
                value={formRequesterId}
                onChange={e => {
                  const id = e.target.value;
                  setFormRequesterId(id);
                  const found = data.members.find(m => m.id === id);
                  if (found?.pixKey) setFormPixKey(found.pixKey);
                  if (found?.pixKeyType) setFormPixKeyType(found.pixKeyType);
                }}
                className="min-h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground"
              >
                <option value="">Eu mesmo ({currentUserName})</option>
                {data.members.map(m => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.area})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground" htmlFor="rmb-team">
                  Divisão *
                </label>
                <select
                  id="rmb-team"
                  value={formTeam}
                  onChange={e => setFormTeam(e.target.value)}
                  className="min-h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground"
                >
                  {FINANCE_TEAMS.map(t => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground" htmlFor="rmb-cat">
                  Categoria *
                </label>
                <select
                  id="rmb-cat"
                  value={formCategory}
                  onChange={e => setFormCategory(e.target.value)}
                  className="min-h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground"
                >
                  {FINANCE_CATEGORIES.map(c => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground" htmlFor="rmb-fund">
                  Origem *
                </label>
                <select
                  id="rmb-fund"
                  value={formFundSource}
                  onChange={e => setFormFundSource(e.target.value)}
                  className="min-h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground"
                >
                  {FINANCE_FUNDS.map(f => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground" htmlFor="rmb-amount">
                  Valor (R$) *
                </label>
                <input
                  id="rmb-amount"
                  required
                  value={formAmount}
                  onChange={e => setFormAmount(e.target.value)}
                  placeholder="Ex: 149,90"
                  className="min-h-10 w-full rounded-lg border border-input bg-background px-3 text-sm font-mono text-foreground"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground" htmlFor="rmb-date">
                  Data da compra *
                </label>
                <input
                  id="rmb-date"
                  type="date"
                  required
                  value={formPurchaseDate}
                  onChange={e => setFormPurchaseDate(e.target.value)}
                  className="min-h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground"
                />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-[10rem_1fr]">
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground" htmlFor="rmb-pix-type">
                  Tipo de PIX
                </label>
                <select
                  id="rmb-pix-type"
                  value={formPixKeyType}
                  onChange={e => setFormPixKeyType(e.target.value)}
                  className="min-h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground"
                >
                  {PIX_KEY_TYPES.map(t => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground" htmlFor="rmb-pix">
                  Chave PIX
                </label>
                <input
                  id="rmb-pix"
                  value={formPixKey}
                  onChange={e => setFormPixKey(e.target.value)}
                  placeholder="CPF, E-mail, Telefone ou Chave aleatória"
                  className="min-h-10 w-full rounded-lg border border-input bg-background px-3 text-sm font-mono text-foreground"
                />
              </div>
            </div>

            <ReceiptUploader
              drafts={formDrafts}
              onAdd={d => setFormDrafts(prev => [...prev, d])}
              onRemove={idx => setFormDrafts(prev => prev.filter((_, i) => i !== idx))}
              kind="RECEIPT"
            />

            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground" htmlFor="rmb-notes">
                Observações adicionais
              </label>
              <textarea
                id="rmb-notes"
                rows={2}
                value={formNotes}
                onChange={e => setFormNotes(e.target.value)}
                placeholder="Justificativa, projeto ou código do pedido…"
                className="w-full rounded-lg border border-input bg-background p-3 text-sm text-foreground"
              />
            </div>

            <DialogFooter className="gap-2 pt-2">
              <button
                type="button"
                onClick={() => setCreatingOpen(false)}
                className="inline-flex min-h-10 items-center rounded-lg border border-border px-4 text-xs font-medium hover:bg-accent cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={creatingLoading}
                className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-primary px-4 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60 cursor-pointer"
              >
                <Check className="h-4 w-4" />
                {creatingLoading ? 'Salvando…' : 'Registrar solicitação'}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
