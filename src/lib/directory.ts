import { Prisma } from '@prisma/client';
import { prisma } from './prisma';
import { db } from './institutional/db';
import { privateData } from './directory-validation';
import { ensureAttendanceEnrollment } from './attendance/enrollment';
import { memberSummary } from './attendance/summary';
import { weekKey } from './attendance/time';
import { syncMemberAgeToInstitutional } from './birthdays';
import { publishInstitutionalSite } from './institutional/publish';

export async function memberPrivateDetails(institutionalMemberId: number) {
  const member = await prisma.member.findUnique({
    where: { institutionalMemberId },
    include: {
      attendancePeriods: true,
      attendanceVisits: true,
      profileChanges: {
        where: { status: 'PENDING' },
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
  });
  return {
    name: member?.name || '',
    area: member?.area || '',
    email: member?.email || '',
    phone: member?.phone || '',
    dre: member?.dre || '',
    birthDate: member?.birthDate?.toISOString().slice(0, 10) || '',
    course: member?.course || '',
    academicPeriod: member?.academicPeriod || '',
    emergencyContactName: member?.emergencyContactName || '',
    emergencyContactPhone: member?.emergencyContactPhone || '',
    accountEmail: member?.email || '',
    cpf: member?.cpf || '',
    notes: member?.notes || '',
    userId: member?.id || '',
    pendingChange: member?.profileChanges?.[0] || null,
    attendance: member
      ? memberSummary(
          { id: member.id, name: member.name, area: member.area || 'Não informada', email: member.email || null },
          member.attendancePeriods,
          member.attendanceVisits,
          weekKey()
        )
      : null,
  };
}

export async function savePrivateDetails(table: 'member' | 'project', id: number, input: unknown) {
  if (!Number.isSafeInteger(id) || id < 1) throw new Error('Cadastro inválido.');
  const data = privateData(input, table === 'member');
  if (table === 'project') {
    await db.project.findUniqueOrThrow({ where: { id }, select: { id: true } });
    return prisma.projectDetails.upsert({
      where: { institutionalProjectId: id },
      create: { institutionalProjectId: id, notes: data.notes },
      update: { notes: data.notes },
    });
  }
  if (!('cpf' in data)) throw new Error('Dados do integrante inválidos.');
  const { userId, area: rawArea, name: rawName, ...stored } = data;
  const instMember = await db.institutionalMember.findUniqueOrThrow({
    where: { id },
    select: { id: true, name: true, area: true, course: true },
  });

  try {
    const saved = await prisma.$transaction(async tx => {
      let current = await tx.member.findUnique({ where: { institutionalMemberId: id } });

      if (userId && userId !== current?.id) {
        const targetAccount = await tx.member.findUnique({ where: { id: userId } });
        if (!targetAccount || (targetAccount.status !== 'APPROVED' && current?.id !== targetAccount.id)) {
          throw new Error('Selecione uma conta aprovada.');
        }
        if (targetAccount.institutionalMemberId && targetAccount.institutionalMemberId !== id) {
          throw new Error('Este CPF, DRE ou esta conta já está vinculado a outro integrante.');
        }
        if (current) {
          await tx.member.update({ where: { id: current.id }, data: { institutionalMemberId: null } });
        }
        current = await tx.member.update({
          where: { id: targetAccount.id },
          data: {
            institutionalMemberId: id,
            ...stored,
            name: rawName || targetAccount.name || instMember.name,
            area: rawArea || targetAccount.area || instMember.area || 'Não informada',
          },
        });
        await ensureAttendanceEnrollment(tx, current);
        return current;
      }

      if (current) {
        return tx.member.update({
          where: { id: current.id },
          data: {
            ...stored,
            name: rawName || current.name || instMember.name,
            area: rawArea || current.area || instMember.area || 'Não informada',
          },
        });
      }

      const created = await tx.member.create({
        data: {
          institutionalMemberId: id,
          ...stored,
          name: rawName || instMember.name,
          area: rawArea || instMember.area || 'Não informada',
          course: stored.course !== undefined ? stored.course : instMember.course,
          role: 'MEMBER',
          status: 'APPROVED',
        },
      });
      await ensureAttendanceEnrollment(tx, created);
      return created;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    if ('birthDate' in stored) {
      const ageChanged = await syncMemberAgeToInstitutional(id, saved.birthDate);
      if (ageChanged) {
        await publishInstitutionalSite();
      }
    }

    return saved;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new Error('Este email, CPF, DRE ou esta conta já está vinculado a outro integrante.');
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034') {
      throw new Error('Outra alteração ocorreu ao mesmo tempo. Atualize a página e tente novamente.');
    }
    throw error;
  }
}
