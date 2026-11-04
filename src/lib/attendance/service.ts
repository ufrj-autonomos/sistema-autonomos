import { resolveMemberAreas } from '@/lib/member-fields';
import { timingSafeEqual } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { hasManagementAccess } from '@/lib/access-policy';
import { prisma } from '@/lib/prisma';
import { localDateTime, weekKey, weekRange } from './time';
import { memberSummary, reportSummary, visitDto } from './summary';
import type { AttendanceReport, ScanResult } from './types';
import { GOAL_LABELS } from './format';
import { db as institutionalDb } from '@/lib/institutional/db';

export class AttendanceError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}

export function selectedWeek(value: string | null | undefined, now = new Date()) {
  const key = value || weekKey(now);
  try {
    weekRange(key);
    if (key > weekKey(now) || key < '2020-01-01') throw new Error();
  } catch { throw new AttendanceError('Selecione uma semana válida, de segunda a domingo, até a semana atual.'); }
  return key;
}

export async function attendanceReport(key = weekKey(), memberId?: string, now = new Date()): Promise<AttendanceReport> {
  const range = weekRange(selectedWeek(key, now));
  const settings = await prisma.attendanceSettings.findUnique({ where: { id: 'lab' } });
  if (!settings) throw new AttendanceError('O controle de presença ainda não foi configurado.', 503);
  const members = await prisma.member.findMany({
    where: memberId ? { id: memberId } : { attendancePeriods: { some: {} } },
    include: {
      attendanceJustifications: { where: { status: 'APPROVED', weekStartsOn: { lte: new Date(`${range.key}T00:00:00Z`) } }, select: { weekStartsOn: true } },
      attendancePeriods: { orderBy: { startsOn: 'asc' } },
      attendanceVisits: { where: { checkedInAt: { lt: range.end } }, orderBy: { checkedInAt: 'desc' } },
    },
    orderBy: { name: 'asc' },
  });
  const ids = members.flatMap(member => typeof member.institutionalMemberId === 'number' ? [member.institutionalMemberId] : []);
  const identities = ids.length && process.env.INSTITUTIONAL_DATABASE_URL
    ? await institutionalDb.institutionalMember.findMany({ where: { id: { in: ids } }, select: { id: true, name: true, area: true } })
    : [];
  const byId = new Map(identities.map(member => [member.id, member]));
  const summaries = members.map(member => {
    const identity = member.institutionalMemberId ? byId.get(member.institutionalMemberId) : undefined;
    return memberSummary(
      { id: member.id, name: identity?.name || member.name, area: resolveMemberAreas(identity?.area, member.area).internal || 'Não informada', email: member.email || null },
      member.attendancePeriods,
      member.attendanceVisits,
      range.key,
      now,
      settings.maxSessionSeconds,
      member.attendanceJustifications || []
    );
  }).filter(member => memberId || member.requiredSeconds > 0 || member.visits.length > 0);
  return {
    serverNow: now.toISOString(), week: { key: range.key, sunday: range.sunday, start: range.start.toISOString(), end: range.end.toISOString(), isCurrent: range.key === weekKey(now), isClosed: range.end <= now },
    members: summaries, summary: reportSummary(summaries), trackingStartedAt: settings.startedAt.toISOString(),
  };
}

export async function registerAttendance(memberId: string, input: unknown): Promise<ScanResult> {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new AttendanceError('Registro inválido. Leia novamente o QR code.');
  const { code, requestId } = input as Record<string, unknown>;
  if (Object.keys(input).some(key => !['code', 'requestId'].includes(key)) || typeof code !== 'string' || !/^[a-f0-9]{64}$/.test(code) || typeof requestId !== 'string' || !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(requestId)) throw new AttendanceError('Registro inválido. Leia novamente o QR code.');
  const settings = await prisma.attendanceSettings.findUnique({ where: { id: 'lab' } });
  if (!settings || !timingSafeEqual(Buffer.from(code), Buffer.from(settings.qrCode))) throw new AttendanceError('Este QR code não é válido. Use o QR code do laboratório.', 403);
  try {
    return await prisma.$transaction(async tx => {
      const member = await tx.member.findUnique({ where: { id: memberId } });
      if (!member || member.status !== 'APPROVED') throw new AttendanceError('Seu cadastro não está habilitado para presença. Procure a gestão.', 403);
      // Serialize all scans/corrections for this member, including concurrent devices.
      await tx.$queryRaw`SELECT id FROM "Member" WHERE id = ${member.id} FOR UPDATE`;
      const duplicate = await tx.attendancePunch.findUnique({ where: { requestId }, include: { visit: true } });
      if (duplicate) {
        if (duplicate.memberId !== member.id) throw new AttendanceError('Registro inválido.', 409);
        return { action: duplicate.type, registeredAt: duplicate.registeredAt.toISOString(), duplicate: true, visit: visitDto(duplicate.visit) };
      }
      const [clock] = await tx.$queryRaw<Array<{ now: Date }>>`SELECT NOW() AS now`;
      const now = clock.now;
      const today = new Date(`${weekKey(now)}T00:00:00Z`);
      const period = await tx.attendancePeriod.findFirst({ where: { memberId: member.id, startsOn: { lte: today }, OR: [{ endsOn: null }, { endsOn: { gt: today } }] } });
      if (!period) throw new AttendanceError('Você não está em um período ativo de acompanhamento. Procure a gestão.', 403);
      const last = await tx.attendancePunch.findFirst({ where: { memberId: member.id }, orderBy: { registeredAt: 'desc' }, include: { visit: true } });
      if (last && now.getTime() - last.registeredAt.getTime() < 60_000) {
        return { action: last.type, registeredAt: last.registeredAt.toISOString(), duplicate: true, visit: visitDto(last.visit, now, settings.maxSessionSeconds) };
      }
      const open = await tx.attendanceVisit.findFirst({ where: { memberId: member.id, status: 'OPEN' } });
      const action = open ? 'OUT' : 'IN';
      const visit = open
        ? await tx.attendanceVisit.update({ where: { id: open.id }, data: { checkedOutAt: now, status: now.getTime() - open.checkedInAt.getTime() > settings.maxSessionSeconds * 1000 ? 'REVIEW' : 'CLOSED' } })
        : await tx.attendanceVisit.create({ data: { memberId: member.id, checkedInAt: now } });
      await tx.attendancePunch.create({ data: { requestId, memberId: member.id, visitId: visit.id, type: action, registeredAt: now } });
      return { action, registeredAt: now.toISOString(), duplicate: false, visit: visitDto(visit, now, settings.maxSessionSeconds) };
    }, { maxWait: 10000, timeout: 15000 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && ['P2002', 'P2034'].includes(error.code)) throw new AttendanceError('Outra leitura ocorreu ao mesmo tempo. Tente novamente.', 409);
    throw error;
  }
}

function snapshot(visit: { checkedInAt: Date; checkedOutAt: Date | null; status: string; source: string }) {
  return { checkedInAt: visit.checkedInAt.toISOString(), checkedOutAt: visit.checkedOutAt?.toISOString() || null, status: visit.status, source: visit.source };
}

export async function manageAttendanceVisit(actorId: string, input: unknown) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new AttendanceError('Dados inválidos.');
  const data = input as Record<string, unknown>;
  if (Object.keys(data).some(key => !['action', 'memberId', 'visitId', 'checkedInAt', 'checkedOutAt', 'reason'].includes(key))) throw new AttendanceError('Dados inválidos.');
  if (!['CREATE', 'CORRECT', 'VOID'].includes(String(data.action)) || typeof data.reason !== 'string' || data.reason.trim().length < 10 || data.reason.length > 1000) throw new AttendanceError('Informe a ação e uma justificativa com pelo menos 10 caracteres.');
  const creating = data.action === 'CREATE';
  const validMemberId = typeof data.memberId === 'string' ? data.memberId.trim().length > 0 : Number.isSafeInteger(data.memberId);
  if (creating ? !validMemberId : typeof data.visitId !== 'string') throw new AttendanceError('Selecione um membro ou registro válido.');
  let start: Date | undefined; let end: Date | undefined;
  if (data.action !== 'VOID') {
    try { start = localDateTime(data.checkedInAt); end = localDateTime(data.checkedOutAt); } catch { throw new AttendanceError('Informe entrada e saída válidas no horário de Brasília.'); }
    if (end <= start || end > new Date() || end.getTime() - start.getTime() > 24 * 60 * 60_000) throw new AttendanceError('A saída deve ser posterior à entrada, sem horário futuro, com duração de até 24 horas.');
  }
  return prisma.$transaction(async tx => {
    const actor = await tx.member.findUnique({ where: { id: actorId } });
    if (!actor || !hasManagementAccess(actor.role) || actor.status !== 'APPROVED') throw new AttendanceError('Acesso exclusivo para Gestão e Admin.', 403);
    let existing = !creating ? await tx.attendanceVisit.findUnique({ where: { id: data.visitId as string } }) : null;
    if (!creating && !existing) throw new AttendanceError('Registro não encontrado.', 404);
    const memberId = existing?.memberId || String(data.memberId);
    const member = await tx.member.findUnique({ where: { id: memberId } });
    if (!member) throw new AttendanceError('Membro não encontrado.', 404);
    await tx.$queryRaw`SELECT id FROM "Member" WHERE id = ${memberId} FOR UPDATE`;
    if (existing) existing = await tx.attendanceVisit.findUniqueOrThrow({ where: { id: existing.id } });
    if (data.action !== 'VOID') {
      const overlap = await tx.attendanceVisit.findFirst({ where: { memberId, id: existing ? { not: existing.id } : undefined, status: { not: 'VOID' }, checkedInAt: { lt: end }, OR: [{ checkedOutAt: null }, { checkedOutAt: { gt: start } }] } });
      if (overlap) throw new AttendanceError('O período se sobrepõe a outro registro. Corrija ou desconsidere o registro conflitante primeiro.', 409);
    }
    const visit = creating
      ? await tx.attendanceVisit.create({ data: { memberId, checkedInAt: start!, checkedOutAt: end!, status: 'CLOSED', source: 'MANUAL' } })
      : await tx.attendanceVisit.update({ where: { id: existing!.id }, data: data.action === 'VOID' ? { status: 'VOID' } : { checkedInAt: start, checkedOutAt: end, status: 'CLOSED' } });
    await tx.attendanceAudit.create({ data: { memberId, visitId: visit.id, actorId, action: String(data.action), reason: (data.reason as string).trim(), before: existing ? snapshot(existing) : Prisma.JsonNull, after: snapshot(visit) } });
    return visitDto(visit);
  }, { timeout: 15000, maxWait: 10000 });
}

export function attendanceCsv(report: AttendanceReport) {
  const escape = (value: unknown) => {
    let text = String(value ?? '');
    if (/^\s*[=+\-@]|^[\t\r\n]/.test(text)) text = `'${text}`;
    return `"${text.replaceAll('"', '""')}"`;
  };
  const rows = [['Nome', 'Email', 'Área', 'Meta (h)', 'Horas validadas', 'Horas por justificativa', 'Horas restantes', 'Situação', 'Semanas abaixo da meta', 'Registros para revisão'],
    ...report.members.map(member => [member.name, member.email || '', member.area, (member.requiredSeconds / 3600).toFixed(4).replace('.', ','), (member.completedSeconds / 3600).toFixed(4).replace('.', ','), ((member.justifiedSeconds || 0) / 3600).toFixed(4).replace('.', ','), (member.remainingSeconds / 3600).toFixed(4).replace('.', ','), GOAL_LABELS[member.status], String(member.missedWeeks), String(member.pendingReviews)])];
  return '\uFEFF' + rows.map(row => row.map(escape).join(';')).join('\r\n');
}
