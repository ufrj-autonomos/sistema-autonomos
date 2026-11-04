'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Clock3, ArrowRight } from 'lucide-react';
import type { AttendanceReport } from '@/lib/attendance/types';
import { formatDuration, formatLabTime, GOAL_LABELS } from '@/lib/attendance/format';

export function AttendanceCard({ initial }: { initial: AttendanceReport | null }) {
  const [report, setReport] = useState(initial);
  const [error, setError] = useState(!initial);
  useEffect(() => {
    let active = true;
    async function refresh() {
      if (document.hidden) return;
      try {
        const response = await fetch('/api/attendance/me', { cache: 'no-store' });
        if (!response.ok) throw new Error();
        const data = await response.json();
        if (active) { setReport(data); setError(false); }
      } catch { if (active) setError(true); }
    }
    const timer = setInterval(refresh, 60_000);
    window.addEventListener('focus', refresh);
    if (!initial) void refresh();
    return () => { active = false; clearInterval(timer); window.removeEventListener('focus', refresh); };
  }, [initial]);
  const member = report?.members[0];
  return <section aria-labelledby="attendance-home-heading" className="mt-8 rounded-xl border border-border bg-muted/40 p-5 sm:p-6">
    <div className="flex flex-wrap items-center justify-between gap-4">
      <h2 id="attendance-home-heading" className="flex items-center gap-3 font-display text-xl font-semibold"><Clock3 className="h-5 w-5 text-muted-foreground" />Presença no laboratório</h2>
      <Link href="/presenca" className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-foreground underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4">Meus registros<ArrowRight className="h-4 w-4" /></Link>
    </div>
    {member ? <>
      <div className="mt-4 flex flex-wrap items-baseline gap-x-5 gap-y-2">
        <p className="text-lg font-medium tabular-nums">{formatDuration(member.completedSeconds)} <span className="text-sm font-normal text-muted-foreground">validados nesta semana{member.requiredSeconds ? ` · meta de ${formatDuration(member.requiredSeconds)}` : ''}</span></p>
        <span className={`text-sm ${member.status === 'MET' ? 'text-emerald-700 dark:text-emerald-300' : 'text-secondary-foreground'}`}>{GOAL_LABELS[member.status]}</span>
      </div>
      {member.requiredSeconds > 0 && <>
        <progress aria-label="Meta semanal de presença" value={member.completedSeconds} max={member.requiredSeconds} className="mt-4 h-2 w-full overflow-hidden rounded-full accent-emerald-500" />
        <p className="mt-2 text-sm text-muted-foreground">{member.remainingSeconds ? `Faltam ${formatDuration(member.remainingSeconds)} para cumprir a meta.` : 'Você cumpriu a meta desta semana.'} Semana de segunda a domingo, no horário de Brasília.</p>
      </>}
      {!!member.justifiedSeconds && <p className="mt-3 text-sm text-muted-foreground">Inclui {formatDuration(member.justifiedSeconds)} por justificativa aprovada.</p>}
      {member.openVisit && <p className={`mt-4 text-sm ${member.openVisit.needsReview ? 'text-amber-700 dark:text-amber-300' : 'text-emerald-700 dark:text-emerald-300'}`}>{member.openVisit.needsReview ? 'Sua entrada está sem saída há mais de 12 horas. Registre a saída e procure a gestão para revisar.' : `Entrada registrada às ${formatLabTime(member.openVisit.checkedInAt)}. Leia o QR code novamente ao sair.`}</p>}
      {member.pendingReviews > 0 && <p className="mt-2 text-sm text-amber-700 dark:text-amber-300">{member.pendingReviews} registro(s) aguardando revisão da gestão.</p>}
    </> : <p className="mt-4 text-sm text-muted-foreground">{report ? 'Seu acompanhamento de presença ainda não foi habilitado. Procure a gestão.' : 'Carregando suas horas de laboratório...'}</p>}
    {error && <p role="status" className="mt-3 text-sm text-amber-700 dark:text-amber-300">Não foi possível atualizar suas horas agora. Abra seus registros para tentar novamente.</p>}
  </section>;
}
