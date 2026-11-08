import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
async function main() {
  const url = process.env.TEST_DATABASE_URL;
  if (!url || !['localhost', '127.0.0.1', '[::1]'].includes(new URL(url).hostname)) throw Error('Use somente um PostgreSQL local descartável.');
  process.env.DATABASE_URL = url; process.env.DIRECT_URL = url; process.env.JWT_SECRET = 'isolated-meeting-minutes-test-key-at-least-32-characters';
  process.env.GEMINI_API_KEY = ''; process.env.GEMINI_API = '';
  const { prisma } = await import('../src/lib/prisma');
  const { createUserSession, SESSION_COOKIE_NAME } = await import('../src/lib/session');
  const { getMeetingsDashboardData, pendingMeetingMinutes } = await import('../src/lib/meetings/service');
  const { NextRequest } = await import('next/server');
  const meetings = await import('../src/app/api/reunioes/route');
  const minutes = await import('../src/app/api/reunioes/[id]/ata/route');
  const attendance = await import('../src/app/api/reunioes/[id]/presenca/route');
  const ids: string[] = []; let meetingId: string | undefined; let otherAreaId: string | undefined; let futureId: string | undefined;
  const marker = randomUUID();
  try {
    async function account(role: 'MEMBER' | 'COORDINATOR' | 'ADMIN', teamId: number) {
      const member = await prisma.member.create({ data: { name: `${role} ${marker}`, email: `${role}-${teamId}-${marker}@example.invalid`, role, teamId, area: 'Software', status: 'APPROVED' } }); ids.push(member.id);
      return { ...member, email: member.email!, token: await createUserSession({ ...member, email: member.email! }) };
    }
    const coordinator = await account('COORDINATOR', 2), member = await account('MEMBER', 2), outsider = await account('COORDINATOR', 1), admin = await account('ADMIN', 1);
    const request = (path: string, token?: string, body?: unknown, method = 'GET') => new NextRequest(`http://localhost${path}`, { method, headers: { ...(token ? { cookie: `${SESSION_COOKIE_NAME}=${token}` } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
    const input = { title: `Reunião ${marker}`, date: '2026-11-01', area: 'Software', teamId: 2, period: 'qa' };
    assert.equal((await meetings.POST(request('/api/reunioes', member.token, input, 'POST'))).status, 403);
    const created = await meetings.POST(request('/api/reunioes', coordinator.token, input, 'POST'));
    assert.equal(created.status, 200); meetingId = (await created.json()).meeting.id;
    const params = { params: Promise.resolve({ id: meetingId! }) };
    const rows = await prisma.meetingAttendance.findMany({ where: { meetingId } });
    assert.equal(rows.length, 2); assert.ok(rows.every(row => row.status === 'NOT_A_MEMBER'));
    const defaultRow = await prisma.meetingAttendance.create({ data: { meetingId: meetingId!, memberId: admin.id } });
    assert.equal(defaultRow.status, 'NOT_A_MEMBER'); await prisma.meetingAttendance.delete({ where: { id: defaultRow.id } });
    assert.equal((await pendingMeetingMinutes(coordinator)).total, 1);
    assert.equal((await pendingMeetingMinutes(outsider)).total, 0);
    assert.equal((await pendingMeetingMinutes(admin)).total, 0, 'Admin does not receive coordinator reminders');
    assert.equal((await pendingMeetingMinutes(member)).total, 0);
    const otherArea = await prisma.meeting.create({ data: { ...input, title: 'Outra área', date: new Date(input.date), area: 'Mecânica', createdById: coordinator.id } });
    otherAreaId = otherArea.id;
    const scoped = await pendingMeetingMinutes(coordinator);
    assert.equal(scoped.total, 1, 'creating a meeting in another area does not expand reminders');
    assert.ok(scoped.meetings.every(row => row.area === coordinator.area && row.teamId === coordinator.teamId));
    assert.equal((await pendingMeetingMinutes({ ...coordinator, area: null })).total, 0, 'missing area fails closed');
    const future = await prisma.meeting.create({ data: { ...input, title: 'Reunião futura', date: new Date('2099-01-01'), createdById: coordinator.id } });
    futureId = future.id;
    assert.equal((await pendingMeetingMinutes(coordinator)).total, 2, 'a created meeting without minutes is visible even with a future date');
    const marked = await attendance.PUT(request(`/api/reunioes/${meetingId}/presenca`, coordinator.token, { memberId: member.id, status: 'PRESENT' }, 'PUT'), params);
    assert.equal(marked.status, 200);
    assert.equal((await prisma.meeting.findUniqueOrThrow({ where: { id: meetingId } })).minutes, null, 'roll call is allowed before minutes');
    assert.equal((await attendance.PUT(request(`/api/reunioes/${meetingId}/presenca`, coordinator.token, { memberId: outsider.id, status: 'PRESENT' }, 'PUT'), params)).status, 400);
    const body = { minutes: 'A equipe revisou os testes do protótipo. Ficou definido que o próximo ensaio será planejado na próxima reunião.', expectedUpdatedAt: null };
    assert.equal((await minutes.GET(request(`/api/reunioes/${meetingId}/ata`), params)).status, 401);
    assert.equal((await minutes.GET(request(`/api/reunioes/${meetingId}/ata`, outsider.token), params)).status, 403);
    assert.equal((await minutes.PUT(request(`/api/reunioes/${meetingId}/ata`, outsider.token, body, 'PUT'), params)).status, 403);
    assert.equal((await minutes.PUT(request(`/api/reunioes/${meetingId}/ata`, member.token, body, 'PUT'), params)).status, 403);
    const concurrent = await Promise.all(Array.from({ length: 3 }, () => minutes.PUT(request(`/api/reunioes/${meetingId}/ata`, coordinator.token, body, 'PUT'), params)));
    assert.equal(concurrent.filter(response => response.status === 200).length, 1); assert.equal(concurrent.filter(response => response.status === 409).length, 2);
    const saved = await minutes.GET(request(`/api/reunioes/${meetingId}/ata`, member.token), params);
    assert.equal(saved.status, 200); const data = await saved.json(); assert.equal(data.minutes, body.minutes); assert.equal(data.source, 'EXCERPT');
    const remaining = await pendingMeetingMinutes(coordinator);
    assert.equal(remaining.total, 1);
    assert.equal(remaining.meetings[0].id, futureId);
    const dashboard = await getMeetingsDashboardData(member, 'qa');
    const card = dashboard.detailedAreas.flatMap(area => area.meetings).find(meeting => meeting.id === meetingId)!;
    assert.equal(card.hasMinutes, true); assert.equal(card.minutesSummary, body.minutes); assert.ok(!('minutes' in card), 'full minutes are fetched only when opened');
    const edited = await minutes.PUT(request(`/api/reunioes/${meetingId}/ata`, admin.token, { ...body, minutes: `${body.minutes} Houve revisão do documento.`, expectedUpdatedAt: data.updatedAt }, 'PUT'), params);
    assert.equal(edited.status, 200);
    await prisma.member.update({ where: { id: coordinator.id }, data: { role: 'MEMBER' } });
    assert.equal((await minutes.PUT(request(`/api/reunioes/${meetingId}/ata`, coordinator.token, body, 'PUT'), params)).status, 403);
    console.log('Atas PostgreSQL: N por padrão, chamada sem ata, permissões, pendências, resumo, leitura por membro e edições concorrentes passaram.');
  } finally {
    if (futureId) await prisma.meeting.deleteMany({ where: { id: futureId } });
    if (otherAreaId) await prisma.meeting.deleteMany({ where: { id: otherAreaId } });
    if (meetingId) await prisma.meeting.deleteMany({ where: { id: meetingId } });
    await prisma.member.deleteMany({ where: { id: { in: ids } } });
    await prisma.$disconnect();
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
