import { traceApi } from '@/lib/activity/server';
import { NextRequest, NextResponse } from 'next/server';
import { authorizeApi } from '@/lib/session';
import { storeInstitutionalImage, ImageUploadError, MAX_IMAGE_BYTES } from '@/lib/institutional/image-upload';
export async function POST(req: NextRequest) {
  return traceApi(req, 'POST /api/profile/photo', async () => {
    try {
      const access = await authorizeApi(req);
      if (access.error) return access.error;
      if (Number(req.headers.get('content-length') || 0) > MAX_IMAGE_BYTES + 65536) return NextResponse.json({ error: 'Envie uma imagem de até 4 MB.' }, { status: 413 });
      const formData = await req.formData();
      const url = await storeInstitutionalImage(formData.get('file'), { folder: 'members', profile: true, actorId: access.user.id });
      return NextResponse.json({ success: true, url });
    } catch (error) { return NextResponse.json({ error: error instanceof ImageUploadError ? error.message : 'Falha ao enviar a foto de perfil.' }, { status: error instanceof ImageUploadError ? error.status : 500 }); }
  });
}
