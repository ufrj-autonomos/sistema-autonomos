'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, Loader2, AlertCircle } from 'lucide-react';
import type { ScanResult } from '@/lib/attendance/types';
import { formatLabDate } from '@/lib/attendance/format';
import { submitAttendanceScan } from '@/lib/attendance/scan-client';

export function ScanRegistration({ code, requestId }: { code: string; requestId: string }) {
  const started = useRef(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(true);
  const submit = useCallback(async () => {
    setBusy(true); setError('');
    try {
      setResult(await submitAttendanceScan(code, requestId));
    } catch (err) { setError(err instanceof Error ? err.message : 'Falha de conexão. Tente novamente.'); }
    finally { setBusy(false); }
  }, [code, requestId]);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    if (!/^[a-f0-9]{64}$/.test(code)) { setBusy(false); setError('Leia o QR code disponível no laboratório para registrar sua presença.'); return; }
    void submit();
  }, [code, submit]);
  const voided = result?.visit.status === 'VOID';
  return <div className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center px-5 py-12">
    <div role="status" aria-live="polite" className="rounded-xl border border-border bg-muted/40 p-7 sm:p-9">
      {busy ? <><Loader2 className="h-8 w-8 animate-spin text-secondary-foreground" /><h1 className="mt-5 font-display text-2xl font-semibold">Registrando sua presença...</h1><p className="mt-3 text-muted-foreground">Aguarde a confirmação antes de fechar esta página.</p></> : result ? <>
        <CheckCircle2 className={`h-9 w-9 ${voided ? 'text-muted-foreground' : 'text-emerald-700 dark:text-emerald-400'}`} />
        <h1 className="mt-5 font-display text-2xl font-semibold">{voided ? 'Registro desconsiderado' : result.action === 'IN' ? 'Entrada registrada' : 'Saída registrada'}</h1>
        <p className="mt-3 text-secondary-foreground">{formatLabDate(result.registeredAt, true)} · horário de Brasília</p>
        {result.duplicate && <p className="mt-3 text-sm text-muted-foreground">Esta leitura já foi processada. Nenhum registro duplicado foi criado.</p>}
        <p className="mt-4 leading-relaxed text-muted-foreground">{voided ? 'Esse registro foi desconsiderado pela gestão. Leia o QR code novamente para um novo registro.' : result.visit.needsReview ? 'O registro ficou para revisão da gestão. As horas serão contabilizadas após a conferência.' : result.action === 'IN' ? 'Ao sair do laboratório, leia este mesmo QR code novamente para fechar sua presença.' : 'Suas horas foram contabilizadas. Você pode conferir o saldo semanal na página inicial.'}</p>
      </> : <><AlertCircle className="h-8 w-8 text-amber-700 dark:text-amber-300" /><h1 className="mt-5 font-display text-2xl font-semibold">Não foi possível confirmar a presença</h1></>}
      {error && <p role="alert" className="mt-4 text-amber-700 dark:text-amber-300">{error}</p>}
      <div className="mt-7 flex flex-wrap gap-3">
        {error && requestId && <button type="button" onClick={() => void submit()} disabled={busy} className="min-h-11 rounded-lg bg-primary px-5 py-3 font-semibold text-primary-foreground disabled:opacity-50">Tentar novamente</button>}
        <Link href="/" prefetch={false} className="inline-flex min-h-11 items-center rounded-lg border border-border px-5 py-3 text-foreground hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-4">Voltar ao início</Link>
      </div>
    </div>
  </div>;
}
