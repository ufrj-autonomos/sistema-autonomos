'use client';

import { useMemo, useState } from 'react';
import { Award, Calendar, MessageSquareText, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { HomeAreaEvaluationsDTO, HomeAreaScoreItemDTO } from '@/lib/evaluations/types';

function scoreBadgeStyle(score: number | null) {
  if (score === null) {
    return {
      badge: 'border-border bg-muted/60 text-muted-foreground',
      bar: 'bg-muted-foreground/30',
      label: 'Sem nota',
    };
  }
  if (score >= 8.5) {
    return {
      badge: 'border-emerald-500/35 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
      bar: 'bg-emerald-500',
      label: 'Excelente',
    };
  }
  if (score >= 7.0) {
    return {
      badge: 'border-sky-500/35 bg-sky-500/15 text-sky-700 dark:text-sky-300',
      bar: 'bg-sky-500',
      label: 'Bom',
    };
  }
  if (score >= 5.0) {
    return {
      badge: 'border-amber-500/35 bg-amber-500/15 text-amber-800 dark:text-amber-300',
      bar: 'bg-amber-500',
      label: 'Atenção',
    };
  }
  return {
    badge: 'border-red-500/35 bg-red-500/15 text-red-700 dark:text-red-300',
    bar: 'bg-red-500',
    label: 'Crítico',
  };
}

function formatScore(score: number | null) {
  if (score === null) return '—';
  return score.toFixed(1).replace('.', ',');
}

function formatShortDate(iso: string | null) {
  if (!iso) return null;
  try {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      timeZone: 'America/Sao_Paulo',
    }).format(new Date(iso));
  } catch {
    return null;
  }
}

const TEAM_GROUPS: { slug: 'harpia' | 'nautilus' | 'autonomos'; title: string; badgeClass: string }[] = [
  {
    slug: 'harpia',
    title: 'Divisão Harpia (UAV)',
    badgeClass: 'bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/25',
  },
  {
    slug: 'nautilus',
    title: 'Divisão Nautilus (AUV)',
    badgeClass: 'bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/25',
  },
  {
    slug: 'autonomos',
    title: 'Geral (Autônomos)',
    badgeClass: 'bg-zinc-500/10 text-zinc-700 dark:text-zinc-300 border-border',
  },
];

function AreaScoreCard({ item }: { item: HomeAreaScoreItemDTO }) {
  const tone = scoreBadgeStyle(item.score);
  const updatedLabel = formatShortDate(item.updatedAt);

  return (
    <div
      className={cn(
        'rounded-xl border p-4 transition-colors flex flex-col justify-between gap-3 shadow-xs',
        item.isUserArea
          ? 'border-primary/50 bg-primary/5 ring-1 ring-primary/20'
          : 'border-border bg-card'
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <h4 className="font-semibold text-sm text-foreground">
              {item.area === 'Gestão' ? 'Gente e Gestão' : item.area}
            </h4>
            {item.isUserArea && (
              <span className="inline-flex items-center gap-1 rounded-full border border-primary/40 bg-primary/15 px-2 py-0.5 text-[10px] font-semibold text-primary">
                <Sparkles className="h-2.5 w-2.5" />
                Sua área
              </span>
            )}
          </div>
          <p className="mt-0.5 text-[11px] text-muted-foreground">{item.teamName}</p>
        </div>

        <div
          className={cn(
            'shrink-0 rounded-lg border px-2.5 py-1 text-center min-w-[64px]',
            tone.badge
          )}
        >
          <span className="block font-mono text-lg font-bold leading-none tabular-nums">
            {formatScore(item.score)}
          </span>
          <span className="mt-0.5 block text-[10px] font-medium opacity-85">
            {item.score !== null ? '/ 10' : 'Pendente'}
          </span>
        </div>
      </div>

      <div className="space-y-2">
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className={cn('h-full rounded-full transition-all duration-300', tone.bar)}
            style={{ width: `${item.score !== null ? Math.min(100, Math.max(4, item.score * 10)) : 0}%` }}
          />
        </div>

        {item.notes ? (
          <p className="text-xs leading-relaxed text-muted-foreground line-clamp-3 flex items-start gap-1.5">
            <MessageSquareText className="h-3.5 w-3.5 shrink-0 mt-0.5 text-muted-foreground/80" />
            <span>{item.notes}</span>
          </p>
        ) : (
          <p className="text-[11px] italic text-muted-foreground/75">
            {item.score !== null
              ? 'Nota lançada sem observação adicional.'
              : 'Avaliação deste semestre ainda não lançada.'}
          </p>
        )}

        {updatedLabel && (
          <p className="text-[10px] text-muted-foreground/80 pt-1 border-t border-border/50">
            Atualizada em {updatedLabel}
          </p>
        )}
      </div>
    </div>
  );
}

export function HomeAreaScoresSection({ data }: { data: HomeAreaEvaluationsDTO }) {
  const [selectedPeriod, setSelectedPeriod] = useState(data.currentPeriodCode);
  const items = data.evaluationsByPeriod[selectedPeriod] ?? [];

  const summary = useMemo(() => {
    const scored = items.filter((item) => typeof item.score === 'number');
    const avg =
      scored.length > 0
        ? (scored.reduce((acc, item) => acc + (item.score ?? 0), 0) / scored.length)
            .toFixed(1)
            .replace('.', ',')
        : '—';
    return { scoredCount: scored.length, totalCount: items.length, avg };
  }, [items]);

  return (
    <section aria-labelledby="home-area-scores-heading" className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2
              id="home-area-scores-heading"
              className="font-display text-lg font-semibold text-foreground flex items-center gap-2"
            >
              <Award className="h-5 w-5 text-amber-500" />
              Nota das Áreas · Semestre {selectedPeriod}
            </h2>
            {summary.scoredCount > 0 && (
              <span className="rounded-full border border-border bg-muted/50 px-2.5 py-0.5 font-mono text-xs font-medium text-foreground">
                Média geral: {summary.avg}/10 ({summary.scoredCount}/{summary.totalCount} áreas)
              </span>
            )}
          </div>
          <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
            Desempenho semestral oficial das áreas da equipe. Avaliações individuais permanecem restritas à coordenação e administração.
          </p>
        </div>

        {data.periods.length > 1 && (
          <div className="flex items-center gap-1.5 rounded-lg border border-border bg-card p-1">
            <Calendar className="h-3.5 w-3.5 ml-1.5 text-muted-foreground" />
            {data.periods.map((p) => (
              <button
                key={p.code}
                type="button"
                onClick={() => setSelectedPeriod(p.code)}
                className={cn(
                  'rounded-md px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer',
                  selectedPeriod === p.code
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                )}
              >
                {p.code}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-5">
        {TEAM_GROUPS.map((group) => {
          const groupItems = items.filter((item) => item.teamSlug === group.slug);
          if (groupItems.length === 0) return null;
          return (
            <div key={group.slug} className="space-y-2.5">
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    'inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold',
                    group.badgeClass
                  )}
                >
                  {group.title}
                </span>
              </div>
              <div
                className={cn(
                  'grid gap-3',
                  groupItems.length === 2
                    ? 'grid-cols-1 md:grid-cols-2'
                    : 'grid-cols-1 md:grid-cols-3'
                )}
              >
                {groupItems.map((item) => (
                  <AreaScoreCard key={item.scopeKey} item={item} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
