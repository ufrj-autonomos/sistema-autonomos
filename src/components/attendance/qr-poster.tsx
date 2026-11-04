'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Printer, ArrowLeft } from 'lucide-react';
export function QrPoster() {
  const [qr, setQr] = useState<{ image: string; origin: string } | null>(null);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setError('');
    fetch('/api/admin/attendance/qr', { cache: 'no-store', signal: controller.signal }).then(async response => {
      const data = await response.json(); if (!response.ok) throw new Error(data.error); setQr(data);
    }).catch(err => { if (!controller.signal.aborted) setError(err.message || 'Não foi possível carregar o QR code.'); });
    return () => controller.abort();
  }, [attempt]);
  return <div className="mx-auto w-full max-w-2xl px-4 py-10 sm:px-6">
    <div className="mb-7 flex flex-wrap items-center justify-between gap-3 print:hidden"><Link href="/gestao/presenca" className="inline-flex min-h-11 items-center gap-2 text-sm text-zinc-300"><ArrowLeft className="h-4 w-4" />Controle de presença</Link><button type="button" disabled={!qr} onClick={() => window.print()} className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-zinc-100 px-5 py-2 font-semibold text-zinc-950 disabled:opacity-50"><Printer className="h-4 w-4" />Imprimir QR code</button></div>
    <section data-lab-qr className="rounded-xl bg-white p-6 text-center text-zinc-950 sm:p-10">
      <h1 className="font-display text-3xl font-bold">Presença no laboratório</h1>
      <p className="mt-3 text-lg">UFRJ Autônomos</p>
      {qr ? <img src={qr.image} alt="QR code para registrar entrada e saída no laboratório" width={480} height={480} className="mx-auto my-5 h-auto w-full max-w-[480px]" /> : <div className="flex min-h-72 items-center justify-center text-zinc-600">{error || 'Carregando QR code...'}</div>}
      <p className="text-xl font-semibold">Leia ao entrar. Leia novamente ao sair.</p>
      <p className="mx-auto mt-4 max-w-md leading-relaxed text-zinc-700">Use a câmera do celular. Entre com sua conta aprovada e aguarde a confirmação do registro.</p>
      {qr && <p className="mt-6 break-all text-sm text-zinc-600">{qr.origin}</p>}
    </section>
    <p className="mt-5 text-sm leading-relaxed text-zinc-400 print:hidden">Mantenha este QR code dentro do laboratório. Se o domínio do sistema mudar, imprima novamente o QR code atualizado.</p>
    {error && <button type="button" onClick={() => setAttempt(value => value + 1)} className="mt-4 min-h-11 rounded-lg border border-zinc-700 px-4 py-2">Tentar novamente</button>}
  </div>;
}
