import { Temporal } from '@js-temporal/polyfill';

export const ATTENDANCE_TIME_ZONE = 'America/Sao_Paulo';
export const DEFAULT_WEEKLY_SECONDS = 7200;
export const MAX_SESSION_SECONDS = 12 * 60 * 60;

export function dateKey(date: Date) { return date.toISOString().slice(0, 10); }
export function calendarDate(key: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) throw new Error('Data inválida.');
  return Temporal.PlainDate.from(key);
}
export function weekKey(now: Date = new Date()) {
  const date = Temporal.Instant.from(now.toISOString()).toZonedDateTimeISO(ATTENDANCE_TIME_ZONE).toPlainDate();
  return date.subtract({ days: date.dayOfWeek - 1 }).toString();
}
export function weekRange(key: string = weekKey()) {
  const monday = calendarDate(key);
  if (monday.dayOfWeek !== 1) throw new Error('Selecione a segunda-feira da semana.');
  const end = monday.add({ days: 7 });
  return {
    key,
    start: new Date(monday.toZonedDateTime(ATTENDANCE_TIME_ZONE).epochMilliseconds),
    end: new Date(end.toZonedDateTime(ATTENDANCE_TIME_ZONE).epochMilliseconds),
    sunday: monday.add({ days: 6 }).toString(),
  };
}
export function weekDate(now: Date = new Date()) { return new Date(`${weekKey(now)}T00:00:00.000Z`); }
export function nextWeek(key: string, amount = 1) { return calendarDate(key).add({ weeks: amount }).toString(); }
export function localDateTime(value: unknown): Date {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/.test(value)) throw new Error('Informe data e horário de Brasília válidos.');
  return new Date(Temporal.PlainDateTime.from(value).toZonedDateTime(ATTENDANCE_TIME_ZONE, { disambiguation: 'reject' }).epochMilliseconds);
}
export function overlapSeconds(start: Date, end: Date, windowStart: Date, windowEnd: Date) {
  return Math.max(0, Math.floor((Math.min(end.getTime(), windowEnd.getTime()) - Math.max(start.getTime(), windowStart.getTime())) / 1000));
}
