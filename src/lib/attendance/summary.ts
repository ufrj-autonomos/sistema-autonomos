import { dateKey, nextWeek, overlapSeconds, weekKey, weekRange, MAX_SESSION_SECONDS } from './time';
import type { AttendanceMemberDto, AttendanceReport, AttendanceVisitDto, VisitStatus } from './types';

export interface PeriodRecord { startsOn: Date; endsOn: Date | null; targetSeconds: number }
export interface VisitRecord { id: string; memberId: number; checkedInAt: Date; checkedOutAt: Date | null; status: VisitStatus; source: string }
export function visitDto(visit: VisitRecord, now = new Date(), maxSeconds = MAX_SESSION_SECONDS): AttendanceVisitDto {
  return {
    id: visit.id, memberId: visit.memberId, checkedInAt: visit.checkedInAt.toISOString(), checkedOutAt: visit.checkedOutAt?.toISOString() || null,
    status: visit.status, source: visit.source,
    seconds: visit.status === 'CLOSED' && visit.checkedOutAt ? Math.max(0, Math.floor((visit.checkedOutAt.getTime() - visit.checkedInAt.getTime()) / 1000)) : 0,
    needsReview: visit.status === 'REVIEW' || (visit.status === 'OPEN' && now.getTime() - visit.checkedInAt.getTime() > maxSeconds * 1000),
  };
}
export function memberSummary(member: { id: number; name: string; area: string; email: string | null }, periods: PeriodRecord[], visits: VisitRecord[], selected: string, now = new Date(), maxSeconds = MAX_SESSION_SECONDS): AttendanceMemberDto {
  const range = weekRange(selected);
  const current = weekRange(weekKey(now));
  const completedCutoff = range.end <= current.start ? nextWeek(selected) : current.key;
  const requiredWeeks = new Map<string, number>();
  for (const period of periods) {
    const end = period.endsOn ? dateKey(period.endsOn) : nextWeek(selected);
    for (let key = dateKey(period.startsOn); key < end && key <= selected; key = nextWeek(key)) {
      requiredWeeks.set(key, Math.max(requiredWeeks.get(key) || 0, period.targetSeconds));
    }
  }
  const validatedWeeks = new Map<string, number>();
  for (const visit of visits) {
    if (visit.status !== 'CLOSED' || !visit.checkedOutAt) continue;
    for (let key = weekKey(visit.checkedInAt); key <= selected; key = nextWeek(key)) {
      const window = weekRange(key);
      if (window.start >= visit.checkedOutAt) break;
      validatedWeeks.set(key, (validatedWeeks.get(key) || 0) + overlapSeconds(visit.checkedInAt, visit.checkedOutAt, window.start, window.end));
    }
  }
  const requiredSeconds = requiredWeeks.get(selected) || 0;
  const completedSeconds = validatedWeeks.get(selected) || 0;
  const selectedVisits = visits.filter(visit => visit.checkedInAt < range.end && (!visit.checkedOutAt || visit.checkedOutAt > range.start));
  const details = selectedVisits.map(visit => visitDto(visit, now, maxSeconds)).sort((a, b) => b.checkedInAt.localeCompare(a.checkedInAt));
  const open = range.key === current.key ? visits.find(visit => visit.status === 'OPEN') : undefined;
  return {
    ...member, requiredSeconds, completedSeconds, remainingSeconds: Math.max(0, requiredSeconds - completedSeconds),
    percentage: requiredSeconds ? Math.min(100, Math.floor(completedSeconds / requiredSeconds * 100)) : 0,
    status: !requiredSeconds ? 'NOT_REQUIRED' : completedSeconds >= requiredSeconds ? 'MET' : range.end <= now ? 'MISSED' : 'PENDING',
    missedWeeks: [...requiredWeeks].filter(([key, target]) => key < completedCutoff && (validatedWeeks.get(key) || 0) < target).length,
    openVisit: open ? visitDto(open, now, maxSeconds) : null, pendingReviews: details.filter(visit => visit.needsReview).length, visits: details,
  };
}
export function reportSummary(members: AttendanceMemberDto[]): AttendanceReport['summary'] {
  return {
    requiredMembers: members.filter(member => member.requiredSeconds > 0).length,
    met: members.filter(member => member.status === 'MET').length, pending: members.filter(member => member.status === 'PENDING').length,
    missed: members.filter(member => member.status === 'MISSED').length,
    review: members.reduce((sum, member) => sum + member.pendingReviews, 0),
    inLab: members.filter(member => member.openVisit && !member.openVisit.needsReview).length,
    completedSeconds: members.reduce((sum, member) => sum + member.completedSeconds, 0),
  };
}
