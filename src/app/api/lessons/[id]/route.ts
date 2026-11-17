import { traceApi } from '@/lib/activity/server';
import { activityTarget } from '@/lib/activity/context';
import { authorizeApi } from '@/lib/session';
import { hasEffectiveRole } from '@/lib/access-policy';
import { extractYoutubeVideoId } from '@/lib/areas/service';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return traceApi(_req, "GET /api/lessons/[id]", async () => {
  try {
    const access = await authorizeApi(_req, false);
    if (access.error) return access.error;
    const { id } = await context.params;

    if (!id) {
      return NextResponse.json(
        { error: 'O identificador da aula é obrigatório.' },
        { status: 400 }
      );
    }

    const numId = Number(id);

    // Suporta busca tanto por ID interno (CUID/UUID), slug ou orderIndex numérico
    const lesson = await prisma.lesson.findFirst({
      where: {
        OR: [
          { id: id },
          { slug: id },
          ...(!isNaN(numId) && numId > 0 ? [{ orderIndex: numId }] : []),
        ],
      },
      include: {
        exercises: {
          orderBy: { orderIndex: 'asc' },
        },
        module: {
          select: {
            id: true,
            title: true,
            orderIndex: true,
            course: {
              select: {
                id: true,
                slug: true,
                title: true,
              },
            },
          },
        },
      },
    });

    if (!lesson) {
      return NextResponse.json(
        { error: 'Aula não encontrada.' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        lesson: {
          id: lesson.id,
          orderIndex: lesson.orderIndex,
          title: lesson.title,
          slug: lesson.slug,
          type: (lesson.lessonType || 'VIDEO').toLowerCase() as 'video' | 'text',
          lessonType: lesson.lessonType,
          videoStatus: (lesson.videoStatus || 'PENDING').toLowerCase() as 'available' | 'pending' | 'text_only',
          youtubeVideoId: lesson.youtubeVideoId,
          durationSeconds: lesson.videoDurationSeconds,
          videoDurationSeconds: lesson.videoDurationSeconds,
          content: lesson.textContent,
          textContent: lesson.textContent,
          summary: lesson.summary,
          rosDocsUrl: lesson.rosDocsUrl,
          codeZipPath: lesson.codeZipPath,
          exercises: lesson.exercises,
          module: lesson.module,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Erro ao consultar aula (/api/lessons/[id]):', error);
    return NextResponse.json(
      { error: 'Erro interno ao consultar detalhes da aula.' },
      { status: 500 }
    );
  }

  });
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return traceApi(req, 'PATCH /api/lessons/[id]', async () => {
    try {
      const access = await authorizeApi(req, false);
      if (access.error) return access.error;

      if (!hasEffectiveRole(access.user, ['COORDINATOR', 'MANAGEMENT', 'ADMIN'])) {
        return NextResponse.json(
          { error: 'Apenas coordenação, gestão ou administração pode editar aulas.' },
          { status: 403 }
        );
      }

      const { id } = await context.params;
      const numId = Number(id);
      const existing = await prisma.lesson.findFirst({
        where: {
          OR: [
            { id },
            { slug: id },
            ...(!isNaN(numId) && numId > 0 ? [{ orderIndex: numId }] : []),
          ],
        },
      });

      if (!existing) {
        return NextResponse.json({ error: 'Aula não encontrada.' }, { status: 404 });
      }

      const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
      if (!body || typeof body !== 'object') {
        return NextResponse.json({ error: 'Dados inválidos.' }, { status: 400 });
      }

      const title =
        typeof body.title === 'string' && body.title.trim().length >= 2
          ? body.title.trim().slice(0, 200)
          : existing.title;
      const lessonType =
        body.lessonType === 'TEXT' || body.lessonType === 'VIDEO'
          ? body.lessonType
          : existing.lessonType;

      let youtubeVideoId = existing.youtubeVideoId;
      if ('youtubeUrl' in body || 'youtubeVideoId' in body) {
        const rawVideo =
          typeof body.youtubeUrl === 'string'
            ? body.youtubeUrl.trim()
            : typeof body.youtubeVideoId === 'string'
              ? body.youtubeVideoId.trim()
              : '';
        if (!rawVideo) {
          youtubeVideoId = null;
        } else {
          const parsedId = extractYoutubeVideoId(rawVideo);
          if (!parsedId) {
            return NextResponse.json(
              { error: 'URL ou ID do YouTube inválido.' },
              { status: 400 }
            );
          }
          youtubeVideoId = parsedId;
        }
      }

      const videoStatus =
        lessonType === 'TEXT'
          ? 'TEXT_ONLY'
          : youtubeVideoId
            ? 'AVAILABLE'
            : 'PENDING';

      const summary =
        typeof body.summary === 'string' ? body.summary.trim() || null : existing.summary;
      const textContent =
        typeof body.textContent === 'string'
          ? body.textContent
          : typeof body.content === 'string'
            ? body.content
            : existing.textContent;
      const rosDocsUrl =
        typeof body.rosDocsUrl === 'string'
          ? body.rosDocsUrl.trim() || null
          : existing.rosDocsUrl;
      const videoDurationSeconds =
        typeof body.videoDurationSeconds === 'number' && Number.isFinite(body.videoDurationSeconds)
          ? Math.max(0, Math.round(body.videoDurationSeconds))
          : existing.videoDurationSeconds;

      const updated = await prisma.lesson.update({
        where: { id: existing.id },
        data: {
          title,
          lessonType,
          youtubeVideoId: lessonType === 'TEXT' ? null : youtubeVideoId,
          videoStatus,
          summary,
          textContent,
          rosDocsUrl,
          videoDurationSeconds,
        },
      });

      activityTarget('/ensino', updated.slug);
      return NextResponse.json({ success: true, lesson: updated });
    } catch (error) {
      console.error('Erro ao atualizar aula (/api/lessons/[id]):', error);
      return NextResponse.json({ error: 'Erro interno ao atualizar aula.' }, { status: 500 });
    }
  });
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return traceApi(req, 'DELETE /api/lessons/[id]', async () => {
    try {
      const access = await authorizeApi(req, false);
      if (access.error) return access.error;

      if (!hasEffectiveRole(access.user, ['COORDINATOR', 'MANAGEMENT', 'ADMIN'])) {
        return NextResponse.json(
          { error: 'Apenas coordenação, gestão ou administração pode remover aulas.' },
          { status: 403 }
        );
      }

      const { id } = await context.params;
      const existing = await prisma.lesson.findFirst({
        where: { OR: [{ id }, { slug: id }] },
      });
      if (!existing) {
        return NextResponse.json({ error: 'Aula não encontrada.' }, { status: 404 });
      }

      await prisma.lesson.delete({ where: { id: existing.id } });
      activityTarget('/ensino', existing.slug);
      return NextResponse.json({ success: true });
    } catch (error) {
      console.error('Erro ao remover aula (/api/lessons/[id]):', error);
      return NextResponse.json({ error: 'Erro interno ao remover aula.' }, { status: 500 });
    }
  });
}
