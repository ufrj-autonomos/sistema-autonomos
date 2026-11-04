import { traceApi } from '@/lib/activity/server';
import { authorizeApi } from '@/lib/session';
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
