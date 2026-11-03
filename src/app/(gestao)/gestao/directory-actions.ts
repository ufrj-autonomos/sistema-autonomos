'use server';
import { revalidatePath } from 'next/cache';
import { requirePageUser } from '@/lib/session';
import { savePrivateDetails } from '@/lib/directory';
import { directoryPath } from '@/lib/institutional/routes';
import { memberPreferences } from '@/lib/member-directory';
import { prisma } from '@/lib/prisma';

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
