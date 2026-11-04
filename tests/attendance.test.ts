import './helpers/activity-memory';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { NextRequest } from 'next/server';
import { weekKey, weekRange, weekDate, overlapSeconds, localDateTime } from '../src/lib/attendance/time';
import { memberSummary, reportSummary, type VisitRecord, type PeriodRecord } from '../src/lib/attendance/summary';
import { attendanceCsv, selectedWeek } from '../src/lib/attendance/service';
import { formatDuration } from '../src/lib/attendance/format';
import { GET as personal } from '../src/app/api/attendance/me/route';
import { POST as scan } from '../src/app/api/attendance/scan/route';
import { GET as adminReport } from '../src/app/api/admin/attendance/route';
import { GET as qr } from '../src/app/api/admin/attendance/qr/route';
import { POST as manage } from '../src/app/api/admin/attendance/visits/route';
import { GET as exportReport } from '../src/app/api/admin/attendance/export/route';

const member = { id: 1, name: 'Integrante', email: 'member@example.invalid', area: 'Software' };
const now = new Date('2026-11-16T15:00:00Z');
const period: PeriodRecord = { startsOn: new Date('2026-11-02T00:00:00Z'), endsOn: null, targetSeconds: 7200 };
function visit(start: string, end: string | null, status: VisitRecord['status'] = 'CLOSED'): VisitRecord { return { id: start, memberId: 1, checkedInAt: new Date(start), checkedOutAt: end ? new Date(end) : null, status, source: 'QR' }; }

test('weeks start on Monday at midnight in São Paulo, not at UTC midnight', () => {
  assert.equal(weekKey(new Date('2026-11-02T02:59:59Z')), '2026-10-26');
  assert.equal(weekKey(new Date('2026-11-02T03:00:00Z')), '2026-11-02');
  assert.equal(weekRange('2026-11-02').start.toISOString(), '2026-11-02T03:00:00.000Z');
  assert.equal(weekRange('2026-11-02').end.toISOString(), '2026-11-09T03:00:00.000Z');
  assert.equal(weekDate(new Date('2026-11-05T12:00Z')).toISOString(), '2026-11-02T00:00:00.000Z');
});

test('week boundaries respect daylight-saving transitions and year changes', () => {
  const daylightSaving = weekRange('2018-10-29');
  assert.equal((daylightSaving.end.getTime() - daylightSaving.start.getTime()) / 3600000, 167);
  assert.equal(weekKey(new Date('2027-01-01T12:00Z')), '2026-12-28');
  assert.throws(() => weekRange('2026-11-03'));
});

test('closed sessions crossing Sunday/Monday split their hours between weeks', () => {
  const values = [visit('2026-11-09T02:30:00Z', '2026-11-09T04:30:00Z')];
  assert.equal(memberSummary(member, [period], values, '2026-11-02', now).completedSeconds, 1800);
  assert.equal(memberSummary(member, [period], values, '2026-11-09', now).completedSeconds, 5400);
});

test('two hours are required exactly, without rounded-up credit', () => {
  const short = memberSummary(member, [period], [visit('2026-11-03T12:00:00Z', '2026-11-03T13:59:59Z')], '2026-11-02', now);
  assert.equal(short.completedSeconds, 7199); assert.equal(short.percentage, 99); assert.equal(short.status, 'MISSED'); assert.equal(short.remainingSeconds, 1);
  assert.equal(formatDuration(1), 'menos de 1 min');
  const exact = memberSummary(member, [period], [visit('2026-11-03T12:00:00Z', '2026-11-03T14:00:00Z')], '2026-11-02', now);
  assert.equal(exact.status, 'MET'); assert.equal(exact.percentage, 100);
});

test('current incomplete weeks are pending and are never counted as past failures', () => {
  const result = memberSummary(member, [period], [], '2026-11-16', now);
  assert.equal(result.status, 'PENDING'); assert.equal(result.missedWeeks, 2);
});

test('weeks before enrollment and suspended periods do not create absences', () => {
  const paused = { ...period, endsOn: new Date('2026-11-09T00:00Z') };
  const resumed = { ...period, startsOn: new Date('2026-11-16T00:00Z') };
  assert.equal(memberSummary(member, [paused, resumed], [], '2026-11-16', now).missedWeeks, 1);
  assert.equal(memberSummary(member, [period], [], '2026-10-26', now).requiredSeconds, 0);
  assert.equal(memberSummary(member, [paused], [], '2026-11-09', now).status, 'NOT_REQUIRED');
});

test('open, under-review and void visits do not contribute hours', () => {
  const values = [visit('2026-11-16T10:00Z', null, 'OPEN'), visit('2026-11-03T10:00Z', '2026-11-03T14:00Z', 'REVIEW'), visit('2026-11-04T10:00Z', '2026-11-04T14:00Z', 'VOID')];
  const result = memberSummary(member, [period], values, '2026-11-16', now);
  assert.equal(result.completedSeconds, 0); assert.ok(result.openVisit); assert.equal(result.missedWeeks, 2);
  const past = memberSummary(member, [period], values, '2026-11-02', now);
  assert.equal(past.completedSeconds, 0); assert.equal(past.pendingReviews, 1);
});

test('stale open entries are flagged for review and excluded from the in-lab count', () => {
  const result = memberSummary(member, [period], [visit('2026-11-15T18:00Z', null, 'OPEN')], '2026-11-16', now);
  assert.equal(result.openVisit?.needsReview, true); assert.equal(result.pendingReviews, 1);
  assert.equal(reportSummary([result]).inLab, 0);
});

test('past failure totals stop at the selected week', () => {
  assert.equal(memberSummary(member, [period], [], '2026-11-02', now).missedWeeks, 1);
  assert.equal(memberSummary(member, [period], [], '2026-11-09', now).missedWeeks, 2);
});

test('time correction parses Brasília local time and rejects invalid or ambiguous input', () => {
  assert.equal(localDateTime('2026-11-02T10:30').toISOString(), '2026-11-02T13:30:00.000Z');
  assert.throws(() => localDateTime('2018-11-04T00:30'));
  assert.throws(() => localDateTime('2026-11-02T10:30Z'));
  assert.equal(overlapSeconds(new Date('2026-11-02T10:00Z'), new Date('2026-11-02T11:00Z'), new Date('2026-11-03T10:00Z'), new Date('2026-11-03T11:00Z')), 0);
});

test('week filters reject invalid dates, future weeks and non-Mondays', () => {
  assert.equal(selectedWeek('2026-11-02', now), '2026-11-02');
  for (const key of ['2026-13-01', '2026-11-03', '2026-11-23', '../../secret']) assert.throws(() => selectedWeek(key, now));
});

test('CSV export escapes spreadsheet formulas and quotes in member-controlled names', () => {
  const result = memberSummary({ ...member, name: ' =HYPERLINK("https://example.invalid")' }, [period], [], '2026-11-02', now);
  const csv = attendanceCsv({ serverNow: now.toISOString(), week: { key: '2026-11-02', sunday: '2026-11-08', start: weekRange('2026-11-02').start.toISOString(), end: weekRange('2026-11-02').end.toISOString(), isCurrent: false, isClosed: true }, members: [result], summary: reportSummary([result]), trackingStartedAt: now.toISOString() });
  assert.ok(csv.includes('"\' =HYPERLINK(""https://example.invalid"")"'));
  assert.ok(csv.includes('Abaixo da meta'));
});

test('all attendance handlers independently require authentication', async () => {
  for (const handler of [personal, adminReport, qr, exportReport]) assert.equal((await handler(new NextRequest('https://app.example.invalid/api/attendance'))).status, 401);
  for (const handler of [scan, manage]) assert.equal((await handler(new NextRequest('https://app.example.invalid/api/attendance', { method: 'POST' }))).status, 401);
});
