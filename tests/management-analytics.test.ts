import assert from 'node:assert/strict';
import { test } from 'node:test';
import { rosterAnalytics, presenceAnalytics } from '../src/lib/management-analytics-core';
import { analysisWeeks } from '../src/lib/management-analytics';
const now = new Date('2026-11-04T15:00:00Z');
function member(id: string, periods: any[] = [], visits: any[] = []): any {
  return { id, name: id, institutionalMemberId: id === 'Ana' ? 1 : null, area: 'Gestão', email: 'private@example.invalid', status: 'APPROVED', role: 'MEMBER', active: true, course: 'Engenharia', phone: '21999999999', dre: '123456789', emergencyContactPhone: '21888888888', profileCompletedAt: now, credential: { memberId: id }, attendancePeriods: periods, attendanceVisits: visits };
}
const period = (start: string, end: string | null = null) => ({ startsOn: new Date(`${start}T00:00:00Z`), endsOn: end ? new Date(`${end}T00:00:00Z`) : null, targetSeconds: 7200 });
function visit(id: string, start: string, end: string, status = 'CLOSED'): any { return { id, memberId: id, checkedInAt: new Date(start), checkedOutAt: new Date(end), status, source: 'QR' }; }
const directory: any[] = [{ id: 1, name: 'Ana pública', area: 'Selecione uma opção', active: true, course: null, team: null }, { id: 2, name: 'Bia', area: 'Software', active: true, course: 'Computação', team: { name: 'Harpia', slug: 'harpia' } }, { id: 3, name: 'Inativo', area: 'Marketing', active: false, course: null, team: null }];
test('distribution uses active public identities, explicit Autônomos and real internal areas', () => {
  const data = rosterAnalytics(directory, [member('Ana')]);
  assert.equal(data.total, 3); assert.equal(data.active, 2); assert.equal(data.inactive, 1);
  assert.deepEqual(data.teams.map(row => row.label).sort(), ['Autônomos', 'Harpia']);
  assert.ok(data.areas.some(row => row.label === 'Gestão' && row.count === 1));
  assert.equal(data.complete, 1); assert.equal(data.accessReady, 1);
  assert.equal(data.missing?.find(row => row.label === 'Telefone não informado')?.count, 1);
  const serialized = JSON.stringify(data);
  for (const secret of ['21999999999', '123456789', 'private@example.invalid']) assert.ok(!serialized.includes(secret));
});
test('missing operational data does not turn unknown profile completeness into zero', () => {
  const data = rosterAnalytics(directory, null);
  assert.equal(data.complete, null); assert.equal(data.missing, null); assert.equal(data.active, 2);
});
test('history excludes current unfinished week and accounts only for each member enrolled weeks', () => {
  const members = [
    member('Ana', [period('2026-10-19')], [visit('ana', '2026-10-27T13:00:00Z', '2026-10-27T15:00:00Z')]),
    member('Novo', [period('2026-11-02')]),
    member('Pausado', [period('2026-10-19', '2026-10-26')]),
  ];
  const data = presenceAnalytics(members, directory, 4, now);
  assert.equal(data.trend.length, 4);
  assert.equal(data.trend.at(-1)?.key, '2026-10-26');
  assert.equal(data.previous.met, 1); assert.equal(data.previous.required, 1);
  assert.equal(data.current.required, 2); assert.equal(data.current.met, 0);
  assert.ok(!data.attention.some(row => row.name === 'Novo'));
  assert.equal(data.attention.find(row => row.id === 'Ana')?.requiredWeeks, 2);
  assert.equal(data.attention.find(row => row.id === 'Pausado')?.requiredWeeks, 1);
  assert.equal(data.totalRequired, 3); assert.equal(data.totalMet, 1); assert.equal(data.percentage, 33);
});
test('cross-week visits split hours correctly; review entries never inflate validated totals', () => {
  const visits = [visit('split', '2026-10-26T02:00:00Z', '2026-10-26T04:00:00Z'), visit('review', '2026-10-27T13:00:00Z', '2026-10-27T15:00:00Z', 'REVIEW')];
  const data = presenceAnalytics([member('Ana', [period('2026-10-19')], visits)], directory, 4, now);
  assert.equal(data.review, 1); assert.equal(data.previous.seconds, 3600);
  assert.equal(data.trend.at(-2)?.seconds, 3600); assert.equal(data.totalMet, 0);
});
test('empty tracking does not invent a rate and period input is bounded', () => {
  assert.equal(presenceAnalytics([], [], 4, now).percentage, null);
  for (const value of ['bad', 0, 200, undefined]) assert.equal(analysisWeeks(value), 8);
  for (const value of [4, 8, 12]) assert.equal(analysisWeeks(value), value);
});
