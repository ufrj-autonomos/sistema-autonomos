import assert from 'node:assert/strict';
import { test } from 'node:test';
import { justificationInput, justificationDecision } from '../src/lib/attendance/justifications';
import { memberSummary } from '../src/lib/attendance/summary';
import { presenceAnalytics, type AnalyticsMember } from '../src/lib/management-analytics-core';
import { MAX_SESSION_SECONDS } from '../src/lib/attendance/time';
const now = new Date('2026-11-18T12:00:00Z');
const member = { id: 'member', name: 'Membro', email: null, area: 'Software' };
const periods = [{ startsOn: new Date('2026-11-02T00:00:00Z'), endsOn: null, targetSeconds: 7200 }];
const credits = [{ weekStartsOn: new Date('2026-11-02T00:00:00Z') }];
const visit = { id: 'visit', memberId: 'member', checkedInAt: new Date('2026-11-03T12:00:00Z'), checkedOutAt: new Date('2026-11-03T13:00:00Z'), status: 'CLOSED' as const, source: 'QR' };
test('justification inputs accept real reasons and past/current Mondays and reject identity/status injection', () => {
  const input = { week: '2026-11-02', reason: 'OFFSITE_EVENT', details: 'Representação da equipe em evento.' };
  assert.equal(justificationInput(input, now).weekStartsOn.toISOString(), '2026-11-02T00:00:00.000Z');
  for (const change of [{ week: '2026-11-03' }, { week: '2026-11-23' }, { reason: 'FORGED' }, { details: 'curto' }, { details: 'a'.repeat(3001) }, { memberId: 'admin' }, { status: 'APPROVED' }]) assert.throws(() => justificationInput({ ...input, ...change }, now));
  assert.deepEqual(justificationDecision({ id: 'request', status: 'REJECTED', note: ' Esclareça a semana. ' }), { id: 'request', status: 'REJECTED', reviewNote: 'Esclareça a semana.' });
  for (const change of [{ status: 'PENDING' }, { actorId: 'admin' }, { note: 'a'.repeat(1001) }]) assert.throws(() => justificationDecision({ id: 'request', status: 'APPROVED', ...change }));
});
test('approval completes two hours only in its reference week without duplicating recorded hours or visits', () => {
  const before = memberSummary(member, periods, [visit], '2026-11-02', now);
  const after = memberSummary(member, periods, [visit], '2026-11-02', now, MAX_SESSION_SECONDS, credits);
  assert.equal(before.status, 'MISSED'); assert.equal(before.completedSeconds, 3600);
  assert.equal(after.status, 'MET'); assert.equal(after.completedSeconds, 7200); assert.equal(after.justifiedSeconds, 3600); assert.equal(after.visits.length, 1);
  assert.equal(memberSummary(member, periods, [], '2026-11-02', now, MAX_SESSION_SECONDS, credits).completedSeconds, 7200);
  const longer = { ...visit, checkedOutAt: new Date('2026-11-03T15:00:00Z') };
  const over = memberSummary(member, periods, [longer], '2026-11-02', now, MAX_SESSION_SECONDS, credits);
  assert.equal(over.completedSeconds, 10800); assert.equal(over.justifiedSeconds, 0);
  assert.equal(memberSummary(member, periods, [], '2026-11-09', now, MAX_SESSION_SECONDS, credits).completedSeconds, 0);
  assert.equal(memberSummary(member, periods, [], '2026-11-16', now, MAX_SESSION_SECONDS, credits).missedWeeks, 1);
  assert.equal(memberSummary(member, [], [], '2026-11-02', now, MAX_SESSION_SECONDS, credits).completedSeconds, 0, 'no credit before enrollment');
});
test('management analytics use the same approved-week credit and correct historical absence totals', () => {
  const row: AnalyticsMember = { ...member, institutionalMemberId: null, status: 'APPROVED', role: 'MEMBER', active: true, course: null, phone: null, dre: null, emergencyContactPhone: null, profileCompletedAt: null, credential: null, attendancePeriods: periods, attendanceVisits: [], attendanceJustifications: credits };
  const analytics = presenceAnalytics([row], null, 2, now);
  assert.equal(analytics.trend[0].key, '2026-11-02'); assert.equal(analytics.trend[0].met, 1);
  assert.equal(analytics.trend[1].met, 0); assert.equal(analytics.attention[0].missedWeeks, 1);
});
