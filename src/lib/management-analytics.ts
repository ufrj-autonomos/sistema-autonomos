import { prisma } from './prisma';
import { db } from './institutional/db';
import { nextWeek, weekKey, weekRange } from './attendance/time';
import { rosterAnalytics, presenceAnalytics } from './management-analytics-core';
import { getVacationWeekKeys } from './attendance/vacations';
export function analysisWeeks(input: unknown) { const value = Number(input); return [4, 8, 12].includes(value) ? value : 8; }
export async function getManagementAnalytics(weeks = 8, now = new Date()) {
  weeks = analysisWeeks(weeks);
  const start = weekRange(nextWeek(weekKey(now), -weeks)).start;
  const [directory, operational, settings, requests, vacations] = await Promise.allSettled([
    db.institutionalMember.findMany({ select: { id: true, name: true, area: true, active: true, course: true, team: { select: { name: true, slug: true } } } }),
    prisma.member.findMany({ select: { id: true, institutionalMemberId: true, name: true, area: true, email: true, status: true, role: true, active: true, course: true, phone: true, dre: true, emergencyContactPhone: true, profileCompletedAt: true, credential: { select: { memberId: true } }, attendancePeriods: true, attendanceJustifications: { where: { status: 'APPROVED', weekStartsOn: { gte: new Date(`${nextWeek(weekKey(now), -weeks)}T00:00:00Z`) } }, select: { weekStartsOn: true } }, attendanceVisits: { where: { checkedInAt: { lte: now }, OR: [{ checkedOutAt: { gt: start } }, { checkedOutAt: null }] } } } }),
    prisma.attendanceSettings.findUnique({ where: { id: 'lab' } }),
    prisma.memberProfileChange.count({ where: { status: 'PENDING' } }),
    getVacationWeekKeys(),
  ]);
  const people = directory.status === 'fulfilled' ? directory.value : null;
  const members = operational.status === 'fulfilled' ? operational.value : null;
  const config = settings.status === 'fulfilled' ? settings.value : null;
  const vacationWeeks = vacations.status === 'fulfilled' ? vacations.value : [];
  return {
    weeks, updatedAt: now.toISOString(),
    roster: people ? rosterAnalytics(people, members) : null,
    presence: members && config ? presenceAnalytics(members, people, weeks, now, config.maxSessionSeconds, vacationWeeks) : null,
    pendingAccounts: members ? members.filter(member => member.status === 'PENDING' && member.email).length : null,
    pendingSite: requests.status === 'fulfilled' ? requests.value : null,
    operationalUnavailable: members === null,
  };
}
