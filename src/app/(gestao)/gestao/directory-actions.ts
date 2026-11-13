'use server';

import { traceServerAction } from '@/lib/activity/server';
import { activityTarget } from '@/lib/activity/context';
import { revalidatePath } from 'next/cache';
import { requirePageUser } from '@/lib/session';
import { savePrivateDetails } from '@/lib/directory';
import { updateRecord } from './site/actions';
import { directoryPath } from '@/lib/institutional/routes';
import { memberPreferences } from '@/lib/member-directory';
import { prisma } from '@/lib/prisma';

export async function updateMemberQuickField(id: number, field: string, value: unknown) {
  return traceServerAction("updateMemberQuickField", async () => {
  await requirePageUser(true);
  try {
    if (!Number.isSafeInteger(id) || id < 1) throw new Error('Integrante inválido.');
    const allowedFields = ['active', 'showOnSite', 'isFemale', 'role', 'area', 'teamId', 'course', 'joinedYear', 'leftYear'];
    if (!allowedFields.includes(field)) throw new Error('Campo não permitido para edição rápida.');
    activityTarget(`/gestao/integrantes/${id}`, field);

    const result = await updateRecord('member', id, { [field]: value });
    if (!result.success) throw new Error(result.error || 'Erro ao atualizar campo.');
    if (field === 'active' && value === true) {
      await prisma.member.updateMany({
        where: { institutionalMemberId: id },
        data: {
          active: true,
          inactivatedAt: null,
          inactivationReason: null,
        },
      });
    }
    revalidatePath('/gestao/integrantes');
    revalidatePath('/gestao/ex-membros');
    revalidatePath('/gestao/site/membros');
    return { success: true as const, warning: result.warning };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : 'Não foi possível atualizar o campo.',
    };
  }

  });
}

export async function saveDirectoryDetails(table: 'member' | 'project', id: number, input: unknown) {
  return traceServerAction("saveDirectoryDetails", async () => {
  await requirePageUser(true);
  try {
    if (!['member', 'project'].includes(table)) throw new Error('Cadastro inválido.');
    activityTarget(`${directoryPath(table)}/${id}`);
    await savePrivateDetails(table, id, input);
    revalidatePath(directoryPath(table), 'layout');
    revalidatePath(`${directoryPath(table)}/${id}`);
    revalidatePath('/gestao/presenca');
    return { success: true as const };
  } catch (error) {
    return { success: false as const, error: error instanceof Error && !('code' in error) ? error.message : 'Não foi possível salvar os dados internos. Tente novamente.' };
  }

  });
}

export async function saveMemberPreferences(input: unknown) {
  return traceServerAction("saveMemberPreferences", async () => {
  const user = await requirePageUser(true);
  try {
    const preferences = memberPreferences(input);
    activityTarget('/gestao/integrantes', 'columns');
    await prisma.member.update({ where: { id: user.id }, data: { memberDirectoryPreferences: preferences } });
    return { success: true as const };
  } catch {
    return { success: false as const, error: 'Não foi possível salvar sua visualização. Tente novamente.' };
  }

  });
}

export async function inactivateMember(
  id: number,
  input: { inactivatedAt?: string; inactivationReason: string }
) {
  return traceServerAction("inactivateMember", async () => {
    await requirePageUser(true);
    try {
      if (!Number.isSafeInteger(id) || id < 1) throw new Error('Integrante inválido.');
      if (!input || !input.inactivationReason?.trim()) {
        throw new Error('Informe o motivo da inativação.');
      }

      const date = input.inactivatedAt ? new Date(`${input.inactivatedAt}T12:00:00Z`) : new Date();
      const year = String(date.getFullYear());
      const reason = input.inactivationReason.trim();

      activityTarget(`/gestao/integrantes/${id}`, 'inactivate');

      // 1. Atualizar banco institucional: active: false, leftYear: year
      const result = await updateRecord('member', id, {
        active: false,
        leftYear: year,
      });
      if (!result.success) throw new Error(result.error || 'Erro ao inativar integrante.');

      // 2. Atualizar prisma.member: active: false, inactivatedAt: date, inactivationReason: reason
      await prisma.member.updateMany({
        where: { institutionalMemberId: id },
        data: {
          active: false,
          inactivatedAt: date,
          inactivationReason: reason,
        },
      });

      revalidatePath('/gestao/integrantes');
      revalidatePath('/gestao/ex-membros');
      revalidatePath('/gestao/site/membros');
      return { success: true as const, warning: result.warning };
    } catch (error) {
      return {
        success: false as const,
        error: error instanceof Error ? error.message : 'Não foi possível inativar o integrante.',
      };
    }
  });
}
