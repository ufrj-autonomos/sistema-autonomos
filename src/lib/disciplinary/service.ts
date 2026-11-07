import { prisma } from '@/lib/prisma';
import type { SafeUser } from '@/lib/session';
import type { DisciplinaryWarningType, AccountStatus, Prisma } from '@prisma/client';

export type DisciplinaryStatus = 'REGULAR' | 'ATENCAO' | 'ALERTA' | 'EXPULSAO';

export interface DisciplinaryRecord {
  id: string;
  memberId: string;
  memberName: string;
  memberArea: string;
  memberAvatar: string | null;
  memberTeamId: number | null;
  type: DisciplinaryWarningType;
  typeLabel: string;
  reason: string;
  notes: string | null;
  issuedById: string | null;
  issuedByName: string | null;
  createdAt: string;
}

export interface MemberDisciplinarySummary {
  memberId: string;
  name: string;
  email: string | null;
  avatar: string | null;
  area: string;
  teamId: number | null;
  teamSlug: 'nautilus' | 'harpia' | 'autonomos';
  avisosCount: number;
  directWarningsCount: number;
  warningFromAvisos: number;
  totalWarnings: number;
  status: DisciplinaryStatus;
  statusLabel: string;
  statusColor: 'green' | 'yellow' | 'orange' | 'red';
  warnings: DisciplinaryRecord[];
}

export interface DisciplinaryDashboardData {
  isAdminOrManagement: boolean;
  canManage: boolean;
  overview: {
    totalMembers: number;
    regularesCount: number;
    atencaoAlertaCount: number;
    expulsosCount: number;
  };
  members: MemberDisciplinarySummary[];
  recentOccurrences: DisciplinaryRecord[];
}

export function calculateDisciplinaryStatus(avisos: number, directWarnings: number): {
  warningFromAvisos: number;
  totalWarnings: number;
  status: DisciplinaryStatus;
  statusLabel: string;
  statusColor: 'green' | 'yellow' | 'orange' | 'red';
} {
  const warningFromAvisos = Math.floor(avisos / 2);
  const totalWarnings = directWarnings + warningFromAvisos;

  if (totalWarnings >= 3) {
    return {
      warningFromAvisos,
      totalWarnings,
      status: 'EXPULSAO',
      statusLabel: 'Expulsão',
      statusColor: 'red',
    };
  }
  if (totalWarnings === 2) {
    return {
      warningFromAvisos,
      totalWarnings,
      status: 'ALERTA',
      statusLabel: 'Alerta',
      statusColor: 'orange',
    };
  }
  if (totalWarnings === 1 || avisos === 1) {
    return {
      warningFromAvisos,
      totalWarnings,
      status: 'ATENCAO',
      statusLabel: 'Atenção',
      statusColor: 'yellow',
    };
  }
  return {
    warningFromAvisos,
    totalWarnings,
    status: 'REGULAR',
    statusLabel: 'Regular',
    statusColor: 'green',
  };
}

export function canUserManageDisciplinary(user: SafeUser, targetMemberTeamId?: number | null): boolean {
  if (user.role === 'ADMIN' || user.role === 'MANAGEMENT') return true;
  if (user.role === 'COORDINATOR') {
    if (targetMemberTeamId === undefined) return true;
    return (user.teamId ?? null) === (targetMemberTeamId ?? null);
  }
  return false;
}

export async function getMemberDisciplinarySummary(memberId: string): Promise<MemberDisciplinarySummary | null> {
  const member = await prisma.member.findUnique({
    where: { id: memberId },
    include: {
      disciplinaryWarnings: {
        include: {
          issuedBy: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  if (!member) return null;

  const avisosCount = member.disciplinaryWarnings.filter((w) => w.type === 'AVISO').length;
  const directWarningsCount = member.disciplinaryWarnings.filter((w) => w.type === 'ADVERTENCIA_DIRETA').length;
  const stats = calculateDisciplinaryStatus(avisosCount, directWarningsCount);

  const teamSlug: 'nautilus' | 'harpia' | 'autonomos' =
    member.teamId === 1 ? 'nautilus' : member.teamId === 2 ? 'harpia' : 'autonomos';

  const warnings: DisciplinaryRecord[] = member.disciplinaryWarnings.map((w) => ({
    id: w.id,
    memberId: member.id,
    memberName: member.name,
    memberArea: member.area,
    memberAvatar: member.avatar,
    memberTeamId: member.teamId,
    type: w.type,
    typeLabel: w.type === 'AVISO' ? 'Aviso' : 'Advertência Direta',
    reason: w.reason,
    notes: w.notes,
    issuedById: w.issuedById,
    issuedByName: w.issuedBy?.name || null,
    createdAt: w.createdAt.toISOString(),
  }));

  return {
    memberId: member.id,
    name: member.name,
    email: member.email,
    avatar: member.avatar,
    area: member.area,
    teamId: member.teamId,
    teamSlug,
    avisosCount,
    directWarningsCount,
    warningFromAvisos: stats.warningFromAvisos,
    totalWarnings: stats.totalWarnings,
    status: stats.status,
    statusLabel: stats.statusLabel,
    statusColor: stats.statusColor,
    warnings,
  };
}

export async function getDisciplinaryDashboardData(user: SafeUser): Promise<DisciplinaryDashboardData> {
  const isGlobal = user.role === 'ADMIN' || user.role === 'MANAGEMENT';
  const memberWhere: Prisma.MemberWhereInput = {
    active: true,
    status: { notIn: ['SUSPENDED', 'REJECTED'] as AccountStatus[] },
  };

  if (!isGlobal) {
    memberWhere.teamId = user.teamId ?? null;
  }

  const [members, allWarnings] = await Promise.all([
    prisma.member.findMany({
      where: memberWhere,
      include: {
        disciplinaryWarnings: {
          include: {
            issuedBy: { select: { id: true, name: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: [{ area: 'asc' }, { name: 'asc' }],
    }),
    prisma.disciplinaryWarning.findMany({
      where: !isGlobal ? { member: { teamId: user.teamId ?? null } } : undefined,
      include: {
        member: { select: { id: true, name: true, area: true, avatar: true, teamId: true } },
        issuedBy: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  let regularesCount = 0;
  let atencaoAlertaCount = 0;
  let expulsosCount = 0;

  const memberSummaries: MemberDisciplinarySummary[] = members.map((m) => {
    const avisosCount = m.disciplinaryWarnings.filter((w) => w.type === 'AVISO').length;
    const directWarningsCount = m.disciplinaryWarnings.filter((w) => w.type === 'ADVERTENCIA_DIRETA').length;
    const stats = calculateDisciplinaryStatus(avisosCount, directWarningsCount);

    if (stats.status === 'REGULAR') regularesCount++;
    else if (stats.status === 'ATENCAO' || stats.status === 'ALERTA') atencaoAlertaCount++;
    else if (stats.status === 'EXPULSAO') expulsosCount++;

    const teamSlug: 'nautilus' | 'harpia' | 'autonomos' =
      m.teamId === 1 ? 'nautilus' : m.teamId === 2 ? 'harpia' : 'autonomos';

    const warnings: DisciplinaryRecord[] = m.disciplinaryWarnings.map((w) => ({
      id: w.id,
      memberId: m.id,
      memberName: m.name,
      memberArea: m.area,
      memberAvatar: m.avatar,
      memberTeamId: m.teamId,
      type: w.type,
      typeLabel: w.type === 'AVISO' ? 'Aviso' : 'Advertência Direta',
      reason: w.reason,
      notes: w.notes,
      issuedById: w.issuedById,
      issuedByName: w.issuedBy?.name || null,
      createdAt: w.createdAt.toISOString(),
    }));

    return {
      memberId: m.id,
      name: m.name,
      email: m.email,
      avatar: m.avatar,
      area: m.area,
      teamId: m.teamId,
      teamSlug,
      avisosCount,
      directWarningsCount,
      warningFromAvisos: stats.warningFromAvisos,
      totalWarnings: stats.totalWarnings,
      status: stats.status,
      statusLabel: stats.statusLabel,
      statusColor: stats.statusColor,
      warnings,
    };
  });

  const recentOccurrences: DisciplinaryRecord[] = allWarnings.map((w) => ({
    id: w.id,
    memberId: w.member.id,
    memberName: w.member.name,
    memberArea: w.member.area,
    memberAvatar: w.member.avatar,
    memberTeamId: w.member.teamId,
    type: w.type,
    typeLabel: w.type === 'AVISO' ? 'Aviso' : 'Advertência Direta',
    reason: w.reason,
    notes: w.notes,
    issuedById: w.issuedById,
    issuedByName: w.issuedBy?.name || null,
    createdAt: w.createdAt.toISOString(),
  }));

  return {
    isAdminOrManagement: isGlobal,
    canManage: canUserManageDisciplinary(user),
    overview: {
      totalMembers: memberSummaries.length,
      regularesCount,
      atencaoAlertaCount,
      expulsosCount,
    },
    members: memberSummaries,
    recentOccurrences,
  };
}

