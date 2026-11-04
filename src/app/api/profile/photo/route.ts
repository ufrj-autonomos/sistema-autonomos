import { traceApi } from '@/lib/activity/server';
import { randomUUID } from 'node:crypto';
import sharp from 'sharp';
import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { authorizeApi } from '@/lib/session';

export async function POST(req: NextRequest) {
  return traceApi(req, "POST /api/profile/photo", async () => {
  try {
    const access = await authorizeApi(req, false);
    if (access.error) return access.error;

    const formData = await req.formData();
    const file = formData.get('file');
    if (!(file instanceof File) || !file.type.startsWith('image/') || file.size < 1 || file.size > 4 * 1024 * 1024) {
      return NextResponse.json({ error: 'Envie uma imagem de até 4 MB.' }, { status: 400 });
    }

    const url = process.env.INSTITUTIONAL_SUPABASE_URL;
    const key = process.env.INSTITUTIONAL_SUPABASE_SECRET_KEY;
    if (!url || !key) {
      return NextResponse.json({ error: 'O armazenamento de imagens não foi configurado.' }, { status: 503 });
    }

    const buffer = await sharp(Buffer.from(await file.arrayBuffer()), { limitInputPixels: 40000000 })
      .rotate()
      .resize({ width: 1024, height: 1024, fit: 'cover', withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer();

    const storage = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    }).storage.from('galery-autonomos');

    const path = `uploads/members/${access.user.id}-${randomUUID()}.webp`;
    const { error } = await storage.upload(path, buffer, { contentType: 'image/webp', upsert: false });
    if (error) {
      return NextResponse.json({ error: 'Não foi possível enviar a foto no momento.' }, { status: 503 });
    }

    return NextResponse.json({
      success: true,
      url: storage.getPublicUrl(path).data.publicUrl,
    });
  } catch (error) {
    console.error('Erro em POST /api/profile/photo:', error);
    return NextResponse.json({ error: 'Falha ao enviar a foto de perfil.' }, { status: 500 });
  }

  });
}

