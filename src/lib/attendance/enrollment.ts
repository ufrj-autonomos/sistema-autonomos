import type { Prisma } from '@prisma/client';
import { weekDate } from './time';

export async function ensureAttendanceEnrollment(
  tx: Prisma.TransactionClient,
  memberInput: { id: string; name: string },
  now = new Date()
) {
  const member = await tx.member.findUnique({ where: { id: memberInput.id } });
  if (member && member.status !== 'APPROVED') return member;

  const existing = await tx.attendancePeriod.findFirst({ where: { memberId: memberInput.id, endsOn: null } });
  if (!existing) {
    const startsOn = weekDate(now);
    await tx.attendancePeriod.upsert({
      where: { memberId_startsOn: { memberId: memberInput.id, startsOn } },
      update: { endsOn: null },
      create: { memberId: memberInput.id, startsOn, targetSeconds: 7200 },
    });
  }
  return member ?? { id: memberInput.id, name: memberInput.name };
}

export async function closeAttendanceEnrollment(tx: Prisma.TransactionClient, memberId: string, now = new Date()) {
  const periods = await tx.attendancePeriod.findMany({ where: { memberId, endsOn: null } });
  for (const period of periods) {
    const endsOn = new Date(Math.max(weekDate(now).getTime(), period.startsOn.getTime()));
    await tx.attendancePeriod.update({ where: { id: period.id }, data: { endsOn } });
  }
  // An unclosed visit remains visible for management review, never earns automatic hours.
  await tx.attendanceVisit.updateMany({ where: { memberId, status: 'OPEN' }, data: { status: 'REVIEW' } });
}
