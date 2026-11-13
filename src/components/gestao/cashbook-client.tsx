'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import {
  ArrowDownCircle,
  ArrowUpCircle,
  Check,
  Copy,
  Download,
  ExternalLink,
  FileSpreadsheet,
  FileText,
  Landmark,
  Paperclip,
  Plus,
  Search,
  Trash2,
  Wallet,
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
  formatBRL,
  formatFinanceDate,
  type FinancialDashboardData,
  type FinancialEntryDTO,
  type FinancialEntryStatusValue,
  type FinancialEntryTypeValue,
} from '@/lib/finance/constants';
import {
  AttachmentGallery,
  ReceiptUploader,
  type UploadedAttachmentDraft,
} from '@/components/finance/attachment-gallery';
import {
  ExpensesByCategoryChart,
  MonthlyCashflowChart,
} from '@/components/finance/finance-charts';
import { cn } from '@/lib/utils';

const DRIVE_ROOT_URL = 'https://drive.google.com/drive/folders/1L0WJaQEsREt34nkgMxuy6-mj21cW_vBb';

export function CashbookClient({
  initialData,
}: {
  initialData: FinancialDashboardData;
}) {
  const [data, setData] = useState<FinancialDashboardData>(initialData);
  const [typeFilter, setTypeFilter] = useState<'ALL' | FinancialEntryTypeValue>('ALL');
  const [fundFilter, setFundFilter] = useState<'ALL' | string>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | string>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | FinancialEntryStatusValue>('ALL');
  const [search, setSearch] = useState('');

  const [selectedEntry, setSelectedEntry] = useState<FinancialEntryDTO | null>(null);
  const [editAmount, setEditAmount] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editFund, setEditFund] = useState('');
  const [editStatus, setEditStatus] = useState<FinancialEntryStatusValue>('PAGO');
  const [editNotes, setEditNotes] = useState('');
  const [editReviewNotes, setEditReviewNotes] = useState('');
  const [editNewAttachments, setEditNewAttachments] = useState<UploadedAttachmentDraft[]>([]);
  const [savingEdit, setSavingEdit] = useState(false);

  const [creatingOpen, setCreatingOpen] = useState(false);
  const [createType, setCreateType] = useState<FinancialEntryTypeValue>('ENTRADA');
  const [createIsReimbursement, setCreateIsReimbursement] = useState(false);
  const [createTitle, setCreateTitle] = useState('');
  const [createRequesterId, setCreateRequesterId] = useState('');
  const [createRequesterName, setCreateRequesterName] = useState('');
  const [createCategory, setCreateCategory] = useState<string>('Administrativo');
  const [createFund, setCreateFund] = useState<string>('Dinheiro Livre');
  const [createTeam, setCreateTeam] = useState<string>('Geral');
  const [createAmount, setCreateAmount] = useState('');
  const [createDate, setCreateDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [createStatus, setCreateStatus] = useState<FinancialEntryStatusValue>('PAGO');
  const [createPixKey, setCreatePixKey] = useState('');
  const [createDescription, setCreateDescription] = useState('');
  const [createAttachments, setCreateAttachments] = useState<UploadedAttachmentDraft[]>([]);
  const [savingCreate, setSavingCreate] = useState(false);

  async function refreshDashboard(reopenId?: string) {
    const res = await fetch('/api/financeiro?scope=management', { cache: 'no-store' });
    if (!res.ok) return;
    const json = (await res.json()) as FinancialDashboardData & { scope?: string };
    setData({ entries: json.entries, summary: json.summary, members: json.members });
    if (reopenId) {
      const updated = json.entries.find(e => e.id === reopenId) || null;
      setSelectedEntry(updated);
    }
  }

  function openDetail(entry: FinancialEntryDTO) {
    setSelectedEntry(entry);
    setEditAmount((entry.amountCents / 100).toFixed(2).replace('.', ','));
    setEditDate(entry.occurredAt || '');
    setEditCategory(entry.category);
    setEditFund(entry.fundSource);
    setEditStatus(entry.status);
    setEditNotes(entry.description || '');
    setEditReviewNotes(entry.reviewNotes || '');
    setEditNewAttachments([]);
  }

  function openCreateModal(presetType: FinancialEntryTypeValue) {
    setCreateType(presetType);
    setCreateIsReimbursement(presetType === 'SAIDA');
    setCreateStatus(presetType === 'ENTRADA' ? 'PAGO' : 'AGUARDANDO_REEMBOLSO');
    setCreateTitle('');
    setCreateRequesterId('');
    setCreateRequesterName('');
    setCreateCategory(presetType === 'ENTRADA' ? 'Inscrições' : 'Eletrônica');
    setCreateFund('Dinheiro Livre');
    setCreateTeam('Geral');
    setCreateAmount('');
    setCreateDate(new Date().toISOString().slice(0, 10));
    setCreatePixKey('');
    setCreateDescription('');
    setCreateAttachments([]);
    setCreatingOpen(true);
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLocaleLowerCase('pt-BR');
    return data.entries.filter(item => {
      if (typeFilter !== 'ALL' && item.type !== typeFilter) return false;
      if (fundFilter !== 'ALL' && item.fundSource !== fundFilter) return false;
      if (categoryFilter !== 'ALL' && item.category !== categoryFilter) return false;
      if (statusFilter !== 'ALL' && item.status !== statusFilter) return false;
      if (q) {
        const hay = `${item.code} ${item.title} ${item.requesterName} ${item.category} ${item.fundSource} ${item.description || ''}`.toLocaleLowerCase('pt-BR');
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [data.entries, typeFilter, fundFilter, categoryFilter, statusFilter, search]);

  const statementAttachment = useMemo(() => {
    for (const entry of data.entries) {
      const found = entry.attachments.find(a => a.kind === 'STATEMENT');
      if (found) return found;
    }
    return null;
  }, [data.entries]);

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedEntry) return;
    const normalized = Number(editAmount.replace(/\./g, '').replace(',', '.'));
    if (!Number.isFinite(normalized) || normalized < 0) {
      toast.error('Informe um valor válido.');
      return;
    }

    setSavingEdit(true);
    try {
      const res = await fetch(`/api/financeiro/${selectedEntry.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amountCents: Math.round(normalized * 100),
          occurredAt: editDate || null,
          category: editCategory,
          fundSource: editFund,
          status: editStatus,
          description: editNotes,
          reviewNotes: editReviewNotes,
          addAttachments: editNewAttachments,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error || 'Erro ao salvar alterações.');
        return;
      }
      toast.success(`Lançamento ${selectedEntry.code} atualizado!`);
      setEditNewAttachments([]);
      await refreshDashboard(selectedEntry.id);
    } catch {
      toast.error('Erro de conexão ao atualizar lançamento.');
    } finally {
      setSavingEdit(false);
    }
  }

  async function handleRemoveAttachment(attachmentId: string) {
    if (!selectedEntry) return;
    const res = await fetch(`/api/financeiro/${selectedEntry.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ removeAttachmentId: attachmentId }),
    });
    if (res.ok) {
      toast.success('Anexo removido.');
      await refreshDashboard(selectedEntry.id);
    } else {
      toast.error('Não foi possível remover o anexo.');
    }
  }

  async function handleDeleteEntry(id: string, code: string) {
    if (!window.confirm(`Tem certeza que deseja excluir permanentemente o lançamento ${code}?`)) return;
    const res = await fetch(`/api/financeiro/${id}`, { method: 'DELETE' });
    if (res.ok) {
      toast.success(`Lançamento ${code} excluído.`);
      setSelectedEntry(null);
      await refreshDashboard();
    } else {
      toast.error('Não foi possível excluir o lançamento.');
    }
  }

  async function handleCreateSubmit(e: React.FormEvent) {
    e.preventDefault();
    const numeric = Number(createAmount.replace(/\./g, '').replace(',', '.'));
    if (!createTitle.trim() || !Number.isFinite(numeric) || numeric < 0) {
      toast.error('Preencha descrição e valor válidos.');
      return;
    }

    setSavingCreate(true);
    try {
      const res = await fetch('/api/financeiro', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: createType,
          isReimbursement: createType === 'SAIDA' ? createIsReimbursement : false,
          title: createTitle.trim(),
          requesterId: createRequesterId || null,
          requesterName: createRequesterName.trim() || undefined,
          category: createCategory,
          fundSource: createFund,
          team: createTeam,
          amountCents: Math.round(numeric * 100),
          occurredAt: createDate || null,
          status: createStatus,
          pixKey: createPixKey.trim() || null,
          description: createDescription.trim() || null,
          attachments: createAttachments,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error || 'Erro ao registrar lançamento.');
        return;
      }
      toast.success(`Lançamento ${json.entry.code} registrado!`);
      setCreatingOpen(false);
      await refreshDashboard();
    } catch {
      toast.error('Erro de conexão ao registrar lançamento.');
    } finally {
      setSavingCreate(false);
    }
  }

  const { summary } = data;

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-5">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-300">
              <Landmark className="h-3.5 w-3.5" />
              Tesouraria · Livro Caixa Oficial
            </span>
            <Link
              href="/gestao/financeiro/reembolsos"
              className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-3 py-0.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              <Wallet className="h-3 w-3" /> Ir para Fila de Reembolsos ({summary.awaitingReimbursementCount})
            </Link>
          </div>
          <h1 className="font-display text-3xl font-semibold text-foreground">
            Livro Caixa e Movimentações
          </h1>
          <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground leading-relaxed">
            Controle completo de entradas, saídas, saldos por conta (Dinheiro Livre e Coppetec), extratos bancários e comprovantes fiscais da equipe.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <a
            href="/api/export/sheets?type=finance"
            className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-border bg-card px-3.5 text-xs font-medium text-foreground hover:bg-accent transition-colors"
          >
            <FileSpreadsheet className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            Exportar Planilha (CSV)
          </a>
          <button
            type="button"
            onClick={() => openCreateModal('ENTRADA')}
            className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-emerald-600/40 bg-emerald-600/10 px-3.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300 hover:bg-emerald-600/20 cursor-pointer"
          >
            <ArrowUpCircle className="h-4 w-4" />
            Nova Entrada
          </button>
          <button
            type="button"
            onClick={() => openCreateModal('SAIDA')}
            className="inline-flex min-h-10 items-center gap-1.5 rounded-lg bg-primary px-4 text-xs font-semibold text-primary-foreground hover:bg-primary/90 cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            Nova Saída / Reembolso
          </button>
        </div>
      </header>

      {/* KPIs do Tesouro */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-emerald-500/30 bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">Saldo Dinheiro Livre</span>
            <Wallet className="h-4 w-4 text-emerald-500" />
          </div>
          <p className="mt-2.5 font-display text-2xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
            {formatBRL(summary.freeCashBalanceCents)}
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Entradas {formatBRL(summary.freeCashIncomeCents)} − Saídas {formatBRL(summary.freeCashExpenseCents)}
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">Conta Coppetec</span>
            <Landmark className="h-4 w-4 text-blue-500" />
          </div>
          <p className="mt-2.5 font-display text-2xl font-bold tabular-nums text-foreground">
            {formatBRL(summary.coppetecBalanceCents)}
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {summary.coppetecPendingCents > 0
              ? `+ ${formatBRL(summary.coppetecPendingCents)} pendente (Edital/Miceli)`
              : 'Sem pendências na conta'}
          </p>
        </div>

        <div className="rounded-xl border border-amber-500/30 bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">Aguardando Reembolso</span>
            <ArrowDownCircle className="h-4 w-4 text-amber-500" />
          </div>
          <p className="mt-2.5 font-display text-2xl font-bold tabular-nums text-amber-600 dark:text-amber-400">
            {formatBRL(summary.awaitingReimbursementCents)}
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {summary.awaitingReimbursementCount} solicitações em aberto
            {summary.approvedToPayCount > 0 && ` · +${formatBRL(summary.approvedToPayCents)} aprovado`}
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">Extratos & Documentos</span>
            <FileText className="h-4 w-4 text-primary" />
          </div>
          <div className="mt-2.5 flex flex-col gap-1.5">
            {statementAttachment && (
              <a
                href={statementAttachment.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-between rounded-lg border border-border bg-muted/40 px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-accent"
              >
                <span className="truncate">{statementAttachment.name}</span>
                <Download className="h-3.5 w-3.5 shrink-0 text-primary" />
              </a>
            )}
            <a
              href={DRIVE_ROOT_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Pasta de Comprovantes no Drive
            </a>
          </div>
        </div>
      </div>

      {/* Gráficos Responsivos */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="min-w-0 rounded-xl border border-border bg-card p-4 shadow-xs">
          <h2 className="font-display text-base font-semibold text-foreground">
            Gastos por Categoria
          </h2>
          <p className="text-xs text-muted-foreground mb-3">
            Comparativo entre despesas já pagas e solicitações aguardando reembolso.
          </p>
          <ExpensesByCategoryChart data={summary.expensesByCategory} />
        </div>

        <div className="min-w-0 rounded-xl border border-border bg-card p-4 shadow-xs">
          <h2 className="font-display text-base font-semibold text-foreground">
            Fluxo de Caixa Mensal
          </h2>
          <p className="text-xs text-muted-foreground mb-3">
            Entradas confirmadas versus saídas pagas por mês de competência.
          </p>
          <MonthlyCashflowChart data={summary.monthlyCashflow} />
        </div>
      </div>

      {/* Filtros & Tabela do Livro Caixa */}
      <div className="rounded-xl border border-border bg-card overflow-hidden shadow-xs">
        <div className="border-b border-border bg-muted/35 px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { value: 'ALL', label: `Todos (${data.entries.length})` },
              {
                value: 'ENTRADA',
                label: `Entradas (${data.entries.filter(e => e.type === 'ENTRADA').length})`,
              },
              {
                value: 'SAIDA',
                label: `Saídas / Reembolsos (${data.entries.filter(e => e.type === 'SAIDA').length})`,
              },
            ].map(tab => (
              <button
                key={tab.value}
                type="button"
                onClick={() => setTypeFilter(tab.value as typeof typeFilter)}
                className={cn(
                  'rounded-lg px-3 py-1.5 text-xs font-medium border transition-colors cursor-pointer',
                  typeFilter === tab.value
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-background/70 text-muted-foreground border-border hover:text-foreground'
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            {(['ALL', 'Dinheiro Livre', 'Conta Coppetec'] as const).map(f => (
              <button
                key={f}
                type="button"
                onClick={() => setFundFilter(f)}
                className={cn(
                  'rounded-md px-2.5 py-1 transition-colors cursor-pointer',
                  fundFilter === f
                    ? 'bg-accent font-semibold text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {f === 'ALL' ? 'Todas as contas' : f}
              </button>
            ))}
          </div>
        </div>

        <div className="border-b border-border bg-muted/15 p-4 grid gap-3 sm:grid-cols-[minmax(14rem,1fr)_12rem_12rem]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <input
              type="search"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por código, descrição, pessoa ou observação…"
              className="min-h-10 w-full rounded-lg border border-input bg-background pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground"
            />
          </div>
          <select
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
            aria-label="Filtrar por categoria"
            className="min-h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground"
          >
            <option value="ALL">Todas as categorias</option>
            {FINANCE_CATEGORIES.map(cat => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as typeof statusFilter)}
            aria-label="Filtrar por status"
            className="min-h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground"
          >
            <option value="ALL">Todos os status</option>
            {(Object.keys(FINANCIAL_STATUS_META) as FinancialEntryStatusValue[]).map(st => (
              <option key={st} value={st}>
                {FINANCIAL_STATUS_META[st].label}
              </option>
            ))}
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-muted/40 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Data / Cód.</th>
                <th className="px-4 py-3 font-medium">Descrição</th>
                <th className="px-4 py-3 font-medium">Pessoa / Origem</th>
                <th className="px-4 py-3 font-medium">Categoria / Conta</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium text-center">Anexos</th>
                <th className="px-4 py-3 font-medium text-right">Valor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map(entry => {
                const statusMeta = FINANCIAL_STATUS_META[entry.status];
                return (
                  <tr
                    key={entry.id}
                    onClick={() => openDetail(entry)}
                    className="hover:bg-muted/25 transition-colors cursor-pointer"
                  >
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="block font-mono text-xs text-foreground">
                        {formatFinanceDate(entry.occurredAt)}
                      </span>
                      <span className="font-mono text-[10px] text-muted-foreground">
                        {entry.code}
                      </span>
                    </td>
                    <td className="px-4 py-3 max-w-xs">
                      <p className="font-medium text-foreground line-clamp-1">{entry.title}</p>
                      {entry.description && (
                        <p className="text-[11px] text-muted-foreground line-clamp-1">
                          {entry.description}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {entry.requesterAvatar ? (
                          <img
                            src={entry.requesterAvatar}
                            alt={entry.requesterName}
                            className="h-6 w-6 rounded-full object-cover border border-border shrink-0"
                          />
                        ) : (
                          <div className="h-6 w-6 rounded-full bg-muted border border-border flex items-center justify-center text-[10px] font-mono text-muted-foreground shrink-0">
                            {entry.requesterName.slice(0, 2).toUpperCase()}
                          </div>
                        )}
                        <span className="text-xs font-medium text-foreground truncate max-w-[140px]">
                          {entry.requesterName}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="block text-xs text-foreground">{entry.category}</span>
                      <span className="text-[10px] font-mono text-muted-foreground">
                        {entry.fundSource} · {entry.team}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span
                        className={cn(
                          'inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium',
                          statusMeta.cls
                        )}
                      >
                        {statusMeta.shortLabel}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {entry.attachments.length > 0 ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                          <Paperclip className="h-3 w-3" /> {entry.attachments.length}
                        </span>
                      ) : (
                        <span className="text-[11px] text-muted-foreground">—</span>
                      )}
                    </td>
                    <td
                      className={cn(
                        'px-4 py-3 text-right font-mono font-semibold tabular-nums whitespace-nowrap',
                        entry.type === 'ENTRADA'
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-foreground'
                      )}
                    >
                      {entry.type === 'ENTRADA' ? '+' : '−'} {formatBRL(entry.amountCents)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Detalhe & Edição de Lançamento */}
      <Dialog open={Boolean(selectedEntry)} onOpenChange={open => !open && setSelectedEntry(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto border-border bg-card text-foreground">
          {selectedEntry && (
            <>
              <DialogHeader>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-xs text-muted-foreground">
                    {selectedEntry.code} · {selectedEntry.type === 'ENTRADA' ? 'Entrada' : 'Saída / Reembolso'}
                  </span>
                  <span
                    className={cn(
                      'inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-medium',
                      FINANCIAL_STATUS_META[selectedEntry.status].cls
                    )}
                  >
                    {FINANCIAL_STATUS_META[selectedEntry.status].label}
                  </span>
                </div>
                <DialogTitle className="font-display text-lg font-semibold pt-1">
                  {selectedEntry.title}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Responsável/Solicitante: {selectedEntry.requesterName} · Equipe {selectedEntry.team}
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleSaveEdit} className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">
                      Valor (R$)
                    </label>
                    <input
                      value={editAmount}
                      onChange={e => setEditAmount(e.target.value)}
                      className="min-h-10 w-full rounded-lg border border-input bg-background px-3 text-sm font-mono text-foreground"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">
                      Data da movimentação
                    </label>
                    <input
                      type="date"
                      value={editDate}
                      onChange={e => setEditDate(e.target.value)}
                      className="min-h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground"
                    />
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">
                      Status
                    </label>
                    <select
                      value={editStatus}
                      onChange={e => setEditStatus(e.target.value as FinancialEntryStatusValue)}
                      className="min-h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground"
                    >
                      {(Object.keys(FINANCIAL_STATUS_META) as FinancialEntryStatusValue[]).map(st => (
                        <option key={st} value={st}>
                          {FINANCIAL_STATUS_META[st].label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">
                      Categoria
                    </label>
                    <select
                      value={editCategory}
                      onChange={e => setEditCategory(e.target.value)}
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
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">
                      Conta / Verba
                    </label>
                    <select
                      value={editFund}
                      onChange={e => setEditFund(e.target.value)}
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

                {selectedEntry.pixKey && (
                  <div className="rounded-xl border border-border bg-muted/25 p-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[11px] text-muted-foreground">
                        Chave PIX ({selectedEntry.pixKeyType || 'PIX'})
                      </p>
                      <p className="font-mono text-xs font-semibold text-foreground truncate">
                        {selectedEntry.pixKey}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard?.writeText(selectedEntry.pixKey || '');
                        toast.success('Chave PIX copiada!');
                      }}
                      className="inline-flex h-8 items-center gap-1 rounded-lg border border-border bg-background px-2.5 text-xs font-medium hover:bg-accent cursor-pointer shrink-0"
                    >
                      <Copy className="h-3.5 w-3.5" /> Copiar
                    </button>
                  </div>
                )}

                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">
                      Descrição / Comentários
                    </label>
                    <textarea
                      rows={2}
                      value={editNotes}
                      onChange={e => setEditNotes(e.target.value)}
                      className="w-full rounded-lg border border-input bg-background p-2.5 text-xs text-foreground"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">
                      Observação da Tesouraria / Gestão
                    </label>
                    <textarea
                      rows={2}
                      value={editReviewNotes}
                      onChange={e => setEditReviewNotes(e.target.value)}
                      placeholder="Ex: PIX enviado em 13/11..."
                      className="w-full rounded-lg border border-input bg-background p-2.5 text-xs text-foreground"
                    />
                  </div>
                </div>

                <div className="space-y-2 border-t border-border pt-3">
                  <p className="text-xs font-semibold text-foreground">
                    Comprovantes e Notas Fiscais ({selectedEntry.attachments.length})
                  </p>
                  <AttachmentGallery
                    attachments={selectedEntry.attachments}
                    driveFolderUrl={selectedEntry.driveFolderUrl}
                    canDelete
                    onDelete={handleRemoveAttachment}
                  />
                  <ReceiptUploader
                    drafts={editNewAttachments}
                    onAdd={d => setEditNewAttachments(prev => [...prev, d])}
                    onRemove={idx => setEditNewAttachments(prev => prev.filter((_, i) => i !== idx))}
                    kind={selectedEntry.type === 'SAIDA' ? 'PAYMENT_PROOF' : 'RECEIPT'}
                    label="Anexar novo comprovante / comprovante do PIX pago"
                  />
                </div>

                <DialogFooter className="flex-wrap justify-between gap-2 border-t border-border pt-3">
                  <button
                    type="button"
                    onClick={() => handleDeleteEntry(selectedEntry.id, selectedEntry.code)}
                    className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-red-500/30 bg-red-500/10 px-3 text-xs font-medium text-red-700 dark:text-red-300 hover:bg-red-500/20 cursor-pointer"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Excluir
                  </button>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedEntry(null)}
                      className="inline-flex min-h-9 items-center rounded-lg border border-border px-3.5 text-xs font-medium hover:bg-accent cursor-pointer"
                    >
                      Fechar
                    </button>
                    <button
                      type="submit"
                      disabled={savingEdit}
                      className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-primary px-4 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60 cursor-pointer"
                    >
                      <Check className="h-3.5 w-3.5" /> {savingEdit ? 'Salvando…' : 'Salvar alterações'}
                    </button>
                  </div>
                </DialogFooter>
              </form>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal de Criação de Entrada / Saída */}
      <Dialog open={creatingOpen} onOpenChange={setCreatingOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto border-border bg-card text-foreground">
          <DialogHeader>
            <DialogTitle className="font-display text-lg font-semibold">
              {createType === 'ENTRADA' ? 'Registrar Nova Entrada' : 'Registrar Nova Saída / Reembolso'}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Lançamento direto no Livro Caixa oficial da equipe.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateSubmit} className="space-y-3.5">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setCreateType('ENTRADA');
                  setCreateIsReimbursement(false);
                  setCreateStatus('PAGO');
                }}
                className={cn(
                  'rounded-lg border px-3 py-2 text-xs font-semibold cursor-pointer',
                  createType === 'ENTRADA'
                    ? 'border-emerald-500 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                    : 'border-border text-muted-foreground'
                )}
              >
                + Entrada de Verba
              </button>
              <button
                type="button"
                onClick={() => {
                  setCreateType('SAIDA');
                  setCreateIsReimbursement(true);
                  setCreateStatus('AGUARDANDO_REEMBOLSO');
                }}
                className={cn(
                  'rounded-lg border px-3 py-2 text-xs font-semibold cursor-pointer',
                  createType === 'SAIDA'
                    ? 'border-primary bg-primary/15 text-primary'
                    : 'border-border text-muted-foreground'
                )}
              >
                − Saída / Reembolso
              </button>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Descrição *</label>
              <input
                required
                value={createTitle}
                onChange={e => setCreateTitle(e.target.value)}
                placeholder={
                  createType === 'ENTRADA'
                    ? 'Ex: Patrocínio / Contribuição para competição'
                    : 'Ex: Compra de parafusos M3 e hélices'
                }
                className="min-h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground"
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  Membro vinculado (opcional)
                </label>
                <select
                  value={createRequesterId}
                  onChange={e => {
                    const id = e.target.value;
                    setCreateRequesterId(id);
                    const found = data.members.find(m => m.id === id);
                    if (found) {
                      setCreateRequesterName(found.name);
                      if (found.pixKey) setCreatePixKey(found.pixKey);
                    }
                  }}
                  className="min-h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground"
                >
                  <option value="">Outro / Externo…</option>
                  {data.members.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.area})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  Nome exibido (Remetente/Solicitante)
                </label>
                <input
                  value={createRequesterName}
                  onChange={e => setCreateRequesterName(e.target.value)}
                  placeholder="Ex: Coppetec, Banco Itaú ou membro"
                  className="min-h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground"
                />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Categoria</label>
                <select
                  value={createCategory}
                  onChange={e => setCreateCategory(e.target.value)}
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
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Conta / Origem</label>
                <select
                  value={createFund}
                  onChange={e => setCreateFund(e.target.value)}
                  className="min-h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground"
                >
                  {FINANCE_FUNDS.map(f => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Equipe</label>
                <select
                  value={createTeam}
                  onChange={e => setCreateTeam(e.target.value)}
                  className="min-h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground"
                >
                  {FINANCE_TEAMS.map(t => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Valor (R$) *</label>
                <input
                  required
                  value={createAmount}
                  onChange={e => setCreateAmount(e.target.value)}
                  placeholder="0,00"
                  className="min-h-10 w-full rounded-lg border border-input bg-background px-3 text-sm font-mono text-foreground"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Data</label>
                <input
                  type="date"
                  value={createDate}
                  onChange={e => setCreateDate(e.target.value)}
                  className="min-h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Status inicial</label>
                <select
                  value={createStatus}
                  onChange={e => setCreateStatus(e.target.value as FinancialEntryStatusValue)}
                  className="min-h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground"
                >
                  {(Object.keys(FINANCIAL_STATUS_META) as FinancialEntryStatusValue[]).map(st => (
                    <option key={st} value={st}>
                      {FINANCIAL_STATUS_META[st].shortLabel}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {createType === 'SAIDA' && (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-muted/25 px-3 py-2">
                <label className="flex items-center gap-2 text-xs font-medium text-foreground cursor-pointer">
                  <input
                    type="checkbox"
                    checked={createIsReimbursement}
                    onChange={e => setCreateIsReimbursement(e.target.checked)}
                    className="rounded border-border"
                  />
                  Aparecer também na fila de reembolsos
                </label>
                {createIsReimbursement && (
                  <input
                    value={createPixKey}
                    onChange={e => setCreatePixKey(e.target.value)}
                    placeholder="Chave PIX (se aplicável)"
                    className="h-8 flex-1 min-w-40 rounded-md border border-input bg-background px-2.5 text-xs font-mono text-foreground"
                  />
                )}
              </div>
            )}

            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Observações</label>
              <textarea
                rows={2}
                value={createDescription}
                onChange={e => setCreateDescription(e.target.value)}
                placeholder="Detalhes adicionais sobre esta movimentação…"
                className="w-full rounded-lg border border-input bg-background p-2.5 text-xs text-foreground"
              />
            </div>

            <ReceiptUploader
              drafts={createAttachments}
              onAdd={d => setCreateAttachments(prev => [...prev, d])}
              onRemove={idx => setCreateAttachments(prev => prev.filter((_, i) => i !== idx))}
              kind="RECEIPT"
            />

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
                disabled={savingCreate}
                className="inline-flex min-h-10 items-center gap-1.5 rounded-lg bg-primary px-4 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60 cursor-pointer"
              >
                <Check className="h-4 w-4" />
                {savingCreate ? 'Registrando…' : 'Registrar lançamento'}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
