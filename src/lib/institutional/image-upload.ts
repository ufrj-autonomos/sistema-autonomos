import { randomUUID } from 'node:crypto';
import sharp from 'sharp';
import { createClient } from '@supabase/supabase-js';
export class ImageUploadError extends Error { constructor(message: string, public status: number) { super(message); } }
export const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
export async function prepareInstitutionalImage(file: unknown, profile: boolean) {
  if (!(file instanceof File) || !file.type.startsWith('image/') || file.size < 1 || file.size > MAX_IMAGE_BYTES) throw new ImageUploadError('Envie uma imagem de até 4 MB.', 400);
  try {
    const image = sharp(Buffer.from(await file.arrayBuffer()), { limitInputPixels: 40000000 }).rotate();
    if (profile) {
      const metadata = await image.metadata();
      const side = Math.min(1024, metadata.width || 1024, metadata.height || 1024);
      return await image.resize({ width: side, height: side, fit: 'cover' }).webp({ quality: 82 }).toBuffer();
    }
    return await image.resize({ width: 2560, height: 2560, fit: 'inside', withoutEnlargement: true }).webp({ quality: 80 }).toBuffer();
  } catch { throw new ImageUploadError('Não foi possível ler a imagem. Tente um arquivo JPG, PNG ou WebP válido.', 400); }
}
export async function storeInstitutionalImage(file: unknown, options: { folder: 'members' | 'projects' | 'content'; profile?: boolean; actorId: string }) {
  const url = process.env.INSTITUTIONAL_SUPABASE_URL;
  const key = process.env.INSTITUTIONAL_SUPABASE_SECRET_KEY;
  if (!url || !key) throw new ImageUploadError('O armazenamento de imagens não foi configurado.', 503);
  const buffer = await prepareInstitutionalImage(file, !!options.profile);
  const storage = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } }).storage.from('galery-autonomos');
  const path = `uploads/${options.folder}/${options.actorId}-${randomUUID()}.webp`;
  const { error } = await storage.upload(path, buffer, { contentType: 'image/webp', upsert: false });
  if (error) throw new ImageUploadError('Não foi possível enviar a imagem agora. Tente novamente.', 503);
  return storage.getPublicUrl(path).data.publicUrl;
}
