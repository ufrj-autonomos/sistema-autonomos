import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

async function main() {
  // These destructive fixture tests must never run against the real production database.
  const url = process.env.TEST_DATABASE_URL;
  if (!url || !['localhost', '127.0.0.1', '[::1]'].includes(new URL(url).hostname)) {
    throw new Error('Defina TEST_DATABASE_URL para um PostgreSQL de testes local e descartável. O banco de produção não é aceito.');
  }
  process.env.DATABASE_URL = url;
  process.env.DIRECT_URL = url;
  process.env.JWT_SECRET = 'isolated-database-test-signing-key-at-least-32-characters';
  const { prisma } = await import('../src/lib/prisma');
  const { checkRateLimit, resetRateLimit } = await import('../src/lib/rate-limit');
  const { updateAccount } = await import('../src/lib/user-administration');
  const { hashPassword } = await import('../src/lib/auth');
  const marker = randomUUID();
  const bucket = `production-verification:${marker}`;
  const ids: string[] = [];
  let courseId: string | undefined;
  let memberId: number | undefined;
  try {
    const tables = await prisma.$queryRaw<Array<{ name: string; protected: boolean }>>`
      SELECT c.relname AS name, c.relrowsecurity AS protected
      FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
      WHERE n.nspname='public' AND c.relname IN ('User','Session','AuthRateLimit','Course','Module','Lesson','Exercise','CourseProgress','LessonProgress','ExerciseProgress','Team','Member','Project','AttendanceSettings','AttendancePeriod','AttendanceVisit','AttendancePunch','AttendanceAudit')
    `;
    assert.equal(tables.length, 18);
    assert.ok(tables.every(table => table.protected), 'all application tables require RLS');
    const roles = await prisma.$queryRaw<Array<{ exists: boolean }>>`SELECT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='anon') AS exists`;
    if (roles[0].exists) {
      await assert.rejects(prisma.$transaction(async tx => {
        await tx.$executeRawUnsafe('SET LOCAL ROLE anon');
        await tx.user.count();
      }), (error: any) => String(error.message).includes('permission denied') || error.meta?.code === '42501');
    }

    const concurrent = await Promise.all(Array.from({ length: 9 }, () => checkRateLimit(bucket, 3, 60)));
    assert.equal(concurrent.filter(response => response === null).length, 3, 'only three concurrent attempts may pass');
    assert.equal(concurrent.filter(response => response?.status === 429).length, 6);
    await resetRateLimit(bucket);

    const passwordHash = await hashPassword(randomUUID());
    const actor = await prisma.user.create({ data: { name: 'Temporary production verification', email: `verification-admin-${marker}@example.invalid`, passwordHash, role: 'ADMIN', status: 'APPROVED' } });
    ids.push(actor.id);
    const target = await prisma.user.create({ data: { name: 'Temporary production verification', email: `verification-user-${marker}@example.invalid`, passwordHash, role: 'TRAINEE', status: 'APPROVED' } });
    ids.push(target.id);
    const course = await prisma.course.create({ data: { slug: `verification-${marker}`, title: 'Temporary verification', description: 'Temporary fixture', published: false,
      modules: { create: { title: 'Temporary module', orderIndex: 1, lessons: { create: { title: 'Temporary lesson', slug: 'temporary', orderIndex: 1, textContent: 'Temporary fixture', exercises: { create: { title: 'Temporary exercise', prompt: 'Temporary fixture' } } } } } },
    }, include: { modules: { include: { lessons: { include: { exercises: true } } } } } });
    courseId = course.id;
    const lesson = course.modules[0].lessons[0];
    const member = await prisma.member.create({ data: { name: 'Temporary verification', role: 'Test', area: 'Software', userId: target.id } });
    memberId = member.id;
    await prisma.session.create({ data: { userId: target.id, sessionToken: randomUUID(), expiresAt: new Date(Date.now() + 60_000) } });
    await prisma.courseProgress.create({ data: { userId: target.id, courseId: course.id } });
    await prisma.lessonProgress.create({ data: { userId: target.id, lessonId: lesson.id } });
    await prisma.exerciseProgress.create({ data: { userId: target.id, exerciseId: lesson.exercises[0].id } });
    const deleted = await updateAccount(actor.id, target.id, { status: 'REJECTED' });
    assert.equal(deleted.deleted, true);
    assert.equal(await prisma.user.findUnique({ where: { id: target.id } }), null);
    for (const model of [prisma.session, prisma.courseProgress, prisma.lessonProgress, prisma.exerciseProgress]) {
      assert.equal(await (model as any).count({ where: { userId: target.id } }), 0);
    }
    assert.equal((await prisma.member.findUniqueOrThrow({ where: { id: member.id } })).userId, null);
    console.log('PostgreSQL verificado: RLS, bloqueio anônimo, limite concorrente e exclusão com cascata passaram.');
  } finally {
    await resetRateLimit(bucket);
    if (ids.length) await prisma.user.deleteMany({ where: { id: { in: ids } } });
    if (courseId) await prisma.course.delete({ where: { id: courseId } });
    if (memberId) await prisma.member.delete({ where: { id: memberId } });
    await prisma.$disconnect();
    console.log('Dados temporários de verificação removidos.');
  }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
