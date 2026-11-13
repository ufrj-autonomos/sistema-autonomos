import { calendarDate, dateKey, nextWeek, overlapSeconds, weekKey, weekRange, monthRange, isMonthlyAttendanceArea, MAX_SESSION_SECONDS, DEFAULT_WEEKLY_SECONDS, DEFAULT_MONTHLY_SECONDS } from './time';
import type { AttendanceMemberDto, AttendanceReport, AttendanceVisitDto, MemberIdentifier, VisitStatus } from './types';

export interface PeriodRecord { startsOn: Date; endsOn: Date | null; targetSeconds: number }
export interface VisitRecord { id: string; memberId: MemberIdentifier; checkedInAt: Date; checkedOutAt: Date | null; status: VisitStatus; source: string }

/**
 * Returns the Monday `YYYY-MM-DD` keys of all weeks starting inside `[monthStart, monthEnd)`.
 */
export function monthWeekKeys(monthStart: Date, monthEnd: Date): string[] {
  const firstMonday = weekKey(monthStart);
  const keys: string[] = [];
  for (let key = firstMonday; ; key = nextWeek(key)) {
    const r = weekRange(key);
    if (r.start >= monthEnd) break;
    if (r.start >= monthStart) {
      keys.push(key);
    }
  }
  return keys;
}

/**
 * Effective monthly target in seconds accounting for vacation weeks inside `[monthStart, monthEnd)`.
 * If all weeks in the month are marked as vacation, returns 0 (month exempt).
 */
export function effectiveMonthlyTarget(monthStart: Date, monthEnd: Date, vacationSet: ReadonlySet<string>): number {
  if (vacationSet.size === 0) return DEFAULT_MONTHLY_SECONDS;
  const mondays = monthWeekKeys(monthStart, monthEnd);
  if (mondays.length === 0) return DEFAULT_MONTHLY_SECONDS;
  const nonVacation = mondays.filter((k) => !vacationSet.has(k)).length;
  if (nonVacation === 0) return 0;
  if (nonVacation === mondays.length) return DEFAULT_MONTHLY_SECONDS;
  return Math.round((DEFAULT_MONTHLY_SECONDS * nonVacation) / mondays.length);
}

export function visitDto(visit: VisitRecord, now = new Date(), maxSeconds = MAX_SESSION_SECONDS): AttendanceVisitDto {
  return {
    id: visit.id, memberId: visit.memberId, checkedInAt: visit.checkedInAt.toISOString(), checkedOutAt: visit.checkedOutAt?.toISOString() || null,
    status: visit.status, source: visit.source,
    seconds: visit.status === 'CLOSED' && visit.checkedOutAt ? Math.max(0, Math.floor((visit.checkedOutAt.getTime() - visit.checkedInAt.getTime()) / 1000)) : 0,
    needsReview: visit.status === 'REVIEW' || (visit.status === 'OPEN' && now.getTime() - visit.checkedInAt.getTime() > maxSeconds * 1000),
  };
}

export function memberSummary(
  member: { id: MemberIdentifier; name: string; area: string; email: string | null },
  periods: PeriodRecord[],
  visits: VisitRecord[],
  selected: string,
  now = new Date(),
  maxSeconds = MAX_SESSION_SECONDS,
  justifications: { weekStartsOn: Date }[] = [],
  vacationWeeks: Iterable<string> = [],
): AttendanceMemberDto {
  const vacationSet = new Set<string>(vacationWeeks);
  const range = weekRange(selected);
  const current = weekRange(weekKey(now));
  const isMonthly = isMonthlyAttendanceArea(member.area);
  const completedCutoff = range.end <= current.start ? nextWeek(selected) : current.key;
  const requiredWeeks = new Map<string, number>();
  for (const period of periods) {
    const end = period.endsOn ? dateKey(period.endsOn) : nextWeek(selected);
    for (let key = dateKey(period.startsOn); key < end && key <= selected; key = nextWeek(key)) {
      if (vacationSet.has(key)) continue;
      requiredWeeks.set(key, Math.max(requiredWeeks.get(key) || 0, period.targetSeconds));
    }
  }

  const selectedVisits = visits.filter(visit => visit.checkedInAt < range.end && (!visit.checkedOutAt || visit.checkedOutAt > range.start));
  const details = selectedVisits.map(visit => visitDto(visit, now, maxSeconds)).sort((a, b) => b.checkedInAt.localeCompare(a.checkedInAt));
  const open = range.key === current.key ? visits.find(visit => visit.status === 'OPEN') : undefined;

  if (isMonthly) {
    const mRange = monthRange(selected);
    const hasActivePeriodInMonth = periods.some((period) => {
      const pStart = period.startsOn;
      const pEnd = period.endsOn;
      return pStart < mRange.end && (!pEnd || pEnd > mRange.start);
    });
    const requiredSeconds = hasActivePeriodInMonth
      ? effectiveMonthlyTarget(mRange.start, mRange.end, vacationSet)
      : 0;

    let monthlyPhysicalSeconds = 0;
    for (const visit of visits) {
      if (visit.status !== 'CLOSED' || !visit.checkedOutAt) continue;
      monthlyPhysicalSeconds += overlapSeconds(visit.checkedInAt, visit.checkedOutAt, mRange.start, mRange.end);
    }

    let monthlyJustifiedSeconds = 0;
    for (const justification of justifications) {
      const jKey = dateKey(justification.weekStartsOn);
      const jDate = new Date(`${jKey}T00:00:00Z`);
      if (jDate >= mRange.start && jDate < mRange.end) {
        monthlyJustifiedSeconds += DEFAULT_WEEKLY_SECONDS;
      }
    }

    const completedSeconds = monthlyPhysicalSeconds + monthlyJustifiedSeconds;
    const isMonthClosed = mRange.end <= now;

    let missedMonths = 0;
    if (hasActivePeriodInMonth && periods.length > 0) {
      const currentMonthRange = monthRange(weekKey(now));
      const firstPeriodStart = new Date(Math.min(...periods.map(p => p.startsOn.getTime())));
      const startMonth = monthRange(dateKey(firstPeriodStart));
      for (
        let mCursor = `${startMonth.key}-01`;
        mCursor < `${currentMonthRange.key}-01`;
        mCursor = calendarDate(mCursor).add({ months: 1 }).toString()
      ) {
        const checkRange = monthRange(mCursor);
        const periodActiveInCheck = periods.some(
          (p) => p.startsOn < checkRange.end && (!p.endsOn || p.endsOn > checkRange.start)
        );
        const checkTarget = periodActiveInCheck
          ? effectiveMonthlyTarget(checkRange.start, checkRange.end, vacationSet)
          : 0;
        if (checkTarget > 0) {
          let checkSeconds = 0;
          for (const visit of visits) {
            if (visit.status === 'CLOSED' && visit.checkedOutAt) {
              checkSeconds += overlapSeconds(visit.checkedInAt, visit.checkedOutAt, checkRange.start, checkRange.end);
            }
          }
          for (const justification of justifications) {
            const jDate = new Date(`${dateKey(justification.weekStartsOn)}T00:00:00Z`);
            if (jDate >= checkRange.start && jDate < checkRange.end) {
              checkSeconds += DEFAULT_WEEKLY_SECONDS;
            }
          }
          if (checkSeconds < checkTarget) {
            missedMonths++;
          }
        }
      }
    }

    return {
      ...member,
      isMonthly: true,
      requiredSeconds,
      completedSeconds,
      justifiedSeconds: monthlyJustifiedSeconds,
      remainingSeconds: Math.max(0, requiredSeconds - completedSeconds),
      percentage: requiredSeconds ? Math.min(100, Math.floor(completedSeconds / requiredSeconds * 100)) : 0,
      status: !requiredSeconds ? 'NOT_REQUIRED' : completedSeconds >= requiredSeconds ? 'MET' : isMonthClosed ? 'MISSED' : 'PENDING',
      missedWeeks: missedMonths,
      openVisit: open ? visitDto(open, now, maxSeconds) : null,
      pendingReviews: details.filter(visit => visit.needsReview).length,
      visits: details,
    };
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
  const physicalSeconds = validatedWeeks.get(selected) || 0;
  for (const justification of justifications) {
    const key = dateKey(justification.weekStartsOn);
    if (key <= selected && requiredWeeks.has(key)) validatedWeeks.set(key, Math.max(validatedWeeks.get(key) || 0, DEFAULT_WEEKLY_SECONDS));
  }
  const requiredSeconds = requiredWeeks.get(selected) || 0;
  const completedSeconds = validatedWeeks.get(selected) || 0;
  return {
    ...member,
    isMonthly: false,
    requiredSeconds, completedSeconds, justifiedSeconds: Math.max(0, completedSeconds - physicalSeconds), remainingSeconds: Math.max(0, requiredSeconds - completedSeconds),
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
