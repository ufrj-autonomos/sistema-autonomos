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

export const KNOWN_AREAS: AreaDefinition[] = [
  { area: 'Software', teamId: 2, label: 'Software', teamSlug: 'harpia', icon: '🖥️', coordinator: 'Gabriel Gaspar' },
  { area: 'Mecânica', teamId: 2, label: 'Mecânica', teamSlug: 'harpia', icon: '⚙️', coordinator: 'Gabriel Facundo' },
  { area: 'Eletrônica', teamId: 2, label: 'Eletrônica', teamSlug: 'harpia', icon: '🔌', coordinator: 'Derek Werneck' },
  { area: 'Software', teamId: 1, label: 'Software (Nautilus)', teamSlug: 'nautilus', icon: '🖥️' },
  { area: 'Mecânica', teamId: 1, label: 'Mecânica (Nautilus)', teamSlug: 'nautilus', icon: '⚙️' },
  { area: 'Eletrônica', teamId: 1, label: 'Eletrônica (Nautilus)', teamSlug: 'nautilus', icon: '🔌' },
  { area: 'Gestão', teamId: null, label: 'Gente e Gestão', teamSlug: 'autonomos', icon: '👥', coordinator: 'Henrique' },
  { area: 'Marketing', teamId: null, label: 'Marketing', teamSlug: 'autonomos', icon: '📲', coordinator: 'Thiago' },
];

export function canUserManageMeetings(user: SafeUser): boolean {
  return user.role === 'ADMIN';
}

export function getVisibleAreasForUser(user: SafeUser): AreaDefinition[] {
  if (user.role === 'ADMIN') {
    return KNOWN_AREAS;
  }

  // Se o usuário for Harpia (teamId === 2)
  if (user.teamId === 2) {
    return KNOWN_AREAS.filter((a) => a.teamId === 2);
  }

  // Se o usuário for Nautilus (teamId === 1)
  if (user.teamId === 1) {
    return KNOWN_AREAS.filter((a) => a.teamId === 1);
  }

  // Se for Autônomos Geral (sem ser de área técnica)
  return KNOWN_AREAS.filter((a) => a.teamId === null);
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
            select: { id: true, name: true, avatar: true, area: true, teamId: true },
          },
        },
      },
    },
    orderBy: [{ date: 'asc' }, { createdAt: 'asc' }],
  });

  // Buscar todos os membros ativos que podem ter reuniões
  const allMembers = await prisma.member.findMany({
    where: { active: true },
    select: { id: true, name: true, avatar: true, area: true, teamId: true },
  });

  // Estatísticas por Membro em todo o período
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

  // Consolidado por Área (para todas as áreas conhecidas)
  const areaSummaries = KNOWN_AREAS.map((def) => {
    const areaMeetings = allMeetings.filter(
      (m) => m.area === def.area && m.teamId === def.teamId
    );

    const memberIds = new Set<string>();
    let totalP = 0;
    let totalA = 0;

    for (const m of areaMeetings) {
      for (const att of m.attendances) {
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

  // Métricas Gerais do Painel Executivo
  let totalPresences = 0;
  let totalAbsences = 0;
  let perfectCount = 0;

  for (const s of memberStatsList) {
    totalPresences += s.presences;
    totalAbsences += s.absences;
    if (s.meetings > 0 && s.pct >= 99.9) perfectCount++;
  }

  const grandTotal = totalPresences + totalAbsences;
  const overallRate = grandTotal > 0 ? (totalPresences / grandTotal) * 100 : 0;
  const overallStatus = getFrequencyStatus(overallRate, allMeetings.length);

  // Top 5 Membros com Menor Frequência (com pelo menos 1 reunião)
  const lowFrequencyMembers = memberStatsList
    .filter((s) => s.meetings > 0 && s.pct < 75)
    .sort((a, b) => a.pct - b.pct || b.absences - a.absences)
    .slice(0, 5);

  // Top Membros com 100% de Presença
  const perfectFrequencyMembers = memberStatsList
    .filter((s) => s.meetings > 0 && s.pct >= 99.9)
    .sort((a, b) => b.meetings - a.meetings || a.name.localeCompare(b.name, 'pt-BR'));

  // Detalhamento por Área permitida para o usuário (Matriz de Reuniões)
  const detailedAreas = visibleAreas.map((def) => {
    const areaMeetings = allMeetings.filter(
      (m) => m.area === def.area && m.teamId === def.teamId
    );

    // Membros presentes nas reuniões desta área ou cadastrados nesta área
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

    // Inicializar membros cadastrados na área
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

    // Alimentar com os registros reais
    for (const meeting of areaMeetings) {
      for (const att of meeting.attendances) {
        if (!memberMap.has(att.memberId)) {
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
      totalMembers: memberStatsList.length,
      totalMeetings: allMeetings.length,
      totalPresences,
      totalAbsences,
      overallRate: Number(overallRate.toFixed(1)),
      overallStatus,
      perfectCount,
      areaSummaries,
      lowFrequencyMembers,
      perfectFrequencyMembers,
    },
    detailedAreas,
  };
}

