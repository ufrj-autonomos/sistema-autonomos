'use server';
import { randomUUID } from 'node:crypto';
import sharp from 'sharp';
import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';
import { requirePageUser } from '@/lib/session';
import { getInstitutionalModel, recordData, institutionalFailure, InstitutionalError } from '@/lib/institutional/records';
import { publishInstitutionalSite } from '@/lib/institutional/publish';

async function changed(table: string) {
  revalidatePath('/gestao/site', 'layout');
  revalidatePath(`/gestao/site/${table.toLowerCase()}`);
  return { success: true, warning: await publishInstitutionalSite() };
}
export async function createRecord(table: string, data: unknown): Promise<{ success: boolean; error?: string; warning?: string }> {
  await requirePageUser(true);
  try { const { model } = getInstitutionalModel(table); await model.create({ data: recordData(table, data, true) }); return await changed(table); }
  catch (error) { return { success: false, error: institutionalFailure(error) }; }
}
export async function updateRecord(table: string, id: number, data: unknown): Promise<{ success: boolean; error?: string; warning?: string }> {
  await requirePageUser(true);
  try { if (!Number.isSafeInteger(id) || id < 1) throw new InstitutionalError('Registro inválido.'); const { model } = getInstitutionalModel(table); await model.update({ where: { id }, data: recordData(table, data, false) }); return await changed(table); }
  catch (error) { return { success: false, error: institutionalFailure(error) }; }
}
export async function deleteRecord(table: string, id: number): Promise<{ success: boolean; error?: string; warning?: string }> {
  await requirePageUser(true);
  try { if (!Number.isSafeInteger(id) || id < 1) throw new InstitutionalError('Registro inválido.'); const { model } = getInstitutionalModel(table); await model.delete({ where: { id } }); return await changed(table); }
  catch (error) { return { success: false, error: institutionalFailure(error) }; }
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
