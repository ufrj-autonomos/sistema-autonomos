import { prisma } from '@/lib/prisma';
import { hasManagementAccess } from '@/lib/access-policy';
import type { SafeUser } from '@/lib/session';
import {
  FINANCE_CATEGORIES,
  FINANCE_FUNDS,
  FINANCE_TEAMS,
  type CategoryExpenseSummary,
  type FinancialAttachmentDTO,
  type FinancialDashboardData,
  type FinancialEntryDTO,
  type FinancialEntryStatusValue,
  type FinancialEntryTypeValue,
  type FinancialSummary,
  type MemberReimbursementsData,
  type MonthlyCashflowPoint,
} from './constants';

export * from './constants';

export class FinanceServiceError extends Error {
  constructor(
    message: string,
    public status: number = 400
  ) {
    super(message);
  }
}

function serializeAttachment(att: {
  id: string;
  entryId: string;
  name: string;
  url: string;
  driveFileId: string | null;
  mimeType: string | null;
  kind: string;
  createdAt: Date;
}): FinancialAttachmentDTO {
  return {
    id: att.id,
    entryId: att.entryId,
    name: att.name,
    url: att.url,
    driveFileId: att.driveFileId,
    mimeType: att.mimeType,
    kind: att.kind,
    createdAt: att.createdAt.toISOString(),
  };
}

function serializeEntry(row: {
  id: string;
  code: string;
  type: string;
  isReimbursement: boolean;
  title: string;
  description: string | null;
  category: string;
  fundSource: string;
  team: string;
  amountCents: number;
  occurredAt: Date | null;
  status: string;
  requesterId: string | null;
  requesterName: string;
  pixKey: string | null;
  pixKeyType: string | null;
  driveFolderId: string | null;
  driveFolderUrl: string | null;
  reviewNotes: string | null;
  reviewedById: string | null;
  reviewedAt: Date | null;
  paidAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  requester?: {
    id: string;
    name: string;
    avatar: string | null;
    area: string;
    pixKey: string | null;
    pixKeyType: string | null;
  } | null;
  reviewedBy?: {
    id: string;
    name: string;
  } | null;
  attachments?: Array<{
    id: string;
    entryId: string;
    name: string;
    url: string;
    driveFileId: string | null;
    mimeType: string | null;
    kind: string;
    createdAt: Date;
  }>;
}): FinancialEntryDTO {
  return {
    id: row.id,
    code: row.code,
    type: row.type as FinancialEntryTypeValue,
    isReimbursement: row.isReimbursement,
    title: row.title,
    description: row.description,
    category: row.category,
    fundSource: row.fundSource,
    team: row.team,
    amountCents: row.amountCents,
    occurredAt: row.occurredAt ? row.occurredAt.toISOString().slice(0, 10) : null,
    status: row.status as FinancialEntryStatusValue,
    requesterId: row.requesterId,
    requesterName: row.requester?.name || row.requesterName,
    requesterAvatar: row.requester?.avatar ?? null,
    requesterArea: row.requester?.area ?? null,
    requesterSavedPixKey: row.requester?.pixKey ?? null,
    requesterSavedPixKeyType: row.requester?.pixKeyType ?? null,
    pixKey: row.pixKey || row.requester?.pixKey || null,
    pixKeyType: row.pixKeyType || row.requester?.pixKeyType || null,
    driveFolderId: row.driveFolderId,
    driveFolderUrl: row.driveFolderUrl,
    reviewNotes: row.reviewNotes,
    reviewedById: row.reviewedById,
    reviewedByName: row.reviewedBy?.name ?? null,
    reviewedAt: row.reviewedAt ? row.reviewedAt.toISOString() : null,
    paidAt: row.paidAt ? row.paidAt.toISOString() : null,
    attachments: (row.attachments ?? []).map(serializeAttachment),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

const MONTH_LABELS: Record<string, string> = {
  '01': 'Jan',
  '02': 'Fev',
  '03': 'Mar',
  '04': 'Abr',
  '05': 'Mai',
  '06': 'Jun',
  '07': 'Jul',
  '08': 'Ago',
  '09': 'Set',
  '10': 'Out',
  '11': 'Nov',
  '12': 'Dez',
};

export function computeFinancialSummary(
  entries: Array<
    Pick<
      FinancialEntryDTO,
      'type' | 'isReimbursement' | 'category' | 'fundSource' | 'amountCents' | 'occurredAt' | 'status'
    >
  >
): FinancialSummary {
  const isSettled = (status: FinancialEntryStatusValue) => status === 'PAGO' || status === 'APROVADO';
  const isPaid = (status: FinancialEntryStatusValue) => status === 'PAGO';

  let freeCashIncomeCents = 0;
  let freeCashExpenseCents = 0;
  let coppetecIncomeCents = 0;
  let coppetecExpenseCents = 0;
  let coppetecPendingCents = 0;
  let totalIncomeCents = 0;
  let totalExpensePaidCents = 0;
  let awaitingReimbursementCents = 0;
  let awaitingReimbursementCount = 0;
  let approvedToPayCents = 0;
  let approvedToPayCount = 0;
  let awaitingNfCount = 0;
  let reimbursementPaidCents = 0;
  let reimbursementPaidCount = 0;

  const categoryMap = new Map<string, CategoryExpenseSummary>();
  const monthlyMap = new Map<string, MonthlyCashflowPoint>();

  for (const e of entries) {
    if (e.type === 'ENTRADA') {
      if (isSettled(e.status)) {
        totalIncomeCents += e.amountCents;
        if (e.fundSource === 'Conta Coppetec') {
          coppetecIncomeCents += e.amountCents;
        } else {
          freeCashIncomeCents += e.amountCents;
        }
      } else if (e.status === 'PENDENTE' && e.fundSource === 'Conta Coppetec') {
        coppetecPendingCents += e.amountCents;
      }

      if (e.occurredAt && isSettled(e.status)) {
        const month = e.occurredAt.slice(0, 7);
        const [, mm] = month.split('-');
        const current = monthlyMap.get(month) ?? {
          month,
          label: `${MONTH_LABELS[mm] || mm}/${month.slice(2, 4)}`,
          incomeCents: 0,
          expenseCents: 0,
        };
        current.incomeCents += e.amountCents;
        monthlyMap.set(month, current);
      }
      continue;
    }

    // e.type === 'SAIDA'
    if (isPaid(e.status)) {
      totalExpensePaidCents += e.amountCents;
      if (e.fundSource === 'Conta Coppetec') {
        coppetecExpenseCents += e.amountCents;
      } else {
        freeCashExpenseCents += e.amountCents;
      }
      if (e.isReimbursement) {
        reimbursementPaidCents += e.amountCents;
        reimbursementPaidCount++;
      }
    } else if (
      e.status === 'AGUARDANDO_REEMBOLSO' ||
      e.status === 'PENDENTE' ||
      e.status === 'AGUARDANDO_NF'
    ) {
      awaitingReimbursementCents += e.amountCents;
      awaitingReimbursementCount++;
      if (e.status === 'AGUARDANDO_NF') {
        awaitingNfCount++;
      }
    } else if (e.status === 'APROVADO') {
      approvedToPayCents += e.amountCents;
      approvedToPayCount++;
    }

    if (e.status !== 'RECUSADO') {
      const cat = categoryMap.get(e.category) ?? {
        category: e.category,
        paidCents: 0,
        pendingCents: 0,
        totalCents: 0,
        count: 0,
      };
      if (isPaid(e.status)) {
        cat.paidCents += e.amountCents;
      } else {
        cat.pendingCents += e.amountCents;
      }
      cat.totalCents += e.amountCents;
      cat.count += 1;
      categoryMap.set(e.category, cat);
    }

    if (e.occurredAt && isPaid(e.status)) {
      const month = e.occurredAt.slice(0, 7);
      const [, mm] = month.split('-');
      const current = monthlyMap.get(month) ?? {
        month,
        label: `${MONTH_LABELS[mm] || mm}/${month.slice(2, 4)}`,
        incomeCents: 0,
        expenseCents: 0,
      };
      current.expenseCents += e.amountCents;
      monthlyMap.set(month, current);
    }
  }

  const expensesByCategory = Array.from(categoryMap.values()).sort(
    (a, b) => b.totalCents - a.totalCents
  );
  const monthlyCashflow = Array.from(monthlyMap.values()).sort((a, b) =>
    a.month.localeCompare(b.month)
  );

  return {
    freeCashBalanceCents: freeCashIncomeCents - freeCashExpenseCents,
    freeCashIncomeCents,
    freeCashExpenseCents,
    coppetecBalanceCents: coppetecIncomeCents - coppetecExpenseCents,
    coppetecIncomeCents,
    coppetecExpenseCents,
    coppetecPendingCents,
    totalIncomeCents,
    totalExpensePaidCents,
    awaitingReimbursementCents,
    awaitingReimbursementCount,
    approvedToPayCents,
    approvedToPayCount,
    awaitingNfCount,
    reimbursementPaidCents,
    reimbursementPaidCount,
    expensesByCategory,
    monthlyCashflow,
  };
}

const entryInclude = {
  requester: {
    select: {
      id: true,
      name: true,
      avatar: true,
      area: true,
      pixKey: true,
      pixKeyType: true,
    },
  },
  reviewedBy: {
    select: {
      id: true,
      name: true,
    },
  },
  attachments: {
    orderBy: { createdAt: 'asc' as const },
  },
};

export async function getFinancialDashboardData(): Promise<FinancialDashboardData> {
  const [rawEntries, members] = await Promise.all([
    prisma.financialEntry.findMany({
      include: entryInclude,
      orderBy: [{ occurredAt: 'desc' }, { createdAt: 'desc' }],
    }),
    prisma.member.findMany({
      where: { status: 'APPROVED' },
      select: {
        id: true,
        name: true,
        email: true,
        area: true,
        teamId: true,
        avatar: true,
        pixKey: true,
        pixKeyType: true,
        active: true,
      },
      orderBy: [{ active: 'desc' }, { name: 'asc' }],
    }),
  ]);

  const entries = rawEntries.map(serializeEntry);
  const summary = computeFinancialSummary(entries);

  return { entries, summary, members };
}

export async function getMemberReimbursementsData(
  memberId: string
): Promise<MemberReimbursementsData> {
  const member = await prisma.member.findUnique({
    where: { id: memberId },
    select: {
      id: true,
      name: true,
      email: true,
      area: true,
      teamId: true,
      avatar: true,
      pixKey: true,
      pixKeyType: true,
    },
  });

  if (!member) {
    throw new FinanceServiceError('Membro não encontrado.', 404);
  }

  const rawEntries = await prisma.financialEntry.findMany({
    where: {
      type: 'SAIDA',
      isReimbursement: true,
      OR: [
        { requesterId: memberId },
        {
          requesterId: null,
          requesterName: { equals: member.name, mode: 'insensitive' },
        },
      ],
    },
    include: entryInclude,
    orderBy: [{ createdAt: 'desc' }, { occurredAt: 'desc' }],
  });

  const entries = rawEntries.map(serializeEntry);

  const awaiting = entries.filter(
    e => e.status === 'AGUARDANDO_REEMBOLSO' || e.status === 'PENDENTE' || e.status === 'AGUARDANDO_NF'
  );
  const approved = entries.filter(e => e.status === 'APROVADO');
  const paid = entries.filter(e => e.status === 'PAGO');

  return {
    member,
    entries,
    summary: {
      awaitingCents: awaiting.reduce((acc, e) => acc + e.amountCents, 0),
      awaitingCount: awaiting.length,
      approvedCents: approved.reduce((acc, e) => acc + e.amountCents, 0),
      approvedCount: approved.length,
      paidCents: paid.reduce((acc, e) => acc + e.amountCents, 0),
      paidCount: paid.length,
    },
  };
}

async function generateNextCode(type: FinancialEntryTypeValue, isReimbursement: boolean): Promise<string> {
  const prefix = type === 'ENTRADA' ? 'ENT' : isReimbursement ? 'RMB' : 'SAI';
  const existing = await prisma.financialEntry.findMany({
    where: { code: { startsWith: `${prefix}-` } },
    select: { code: true },
  });

  let maxNum = 0;
  for (const row of existing) {
    const num = Number.parseInt(row.code.slice(prefix.length + 1), 10);
    if (Number.isFinite(num) && num > maxNum) {
      maxNum = num;
    }
  }

  return `${prefix}-${String(maxNum + 1).padStart(3, '0')}`;
}

export interface CreateFinancialEntryInput {
  type?: FinancialEntryTypeValue;
  isReimbursement?: boolean;
  title: string;
  description?: string | null;
  category?: string;
  fundSource?: string;
  team?: string;
  amountCents: number;
  occurredAt?: string | null;
  status?: FinancialEntryStatusValue;
  requesterId?: string | null;
  requesterName?: string;
  pixKey?: string | null;
  pixKeyType?: string | null;
  attachments?: Array<{
    name: string;
    url: string;
    mimeType?: string | null;
    kind?: string;
  }>;
}

export async function createFinancialEntry(
  actor: SafeUser,
  input: CreateFinancialEntryInput
): Promise<FinancialEntryDTO> {
  const isManager = hasManagementAccess(actor.role);
  const type: FinancialEntryTypeValue = isManager && input.type === 'ENTRADA' ? 'ENTRADA' : 'SAIDA';
  const isReimbursement =
    type === 'ENTRADA' ? false : isManager ? (input.isReimbursement ?? true) : true;

  const title = typeof input.title === 'string' ? input.title.trim() : '';
  if (!title || title.length < 2 || title.length > 240) {
    throw new FinanceServiceError('Informe uma descrição entre 2 e 240 caracteres.', 400);
  }

  const amountCents = Math.round(Number(input.amountCents));
  if (!Number.isFinite(amountCents) || amountCents < 0 || amountCents > 100_000_000) {
    throw new FinanceServiceError('Informe um valor válido em reais.', 400);
  }

  if (!isManager && isReimbursement && amountCents <= 0) {
    throw new FinanceServiceError('Informe um valor maior que R$ 0,00 para solicitar reembolso.', 400);
  }

  const category =
    input.category && (FINANCE_CATEGORIES as readonly string[]).includes(input.category)
      ? input.category
      : 'Administrativo';
  const fundSource =
    input.fundSource && (FINANCE_FUNDS as readonly string[]).includes(input.fundSource)
      ? input.fundSource
      : 'Dinheiro Livre';
  const team =
    input.team && (FINANCE_TEAMS as readonly string[]).includes(input.team)
      ? input.team
      : actor.teamSlug === 'harpia'
      ? 'Harpia'
      : actor.teamSlug === 'nautilus'
      ? 'Nautilus'
      : 'Geral';

  let occurredDate: Date | null = null;
  if (input.occurredAt && /^\d{4}-\d{2}-\d{2}$/.test(input.occurredAt)) {
    occurredDate = new Date(`${input.occurredAt}T12:00:00Z`);
  } else if (!input.occurredAt) {
    occurredDate = new Date();
  }

  let requesterId: string | null = actor.id;
  let requesterName = actor.name;

  if (isManager && input.requesterId) {
    const targetMember = await prisma.member.findUnique({
      where: { id: input.requesterId },
      select: { id: true, name: true },
    });
    if (targetMember) {
      requesterId = targetMember.id;
      requesterName = targetMember.name;
    }
  } else if (isManager && input.requesterName?.trim()) {
    requesterId = input.requesterId || null;
    requesterName = input.requesterName.trim();
  }

  const pixKey = input.pixKey?.trim() || null;
  const pixKeyType = input.pixKeyType?.trim() || null;

  if (!isManager && isReimbursement && !pixKey) {
    throw new FinanceServiceError('Informe sua chave PIX para receber o reembolso.', 400);
  }

  let status: FinancialEntryStatusValue = 'AGUARDANDO_REEMBOLSO';
  if (isManager && input.status) {
    status = input.status;
  } else if (type === 'ENTRADA') {
    status = 'PAGO';
  }

  // Salva a chave PIX no perfil do próprio solicitante para conveniência nos próximos pedidos
  if (pixKey && requesterId && (requesterId === actor.id || !isManager)) {
    await prisma.member.update({
      where: { id: requesterId },
      data: {
        pixKey,
        ...(pixKeyType ? { pixKeyType } : {}),
      },
    });
  }

  const code = await generateNextCode(type, isReimbursement);

  const created = await prisma.financialEntry.create({
    data: {
      code,
      type,
      isReimbursement,
      title,
      description: input.description?.trim() || null,
      category,
      fundSource,
      team,
      amountCents,
      occurredAt: occurredDate,
      status,
      requesterId,
      requesterName,
      pixKey,
      pixKeyType,
      paidAt: status === 'PAGO' ? new Date() : null,
      reviewedById: isManager && status !== 'AGUARDANDO_REEMBOLSO' && status !== 'PENDENTE' ? actor.id : null,
      reviewedAt: isManager && status !== 'AGUARDANDO_REEMBOLSO' && status !== 'PENDENTE' ? new Date() : null,
      attachments: input.attachments?.length
        ? {
            create: input.attachments.map(att => ({
              name: att.name.slice(0, 180),
              url: att.url,
              mimeType: att.mimeType ?? null,
              kind: att.kind ?? 'RECEIPT',
            })),
          }
        : undefined,
    },
    include: entryInclude,
  });

  return serializeEntry(created);
}

export interface UpdateFinancialEntryInput {
  title?: string;
  description?: string | null;
  category?: string;
  fundSource?: string;
  team?: string;
  amountCents?: number;
  occurredAt?: string | null;
  status?: FinancialEntryStatusValue;
  pixKey?: string | null;
  pixKeyType?: string | null;
  reviewNotes?: string | null;
  addAttachments?: Array<{
    name: string;
    url: string;
    mimeType?: string | null;
    kind?: string;
  }>;
  removeAttachmentId?: string;
}

export async function updateFinancialEntry(
  actor: SafeUser,
  id: string,
  input: UpdateFinancialEntryInput
): Promise<FinancialEntryDTO> {
  const existing = await prisma.financialEntry.findUnique({
    where: { id },
    include: entryInclude,
  });

  if (!existing) {
    throw new FinanceServiceError('Lançamento financeiro não encontrado.', 404);
  }

  const isManager = hasManagementAccess(actor.role);
  const isOwner =
    existing.requesterId === actor.id ||
    (!existing.requesterId &&
      existing.requesterName.toLocaleLowerCase('pt-BR') === actor.name.toLocaleLowerCase('pt-BR'));

  if (!isManager && !isOwner) {
    throw new FinanceServiceError('Você não tem permissão para alterar este lançamento.', 403);
  }

  if (!isManager) {
    const editableByMember: FinancialEntryStatusValue[] = [
      'AGUARDANDO_REEMBOLSO',
      'PENDENTE',
      'AGUARDANDO_NF',
    ];
    if (!editableByMember.includes(existing.status as FinancialEntryStatusValue)) {
      throw new FinanceServiceError(
        'Solicitações já aprovadas, pagas ou recusadas só podem ser alteradas pela gestão.',
        403
      );
    }
    if (input.status !== undefined) {
      throw new FinanceServiceError('Apenas a gestão pode alterar o status do reembolso.', 403);
    }
  }

  const data: Record<string, unknown> = {};

  if (typeof input.title === 'string' && input.title.trim()) {
    data.title = input.title.trim().slice(0, 240);
  }
  if (input.description !== undefined) {
    data.description = input.description?.trim() || null;
  }
  if (input.category && (FINANCE_CATEGORIES as readonly string[]).includes(input.category)) {
    data.category = input.category;
  }
  if (isManager && input.fundSource && (FINANCE_FUNDS as readonly string[]).includes(input.fundSource)) {
    data.fundSource = input.fundSource;
  }
  if (input.team && (FINANCE_TEAMS as readonly string[]).includes(input.team)) {
    data.team = input.team;
  }
  if (input.amountCents !== undefined) {
    const amountCents = Math.round(Number(input.amountCents));
    if (!Number.isFinite(amountCents) || amountCents < 0 || amountCents > 100_000_000) {
      throw new FinanceServiceError('Valor inválido.', 400);
    }
    data.amountCents = amountCents;
  }
  if (input.occurredAt !== undefined) {
    data.occurredAt =
      input.occurredAt && /^\d{4}-\d{2}-\d{2}$/.test(input.occurredAt)
        ? new Date(`${input.occurredAt}T12:00:00Z`)
        : null;
  }
  if (input.pixKey !== undefined) {
    data.pixKey = input.pixKey?.trim() || null;
  }
  if (input.pixKeyType !== undefined) {
    data.pixKeyType = input.pixKeyType?.trim() || null;
  }
  if (isManager && input.reviewNotes !== undefined) {
    data.reviewNotes = input.reviewNotes?.trim() || null;
  }

  if (isManager && input.status) {
    data.status = input.status;
    data.reviewedById = actor.id;
    data.reviewedAt = new Date();
    if (input.status === 'PAGO') {
      data.paidAt = existing.paidAt ?? new Date();
      if (!existing.occurredAt && input.occurredAt === undefined) {
        data.occurredAt = new Date();
      }
    } else if (existing.status === 'PAGO') {
      data.paidAt = null;
    }
  }

  // Se o membro atualizou sua chave PIX em uma solicitação sua, salvar também no perfil dele
  if (typeof input.pixKey === 'string' && input.pixKey.trim() && existing.requesterId === actor.id) {
    await prisma.member.update({
      where: { id: actor.id },
      data: {
        pixKey: input.pixKey.trim(),
        ...(input.pixKeyType ? { pixKeyType: input.pixKeyType.trim() } : {}),
      },
    });
  }

  if (isManager && input.removeAttachmentId) {
    await prisma.financialAttachment.deleteMany({
      where: { id: input.removeAttachmentId, entryId: id },
    });
  }

  if (input.addAttachments?.length) {
    await prisma.financialAttachment.createMany({
      data: input.addAttachments.map(att => ({
        entryId: id,
        name: att.name.slice(0, 180),
        url: att.url,
        mimeType: att.mimeType ?? null,
        kind: att.kind ?? 'RECEIPT',
      })),
    });
  }

  const updated = await prisma.financialEntry.update({
    where: { id },
    data,
    include: entryInclude,
  });

  return serializeEntry(updated);
}

export async function deleteFinancialEntry(actor: SafeUser, id: string): Promise<void> {
  if (!hasManagementAccess(actor.role)) {
    throw new FinanceServiceError('Apenas a gestão pode excluir lançamentos financeiros.', 403);
  }

  const existing = await prisma.financialEntry.findUnique({ where: { id }, select: { id: true } });
  if (!existing) {
    throw new FinanceServiceError('Lançamento financeiro não encontrado.', 404);
  }

  await prisma.financialEntry.delete({ where: { id } });
}

export async function updateMemberPixKey(
  memberId: string,
  pixKey: string,
  pixKeyType?: string | null
): Promise<{ pixKey: string | null; pixKeyType: string | null }> {
  const normalized = pixKey.trim() || null;
  const updated = await prisma.member.update({
    where: { id: memberId },
    data: {
      pixKey: normalized,
      pixKeyType: pixKeyType?.trim() || null,
    },
    select: { pixKey: true, pixKeyType: true },
  });
  return updated;
}
