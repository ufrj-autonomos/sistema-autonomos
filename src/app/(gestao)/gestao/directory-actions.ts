'use server';
import { revalidatePath } from 'next/cache';
import { requirePageUser } from '@/lib/session';
import { savePrivateDetails } from '@/lib/directory';
import { updateRecord } from './site/actions';
import { directoryPath } from '@/lib/institutional/routes';
import { memberPreferences } from '@/lib/member-directory';
import { prisma } from '@/lib/prisma';

export async function updateMemberQuickField(id: number, field: string, value: unknown) {
  await requirePageUser(true);
  try {
    if (!Number.isSafeInteger(id) || id < 1) throw new Error('Integrante inválido.');
    const allowedFields = ['active', 'showOnSite', 'isFemale', 'role', 'area', 'teamId'];
    if (!allowedFields.includes(field)) throw new Error('Campo não permitido para edição rápida.');

    const result = await updateRecord('member', id, { [field]: value });
    if (!result.success) throw new Error(result.error || 'Erro ao atualizar campo.');
    return { success: true as const, warning: result.warning };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : 'Não foi possível atualizar o campo.',
    };
  }
}

export async function saveDirectoryDetails(table: 'member' | 'project', id: number, input: unknown) {
  await requirePageUser(true);
  try {
    if (!['member', 'project'].includes(table)) throw new Error('Cadastro inválido.');
    await savePrivateDetails(table, id, input);
    revalidatePath(directoryPath(table), 'layout');
    revalidatePath(`${directoryPath(table)}/${id}`);
    revalidatePath('/gestao/presenca');
    return { success: true as const };
  } catch (error) {
    return { success: false as const, error: error instanceof Error && !('code' in error) ? error.message : 'Não foi possível salvar os dados internos. Tente novamente.' };
  }
}

export async function saveMemberPreferences(input: unknown) {
  const user = await requirePageUser(true);
  try {
    const preferences = memberPreferences(input);
    await prisma.member.update({ where: { id: user.id }, data: { memberDirectoryPreferences: preferences } });
    return { success: true as const };
  } catch {
    return { success: false as const, error: 'Não foi possível salvar sua visualização. Tente novamente.' };
  }
}
