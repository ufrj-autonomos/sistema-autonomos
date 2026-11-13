'use client';

import { useMemo, useState } from 'react';
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  CreditCard,
  DollarSign,
  FileText,
  Filter,
  Plus,
  Receipt,
  Search,
  Upload,
  Wallet,
  X,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/institutional/ui/dialog';
import { cn } from '@/lib/utils';

type ReimbursementStatus = 'PENDENTE' | 'APROVADO' | 'PAGO' | 'RECUSADO';
type TeamDivision = 'Harpia' | 'Nautilus' | 'Geral';
type ReimbursementCategory =
  | 'Peças e Componentes'
  | 'Ferramentas e Lab'
  | 'Viagem e Competição'
  | 'Software e Cloud'
  | 'Eventos';

type ReimbursementItem = {
  id: string;
  title: string;
  requesterName: string;
  requesterArea: string;
  team: TeamDivision;
  category: ReimbursementCategory;
  amountCents: number;
  purchaseDate: string;
  createdAt: string;
  pixKey: string;
  receiptName: string;
  status: ReimbursementStatus;
  notes?: string;
};

const INITIAL_DEMO_ITEMS: ReimbursementItem[] = [
  {
    id: 'RMB-042',
    title: 'Conjunto de conectores XT60 e cabos silicone 12AWG',
    requesterName: 'Lucas Andrade',
    requesterArea: 'Eletrônica',
    team: 'Harpia',
    category: 'Peças e Componentes',
    amountCents: 24890,
    purchaseDate: '2026-11-08',
    createdAt: '2026-11-09',
    pixKey: 'lucas.andrade@poli.ufrj.br',
    receiptName: 'nf-loja-eletronica-042.pdf',
    status: 'PENDENTE',
    notes: 'Reposição urgente para chicote de potência do drone VANT-4.',
  },
  {
    id: 'RMB-041',
    title: 'Vedação O-ring Viton e graxa dielétrica para casco estanque',
    requesterName: 'Mariana Costa',
    requesterArea: 'Mecânica',
    team: 'Nautilus',
    category: 'Peças e Componentes',
    amountCents: 31500,
    purchaseDate: '2026-11-05',
    createdAt: '2026-11-06',
    pixKey: '(21) 99812-3341',
    receiptName: 'comprovante-vedacao-nautilus.jpg',
    status: 'APROVADO',
    notes: 'Aprovado pela coordenação da divisão Nautilus.',
  },
  {
    id: 'RMB-040',
    title: 'Inscrição e logística de transporte para feira de robótica CT',
    requesterName: 'Rafael Nogueira',
    requesterArea: 'Marketing',
    team: 'Geral',
    category: 'Eventos',
    amountCents: 18500,
    purchaseDate: '2026-10-29',
    createdAt: '2026-10-30',
    pixKey: '124.890.312-00',
    receiptName: 'recibo-impressao-banners.pdf',
    status: 'PAGO',
    notes: 'Pago via PIX em 02/11 pela tesouraria.',
  },
  {
    id: 'RMB-039',
    title: 'Créditos de GPU para treinamento de visão computacional',
    requesterName: 'Bianca Rocha',
    requesterArea: 'Software',
    team: 'Harpia',
    category: 'Software e Cloud',
    amountCents: 14250,
    purchaseDate: '2026-10-24',
    createdAt: '2026-10-25',
    pixKey: 'bianca.rocha@ufrj.br',
    receiptName: 'invoice-cloud-gpu.pdf',
    status: 'PENDENTE',
    notes: 'Treinamento do detector de alvos aéreos.',
  },
];

function formatBRL(cents: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);
}

const STATUS_STYLE: Record<ReimbursementStatus, { label: string; cls: string }> = {
  PENDENTE: {
    label: 'Pendente',
    cls: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30',
  },
  APROVADO: {
    label: 'Aprovado (A pagar)',
    cls: 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30',
  },
  PAGO: {
    label: 'Pago',
    cls: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
  },
  RECUSADO: {
    label: 'Recusado',
    cls: 'bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/30',
  },
};

const TEAM_STYLE: Record<TeamDivision, string> = {
  Harpia: 'bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/30',
  Nautilus: 'bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/30',
  Geral: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
};

export function ReimbursementsClient({ currentUserName }: { currentUserName: string }) {
  const [items, setItems] = useState<ReimbursementItem[]>(INITIAL_DEMO_ITEMS);
  const [teamFilter, setTeamFilter] = useState<'all' | TeamDivision>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | ReimbursementStatus>('all');
  const [categoryFilter, setCategoryFilter] = useState<'all' | ReimbursementCategory>('all');
  const [search, setSearch] = useState('');
  const [selectedItem, setSelectedItem] = useState<ReimbursementItem | null>(null);
  const [creatingOpen, setCreatingOpen] = useState(false);

  // Form states for new reimbursement modal
  const [formTitle, setFormTitle] = useState('');
  const [formTeam, setFormTeam] = useState<TeamDivision>('Geral');
  const [formCategory, setFormCategory] = useState<ReimbursementCategory>('Peças e Componentes');
  const [formAmount, setFormAmount] = useState('');
  const [formPurchaseDate, setFormPurchaseDate] = useState('2026-11-12');
  const [formPixKey, setFormPixKey] = useState('');
  const [formReceiptName, setFormReceiptName] = useState('');
  const [formNotes, setFormNotes] = useState('');

  const metrics = useMemo(() => {
    const pendingCents = items.filter(i => i.status === 'PENDENTE').reduce((acc, i) => acc + i.amountCents, 0);
    const approvedCents = items.filter(i => i.status === 'APROVADO').reduce((acc, i) => acc + i.amountCents, 0);
    const paidCents = items.filter(i => i.status === 'PAGO').reduce((acc, i) => acc + i.amountCents, 0);
    const pendingCount = items.filter(i => i.status === 'PENDENTE').length;
    const approvedCount = items.filter(i => i.status === 'APROVADO').length;
    return { pendingCents, approvedCents, paidCents, pendingCount, approvedCount };
  }, [items]);

  const filtered = useMemo(() => {
    const q = search.trim().toLocaleLowerCase('pt-BR');
    return items.filter(item => {
      if (teamFilter !== 'all' && item.team !== teamFilter) return false;
      if (statusFilter !== 'all' && item.status !== statusFilter) return false;
      if (categoryFilter !== 'all' && item.category !== categoryFilter) return false;
      if (q) {
        const hay = `${item.id} ${item.title} ${item.requesterName} ${item.category} ${item.pixKey}`.toLocaleLowerCase('pt-BR');
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [items, teamFilter, statusFilter, categoryFilter, search]);

  function updateStatus(id: string, nextStatus: ReimbursementStatus) {
    setItems(prev => prev.map(item => (item.id === id ? { ...item, status: nextStatus } : item)));
    if (selectedItem?.id === id) {
      setSelectedItem({ ...selectedItem, status: nextStatus });
    }
    const label = STATUS_STYLE[nextStatus].label;
    toast.success(`Solicitação ${id} marcada como "${label}" (prévia local).`);
  }

  function handleCreateSubmit(e: React.FormEvent) {
    e.preventDefault();
    const numeric = Number(formAmount.replace(',', '.'));
    if (!formTitle.trim() || !Number.isFinite(numeric) || numeric <= 0 || !formPixKey.trim()) {
      toast.error('Preencha descrição, valor válido e chave PIX.');
      return;
    }

    const newItem: ReimbursementItem = {
      id: `RMB-${String(items.length + 40).padStart(3, '0')}`,
      title: formTitle.trim(),
      requesterName: currentUserName,
      requesterArea: 'Gestão',
      team: formTeam,
      category: formCategory,
      amountCents: Math.round(numeric * 100),
      purchaseDate: formPurchaseDate,
      createdAt: new Date().toISOString().slice(0, 10),
      pixKey: formPixKey.trim(),
      receiptName: formReceiptName.trim() || 'nota-fiscal-anexada.pdf',
      status: 'PENDENTE',
      notes: formNotes.trim() || undefined,
    };

    setItems(prev => [newItem, ...prev]);
    setCreatingOpen(false);
    setFormTitle('');
    setFormAmount('');
    setFormPixKey('');
    setFormReceiptName('');
    setFormNotes('');
    toast.success(`Solicitação ${newItem.id} adicionada na prévia local!`);
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-5">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-300 mb-2">
            <Wallet className="h-3.5 w-3.5" />
            Módulo Financeiro · Protótipo Front-end
          </div>
          <h1 className="font-display text-3xl font-semibold text-foreground">
            Gestão de Reembolsos
          </h1>
          <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground leading-relaxed">
            Centralize solicitações de reembolso de peças, competições e despesas operacionais por divisão, confira notas fiscais, chaves PIX e acompanhe aprovações.
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

      {/* Aviso de Protótipo Frontend */}
      <div className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-xs text-amber-800 dark:text-amber-200">
        <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
        <p className="leading-relaxed">
          <strong>Visualização Front-end:</strong> Os registros exibidos abaixo são exemplos interativos para validação do fluxo financeiro. Você pode criar solicitações, aprovar, marcar como pago e filtrar normalmente nesta sessão antes da integração com o banco de dados.
        </p>
      </div>

      {/* KPIs Financeiros */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">Aguardando Aprovação</span>
            <Clock className="h-4 w-4 text-amber-500" />
          </div>
          <p className="mt-3 font-display text-2xl font-bold tabular-nums text-foreground">
            {formatBRL(metrics.pendingCents)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {metrics.pendingCount} {metrics.pendingCount === 1 ? 'solicitação pendente' : 'solicitações pendentes'}
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
            {metrics.approvedCount} {metrics.approvedCount === 1 ? 'PIX aguardando envio' : 'PIX aguardando envio'}
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
          <p className="mt-1 text-xs text-muted-foreground">pagamentos concluídos no ciclo</p>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Movimentado</span>
            <DollarSign className="h-4 w-4 text-primary" />
          </div>
          <p className="mt-3 font-display text-2xl font-bold tabular-nums text-foreground">
            {formatBRL(metrics.pendingCents + metrics.approvedCents + metrics.paidCents)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">{items.length} solicitações registradas</p>
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
                onClick={() => setTeamFilter(tab.value as typeof teamFilter)}
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
            {(['all', 'PENDENTE', 'APROVADO', 'PAGO', 'RECUSADO'] as const).map(st => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={cn(
                  'rounded-md px-2.5 py-1 transition-colors cursor-pointer',
                  statusFilter === st ? 'bg-accent font-semibold text-foreground' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {st === 'all' ? 'Todos status' : STATUS_STYLE[st].label}
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
            onChange={e => setCategoryFilter(e.target.value as typeof categoryFilter)}
            aria-label="Filtrar por categoria"
            className="min-h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground"
          >
            <option value="all">Todas as categorias</option>
            <option value="Peças e Componentes">Peças e Componentes</option>
            <option value="Ferramentas e Lab">Ferramentas e Lab</option>
            <option value="Viagem e Competição">Viagem e Competição</option>
            <option value="Software e Cloud">Software e Cloud</option>
            <option value="Eventos">Eventos</option>
          </select>
        </div>

        {/* Tabela de Reembolsos */}
        {filtered.length === 0 ? (
          <div className="py-16 px-4 text-center">
            <Filter className="mx-auto h-8 w-8 text-muted-foreground mb-3" />
            <p className="text-sm font-medium text-foreground">Nenhuma solicitação encontrada</p>
            <p className="mt-1 text-xs text-muted-foreground">Ajuste os filtros acima ou crie uma nova solicitação de reembolso.</p>
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
                  <th className="px-4 py-3 font-medium text-right">Valor</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map(item => (
                  <tr key={item.id} className="hover:bg-muted/25 transition-colors">
                    <td className="px-4 py-3.5 max-w-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[11px] font-semibold text-muted-foreground">{item.id}</span>
                        <span className="text-[11px] text-muted-foreground">· {item.purchaseDate}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedItem(item)}
                        className="mt-0.5 block text-left font-medium text-foreground hover:underline cursor-pointer line-clamp-1"
                      >
                        {item.title}
                      </button>
                    </td>
                    <td className="px-4 py-3.5">
                      <p className="font-medium text-foreground text-xs">{item.requesterName}</p>
                      <p className="text-[11px] text-muted-foreground">{item.requesterArea}</p>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={cn('inline-flex rounded-full border px-2 py-0.5 font-mono text-[11px]', TEAM_STYLE[item.team])}>
                        {item.team}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-xs text-muted-foreground">{item.category}</td>
                    <td className="px-4 py-3.5 text-right font-mono font-semibold tabular-nums text-foreground">
                      {formatBRL(item.amountCents)}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={cn('inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-medium', STATUS_STYLE[item.status].cls)}>
                        {STATUS_STYLE[item.status].label}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        {item.status === 'PENDENTE' && (
                          <>
                            <button
                              type="button"
                              onClick={() => updateStatus(item.id, 'APROVADO')}
                              className="inline-flex h-8 items-center gap-1 rounded-md bg-emerald-600 px-2.5 text-xs font-medium text-white hover:bg-emerald-700 cursor-pointer"
                              title="Aprovar solicitação"
                            >
                              <Check className="h-3.5 w-3.5" /> Aprovar
                            </button>
                            <button
                              type="button"
                              onClick={() => updateStatus(item.id, 'RECUSADO')}
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
                            onClick={() => updateStatus(item.id, 'PAGO')}
                            className="inline-flex h-8 items-center gap-1 rounded-md bg-blue-600 px-2.5 text-xs font-medium text-white hover:bg-blue-700 cursor-pointer"
                          >
                            <DollarSign className="h-3.5 w-3.5" /> Marcar Pago
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setSelectedItem(item)}
                          className="inline-flex h-8 items-center gap-1 rounded-md border border-border px-2.5 text-xs text-foreground hover:bg-accent cursor-pointer"
                        >
                          <Receipt className="h-3.5 w-3.5" /> Detalhes
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de Detalhes / Nota Fiscal / PIX */}
      <Dialog open={Boolean(selectedItem)} onOpenChange={open => !open && setSelectedItem(null)}>
        <DialogContent className="sm:max-w-lg border-border bg-card text-foreground">
          <DialogHeader>
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-xs text-muted-foreground">{selectedItem?.id}</span>
              {selectedItem && (
                <span className={cn('inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-medium', STATUS_STYLE[selectedItem.status].cls)}>
                  {STATUS_STYLE[selectedItem.status].label}
                </span>
              )}
            </div>
            <DialogTitle className="font-display text-lg font-semibold pt-1">
              {selectedItem?.title}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Solicitado por {selectedItem?.requesterName} ({selectedItem?.requesterArea}) · Divisão {selectedItem?.team}
            </DialogDescription>
          </DialogHeader>

          {selectedItem && (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3 rounded-xl border border-border bg-muted/30 p-4">
                <div>
                  <p className="text-xs text-muted-foreground">Valor do reembolso</p>
                  <p className="font-display text-2xl font-bold text-foreground mt-0.5">
                    {formatBRL(selectedItem.amountCents)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Data da compra</p>
                  <p className="font-mono text-sm font-medium text-foreground mt-1">{selectedItem.purchaseDate}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{selectedItem.category}</p>
                </div>
              </div>

              <div className="rounded-xl border border-border p-3.5 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Chave PIX para transferência</p>
                  <p className="font-mono text-xs font-semibold text-foreground truncate mt-0.5">{selectedItem.pixKey}</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard?.writeText(selectedItem.pixKey);
                    toast.success('Chave PIX copiada!');
                  }}
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border px-3 text-xs font-medium hover:bg-accent cursor-pointer shrink-0"
                >
                  <Copy className="h-3.5 w-3.5" /> Copiar PIX
                </button>
              </div>

              <div className="rounded-xl border border-border p-3.5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <FileText className="h-5 w-5 text-primary shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">Comprovante / Nota Fiscal</p>
                    <p className="text-xs font-medium text-foreground truncate">{selectedItem.receiptName}</p>
                  </div>
                </div>
                <span className="rounded-md bg-muted px-2 py-1 text-[10px] font-mono text-muted-foreground">Anexado</span>
              </div>

              {selectedItem.notes && (
                <div className="rounded-lg bg-muted/40 p-3 text-xs text-secondary-foreground border border-border/60">
                  <strong className="text-foreground">Observações:</strong> {selectedItem.notes}
                </div>
              )}
            </div>
          )}

          <DialogFooter className="flex-wrap justify-between gap-2 border-t border-border pt-3">
            <div className="flex flex-wrap items-center gap-2">
              {selectedItem?.status === 'PENDENTE' && (
                <>
                  <button
                    type="button"
                    onClick={() => updateStatus(selectedItem.id, 'RECUSADO')}
                    className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-red-500/30 bg-red-500/10 px-3 text-xs font-medium text-red-700 dark:text-red-300 hover:bg-red-500/20 cursor-pointer"
                  >
                    <X className="h-3.5 w-3.5" /> Recusar
                  </button>
                  <button
                    type="button"
                    onClick={() => updateStatus(selectedItem.id, 'APROVADO')}
                    className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 text-xs font-semibold text-white hover:bg-emerald-700 cursor-pointer"
                  >
                    <Check className="h-3.5 w-3.5" /> Aprovar reembolso
                  </button>
                </>
              )}
              {selectedItem?.status === 'APROVADO' && (
                <button
                  type="button"
                  onClick={() => updateStatus(selectedItem.id, 'PAGO')}
                  className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 text-xs font-semibold text-white hover:bg-blue-700 cursor-pointer"
                >
                  <DollarSign className="h-3.5 w-3.5" /> Confirmar pagamento PIX
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={() => setSelectedItem(null)}
              className="inline-flex min-h-9 items-center rounded-lg border border-border px-3.5 text-xs font-medium hover:bg-accent cursor-pointer"
            >
              Fechar
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Nova Solicitação de Reembolso */}
      <Dialog open={creatingOpen} onOpenChange={setCreatingOpen}>
        <DialogContent className="sm:max-w-lg border-border bg-card text-foreground">
          <DialogHeader>
            <DialogTitle className="font-display text-lg font-semibold">Nova Solicitação de Reembolso</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Preencha os dados da compra e a chave PIX para envio à coordenação financeira.
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

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground" htmlFor="rmb-team">
                  Divisão / Equipe *
                </label>
                <select
                  id="rmb-team"
                  value={formTeam}
                  onChange={e => setFormTeam(e.target.value as TeamDivision)}
                  className="min-h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground"
                >
                  <option value="Geral">UFRJ Autônomos (Geral)</option>
                  <option value="Harpia">Harpia</option>
                  <option value="Nautilus">Nautilus</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground" htmlFor="rmb-cat">
                  Categoria *
                </label>
                <select
                  id="rmb-cat"
                  value={formCategory}
                  onChange={e => setFormCategory(e.target.value as ReimbursementCategory)}
                  className="min-h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground"
                >
                  <option value="Peças e Componentes">Peças e Componentes</option>
                  <option value="Ferramentas e Lab">Ferramentas e Lab</option>
                  <option value="Viagem e Competição">Viagem e Competição</option>
                  <option value="Software e Cloud">Software e Cloud</option>
                  <option value="Eventos">Eventos</option>
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

            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground" htmlFor="rmb-pix">
                Chave PIX para recebimento *
              </label>
              <input
                id="rmb-pix"
                required
                value={formPixKey}
                onChange={e => setFormPixKey(e.target.value)}
                placeholder="CPF, E-mail, Telefone ou Chave aleatória"
                className="min-h-10 w-full rounded-lg border border-input bg-background px-3 text-sm font-mono text-foreground"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground" htmlFor="rmb-file">
                Comprovante / Nota Fiscal (PDF ou Imagem)
              </label>
              <label
                htmlFor="rmb-file"
                className="flex cursor-pointer items-center justify-between rounded-lg border border-dashed border-border bg-muted/30 px-3 py-2.5 text-xs text-muted-foreground hover:bg-muted/60"
              >
                <span className="flex items-center gap-2 truncate">
                  <Upload className="h-4 w-4 text-primary shrink-0" />
                  {formReceiptName || 'Clique para anexar nota fiscal ou recibo'}
                </span>
                <span className="font-mono text-[10px] text-primary">Selecionar</span>
                <input
                  id="rmb-file"
                  type="file"
                  accept="image/*,.pdf"
                  className="sr-only"
                  onChange={e => setFormReceiptName(e.target.files?.[0]?.name || '')}
                />
              </label>
            </div>

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
                className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-primary px-4 text-xs font-semibold text-primary-foreground hover:bg-primary/90 cursor-pointer"
              >
                <Check className="h-4 w-4" />
                Registrar solicitação
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
