import './helpers/activity-memory';
import assert from 'node:assert/strict';
import { beforeEach, test } from 'node:test';
import { prisma } from '../src/lib/prisma';
import { getManagementOverview } from '../src/lib/management-overview';
import { savedTheme, themeBootstrap, THEME_STORAGE_KEY } from '../src/lib/theme';
import { runInNewContext } from 'node:vm';

Object.assign(process.env, { NODE_ENV: 'test' });
delete process.env.INSTITUTIONAL_DATABASE_URL;
process.env.DATABASE_URL = 'postgresql://test:test@database.example.invalid:5432/test';
const now = new Date('2026-11-04T15:00:00Z');
let failRequests = false, failPrevious = false, empty = false;
function stub(object: any, key: string, fn: (...args: any[]) => any) { object[key] = fn; }
const period = (start = '2026-10-19', end: string | null = null) => [{ startsOn: new Date(`${start}T00:00:00Z`), endsOn: end ? new Date(`${end}T00:00:00Z`) : null, targetSeconds: 7200 }];
const visit = (id: string, start: string, end: string, status = 'CLOSED') => ({ id, memberId: id, checkedInAt: new Date(start), checkedOutAt: new Date(end), status, source: 'QR' });
const member = (id: string, visits: any[], periods = period()) => ({ id, name: id, area: 'Gestão', email: null, institutionalMemberId: null, attendancePeriods: periods, attendanceVisits: visits });
const members = [
  member('Ana', [visit('ana-previous', '2026-10-28T13:00:00Z', '2026-10-28T14:00:00Z'), visit('ana-current', '2026-11-03T13:00:00Z', '2026-11-03T15:00:00Z')]),
  member('Bia', [visit('bia-previous', '2026-10-29T13:00:00Z', '2026-10-29T15:00:00Z')]),
  member('Caio', [], period('2026-11-02')),
  member('Davi', [], period('2026-10-19', '2026-10-26')),
  member('Eva', [visit('eva-review', '2026-10-28T13:00:00Z', '2026-10-28T15:00:00Z', 'REVIEW')]),
];
stub(prisma, '$transaction', (queries: Promise<unknown>[]) => Promise.all(queries));
stub(prisma.memberProfileChange, 'count', async ({ where }: any) => { assert.equal(where.status, 'PENDING'); if (failRequests) throw Error('unavailable'); return empty ? 0 : 1; });
stub(prisma.memberProfileChange, 'findMany', async ({ where, take }: any) => { assert.equal(where.status, 'PENDING'); assert.equal(take, 8); return empty ? [] : [{ id: 'request', member: { name: 'Ana' }, createdAt: now, changes: { photo: '/photo.webp' } }]; });
stub(prisma.member, 'count', async () => empty ? 0 : 2);
stub(prisma.attendanceSettings, 'findUnique', async () => ({ startedAt: new Date('2026-10-19T03:00:00Z'), maxSessionSeconds: 43200 }));
stub(prisma.member, 'findMany', async ({ include }: any) => {
  if (failPrevious && include.attendanceVisits.where.checkedInAt.lt.toISOString() === '2026-11-02T03:00:00.000Z') throw Error('previous unavailable');
  return empty ? [] : members;
});
beforeEach(() => { failRequests = false; failPrevious = false; empty = false; });

test('overview separates this week from the closed previous week using validated hours', async () => {
  const data = await getManagementOverview(now);
  assert.equal(data.currentWeek, '2026-11-02');
  assert.equal(data.previousWeek, '2026-10-26');
  assert.equal(data.current?.summary.met, 1);
  assert.equal(data.current?.summary.requiredMembers, 4);
  assert.deepEqual(data.belowTarget?.map(row => row.name), ['Ana', 'Eva']);
  assert.equal(data.belowTarget?.[0].remainingSeconds, 3600);
  assert.equal(data.belowTarget?.[1].completedSeconds, 0);
  assert.equal(data.belowTarget?.[1].pendingReviews, 1);
  assert.equal(data.siteRequests?.total, 1);
  assert.equal(data.pendingAccounts, 2);
});
test('new and suspended members are never listed as missing a target they did not have', async () => {
  const data = await getManagementOverview(now);
  assert.ok(!data.belowTarget?.some(row => row.name === 'Caio' || row.name === 'Davi'));
});
test('Monday in Brasília selects the new week even when the UTC date has already changed', async () => {
  const sunday = await getManagementOverview(new Date('2026-11-02T02:59:59Z'));
  assert.equal(sunday.currentWeek, '2026-10-26');
  assert.equal(sunday.previousWeek, '2026-10-19');
  const monday = await getManagementOverview(new Date('2026-11-02T03:00:00Z'));
  assert.equal(monday.currentWeek, '2026-11-02');
});
test('failed queries remain unavailable instead of showing false zero pending requests or perfect attendance', async () => {
  failRequests = true; failPrevious = true;
  const data = await getManagementOverview(now);
  assert.equal(data.siteRequests, null);
  assert.equal(data.previous, null);
  assert.equal(data.belowTarget, null);
  assert.equal(data.current?.summary.met, 1);
  assert.equal(data.pendingAccounts, 2);
});
test('empty datasets yield honest zero states', async () => {
  empty = true;
  const data = await getManagementOverview(now);
  assert.equal(data.siteRequests?.total, 0);
  assert.deepEqual(data.belowTarget, []);
  assert.equal(data.current?.summary.requiredMembers, 0);
});
test('dark stays the default and the prepaint respects only an explicit saved light choice', () => {
  for (const stored of [null, 'invalid', 'system', 'dark', 'light']) {
    const classes = new Set(['dark']);
    const element = { classList: { remove(...values: string[]) { values.forEach(value => classes.delete(value)); }, add(value: string) { classes.add(value); } }, style: {} as { colorScheme?: string } };
    runInNewContext(themeBootstrap, { localStorage: { getItem(key: string) { assert.equal(key, THEME_STORAGE_KEY); return stored; } }, document: { documentElement: element } });
    assert.deepEqual([...classes], [savedTheme(stored)]);
    assert.equal(element.style.colorScheme, stored === 'light' ? 'light' : 'dark');
  }
});
