import { resolveMemberAreas } from './member-fields';
import { memberSummary, type PeriodRecord, type VisitRecord } from './attendance/summary';
import { dateKey, nextWeek, weekKey, weekRange, MAX_SESSION_SECONDS } from './attendance/time';
export type DirectoryIdentity = { id: number; name: string; area: string; active: boolean; course: string | null; team: { name: string; slug: string } | null };
export type AnalyticsMember = { id: string; institutionalMemberId: number | null; name: string; area: string; email: string | null; status: string; role: string; active: boolean; course: string | null; phone: string | null; dre: string | null; emergencyContactPhone: string | null; profileCompletedAt: Date | null; credential: { memberId: string } | null; attendanceJustifications?: { weekStartsOn: Date }[]; attendancePeriods: PeriodRecord[]; attendanceVisits: VisitRecord[] };
export function distribution(values: string[]) {
  const counts = new Map<string, number>();
  for (const value of values) counts.set(value, (counts.get(value) || 0) + 1);
  return [...counts].map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, 'pt-BR'));
}
export function rosterAnalytics(directory: DirectoryIdentity[], operational: AnalyticsMember[] | null) {
  const byId = new Map(operational?.filter(member => member.institutionalMemberId !== null).map(member => [member.institutionalMemberId!, member]) || []);
  const active = directory.filter(member => member.active);
  const linked = active.map(member => ({ identity: member, internal: byId.get(member.id) }));
  const missing = operational ? [
    { label: 'Perfil ainda não concluído', count: linked.filter(member => !member.internal?.profileCompletedAt).length },
    { label: 'Telefone não informado', count: linked.filter(member => !member.internal?.phone).length },
    { label: 'DRE não informado', count: linked.filter(member => !member.internal?.dre).length },
    { label: 'Curso não informado', count: linked.filter(member => !(member.internal?.course?.trim() || member.identity.course?.trim())).length },
    { label: 'Contato de emergência não informado', count: linked.filter(member => !member.internal?.emergencyContactPhone).length },
  ] : null;
  return {
    total: directory.length, active: active.length, inactive: directory.length - active.length,
    areas: distribution(linked.map(member => resolveMemberAreas(member.identity.area, member.internal?.area).internal || 'Não informada')),
    teams: distribution(active.map(member => member.team?.name || 'Autônomos')),
    courses: distribution(linked.map(member => member.internal?.course?.trim() || member.identity.course?.trim() || 'Não informado')),
    missing,
    accessReady: operational ? linked.filter(member => member.internal?.email && member.internal.credential && member.internal.status === 'APPROVED').length : null,
    complete: operational ? linked.filter(member => member.internal?.profileCompletedAt).length : null,
  };
}
export function presenceAnalytics(operational: AnalyticsMember[], directory: DirectoryIdentity[] | null, weeks: number, now = new Date(), maxSeconds = MAX_SESSION_SECONDS, vacationWeeks: string[] = []) {
  const currentKey = weekKey(now), start = nextWeek(currentKey, -weeks);
  const byId = new Map(directory?.map(member => [member.id, member]) || []);
  const keys = Array.from({ length: weeks + 1 }, (_, index) => nextWeek(start, index));
  // Clipping periods bounds work to the selected window; historical totals outside it
  // are intentionally not computed or exposed as if they were complete.
  const normalized = operational.filter(member => member.active && member.attendancePeriods.length).map(member => {
    const identity = member.institutionalMemberId ? byId.get(member.institutionalMemberId) : null;
    const periods = member.attendancePeriods.filter(period => !period.endsOn || dateKey(period.endsOn) > start).map(period => ({ ...period, startsOn: new Date(`${dateKey(period.startsOn) < start ? start : dateKey(period.startsOn)}T00:00:00Z`) }));
    const profile = { id: member.id, name: identity?.name || member.name, area: resolveMemberAreas(identity?.area, member.area).internal || 'Não informada', email: null };
    const summaries = keys.map(key => memberSummary(profile, periods, member.attendanceVisits, key, now, maxSeconds, member.attendanceJustifications || [], vacationWeeks));
    const closed = summaries.slice(0, weeks).filter(summary => summary.requiredSeconds > 0);
    return { id: member.id, name: profile.name, area: profile.area, team: identity?.team?.name || 'Autônomos', requiredWeeks: closed.length, metWeeks: closed.filter(summary => summary.status === 'MET').length, missedWeeks: closed.filter(summary => summary.status === 'MISSED').length, seconds: summaries.slice(0, weeks).reduce((sum, row) => sum + row.completedSeconds, 0), summaries };
  });
  const trend = keys.slice(0, weeks).map((key, index) => {
    const rows = normalized.map(member => member.summaries[index]);
    const required = rows.filter(row => row.requiredSeconds > 0).length;
    const met = rows.filter(row => row.status === 'MET').length;
    return { key, required, met, missed: required - met, percentage: required ? Math.round(met / required * 100) : null, seconds: rows.reduce((sum, row) => sum + row.completedSeconds, 0) };
  });
  const currentRows = normalized.map(member => member.summaries[weeks]);
  const required = currentRows.filter(row => row.requiredSeconds > 0).length;
  const met = currentRows.filter(row => row.status === 'MET').length;
  const previous = trend.at(-1)!;
  const review = new Set(operational.filter(member => member.active).flatMap(member => member.attendanceVisits.filter(visit => visit.status === 'REVIEW' || (visit.status === 'OPEN' && now.getTime() - visit.checkedInAt.getTime() > maxSeconds * 1000)).map(visit => visit.id))).size;
  const totalRequired = trend.reduce((sum, week) => sum + week.required, 0);
  const totalMet = trend.reduce((sum, week) => sum + week.met, 0);
  const attention = normalized.filter(member => member.requiredWeeks > 0).map(({ summaries, ...member }) => ({ ...member, percentage: Math.round(member.metWeeks / member.requiredWeeks * 100) })).sort((a, b) => b.missedWeeks - a.missedWeeks || a.percentage - b.percentage || a.name.localeCompare(b.name, 'pt-BR'));
  return { start, end: weekRange(nextWeek(currentKey, -1)).sunday, current: { key: currentKey, required, met, pending: required - met }, previous, trend, totalRequired, totalMet, percentage: totalRequired ? Math.round(totalMet / totalRequired * 100) : null, review, attention };
}
