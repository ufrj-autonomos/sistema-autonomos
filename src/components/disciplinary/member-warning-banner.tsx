import React from 'react';
import { ShieldAlert, AlertTriangle } from 'lucide-react';
import type { MemberDisciplinarySummary } from '@/lib/disciplinary/service';

export function MemberWarningBanner({
  summary,
}: {
  summary: MemberDisciplinarySummary;
}) {
  if (summary.totalWarnings === 0 && summary.avisosCount === 0) {
    return null;
  }

  return (
    <div className="rounded-2xl border-2 border-red-500/60 bg-red-500/10 p-5 sm:p-6 text-red-950 dark:text-red-200 shadow-sm animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-500/20 text-red-600 dark:text-red-400">
            <ShieldAlert className="h-6 w-6" />
          </span>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base font-bold text-red-900 dark:text-red-100">
                Acompanhamento Disciplinar
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-red-500/20 text-red-800 dark:text-red-300">
                Status: {summary.statusLabel}
              </span>
            </div>

            <p className="mt-1 text-sm text-red-900/90 dark:text-red-300/90 leading-relaxed">
              Você possui{' '}
              <strong className="text-red-950 dark:text-red-100 font-extrabold text-base">
                {summary.totalWarnings} {summary.totalWarnings === 1 ? 'advertência' : 'advertências'}
              </strong>{' '}
              ({summary.directWarningsCount} direta{summary.directWarningsCount === 1 ? '' : 's'} e{' '}
              {summary.avisosCount} aviso{summary.avisosCount === 1 ? '' : 's'} registrado{summary.avisosCount === 1 ? '' : 's'}).
            </p>

            <p className="mt-1 text-xs text-red-800/80 dark:text-red-400/80">
              Regra da equipe: 2 Avisos = 1 Advertência | 2 Advertências = Risco de expulsão | 3ª Advertência = Expulsão automática.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center">
          <div className="rounded-xl bg-red-600 px-5 py-2.5 text-center text-white shadow-xs">
            <span className="block text-2xl font-extrabold font-mono leading-none">
              {summary.totalWarnings}
            </span>
            <span className="text-[10px] uppercase font-bold tracking-wider">
              {summary.totalWarnings === 1 ? 'Advertência' : 'Advertências'}
            </span>
          </div>
        </div>
      </div>

      {/* Lista detalhada das ocorrências do próprio membro */}
      {summary.warnings.length > 0 && (
        <div className="mt-4 pt-4 border-t border-red-500/20 space-y-2.5">
          <p className="text-xs font-semibold uppercase tracking-wider text-red-900/80 dark:text-red-300/80">
            Histórico das suas ocorrências:
          </p>
          <div className="space-y-2">
            {summary.warnings.map((w) => (
              <div
                key={w.id}
                className="p-3.5 rounded-xl bg-background/80 border border-red-500/30 text-foreground text-xs space-y-1.5 shadow-2xs"
              >
                <div className="flex items-center justify-between text-muted-foreground">
                  <span className="font-semibold text-red-600 dark:text-red-400">
                    {w.type === 'AVISO' ? '🟡 Aviso' : '🔴 Advertência Direta'}
                  </span>
                  <span>{new Date(w.createdAt).toLocaleDateString('pt-BR')}</span>
                </div>
                <p className="font-medium text-foreground text-sm leading-relaxed">{w.reason}</p>
                {w.notes && (
                  <p className="text-muted-foreground italic border-l-2 border-red-500/40 pl-2 mt-1">
                    {w.notes}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

