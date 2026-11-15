'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, Check, Loader2, Mail, ShieldCheck, X } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/institutional/ui/dialog';

export interface PendingEmailChangeItem {
  id: string;
  memberId: string;
  memberName: string;
  memberArea: string;
  institutionalMemberId: number | null;
  currentEmail: string;
  newEmail: string;
  createdAt: string;
}

export function EmailChangeRequestsPanel({
  requests,
}: {
  requests: PendingEmailChangeItem[];
}) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rejectTarget, setRejectTarget] = useState<PendingEmailChangeItem | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  if (requests.length === 0) return null;

  async function submitDecision(
    item: PendingEmailChangeItem,
    action: 'APPROVE' | 'REJECT',
    reviewNotes?: string
  ) {
    setBusyId(item.id);
    try {
      const res = await fetch('/api/admin/email-changes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestId: item.id,
          action,
          reviewNotes: reviewNotes?.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Não foi possível processar a solicitação.');
        return;
      }
      toast.success(data.message);
      setRejectTarget(null);
      setRejectReason('');
      router.refresh();
    } catch {
      toast.error('Erro de conexão ao revisar alteração de e-mail.');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section
      id="trocas-de-email"
      aria-label="Solicitações de alteração de e-mail"
      className="scroll-mt-20 rounded-xl border border-cyan-500/35 bg-cyan-500/10 dark:bg-cyan-950/25 p-4 space-y-3"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-start gap-2.5 text-cyan-900 dark:text-cyan-100">
          <Mail className="h-5 w-5 text-cyan-600 dark:text-cyan-400 shrink-0 mt-0.5" />
          <div>
            <h2 className="text-sm font-semibold">
              {requests.length}{' '}
              {requests.length === 1
                ? 'solicitação de troca de e-mail aguardando validação de Gestão'
                : 'solicitações de troca de e-mail aguardando validação de Gestão'}
            </h2>
            <p className="text-xs text-cyan-900/80 dark:text-cyan-200/80 mt-0.5">
              Os novos endereços abaixo já foram validados por código pelo próprio integrante. Aprove ou recuse a atualização do e-mail de acesso.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-2.5 sm:grid-cols-2">
        {requests.map((item) => {
          const isBusy = busyId === item.id;
          return (
            <div
              key={item.id}
              className="rounded-lg border border-cyan-500/25 bg-background/90 p-3.5 flex flex-col justify-between gap-3"
            >
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  {item.institutionalMemberId ? (
                    <Link
                      href={`/gestao/integrantes/${item.institutionalMemberId}?view=internal`}
                      className="text-sm font-semibold text-foreground hover:underline underline-offset-4"
                    >
                      {item.memberName}
                    </Link>
                  ) : (
                    <span className="text-sm font-semibold text-foreground">{item.memberName}</span>
                  )}
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:text-emerald-300">
                    <ShieldCheck className="h-3 w-3" />
                    Código validado
                  </span>
                </div>

                <div className="text-xs text-muted-foreground flex flex-wrap items-center gap-1.5">
                  <span className="font-mono break-all">{item.currentEmail || 'Sem e-mail anterior'}</span>
                  <ArrowRight className="h-3.5 w-3.5 text-cyan-600 dark:text-cyan-400 shrink-0" />
                  <span className="font-mono font-semibold text-foreground break-all">{item.newEmail}</span>
                </div>

                <p className="text-[11px] text-muted-foreground">
                  {item.memberArea} • Solicitado em{' '}
                  {new Intl.DateTimeFormat('pt-BR', {
                    dateStyle: 'short',
                    timeStyle: 'short',
                    timeZone: 'America/Sao_Paulo',
                  }).format(new Date(item.createdAt))}
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-border/70">
                <button
                  type="button"
                  disabled={Boolean(busyId)}
                  onClick={() => {
                    setRejectTarget(item);
                    setRejectReason('');
                  }}
                  className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-red-500/40 px-3 text-xs font-medium text-red-700 dark:text-red-300 hover:bg-red-500/10 disabled:opacity-50 cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                  Recusar
                </button>
                <button
                  type="button"
                  disabled={Boolean(busyId)}
                  onClick={() => void submitDecision(item, 'APPROVE')}
                  className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-emerald-700 px-3 text-xs font-semibold text-white hover:bg-emerald-800 disabled:opacity-50 cursor-pointer"
                >
                  {isBusy ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Check className="h-3.5 w-3.5" />
                  )}
                  Aprovar troca
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <Dialog
        open={Boolean(rejectTarget)}
        onOpenChange={(open) => {
          if (!open && !busyId) setRejectTarget(null);
        }}
      >
        <DialogContent className="border-border bg-background text-foreground max-w-md">
          <DialogHeader>
            <DialogTitle>Recusar alteração de e-mail</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Informe opcionalmente o motivo da recusa para <strong className="text-foreground">{rejectTarget?.memberName}</strong> ({rejectTarget?.newEmail}).
            </DialogDescription>
          </DialogHeader>
          <textarea
            rows={3}
            maxLength={500}
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Motivo ou orientação para o integrante (opcional)..."
            className="w-full rounded-lg border border-input bg-background p-3 text-sm text-foreground placeholder:text-muted-foreground"
          />
          <DialogFooter className="flex items-center justify-end gap-2">
            <button
              type="button"
              disabled={Boolean(busyId)}
              onClick={() => setRejectTarget(null)}
              className="min-h-10 rounded-lg border border-border px-3 text-sm text-secondary-foreground hover:bg-accent cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={Boolean(busyId)}
              onClick={() => rejectTarget && void submitDecision(rejectTarget, 'REJECT', rejectReason)}
              className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-red-700 px-4 text-sm font-semibold text-white hover:bg-red-800 disabled:opacity-50 cursor-pointer"
            >
              {busyId === rejectTarget?.id && <Loader2 className="h-4 w-4 animate-spin" />}
              Confirmar recusa
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
