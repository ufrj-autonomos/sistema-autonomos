import type { DisciplinaryWarningType } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { db as institutionalDb } from '@/lib/institutional/db';
import { sendDisciplinaryNotificationEmail, type DispatchEmailResult } from '@/lib/email';
import {
  getMemberDisciplinarySummary,
  type MemberDisciplinarySummary,
} from './service';

export type OccurrenceInputType = DisciplinaryWarningType | 'EXPULSAO_DIRETA';

export interface IssueDisciplinaryOccurrenceInput {
  memberId: string;
  type: OccurrenceInputType;
  reason: string;
  notes?: string | null;
  issuedById?: string | null;
}

export interface IssueDisciplinaryOccurrenceResult {
  warning: {
    id: string;
    memberId: string;
    type: DisciplinaryWarningType;
    reason: string;
    notes: string | null;
    issuedById: string | null;
    createdAt: Date;
  };
  directExpulsion: boolean;
  autoExpelled: boolean;
  expelled: boolean;
  summary: MemberDisciplinarySummary;
  emailResult: DispatchEmailResult;
}

async function deactivateMemberAndSyncInstitutional(params: {
  memberId: string;
  institutionalMemberId: number | null;
  reason: string;
}): Promise<void> {
  const now = new Date();
  await prisma.$transaction([
    prisma.member.update({
      where: { id: params.memberId },
      data: {
        active: false,
        inactivatedAt: now,
        inactivationReason: params.reason,
      },
    }),
    prisma.session.deleteMany({
      where: { memberId: params.memberId },
    }),
  ]);

  if (params.institutionalMemberId && process.env.INSTITUTIONAL_DATABASE_URL) {
    try {
      await institutionalDb.institutionalMember.update({
        where: { id: params.institutionalMemberId },
        data: {
          active: false,
          leftYear: String(now.getFullYear()),
        },
      });
    } catch (syncErr) {
      console.warn('Falha ao atualizar status de inativação no banco institucional:', syncErr);
    }
  }
}

export async function issueDisciplinaryOccurrence(
  input: IssueDisciplinaryOccurrenceInput
): Promise<IssueDisciplinaryOccurrenceResult> {
  const member = await prisma.member.findUnique({
    where: { id: input.memberId },
    select: {
      id: true,
      name: true,
      email: true,
      active: true,
      institutionalMemberId: true,
    },
  });

  if (!member) {
    throw new Error('Integrante não encontrado.');
  }

  const trimmedReason = input.reason.trim();
  const trimmedNotes = input.notes?.trim() || null;
  const isDirectExpulsion = input.type === 'EXPULSAO_DIRETA';

  const warningType: DisciplinaryWarningType =
    input.type === 'EXPULSAO_DIRETA' ? 'ADVERTENCIA_DIRETA' : input.type;

  const warning = await prisma.disciplinaryWarning.create({
    data: {
      memberId: member.id,
      type: warningType,
      reason: isDirectExpulsion ? `[EXPULSÃO DIRETA] ${trimmedReason}` : trimmedReason,
      notes: trimmedNotes,
      issuedById: input.issuedById ?? null,
    },
    include: {
      member: { select: { id: true, name: true, area: true } },
      issuedBy: { select: { id: true, name: true } },
    },
  });

  const summary = await getMemberDisciplinarySummary(member.id);
  if (!summary) {
    throw new Error('Falha ao recalcular score disciplinar.');
  }

  const reachedThreeWarnings = summary.totalWarnings >= 3;
  const expelled = isDirectExpulsion || reachedThreeWarnings;

  if (expelled && member.active) {
    await deactivateMemberAndSyncInstitutional({
      memberId: member.id,
      institutionalMemberId: member.institutionalMemberId,
      reason: isDirectExpulsion
        ? `Expulsão: ${trimmedReason}`
        : `Expulsão automática (3 advertências): ${trimmedReason}`,
    });
  }

  const emailResult = await sendDisciplinaryNotificationEmail(member.email, {
    recipientName: member.name,
    occurrenceType: input.type,
    occurrenceReason: trimmedReason,
    occurrenceNotes: trimmedNotes,
    avisosCount: summary.avisosCount,
    directWarningsCount: summary.directWarningsCount,
    warningFromAvisos: summary.warningFromAvisos,
    totalWarnings: summary.totalWarnings,
    status: summary.status,
    statusLabel: summary.statusLabel,
    wasAutoExpelled: expelled,
  });

  return {
    warning,
    directExpulsion: isDirectExpulsion,
    autoExpelled: !isDirectExpulsion && reachedThreeWarnings,
    expelled,
    summary,
    emailResult,
  };
}
