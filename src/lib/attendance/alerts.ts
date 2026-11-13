import { Temporal } from '@js-temporal/polyfill';
import { prisma } from '@/lib/prisma';
import { resolveMemberAreas } from '@/lib/member-fields';
import { db as institutionalDb } from '@/lib/institutional/db';
import { sendLabHoursAlertEmail } from '@/lib/email';
import { issueDisciplinaryOccurrence } from '@/lib/disciplinary/issue';
import {
  ATTENDANCE_TIME_ZONE,
  DEFAULT_WEEKLY_SECONDS,
  calendarDate,
  dateKey,
  isMonthlyAttendanceArea,
  monthRange,
  nextWeek,
  overlapSeconds,
  weekKey,
  weekRange,
} from './time';
import { effectiveMonthlyTarget, memberSummary, type PeriodRecord, type VisitRecord } from './summary';
import { formatDuration } from './format';
import { getVacationWeekKeys } from './vacations';

const DEFAULT_AUTO_WARNING_START = '2026-11-16';

export interface BrasiliaClockInfo {
  year: number;
  month: number;
  day: number;
  dayOfWeek: number; // 1 = Mon .. 5 = Fri .. 7 = Sun
  hour: number;
  dateIso: string;
  monthKey: string;
  weekMondayKey: string;
  lastBusinessDayOfMonth: number;
  isFriday: boolean;
  isLastBusinessDayOfMonth: boolean;
  isFridayAtOrAfter19: boolean;
  isLastBusinessDayAtOrAfter19: boolean;
}

export function lastBusinessDayOfMonth(year: number, month: number): number {
  const probe = Temporal.PlainDate.from({ year, month, day: 1 });
  let last = Temporal.PlainDate.from({ year, month, day: probe.daysInMonth });
  while (last.dayOfWeek === 6 || last.dayOfWeek === 7) {
    last = last.subtract({ days: 1 });
  }
  return last.day;
}

export function getBrasiliaClockInfo(now = new Date()): BrasiliaClockInfo {
  const zdt = Temporal.Instant.fromEpochMilliseconds(now.getTime()).toZonedDateTimeISO(
    ATTENDANCE_TIME_ZONE
  );
  const lastBiz = lastBusinessDayOfMonth(zdt.year, zdt.month);
  const dateIso = zdt.toPlainDate().toString();
  const monthKey = `${zdt.year}-${String(zdt.month).padStart(2, '0')}`;
  const isFriday = zdt.dayOfWeek === 5;
  const isLastBusinessDayOfMonth = zdt.day === lastBiz;

  return {
    year: zdt.year,
    month: zdt.month,
    day: zdt.day,
    dayOfWeek: zdt.dayOfWeek,
    hour: zdt.hour,
    dateIso,
    monthKey,
    weekMondayKey: weekKey(now),
    lastBusinessDayOfMonth: lastBiz,
    isFriday,
    isLastBusinessDayOfMonth,
    isFridayAtOrAfter19: isFriday && zdt.hour >= 19,
    isLastBusinessDayAtOrAfter19: isLastBusinessDayOfMonth && zdt.hour >= 19,
  };
}

export interface ConsecutiveMissWarningCandidate {
  kind: 'AUTO_WARNING_WEEKLY' | 'AUTO_WARNING_MONTHLY';
  periodKey: string;
  missedPeriods: [string, string];
}

export function findConsecutiveMissPairsToWarn(params: {
  area: string;
  periods: PeriodRecord[];
  visits: VisitRecord[];
  justifications: { weekStartsOn: Date }[];
  vacationWeeks: Iterable<string>;
  now: Date;
  autoWarningStartsOn?: string;
  alreadyWarnedPeriodKeys?: Iterable<string>;
}): ConsecutiveMissWarningCandidate[] {
  const vacationSet = new Set(params.vacationWeeks);
  const warnedSet = new Set(params.alreadyWarnedPeriodKeys || []);
  const cutoffStart = params.autoWarningStartsOn || DEFAULT_AUTO_WARNING_START;
  const isMonthly = isMonthlyAttendanceArea(params.area);

  if (params.periods.length === 0) return [];

  if (!isMonthly) {
    const currentWk = weekKey(params.now);
    const closedRequired = new Map<string, number>();

    for (const period of params.periods) {
      const start = dateKey(period.startsOn);
      const effectiveStart = start > cutoffStart ? start : cutoffStart;
      const periodEnd = period.endsOn ? dateKey(period.endsOn) : currentWk;
      const upper = periodEnd < currentWk ? periodEnd : currentWk;

      for (let key = effectiveStart; key < upper; key = nextWeek(key)) {
        if (vacationSet.has(key)) continue;
        const wr = weekRange(key);
        if (wr.end > params.now) break;
        closedRequired.set(key, Math.max(closedRequired.get(key) || 0, period.targetSeconds));
      }
    }

    const sortedKeys = [...closedRequired.keys()].sort();
    if (sortedKeys.length < 2) return [];

    const firstKey = sortedKeys[0];
    const lastKey = sortedKeys[sortedKeys.length - 1];

    const validated = new Map<string, number>();
    for (const visit of params.visits) {
      if (visit.status !== 'CLOSED' || !visit.checkedOutAt) continue;
      const startVk = weekKey(visit.checkedInAt);
      const iterStart = startVk > firstKey ? startVk : firstKey;
      for (let key = iterStart; key <= lastKey; key = nextWeek(key)) {
        const window = weekRange(key);
        if (window.start >= visit.checkedOutAt) break;
        validated.set(
          key,
          (validated.get(key) || 0) +
            overlapSeconds(visit.checkedInAt, visit.checkedOutAt, window.start, window.end)
        );
      }
    }

    for (const j of params.justifications) {
      const k = dateKey(j.weekStartsOn);
      if (closedRequired.has(k)) {
        validated.set(k, Math.max(validated.get(k) || 0, DEFAULT_WEEKLY_SECONDS));
      }
    }

    const candidates: ConsecutiveMissWarningCandidate[] = [];
    let consecutiveMissed: string[] = [];

    for (const key of sortedKeys) {
      const target = closedRequired.get(key) || 0;
      const done = validated.get(key) || 0;
      if (done >= target) {
        consecutiveMissed = [];
        continue;
      }

      if (warnedSet.has(key)) {
        consecutiveMissed = [];
        continue;
      }

      consecutiveMissed.push(key);
      if (consecutiveMissed.length >= 2) {
        candidates.push({
          kind: 'AUTO_WARNING_WEEKLY',
          periodKey: key,
          missedPeriods: [consecutiveMissed[0], consecutiveMissed[1]],
        });
        consecutiveMissed = [];
      }
    }

    return candidates;
  }

  // Monthly (Gestão & Marketing)
  const earliestPeriod = new Date(Math.min(...params.periods.map((p) => p.startsOn.getTime())));
  const cutoffDate = new Date(`${cutoffStart}T00:00:00Z`);
  const effectiveEarliest = earliestPeriod > cutoffDate ? earliestPeriod : cutoffDate;

  const startMonth = monthRange(dateKey(effectiveEarliest));
  const currentMonth = monthRange(weekKey(params.now));
  const candidates: ConsecutiveMissWarningCandidate[] = [];
  let consecutiveMissed: string[] = [];

  for (
    let mCursor = `${startMonth.key}-01`;
    mCursor < `${currentMonth.key}-01`;
    mCursor = calendarDate(mCursor).add({ months: 1 }).toString()
  ) {
    const checkRange = monthRange(mCursor);
    const mKey = checkRange.key;
    const hasActive = params.periods.some(
      (p) => p.startsOn < checkRange.end && (!p.endsOn || p.endsOn > checkRange.start)
    );
    const target = hasActive ? effectiveMonthlyTarget(checkRange.start, checkRange.end, vacationSet) : 0;

    if (target > 0) {
      let done = 0;
      for (const visit of params.visits) {
        if (visit.status === 'CLOSED' && visit.checkedOutAt) {
          done += overlapSeconds(visit.checkedInAt, visit.checkedOutAt, checkRange.start, checkRange.end);
        }
      }
      for (const j of params.justifications) {
        const jDate = new Date(`${dateKey(j.weekStartsOn)}T00:00:00Z`);
        if (jDate >= checkRange.start && jDate < checkRange.end) {
          done += DEFAULT_WEEKLY_SECONDS;
        }
      }

      if (done >= target || warnedSet.has(mKey)) {
        consecutiveMissed = [];
      } else {
        consecutiveMissed.push(mKey);
        if (consecutiveMissed.length >= 2) {
          candidates.push({
            kind: 'AUTO_WARNING_MONTHLY',
            periodKey: mKey,
            missedPeriods: [consecutiveMissed[0], consecutiveMissed[1]],
          });
          consecutiveMissed = [];
        }
      }
    }
  }

  return candidates;
}

function formatWeekPeriodLabel(mondayKey: string): string {
  const wr = weekRange(mondayKey);
  const startBr = mondayKey.split('-').reverse().join('/');
  const sundayBr = wr.sunday.split('-').reverse().join('/');
  return `Semana ${startBr} a ${sundayBr}`;
}

function formatMonthPeriodLabel(monthKey: string): string {
  const [y, m] = monthKey.split('-').map(Number);
  const months = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
  ];
  return `${months[(m || 1) - 1] || monthKey} de ${y}`;
}

export interface RunAttendanceAlertsOptions {
  now?: Date;
  forceWeeklyAlerts?: boolean;
  forceMonthlyAlerts?: boolean;
  evaluateAutoWarnings?: boolean;
}

export interface RunAttendanceAlertsResult {
  clock: BrasiliaClockInfo;
  weeklyAlertsSent: number;
  monthlyAlertsSent: number;
  autoWarningsIssued: number;
  autoExpulsionsTriggered: number;
  skippedReason?: string;
}

export async function runAttendanceAlertsAndAutoPunishments(
  options: RunAttendanceAlertsOptions = {}
): Promise<RunAttendanceAlertsResult> {
  const now = options.now ?? new Date();
  const clock = getBrasiliaClockInfo(now);

  const runWeekly = Boolean(options.forceWeeklyAlerts) || clock.isFridayAtOrAfter19;
  const runMonthly = Boolean(options.forceMonthlyAlerts) || clock.isLastBusinessDayAtOrAfter19;
  const runAutoWarnings = options.evaluateAutoWarnings ?? true;

  const settings = await prisma.attendanceSettings.findUnique({ where: { id: 'lab' } });
  if (!settings) {
    return {
      clock,
      weeklyAlertsSent: 0,
      monthlyAlertsSent: 0,
      autoWarningsIssued: 0,
      autoExpulsionsTriggered: 0,
      skippedReason: 'AttendanceSettings not initialized.',
    };
  }

  const vacationKeys = await getVacationWeekKeys();
  const vacationSet = new Set(vacationKeys);
  const autoWarningStartsOn = settings.autoWarningStartsOn
    ? dateKey(settings.autoWarningStartsOn)
    : DEFAULT_AUTO_WARNING_START;

  const members = await prisma.member.findMany({
    where: {
      active: true,
      status: 'APPROVED',
      attendancePeriods: { some: {} },
    },
    include: {
      attendancePeriods: { orderBy: { startsOn: 'asc' } },
      attendanceVisits: true,
      attendanceJustifications: {
        where: { status: 'APPROVED' },
        select: { weekStartsOn: true },
      },
      attendanceAlertLogs: {
        select: { kind: true, periodKey: true },
      },
    },
    orderBy: { name: 'asc' },
  });

  const ids = members.flatMap((m) =>
    typeof m.institutionalMemberId === 'number' ? [m.institutionalMemberId] : []
  );
  const identities =
    ids.length && process.env.INSTITUTIONAL_DATABASE_URL
      ? await institutionalDb.institutionalMember.findMany({
          where: { id: { in: ids } },
          select: { id: true, name: true, area: true },
        })
      : [];
  const byId = new Map(identities.map((i) => [i.id, i]));

  let weeklyAlertsSent = 0;
  let monthlyAlertsSent = 0;
  let autoWarningsIssued = 0;
  let autoExpulsionsTriggered = 0;

  for (const member of members) {
    const identity = member.institutionalMemberId ? byId.get(member.institutionalMemberId) : undefined;
    const displayName = identity?.name || member.name;
    const area = resolveMemberAreas(identity?.area, member.area).internal || 'Não informada';
    const isMonthly = isMonthlyAttendanceArea(area);

    const existingLogs = new Set(
      member.attendanceAlertLogs.map((log) => `${log.kind}:${log.periodKey}`)
    );

    const summary = memberSummary(
      { id: member.id, name: displayName, area, email: member.email || null },
      member.attendancePeriods,
      member.attendanceVisits,
      clock.weekMondayKey,
      now,
      settings.maxSessionSeconds,
      member.attendanceJustifications,
      vacationKeys
    );

    // 1) Friday 19:00 alert for Technical areas
    if (runWeekly && !isMonthly && !vacationSet.has(clock.weekMondayKey)) {
      const logKey = `ALERT_WEEKLY:${clock.weekMondayKey}`;
      if (
        !existingLogs.has(logKey) &&
        summary.requiredSeconds > 0 &&
        summary.completedSeconds < summary.requiredSeconds &&
        member.email
      ) {
        const res = await sendLabHoursAlertEmail(member.email, {
          recipientName: displayName,
          area,
          mode: 'WEEKLY',
          periodLabel: formatWeekPeriodLabel(clock.weekMondayKey),
          completedFormatted: formatDuration(summary.completedSeconds),
          requiredFormatted: formatDuration(summary.requiredSeconds),
          remainingFormatted: formatDuration(summary.remainingSeconds),
          deadlineText: 'até domingo às 23h59 (horário de Brasília)',
        });
        if (res.sent) {
          await prisma.attendanceAlertLog.create({
            data: {
              kind: 'ALERT_WEEKLY',
              periodKey: clock.weekMondayKey,
              memberId: member.id,
            },
          }).catch(() => {});
          weeklyAlertsSent++;
        }
      }
    }

    // 2) Last business day of month alert for Gestão & Marketing
    if (runMonthly && isMonthly) {
      const logKey = `ALERT_MONTHLY:${clock.monthKey}`;
      if (
        !existingLogs.has(logKey) &&
        summary.requiredSeconds > 0 &&
        summary.completedSeconds < summary.requiredSeconds &&
        member.email
      ) {
        const res = await sendLabHoursAlertEmail(member.email, {
          recipientName: displayName,
          area,
          mode: 'MONTHLY',
          periodLabel: formatMonthPeriodLabel(clock.monthKey),
          completedFormatted: formatDuration(summary.completedSeconds),
          requiredFormatted: formatDuration(summary.requiredSeconds),
          remainingFormatted: formatDuration(summary.remainingSeconds),
          deadlineText: 'até o último dia do mês às 23h59 (horário de Brasília)',
        });
        if (res.sent) {
          await prisma.attendanceAlertLog.create({
            data: {
              kind: 'ALERT_MONTHLY',
              periodKey: clock.monthKey,
              memberId: member.id,
            },
          }).catch(() => {});
          monthlyAlertsSent++;
        }
      }
    }

    // 3) Auto-AVISO punishment for 2 consecutive missed non-vacation periods
    if (runAutoWarnings) {
      const warnKind = isMonthly ? 'AUTO_WARNING_MONTHLY' : 'AUTO_WARNING_WEEKLY';
      const warnedPeriodKeys = member.attendanceAlertLogs
        .filter((l) => l.kind === warnKind)
        .map((l) => l.periodKey);

      const candidates = findConsecutiveMissPairsToWarn({
        area,
        periods: member.attendancePeriods,
        visits: member.attendanceVisits,
        justifications: member.attendanceJustifications,
        vacationWeeks: vacationKeys,
        now,
        autoWarningStartsOn,
        alreadyWarnedPeriodKeys: warnedPeriodKeys,
      });

      for (const candidate of candidates) {
        const [p1, p2] = candidate.missedPeriods;
        const p1Label = isMonthly ? formatMonthPeriodLabel(p1) : formatWeekPeriodLabel(p1);
        const p2Label = isMonthly ? formatMonthPeriodLabel(p2) : formatWeekPeriodLabel(p2);

        // Claim idempotency slot before issuing punishment
        try {
          await prisma.attendanceAlertLog.create({
            data: {
              kind: candidate.kind,
              periodKey: candidate.periodKey,
              memberId: member.id,
            },
          });
        } catch {
          continue; // Already processed in concurrent invocation
        }

        const issued = await issueDisciplinaryOccurrence({
          memberId: member.id,
          type: 'AVISO',
          reason: `Descumprimento automático de horas no laboratório em dois ciclos consecutivos (${p1Label} e ${p2Label}).`,
          notes: 'Punição automática gerada pelo controle de presença após 2 períodos seguidos sem atingir a carga horária mínima.',
          issuedById: null,
        });

        await prisma.attendanceAlertLog.update({
          where: {
            kind_periodKey_memberId: {
              kind: candidate.kind,
              periodKey: candidate.periodKey,
              memberId: member.id,
            },
          },
          data: { warningId: issued.warning.id },
        }).catch(() => {});

        autoWarningsIssued++;
        if (issued.expelled) {
          autoExpulsionsTriggered++;
        }
      }
    }
  }

  return {
    clock,
    weeklyAlertsSent,
    monthlyAlertsSent,
    autoWarningsIssued,
    autoExpulsionsTriggered,
  };
}
