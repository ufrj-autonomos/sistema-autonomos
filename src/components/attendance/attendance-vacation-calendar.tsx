'use client';

import { useMemo, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, Palmtree, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface VacationWeekItem {
  weekStartsOn: string;
  label: string | null;
}

interface CalendarWeekRow {
  mondayKey: string;
  labelRange: string;
  days: Array<{ iso: string; day: number; inMonth: boolean }>;
}

const MONTH_NAMES = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function toIsoDate(d: Date): string {
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
}

function buildMonthWeeks(year: number, monthIndex: number): CalendarWeekRow[] {
  const firstOfMonth = new Date(Date.UTC(year, monthIndex, 1));
  const lastOfMonth = new Date(Date.UTC(year, monthIndex + 1, 0));
  // JS getUTCDay(): Sun=0, Mon=1..Sat=6 -> convert to Mon=0..Sun=6
  const startOffset = (firstOfMonth.getUTCDay() + 6) % 7;
  const gridStart = new Date(firstOfMonth);
  gridStart.setUTCDate(firstOfMonth.getUTCDate() - startOffset);

  const endOffset = 6 - ((lastOfMonth.getUTCDay() + 6) % 7);
  const gridEnd = new Date(lastOfMonth);
  gridEnd.setUTCDate(lastOfMonth.getUTCDate() + endOffset);

  const rows: CalendarWeekRow[] = [];
  const cursor = new Date(gridStart);
  while (cursor <= gridEnd) {
    const mondayKey = toIsoDate(cursor);
    const days: CalendarWeekRow['days'] = [];
    for (let i = 0; i < 7; i++) {
      const iso = toIsoDate(cursor);
      days.push({
        iso,
        day: cursor.getUTCDate(),
        inMonth: cursor.getUTCMonth() === monthIndex,
      });
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
    const firstDay = days[0];
    const lastDay = days[6];
    const labelRange = `${firstDay.iso.slice(8, 10)}/${firstDay.iso.slice(5, 7)} – ${lastDay.iso.slice(8, 10)}/${lastDay.iso.slice(5, 7)}`;
    rows.push({ mondayKey, labelRange, days });
  }
  return rows;
}

export function AttendanceVacationCalendar({
  vacationWeeks,
  selectedWeekKey,
  onChanged,
  onSelectWeek,
}: {
  vacationWeeks: VacationWeekItem[];
  selectedWeekKey: string;
  onChanged: () => void | Promise<void>;
  onSelectWeek?: (mondayKey: string) => void;
}) {
  const initialDate = useMemo(() => {
    const m = /^(\d{4})-(\d{2})-/.exec(selectedWeekKey);
    if (m) return { year: Number(m[1]), month: Number(m[2]) - 1 };
    const now = new Date();
    return { year: now.getUTCFullYear(), month: now.getUTCMonth() };
  }, [selectedWeekKey]);

  const [cursor, setCursor] = useState(initialDate);
  const [label, setLabel] = useState('Férias');
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const vacationMap = useMemo(
    () => new Map(vacationWeeks.map((v) => [v.weekStartsOn, v.label || 'Férias'])),
    [vacationWeeks]
  );

  const monthWeeks = useMemo(
    () => buildMonthWeeks(cursor.year, cursor.month),
    [cursor.year, cursor.month]
  );

  function shiftMonth(delta: number) {
    setCursor((prev) => {
      const next = new Date(Date.UTC(prev.year, prev.month + delta, 1));
      return { year: next.getUTCFullYear(), month: next.getUTCMonth() };
    });
  }

  async function toggleWeek(mondayKey: string, nextState: boolean) {
    setSavingKey(mondayKey);
    setFeedback(null);
    try {
      const res = await fetch('/api/admin/attendance/vacations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          weekStartsOn: mondayKey,
          isVacation: nextState,
          label: label.trim() || 'Férias',
        }),
      });
      const payload = await res.json().catch(() => null);
      if (!res.ok) {
        setFeedback(payload?.error || 'Erro ao atualizar semana de férias.');
        return;
      }
      await onChanged();
    } catch {
      setFeedback('Erro de conexão ao salvar calendário de férias.');
    } finally {
      setSavingKey(null);
    }
  }

  async function toggleEntireMonth() {
    const allVacation = monthWeeks.every((w) => vacationMap.has(w.mondayKey));
    const targetState = !allVacation;
    setSavingKey('month');
    setFeedback(null);
    try {
      const res = await fetch('/api/admin/attendance/vacations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          weeks: monthWeeks.map((w) => w.mondayKey),
          isVacation: targetState,
          label: label.trim() || 'Férias',
        }),
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => null);
        setFeedback(payload?.error || 'Erro ao atualizar mês.');
        return;
      }
      await onChanged();
    } catch {
      setFeedback('Erro ao atualizar o mês inteiro.');
    } finally {
      setSavingKey(null);
    }
  }

  const vacationCountInMonth = monthWeeks.filter((w) => vacationMap.has(w.mondayKey)).length;

  return (
    <section className="rounded-xl border border-border bg-card shadow-xs overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3.5 bg-muted/30 border-b border-border">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-500/15 text-sky-600 dark:text-sky-400">
            <Palmtree className="h-4 w-4" />
          </span>
          <div>
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              Calendário de Férias & Recesso
              {vacationWeeks.length > 0 && (
                <span className="rounded-full bg-sky-500/15 px-2 py-0.5 text-[11px] font-medium text-sky-700 dark:text-sky-300">
                  {vacationWeeks.length} semana{vacationWeeks.length === 1 ? '' : 's'} marcada{vacationWeeks.length === 1 ? '' : 's'}
                </span>
              )}
            </h2>
            <p className="text-xs text-muted-foreground">
              Semanas marcadas como férias não cobram horas, não geram avisos/punições e não entram no histórico de faltas.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition cursor-pointer"
        >
          <CalendarDays className="h-3.5 w-3.5 text-sky-500" />
          <span>{expanded ? 'Ocultar calendário' : 'Gerenciar semanas de férias'}</span>
        </button>
      </div>

      {expanded && (
        <div className="p-4 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => shiftMonth(-1)}
                className="p-1.5 rounded-lg border border-border bg-background hover:bg-muted text-foreground cursor-pointer"
                aria-label="Mês anterior"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="min-w-36 text-center text-sm font-semibold text-foreground">
                {MONTH_NAMES[cursor.month]} {cursor.year}
              </span>
              <button
                type="button"
                onClick={() => shiftMonth(1)}
                className="p-1.5 rounded-lg border border-border bg-background hover:bg-muted text-foreground cursor-pointer"
                aria-label="Próximo mês"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <input
                type="text"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="Motivo/rótulo (ex: Férias UFRJ)"
                maxLength={60}
                className="h-8 rounded-lg border border-border bg-background px-2.5 text-xs text-foreground focus:outline-hidden focus:ring-2 focus:ring-ring w-48"
              />
              <button
                type="button"
                disabled={savingKey !== null}
                onClick={() => void toggleEntireMonth()}
                className="inline-flex items-center gap-1.5 rounded-lg border border-sky-500/30 bg-sky-500/10 px-3 py-1.5 text-xs font-medium text-sky-700 dark:text-sky-300 hover:bg-sky-500/20 disabled:opacity-50 transition cursor-pointer"
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span>
                  {vacationCountInMonth === monthWeeks.length
                    ? 'Desmarcar mês inteiro'
                    : 'Marcar mês inteiro como férias'}
                </span>
              </button>
            </div>
          </div>

          {feedback && (
            <p className="text-xs text-red-600 dark:text-red-400">{feedback}</p>
          )}

          <div className="overflow-x-auto">
            <div className="min-w-[540px] rounded-xl border border-border overflow-hidden">
              <div className="grid grid-cols-[120px_repeat(7,1fr)_140px] bg-muted/50 border-b border-border text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                <div className="px-3 py-2">Semana</div>
                <div className="py-2 text-center">Seg</div>
                <div className="py-2 text-center">Ter</div>
                <div className="py-2 text-center">Qua</div>
                <div className="py-2 text-center">Qui</div>
                <div className="py-2 text-center">Sex</div>
                <div className="py-2 text-center">Sáb</div>
                <div className="py-2 text-center">Dom</div>
                <div className="px-3 py-2 text-right">Status</div>
              </div>

              <div className="divide-y divide-border">
                {monthWeeks.map((week) => {
                  const isVacation = vacationMap.has(week.mondayKey);
                  const isCurrentSelected = week.mondayKey === selectedWeekKey;
                  const vacLabel = vacationMap.get(week.mondayKey);
                  const isBusy = savingKey === week.mondayKey || savingKey === 'month';

                  return (
                    <div
                      key={week.mondayKey}
                      className={cn(
                        'grid grid-cols-[120px_repeat(7,1fr)_140px] items-center text-xs transition',
                        isVacation
                          ? 'bg-sky-500/10'
                          : isCurrentSelected
                            ? 'bg-accent/30'
                            : 'hover:bg-muted/30'
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => onSelectWeek?.(week.mondayKey)}
                        className="px-3 py-2.5 text-left font-mono text-[11px] text-muted-foreground hover:text-foreground cursor-pointer"
                        title="Visualizar esta semana na presença"
                      >
                        {week.labelRange}
                      </button>

                      {week.days.map((d) => (
                        <div
                          key={d.iso}
                          className={cn(
                            'py-2.5 text-center tabular-nums',
                            d.inMonth ? 'text-foreground font-medium' : 'text-muted-foreground/45',
                            isVacation && d.inMonth && 'text-sky-700 dark:text-sky-300 font-semibold'
                          )}
                        >
                          {d.day}
                        </div>
                      ))}

                      <div className="px-3 py-2 flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => void toggleWeek(week.mondayKey, !isVacation)}
                          className={cn(
                            'px-2.5 py-1 rounded-full text-[11px] font-semibold transition cursor-pointer disabled:opacity-50',
                            isVacation
                              ? 'bg-sky-600 text-white hover:bg-sky-700'
                              : 'border border-border bg-background text-muted-foreground hover:text-foreground hover:bg-muted'
                          )}
                        >
                          {isBusy
                            ? 'Salvando...'
                            : isVacation
                              ? `🏖️ ${vacLabel || 'Férias'}`
                              : 'Marcar férias'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {vacationWeeks.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-xs font-medium text-muted-foreground mr-1">
                Semanas cadastradas:
              </span>
              {vacationWeeks.map((v) => (
                <button
                  key={v.weekStartsOn}
                  type="button"
                  disabled={savingKey !== null}
                  onClick={() => void toggleWeek(v.weekStartsOn, false)}
                  title="Clique para remover esta semana de férias"
                  className="inline-flex items-center gap-1 rounded-full border border-sky-500/30 bg-sky-500/10 px-2.5 py-0.5 text-[11px] font-medium text-sky-700 dark:text-sky-300 hover:bg-red-500/15 hover:text-red-700 hover:border-red-500/30 transition cursor-pointer"
                >
                  <span>{v.weekStartsOn.split('-').reverse().join('/')}</span>
                  {v.label && <span className="opacity-75">({v.label})</span>}
                  <span aria-hidden>×</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
