import { prisma } from '@/lib/prisma';
import { hasManagementAccess } from '@/lib/access-policy';
import type { SafeUser } from '@/lib/session';
import {
  FEEDBACK_CATEGORY_META,
  FEEDBACK_PRIORITY_META,
  FEEDBACK_SCOPE_META,
  FEEDBACK_STATUS_META,
  FEEDBACK_VALIDITY_META,
  type FeedbackCategoryValue,
  type FeedbackDashboardData,
  type FeedbackItemDTO,
  type FeedbackPriorityValue,
  type FeedbackScopeValue,
  type FeedbackStatusValue,
  type FeedbackSummary,
  type FeedbackValidityValue,
} from './constants';

export * from './constants';

export class FeedbackServiceError extends Error {
  constructor(
    message: string,
    public status: number = 400
  ) {
    super(message);
  }
}

export function computeFeedbackSummary(
  items: Array<
    Pick<FeedbackItemDTO, 'scope' | 'category' | 'status' | 'validity'>
  >
): FeedbackSummary {
  let pendingTriageCount = 0;
  let openBugsCount = 0;
  let validAcceptedCount = 0;
  let appliedCount = 0;

  const scopeStats = new Map<
    FeedbackScopeValue,
    { count: number; appliedCount: number }
  >(
    (['SISTEMA', 'SITE', 'LABORATORIO', 'EQUIPE'] as FeedbackScopeValue[]).map(s => [
      s,
      { count: 0, appliedCount: 0 },
    ])
  );

  for (const item of items) {
    if (item.status === 'RECEBIDA' || item.validity === 'PENDENTE') {
      pendingTriageCount += 1;
    }
    if (
      item.category === 'BUG' &&
      item.status !== 'APLICADA' &&
      item.status !== 'ARQUIVADA'
    ) {
      openBugsCount += 1;
    }
    if (
      (item.validity === 'VALIDA' || item.validity === 'PARCIALMENTE_VALIDA') &&
      item.status !== 'APLICADA' &&
      item.status !== 'ARQUIVADA'
    ) {
      validAcceptedCount += 1;
    }
    if (item.status === 'APLICADA') {
      appliedCount += 1;
    }

    const bucket = scopeStats.get(item.scope);
    if (bucket) {
      bucket.count += 1;
      if (item.status === 'APLICADA') bucket.appliedCount += 1;
    }
  }

  return {
    totalCount: items.length,
    pendingTriageCount,
    openBugsCount,
    validAcceptedCount,
    appliedCount,
    byScope: (['SISTEMA', 'SITE', 'LABORATORIO', 'EQUIPE'] as FeedbackScopeValue[]).map(
      scope => {
        const stats = scopeStats.get(scope)!;
        return {
          scope,
          label: FEEDBACK_SCOPE_META[scope].shortLabel,
          count: stats.count,
          appliedCount: stats.appliedCount,
        };
      }
    ),
  };
}

function serializeFeedbackItem(
  row: {
    id: string;
    code: string;
    scope: string;
    category: string;
    title: string;
    description: string;
    pageOrLocation: string | null;
    stepsToReproduce: string | null;
    expectedOutcome: string | null;
    attachmentUrl: string | null;
    attachmentName: string | null;
    isAnonymous: boolean;
    authorId: string | null;
    authorName: string;
    status: string;
    validity: string;
    priority: string;
    assignedArea: string | null;
    assignedToId: string | null;
    assignedTo: { name: string } | null;
    responseNotes: string | null;
    appliedAt: Date | null;
    reviewedBy: { name: string } | null;
    reviewedAt: Date | null;
    votes: Array<{ memberId: string }>;
    createdAt: Date;
    updatedAt: Date;
  },
  viewerId: string
): FeedbackItemDTO {
  const isMine = row.authorId === viewerId;
  const authorDisplayName = row.isAnonymous
    ? isMine
      ? 'Você (envio anônimo)'
      : 'Integrante anônimo'
    : row.authorName;

  return {
    id: row.id,
    code: row.code,
    scope: row.scope as FeedbackScopeValue,
    category: row.category as FeedbackCategoryValue,
    title: row.title,
    description: row.description,
    pageOrLocation: row.pageOrLocation,
    stepsToReproduce: row.stepsToReproduce,
    expectedOutcome: row.expectedOutcome,
    attachmentUrl: row.attachmentUrl,
    attachmentName: row.attachmentName,
    isAnonymous: row.isAnonymous,
    isMine,
    authorDisplayName,
    status: row.status as FeedbackStatusValue,
    validity: row.validity as FeedbackValidityValue,
    priority: row.priority as FeedbackPriorityValue,
    assignedArea: row.assignedArea,
    assignedToId: row.assignedToId,
    assignedToName: row.assignedTo?.name || null,
    responseNotes: row.responseNotes,
    appliedAt: row.appliedAt ? row.appliedAt.toISOString() : null,
    reviewedByName: row.reviewedBy?.name || null,
    reviewedAt: row.reviewedAt ? row.reviewedAt.toISOString() : null,
    voteCount: row.votes.length,
    viewerHasVoted: row.votes.some(v => v.memberId === viewerId),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function getFeedbackDashboardData(
  actor: SafeUser,
  viewScope: 'member' | 'management'
): Promise<FeedbackDashboardData> {
  if (viewScope === 'management' && !hasManagementAccess(actor.role)) {
    throw new FeedbackServiceError('Acesso restrito à gestão/coordenação.', 403);
  }

  const [rows, members] = await Promise.all([
    prisma.feedbackItem.findMany({
      include: {
        assignedTo: { select: { name: true } },
        reviewedBy: { select: { name: true } },
        votes: { select: { memberId: true } },
      },
      orderBy: [{ createdAt: 'desc' }],
    }),
    viewScope === 'management'
      ? prisma.member.findMany({
          where: { active: true, status: 'APPROVED' },
          select: { id: true, name: true, area: true },
          orderBy: { name: 'asc' },
        })
      : Promise.resolve(undefined),
  ]);

  const items = rows.map(row => serializeFeedbackItem(row, actor.id));
  return {
    items,
    summary: computeFeedbackSummary(items),
    ...(members ? { members } : {}),
  };
}

async function generateNextFeedbackCode(): Promise<string> {
  const rows = await prisma.feedbackItem.findMany({ select: { code: true } });
  let max = 0;
  for (const r of rows) {
    const match = r.code.match(/^FB-(\d+)$/i);
    if (match) {
      const n = Number(match[1]);
      if (Number.isFinite(n) && n > max) max = n;
    }
  }
  return `FB-${String(max + 1).padStart(3, '0')}`;
}

export interface FeedbackCreateInput {
  scope?: FeedbackScopeValue;
  category?: FeedbackCategoryValue;
  title?: string;
  description?: string;
  pageOrLocation?: string | null;
  stepsToReproduce?: string | null;
  expectedOutcome?: string | null;
  attachmentUrl?: string | null;
  attachmentName?: string | null;
  isAnonymous?: boolean;
}

export async function createFeedbackItem(actor: SafeUser, input: FeedbackCreateInput) {
  const scope = (input.scope || 'SISTEMA') as FeedbackScopeValue;
  if (!(scope in FEEDBACK_SCOPE_META)) {
    throw new FeedbackServiceError('Alvo inválido. Escolha Sistema, Site, Laboratório ou Equipe.');
  }

  const category = (input.category || 'IDEIA') as FeedbackCategoryValue;
  if (!(category in FEEDBACK_CATEGORY_META)) {
    throw new FeedbackServiceError('Tipo de reporte inválido.');
  }

  const title = (input.title || '').trim();
  const description = (input.description || '').trim();
  if (!title || title.length < 3) {
    throw new FeedbackServiceError('Informe um título curto e claro (mín. 3 caracteres).');
  }
  if (!description || description.length < 8) {
    throw new FeedbackServiceError('Descreva o problema, melhoria ou ideia com mais detalhes.');
  }

  const code = await generateNextFeedbackCode();
  const created = await prisma.feedbackItem.create({
    data: {
      code,
      scope,
      category,
      title,
      description,
      pageOrLocation: input.pageOrLocation?.trim() || null,
      stepsToReproduce: input.stepsToReproduce?.trim() || null,
      expectedOutcome: input.expectedOutcome?.trim() || null,
      attachmentUrl: input.attachmentUrl?.trim() || null,
      attachmentName: input.attachmentName?.trim() || null,
      isAnonymous: Boolean(input.isAnonymous),
      authorId: actor.id,
      authorName: actor.name,
      votes: {
        create: {
          memberId: actor.id,
        },
      },
    },
    include: {
      assignedTo: { select: { name: true } },
      reviewedBy: { select: { name: true } },
      votes: { select: { memberId: true } },
    },
  });

  return serializeFeedbackItem(created, actor.id);
}

export async function toggleFeedbackVote(actor: SafeUser, feedbackId: string) {
  const item = await prisma.feedbackItem.findUnique({ where: { id: feedbackId } });
  if (!item) {
    throw new FeedbackServiceError('Registro não encontrado.', 404);
  }

  const existing = await prisma.feedbackVote.findUnique({
    where: {
      feedbackId_memberId: {
        feedbackId,
        memberId: actor.id,
      },
    },
  });

  if (existing) {
    await prisma.feedbackVote.delete({ where: { id: existing.id } });
  } else {
    await prisma.feedbackVote.create({
      data: {
        feedbackId,
        memberId: actor.id,
      },
    });
  }

  const updatedVotes = await prisma.feedbackVote.count({ where: { feedbackId } });
  return { voted: !existing, voteCount: updatedVotes };
}

export interface FeedbackReviewInput {
  status?: FeedbackStatusValue;
  validity?: FeedbackValidityValue;
  priority?: FeedbackPriorityValue;
  assignedArea?: string | null;
  assignedToId?: string | null;
  responseNotes?: string | null;
}

export async function reviewFeedbackItem(
  actor: SafeUser,
  id: string,
  input: FeedbackReviewInput
) {
  if (!hasManagementAccess(actor.role)) {
    throw new FeedbackServiceError('Acesso restrito à gestão/coordenação.', 403);
  }

  const existing = await prisma.feedbackItem.findUnique({ where: { id } });
  if (!existing) {
    throw new FeedbackServiceError('Item não encontrado.', 404);
  }

  const nextStatus = (input.status || existing.status) as FeedbackStatusValue;
  if (!(nextStatus in FEEDBACK_STATUS_META)) {
    throw new FeedbackServiceError('Status de triagem inválido.');
  }

  let nextValidity = (input.validity || existing.validity) as FeedbackValidityValue;
  if (!(nextValidity in FEEDBACK_VALIDITY_META)) {
    throw new FeedbackServiceError('Avaliação de validade inválida.');
  }

  // If marked APLICADA or APROVADA/EM_ANDAMENTO without explicit validity override and validity was still PENDENTE, auto-promote to VALIDA.
  if (
    input.validity === undefined &&
    existing.validity === 'PENDENTE' &&
    ['APROVADA', 'EM_ANDAMENTO', 'APLICADA'].includes(nextStatus)
  ) {
    nextValidity = 'VALIDA';
  }

  const nextPriority = (input.priority || existing.priority) as FeedbackPriorityValue;
  if (!(nextPriority in FEEDBACK_PRIORITY_META)) {
    throw new FeedbackServiceError('Prioridade inválida.');
  }

  let nextAppliedAt = existing.appliedAt;
  if (nextStatus === 'APLICADA' && !existing.appliedAt) {
    nextAppliedAt = new Date();
  } else if (nextStatus !== 'APLICADA' && input.status !== undefined) {
    nextAppliedAt = null;
  }

  const updated = await prisma.feedbackItem.update({
    where: { id },
    data: {
      status: nextStatus,
      validity: nextValidity,
      priority: nextPriority,
      assignedArea:
        input.assignedArea !== undefined
          ? input.assignedArea?.trim() || null
          : existing.assignedArea,
      assignedToId:
        input.assignedToId !== undefined
          ? input.assignedToId?.trim() || null
          : existing.assignedToId,
      responseNotes:
        input.responseNotes !== undefined
          ? input.responseNotes?.trim() || null
          : existing.responseNotes,
      appliedAt: nextAppliedAt,
      reviewedById: actor.id,
      reviewedAt: new Date(),
    },
    include: {
      assignedTo: { select: { name: true } },
      reviewedBy: { select: { name: true } },
      votes: { select: { memberId: true } },
    },
  });

  return serializeFeedbackItem(updated, actor.id);
}

export async function deleteFeedbackItem(actor: SafeUser, id: string) {
  const existing = await prisma.feedbackItem.findUnique({ where: { id } });
  if (!existing) {
    throw new FeedbackServiceError('Registro não encontrado.', 404);
  }

  const isManager = hasManagementAccess(actor.role);
  const isOwnerPending = existing.authorId === actor.id && existing.status === 'RECEBIDA';
  if (!isManager && !isOwnerPending) {
    throw new FeedbackServiceError(
      'Você só pode excluir registros seus enquanto ainda estão aguardando triagem.',
      403
    );
  }

  await prisma.feedbackItem.delete({ where: { id } });
  return { id, code: existing.code };
}
