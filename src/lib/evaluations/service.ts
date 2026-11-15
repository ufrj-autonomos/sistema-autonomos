import { Temporal } from '@js-temporal/polyfill';
import { prisma } from '@/lib/prisma';
import { db as institutionalDb } from '@/lib/institutional/db';
import type { SafeUser } from '@/lib/session';
import {
  isOperationalActiveMember,
  normalizeMemberArea,
  normalizeMemberRole,
  roleFromCargo,
} from '@/lib/member-fields';
import { calculateAttendanceScore } from '@/lib/meetings/service';
import { calculateDisciplinaryStatus } from '@/lib/disciplinary/service';
import { memberSummary } from '@/lib/attendance/summary';
import {
  ATTENDANCE_TIME_ZONE,
  monthRange,
  nextWeek,
  weekKey,
  weekRange,
} from '@/lib/attendance/time';
import { getVacationWeekKeys } from '@/lib/attendance/vacations';
import type {
  AdminEvaluationDashboardDTO,
  AreaEvaluationRowDTO,
  CoordinatorEvaluationRowDTO,
  EvaluatedMemberRowDTO,
  EvaluationPeriodOption,
  EvaluationScopeArea,
  EvaluationsWorkspaceDTO,
  EvaluationTeamSlug,
  HomeAreaEvaluationsDTO,
  HomeAreaScoreItemDTO,
  PendingEvaluationsSummaryDTO,
} from './types';

export class EvaluationError extends Error {
  constructor(
    message: string,
    public status = 400
  ) {
    super(message);
  }
}

export function canAccessEvaluations(role: unknown): boolean {
  return role === 'ADMIN' || role === 'COORDINATOR';
}

export function teamSlugFromId(teamId: number | null | undefined): EvaluationTeamSlug {
  if (teamId === 1) return 'nautilus';
  if (teamId === 2) return 'harpia';
  return 'autonomos';
}

export function teamNameFromSlug(slug: EvaluationTeamSlug): string {
  if (slug === 'harpia') return 'UFRJ Harpia';
  if (slug === 'nautilus') return 'UFRJ Nautilus';
  return 'Geral (Autônomos)';
}

export function buildScopeKey(teamId: number | null | undefined, area: string): string {
  const slug = teamSlugFromId(teamId);
  const cleanArea = normalizeMemberArea(area) || area.trim() || 'Não informada';
  return `${slug}:${cleanArea}`;
}

export function parseScopeKey(
  scopeKey: string
): { teamId: number | null; teamSlug: EvaluationTeamSlug; area: string } | null {
  const idx = scopeKey.indexOf(':');
  if (idx <= 0) return null;
  const slug = scopeKey.slice(0, idx) as EvaluationTeamSlug;
  const rawArea = scopeKey.slice(idx + 1).trim();
  const area = normalizeMemberArea(rawArea);
  if (!area) return null;
  if (slug === 'harpia') return { teamId: 2, teamSlug: 'harpia', area };
  if (slug === 'nautilus') return { teamId: 1, teamSlug: 'nautilus', area };
  if (slug === 'autonomos') return { teamId: null, teamSlug: 'autonomos', area };
  return null;
}

export const CANONICAL_EVALUATION_SCOPES: EvaluationScopeArea[] = [
  { scopeKey: 'harpia:Software', teamId: 2, teamSlug: 'harpia', teamName: 'UFRJ Harpia', area: 'Software', label: 'Software · Harpia' },
  { scopeKey: 'harpia:Mecânica', teamId: 2, teamSlug: 'harpia', teamName: 'UFRJ Harpia', area: 'Mecânica', label: 'Mecânica · Harpia' },
  { scopeKey: 'harpia:Eletrônica', teamId: 2, teamSlug: 'harpia', teamName: 'UFRJ Harpia', area: 'Eletrônica', label: 'Eletrônica · Harpia' },
  { scopeKey: 'nautilus:Software', teamId: 1, teamSlug: 'nautilus', teamName: 'UFRJ Nautilus', area: 'Software', label: 'Software · Nautilus' },
  { scopeKey: 'nautilus:Mecânica', teamId: 1, teamSlug: 'nautilus', teamName: 'UFRJ Nautilus', area: 'Mecânica', label: 'Mecânica · Nautilus' },
  { scopeKey: 'nautilus:Eletrônica', teamId: 1, teamSlug: 'nautilus', teamName: 'UFRJ Nautilus', area: 'Eletrônica', label: 'Eletrônica · Nautilus' },
  { scopeKey: 'autonomos:Gestão', teamId: null, teamSlug: 'autonomos', teamName: 'Geral (Autônomos)', area: 'Gestão', label: 'Gente e Gestão · Geral' },
  { scopeKey: 'autonomos:Marketing', teamId: null, teamSlug: 'autonomos', teamName: 'Geral (Autônomos)', area: 'Marketing', label: 'Marketing · Geral' },
];

export function makeScopeArea(teamId: number | null | undefined, rawArea: string): EvaluationScopeArea {
  const slug = teamSlugFromId(teamId);
  const normalizedTeamId = slug === 'harpia' ? 2 : slug === 'nautilus' ? 1 : null;
  const area = normalizeMemberArea(rawArea) || 'Não informada';
  const scopeKey = buildScopeKey(normalizedTeamId, area);
  const existing = CANONICAL_EVALUATION_SCOPES.find((s) => s.scopeKey === scopeKey);
  if (existing) return existing;
  const teamName = teamNameFromSlug(slug);
  const shortTeam = slug === 'harpia' ? 'Harpia' : slug === 'nautilus' ? 'Nautilus' : 'Geral';
  const areaLabel = area === 'Gestão' ? 'Gente e Gestão' : area;
  return {
    scopeKey,
    teamId: normalizedTeamId,
    teamSlug: slug,
    teamName,
    area,
    label: `${areaLabel} · ${shortTeam}`,
  };
}

export function validateEvaluationScore(rawScore: unknown): number {
  const num = typeof rawScore === 'string' ? Number(rawScore.replace(',', '.')) : Number(rawScore);
  if (!Number.isFinite(num) || num < 0 || num > 10) {
    throw new EvaluationError('A nota deve ser um número válido entre 0 e 10.');
  }
  return Math.round(num * 10) / 10;
}

const MONTH_CODE_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

export function currentMonthCode(now: Date = new Date()): string {
  return Temporal.Instant.from(now.toISOString())
    .toZonedDateTimeISO(ATTENDANCE_TIME_ZONE)
    .toPlainDate()
    .toString()
    .slice(0, 7);
}

export function formatMonthPeriodLabel(code: string): string {
  if (!MONTH_CODE_RE.test(code)) return `Mês ${code}`;
  const [y, m] = code.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, 15, 12, 0, 0));
  const raw = new Intl.DateTimeFormat('pt-BR', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(dt);
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

export function formatMonthShortLabel(code: string): string {
  if (!MONTH_CODE_RE.test(code)) return code;
  const [y, m] = code.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, 15, 12, 0, 0));
  const monthPart = new Intl.DateTimeFormat('pt-BR', {
    month: 'short',
    timeZone: 'UTC',
  })
    .format(dt)
    .replace('.', '');
  const cleanMonth = monthPart.charAt(0).toUpperCase() + monthPart.slice(1);
  return `${cleanMonth}/${String(y).slice(-2)}`;
}

function recentMonthCodes(baseCode: string, count = 6): string[] {
  const start = Temporal.PlainDate.from(`${baseCode}-01`);
  return Array.from({ length: count }, (_, idx) => start.subtract({ months: idx }).toString().slice(0, 7));
}

function monthWeekKeys(periodCode: string, now: Date): string[] {
  const { start, end } = monthRange(`${periodCode}-01`);
  if (start > now) return [];
  const cap = end.getTime() < now.getTime() ? end : now;
  const keys: string[] = [];
  let wk = weekKey(start);
  for (let i = 0; i < 6; i += 1) {
    const r = weekRange(wk);
    if (r.start.getTime() > cap.getTime()) break;
    keys.push(wk);
    wk = nextWeek(wk, 1);
  }
  return keys;
}

export function sanitizePeriodCode(rawPeriod: unknown): string {
  if (typeof rawPeriod !== 'string') {
    throw new EvaluationError('Informe o mês da avaliação no formato AAAA-MM (ex: 2026-11).');
  }
  const clean = rawPeriod.trim();
  if (!MONTH_CODE_RE.test(clean)) {
    throw new EvaluationError('Código do mês inválido. Use o formato AAAA-MM (ex: 2026-11).');
  }
  return clean;
}

function sanitizeNotes(rawNotes: unknown): string {
  if (rawNotes === null || rawNotes === undefined) return '';
  if (typeof rawNotes !== 'string') {
    throw new EvaluationError('Observação escrita inválida.');
  }
  return rawNotes.trim().slice(0, 4000);
}

function roundOneDecimal(value: number): number {
  return Math.round(value * 10) / 10;
}

async function loadInstitutionalSnapshot(): Promise<{
  byId: Map<number, { id: number; name: string; role: string; area: string; teamId: number | null; active: boolean; photo: string | null }>;
}> {
  if (!process.env.INSTITUTIONAL_DATABASE_URL) {
    return { byId: new Map() };
  }
  try {
    const rows = await institutionalDb.institutionalMember.findMany({
      select: { id: true, name: true, role: true, area: true, teamId: true, active: true, photo: true },
    });
    return { byId: new Map(rows.map((r) => [r.id, r])) };
  } catch (err) {
    console.warn('[evaluations] Falha ao consultar banco institucional:', err);
    return { byId: new Map() };
  }
}

async function resolveEvaluationPeriods(now: Date = new Date()): Promise<{
  periods: EvaluationPeriodOption[];
  currentCode: string;
}> {
  const [memberPeriods, areaPeriods, coordPeriods] = await Promise.all([
    prisma.memberEvaluation.findMany({ distinct: ['periodCode'], select: { periodCode: true } }),
    prisma.areaEvaluation.findMany({ distinct: ['periodCode'], select: { periodCode: true } }),
    prisma.coordinatorEvaluation.findMany({ distinct: ['periodCode'], select: { periodCode: true } }),
  ]);

  const currentCode = currentMonthCode(now);
  const map = new Map<string, EvaluationPeriodOption>();

  for (const code of recentMonthCodes(currentCode, 6)) {
    map.set(code, {
      code,
      name: formatMonthPeriodLabel(code),
      shortName: formatMonthShortLabel(code),
      isCurrent: code === currentCode,
    });
  }

  for (const row of [...memberPeriods, ...areaPeriods, ...coordPeriods]) {
    if (!MONTH_CODE_RE.test(row.periodCode)) continue;
    if (!map.has(row.periodCode)) {
      map.set(row.periodCode, {
        code: row.periodCode,
        name: formatMonthPeriodLabel(row.periodCode),
        shortName: formatMonthShortLabel(row.periodCode),
        isCurrent: row.periodCode === currentCode,
      });
    }
  }

  const periods = [...map.values()].sort((a, b) => {
    if (a.isCurrent !== b.isCurrent) return a.isCurrent ? -1 : 1;
    return b.code.localeCompare(a.code, 'pt-BR');
  });

  return { periods, currentCode };
}

export async function resolveCoordinatorScope(
  user: Pick<SafeUser, 'role' | 'area' | 'teamId' | 'institutionalMemberId'>
): Promise<EvaluationScopeArea | null> {
  if (user.role !== 'COORDINATOR') return null;
  let area = normalizeMemberArea(user.area);
  let teamId = user.teamId ?? null;

  if ((!area || teamId === null) && user.institutionalMemberId && process.env.INSTITUTIONAL_DATABASE_URL) {
    try {
      const inst = await institutionalDb.institutionalMember.findUnique({
        where: { id: user.institutionalMemberId },
        select: { area: true, teamId: true },
      });
      if (inst) {
        if (!area) area = normalizeMemberArea(inst.area);
        if (teamId === null && inst.teamId !== null) teamId = inst.teamId;
      }
    } catch {
      // Fallback para os campos locais da sessão
    }
  }

  if (!area) return null;
  return makeScopeArea(teamId, area);
}

interface ActiveMemberIdentity {
  id: string;
  name: string;
  email: string | null;
  avatar: string | null;
  systemRole: string;
  cargoLabel: string;
  effectiveRole: 'ADMIN' | 'COORDINATOR' | 'MANAGEMENT' | 'MEMBER' | 'TRAINEE';
  area: string;
  teamId: number | null;
  teamSlug: EvaluationTeamSlug;
  teamName: string;
  scopeKey: string;
}

async function loadOperationalRoster(): Promise<{
  roster: ActiveMemberIdentity[];
  byId: Map<string, ActiveMemberIdentity>;
}> {
  const [rawMembers, { byId: instById }] = await Promise.all([
    prisma.member.findMany({
      where: { active: true, status: 'APPROVED' },
      select: {
        id: true,
        name: true,
        email: true,
        avatar: true,
        role: true,
        area: true,
        teamId: true,
        active: true,
        status: true,
        institutionalMemberId: true,
      },
      orderBy: { name: 'asc' },
    }),
    loadInstitutionalSnapshot(),
  ]);

  const roster: ActiveMemberIdentity[] = [];
  for (const m of rawMembers) {
    const inst = m.institutionalMemberId ? instById.get(m.institutionalMemberId) : undefined;
    if (!isOperationalActiveMember(m, inst)) continue;

    const area = normalizeMemberArea(m.area) || normalizeMemberArea(inst?.area) || 'Não informada';
    const teamId = m.teamId ?? inst?.teamId ?? null;
    const scope = makeScopeArea(teamId, area);
    const instCargo = inst?.role ? normalizeMemberRole(inst.role) : null;
    const effectiveFromInst = instCargo ? roleFromCargo(instCargo, area) : null;

    let effectiveRole: ActiveMemberIdentity['effectiveRole'] =
      m.role === 'ADMIN' || m.role === 'COORDINATOR' || m.role === 'MANAGEMENT' || m.role === 'TRAINEE'
        ? m.role
        : 'MEMBER';
    if (effectiveFromInst === 'COORDINATOR' && effectiveRole === 'ADMIN') {
      // Preserva identificação de coordenador para a aba Nota dos Coordenadores
      effectiveRole = 'COORDINATOR';
    } else if (m.role === 'COORDINATOR') {
      effectiveRole = 'COORDINATOR';
    } else if (effectiveFromInst === 'COORDINATOR') {
      effectiveRole = 'COORDINATOR';
    }

    const cargoLabel =
      instCargo ||
      (m.role === 'ADMIN'
        ? 'Administração'
        : m.role === 'COORDINATOR'
          ? 'Coordenador'
          : m.role === 'MANAGEMENT'
            ? 'Gestão'
            : m.role === 'TRAINEE'
              ? 'Trainee'
              : 'Membro');

    roster.push({
      id: m.id,
      name: m.name,
      email: m.email || null,
      avatar: m.avatar || inst?.photo?.trim() || null,
      systemRole: m.role,
      cargoLabel,
      effectiveRole,
      area: scope.area,
      teamId: scope.teamId,
      teamSlug: scope.teamSlug,
      teamName: scope.teamName,
      scopeKey: scope.scopeKey,
    });
  }

  return { roster, byId: new Map(roster.map((r) => [r.id, r])) };
}

export async function getEvaluationsWorkspace(
  user: SafeUser,
  requestedPeriod?: string
): Promise<EvaluationsWorkspaceDTO> {
  if (!canAccessEvaluations(user.role)) {
    throw new EvaluationError('Acesso restrito a coordenadores e administradores.', 403);
  }

  const isAdmin = user.role === 'ADMIN';
  const coordinatorScope = isAdmin ? null : await resolveCoordinatorScope(user);

  const [{ periods, currentCode }, { roster }, vacationWeeks] = await Promise.all([
    resolveEvaluationPeriods(),
    loadOperationalRoster(),
    getVacationWeekKeys().catch(() => [] as string[]),
  ]);

  const selectedPeriod =
    requestedPeriod && requestedPeriod !== 'current'
      ? sanitizePeriodCode(requestedPeriod)
      : currentCode;

  // Ensure selectedPeriod shows up in options if passed directly
  const periodOptions = periods.some((p) => p.code === selectedPeriod)
    ? periods
    : [
        {
          code: selectedPeriod,
          name: formatMonthPeriodLabel(selectedPeriod),
          shortName: formatMonthShortLabel(selectedPeriod),
          isCurrent: selectedPeriod === currentCode,
        },
        ...periods,
      ];

  // Fetch attendance + meetings + disciplinary data for monthly reference metrics
  const now = new Date();
  const { start: monthStart, end: monthEnd } = monthRange(`${selectedPeriod}-01`);
  const monthWeeks = monthWeekKeys(selectedPeriod, now);

  const [
    attendanceMembers,
    attendanceSettings,
    meetings,
    warnings,
    memberEvaluations,
    areaEvaluations,
    coordinatorEvaluations,
    allPeriodsEvals,
  ] = await Promise.all([
    prisma.member.findMany({
      where: { active: true, status: 'APPROVED' },
      select: {
        id: true,
        area: true,
        attendancePeriods: { orderBy: { startsOn: 'asc' } },
        attendanceVisits: { orderBy: { checkedInAt: 'desc' } },
        attendanceJustifications: { where: { status: 'APPROVED' }, select: { weekStartsOn: true } },
      },
    }),
    prisma.attendanceSettings.findUnique({ where: { id: 'lab' }, select: { maxSessionSeconds: true } }),
    prisma.meeting.findMany({
      where: {
        date: {
          gte: monthStart,
          lt: monthEnd,
        },
      },
      include: { attendances: true },
    }),
    prisma.disciplinaryWarning.findMany({
      select: { memberId: true, type: true },
    }),
    prisma.memberEvaluation.findMany({
      where: { periodCode: selectedPeriod },
    }),
    prisma.areaEvaluation.findMany({
      where: { periodCode: selectedPeriod },
    }),
    isAdmin
      ? prisma.coordinatorEvaluation.findMany({
          where: { periodCode: selectedPeriod },
        })
      : Promise.resolve([]),
    isAdmin
      ? Promise.all([
          prisma.memberEvaluation.findMany({ select: { periodCode: true, score: true } }),
          prisma.areaEvaluation.findMany({ select: { periodCode: true, score: true } }),
          prisma.coordinatorEvaluation.findMany({ select: { periodCode: true, score: true } }),
        ])
      : Promise.resolve([[], [], []] as const),
  ]);

  const maxSessionSeconds = attendanceSettings?.maxSessionSeconds ?? 43200;
  const attByMemberId = new Map(attendanceMembers.map((a) => [a.id, a]));

  // Compute lab metrics per member across weeks in selected month
  const memberLabStats = new Map<
    string,
    { metWeeks: number; requiredWeeks: number; adherencePct: number | null; hoursMonth: number }
  >();
  for (const r of roster) {
    const att = attByMemberId.get(r.id);
    if (!att || att.attendancePeriods.length === 0) {
      memberLabStats.set(r.id, { metWeeks: 0, requiredWeeks: 0, adherencePct: null, hoursMonth: 0 });
      continue;
    }
    let metWeeks = 0;
    let requiredWeeks = 0;
    let totalSeconds = 0;
    for (const wk of monthWeeks) {
      const dto = memberSummary(
        { id: r.id, name: r.name, area: r.area, email: r.email },
        att.attendancePeriods,
        att.attendanceVisits,
        wk,
        now,
        maxSessionSeconds,
        att.attendanceJustifications,
        vacationWeeks
      );
      totalSeconds += dto.completedSeconds;
      if (dto.requiredSeconds > 0) {
        requiredWeeks += 1;
        if (dto.status === 'MET') metWeeks += 1;
      }
    }
    memberLabStats.set(r.id, {
      metWeeks,
      requiredWeeks,
      adherencePct: requiredWeeks > 0 ? Math.round((metWeeks / requiredWeeks) * 100) : null,
      hoursMonth: roundOneDecimal(totalSeconds / 3600),
    });
  }

  // Compute meeting metrics per member and per scopeKey for selectedPeriod
  const memberMeetingStats = new Map<string, { presences: number; absences: number; total: number; pct: number | null }>();
  const scopeMeetingStats = new Map<string, { presences: number; absences: number; total: number }>();

  for (const meeting of meetings) {
    const scope = makeScopeArea(meeting.teamId, meeting.area);
    let mScope = scopeMeetingStats.get(scope.scopeKey);
    if (!mScope) {
      mScope = { presences: 0, absences: 0, total: 0 };
      scopeMeetingStats.set(scope.scopeKey, mScope);
    }

    for (const att of meeting.attendances) {
      const score = calculateAttendanceScore(att.status);
      if (!score.counted) continue;

      mScope.presences += score.presence;
      mScope.absences += score.absence;
      mScope.total += 1;

      const cur = memberMeetingStats.get(att.memberId) || { presences: 0, absences: 0, total: 0, pct: null };
      cur.presences += score.presence;
      cur.absences += score.absence;
      cur.total += 1;
      memberMeetingStats.set(att.memberId, cur);
    }
  }
  for (const [id, st] of memberMeetingStats) {
    const denom = st.presences + st.absences;
    memberMeetingStats.set(id, {
      ...st,
      pct: denom > 0 ? Math.round((st.presences / denom) * 100) : null,
    });
  }

  // Compute disciplinary warnings per member
  const warningsByMember = new Map<string, { avisos: number; warnings: number }>();
  for (const w of warnings) {
    const cur = warningsByMember.get(w.memberId) || { avisos: 0, warnings: 0 };
    if (w.type === 'AVISO') cur.avisos += 1;
    else cur.warnings += 1;
    warningsByMember.set(w.memberId, cur);
  }

  const memberEvalByMemberId = new Map(memberEvaluations.map((e) => [e.memberId, e]));
  const areaEvalByScopeKey = new Map(areaEvaluations.map((e) => [e.scopeKey, e]));
  const coordEvalByCoordId = new Map(coordinatorEvaluations.map((e) => [e.coordinatorId, e]));

  // Partition roster into evaluable members vs coordinators
  const allEvaluableMembers = roster.filter(
    (m) => m.systemRole !== 'ADMIN' && m.systemRole !== 'COORDINATOR' && m.effectiveRole !== 'COORDINATOR'
  );
  const allCoordinators = roster.filter(
    (m) => m.effectiveRole === 'COORDINATOR' || m.systemRole === 'COORDINATOR'
  );

  // Scoped members list: ADMIN sees all; COORDINATOR sees ONLY their own scopeKey (excluding self)
  const visibleMembers = isAdmin
    ? allEvaluableMembers
    : coordinatorScope
      ? allEvaluableMembers.filter(
          (m) => m.scopeKey === coordinatorScope.scopeKey && m.id !== user.id
        )
      : [];

  const memberRows: EvaluatedMemberRowDTO[] = visibleMembers.map((m) => {
    const lab = memberLabStats.get(m.id);
    const meet = memberMeetingStats.get(m.id);
    const disc = warningsByMember.get(m.id) || { avisos: 0, warnings: 0 };
    const discStatus = calculateDisciplinaryStatus(disc.avisos, disc.warnings);
    const rawEval = memberEvalByMemberId.get(m.id);
    const isSelfMasked = m.id === user.id;

    return {
      memberId: m.id,
      name: m.name,
      email: m.email,
      avatar: m.avatar,
      area: m.area,
      teamId: m.teamId,
      teamSlug: m.teamSlug,
      teamName: m.teamName,
      scopeKey: m.scopeKey,
      cargoLabel: m.cargoLabel,
      systemRole: m.systemRole,
      metrics: {
        labAdherencePct: lab?.adherencePct ?? null,
        labHoursMonth: lab?.hoursMonth ?? 0,
        meetingsPct: meet?.pct ?? null,
        meetingsCount: meet?.total ?? 0,
        warningsCount: discStatus.totalWarnings,
        avisosCount: disc.avisos,
        disciplinaryLabel: discStatus.statusLabel,
      },
      evaluation:
        rawEval && !isSelfMasked
          ? {
              id: rawEval.id,
              score: rawEval.score,
              notes: rawEval.notes,
              evaluatorId: rawEval.evaluatorId,
              evaluatorName: rawEval.evaluatorName,
              updatedAt: rawEval.updatedAt.toISOString(),
            }
          : null,
      isSelfMasked,
    };
  });

  // Determine viewer's own scopeKey (works for both ADMIN and COORDINATOR)
  const viewerRoster = roster.find((r) => r.id === user.id);
  const viewerScopeKey = coordinatorScope?.scopeKey || viewerRoster?.scopeKey || null;

  // Build Area rows for all canonical scopes (+ any evaluated custom scopeKey)
  const scopeMap = new Map<string, EvaluationScopeArea>(
    CANONICAL_EVALUATION_SCOPES.map((s) => [s.scopeKey, s])
  );
  for (const ae of areaEvaluations) {
    if (!scopeMap.has(ae.scopeKey)) {
      scopeMap.set(ae.scopeKey, makeScopeArea(ae.teamId, ae.area));
    }
  }

  const allScopes = [...scopeMap.values()];

  const areaRows: AreaEvaluationRowDTO[] = allScopes.map((scope) => {
    const activeInArea = roster.filter((r) => r.scopeKey === scope.scopeKey);
    const evaluableInArea = allEvaluableMembers.filter((r) => r.scopeKey === scope.scopeKey);

    // Aggregate lab adherence across active members in this area
    let labMetSum = 0;
    let labReqSum = 0;
    let warnSum = 0;
    for (const m of activeInArea) {
      const lab = memberLabStats.get(m.id);
      if (lab) {
        labMetSum += lab.metWeeks;
        labReqSum += lab.requiredWeeks;
      }
      const disc = warningsByMember.get(m.id);
      if (disc) {
        warnSum += calculateDisciplinaryStatus(disc.avisos, disc.warnings).totalWarnings;
      }
    }

    const scopeMeet = scopeMeetingStats.get(scope.scopeKey);
    const meetDenom = scopeMeet ? scopeMeet.presences + scopeMeet.absences : 0;

    // Member evaluations in this area (only include avg/counts for ADMIN or own coordinator scope)
    const canSeeAreaEvalStats = isAdmin || scope.scopeKey === coordinatorScope?.scopeKey;
    const areaMemberScores = evaluableInArea
      .map((m) => memberEvalByMemberId.get(m.id)?.score)
      .filter((s): s is number => typeof s === 'number');

    const rawAreaEval = areaEvalByScopeKey.get(scope.scopeKey);

    return {
      scopeKey: scope.scopeKey,
      teamId: scope.teamId,
      teamSlug: scope.teamSlug,
      teamName: scope.teamName,
      area: scope.area,
      label: scope.label,
      isUserArea: viewerScopeKey === scope.scopeKey,
      metrics: {
        activeMembersCount: activeInArea.length,
        labAdherencePct: labReqSum > 0 ? Math.round((labMetSum / labReqSum) * 100) : null,
        meetingsPct: meetDenom > 0 && scopeMeet ? Math.round((scopeMeet.presences / meetDenom) * 100) : null,
        warningsCount: warnSum,
        ...(canSeeAreaEvalStats
          ? {
              evaluatedMembersCount: areaMemberScores.length,
              totalEvaluableMembersCount: evaluableInArea.length,
              memberAvgScore:
                areaMemberScores.length > 0
                  ? roundOneDecimal(areaMemberScores.reduce((a, b) => a + b, 0) / areaMemberScores.length)
                  : null,
            }
          : {}),
      },
      evaluation: rawAreaEval
        ? {
            id: rawAreaEval.id,
            score: rawAreaEval.score,
            notes: rawAreaEval.notes,
            evaluatorId: rawAreaEval.evaluatorId,
            evaluatorName: rawAreaEval.evaluatorName,
            updatedAt: rawAreaEval.updatedAt.toISOString(),
          }
        : null,
    };
  });

  // Coordinator rows (STRICTLY ADMIN ONLY)
  const coordinatorRows: CoordinatorEvaluationRowDTO[] = isAdmin
    ? allCoordinators.map((coord) => {
        const evaluableInArea = allEvaluableMembers.filter((m) => m.scopeKey === coord.scopeKey);
        const evaluatedInArea = evaluableInArea.filter((m) => memberEvalByMemberId.has(m.id)).length;
        const areaMetric = areaRows.find((a) => a.scopeKey === coord.scopeKey);
        const isSelf = coord.id === user.id;
        const rawEval = coordEvalByCoordId.get(coord.id);

        return {
          coordinatorId: coord.id,
          name: coord.name,
          email: coord.email,
          avatar: coord.avatar,
          area: coord.area,
          teamId: coord.teamId,
          teamSlug: coord.teamSlug,
          teamName: coord.teamName,
          scopeKey: coord.scopeKey,
          cargoLabel: coord.cargoLabel,
          isSelf,
          metrics: {
            areaMembersTotal: evaluableInArea.length,
            areaMembersEvaluated: evaluatedInArea,
            areaCoveragePct:
              evaluableInArea.length > 0
                ? Math.round((evaluatedInArea / evaluableInArea.length) * 100)
                : null,
            labAdherencePct: areaMetric?.metrics.labAdherencePct ?? null,
            meetingsPct: areaMetric?.metrics.meetingsPct ?? null,
            warningsCount: areaMetric?.metrics.warningsCount ?? 0,
          },
          // Ninguém vê a própria nota individual
          evaluation:
            rawEval && !isSelf
              ? {
                  id: rawEval.id,
                  score: rawEval.score,
                  notes: rawEval.notes,
                  evaluatorId: rawEval.evaluatorId,
                  evaluatorName: rawEval.evaluatorName,
                  updatedAt: rawEval.updatedAt.toISOString(),
                }
              : null,
        };
      })
    : [];

  // Dashboard (STRICTLY ADMIN ONLY)
  let dashboard: AdminEvaluationDashboardDTO | null = null;
  if (isAdmin) {
    const memberScores = memberRows
      .map((m) => m.evaluation?.score)
      .filter((s): s is number => typeof s === 'number');
    const areaScores = areaRows
      .map((a) => a.evaluation?.score)
      .filter((s): s is number => typeof s === 'number');
    const coordScores = coordinatorEvaluations.map((c) => c.score);

    const topAreaRow = [...areaRows]
      .filter((a) => a.evaluation !== null)
      .sort((a, b) => (b.evaluation?.score ?? -1) - (a.evaluation?.score ?? -1))[0];

    const buckets = [
      { label: '0,0 – 4,9', min: 0, max: 4.999 },
      { label: '5,0 – 6,9', min: 5, max: 6.999 },
      { label: '7,0 – 8,4', min: 7, max: 8.499 },
      { label: '8,5 – 10,0', min: 8.5, max: 10.01 },
    ];
    const scoreDistribution = buckets.map((b) => ({
      bucket: b.label,
      members: memberScores.filter((s) => s >= b.min && s <= b.max).length,
      coordinators: coordScores.filter((s) => s >= b.min && s <= b.max).length,
    }));

    const cargoGroups = new Map<string, { sum: number; count: number }>();
    for (const m of memberRows) {
      if (!m.evaluation) continue;
      const group = cargoGroups.get(m.cargoLabel) || { sum: 0, count: 0 };
      group.sum += m.evaluation.score;
      group.count += 1;
      cargoGroups.set(m.cargoLabel, group);
    }
    for (const c of coordinatorEvaluations) {
      const group = cargoGroups.get('Coordenador') || { sum: 0, count: 0 };
      group.sum += c.score;
      group.count += 1;
      cargoGroups.set('Coordenador', group);
    }

    const [allMemberPeriods, allAreaPeriods, allCoordPeriods] = allPeriodsEvals;
    const trendPeriodCodes = Array.from(
      new Set([
        ...recentMonthCodes(currentCode, 6),
        selectedPeriod,
        ...allMemberPeriods.map((x) => x.periodCode).filter((c) => MONTH_CODE_RE.test(c)),
        ...allAreaPeriods.map((x) => x.periodCode).filter((c) => MONTH_CODE_RE.test(c)),
        ...allCoordPeriods.map((x) => x.periodCode).filter((c) => MONTH_CODE_RE.test(c)),
      ])
    ).sort((a, b) => a.localeCompare(b, 'pt-BR'));

    const monthlyTrend = trendPeriodCodes.map((code) => {
      const ms = allMemberPeriods.filter((x) => x.periodCode === code).map((x) => x.score);
      const as = allAreaPeriods.filter((x) => x.periodCode === code).map((x) => x.score);
      const cs = allCoordPeriods.filter((x) => x.periodCode === code).map((x) => x.score);
      return {
        periodCode: code,
        periodLabel: formatMonthShortLabel(code),
        memberAvg: ms.length ? roundOneDecimal(ms.reduce((a, b) => a + b, 0) / ms.length) : null,
        areaAvg: as.length ? roundOneDecimal(as.reduce((a, b) => a + b, 0) / as.length) : null,
        coordinatorAvg: cs.length ? roundOneDecimal(cs.reduce((a, b) => a + b, 0) / cs.length) : null,
        totalEvaluations: ms.length + as.length + cs.length,
      };
    });

    dashboard = {
      kpis: {
        memberAverage: memberScores.length
          ? roundOneDecimal(memberScores.reduce((a, b) => a + b, 0) / memberScores.length)
          : null,
        memberEvaluatedCount: memberScores.length,
        memberTotalCount: memberRows.length,
        areaAverage: areaScores.length
          ? roundOneDecimal(areaScores.reduce((a, b) => a + b, 0) / areaScores.length)
          : null,
        areaEvaluatedCount: areaScores.length,
        areaTotalCount: areaRows.length,
        coordinatorAverage: coordScores.length
          ? roundOneDecimal(coordScores.reduce((a, b) => a + b, 0) / coordScores.length)
          : null,
        coordinatorEvaluatedCount: coordScores.length,
        coordinatorTotalCount: allCoordinators.length,
        topArea: topAreaRow?.evaluation
          ? { label: topAreaRow.label, score: topAreaRow.evaluation.score }
          : null,
      },
      areaComparison: areaRows.map((a) => ({
        scopeKey: a.scopeKey,
        label: a.label,
        shortLabel: `${a.area === 'Gestão' ? 'Gestão' : a.area.slice(0, 5)} (${a.teamSlug === 'harpia' ? 'H' : a.teamSlug === 'nautilus' ? 'N' : 'G'})`,
        teamSlug: a.teamSlug,
        areaScore: a.evaluation?.score ?? null,
        memberAvgScore: a.metrics.memberAvgScore ?? null,
        labAdherencePct: a.metrics.labAdherencePct,
        meetingsPct: a.metrics.meetingsPct,
      })),
      scoreDistribution,
      coverageByArea: areaRows.map((a) => {
        const total = a.metrics.totalEvaluableMembersCount ?? 0;
        const evaluated = a.metrics.evaluatedMembersCount ?? 0;
        return {
          scopeKey: a.scopeKey,
          label: a.label,
          teamName: a.teamName,
          evaluated,
          total,
          pct: total > 0 ? Math.round((evaluated / total) * 100) : 0,
          memberAvg: a.metrics.memberAvgScore ?? null,
          areaScore: a.evaluation?.score ?? null,
        };
      }),
      byCargoAverage: [...cargoGroups.entries()].map(([cargo, g]) => ({
        cargo,
        avgScore: roundOneDecimal(g.sum / g.count),
        count: g.count,
      })),
      monthlyTrend,
    };
  }

  return {
    viewerRole: isAdmin ? 'ADMIN' : 'COORDINATOR',
    isAdmin,
    coordinatorScope,
    periods: periodOptions,
    selectedPeriod,
    scopes: isAdmin ? allScopes : coordinatorScope ? [coordinatorScope] : [],
    members: memberRows,
    areas: areaRows,
    coordinators: coordinatorRows,
    dashboard,
  };
}

export async function upsertMemberEvaluation(
  user: SafeUser,
  input: { periodCode: unknown; memberId: unknown; score: unknown; notes: unknown }
) {
  if (!canAccessEvaluations(user.role)) {
    throw new EvaluationError('Acesso restrito a coordenadores e administradores.', 403);
  }

  const periodCode = sanitizePeriodCode(input.periodCode);
  const memberId = typeof input.memberId === 'string' ? input.memberId.trim() : '';
  if (!memberId) throw new EvaluationError('Selecione um integrante para avaliar.');
  if (memberId === user.id) {
    throw new EvaluationError('Você não pode avaliar a si mesmo.');
  }

  const score = validateEvaluationScore(input.score);
  const notes = sanitizeNotes(input.notes);

  const [{ byId }, coordinatorScope] = await Promise.all([
    loadOperationalRoster(),
    user.role === 'COORDINATOR' ? resolveCoordinatorScope(user) : Promise.resolve(null),
  ]);

  const target = byId.get(memberId);
  if (!target) {
    throw new EvaluationError('Integrante ativo não encontrado.', 404);
  }
  if (target.systemRole === 'ADMIN' || target.systemRole === 'COORDINATOR' || target.effectiveRole === 'COORDINATOR') {
    throw new EvaluationError('Coordenadores devem ser avaliados na aba de Coordenação por um Administrador.', 403);
  }

  if (user.role === 'COORDINATOR') {
    if (!coordinatorScope) {
      throw new EvaluationError('Sua conta de coordenador não possui área definida.', 403);
    }
    if (target.scopeKey !== coordinatorScope.scopeKey) {
      throw new EvaluationError(
        `Você só pode avaliar integrantes da sua área (${coordinatorScope.label}).`,
        403
      );
    }
  }

  const saved = await prisma.memberEvaluation.upsert({
    where: {
      periodCode_memberId: {
        periodCode,
        memberId: target.id,
      },
    },
    create: {
      periodCode,
      memberId: target.id,
      evaluatorId: user.id,
      evaluatorName: user.name,
      teamId: target.teamId,
      area: target.area,
      score,
      notes,
    },
    update: {
      evaluatorId: user.id,
      evaluatorName: user.name,
      teamId: target.teamId,
      area: target.area,
      score,
      notes,
    },
  });

  return {
    id: saved.id,
    periodCode: saved.periodCode,
    memberId: saved.memberId,
    score: saved.score,
    notes: saved.notes,
    evaluatorId: saved.evaluatorId,
    evaluatorName: saved.evaluatorName,
    updatedAt: saved.updatedAt.toISOString(),
  };
}

export async function deleteMemberEvaluation(user: SafeUser, evaluationId: string) {
  if (!canAccessEvaluations(user.role)) {
    throw new EvaluationError('Acesso restrito a coordenadores e administradores.', 403);
  }
  const existing = await prisma.memberEvaluation.findUnique({ where: { id: evaluationId } });
  if (!existing) throw new EvaluationError('Avaliação não encontrada.', 404);

  if (user.role === 'COORDINATOR') {
    const scope = await resolveCoordinatorScope(user);
    const evalScopeKey = buildScopeKey(existing.teamId, existing.area);
    if (!scope || evalScopeKey !== scope.scopeKey) {
      throw new EvaluationError('Você só pode gerenciar avaliações da sua própria área.', 403);
    }
  }

  await prisma.memberEvaluation.delete({ where: { id: evaluationId } });
}

export async function upsertAreaEvaluation(
  user: SafeUser,
  input: { periodCode: unknown; scopeKey: unknown; score: unknown; notes: unknown }
) {
  if (user.role !== 'ADMIN') {
    throw new EvaluationError('Apenas administradores podem lançar ou editar a nota das áreas.', 403);
  }

  const periodCode = sanitizePeriodCode(input.periodCode);
  const rawScopeKey = typeof input.scopeKey === 'string' ? input.scopeKey.trim() : '';
  const parsed = parseScopeKey(rawScopeKey);
  if (!parsed) {
    throw new EvaluationError('Área/equipe inválida para avaliação.');
  }

  const score = validateEvaluationScore(input.score);
  const notes = sanitizeNotes(input.notes);
  const canonicalScope = makeScopeArea(parsed.teamId, parsed.area);

  const saved = await prisma.areaEvaluation.upsert({
    where: {
      periodCode_scopeKey: {
        periodCode,
        scopeKey: canonicalScope.scopeKey,
      },
    },
    create: {
      periodCode,
      scopeKey: canonicalScope.scopeKey,
      teamId: canonicalScope.teamId,
      area: canonicalScope.area,
      score,
      notes,
      evaluatorId: user.id,
      evaluatorName: user.name,
    },
    update: {
      teamId: canonicalScope.teamId,
      area: canonicalScope.area,
      score,
      notes,
      evaluatorId: user.id,
      evaluatorName: user.name,
    },
  });

  return {
    id: saved.id,
    periodCode: saved.periodCode,
    scopeKey: saved.scopeKey,
    score: saved.score,
    notes: saved.notes,
    evaluatorId: saved.evaluatorId,
    evaluatorName: saved.evaluatorName,
    updatedAt: saved.updatedAt.toISOString(),
  };
}

export async function upsertCoordinatorEvaluation(
  user: SafeUser,
  input: { periodCode: unknown; coordinatorId: unknown; score: unknown; notes: unknown }
) {
  if (user.role !== 'ADMIN') {
    throw new EvaluationError('Apenas administradores podem avaliar coordenadores.', 403);
  }

  const periodCode = sanitizePeriodCode(input.periodCode);
  const coordinatorId = typeof input.coordinatorId === 'string' ? input.coordinatorId.trim() : '';
  if (!coordinatorId) throw new EvaluationError('Selecione um coordenador para avaliar.');
  if (coordinatorId === user.id) {
    throw new EvaluationError('Você não pode avaliar sua própria coordenação.');
  }

  const score = validateEvaluationScore(input.score);
  const notes = sanitizeNotes(input.notes);

  const { byId } = await loadOperationalRoster();
  const target = byId.get(coordinatorId);
  if (!target || (target.effectiveRole !== 'COORDINATOR' && target.systemRole !== 'COORDINATOR')) {
    throw new EvaluationError('Coordenador ativo não encontrado.', 404);
  }

  const saved = await prisma.coordinatorEvaluation.upsert({
    where: {
      periodCode_coordinatorId: {
        periodCode,
        coordinatorId: target.id,
      },
    },
    create: {
      periodCode,
      coordinatorId: target.id,
      evaluatorId: user.id,
      evaluatorName: user.name,
      teamId: target.teamId,
      area: target.area,
      score,
      notes,
    },
    update: {
      evaluatorId: user.id,
      evaluatorName: user.name,
      teamId: target.teamId,
      area: target.area,
      score,
      notes,
    },
  });

  return {
    id: saved.id,
    periodCode: saved.periodCode,
    coordinatorId: saved.coordinatorId,
    score: saved.score,
    notes: saved.notes,
    evaluatorId: saved.evaluatorId,
    evaluatorName: saved.evaluatorName,
    updatedAt: saved.updatedAt.toISOString(),
  };
}

/**
 * Leitura pública interna (todos os usuários aprovados) para a Home (/):
 * Retorna EXCLUSIVAMENTE as notas das áreas (nunca consulta ou expõe notas individuais).
 */
export async function getHomeAreaEvaluations(
  user: Pick<SafeUser, 'area' | 'teamId'>,
  now: Date = new Date()
): Promise<HomeAreaEvaluationsDTO> {
  const allAreaEvals = await prisma.areaEvaluation.findMany({
    orderBy: [{ periodCode: 'desc' }, { score: 'desc' }],
  });

  const currentPeriodCode = currentMonthCode(now);
  const periodMap = new Map<string, EvaluationPeriodOption>();
  for (const code of recentMonthCodes(currentPeriodCode, 6)) {
    periodMap.set(code, {
      code,
      name: formatMonthPeriodLabel(code),
      shortName: formatMonthShortLabel(code),
      isCurrent: code === currentPeriodCode,
    });
  }
  for (const row of allAreaEvals) {
    if (!MONTH_CODE_RE.test(row.periodCode)) continue;
    if (!periodMap.has(row.periodCode)) {
      periodMap.set(row.periodCode, {
        code: row.periodCode,
        name: formatMonthPeriodLabel(row.periodCode),
        shortName: formatMonthShortLabel(row.periodCode),
        isCurrent: row.periodCode === currentPeriodCode,
      });
    }
  }

  const periods = [...periodMap.values()].sort((a, b) => {
    if (a.isCurrent !== b.isCurrent) return a.isCurrent ? -1 : 1;
    return b.code.localeCompare(a.code, 'pt-BR');
  });

  const normalizedUserArea = normalizeMemberArea(user.area);
  const userScopeKey = normalizedUserArea
    ? buildScopeKey(user.teamId ?? null, normalizedUserArea)
    : null;

  const evaluationsByPeriod: Record<string, HomeAreaScoreItemDTO[]> = {};

  for (const p of periods) {
    const evalsForPeriod = allAreaEvals.filter((e) => e.periodCode === p.code);
    const byScope = new Map(evalsForPeriod.map((e) => [e.scopeKey, e]));

    const scopes = new Map<string, EvaluationScopeArea>(
      CANONICAL_EVALUATION_SCOPES.map((s) => [s.scopeKey, s])
    );
    for (const e of evalsForPeriod) {
      if (!scopes.has(e.scopeKey)) {
        scopes.set(e.scopeKey, makeScopeArea(e.teamId, e.area));
      }
    }

    evaluationsByPeriod[p.code] = [...scopes.values()].map((scope) => {
      const found = byScope.get(scope.scopeKey);
      return {
        scopeKey: scope.scopeKey,
        teamId: scope.teamId,
        teamSlug: scope.teamSlug,
        teamName: scope.teamName,
        area: scope.area,
        label: scope.label,
        score: found ? found.score : null,
        notes: found ? found.notes : null,
        updatedAt: found ? found.updatedAt.toISOString() : null,
        isUserArea: userScopeKey === scope.scopeKey,
      };
    });
  }

  return {
    currentPeriodCode,
    periods,
    userScopeKey,
    evaluationsByPeriod,
  };
}

/**
 * Resume quantos membros elegíveis (e para ADMIN também áreas/coordenadores)
 * ainda não foram avaliados no mês corrente. Respeita o escopo de COORDINATOR vs ADMIN.
 */
export async function getPendingEvaluationsSummary(
  user: SafeUser,
  now: Date = new Date()
): Promise<PendingEvaluationsSummaryDTO> {
  const periodCode = currentMonthCode(now);
  const periodLabel = formatMonthPeriodLabel(periodCode);

  if (!canAccessEvaluations(user.role)) {
    return {
      periodCode,
      periodLabel,
      pendingMembersCount: 0,
      totalMembersCount: 0,
      evaluatedMembersCount: 0,
      pendingMembers: [],
      pendingAreasCount: 0,
      pendingCoordinatorsCount: 0,
      scopeLabel: null,
    };
  }

  const isAdmin = user.role === 'ADMIN';
  const coordinatorScope = isAdmin ? null : await resolveCoordinatorScope(user);

  const [{ roster }, memberEvals, areaEvals, coordEvals] = await Promise.all([
    loadOperationalRoster(),
    prisma.memberEvaluation.findMany({
      where: { periodCode },
      select: { memberId: true },
    }),
    isAdmin
      ? prisma.areaEvaluation.findMany({ where: { periodCode }, select: { scopeKey: true } })
      : Promise.resolve([]),
    isAdmin
      ? prisma.coordinatorEvaluation.findMany({ where: { periodCode }, select: { coordinatorId: true } })
      : Promise.resolve([]),
  ]);

  const allEvaluableMembers = roster.filter(
    (m) => m.systemRole !== 'ADMIN' && m.systemRole !== 'COORDINATOR' && m.effectiveRole !== 'COORDINATOR'
  );
  const visibleMembers = isAdmin
    ? allEvaluableMembers
    : coordinatorScope
      ? allEvaluableMembers.filter(
          (m) => m.scopeKey === coordinatorScope.scopeKey && m.id !== user.id
        )
      : [];

  const evaluatedMemberIds = new Set(memberEvals.map((e) => e.memberId));
  const pending = visibleMembers.filter((m) => !evaluatedMemberIds.has(m.id));

  let pendingAreasCount = 0;
  let pendingCoordinatorsCount = 0;

  if (isAdmin) {
    const scopeMap = new Map<string, EvaluationScopeArea>(
      CANONICAL_EVALUATION_SCOPES.map((s) => [s.scopeKey, s])
    );
    for (const m of roster) {
      if (m.area && m.area !== 'Não informada' && !scopeMap.has(m.scopeKey)) {
        scopeMap.set(m.scopeKey, makeScopeArea(m.teamId, m.area));
      }
    }
    const evaluatedScopeKeys = new Set(areaEvals.map((a) => a.scopeKey));
    pendingAreasCount = [...scopeMap.keys()].filter((k) => !evaluatedScopeKeys.has(k)).length;

    const evaluatedCoordIds = new Set(coordEvals.map((c) => c.coordinatorId));
    const coords = roster.filter(
      (m) => (m.effectiveRole === 'COORDINATOR' || m.systemRole === 'COORDINATOR') && m.id !== user.id
    );
    pendingCoordinatorsCount = coords.filter((c) => !evaluatedCoordIds.has(c.id)).length;
  }

  return {
    periodCode,
    periodLabel,
    pendingMembersCount: pending.length,
    totalMembersCount: visibleMembers.length,
    evaluatedMembersCount: visibleMembers.length - pending.length,
    pendingMembers: pending.map((m) => ({
      id: m.id,
      name: m.name,
      areaLabel: makeScopeArea(m.teamId, m.area).label,
    })),
    pendingAreasCount,
    pendingCoordinatorsCount,
    scopeLabel: coordinatorScope?.label ?? null,
  };
}
