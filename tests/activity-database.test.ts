import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
async function main() {
  const url = process.env.TEST_DATABASE_URL;
  if (!url || !['localhost', '127.0.0.1', '[::1]'].includes(new URL(url).hostname)) throw Error('Use somente um TEST_DATABASE_URL local descartável.');
  process.env.DATABASE_URL = url; process.env.DIRECT_URL = url;
  const { prisma } = await import('../src/lib/prisma');
  const { writeActivity } = await import('../src/lib/activity/server');
  const { activityLogs } = await import('../src/lib/activity/query');
  const marker = randomUUID();
  let actorId: string | undefined;
  const targetPath = `/gestao/projetos/${marker}`;
  try {
    const rls = await prisma.$queryRaw<{ protected: boolean }[]>`SELECT relrowsecurity AS protected FROM pg_class WHERE relname='ActivityLog'`;
    assert.equal(rls[0]?.protected, true);
    const actor = await prisma.member.create({ data: { name: `Log QA ${marker}`, email: `log-${marker}@example.invalid`, role: 'MANAGEMENT', status: 'APPROVED' } });
    actorId = actor.id;
    const data = { actor, kind: 'SERVER_ACTION', action: 'updateRecord', path: '/gestao', targetPath, outcome: 'SUCCESS' };
    // Exercise the native unique upsert under concurrency, not an in-memory mock.
    assert.ok((await Promise.all(Array.from({ length: 12 }, () => writeActivity(data)))).every(Boolean));
    const rows = await prisma.activityLog.findMany({ where: { targetPath } });
    assert.equal(rows.length, 1); assert.equal(rows[0].occurrences, 12);
    await writeActivity({ ...data, outcome: 'FAILURE' });
    await prisma.activityLog.create({ data: { actorId, actorName: actor.name, kind: 'API_REQUEST', action: 'GET /api/auth/me', path: '/api/auth/me', outcome: 'SUCCESS', targetPath } });
    await prisma.activityLog.create({ data: { actorId, actorName: actor.name, kind: 'API_REQUEST', action: 'POST /api/profile/photo', path: '/api/profile/photo', outcome: 'SUCCESS', targetPath } });
    const filter = { q: marker, kind: '', outcome: '', days: 7 };
    const result = await activityLogs(filter);
    assert.equal(result.total, 3, 'legacy writes remain visible; polling is excluded');
    assert.equal(result.summary.actions, 14); assert.equal(result.summary.failures, 1); assert.equal(result.summary.users, 1);
    const failure = await activityLogs({ ...filter, outcome: 'FAILURE' });
    assert.equal(failure.total, 1); assert.equal(failure.summary.actions, 1);
    const translated = await activityLogs({ q: 'Enviou foto de perfil', kind: '', outcome: '', days: 7 });
    assert.ok(translated.items.some(item => item.targetPath === targetPath), 'Portuguese labels find legacy events');
    await prisma.member.delete({ where: { id: actor.id } }); actorId = undefined;
    const detached = await prisma.activityLog.findFirstOrThrow({ where: { targetPath } });
    assert.equal(detached.actorId, null); assert.equal(detached.actorName, actor.name);
    const roles = await prisma.$queryRaw<{ exists: boolean }[]>`SELECT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='anon') AS exists`;
    if (roles[0].exists) await assert.rejects(prisma.$transaction(async tx => { await tx.$executeRawUnsafe('SET LOCAL ROLE anon'); await tx.activityLog.count(); }));
    console.log('Logs PostgreSQL: resumo concorrente, filtros, histórico, RLS e snapshot após exclusão passaram.');
  } finally {
    await prisma.activityLog.deleteMany({ where: { targetPath } });
    if (actorId) await prisma.member.delete({ where: { id: actorId } });
    await prisma.$disconnect();
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
