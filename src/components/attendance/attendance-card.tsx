'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Clock3, ArrowRight } from 'lucide-react';
import type { AttendanceReport } from '@/lib/attendance/types';
import { formatDuration, formatLabTime, getAttendanceCardTheme, GOAL_LABELS } from '@/lib/attendance/format';

export function AttendanceCard({
  initial,
  className = 'mt-8',
}: {
  initial: AttendanceReport | null;
  className?: string;
}) {
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
  const theme = member ? getAttendanceCardTheme(member) : null;
  const pct =
    member && member.requiredSeconds > 0
      ? Math.min(100, Math.round((member.completedSeconds / member.requiredSeconds) * 100))
      : 0;

  return (
    <section
      aria-labelledby="attendance-home-heading"
      className={`${className} rounded-xl border p-5 sm:p-6 transition-colors ${
        theme ? theme.cardClass : 'border-border bg-muted/40'
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <h2 id="attendance-home-heading" className="flex items-center gap-2.5 font-display text-xl font-semibold">
            <Clock3 className={`h-5 w-5 ${theme ? theme.accentText : 'text-muted-foreground'}`} />
            Presença no laboratório
          </h2>
          {theme && (
            <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${theme.badgeClass}`}>
              {theme.tierLabel}
            </span>
          )}
        </div>
        <Link href="/presenca" className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-foreground underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4">
          Meus registros
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
      {member && theme ? <>
        <div className="mt-4 flex flex-wrap items-baseline gap-x-5 gap-y-2">
          <p className="text-lg font-medium tabular-nums">
            {formatDuration(member.completedSeconds)}{' '}
            <span className="text-sm font-normal text-muted-foreground">
              {member.isMonthly ? 'validados neste mês' : 'validados nesta semana'}
              {member.requiredSeconds ? ` · meta ${member.isMonthly ? 'mensal' : 'semanal'} de ${formatDuration(member.requiredSeconds)}` : ''}
            </span>
          </p>
          <span className={`text-sm font-medium ${theme.accentText}`}>{GOAL_LABELS[member.status]}</span>
        </div>
        {member.requiredSeconds > 0 && <>
          <div
            role="progressbar"
            aria-label={member.isMonthly ? 'Meta mensal de presença' : 'Meta semanal de presença'}
            aria-valuenow={member.completedSeconds}
            aria-valuemin={0}
            aria-valuemax={member.requiredSeconds}
            className="mt-4 h-2.5 w-full overflow-hidden rounded-full bg-background/70 border border-border/60"
          >
            <div
              className={`h-full rounded-full transition-all ${theme.barClass}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            {member.remainingSeconds ? `Faltam ${formatDuration(member.remainingSeconds)} para cumprir a meta.` : member.isMonthly ? 'Você cumpriu a meta deste mês!' : 'Você cumpriu a meta desta semana.'}{' '}
            {member.isMonthly ? 'Meta mensal para as áreas de Marketing e Gestão.' : 'Semana de segunda a domingo, no horário de Brasília.'}
          </p>
        </>}
        {!!member.justifiedSeconds && <p className="mt-3 text-sm text-muted-foreground">Inclui {formatDuration(member.justifiedSeconds)} por justificativa aprovada.</p>}
        {member.openVisit && (
          <p className={`mt-4 text-sm font-medium ${member.openVisit.needsReview ? 'text-amber-700 dark:text-amber-300' : 'text-blue-700 dark:text-blue-300'}`}>
            {member.openVisit.needsReview
              ? 'Sua entrada está sem saída há mais de 12 horas. Registre a saída e procure a gestão para revisar.'
              : `Entrada registrada às ${formatLabTime(member.openVisit.checkedInAt)}. Leia o QR code novamente ao sair.`}
          </p>
        )}
        {member.pendingReviews > 0 && <p className="mt-2 text-sm text-amber-700 dark:text-amber-300">{member.pendingReviews} registro(s) aguardando revisão da gestão.</p>}
      </> : <p className="mt-4 text-sm text-muted-foreground">{report ? 'Seu acompanhamento de presença ainda não foi habilitado. Procure a gestão.' : 'Carregando suas horas de laboratório...'}</p>}
      {error && <p role="status" className="mt-3 text-sm text-amber-700 dark:text-amber-300">Não foi possível atualizar suas horas agora. Abra seus registros para tentar novamente.</p>}
    </section>
  );
}
