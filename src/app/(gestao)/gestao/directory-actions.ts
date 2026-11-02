'use server';
import { revalidatePath } from 'next/cache';
import { requirePageUser } from '@/lib/session';
import { savePrivateDetails } from '@/lib/directory';
import { directoryPath } from '@/lib/institutional/routes';

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
