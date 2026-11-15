export const LAB_TIME_ZONE = 'America/Sao_Paulo';
export function formatDuration(seconds: number) {
  if (seconds > 0 && seconds < 60) return 'menos de 1 min';
  const minutes = Math.floor(Math.max(0, seconds) / 60);
  return `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, '0')}min`;
}
export function formatLabDate(value: string, withTime = false) {
  return new Intl.DateTimeFormat('pt-BR', { timeZone: LAB_TIME_ZONE, day: '2-digit', month: '2-digit', year: 'numeric', ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}) }).format(new Date(value));
}
export function formatLabTime(value: string) { return new Intl.DateTimeFormat('pt-BR', { timeZone: LAB_TIME_ZONE, hour: '2-digit', minute: '2-digit' }).format(new Date(value)); }
export function inputLabDateTime(value: string) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: LAB_TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date(value));
  const p = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
}
export function shiftWeek(value: string, amount: number) {
  const date = new Date(`${value}T12:00:00Z`); date.setUTCDate(date.getUTCDate() + amount * 7); return date.toISOString().slice(0, 10);
}
export function mondayForDate(value: string) {
  const date = new Date(`${value}T12:00:00Z`); date.setUTCDate(date.getUTCDate() - (date.getUTCDay() + 6) % 7); return date.toISOString().slice(0, 10);
}
export const GOAL_LABELS = { MET: 'Meta cumprida', PENDING: 'Em andamento', MISSED: 'Abaixo da meta', NOT_REQUIRED: 'Sem meta nesta semana' };
export const VISIT_LABELS = { OPEN: 'Em aberto', CLOSED: 'Validado', REVIEW: 'Revisão necessária', VOID: 'Desconsiderado' };

export type AttendanceCardTier = 'IN_LAB' | 'MET' | 'PROGRESS' | 'ZERO';

export interface AttendanceCardTheme {
  tier: AttendanceCardTier;
  tierLabel: string;
  cardClass: string;
  badgeClass: string;
  barClass: string;
  accentText: string;
}

export function getAttendanceCardTheme(member: {
  status: string;
  completedSeconds: number;
  requiredSeconds: number;
  openVisit: { needsReview: boolean } | null;
}): AttendanceCardTheme {
  if (member.openVisit && !member.openVisit.needsReview) {
    return {
      tier: 'IN_LAB',
      tierLabel: 'No laboratório agora',
      cardClass:
        'border-blue-500/50 bg-blue-500/[0.08] dark:border-blue-400/40 dark:bg-blue-500/[0.12]',
      badgeClass:
        'border-blue-500/40 bg-blue-500/15 text-blue-700 dark:text-blue-300',
      barClass: 'bg-blue-500',
      accentText: 'text-blue-700 dark:text-blue-300',
    };
  }

  if (
    member.status === 'MET' ||
    (member.requiredSeconds > 0 && member.completedSeconds >= member.requiredSeconds)
  ) {
    return {
      tier: 'MET',
      tierLabel: 'Meta cumprida',
      cardClass:
        'border-emerald-500/50 bg-emerald-500/[0.08] dark:border-emerald-400/40 dark:bg-emerald-500/[0.12]',
      badgeClass:
        'border-emerald-500/40 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
      barClass: 'bg-emerald-500',
      accentText: 'text-emerald-700 dark:text-emerald-300',
    };
  }

  if (member.completedSeconds > 600) {
    return {
      tier: 'PROGRESS',
      tierLabel: 'Em andamento (> 10 min)',
      cardClass:
        'border-amber-500/50 bg-amber-500/[0.08] dark:border-amber-400/40 dark:bg-amber-500/[0.12]',
      badgeClass:
        'border-amber-500/40 bg-amber-500/15 text-amber-800 dark:text-amber-300',
      barClass: 'bg-amber-500',
      accentText: 'text-amber-800 dark:text-amber-300',
    };
  }

  return {
    tier: 'ZERO',
    tierLabel: member.completedSeconds === 0 ? '0h registradas' : 'Menos de 10 min',
    cardClass:
      'border-rose-500/50 bg-rose-500/[0.08] dark:border-rose-400/40 dark:bg-rose-500/[0.12]',
    badgeClass:
      'border-rose-500/40 bg-rose-500/15 text-rose-700 dark:text-rose-300',
    barClass: 'bg-rose-500',
    accentText: 'text-rose-700 dark:text-rose-300',
  };
}
