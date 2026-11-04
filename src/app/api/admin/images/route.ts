import { NextRequest, NextResponse } from 'next/server';
import { authorizeApi } from '@/lib/session';
import { traceApi } from '@/lib/activity/server';
import { activityTarget } from '@/lib/activity/context';
import { storeInstitutionalImage, ImageUploadError, MAX_IMAGE_BYTES } from '@/lib/institutional/image-upload';
export async function POST(req: NextRequest) {
  return traceApi(req, 'POST /api/admin/images', async () => {
    try {
      const access = await authorizeApi(req, true);
      if (access.error) return access.error;
      if (Number(req.headers.get('content-length') || 0) > MAX_IMAGE_BYTES + 65536) return NextResponse.json({ error: 'Envie uma imagem de até 4 MB.' }, { status: 413 });
      const formData = await req.formData();
      const project = formData.get('kind') === 'project';
      activityTarget(project ? '/gestao/projetos' : '/gestao/site', 'image');
      const url = await storeInstitutionalImage(formData.get('file'), { folder: project ? 'projects' : 'content', actorId: access.user.id });
      return NextResponse.json({ success: true, url });
    } catch (error) { return NextResponse.json({ error: error instanceof ImageUploadError ? error.message : 'Não foi possível enviar a imagem. Tente novamente.' }, { status: error instanceof ImageUploadError ? error.status : 500 }); }
  });
}
