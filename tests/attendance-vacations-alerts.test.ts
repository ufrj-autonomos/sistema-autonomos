import assert from 'node:assert/strict';
import test from 'node:test';
import { memberSummary, effectiveMonthlyTarget, type PeriodRecord, type VisitRecord } from '../src/lib/attendance/summary';
import { DEFAULT_MONTHLY_SECONDS, DEFAULT_WEEKLY_SECONDS } from '../src/lib/attendance/time';
import {
  findConsecutiveMissPairsToWarn,
  getBrasiliaClockInfo,
  lastBusinessDayOfMonth,
} from '../src/lib/attendance/alerts';

const techMember = { id: 'm1', name: 'Carlos', area: 'Software', email: 'carlos@example.com' };
const mgmtMember = { id: 'm2', name: 'Ana', area: 'Gestão', email: 'ana@example.com' };

const visit = (start: string, end: string): VisitRecord => ({
  id: `${start}-${end}`,
  memberId: 'm1',
  checkedInAt: new Date(start),
  checkedOutAt: new Date(end),
  status: 'CLOSED',
  source: 'QR',
});

test('vacation weeks exempt weekly hours and never enter missedWeeks history', () => {
  const period: PeriodRecord = {
    startsOn: new Date('2026-11-02T00:00:00Z'),
    endsOn: null,
    targetSeconds: DEFAULT_WEEKLY_SECONDS,
  };
  const now = new Date('2026-11-25T15:00:00Z');
  // Without vacation: weeks 2026-11-02 and 2026-11-09 up to selected '2026-11-09' -> 2 missed weeks
  const withoutVac = memberSummary(techMember, [period], [], '2026-11-09', now);
  assert.equal(withoutVac.requiredSeconds, 7200);
  assert.equal(withoutVac.missedWeeks, 2);

  // Mark 2026-11-09 as vacation
  const withVac = memberSummary(techMember, [period], [], '2026-11-09', now, undefined, [], ['2026-11-09']);
  assert.equal(withVac.requiredSeconds, 0);
  assert.equal(withVac.status, 'NOT_REQUIRED');
  assert.equal(withVac.missedWeeks, 1);
});

test('vacation weeks prorate or exempt monthly areas (Gestão/Marketing)', () => {
  const period: PeriodRecord = {
    startsOn: new Date('2026-11-01T00:00:00Z'),
    endsOn: null,
    targetSeconds: DEFAULT_WEEKLY_SECONDS,
  };
  // Mondays starting in November 2026: 2026-11-02, 2026-11-09, 2026-11-16, 2026-11-23, 2026-11-30 (5 Mondays)
  const monthStart = new Date('2026-11-01T03:00:00Z');
  const monthEnd = new Date('2026-12-01T03:00:00Z');

  assert.equal(effectiveMonthlyTarget(monthStart, monthEnd, new Set()), DEFAULT_MONTHLY_SECONDS);
  const allNovVac = new Set(['2026-11-02', '2026-11-09', '2026-11-16', '2026-11-23', '2026-11-30']);
  assert.equal(effectiveMonthlyTarget(monthStart, monthEnd, allNovVac), 0);

  const nowDec = new Date('2026-12-10T15:00:00Z');
  const exemptSummary = memberSummary(
    mgmtMember,
    [period],
    [],
    '2026-11-09',
    nowDec,
    undefined,
    [],
    allNovVac
  );
  assert.equal(exemptSummary.requiredSeconds, 0);
  assert.equal(exemptSummary.status, 'NOT_REQUIRED');
  assert.equal(exemptSummary.missedWeeks, 0);
});

test('Brasilia clock detects Friday 19h and Last Business Day of Month accurately', () => {
  // October 2026: 31st is Saturday -> Last business day is Friday, Oct 30, 2026
  assert.equal(lastBusinessDayOfMonth(2026, 10), 30);
  // November 2026: 30th is Monday -> Last business day is Nov 30, 2026
  assert.equal(lastBusinessDayOfMonth(2026, 11), 30);

  // 2026-10-30 19:00 BRT = 22:00 UTC (Friday AND last business day of Oct)
  const friLastBiz19 = getBrasiliaClockInfo(new Date('2026-10-30T22:00:00Z'));
  assert.equal(friLastBiz19.isFridayAtOrAfter19, true);
  assert.equal(friLastBiz19.isLastBusinessDayAtOrAfter19, true);

  // 2026-10-30 18:59 BRT = 21:59 UTC (Before 19h)
  const friBefore19 = getBrasiliaClockInfo(new Date('2026-10-30T21:59:00Z'));
  assert.equal(friBefore19.isFridayAtOrAfter19, false);
  assert.equal(friBefore19.isLastBusinessDayAtOrAfter19, false);

  // 2026-11-30 19:00 BRT = 22:00 UTC (Monday, last business day of Nov)
  const monLastBiz19 = getBrasiliaClockInfo(new Date('2026-11-30T22:00:00Z'));
  assert.equal(monLastBiz19.isFriday, false);
  assert.equal(monLastBiz19.isLastBusinessDayAtOrAfter19, true);
});

test('consecutive missed non-vacation cycles trigger automatic aviso pairs cleanly without duplicates', () => {
  const period: PeriodRecord = {
    startsOn: new Date('2026-11-02T00:00:00Z'),
    endsOn: null,
    targetSeconds: DEFAULT_WEEKLY_SECONDS,
  };

  // Current week is 2026-11-30, so 11-02, 11-09, 11-16, 11-23 are closed
  const now = new Date('2026-12-01T15:00:00Z');

  // Missed 11-02 & 11-09 -> 1st warning at 11-09; missed 11-16 & 11-23 -> 2nd warning at 11-23
  const twoPairs = findConsecutiveMissPairsToWarn({
    area: 'Software',
    periods: [period],
    visits: [],
    justifications: [],
    vacationWeeks: [],
    now,
    autoWarningStartsOn: '2026-11-02',
  });
  assert.equal(twoPairs.length, 2);
  assert.deepEqual(twoPairs[0].missedPeriods, ['2026-11-02', '2026-11-09']);
  assert.deepEqual(twoPairs[1].missedPeriods, ['2026-11-16', '2026-11-23']);

  // If 11-09 was already warned, 11-16 & 11-23 still produce 1 new warning
  const afterFirst = findConsecutiveMissPairsToWarn({
    area: 'Software',
    periods: [period],
    visits: [],
    justifications: [],
    vacationWeeks: [],
    now,
    autoWarningStartsOn: '2026-11-02',
    alreadyWarnedPeriodKeys: ['2026-11-09'],
  });
  assert.equal(afterFirst.length, 1);
  assert.deepEqual(afterFirst[0].missedPeriods, ['2026-11-16', '2026-11-23']);

  // Meeting week 11-09 breaks the consecutive streak -> 11-02 missed, 11-09 met, 11-16 missed, 11-23 missed -> only [11-16, 11-23]
  const brokenStreak = findConsecutiveMissPairsToWarn({
    area: 'Software',
    periods: [period],
    visits: [visit('2026-11-10T12:00:00Z', '2026-11-10T14:30:00Z')],
    justifications: [],
    vacationWeeks: [],
    now,
    autoWarningStartsOn: '2026-11-02',
  });
  assert.equal(brokenStreak.length, 1);
  assert.deepEqual(brokenStreak[0].missedPeriods, ['2026-11-16', '2026-11-23']);
});

test('monthly area consecutive misses emit AUTO_WARNING_MONTHLY', () => {
  const period: PeriodRecord = {
    startsOn: new Date('2026-09-01T00:00:00Z'),
    endsOn: null,
    targetSeconds: DEFAULT_WEEKLY_SECONDS,
  };
  const now = new Date('2026-11-05T15:00:00Z');
  const result = findConsecutiveMissPairsToWarn({
    area: 'Marketing',
    periods: [period],
    visits: [],
    justifications: [],
    vacationWeeks: [],
    now,
    autoWarningStartsOn: '2026-09-01',
  });
  assert.equal(result.length, 1);
  assert.equal(result[0].kind, 'AUTO_WARNING_MONTHLY');
  assert.deepEqual(result[0].missedPeriods, ['2026-09', '2026-10']);
});
