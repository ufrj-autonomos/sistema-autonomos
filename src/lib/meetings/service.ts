import { prisma } from '@/lib/prisma';
import type { SafeUser } from '@/lib/session';
import type { MeetingAttendanceStatus } from '@prisma/client';

export interface AreaDefinition {
  area: string;
  teamId: number | null;
  label: string;
  teamSlug: 'nautilus' | 'harpia' | 'autonomos';
  icon: string;
  coordinator?: string;
}

export interface TeamComparisonSummary {
  teamId: number | null;
  slug: 'harpia' | 'nautilus' | 'autonomos';
  name: string;
  color: string;
  icon: string;
  meetingsCount: number;
  membersCount: number;
  presences: number;
  absences: number;
  pct: number;
}

export const KNOWN_AREAS: AreaDefinition[] = [
  { area: 'Software', teamId: 2, label: 'Software', teamSlug: 'harpia', icon: '🖥️', coordinator: 'Gabriel Gaspar' },
  { area: 'Mecânica', teamId: 2, label: 'Mecânica', teamSlug: 'harpia', icon: '⚙️', coordinator: 'Gabriel Facundo' },
  { area: 'Eletrônica', teamId: 2, label: 'Eletrônica', teamSlug: 'harpia', icon: '🔌', coordinator: 'Derek Werneck' },
  { area: 'Software', teamId: 1, label: 'Software', teamSlug: 'nautilus', icon: '🖥️' },
  { area: 'Mecânica', teamId: 1, label: 'Mecânica', teamSlug: 'nautilus', icon: '⚙️' },
  { area: 'Eletrônica', teamId: 1, label: 'Eletrônica', teamSlug: 'nautilus', icon: '🔌' },
  { area: 'Gestão', teamId: null, label: 'Gente e Gestão', teamSlug: 'autonomos', icon: '👥', coordinator: 'Henrique' },
  { area: 'Marketing', teamId: null, label: 'Marketing', teamSlug: 'autonomos', icon: '📲', coordinator: 'Thiago' },
];

export function canUserManageMeetings(user: SafeUser): boolean {
  return user.role === 'ADMIN';
}

export function getVisibleAreasForUser(user: SafeUser): AreaDefinition[] {
  const isAdmin = user.role === 'ADMIN';

  let list: AreaDefinition[] = [];
  if (isAdmin) {
    list = KNOWN_AREAS;
  } else if (user.teamId === 2) {
    list = KNOWN_AREAS.filter((a) => a.teamId === 2);
  } else if (user.teamId === 1) {
    list = KNOWN_AREAS.filter((a) => a.teamId === 1);
  } else {
    list = KNOWN_AREAS.filter((a) => a.teamId === null);
  }

  return list.map((a) => {
    let label = a.label;
    if (isAdmin) {
      if (a.teamSlug === 'harpia') {
        label = `${a.area} (Harpia)`;
      } else if (a.teamSlug === 'nautilus') {
        label = `${a.area} (Nautilus)`;
      } else if (a.teamSlug === 'autonomos') {
        label = a.area === 'Gestão' ? 'Gente e Gestão (Geral)' : `${a.area} (Geral)`;
      }
    } else {
      label = a.area === 'Gestão' ? 'Gente e Gestão' : a.area;
    }
    return {
      ...a,
      label,
    };
  });
}

export function calculateAttendanceScore(status: MeetingAttendanceStatus | string): { presence: number; absence: number; counted: boolean } {
  switch (status) {
    case 'PRESENT':
    case 'JUSTIFIED':
      return { presence: 1.0, absence: 0, counted: true };
    case 'LATE':
      return { presence: 0.5, absence: 0.5, counted: true };
    case 'ABSENT':
      return { presence: 0, absence: 1.0, counted: true };
    case 'NOT_A_MEMBER':
    case 'NO_MEETING':
    default:
      return { presence: 0, absence: 0, counted: false };
  }
}

export function getFrequencyStatus(pct: number, totalMeetings: number): { label: string; tone: 'green' | 'yellow' | 'red' | 'gray' } {
  if (totalMeetings === 0) return { label: 'Aguardando Reuniões', tone: 'gray' };
  if (pct >= 85) return { label: '🟢 Excelente', tone: 'green' };
  if (pct >= 75) return { label: '🟡 Regular', tone: 'yellow' };
  return { label: '🔴 Atenção', tone: 'red' };
}

export async function getMeetingsDashboardData(user: SafeUser, period = '26.2') {
  const visibleAreas = getVisibleAreasForUser(user);

  // Buscar todas as reuniões do período
  const allMeetings = await prisma.meeting.findMany({
    where: { period },
    include: {
      attendances: {
        include: {
          member: {
            select: { id: true, name: true, avatar: true, area: true, teamId: true, active: true, status: true },
          },
        },
      },
    },
    orderBy: [{ date: 'asc' }, { createdAt: 'asc' }],
  });

  // Buscar todos os membros ativos que pertencem a equipes
  const allMembers = await prisma.member.findMany({
    where: {
      active: true,
      status: { notIn: ['SUSPENDED', 'REJECTED'] },
    },
    select: { id: true, name: true, avatar: true, area: true, teamId: true, active: true, status: true },
  });

  const activeMemberIds = new Set(allMembers.map((m) => m.id));

  // Estatísticas por Membro em todo o período (apenas membros ativos)
  const memberStatsMap = new Map<
    string,
    {
      id: string;
      name: string;
      avatar: string | null;
      area: string;
      teamId: number | null;
      presences: number;
      absences: number;
      meetings: number;
      pct: number;
    }
  >();

  for (const m of allMeetings) {
    for (const a of m.attendances) {
      if (!activeMemberIds.has(a.memberId)) continue;

      if (!memberStatsMap.has(a.memberId)) {
        memberStatsMap.set(a.memberId, {
          id: a.memberId,
          name: a.member.name,
          avatar: a.member.avatar,
          area: m.area,
          teamId: m.teamId,
          presences: 0,
          absences: 0,
          meetings: 0,
          pct: 0,
        });
      }
      const s = memberStatsMap.get(a.memberId)!;
      const score = calculateAttendanceScore(a.status);
      if (score.counted) {
        s.meetings += 1;
        s.presences += score.presence;
        s.absences += score.absence;
      }
    }
  }

  // Recalcular % por membro
  const memberStatsList = Array.from(memberStatsMap.values()).map((s) => ({
    ...s,
    pct: s.meetings > 0 ? (s.presences / s.meetings) * 100 : 0,
  }));

  // Consolidado por Área (apenas áreas visíveis ao usuário; Admin vê todas)
  const targetAreas = visibleAreas;
  const areaSummaries = targetAreas.map((def) => {
    const areaMeetings = allMeetings.filter(
      (m) => m.area === def.area && m.teamId === def.teamId
    );

    const memberIds = new Set<string>();
    let totalP = 0;
    let totalA = 0;

    for (const m of areaMeetings) {
      for (const att of m.attendances) {
        if (!activeMemberIds.has(att.memberId)) continue;
        memberIds.add(att.memberId);
        const score = calculateAttendanceScore(att.status);
        if (score.counted) {
          totalP += score.presence;
          totalA += score.absence;
        }
      }
    }

    const totalCalculated = totalP + totalA;
    const pct = totalCalculated > 0 ? (totalP / totalCalculated) * 100 : 0;
    const status = getFrequencyStatus(pct, areaMeetings.length);

    return {
      area: def.area,
      teamId: def.teamId,
      label: def.label,
      teamSlug: def.teamSlug,
      icon: def.icon,
      coordinator: def.coordinator || 'Não definido',
      meetingsCount: areaMeetings.length,
      membersCount: memberIds.size,
      presences: totalP,
      absences: totalA,
      pct: Number(pct.toFixed(1)),
      status,
    };
  });

  // Comparação de Reuniões por Equipe (Harpia, Nautilus, Autônomos Geral)
  const teamComparison: TeamComparisonSummary[] = [
    {
      teamId: 2,
      slug: 'harpia' as const,
      name: 'Harpia',
      color: '#A346CC',
      icon: '☁️',
      meetingsCount: allMeetings.filter((m) => m.teamId === 2).length,
      membersCount: allMembers.filter((m) => m.teamId === 2).length,
      presences: 0,
      absences: 0,
      pct: 0,
    },
    {
      teamId: 1,
      slug: 'nautilus' as const,
      name: 'Nautilus',
      color: '#387aef',
      icon: '🌊',
      meetingsCount: allMeetings.filter((m) => m.teamId === 1).length,
      membersCount: allMembers.filter((m) => m.teamId === 1).length,
      presences: 0,
      absences: 0,
      pct: 0,
    },
    {
      teamId: null,
      slug: 'autonomos' as const,
      name: 'Autônomos Geral',
      color: '#10b981',
      icon: '🤖',
      meetingsCount: allMeetings.filter((m) => m.teamId === null).length,
      membersCount: allMembers.filter((m) => m.teamId === null).length,
      presences: 0,
      absences: 0,
      pct: 0,
    },
  ].map((team) => {
    const teamMeetings = allMeetings.filter((m) => m.teamId === team.teamId);
    let p = 0;
    let a = 0;
    for (const m of teamMeetings) {
      for (const att of m.attendances) {
        if (!activeMemberIds.has(att.memberId)) continue;
        const score = calculateAttendanceScore(att.status);
        if (score.counted) {
          p += score.presence;
          a += score.absence;
        }
      }
    }
    const tot = p + a;
    return {
      ...team,
      presences: p,
      absences: a,
      pct: tot > 0 ? Number(((p / tot) * 100).toFixed(1)) : 0,
    };
  });

  // Métricas Gerais do Painel Executivo (no escopo da equipe do usuário, ou global para Admin)
  const scopedMembersList = user.role === 'ADMIN'
    ? memberStatsList
    : memberStatsList.filter((s) => s.teamId === user.teamId);

  const scopedMeetings = user.role === 'ADMIN'
    ? allMeetings
    : allMeetings.filter((m) => m.teamId === user.teamId);

  let totalPresences = 0;
  let totalAbsences = 0;
  let perfectCount = 0;

  for (const s of scopedMembersList) {
    totalPresences += s.presences;
    totalAbsences += s.absences;
    if (s.meetings > 0 && s.pct >= 99.9) perfectCount++;
  }

  const grandTotal = totalPresences + totalAbsences;
  const overallRate = grandTotal > 0 ? (totalPresences / grandTotal) * 100 : 0;
  const overallStatus = getFrequencyStatus(overallRate, scopedMeetings.length);

  // Top 5 Membros com Menor Frequência no escopo da equipe
  const lowFrequencyMembers = scopedMembersList
    .filter((s) => s.meetings > 0 && s.pct < 75)
    .sort((a, b) => a.pct - b.pct || b.absences - a.absences)
    .slice(0, 5);

  // Mural dos Mais Presentes no escopo da equipe:
  // Os 5 membros com melhor presença, e se houver mais de 5 com 100%, mostra todos os de 100%
  const sortedActiveMembers = scopedMembersList
    .filter((s) => s.meetings > 0)
    .sort((a, b) => b.pct - a.pct || b.meetings - a.meetings || b.presences - a.presences || a.name.localeCompare(b.name, 'pt-BR'));

  const membersWith100 = sortedActiveMembers.filter((s) => s.pct >= 99.9);
  const topPresentMembers = membersWith100.length > 5
    ? membersWith100
    : sortedActiveMembers.slice(0, 5);

  // Detalhamento por Área permitida para o usuário (Matriz de Reuniões)
  const detailedAreas = visibleAreas.map((def) => {
    const areaMeetings = allMeetings.filter(
      (m) => m.area === def.area && m.teamId === def.teamId
    );

    // Membros ativos da equipe cadastrados nesta área
    const memberMap = new Map<
      string,
      {
        id: string;
        name: string;
        avatar: string | null;
        attendances: Record<string, { status: MeetingAttendanceStatus; notes: string | null; attendanceId: string }>;
        presences: number;
        absences: number;
        total: number;
        pct: number;
      }
    >();

    // Inicializar membros ativos cadastrados na área
    allMembers
      .filter((m) => {
        if (def.teamId !== null && m.teamId !== def.teamId) return false;
        if (def.teamId === null && m.teamId !== null) return false;
        return m.area.toLowerCase().includes(def.area.toLowerCase());
      })
      .forEach((m) => {
        memberMap.set(m.id, {
          id: m.id,
          name: m.name,
          avatar: m.avatar,
          attendances: {},
          presences: 0,
          absences: 0,
          total: 0,
          pct: 0,
        });
      });

    // Alimentar com os registros reais apenas para membros ativos da equipe
    for (const meeting of areaMeetings) {
      for (const att of meeting.attendances) {
        if (!activeMemberIds.has(att.memberId)) continue;

        if (!memberMap.has(att.memberId)) {
          const activeMem = allMembers.find((m) => m.id === att.memberId);
          if (activeMem && (activeMem.teamId === def.teamId || (def.teamId === null && activeMem.teamId === null))) {
            memberMap.set(att.memberId, {
              id: att.memberId,
              name: att.member.name,
              avatar: att.member.avatar,
              attendances: {},
              presences: 0,
              absences: 0,
              total: 0,
              pct: 0,
            });
          } else {
            continue;
          }
        }

        const mObj = memberMap.get(att.memberId)!;
        mObj.attendances[meeting.id] = {
          status: att.status,
          notes: att.notes,
          attendanceId: att.id,
        };
        const score = calculateAttendanceScore(att.status);
        if (score.counted) {
          mObj.total += 1;
          mObj.presences += score.presence;
          mObj.absences += score.absence;
        }
      }
    }

    const membersList = Array.from(memberMap.values())
      .map((m) => ({
        ...m,
        pct: m.total > 0 ? (m.presences / m.total) * 100 : 0,
        status: getFrequencyStatus(m.total > 0 ? (m.presences / m.total) * 100 : 0, m.total),
      }))
      .sort((a, b) => b.pct - a.pct || a.name.localeCompare(b.name, 'pt-BR'));

    return {
      def,
      meetings: areaMeetings.map((m) => ({
        id: m.id,
        title: m.title,
        date: m.date.toISOString(),
        description: m.description,
      })),
      members: membersList,
    };
  });

  return {
    period,
    isAdmin: canUserManageMeetings(user),
    visibleAreas,
    overview: {
      totalMembers: scopedMembersList.length,
      totalMeetings: scopedMeetings.length,
      totalPresences,
      totalAbsences,
      overallRate: Number(overallRate.toFixed(1)),
      overallStatus,
      perfectCount,
      teamComparison,
      areaSummaries,
      lowFrequencyMembers,
      perfectFrequencyMembers: topPresentMembers,
      topPresentMembers,
    },
    detailedAreas,
  };
}

