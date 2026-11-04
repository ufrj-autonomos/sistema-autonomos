'use server';
import { randomUUID } from 'node:crypto';
import sharp from 'sharp';
import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';
import { requirePageUser } from '@/lib/session';
import { getInstitutionalModel, recordData, institutionalFailure, InstitutionalError } from '@/lib/institutional/records';
import { publishInstitutionalSite } from '@/lib/institutional/publish';
import { directoryPath } from '@/lib/institutional/routes';
import { memberRoleTranslations } from '@/lib/member-fields';
import { prisma } from '@/lib/prisma';

async function changed(table: string) {
  revalidatePath('/gestao/site', 'layout');
  revalidatePath(`/gestao/site/${table.toLowerCase()}`);
  revalidatePath(directoryPath(table), 'page');
  revalidatePath(`${directoryPath(table)}/[id]`, 'page');
  revalidatePath('/gestao');
  revalidatePath('/gestao/divisoes');
  revalidatePath('/gestao/presenca');
  return { success: true, warning: await publishInstitutionalSite() };
}
export async function createRecord(table: string, data: unknown): Promise<{ success: boolean; error?: string; warning?: string }> {
  await requirePageUser(true);
  try {
    const { model } = getInstitutionalModel(table);
    const parsed = recordData(table, data, true);
    if (['member', 'project'].includes(table) && !('showOnSite' in parsed)) parsed.showOnSite = false;
    if (table === 'member' && typeof parsed.role === 'string') Object.assign(parsed, memberRoleTranslations(parsed.role));
    const created = await model.create({ data: parsed });
    if (table === 'member' && created?.id) {
      await prisma.member.upsert({
        where: { institutionalMemberId: created.id },
        update: { name: created.name, area: created.area || null, course: created.course || null },
        create: {
          institutionalMemberId: created.id,
          name: created.name,
          area: created.area || null,
          course: created.course || null,
          role: 'MEMBER',
          status: 'APPROVED',
        },
      });
    }
    return await changed(table);
  } catch (error) { return { success: false, error: institutionalFailure(error) }; }
}
export async function updateRecord(table: string, id: number, data: unknown): Promise<{ success: boolean; error?: string; warning?: string }> {
  await requirePageUser(true);
  try {
    if (!Number.isSafeInteger(id) || id < 1) throw new InstitutionalError('Registro inválido.');
    const { model } = getInstitutionalModel(table);
    const parsed = recordData(table, data, false);
    if (table === 'member' && typeof parsed.role === 'string') {
      const previous = await model.findUnique({ where: { id } });
      const translations = memberRoleTranslations(parsed.role);
      if (previous && translations && parsed.role !== previous.role) {
        for (const key of ['roleEn', 'roleFr'] as const) {
          if (!(key in parsed) || parsed[key] === previous[key]) parsed[key] = translations[key];
        }
      }
    }
    const updated = await model.update({ where: { id }, data: parsed });
    if (table === 'member' && updated) {
      const syncData: Record<string, unknown> = {};
      if ('name' in parsed && typeof parsed.name === 'string') syncData.name = parsed.name;
      if ('area' in parsed && (typeof parsed.area === 'string' || parsed.area === null)) syncData.area = parsed.area;
      if ('course' in parsed && (typeof parsed.course === 'string' || parsed.course === null)) syncData.course = parsed.course;
      if (Object.keys(syncData).length > 0) {
        await prisma.member.updateMany({
          where: { institutionalMemberId: id },
          data: syncData,
        });
      }
    }
    return await changed(table);
  }
  catch (error) { return { success: false, error: institutionalFailure(error) }; }
}
export async function deleteRecord(table: string, id: number): Promise<{ success: boolean; error?: string; warning?: string }> {
  await requirePageUser(true);
  try {
    if (!Number.isSafeInteger(id) || id < 1) throw new InstitutionalError('Registro inválido.');
    const { model } = getInstitutionalModel(table);
    await model.delete({ where: { id } });
    if (table === 'member') {
      await prisma.member.updateMany({ where: { institutionalMemberId: id }, data: { institutionalMemberId: null } });
    }
    return await changed(table);
  } catch (error) { return { success: false, error: institutionalFailure(error) }; }
}
export async function uploadImageToSupabase(formData: FormData): Promise<{ success: boolean; url?: string; error?: string }> {
  await requirePageUser(true);
  try {
    const file = formData.get('file');
    if (!(file instanceof File) || !file.type.startsWith('image/') || file.size < 1 || file.size > 4 * 1024 * 1024) throw new InstitutionalError('Envie uma imagem de até 4 MB.');
    const url = process.env.INSTITUTIONAL_SUPABASE_URL; const key = process.env.INSTITUTIONAL_SUPABASE_SECRET_KEY;
    if (!url || !key) throw new InstitutionalError('O armazenamento institucional não foi configurado.');
    const buffer = await sharp(Buffer.from(await file.arrayBuffer()), { limitInputPixels: 40000000 }).rotate().resize({ width: 2560, height: 2560, fit: 'inside', withoutEnlargement: true }).webp({ quality: 80 }).toBuffer();
    const storage = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } }).storage.from('galery-autonomos');
    const path = `uploads/${randomUUID()}.webp`;
    const { error } = await storage.upload(path, buffer, { contentType: 'image/webp', upsert: false });
    if (error) throw new Error('Storage unavailable');
    return { success: true, url: storage.getPublicUrl(path).data.publicUrl };
  } catch (error) { return { success: false, error: institutionalFailure(error) }; }
}
