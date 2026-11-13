import { randomUUID } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { authorizeApi } from '@/lib/session';
import { traceApi } from '@/lib/activity/server';
import { activityTarget } from '@/lib/activity/context';

const MAX_RECEIPT_BYTES = 10 * 1024 * 1024; // 10 MB

const ALLOWED_EXTENSIONS = new Map<string, string>([
  ['pdf', 'application/pdf'],
  ['jpg', 'image/jpeg'],
  ['jpeg', 'image/jpeg'],
  ['png', 'image/png'],
  ['webp', 'image/webp'],
  ['heic', 'image/heic'],
  ['heif', 'image/heif'],
]);

export async function POST(req: NextRequest) {
  return traceApi(req, 'POST /api/financeiro/upload', async () => {
    const access = await authorizeApi(req, false);
    if (access.error) return access.error;

    try {
      if (Number(req.headers.get('content-length') || 0) > MAX_RECEIPT_BYTES + 65536) {
        return NextResponse.json(
          { error: 'O comprovante deve ter no máximo 10 MB.' },
          { status: 413 }
        );
      }

      const formData = await req.formData();
      const file = formData.get('file');
      if (!(file instanceof File) || file.size < 1 || file.size > MAX_RECEIPT_BYTES) {
        return NextResponse.json(
          { error: 'Envie um arquivo PDF ou imagem válido de até 10 MB.' },
          { status: 400 }
        );
      }

      const originalName = file.name || 'comprovante.pdf';
      const ext = originalName.split('.').pop()?.toLowerCase() || '';
      const mimeType =
        (file.type && (file.type.startsWith('image/') || file.type === 'application/pdf')
          ? file.type
          : ALLOWED_EXTENSIONS.get(ext)) || null;

      if (!mimeType) {
        return NextResponse.json(
          { error: 'Formato não suportado. Envie JPG, PNG, WebP, HEIC ou PDF.' },
          { status: 400 }
        );
      }

      const supabaseUrl = process.env.INSTITUTIONAL_SUPABASE_URL;
      const supabaseKey = process.env.INSTITUTIONAL_SUPABASE_SECRET_KEY;
      if (!supabaseUrl || !supabaseKey) {
        return NextResponse.json(
          { error: 'Armazenamento de comprovantes não configurado no servidor.' },
          { status: 503 }
        );
      }

      const safeExt = ALLOWED_EXTENSIONS.has(ext)
        ? ext
        : mimeType === 'application/pdf'
        ? 'pdf'
        : 'jpg';
      const path = `uploads/finance/member-${access.user.id}/${Date.now()}-${randomUUID()}.${safeExt}`;

      const buffer = Buffer.from(await file.arrayBuffer());
      const storage = createClient(supabaseUrl, supabaseKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      }).storage.from('galery-autonomos');

      const { error } = await storage.upload(path, buffer, {
        contentType: mimeType,
        upsert: false,
      });

      if (error) {
        console.error('Erro no upload Supabase Financeiro:', error);
        return NextResponse.json(
          { error: 'Não foi possível salvar o comprovante. Tente novamente.' },
          { status: 503 }
        );
      }

      const publicUrl = storage.getPublicUrl(path).data.publicUrl;
      activityTarget('/reembolsos', 'financial-upload');

      return NextResponse.json({
        success: true,
        url: publicUrl,
        name: originalName,
        mimeType,
      });
    } catch (error) {
      console.error('Erro no upload de comprovante:', error);
      return NextResponse.json(
        { error: 'Erro interno ao enviar comprovante.' },
        { status: 500 }
      );
    }
  });
}
