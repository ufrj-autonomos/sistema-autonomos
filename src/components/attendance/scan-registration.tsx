'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, Loader2, AlertCircle } from 'lucide-react';
import type { ScanResult } from '@/lib/attendance/types';
import { formatLabDate } from '@/lib/attendance/format';

export function ScanRegistration({ code }: { code: string }) {
  const started = useRef(false);
  const requestId = useRef('');
  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(true);
  const submit = useCallback(async () => {
    setBusy(true); setError('');
    try {
      const response = await fetch('/api/attendance/scan', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code, requestId: requestId.current }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Não foi possível registrar sua presença.');
      setResult(data);
    } catch (err) { setError(err instanceof Error ? err.message : 'Falha de conexão. Tente novamente.'); }
    finally { setBusy(false); }
  }, [code]);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    if (!/^[a-f0-9]{64}$/.test(code)) { setBusy(false); setError('Leia o QR code disponível no laboratório para registrar sua presença.'); return; }
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
    const reload = navigation?.type === 'reload' || navigation?.type === 'back_forward';
    try {
      const stored = sessionStorage.getItem(`attendance:${code}`);
      const previous = stored ? JSON.parse(stored) : null;
      if (reload && !previous) { setBusy(false); setError('Para fazer um novo registro, leia novamente o QR code do laboratório.'); return; }
      requestId.current = previous && (reload || Date.now() - previous.createdAt < 60_000) ? previous.id : crypto.randomUUID();
      sessionStorage.setItem(`attendance:${code}`, JSON.stringify({ id: requestId.current, createdAt: Date.now() }));
    } catch {
      if (reload) { setBusy(false); setError('Para fazer um novo registro, leia novamente o QR code do laboratório.'); return; }
      requestId.current = crypto.randomUUID();
    }
    void submit();
  }, [code, submit]);
  const voided = result?.visit.status === 'VOID';
  return <div className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center px-5 py-12">
    <div role="status" aria-live="polite" className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-7 sm:p-9">
      {busy ? <><Loader2 className="h-8 w-8 animate-spin text-zinc-300" /><h1 className="mt-5 font-display text-2xl font-semibold">Registrando sua presença...</h1><p className="mt-3 text-zinc-400">Aguarde a confirmação antes de fechar esta página.</p></> : result ? <>
        <CheckCircle2 className={`h-9 w-9 ${voided ? 'text-zinc-400' : 'text-emerald-400'}`} />
        <h1 className="mt-5 font-display text-2xl font-semibold">{voided ? 'Registro desconsiderado' : result.action === 'IN' ? 'Entrada registrada' : 'Saída registrada'}</h1>
        <p className="mt-3 text-zinc-300">{formatLabDate(result.registeredAt, true)} · horário de Brasília</p>
        {result.duplicate && <p className="mt-3 text-sm text-zinc-400">Esta leitura já foi processada. Nenhum registro duplicado foi criado.</p>}
        <p className="mt-4 leading-relaxed text-zinc-400">{voided ? 'Esse registro foi desconsiderado pela gestão. Leia o QR code novamente para um novo registro.' : result.visit.needsReview ? 'O registro ficou para revisão da gestão. As horas serão contabilizadas após a conferência.' : result.action === 'IN' ? 'Ao sair do laboratório, leia este mesmo QR code novamente para fechar sua presença.' : 'Suas horas foram contabilizadas. Você pode conferir o saldo semanal na página inicial.'}</p>
      </> : <><AlertCircle className="h-8 w-8 text-amber-300" /><h1 className="mt-5 font-display text-2xl font-semibold">Presença não registrada</h1></>}
      {error && <p role="alert" className="mt-4 text-amber-300">{error}</p>}
      <div className="mt-7 flex flex-wrap gap-3">
        {error && requestId.current && <button type="button" onClick={() => void submit()} disabled={busy} className="min-h-11 rounded-lg bg-zinc-100 px-5 py-3 font-semibold text-zinc-950 disabled:opacity-50">Tentar novamente</button>}
        <Link href="/" prefetch={false} className="inline-flex min-h-11 items-center rounded-lg border border-zinc-700 px-5 py-3 text-zinc-200 hover:bg-zinc-800 focus-visible:outline-2 focus-visible:outline-offset-4">Voltar ao início</Link>
      </div>
    </div>
  </div>;
}
