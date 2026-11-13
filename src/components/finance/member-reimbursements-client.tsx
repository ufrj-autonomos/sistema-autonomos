'use client';

import { useState } from 'react';
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Clock,
  CreditCard,
  KeyRound,
  Paperclip,
  Plus,
  Receipt,
  Save,
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
  FINANCE_TEAMS,
  FINANCIAL_STATUS_META,
  PIX_KEY_TYPES,
  formatBRL,
  formatFinanceDate,
  type FinancialEntryDTO,
  type MemberReimbursementsData,
} from '@/lib/finance/constants';
import {
  AttachmentGallery,
  ReceiptUploader,
  type UploadedAttachmentDraft,
} from '@/components/finance/attachment-gallery';
import { cn } from '@/lib/utils';

export function MemberReimbursementsClient({
  initialData,
  defaultTeam,
}: {
  initialData: MemberReimbursementsData;
  defaultTeam: string;
}) {
  const [data, setData] = useState<MemberReimbursementsData>(initialData);

  // Chave PIX padrão do membro
  const [pixTypeInput, setPixTypeInput] = useState(initialData.member.pixKeyType || 'CPF');
  const [pixInput, setPixInput] = useState(initialData.member.pixKey || '');
  const [savingPix, setSavingPix] = useState(false);

  // Modal de nova solicitação
  const [creatingOpen, setCreatingOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<string>('Eletrônica');
  const [team, setTeam] = useState<string>(defaultTeam);
  const [amount, setAmount] = useState('');
  const [occurredAt, setOccurredAt] = useState(() => new Date().toISOString().slice(0, 10));
  const [reqPixType, setReqPixType] = useState(initialData.member.pixKeyType || 'CPF');
  const [reqPixKey, setReqPixKey] = useState(initialData.member.pixKey || '');
  const [description, setDescription] = useState('');
  const [drafts, setDrafts] = useState<UploadedAttachmentDraft[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // Modal de detalhe/complemento do pedido
  const [selected, setSelected] = useState<FinancialEntryDTO | null>(null);
  const [editAmount, setEditAmount] = useState('');
  const [editPixType, setEditPixType] = useState('CPF');
  const [editPixKey, setEditPixKey] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editDrafts, setEditDrafts] = useState<UploadedAttachmentDraft[]>([]);
  const [savingDetail, setSavingDetail] = useState(false);

  async function refreshMine(reopenId?: string) {
    const res = await fetch('/api/financeiro?scope=mine', { cache: 'no-store' });
    if (!res.ok) return;
    const json = (await res.json()) as MemberReimbursementsData & { scope?: string };
    setData({ member: json.member, entries: json.entries, summary: json.summary });
    if (json.member.pixKey) {
      setPixInput(json.member.pixKey);
      setReqPixKey(json.member.pixKey);
    }
    if (json.member.pixKeyType) {
      setPixTypeInput(json.member.pixKeyType);
      setReqPixType(json.member.pixKeyType);
    }
    if (reopenId) {
      const found = json.entries.find(e => e.id === reopenId) || null;
      setSelected(found);
    }
  }

  async function handleSaveDefaultPix(e: React.FormEvent) {
    e.preventDefault();
    if (!pixInput.trim()) {
      toast.error('Informe sua chave PIX para salvar.');
      return;
    }
    setSavingPix(true);
    try {
      const res = await fetch('/api/financeiro', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_pix',
          pixKey: pixInput.trim(),
          pixKeyType: pixTypeInput,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error || 'Não foi possível salvar sua chave PIX.');
        return;
      }
      toast.success('Chave PIX padrão salva no seu perfil!');
      await refreshMine();
    } catch {
      toast.error('Erro de conexão ao salvar chave PIX.');
    } finally {
      setSavingPix(false);
    }
  }

  async function handleCreateSubmit(e: React.FormEvent) {
    e.preventDefault();
    const numeric = Number(amount.replace(/\./g, '').replace(',', '.'));
    if (!title.trim() || !Number.isFinite(numeric) || numeric <= 0) {
      toast.error('Informe uma descrição e um valor maior que R$ 0,00.');
      return;
    }
    if (!reqPixKey.trim()) {
      toast.error('Informe a chave PIX para receber o reembolso.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/financeiro', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'SAIDA',
          isReimbursement: true,
          title: title.trim(),
          category,
          team,
          amountCents: Math.round(numeric * 100),
          occurredAt,
          pixKeyType: reqPixType,
          pixKey: reqPixKey.trim(),
          description: description.trim() || null,
          attachments: drafts,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error || 'Não foi possível enviar sua solicitação.');
        return;
      }

      toast.success(`Solicitação ${json.entry.code} enviada para a tesouraria!`);
      setCreatingOpen(false);
      setTitle('');
      setAmount('');
      setDescription('');
      setDrafts([]);
      await refreshMine();
    } catch {
      toast.error('Erro de conexão ao enviar solicitação.');
    } finally {
      setSubmitting(false);
    }
  }

  function openDetail(item: FinancialEntryDTO) {
    setSelected(item);
    setEditAmount((item.amountCents / 100).toFixed(2).replace('.', ','));
    setEditPixType(item.pixKeyType || data.member.pixKeyType || 'CPF');
    setEditPixKey(item.pixKey || data.member.pixKey || '');
    setEditDescription(item.description || '');
    setEditDrafts([]);
  }

  async function handleUpdateSelected(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) return;
    const numeric = Number(editAmount.replace(/\./g, '').replace(',', '.'));
    if (!Number.isFinite(numeric) || numeric < 0) {
      toast.error('Valor inválido.');
      return;
    }

    setSavingDetail(true);
    try {
      const res = await fetch(`/api/financeiro/${selected.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amountCents: Math.round(numeric * 100),
          pixKeyType: editPixType,
          pixKey: editPixKey.trim() || null,
          description: editDescription.trim() || null,
          addAttachments: editDrafts,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error || 'Erro ao atualizar pedido.');
        return;
      }
      toast.success(`Pedido ${selected.code} atualizado!`);
      setEditDrafts([]);
      await refreshMine(selected.id);
    } catch {
      toast.error('Erro de conexão ao atualizar pedido.');
    } finally {
      setSavingDetail(false);
    }
  }

  const hasSavedPix = Boolean(data.member.pixKey?.trim());

  return (
    <div className="mx-auto w-full max-w-[1440px] px-3 sm:px-6 py-6 sm:py-8 space-y-6">
      {/* Cabeçalho */}
      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-5">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-300 mb-2">
            <Wallet className="h-3.5 w-3.5" />
            Portal de Reembolsos · UFRJ Autônomos
          </div>
          <h1 className="font-display text-3xl font-semibold text-foreground">
            Meus Reembolsos
          </h1>
          <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground leading-relaxed">
            Solicite o reembolso de compras aprovadas pela equipe, anexe notas fiscais ou recibos e acompanhe o status do pagamento via PIX.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setReqPixKey(data.member.pixKey || pixInput || '');
            setReqPixType(data.member.pixKeyType || pixTypeInput || 'CPF');
            setCreatingOpen(true);
          }}
          className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          Solicitar reembolso
        </button>
      </header>

      {/* Card de Chave PIX Padrão */}
      <form
        onSubmit={handleSaveDefaultPix}
        className={cn(
          'rounded-xl border p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4',
          hasSavedPix
            ? 'border-border bg-card'
            : 'border-amber-500/40 bg-amber-500/10'
        )}
      >
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <KeyRound className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-foreground">
              Minha Chave PIX para Recebimento
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {hasSavedPix
                ? 'Sua chave PIX fica salva para preencher automaticamente suas próximas solicitações.'
                : 'Cadastre sua chave PIX abaixo para agilizar os reembolsos da tesouraria.'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={pixTypeInput}
            onChange={e => setPixTypeInput(e.target.value)}
            aria-label="Tipo da chave PIX"
            className="min-h-10 rounded-lg border border-input bg-background px-3 text-xs font-medium text-foreground"
          >
            {PIX_KEY_TYPES.map(t => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <input
            value={pixInput}
            onChange={e => setPixInput(e.target.value)}
            placeholder="Digite seu CPF, e-mail, celular ou chave aleatória"
            className="min-h-10 w-full sm:w-64 rounded-lg border border-input bg-background px-3 text-xs font-mono text-foreground"
          />
          <button
            type="submit"
            disabled={savingPix}
            className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-border bg-background px-3.5 text-xs font-semibold text-foreground hover:bg-accent disabled:opacity-60 cursor-pointer"
          >
            <Save className="h-3.5 w-3.5" />
            {savingPix ? 'Salvando…' : 'Salvar PIX'}
          </button>
        </div>
      </form>

      {/* KPIs do Membro */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">Em Análise / Aguardando</span>
            <Clock className="h-4 w-4 text-amber-500" />
          </div>
          <p className="mt-2.5 font-display text-2xl font-bold tabular-nums text-amber-600 dark:text-amber-400">
            {formatBRL(data.summary.awaitingCents)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {data.summary.awaitingCount} {data.summary.awaitingCount === 1 ? 'pedido pendente' : 'pedidos pendentes'}
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">Aprovado (PIX na fila)</span>
            <CreditCard className="h-4 w-4 text-blue-500" />
          </div>
          <p className="mt-2.5 font-display text-2xl font-bold tabular-nums text-blue-600 dark:text-blue-400">
            {formatBRL(data.summary.approvedCents)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {data.summary.approvedCount} aprovado(s) aguardando envio
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Já Reembolsado</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </div>
          <p className="mt-2.5 font-display text-2xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
            {formatBRL(data.summary.paidCents)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {data.summary.paidCount} reembolso(s) concluído(s)
          </p>
        </div>
      </div>

      {/* Lista de Pedidos do Membro */}
      <div className="rounded-xl border border-border bg-card overflow-hidden shadow-xs">
        <div className="border-b border-border bg-muted/30 px-4 py-3 flex items-center justify-between">
          <h2 className="font-display text-base font-semibold text-foreground">
            Minhas Solicitações ({data.entries.length})
          </h2>
        </div>

        {data.entries.length === 0 ? (
          <div className="py-16 px-4 text-center">
            <Receipt className="mx-auto h-9 w-9 text-muted-foreground mb-3" />
            <p className="text-sm font-medium text-foreground">
              Você ainda não possui solicitações de reembolso
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Clique em &ldquo;Solicitar reembolso&rdquo; acima quando comprar algum item para a equipe.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {data.entries.map(item => {
              const statusMeta = FINANCIAL_STATUS_META[item.status];
              const needsInfo =
                (item.status === 'AGUARDANDO_REEMBOLSO' || item.status === 'AGUARDANDO_NF') &&
                (item.amountCents === 0 || !item.pixKey || item.attachments.length === 0);

              return (
                <div
                  key={item.id}
                  onClick={() => openDetail(item)}
                  className="p-4 hover:bg-muted/25 transition-colors cursor-pointer flex flex-wrap items-center justify-between gap-4"
                >
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-semibold text-muted-foreground">
                        {item.code}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        · {formatFinanceDate(item.occurredAt)}
                      </span>
                      <span className="rounded bg-muted px-2 py-0.5 text-[11px] font-medium text-foreground">
                        {item.category}
                      </span>
                      <span className="rounded bg-muted/70 px-2 py-0.5 font-mono text-[11px] text-muted-foreground">
                        {item.team}
                      </span>
                    </div>
                    <p className="font-medium text-foreground">{item.title}</p>
                    {item.reviewNotes && (
                      <p className="text-xs text-blue-700 dark:text-blue-300">
                        Parecer da Tesouraria: {item.reviewNotes}
                      </p>
                    )}
                    {needsInfo && (
                      <p className="inline-flex items-center gap-1 text-xs font-medium text-amber-600 dark:text-amber-400">
                        <AlertCircle className="h-3.5 w-3.5" />
                        Clique para complementar{' '}
                        {[
                          item.amountCents === 0 ? 'valor' : null,
                          !item.pixKey ? 'chave PIX' : null,
                          item.attachments.length === 0 ? 'comprovante' : null,
                        ]
                          .filter(Boolean)
                          .join(', ')}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-4 shrink-0">
                    {item.attachments.length > 0 && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                        <Paperclip className="h-3.5 w-3.5" /> {item.attachments.length}
                      </span>
                    )}
                    <div className="text-right">
                      <p className="font-mono text-base font-bold tabular-nums text-foreground">
                        {item.amountCents > 0 ? formatBRL(item.amountCents) : 'Valor pendente'}
                      </p>
                      <span
                        className={cn(
                          'mt-1 inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-medium',
                          statusMeta.cls
                        )}
                      >
                        {statusMeta.label}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal de Nova Solicitação */}
      <Dialog open={creatingOpen} onOpenChange={setCreatingOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto border-border bg-card text-foreground">
          <DialogHeader>
            <DialogTitle className="font-display text-lg font-semibold">
              Solicitar Reembolso
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Informe os detalhes da compra, anexe a nota fiscal ou recibo e confirme sua chave PIX.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateSubmit} className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground" htmlFor="mem-rmb-title">
                O que foi comprado? *
              </label>
              <input
                id="mem-rmb-title"
                required
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Ex: Conectores XT60 + cabo AWG 12 para drone"
                className="min-h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground"
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground" htmlFor="mem-rmb-team">
                  Divisão / Equipe *
                </label>
                <select
                  id="mem-rmb-team"
                  value={team}
                  onChange={e => setTeam(e.target.value)}
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
                <label className="mb-1 block text-xs font-medium text-muted-foreground" htmlFor="mem-rmb-cat">
                  Categoria *
                </label>
                <select
                  id="mem-rmb-cat"
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                  className="min-h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground"
                >
                  {FINANCE_CATEGORIES.map(c => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground" htmlFor="mem-rmb-val">
                  Valor pago (R$) *
                </label>
                <input
                  id="mem-rmb-val"
                  required
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  placeholder="Ex: 89,90"
                  className="min-h-10 w-full rounded-lg border border-input bg-background px-3 text-sm font-mono text-foreground"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground" htmlFor="mem-rmb-date">
                  Data da compra *
                </label>
                <input
                  id="mem-rmb-date"
                  type="date"
                  required
                  value={occurredAt}
                  onChange={e => setOccurredAt(e.target.value)}
                  className="min-h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground"
                />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-[10rem_1fr]">
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground" htmlFor="mem-rmb-pix-type">
                  Tipo de PIX *
                </label>
                <select
                  id="mem-rmb-pix-type"
                  value={reqPixType}
                  onChange={e => setReqPixType(e.target.value)}
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
                <label className="mb-1 block text-xs font-medium text-muted-foreground" htmlFor="mem-rmb-pix">
                  Chave PIX *
                </label>
                <input
                  id="mem-rmb-pix"
                  required
                  value={reqPixKey}
                  onChange={e => setReqPixKey(e.target.value)}
                  placeholder="CPF, E-mail, Telefone ou Chave Aleatória"
                  className="min-h-10 w-full rounded-lg border border-input bg-background px-3 text-sm font-mono text-foreground"
                />
              </div>
            </div>

            <ReceiptUploader
              drafts={drafts}
              onAdd={d => setDrafts(prev => [...prev, d])}
              onRemove={idx => setDrafts(prev => prev.filter((_, i) => i !== idx))}
              kind="RECEIPT"
              label="Nota Fiscal / Recibo (PDF ou Imagem)"
            />

            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground" htmlFor="mem-rmb-desc">
                Justificativa / Observações
              </label>
              <textarea
                id="mem-rmb-desc"
                rows={2}
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Informe o projeto, evento ou quem autorizou a compra…"
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
                disabled={submitting}
                className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-primary px-4 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60 cursor-pointer"
              >
                <Check className="h-4 w-4" />
                {submitting ? 'Enviando…' : 'Enviar solicitação'}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal de Acompanhamento / Complemento de Pedido */}
      <Dialog open={Boolean(selected)} onOpenChange={open => !open && setSelected(null)}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto border-border bg-card text-foreground">
          {selected && (
            <>
              <DialogHeader>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-xs text-muted-foreground">{selected.code}</span>
                  <span
                    className={cn(
                      'inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-medium',
                      FINANCIAL_STATUS_META[selected.status].cls
                    )}
                  >
                    {FINANCIAL_STATUS_META[selected.status].label}
                  </span>
                </div>
                <DialogTitle className="font-display text-lg font-semibold pt-1">
                  {selected.title}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  {formatFinanceDate(selected.occurredAt)} · {selected.category} · Equipe {selected.team}
                </DialogDescription>
              </DialogHeader>

              {(() => {
                const canEdit =
                  selected.status === 'AGUARDANDO_REEMBOLSO' ||
                  selected.status === 'PENDENTE' ||
                  selected.status === 'AGUARDANDO_NF';

                return (
                  <form onSubmit={handleUpdateSelected} className="space-y-4">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <label className="mb-1 block text-xs font-medium text-muted-foreground">
                          Valor (R$)
                        </label>
                        <input
                          value={editAmount}
                          disabled={!canEdit}
                          onChange={e => setEditAmount(e.target.value)}
                          className="min-h-10 w-full rounded-lg border border-input bg-background px-3 text-sm font-mono font-semibold text-foreground disabled:opacity-70"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-muted-foreground">
                          Chave PIX ({editPixType})
                        </label>
                        <div className="flex gap-1.5">
                          <select
                            value={editPixType}
                            disabled={!canEdit}
                            onChange={e => setEditPixType(e.target.value)}
                            className="min-h-10 w-28 rounded-lg border border-input bg-background px-2 text-xs text-foreground disabled:opacity-70"
                          >
                            {PIX_KEY_TYPES.map(t => (
                              <option key={t} value={t}>
                                {t}
                              </option>
                            ))}
                          </select>
                          <input
                            value={editPixKey}
                            disabled={!canEdit}
                            onChange={e => setEditPixKey(e.target.value)}
                            placeholder="Sua chave PIX"
                            className="min-h-10 flex-1 rounded-lg border border-input bg-background px-3 text-xs font-mono text-foreground disabled:opacity-70"
                          />
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="mb-1 block text-xs font-medium text-muted-foreground">
                        Observações do pedido
                      </label>
                      <textarea
                        rows={2}
                        disabled={!canEdit}
                        value={editDescription}
                        onChange={e => setEditDescription(e.target.value)}
                        className="w-full rounded-lg border border-input bg-background p-2.5 text-xs text-foreground disabled:opacity-70"
                      />
                    </div>

                    {selected.reviewNotes && (
                      <div className="rounded-lg border border-blue-500/30 bg-blue-500/10 p-3 text-xs text-blue-800 dark:text-blue-200">
                        <strong>Parecer da Gestão:</strong> {selected.reviewNotes}
                      </div>
                    )}

                    <div className="space-y-2 border-t border-border pt-3">
                      <p className="text-xs font-semibold text-foreground">
                        Comprovantes e Notas Fiscais ({selected.attachments.length})
                      </p>
                      <AttachmentGallery
                        attachments={selected.attachments}
                        driveFolderUrl={selected.driveFolderUrl}
                      />
                      {canEdit && (
                        <ReceiptUploader
                          drafts={editDrafts}
                          onAdd={d => setEditDrafts(prev => [...prev, d])}
                          onRemove={idx => setEditDrafts(prev => prev.filter((_, i) => i !== idx))}
                          kind="RECEIPT"
                          label="Enviar comprovante adicional / Nota Fiscal"
                        />
                      )}
                    </div>

                    <DialogFooter className="gap-2 border-t border-border pt-3">
                      <button
                        type="button"
                        onClick={() => setSelected(null)}
                        className="inline-flex min-h-9 items-center rounded-lg border border-border px-3.5 text-xs font-medium hover:bg-accent cursor-pointer"
                      >
                        Fechar
                      </button>
                      {canEdit && (
                        <button
                          type="submit"
                          disabled={savingDetail}
                          className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-primary px-4 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60 cursor-pointer"
                        >
                          <Save className="h-3.5 w-3.5" />
                          {savingDetail ? 'Salvando…' : 'Salvar complemento'}
                        </button>
                      )}
                    </DialogFooter>
                  </form>
                );
              })()}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
