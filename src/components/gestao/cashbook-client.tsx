'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import {
  ArrowDownCircle,
  ArrowUpCircle,
  Calendar,
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
  Upload,
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
  type FinancialStatementDTO,
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

export function CashbookClient({
  initialData,
}: {
  initialData: FinancialDashboardData;
}) {
  const [data, setData] = useState<FinancialDashboardData>(initialData);
  const [activeTab, setActiveTab] = useState<'ledger' | 'statements'>('ledger');
  const [typeFilter, setTypeFilter] = useState<'ALL' | FinancialEntryTypeValue>('ALL');
  const [fundFilter, setFundFilter] = useState<'ALL' | string>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | string>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | FinancialEntryStatusValue>('ALL');
  const [search, setSearch] = useState('');

  const [statementFundFilter, setStatementFundFilter] = useState<'ALL' | (typeof FINANCE_FUNDS)[number]>('ALL');
  const [statementSearch, setStatementSearch] = useState('');
  const [statementModalOpen, setStatementModalOpen] = useState(false);
  const [stmtTitle, setStmtTitle] = useState('');
  const [stmtFund, setStmtFund] = useState<(typeof FINANCE_FUNDS)[number]>('Dinheiro Livre');
  const [stmtDate, setStmtDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [stmtNotes, setStmtNotes] = useState('');
  const [stmtUploadedFile, setStmtUploadedFile] = useState<{
    name: string;
    url: string;
    mimeType: string;
  } | null>(null);
  const [uploadingStmtFile, setUploadingStmtFile] = useState(false);
  const [savingStmt, setSavingStmt] = useState(false);

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
    setData({
      entries: json.entries,
      statements: json.statements || [],
      summary: json.summary,
      members: json.members,
    });
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

  const statementCounts = useMemo(() => {
    const livre = data.statements.filter(s => s.fundSource === 'Dinheiro Livre').length;
    const coppetec = data.statements.filter(s => s.fundSource === 'Conta Coppetec').length;
    const latest = data.statements[0] || null;
    return { total: data.statements.length, livre, coppetec, latest };
  }, [data.statements]);

  const filteredStatements = useMemo(() => {
    const q = statementSearch.trim().toLocaleLowerCase('pt-BR');
    return [...data.statements]
      .filter(st => {
        if (statementFundFilter !== 'ALL' && st.fundSource !== statementFundFilter) return false;
        if (q) {
          const hay = `${st.title} ${st.fundSource} ${st.referenceDate} ${st.fileName} ${st.notes || ''}`.toLocaleLowerCase('pt-BR');
          if (!hay.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => b.referenceDate.localeCompare(a.referenceDate));
  }, [data.statements, statementFundFilter, statementSearch]);

  function openStatementModal(defaultFund?: (typeof FINANCE_FUNDS)[number]) {
    setStmtTitle('');
    setStmtFund(defaultFund || (statementFundFilter === 'ALL' ? 'Dinheiro Livre' : statementFundFilter));
    setStmtDate(new Date().toISOString().slice(0, 10));
    setStmtNotes('');
    setStmtUploadedFile(null);
    setStatementModalOpen(true);
  }

  async function handleStatementFileUpload(file: File) {
    setUploadingStmtFile(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/financeiro/upload', { method: 'POST', body: fd });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Erro ao enviar arquivo do extrato.');
      }
      setStmtUploadedFile({
        name: json.name || file.name,
        url: json.url,
        mimeType: json.mimeType || file.type || 'application/pdf',
      });
      if (!stmtTitle.trim()) {
        setStmtTitle(file.name.replace(/\.[^.]+$/, ''));
      }
      toast.success('Arquivo enviado! Preencha a data e salve o extrato.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Falha no upload.');
    } finally {
      setUploadingStmtFile(false);
    }
  }

  async function handleCreateStatement(e: React.FormEvent) {
    e.preventDefault();
    if (!stmtUploadedFile) {
      toast.error('Envie o arquivo do extrato (PDF, imagem, CSV ou OFX).');
      return;
    }
    if (!stmtTitle.trim() || !stmtDate) {
      toast.error('Informe o título e a data de referência do extrato.');
      return;
    }
    setSavingStmt(true);
    try {
      const res = await fetch('/api/financeiro/extratos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: stmtTitle.trim(),
          fundSource: stmtFund,
          referenceDate: stmtDate,
          fileName: stmtUploadedFile.name,
          fileUrl: stmtUploadedFile.url,
          mimeType: stmtUploadedFile.mimeType,
          notes: stmtNotes.trim() || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Erro ao registrar extrato.');
      toast.success('Extrato salvo no histórico da conta.');
      setStatementModalOpen(false);
      setActiveTab('statements');
      await refreshDashboard();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar extrato.');
    } finally {
      setSavingStmt(false);
    }
  }

  async function handleDeleteStatement(stmt: FinancialStatementDTO) {
    if (!window.confirm(`Remover o extrato "${stmt.title}" (${formatFinanceDate(stmt.referenceDate)})?`)) {
      return;
    }
    try {
      const res = await fetch(`/api/financeiro/extratos/${stmt.id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Erro ao remover extrato.');
      toast.success('Extrato removido.');
      await refreshDashboard();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao remover extrato.');
    }
  }

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
            <span className="text-xs font-semibold uppercase tracking-wider">Extratos das Contas</span>
            <FileText className="h-4 w-4 text-primary" />
          </div>
          <p className="mt-1.5 font-mono text-2xl font-bold text-foreground tabular-nums">
            {statementCounts.total}
          </p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            {statementCounts.livre} Livre · {statementCounts.coppetec} Coppetec
            {statementCounts.latest
              ? ` · Último: ${formatFinanceDate(statementCounts.latest.referenceDate)}`
              : ''}
          </p>
          <div className="mt-2.5 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('statements')}
              className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline cursor-pointer"
            >
              Ver por data
            </button>
            <span className="text-muted-foreground text-xs">·</span>
            <button
              type="button"
              onClick={() => openStatementModal()}
              className="inline-flex items-center gap-1 text-xs font-medium text-foreground hover:text-primary cursor-pointer"
            >
              <Upload className="h-3 w-3" /> Enviar extrato
            </button>
          </div>
        </div>
      </div>

      {/* Navegação entre Livro Caixa e Extratos das Contas */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
        <div className="inline-flex rounded-xl border border-border bg-muted/40 p-1">
          <button
            type="button"
            onClick={() => setActiveTab('ledger')}
            className={cn(
              'min-h-9 rounded-lg px-3.5 text-xs font-semibold transition-colors cursor-pointer inline-flex items-center gap-1.5',
              activeTab === 'ledger'
                ? 'bg-background text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <FileSpreadsheet className="h-3.5 w-3.5" />
            Livro Caixa & Gráficos ({data.entries.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('statements')}
            className={cn(
              'min-h-9 rounded-lg px-3.5 text-xs font-semibold transition-colors cursor-pointer inline-flex items-center gap-1.5',
              activeTab === 'statements'
                ? 'bg-background text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <FileText className="h-3.5 w-3.5" />
            Extratos das Contas ({statementCounts.total})
          </button>
        </div>

        {activeTab === 'statements' && (
          <button
            type="button"
            onClick={() => openStatementModal()}
            className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-primary px-3.5 text-xs font-semibold text-primary-foreground shadow-xs hover:bg-primary/90 cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            Enviar Extrato
          </button>
        )}
      </div>

      {activeTab === 'ledger' ? (
        <>
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
        </>
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden shadow-xs">
          <div className="border-b border-border bg-muted/35 px-4 py-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-1.5">
              {[
                { value: 'ALL' as const, label: `Todas as contas (${statementCounts.total})` },
                { value: 'Dinheiro Livre' as const, label: `Dinheiro Livre (${statementCounts.livre})` },
                { value: 'Conta Coppetec' as const, label: `Conta Coppetec (${statementCounts.coppetec})` },
              ].map(tab => (
                <button
                  key={tab.value}
                  type="button"
                  onClick={() => setStatementFundFilter(tab.value)}
                  className={cn(
                    'min-h-8 rounded-lg px-3 text-xs font-medium transition-colors cursor-pointer',
                    statementFundFilter === tab.value
                      ? 'bg-primary text-primary-foreground shadow-xs'
                      : 'bg-background text-muted-foreground hover:text-foreground border border-border'
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="relative min-w-[220px] flex-1 max-w-xs">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="search"
                value={statementSearch}
                onChange={e => setStatementSearch(e.target.value)}
                placeholder="Buscar extrato por data, nome ou conta…"
                className="min-h-9 w-full rounded-lg border border-input bg-background pl-9 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          </div>

          {filteredStatements.length === 0 ? (
            <div className="px-6 py-12 text-center space-y-3">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <FileText className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-foreground">
                  {statementFundFilter === 'ALL'
                    ? 'Nenhum extrato encontrado para esse filtro.'
                    : `Nenhum extrato registrado ainda para ${statementFundFilter}.`}
                </p>
                <p className="text-xs text-muted-foreground">
                  Envie extratos bancários ou relatórios da conta em PDF, imagem, CSV ou OFX organizados por data.
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  openStatementModal(
                    statementFundFilter === 'ALL' ? 'Dinheiro Livre' : statementFundFilter
                  )
                }
                className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-primary px-3.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 cursor-pointer"
              >
                <Upload className="h-3.5 w-3.5" />
                Enviar primeiro extrato
                {statementFundFilter !== 'ALL' ? ` (${statementFundFilter})` : ''}
              </button>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filteredStatements.map(stmt => {
                const isCoppetec = stmt.fundSource === 'Conta Coppetec';
                return (
                  <div
                    key={stmt.id}
                    className="flex flex-wrap items-center justify-between gap-4 px-4 py-3.5 hover:bg-muted/20"
                  >
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <div className="flex flex-col items-center justify-center rounded-lg border border-border bg-muted/40 px-2.5 py-1.5 text-center shrink-0 min-w-[78px]">
                        <span className="inline-flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          Data
                        </span>
                        <span className="font-mono text-xs font-semibold text-foreground tabular-nums">
                          {formatFinanceDate(stmt.referenceDate)}
                        </span>
                      </div>

                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium text-sm text-foreground">
                            {stmt.title}
                          </span>
                          <span
                            className={cn(
                              'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium border',
                              isCoppetec
                                ? 'border-sky-500/30 bg-sky-500/10 text-sky-600 dark:text-sky-400'
                                : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                            )}
                          >
                            {isCoppetec ? (
                              <Landmark className="h-3 w-3" />
                            ) : (
                              <Wallet className="h-3 w-3" />
                            )}
                            {stmt.fundSource}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          Arquivo: <span className="font-mono">{stmt.fileName}</span>
                          {stmt.uploadedByName ? ` · Enviado por ${stmt.uploadedByName}` : ''}
                        </p>
                        {stmt.notes && (
                          <p className="text-xs text-muted-foreground">{stmt.notes}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <a
                        href={stmt.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-border bg-background px-3 text-xs font-medium text-foreground hover:bg-accent"
                      >
                        <ExternalLink className="h-3.5 w-3.5 text-primary" />
                        Abrir / Baixar
                      </a>
                      <button
                        type="button"
                        onClick={() => handleDeleteStatement(stmt)}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border text-destructive hover:bg-destructive/10 cursor-pointer"
                        title="Remover extrato"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

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

      {/* Modal de Upload de Extrato */}
      <Dialog open={statementModalOpen} onOpenChange={setStatementModalOpen}>
        <DialogContent className="sm:max-w-lg border-border bg-card text-foreground">
          <DialogHeader>
            <DialogTitle className="font-display">Enviar Extrato de Conta</DialogTitle>
            <DialogDescription>
              Registre um extrato bancário ou relatório da conta (Dinheiro Livre ou Conta Coppetec) ordenado por data.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateStatement} className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  Conta / Origem
                </label>
                <select
                  value={stmtFund}
                  onChange={e => setStmtFund(e.target.value as (typeof FINANCE_FUNDS)[number])}
                  className="min-h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground"
                >
                  {FINANCE_FUNDS.map(fund => (
                    <option key={fund} value={fund}>
                      {fund}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  Data de referência
                </label>
                <input
                  type="date"
                  required
                  value={stmtDate}
                  onChange={e => setStmtDate(e.target.value)}
                  className="min-h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                Título do extrato
              </label>
              <input
                type="text"
                required
                value={stmtTitle}
                onChange={e => setStmtTitle(e.target.value)}
                placeholder="Ex: Extrato Itaú — Fevereiro/2026 ou Relatório Coppetec Q1"
                className="min-h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                Arquivo do extrato (PDF, imagem, CSV ou OFX)
              </label>
              <label className="flex min-h-12 cursor-pointer items-center justify-between gap-3 rounded-lg border border-dashed border-border bg-muted/30 px-3 py-2 text-xs hover:bg-muted/50">
                <span className="truncate text-foreground">
                  {uploadingStmtFile
                    ? 'Enviando arquivo para o Supabase…'
                    : stmtUploadedFile
                      ? `Anexado: ${stmtUploadedFile.name}`
                      : 'Clique para selecionar o arquivo (máx. 10 MB)'}
                </span>
                <span className="inline-flex shrink-0 items-center gap-1 rounded-md bg-primary/10 px-2.5 py-1 font-medium text-primary">
                  <Upload className="h-3.5 w-3.5" />
                  {stmtUploadedFile ? 'Trocar' : 'Selecionar'}
                </span>
                <input
                  type="file"
                  accept="image/*,.pdf,.csv,.ofx"
                  className="sr-only"
                  disabled={uploadingStmtFile}
                  onChange={e => {
                    const file = e.target.files?.[0];
                    if (file) void handleStatementFileUpload(file);
                    e.target.value = '';
                  }}
                />
              </label>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                Observações (opcional)
              </label>
              <textarea
                rows={2}
                value={stmtNotes}
                onChange={e => setStmtNotes(e.target.value)}
                placeholder="Ex: Fechamento mensal conferido com o saldo em conta"
                className="w-full rounded-lg border border-input bg-background p-2.5 text-sm text-foreground"
              />
            </div>

            <DialogFooter className="gap-2">
              <button
                type="button"
                onClick={() => setStatementModalOpen(false)}
                className="min-h-10 rounded-lg border border-border px-4 text-xs font-medium text-muted-foreground hover:bg-accent cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={savingStmt || uploadingStmtFile || !stmtUploadedFile}
                className="inline-flex min-h-10 items-center gap-1.5 rounded-lg bg-primary px-4 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60 cursor-pointer"
              >
                <Check className="h-4 w-4" />
                {savingStmt ? 'Salvando…' : 'Salvar extrato'}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
