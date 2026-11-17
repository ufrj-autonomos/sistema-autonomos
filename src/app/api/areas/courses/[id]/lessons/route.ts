import { NextRequest, NextResponse } from 'next/server';
import { traceApi } from '@/lib/activity/server';
import { authorizeApi } from '@/lib/session';
import { addLessonToAreaCourse, deleteLessonFromAreaCourse } from '@/lib/areas/service';
import { areaHubErrorResponse } from '@/lib/areas/http';

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return traceApi(req, 'POST /api/areas/courses/[id]/lessons', async () => {
    const access = await authorizeApi(req, false);
    if (access.error) return access.error;

    let body: Record<string, unknown>;
    try {
      body = (await req.json()) as Record<string, unknown>;
    } catch {
      return NextResponse.json({ error: 'JSON inválido.' }, { status: 400 });
    }

    try {
      const { id } = await context.params;
      const lesson = await addLessonToAreaCourse(access.user, id, {
        moduleId: body?.moduleId,
        newModuleTitle: body?.newModuleTitle,
        title: body?.title,
        summary: body?.summary,
        textContent: body?.textContent,
        youtubeUrl: body?.youtubeUrl,
        rosDocsUrl: body?.rosDocsUrl,
      });
      return NextResponse.json({ success: true, lesson }, { status: 201 });
    } catch (error) {
      return areaHubErrorResponse(error, 'Erro ao adicionar aula ao curso.');
    }
  });
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return traceApi(req, 'DELETE /api/areas/courses/[id]/lessons', async () => {
    const access = await authorizeApi(req, false);
    if (access.error) return access.error;

    try {
      const { id } = await context.params;
      const lessonId = req.nextUrl.searchParams.get('lessonId') || '';
      await deleteLessonFromAreaCourse(access.user, id, lessonId);
      return NextResponse.json({ success: true });
    } catch (error) {
      return areaHubErrorResponse(error, 'Erro ao remover aula.');
    }
  });
}
