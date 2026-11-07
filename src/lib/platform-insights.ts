import { prisma } from '@/lib/prisma';
import { db } from '@/lib/institutional/db';
import type { SafeUser } from '@/lib/session';
import { getMeetingsDashboardData, calculateAttendanceScore, getFrequencyStatus } from '@/lib/meetings/service';
import { getDisciplinaryDashboardData } from '@/lib/disciplinary/service';
import { attendanceReport } from '@/lib/attendance/service';
import { nextWeek, weekKey } from '@/lib/attendance/time';
import { normalizeMemberArea, normalizeMemberRole } from '@/lib/member-fields';

export interface MemberPersonalMeetingRecord {
  id: string;
  title: string;
  date: string;
  area: string;
  status: string;
}

export interface MemberWeeklyLabTrendItem {
  week: string;
  hours: number;
  targetHours: number;
  met: boolean;
}

export interface MemberHomeInsights {
  meetings: {
    totalMeetings: number;
    presences: number;
    absences: number;
    lateCount: number;
    justifiedCount: number;
    ratePct: number;
    status: { label: string; tone: 'green' | 'yellow' | 'red' | 'gray' };
    recentMeetings: MemberPersonalMeetingRecord[];
    teamAreaComparison: {
      label: string;
      pct: number;
      meetingsCount: number;
      presences: number;
      absences: number;
    }[];
  };
  weeklyLabHistory: MemberWeeklyLabTrendItem[];
  teamPulse: {
    teamName: string;
    teamSlug: 'harpia' | 'nautilus' | 'autonomos';
    activeMembersCount: number;
    areaMembersCount: number;
    projects: {
      id: number;
      name: string;
      status: string;
      year: string;
      tagline: string;
    }[];
  };
}

export async function getMemberHomeInsights(
  user: SafeUser,
  now = new Date()
): Promise<MemberHomeInsights | null> {
  try {
    const currentW = weekKey(now);
    const weeks = Array.from({ length: 6 }, (_, idx) => nextWeek(currentW, -(5 - idx)));

    const [meetingsDataRes, memberAttendancesRes, instMembersRes, projectsRes, labReportsRes] =
      await Promise.allSettled([
        getMeetingsDashboardData(user, '26.2'),
        prisma.meetingAttendance.findMany({
          where: { memberId: user.id },
          include: {
            meeting: {
              select: { id: true, title: true, date: true, area: true, teamId: true, period: true },
            },
          },
          orderBy: { meeting: { date: 'desc' } },
        }),
        db.institutionalMember.findMany({
          where: { active: true },
          include: { team: true },
        }),
        db.project.findMany({
          include: { team: true },
          orderBy: { year: 'desc' },
        }),
        Promise.all(weeks.map((wk) => attendanceReport(wk, user.id, now).catch(() => null))),
      ]);

    const meetingsData = meetingsDataRes.status === 'fulfilled' ? meetingsDataRes.value : null;
    const myAttendances =
      memberAttendancesRes.status === 'fulfilled' ? memberAttendancesRes.value : [];
    const instMembers = instMembersRes.status === 'fulfilled' ? instMembersRes.value : [];
    const allProjects = projectsRes.status === 'fulfilled' ? projectsRes.value : [];
    const labReports = labReportsRes.status === 'fulfilled' ? labReportsRes.value : [];

    // 1. Calcular frequência pessoal do integrante nas reuniões
    let presences = 0;
    let absences = 0;
    let counted = 0;
    let lateCount = 0;
    let justifiedCount = 0;

    for (const att of myAttendances) {
      const score = calculateAttendanceScore(att.status);
      if (score.counted) {
        presences += score.presence;
        absences += score.absence;
        counted++;
      }
      if (att.status === 'LATE') lateCount++;
      if (att.status === 'JUSTIFIED') justifiedCount++;
    }

    const ratePct = counted > 0 ? Number(((presences / counted) * 100).toFixed(1)) : 100;
    const status = getFrequencyStatus(ratePct, counted);

    const recentMeetings: MemberPersonalMeetingRecord[] = myAttendances.slice(0, 6).map((att) => ({
      id: att.meeting.id,
      title: att.meeting.title,
      date: att.meeting.date.toISOString().slice(0, 10),
      area: att.meeting.area,
      status: att.status,
    }));

    const teamAreaComparison = (meetingsData?.overview.areaSummaries || []).map((a) => ({
      label: a.label,
      pct: a.pct,
      meetingsCount: a.meetingsCount,
      presences: a.presences,
      absences: a.absences,
    }));

    // 2. Histórico de horas semanais no laboratório (últimas 6 semanas)
    const weeklyLabHistory: MemberWeeklyLabTrendItem[] = weeks.map((wk, idx) => {
      const rep = labReports[idx];
      const memberRow = rep?.members?.[0];
      const completedHours = memberRow
        ? Number((memberRow.completedSeconds / 3600).toFixed(1))
        : 0;
      const targetHours = memberRow && memberRow.requiredSeconds > 0
        ? Number((memberRow.requiredSeconds / 3600).toFixed(1))
        : 2;
      return {
        week: wk,
        hours: completedHours,
        targetHours,
        met: memberRow ? memberRow.status === 'MET' : completedHours >= targetHours,
      };
    });

    // 3. Pulso da Equipe / Divisão
    const teamSlug: 'harpia' | 'nautilus' | 'autonomos' =
      user.teamSlug === 'harpia'
        ? 'harpia'
        : user.teamSlug === 'nautilus'
        ? 'nautilus'
        : 'autonomos';

    const teamName =
      teamSlug === 'harpia'
        ? 'Divisão Harpia'
        : teamSlug === 'nautilus'
        ? 'Divisão Nautilus'
        : 'UFRJ Autônomos';

    const divisionMembers = instMembers.filter((m) => {
      if (teamSlug === 'autonomos') return true;
      return m.team?.slug === teamSlug;
    });

    const userNormArea = normalizeMemberArea(user.area);
    const areaMembersCount = divisionMembers.filter(
      (m) => normalizeMemberArea(m.area) === userNormArea
    ).length;

    const divisionProjects = allProjects
      .filter((p) => (teamSlug === 'autonomos' ? true : p.team.slug === teamSlug))
      .slice(0, 4)
      .map((p) => ({
        id: p.id,
        name: p.name,
        status: p.status,
        year: String(p.year),
        tagline: p.tagline,
      }));

    return {
      meetings: {
        totalMeetings: counted,
        presences,
        absences,
        lateCount,
        justifiedCount,
        ratePct,
        status,
        recentMeetings,
        teamAreaComparison,
      },
      weeklyLabHistory,
      teamPulse: {
        teamName,
        teamSlug,
        activeMembersCount: divisionMembers.length,
        areaMembersCount,
        projects: divisionProjects,
      },
    };
  } catch (err) {
    console.error('[insights] Falha em getMemberHomeInsights:', err);
    return null;
  }
}

export interface ExecutiveOverviewInsights {
  rosterSummary: {
    totalActive: number;
    harpiaCount: number;
    nautilusCount: number;
    autonomosCount: number;
    leadershipCount: number;
    membersCount: number;
    traineesCount: number;
  };
  meetingsOverview: {
    totalMeetings: number;
    overallRate: number;
    totalPresences: number;
    totalAbsences: number;
    perfectCount: number;
    lowFrequencyCount: number;
    areaPerformance: {
      label: string;
      teamSlug: string;
      pct: number;
      meetingsCount: number;
      presences: number;
      absences: number;
    }[];
    lowFrequencyMembers: {
      id: string;
      name: string;
      area: string;
      pct: number;
      absences: number;
      meetings: number;
    }[];
  };
  disciplinaryOverview: {
    totalMembers: number;
    regularesCount: number;
    atencaoCount: number;
    alertaCount: number;
    expulsosCount: number;
    totalOccurrences: number;
    recentOccurrences: {
      id: string;
      memberName: string;
      memberArea: string;
      type: string;
      reason: string;
      createdAt: string;
    }[];
  };
  pendingJustificationsCount: number;
}

export async function getExecutiveOverviewInsights(
  user?: SafeUser
): Promise<ExecutiveOverviewInsights | null> {
  try {
    const effectiveUser: SafeUser = user || {
      id: 'system-admin',
      name: 'Admin',
      email: 'admin@autonomos',
      role: 'ADMIN',
      status: 'APPROVED',
      area: 'Gestão',
      avatar: null,
      profileCompletedAt: null,
      institutionalMemberId: null,
      teamId: null,
      teamSlug: 'autonomos',
    };

    const [instMembersRes, meetingsRes, disciplinaryRes, justCountRes] = await Promise.allSettled([
      db.institutionalMember.findMany({
        where: { active: true },
        include: { team: true },
      }),
      getMeetingsDashboardData(effectiveUser, '26.2'),
      getDisciplinaryDashboardData(effectiveUser),
      prisma.attendanceJustification.count({ where: { status: 'PENDING' } }),
    ]);

    const instMembers = instMembersRes.status === 'fulfilled' ? instMembersRes.value : [];
    const meetings = meetingsRes.status === 'fulfilled' ? meetingsRes.value : null;
    const disciplinary = disciplinaryRes.status === 'fulfilled' ? disciplinaryRes.value : null;
    const pendingJustificationsCount =
      justCountRes.status === 'fulfilled' ? justCountRes.value : 0;

    let harpiaCount = 0;
    let nautilusCount = 0;
    let autonomosCount = 0;
    let leadershipCount = 0;
    let membersCount = 0;
    let traineesCount = 0;

    for (const m of instMembers) {
      if (m.team?.slug === 'harpia') harpiaCount++;
      else if (m.team?.slug === 'nautilus') nautilusCount++;
      else autonomosCount++;

      const normRole = normalizeMemberRole(m.role).toLowerCase();
      if (
        normRole.includes('capit') ||
        normRole.includes('diret') ||
        normRole.includes('coordenador')
      ) {
        leadershipCount++;
      } else if (normRole.includes('trainee')) {
        traineesCount++;
      } else {
        membersCount++;
      }
    }

    const discMembers = disciplinary?.members || [];
    const atencaoCount = discMembers.filter((m) => m.status === 'ATENCAO').length;
    const alertaCount = discMembers.filter((m) => m.status === 'ALERTA').length;

    return {
      rosterSummary: {
        totalActive: instMembers.length,
        harpiaCount,
        nautilusCount,
        autonomosCount,
        leadershipCount,
        membersCount,
        traineesCount,
      },
      meetingsOverview: {
        totalMeetings: meetings?.overview.totalMeetings || 0,
        overallRate: meetings?.overview.overallRate || 0,
        totalPresences: meetings?.overview.totalPresences || 0,
        totalAbsences: meetings?.overview.totalAbsences || 0,
        perfectCount: meetings?.overview.perfectCount || 0,
        lowFrequencyCount: meetings?.overview.lowFrequencyMembers.length || 0,
        areaPerformance: (meetings?.overview.areaSummaries || []).map((a) => ({
          label: a.label,
          teamSlug: a.teamSlug,
          pct: a.pct,
          meetingsCount: a.meetingsCount,
          presences: a.presences,
          absences: a.absences,
        })),
        lowFrequencyMembers: (meetings?.overview.lowFrequencyMembers || []).slice(0, 6).map((m) => ({
          id: m.id,
          name: m.name,
          area: m.area,
          pct: m.pct,
          absences: m.absences,
          meetings: m.meetings,
        })),
      },
      disciplinaryOverview: {
        totalMembers: disciplinary?.overview.totalMembers || 0,
        regularesCount: disciplinary?.overview.regularesCount || 0,
        atencaoCount,
        alertaCount,
        expulsosCount: disciplinary?.overview.expulsosCount || 0,
        totalOccurrences: disciplinary?.recentOccurrences.length || 0,
        recentOccurrences: (disciplinary?.recentOccurrences || []).slice(0, 5).map((occ) => ({
          id: occ.id,
          memberName: occ.memberName,
          memberArea: occ.memberArea,
          type: occ.type,
          reason: occ.reason,
          createdAt: occ.createdAt,
        })),
      },
      pendingJustificationsCount,
    };
  } catch (err) {
    console.error('[insights] Falha em getExecutiveOverviewInsights:', err);
    return null;
  }
}

export interface ExtendedDashboardInsights {
  areaByTeamMatrix: {
    area: string;
    Harpia: number;
    Nautilus: number;
    Autonomos: number;
    total: number;
  }[];
  rolesDistribution: {
    label: string;
    count: number;
    category: 'Liderança' | 'Membros' | 'Trainees';
  }[];
  rolesByTeam: {
    team: string;
    Lideranca: number;
    Membros: number;
    Trainees: number;
  }[];
  meetingsByArea: {
    label: string;
    teamSlug: string;
    pct: number;
    presences: number;
    absences: number;
    meetingsCount: number;
  }[];
  disciplinaryStats: {
    regulares: number;
    atencao: number;
    alerta: number;
    expulsao: number;
    byArea: {
      area: string;
      avisos: number;
      advertencias: number;
      total: number;
    }[];
  };
  summaryMetrics: {
    meetingsOverallRate: number;
    totalMeetingsHeld: number;
    regularMembersPct: number;
    traineeRatioPct: number;
  };
}

export async function getExtendedDashboardInsights(
  user?: SafeUser
): Promise<ExtendedDashboardInsights | null> {
  try {
    const adminContext: SafeUser = user || {
      id: 'system-admin',
      name: 'Admin',
      email: 'admin@autonomos',
      role: 'ADMIN',
      status: 'APPROVED',
      area: 'Gestão',
      avatar: null,
      profileCompletedAt: null,
      institutionalMemberId: null,
      teamId: null,
      teamSlug: 'autonomos',
    };

    const [instMembersRes, meetingsRes, disciplinaryRes] = await Promise.allSettled([
      db.institutionalMember.findMany({
        where: { active: true },
        include: { team: true },
      }),
      getMeetingsDashboardData(adminContext, '26.2'),
      getDisciplinaryDashboardData(adminContext),
    ]);

    const instMembers = instMembersRes.status === 'fulfilled' ? instMembersRes.value : [];
    const meetings = meetingsRes.status === 'fulfilled' ? meetingsRes.value : null;
    const disciplinary = disciplinaryRes.status === 'fulfilled' ? disciplinaryRes.value : null;

    // 1. Matriz Área x Divisão
    const areaMap = new Map<string, { Harpia: number; Nautilus: number; Autonomos: number }>();
    const roleCounts = new Map<string, number>();
    const teamRolesMap = new Map<string, { Lideranca: number; Membros: number; Trainees: number }>([
      ['Harpia', { Lideranca: 0, Membros: 0, Trainees: 0 }],
      ['Nautilus', { Lideranca: 0, Membros: 0, Trainees: 0 }],
      ['Autônomos', { Lideranca: 0, Membros: 0, Trainees: 0 }],
    ]);

    let traineesTotal = 0;

    for (const m of instMembers) {
      const areaName = normalizeMemberArea(m.area) || 'Não informada';
      if (!areaMap.has(areaName)) {
        areaMap.set(areaName, { Harpia: 0, Nautilus: 0, Autonomos: 0 });
      }
      const entry = areaMap.get(areaName)!;
      const slug = m.team?.slug;
      const teamKey = slug === 'harpia' ? 'Harpia' : slug === 'nautilus' ? 'Nautilus' : 'Autônomos';

      if (slug === 'harpia') entry.Harpia++;
      else if (slug === 'nautilus') entry.Nautilus++;
      else entry.Autonomos++;

      const normRole = normalizeMemberRole(m.role) || 'Membro';
      roleCounts.set(normRole, (roleCounts.get(normRole) || 0) + 1);

      const lower = normRole.toLowerCase();
      const tRole = teamRolesMap.get(teamKey)!;
      if (lower.includes('capit') || lower.includes('diret') || lower.includes('coordenador')) {
        tRole.Lideranca++;
      } else if (lower.includes('trainee')) {
        tRole.Trainees++;
        traineesTotal++;
      } else {
        tRole.Membros++;
      }
    }

    const areaByTeamMatrix = [...areaMap.entries()]
      .map(([area, counts]) => ({
        area,
        ...counts,
        total: counts.Harpia + counts.Nautilus + counts.Autonomos,
      }))
      .sort((a, b) => b.total - a.total);

    const rolesDistribution = [...roleCounts.entries()]
      .map(([label, count]) => {
        const lower = label.toLowerCase();
        const category: 'Liderança' | 'Membros' | 'Trainees' =
          lower.includes('capit') || lower.includes('diret') || lower.includes('coordenador')
            ? 'Liderança'
            : lower.includes('trainee')
            ? 'Trainees'
            : 'Membros';
        return { label, count, category };
      })
      .sort((a, b) => b.count - a.count);

    const rolesByTeam = [...teamRolesMap.entries()].map(([team, counts]) => ({
      team,
      ...counts,
    }));

    // 2. Reuniões por Área
    const meetingsByArea = (meetings?.overview.areaSummaries || []).map((a) => ({
      label: a.label,
      teamSlug: a.teamSlug,
      pct: a.pct,
      presences: a.presences,
      absences: a.absences,
      meetingsCount: a.meetingsCount,
    }));

    // 3. Estatísticas Disciplinares por Área
    const discMembers = disciplinary?.members || [];
    const regulares = discMembers.filter((m) => m.status === 'REGULAR').length;
    const atencao = discMembers.filter((m) => m.status === 'ATENCAO').length;
    const alerta = discMembers.filter((m) => m.status === 'ALERTA').length;
    const expulsao = discMembers.filter((m) => m.status === 'EXPULSAO').length;

    const discAreaMap = new Map<string, { avisos: number; advertencias: number }>();
    for (const m of discMembers) {
      if (m.avisosCount === 0 && m.directWarningsCount === 0) continue;
      const a = m.area || 'Geral';
      if (!discAreaMap.has(a)) discAreaMap.set(a, { avisos: 0, advertencias: 0 });
      const row = discAreaMap.get(a)!;
      row.avisos += m.avisosCount;
      row.advertencias += m.directWarningsCount;
    }

    const byArea = [...discAreaMap.entries()]
      .map(([area, c]) => ({
        area,
        avisos: c.avisos,
        advertencias: c.advertencias,
        total: c.avisos + c.advertencias,
      }))
      .sort((a, b) => b.total - a.total);

    const regularMembersPct =
      discMembers.length > 0 ? Math.round((regulares / discMembers.length) * 100) : 100;
    const traineeRatioPct =
      instMembers.length > 0 ? Math.round((traineesTotal / instMembers.length) * 100) : 0;

    return {
      areaByTeamMatrix,
      rolesDistribution,
      rolesByTeam,
      meetingsByArea,
      disciplinaryStats: {
        regulares,
        atencao,
        alerta,
        expulsao,
        byArea,
      },
      summaryMetrics: {
        meetingsOverallRate: meetings?.overview.overallRate || 0,
        totalMeetingsHeld: meetings?.overview.totalMeetings || 0,
        regularMembersPct,
        traineeRatioPct,
      },
    };
  } catch (err) {
    console.error('[insights] Falha em getExtendedDashboardInsights:', err);
    return null;
  }
}

export interface DivisionDeepMetric {
  slug: 'harpia' | 'nautilus';
  name: string;
  activeMembers: number;
  inactiveMembers: number;
  leadership: {
    id: number;
    name: string;
    role: string;
    area: string;
    photo: string | null;
  }[];
  areasBreakdown: {
    area: string;
    count: number;
    pct: number;
    meetingRatePct: number | null;
    meetingsHeld: number;
  }[];
  rolesBreakdown: {
    leadership: number;
    members: number;
    trainees: number;
  };
  meetingsStats: {
    meetingsHeld: number;
    attendanceRatePct: number;
    presences: number;
    absences: number;
  };
  coursesTop: {
    course: string;
    count: number;
  }[];
  activeRoster: {
    id: number;
    name: string;
    role: string;
    area: string;
    course: string | null;
  }[];
}

export interface DivisionsDeepAnalytics {
  harpia: DivisionDeepMetric;
  nautilus: DivisionDeepMetric;
  headToHeadAreas: {
    area: string;
    Harpia: number;
    Nautilus: number;
    harpiaRate: number;
    nautilusRate: number;
  }[];
}

export async function getDivisionsDeepAnalytics(): Promise<DivisionsDeepAnalytics | null> {
  try {
    const adminContext: SafeUser = {
      id: 'system-admin',
      name: 'Admin',
      email: 'admin@autonomos',
      role: 'ADMIN',
      status: 'APPROVED',
      area: 'Gestão',
      avatar: null,
      profileCompletedAt: null,
      institutionalMemberId: null,
      teamId: null,
      teamSlug: 'autonomos',
    };

    const [instMembersRes, meetingsRes] = await Promise.allSettled([
      db.institutionalMember.findMany({
        include: { team: true },
        orderBy: [{ active: 'desc' }, { name: 'asc' }],
      }),
      getMeetingsDashboardData(adminContext, '26.2'),
    ]);

    const instMembers = instMembersRes.status === 'fulfilled' ? instMembersRes.value : [];
    const meetings = meetingsRes.status === 'fulfilled' ? meetingsRes.value : null;

    const buildDivision = (slug: 'harpia' | 'nautilus', name: string): DivisionDeepMetric => {
      const allDiv = instMembers.filter((m) => m.team?.slug === slug);
      const active = allDiv.filter((m) => m.active);
      const inactive = allDiv.length - active.length;

      const leadership: DivisionDeepMetric['leadership'] = [];
      let leadershipCount = 0;
      let membersCount = 0;
      let traineesCount = 0;

      const areaCounts = new Map<string, number>();
      const courseCounts = new Map<string, number>();

      for (const m of active) {
        const normArea = normalizeMemberArea(m.area) || 'Não informada';
        areaCounts.set(normArea, (areaCounts.get(normArea) || 0) + 1);

        if (m.course?.trim()) {
          courseCounts.set(m.course.trim(), (courseCounts.get(m.course.trim()) || 0) + 1);
        }

        const normRole = normalizeMemberRole(m.role) || 'Membro';
        const lower = normRole.toLowerCase();
        if (lower.includes('capit') || lower.includes('diret') || lower.includes('coordenador')) {
          leadershipCount++;
          leadership.push({
            id: m.id,
            name: m.name,
            role: normRole,
            area: normArea,
            photo: m.photo,
          });
        } else if (lower.includes('trainee')) {
          traineesCount++;
        } else {
          membersCount++;
        }
      }

      const divAreaSummaries = (meetings?.overview.areaSummaries || []).filter(
        (a) => a.teamSlug === slug
      );

      const teamComparison = (meetings?.overview.teamComparison || []).find(
        (t) => t.slug === slug
      );

      const areasBreakdown = [...areaCounts.entries()]
        .map(([area, count]) => {
          const mArea = divAreaSummaries.find(
            (s) => s.area.toLowerCase() === area.toLowerCase()
          );
          return {
            area,
            count,
            pct: active.length > 0 ? Math.round((count / active.length) * 100) : 0,
            meetingRatePct: mArea ? mArea.pct : null,
            meetingsHeld: mArea ? mArea.meetingsCount : 0,
          };
        })
        .sort((a, b) => b.count - a.count);

      const coursesTop = [...courseCounts.entries()]
        .map(([course, count]) => ({ course, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      return {
        slug,
        name,
        activeMembers: active.length,
        inactiveMembers: inactive,
        leadership,
        areasBreakdown,
        rolesBreakdown: {
          leadership: leadershipCount,
          members: membersCount,
          trainees: traineesCount,
        },
        meetingsStats: {
          meetingsHeld: teamComparison?.meetingsCount || 0,
          attendanceRatePct: teamComparison?.pct || 0,
          presences: teamComparison?.presences || 0,
          absences: teamComparison?.absences || 0,
        },
        coursesTop,
        activeRoster: active.map((m) => ({
          id: m.id,
          name: m.name,
          role: normalizeMemberRole(m.role) || 'Membro',
          area: normalizeMemberArea(m.area) || 'Não informada',
          course: m.course,
        })),
      };
    };

    const harpia = buildDivision('harpia', 'Divisão Harpia');
    const nautilus = buildDivision('nautilus', 'Divisão Nautilus');

    const allTechnicalAreas = Array.from(
      new Set([
        ...harpia.areasBreakdown.map((a) => a.area),
        ...nautilus.areasBreakdown.map((a) => a.area),
      ])
    );

    const headToHeadAreas = allTechnicalAreas.map((area) => {
      const h = harpia.areasBreakdown.find((a) => a.area === area);
      const n = nautilus.areasBreakdown.find((a) => a.area === area);
      return {
        area,
        Harpia: h?.count || 0,
        Nautilus: n?.count || 0,
        harpiaRate: h?.meetingRatePct ?? 0,
        nautilusRate: n?.meetingRatePct ?? 0,
      };
    });

    return {
      harpia,
      nautilus,
      headToHeadAreas,
    };
  } catch (err) {
    console.error('[insights] Falha em getDivisionsDeepAnalytics:', err);
    return null;
  }
}

