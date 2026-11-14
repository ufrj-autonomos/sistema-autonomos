import { Prisma } from '@prisma/client';
import { prisma } from './prisma';

export type EmailLogCategory =
  | 'DISCIPLINARY'
  | 'LAB_HOURS_ALERT'
  | 'REIMBURSEMENT'
  | 'ACCOUNT_APPROVED'
  | 'AUTH_CODE'
  | 'OTHER';

export type EmailLogStatus = 'SENT' | 'FAILED' | 'SKIPPED';

export const EMAIL_CATEGORY_LABELS: Record<EmailLogCategory, string> = {
  DISCIPLINARY: 'Disciplinar',
  LAB_HOURS_ALERT: 'Alerta de Horas',
  REIMBURSEMENT: 'Reembolso',
  ACCOUNT_APPROVED: 'Aprovação de Conta',
  AUTH_CODE: 'Código de Senha',
  OTHER: 'Sistema',
};

export interface EmailDispatchLogDTO {
  id: string;
  category: EmailLogCategory;
  categoryLabel: string;
  recipientName: string | null;
  recipientEmail: string;
  recipientArea: string | null;
  memberId: string | null;
  subject: string;
  previewText: string | null;
  status: EmailLogStatus;
  errorMessage: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export interface EmailLogsDashboardData {
  logs: EmailDispatchLogDTO[];
  totalCount: number;
  stats: {
    total: number;
    sent: number;
    failed: number;
    skipped: number;
    last24h: number;
  };
}

export async function recordEmailDispatchLog(input: {
  category: EmailLogCategory;
  recipientEmail: string;
  recipientName?: string | null;
  memberId?: string | null;
  subject: string;
  previewText?: string | null;
  status: EmailLogStatus;
  errorMessage?: string | null;
  metadata?: Record<string, unknown> | null;
}): Promise<void> {
  if (process.env.NODE_ENV === 'test' || !process.env.DATABASE_URL) {
    return;
  }

  try {
    let memberId = input.memberId ?? null;
    let recipientName = input.recipientName?.trim() || null;

    if (!memberId && input.recipientEmail) {
      const matched = await prisma.member.findFirst({
        where: { email: { equals: input.recipientEmail.trim(), mode: 'insensitive' } },
        select: { id: true, name: true },
      });
      if (matched) {
        memberId = matched.id;
        if (!recipientName) recipientName = matched.name;
      }
    }

    await prisma.emailDispatchLog.create({
      data: {
        category: input.category,
        recipientName,
        recipientEmail: input.recipientEmail.trim(),
        memberId,
        subject: input.subject.slice(0, 300),
        previewText: input.previewText ? input.previewText.slice(0, 4000) : null,
        status: input.status,
        errorMessage: input.errorMessage ? input.errorMessage.slice(0, 1000) : null,
        metadata: input.metadata
          ? (input.metadata as Prisma.InputJsonValue)
          : Prisma.JsonNull,
      },
    });
  } catch (err) {
    console.warn('[email-logs] Falha ao gravar log de envio de e-mail:', err);
  }
}

export async function getEmailLogsDashboard(params: {
  category?: string | null;
  status?: string | null;
  q?: string | null;
  limit?: number;
  offset?: number;
} = {}): Promise<EmailLogsDashboardData> {
  const limit = Math.min(Math.max(params.limit ?? 80, 1), 200);
  const offset = Math.max(params.offset ?? 0, 0);

  const where: Prisma.EmailDispatchLogWhereInput = {};
  if (params.category && params.category !== 'ALL') {
    where.category = params.category;
  }
  if (params.status && params.status !== 'ALL') {
    where.status = params.status;
  }
  const q = params.q?.trim();
  if (q) {
    where.OR = [
      { recipientEmail: { contains: q, mode: 'insensitive' } },
      { recipientName: { contains: q, mode: 'insensitive' } },
      { subject: { contains: q, mode: 'insensitive' } },
      { previewText: { contains: q, mode: 'insensitive' } },
    ];
  }

  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const [rows, totalCount, statusGroups, last24h] = await Promise.all([
    prisma.emailDispatchLog.findMany({
      where,
      include: {
        member: {
          select: { id: true, name: true, area: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    }),
    prisma.emailDispatchLog.count({ where }),
    prisma.emailDispatchLog.groupBy({
      by: ['status'],
      _count: { _all: true },
    }),
    prisma.emailDispatchLog.count({
      where: { createdAt: { gte: since24h }, status: 'SENT' },
    }),
  ]);

  let sent = 0;
  let failed = 0;
  let skipped = 0;
  for (const grp of statusGroups) {
    if (grp.status === 'SENT') sent = grp._count._all;
    else if (grp.status === 'FAILED') failed = grp._count._all;
    else if (grp.status === 'SKIPPED') skipped = grp._count._all;
  }

  const logs: EmailDispatchLogDTO[] = rows.map((row) => {
    const cat = (row.category in EMAIL_CATEGORY_LABELS
      ? row.category
      : 'OTHER') as EmailLogCategory;
    return {
      id: row.id,
      category: cat,
      categoryLabel: EMAIL_CATEGORY_LABELS[cat],
      recipientName: row.member?.name || row.recipientName || null,
      recipientEmail: row.recipientEmail,
      recipientArea: row.member?.area || null,
      memberId: row.memberId,
      subject: row.subject,
      previewText: row.previewText,
      status: (row.status === 'FAILED' || row.status === 'SKIPPED' ? row.status : 'SENT') as EmailLogStatus,
      errorMessage: row.errorMessage,
      metadata:
        row.metadata && typeof row.metadata === 'object' && !Array.isArray(row.metadata)
          ? (row.metadata as Record<string, unknown>)
          : null,
      createdAt: row.createdAt.toISOString(),
    };
  });

  return {
    logs,
    totalCount,
    stats: {
      total: sent + failed + skipped,
      sent,
      failed,
      skipped,
      last24h,
    },
  };
}
