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
