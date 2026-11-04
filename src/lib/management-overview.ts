import { prisma } from './prisma';
import { attendanceReport } from './attendance/service';
import { nextWeek, weekKey } from './attendance/time';

/** Keep both reports on the same Brasília week, including across midnight. */
export async function getManagementOverview(now = new Date()) {
  const currentWeek = weekKey(now);
  const previousWeek = nextWeek(currentWeek, -1);
  const [changes, accounts, current, previous] = await Promise.allSettled([
    prisma.$transaction([
      prisma.memberProfileChange.count({ where: { status: 'PENDING' } }),
      prisma.memberProfileChange.findMany({
        where: { status: 'PENDING' }, orderBy: { createdAt: 'asc' }, take: 8,
        select: { id: true, createdAt: true, changes: true, member: { select: { name: true } } },
      }),
    ]),
    prisma.member.count({ where: { status: 'PENDING' } }),
    attendanceReport(currentWeek, undefined, now),
    attendanceReport(previousWeek, undefined, now),
  ]);
  const previousReport = previous.status === 'fulfilled' ? previous.value : null;
  return {
    currentWeek, previousWeek,
    siteRequests: changes.status === 'fulfilled' ? { total: changes.value[0], rows: changes.value[1] } : null,
    pendingAccounts: accounts.status === 'fulfilled' ? accounts.value : null,
    current: current.status === 'fulfilled' ? current.value : null,
    previous: previousReport,
    // NOT_REQUIRED includes members who joined later or whose tracking was suspended.
    belowTarget: previousReport ? previousReport.members.filter(member => member.status === 'MISSED' && member.requiredSeconds > 0) : null,
  };
}
