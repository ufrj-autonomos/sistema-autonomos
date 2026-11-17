import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { hasEffectiveRole, hasManagementAccess } from '@/lib/access-policy';
import { AttendanceError, selectedWeek } from './service';
import { JUSTIFICATION_REASONS, type JustificationList } from './justification-fields';
import { dateKey, localDateTime } from './time';
import { createNotification } from '@/lib/notifications';

const EVENT_TAG_RE = /\[EVENTO:\s*(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2})-(\d{2}:\d{2})\]/;

function inputObject(input: unknown, fields: string[]) {
  if (!input || typeof input !== 'object' || Array.isArray(input) || Object.keys(input).some(key => !fields.includes(key))) throw new AttendanceError('Dados da solicitação inválidos.');
  return input as Record<string, unknown>;
}
export function justificationInput(input: unknown, now = new Date()) {
  const data = inputObject(input, ['week', 'reason', 'details', 'eventDate', 'startTime', 'endTime']);
  if (typeof data.week !== 'string' || typeof data.reason !== 'string' || !JUSTIFICATION_REASONS.some(reason => reason.value === data.reason)) throw new AttendanceError('Selecione a semana e o motivo da justificativa.');
  const week = selectedWeek(data.week, now);
  if (typeof data.details !== 'string' || data.details.trim().length < 10 || data.details.length > 3000) throw new AttendanceError('Descreva o pedido com 10 a 3.000 caracteres.');
  let details = data.details.trim();
  if (data.reason === 'EVENT_HOURS') {
    const eventDate = typeof data.eventDate === 'string' ? data.eventDate.trim() : '';
    const startTime = typeof data.startTime === 'string' ? data.startTime.trim() : '';
    const endTime = typeof data.endTime === 'string' ? data.endTime.trim() : '';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(eventDate) || !/^\d{2}:\d{2}$/.test(startTime) || !/^\d{2}:\d{2}$/.test(endTime)) {
      throw new AttendanceError('Informe a data e os horários de início e fim do evento.');
    }
    const start = localDateTime(`${eventDate}T${startTime}`);
    const end = localDateTime(`${eventDate}T${endTime}`);
    if (end <= start || end > now || end.getTime() - start.getTime() > 24 * 60 * 60_000) {
      throw new AttendanceError('O horário do evento deve ter início anterior ao fim, sem data futura e com duração máxima de 24h.');
    }
    const tag = `[EVENTO: ${eventDate} ${startTime}-${endTime}]`;
    if (!EVENT_TAG_RE.test(details)) {
      details = `${tag}\n${details}`.slice(0, 3000);
    }
  }
  return { weekStartsOn: new Date(`${week}T00:00:00Z`), reason: data.reason, details };
}
export function justificationDecision(input: unknown) {
  const data = inputObject(input, ['id', 'status', 'note']);
  if (typeof data.id !== 'string' || !/^[a-z0-9_-]{1,64}$/i.test(data.id) || !['APPROVED', 'REJECTED'].includes(String(data.status)) || (data.note !== undefined && (typeof data.note !== 'string' || data.note.length > 1000))) throw new AttendanceError('Selecione a solicitação e uma decisão válida. A observação pode ter até 1.000 caracteres.');
  return { id: data.id, status: data.status as 'APPROVED' | 'REJECTED', reviewNote: typeof data.note === 'string' ? data.note.trim() || null : null };
}
export async function submitJustification(memberId: string, input: unknown) {
  const data = justificationInput(input);
  try {
    return await prisma.$transaction(async tx => {
      await tx.$queryRaw`SELECT id FROM "Member" WHERE id = ${memberId} FOR UPDATE`;
      const member = await tx.member.findUnique({ where: { id: memberId } });
      if (!member || member.status !== 'APPROVED') throw new AttendanceError('Sua conta não está habilitada para solicitar uma justificativa.', 403);
      const period = await tx.attendancePeriod.findFirst({ where: { memberId, startsOn: { lte: data.weekStartsOn }, OR: [{ endsOn: null }, { endsOn: { gt: data.weekStartsOn } }] } });
      if (!period) throw new AttendanceError('Escolha uma semana em que você estava no acompanhamento de presença.');
      const existing = await tx.attendanceJustification.findFirst({ where: { memberId, weekStartsOn: data.weekStartsOn, status: { in: ['PENDING', 'APPROVED'] } } });
      if (existing) throw new AttendanceError(existing.status === 'APPROVED' ? 'Esta semana já tem uma justificativa aprovada.' : 'Você já tem uma solicitação aguardando análise para esta semana.', 409);
      return tx.attendanceJustification.create({ data: { ...data, memberId } });
    }, { timeout: 15000, maxWait: 10000 });
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') throw new AttendanceError('Já existe uma solicitação pendente ou aprovada para esta semana.', 409);
    throw error;
  }
}
export async function reviewJustification(actorId: string, input: unknown) {
  const data = justificationDecision(input);
  const updated = await prisma.$transaction(async tx => {
    const actor = await tx.member.findUnique({ where: { id: actorId } });
    if (!actor || actor.status !== 'APPROVED' || !hasManagementAccess(actor)) throw new AttendanceError('Acesso exclusivo para Gestão e Admin.', 403);
    const request = await tx.attendanceJustification.findUnique({ where: { id: data.id } });
    if (!request) throw new AttendanceError('Solicitação não encontrada.', 404);
    if (request.memberId === actorId && !hasEffectiveRole(actor, 'ADMIN')) throw new AttendanceError('Outra pessoa da Gestão deve analisar a sua solicitação.', 403);
    await tx.$queryRaw`SELECT id FROM "Member" WHERE id = ${request.memberId} FOR UPDATE`;
    const current = await tx.attendanceJustification.findUnique({ where: { id: data.id } });
    if (!current) throw new AttendanceError('Solicitação não encontrada.', 404);
    if (current.status !== 'PENDING') throw new AttendanceError('Esta solicitação já foi analisada. Atualize a lista.', 409);
    if (data.status === 'APPROVED' && current.reason === 'EVENT_HOURS') {
      const match = EVENT_TAG_RE.exec(current.details);
      if (match) {
        const [, eventDate, startTime, endTime] = match;
        const start = localDateTime(`${eventDate}T${startTime}`);
        const end = localDateTime(`${eventDate}T${endTime}`);
        if (end > start && end <= new Date()) {
          const overlap = await tx.attendanceVisit.findFirst({
            where: {
              memberId: current.memberId,
              status: { not: 'VOID' },
              checkedInAt: { lt: end },
              OR: [{ checkedOutAt: null }, { checkedOutAt: { gt: start } }],
            },
          });
          if (!overlap) {
            const visit = await tx.attendanceVisit.create({
              data: {
                memberId: current.memberId,
                checkedInAt: start,
                checkedOutAt: end,
                status: 'CLOSED',
                source: 'MANUAL',
              },
            });
            await tx.attendanceAudit.create({
              data: {
                memberId: current.memberId,
                visitId: visit.id,
                actorId,
                action: 'CREATE',
                reason: `Horas de evento aprovadas via justificativa (${eventDate} ${startTime}-${endTime})`,
                before: Prisma.JsonNull,
                after: {
                  checkedInAt: visit.checkedInAt.toISOString(),
                  checkedOutAt: visit.checkedOutAt?.toISOString() || null,
                  status: visit.status,
                  source: visit.source,
                },
              },
            });
          }
        }
      }
    }
    return tx.attendanceJustification.update({ where: { id: current.id }, data: { status: data.status, reviewNote: data.reviewNote, reviewedById: actorId, reviewerName: actor.name, reviewedAt: new Date() } });
  }, { timeout: 15000, maxWait: 10000 });

  await createNotification({
    recipientId: updated.memberId,
    category: 'ATTENDANCE_JUSTIFICATION',
    title:
      updated.status === 'APPROVED'
        ? 'Justificativa de presença aprovada'
        : 'Justificativa de presença recusada',
    message: updated.reviewNote
      ? `Semana de ${dateKey(updated.weekStartsOn)} — Observação: ${updated.reviewNote}`
      : `Sua justificativa para a semana de ${dateKey(updated.weekStartsOn)} foi ${updated.status === 'APPROVED' ? 'aprovada' : 'recusada'}.`,
    link: '/presenca',
    actorName: updated.reviewerName ?? 'Gestão',
    metadata: { justificationId: updated.id, status: updated.status },
  });

  return updated;
}
export async function listJustifications(params: URLSearchParams, memberId?: string): Promise<JustificationList> {
  const status = params.get('status') || (memberId ? 'ALL' : 'PENDING');
  const cursor = params.get('cursor') || undefined;
  if (!['PENDING', 'APPROVED', 'REJECTED', 'ALL'].includes(status) || (cursor && !/^[a-z0-9_-]{1,64}$/i.test(cursor))) throw new AttendanceError('Filtros inválidos.');
  const where = { ...(memberId ? { memberId } : {}), ...(status === 'ALL' ? {} : { status }) };
  const [rows, total, pending] = await Promise.all([
    prisma.attendanceJustification.findMany({ where, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: 51, ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}), select: { id: true, weekStartsOn: true, reason: true, details: true, status: true, createdAt: true, reviewedAt: true, reviewerName: true, reviewNote: true, member: { select: { id: true, name: true, email: true } } } }),
    prisma.attendanceJustification.count({ where }),
    prisma.attendanceJustification.count({ where: { ...(memberId ? { memberId } : {}), status: 'PENDING' } }),
  ]);
  const items = rows.slice(0, 50).map(({ weekStartsOn, createdAt, reviewedAt, ...row }) => ({ ...row, week: dateKey(weekStartsOn), createdAt: createdAt.toISOString(), reviewedAt: reviewedAt?.toISOString() || null }));
  return { items, total, pending, nextCursor: rows.length > 50 ? items.at(-1)!.id : null };
}
