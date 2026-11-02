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
    name: details?.name || '', area: details?.area || '', email: details?.email || '',
    phone: details?.phone || '', dre: details?.dre || '', birthDate: details?.birthDate?.toISOString().slice(0, 10) || '',
    course: details?.course || '', academicPeriod: details?.academicPeriod || '',
    emergencyContactName: details?.emergencyContactName || '', emergencyContactPhone: details?.emergencyContactPhone || '',
    accountEmail: member?.user?.email || '',
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
  const { userId, ...stored } = data;
  await db.member.findUniqueOrThrow({ where: { id }, select: { id: true } });
  try {
    return await prisma.$transaction(async tx => {
      let memberId: number | null = null;
      if (userId) {
        const user = await tx.user.findUnique({ where: { id: userId } });
        const current = await tx.memberDetails.findUnique({ where: { institutionalMemberId: id }, include: { member: true } });
        if (!user || (user.status !== 'APPROVED' && current?.member?.userId !== user.id)) throw new Error('Selecione uma conta aprovada.');
        const existing = await tx.member.findUnique({ where: { userId } });
        memberId = existing?.id ?? (await ensureAttendanceEnrollment(tx, user)).id;
      }
      // Link the existing attendance identity; never move, reset or merge its history.
      return tx.memberDetails.upsert({
        where: { institutionalMemberId: id },
        create: { institutionalMemberId: id, memberId, ...stored },
        update: { memberId, ...stored },
      });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') throw new Error('Este CPF, DRE ou esta conta já está vinculado a outro integrante.');
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034') throw new Error('Outra alteração ocorreu ao mesmo tempo. Atualize a página e tente novamente.');
    throw error;
  }
}
