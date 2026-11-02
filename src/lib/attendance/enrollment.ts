import type { Prisma } from '@prisma/client';
import { weekDate } from './time';

export async function ensureAttendanceEnrollment(tx: Prisma.TransactionClient, user: { id: string; name: string }, now = new Date()) {
  const member = await tx.member.upsert({
    where: { userId: user.id }, update: {},
    create: { userId: user.id, name: user.name, role: 'Integrante', area: 'Não informada' },
  });
  if (!member.active) return member;
  const existing = await tx.attendancePeriod.findFirst({ where: { memberId: member.id, endsOn: null } });
  if (!existing) {
    const startsOn = weekDate(now);
    await tx.attendancePeriod.upsert({
      where: { memberId_startsOn: { memberId: member.id, startsOn } }, update: { endsOn: null },
      create: { memberId: member.id, startsOn, targetSeconds: 7200 },
    });
  }
  return member;
}

export async function closeAttendanceEnrollment(tx: Prisma.TransactionClient, userId: string, now = new Date()) {
  const periods = await tx.attendancePeriod.findMany({ where: { member: { userId }, endsOn: null } });
  for (const period of periods) {
    const endsOn = new Date(Math.max(weekDate(now).getTime(), period.startsOn.getTime()));
    await tx.attendancePeriod.update({ where: { id: period.id }, data: { endsOn } });
  }
  // An unclosed visit remains visible for management review, never earns automatic hours.
  await tx.attendanceVisit.updateMany({ where: { member: { userId }, status: 'OPEN' }, data: { status: 'REVIEW' } });
}
