import { ensureAttendanceEnrollment, closeAttendanceEnrollment } from './attendance/enrollment';
import { AccountStatus, Prisma, Role } from '@prisma/client';
import { prisma } from './prisma';
import { ACCOUNT_STATUSES, ROLES, hasManagementAccess } from './access-policy';
import { safeUserSelect } from './session';
import { db as institutionalDb } from './institutional/db';
import { sendAccountApprovedEmail } from './email';

export class AccountUpdateError extends Error {
  constructor(message: string, public status: number) { super(message); }
}

export async function updateAccount(actorId: string, targetId: string, input: unknown) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new AccountUpdateError('Dados inválidos.', 400);
  const data = input as Record<string, unknown>;
  if (Object.keys(data).some(key => !['role', 'status'].includes(key)) || !Object.keys(data).length) {
    throw new AccountUpdateError('Informe apenas perfil e/ou situação da conta.', 400);
  }
  if (data.role !== undefined && !ROLES.includes(data.role as Role)) throw new AccountUpdateError('Perfil inválido.', 400);
  if (data.status !== undefined && !ACCOUNT_STATUSES.includes(data.status as AccountStatus)) throw new AccountUpdateError('Situação inválida.', 400);

  let newlyApprovedEmail: { to: string; name: string } | null = null;
  let memberIdToProvisionInSite: { id: string; name: string; area: string | null; course: string | null } | null = null;

  // Serializable isolation prevents concurrent demotions from removing every administrator.
  try {
    const result = await prisma.$transaction(async tx => {
      const actor = await tx.member.findUnique({ where: { id: actorId } });
      if (!actor || !hasManagementAccess(actor.role) || actor.status !== 'APPROVED') throw new AccountUpdateError('Acesso exclusivo para Gestão e Admin aprovados.', 403);
      const target = await tx.member.findUnique({ where: { id: targetId } });
      if (!target) throw new AccountUpdateError('Conta não encontrada.', 404);
      if (actor.role !== 'ADMIN' && (Object.keys(data).length !== 1 || data.role !== undefined || target.status !== 'PENDING' || !['TRAINEE', 'MEMBER'].includes(target.role) || !['APPROVED', 'REJECTED'].includes(String(data.status)))) {
        throw new AccountUpdateError('Gestão pode apenas aceitar ou recusar cadastros pendentes de Trainee e Membro. Somente Admin altera cargos e situações.', 403);
      }
      const role = (data.role ?? target.role) as Role;
      const status = (data.status ?? target.status) as AccountStatus;
      if (target.role === 'ADMIN' && target.status === 'APPROVED' && (role !== 'ADMIN' || status !== 'APPROVED')) {
        const admins = await tx.member.count({ where: { role: 'ADMIN', status: 'APPROVED' } });
        if (admins <= 1) throw new AccountUpdateError('Mantenha pelo menos um administrador aprovado na plataforma.', 409);
      }
      if (status === 'REJECTED') {
        await closeAttendanceEnrollment(tx, targetId);
        // Foreign keys remove sessions, credentials and learning progress.
        await tx.member.delete({ where: { id: targetId } });
        return { deleted: true as const, userId: targetId, user: null };
      }
      const updated = await tx.member.update({ where: { id: targetId }, data: { role, status }, select: safeUserSelect });
      if (status !== 'APPROVED') {
        await closeAttendanceEnrollment(tx, targetId);
        await tx.session.deleteMany({ where: { memberId: targetId } });
      } else if (target.status !== 'APPROVED') {
        await ensureAttendanceEnrollment(tx, updated);
        if (target.email) {
          newlyApprovedEmail = { to: target.email, name: target.name };
        }
        if (!target.institutionalMemberId) {
          memberIdToProvisionInSite = {
            id: target.id,
            name: target.name,
            area: target.area ?? null,
            course: target.course ?? null,
          };
        }
      }
      return { deleted: false as const, userId: targetId, user: updated };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    if (memberIdToProvisionInSite && process.env.INSTITUTIONAL_DATABASE_URL) {
      const toCreate = memberIdToProvisionInSite as { id: string; name: string; area: string | null; course: string | null };
      try {
        const instMember = await institutionalDb.institutionalMember.create({
          data: {
            name: toCreate.name,
            role: 'Integrante',
            area: toCreate.area || 'Software',
            course: toCreate.course || null,
            active: true,
            showOnSite: false,
          },
        });
        const linked = await prisma.member.update({
          where: { id: toCreate.id },
          data: { institutionalMemberId: instMember.id },
          select: safeUserSelect,
        });
        if (!result.deleted && result.user) {
          result.user = linked;
        }
      } catch (err) {
        console.warn('Aviso: não foi possível criar registro no banco institucional após aprovação:', err);
      }
    }

    if (newlyApprovedEmail) {
      void sendAccountApprovedEmail(newlyApprovedEmail);
    }

    return result;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034') {
      throw new AccountUpdateError('Outra alteração ocorreu ao mesmo tempo. Atualize a lista e tente novamente.', 409);
    }
    throw error;
  }
}
