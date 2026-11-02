import assert from 'node:assert/strict';
import { test } from 'node:test';
import { prisma } from '../src/lib/prisma';
import { getGestaoStats } from '../src/lib/gestao';
import { PrismaClient as InstitutionalClient } from '../src/generated/institutional';

function stub(object: any, name: string, fn: (...args: any[]) => any) { object[name] = fn; }
process.env.DATABASE_URL = 'postgresql://test:password@db.example.invalid:5432/postgres';
stub(prisma, '$queryRaw', async () => [{ value: 1 }]);
process.env.INSTITUTIONAL_DATABASE_URL = 'postgresql://institutional_editor:password@db.example.invalid:5432/postgres';
const institutional = new InstitutionalClient({ datasourceUrl: process.env.INSTITUTIONAL_DATABASE_URL });
(globalThis as any).institutionalDb = institutional;
for (const model of [institutional.team, institutional.member, institutional.project]) stub(model, 'findMany', async () => []);
// Generic legacy data must never populate the directory or management indicators.
for (const model of [prisma.team, prisma.member, prisma.project]) stub(model, 'findMany', async () => { throw new Error('Legacy directory must not be read'); });
for (const model of [prisma.user, prisma.lesson, prisma.exercise]) stub(model, 'count', async () => 0);
stub(prisma.course, 'findUnique', async () => null);

test('an empty database does not fabricate members, projects, lessons or uptime', async () => {
  const data = await getGestaoStats();
  assert.equal(data.kpis.totalMembers, 0);
  assert.equal(data.kpis.activeProjects, 0);
  assert.equal(data.kpis.totalStudents, 0);
  assert.equal(data.kpis.platformUptime, 'Não monitorado');
  assert.deepEqual(data.members, []);
  assert.deepEqual(data.projects, []);
  assert.deepEqual(data.divisions, []);
  assert.equal(data.system.courses.lessonsCount, 0);
  assert.equal(data.system.courses.status, 'offline');
  assert.equal(data.operationalLogs.some(log => log.source === 'TELEMETRY'), false);
  assert.ok(!JSON.stringify(data).includes('99.98%'));
});

test('database failures do not turn into successful simulated metrics', async () => {
  stub(prisma, '$queryRaw', async () => { throw new Error('Database unavailable'); });
  await assert.rejects(getGestaoStats(), /Database unavailable/);
});
