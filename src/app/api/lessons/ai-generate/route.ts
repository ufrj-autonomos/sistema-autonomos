import { NextRequest, NextResponse } from 'next/server';
import { authorizeApi } from '@/lib/session';
import { hasEffectiveRole } from '@/lib/access-policy';
import { traceApi } from '@/lib/activity/server';
import { generateLessonContentWithAi } from '@/lib/courses/ai-lesson';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  return traceApi(req, 'POST /api/lessons/ai-generate', async () => {
    const access = await authorizeApi(req, false);
    if (access.error) return access.error;

    if (!hasEffectiveRole(access.user, ['COORDINATOR', 'MANAGEMENT', 'ADMIN'])) {
      return NextResponse.json(
        { error: 'Apenas coordenação, gestão ou administração pode gerar conteúdo com IA.' },
        { status: 403 }
      );
    }

    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Dados inválidos.' }, { status: 400 });
    }

    const title = typeof body.title === 'string' ? body.title.trim() : '';
    const youtubeUrl = typeof body.youtubeUrl === 'string' ? body.youtubeUrl.trim() : '';
    const courseTitle = typeof body.courseTitle === 'string' ? body.courseTitle.trim() : '';
    const area = typeof body.area === 'string' ? body.area.trim() : '';

    if (!title && !youtubeUrl) {
      return NextResponse.json(
        { error: 'Informe o título da aula ou o link do vídeo do YouTube para gerar com IA.' },
        { status: 400 }
      );
    }

    try {
      const draft = await generateLessonContentWithAi({
        title,
        youtubeUrl,
        courseTitle,
        area,
      });
      return NextResponse.json(draft);
    } catch (error) {
      console.error('Erro ao gerar conteúdo da aula com IA:', error);
      return NextResponse.json(
        { error: 'Não foi possível gerar o conteúdo da aula com IA.' },
        { status: 500 }
      );
    }
  });
}
