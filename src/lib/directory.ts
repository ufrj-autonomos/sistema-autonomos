import { Prisma } from '@prisma/client';
import { prisma } from './prisma';
import { db } from './institutional/db';
import { privateData } from './directory-validation';
import { ensureAttendanceEnrollment } from './attendance/enrollment';
import { memberSummary } from './attendance/summary';
import { weekKey } from './attendance/time';

export async function memberPrivateDetails(institutionalMemberId: number) {
  const details = await prisma.memberDetails.findUnique({
    where: { institutionalMemberId },
    include: { member: { include: { user: { select: { id: true, email: true } }, attendancePeriods: true, attendanceVisits: true } } },
  });
  const member = details?.member;
  return {
    cpf: details?.cpf || '', notes: details?.notes || '', userId: member?.userId || '',
    attendance: member ? memberSummary({ id: member.id, name: member.name, area: member.area, email: member.user?.email || null }, member.attendancePeriods, member.attendanceVisits, weekKey()) : null,
  };
}

export async function savePrivateDetails(table: 'member' | 'project', id: number, input: unknown) {
  if (!Number.isSafeInteger(id) || id < 1) throw new Error('Cadastro inválido.');
  const data = privateData(input, table === 'member');
  if (table === 'project') {
    await db.project.findUniqueOrThrow({ where: { id }, select: { id: true } });
    return prisma.projectDetails.upsert({ where: { institutionalProjectId: id }, create: { institutionalProjectId: id, notes: data.notes }, update: { notes: data.notes } });
  }
  if (!('cpf' in data)) throw new Error('Dados do integrante inválidos.');
  await db.member.findUniqueOrThrow({ where: { id }, select: { id: true } });
  try {
    return await prisma.$transaction(async tx => {
      let memberId: number | null = null;
      if (data.userId) {
        const user = await tx.user.findUnique({ where: { id: data.userId } });
        const current = await tx.memberDetails.findUnique({ where: { institutionalMemberId: id }, include: { member: true } });
        if (!user || (user.status !== 'APPROVED' && current?.member?.userId !== user.id)) throw new Error('Selecione uma conta aprovada.');
        memberId = user.status === 'APPROVED' ? (await ensureAttendanceEnrollment(tx, user)).id : current!.memberId;
      }
      // Link the existing attendance identity; never move, reset or merge its history.
      return tx.memberDetails.upsert({
        where: { institutionalMemberId: id },
        create: { institutionalMemberId: id, memberId, cpf: data.cpf, notes: data.notes },
        update: { memberId, cpf: data.cpf, notes: data.notes },
      });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') throw new Error('Este CPF ou esta conta já está vinculado a outro integrante.');
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034') throw new Error('Outra alteração ocorreu ao mesmo tempo. Atualize a página e tente novamente.');
    throw error;
  }
}
