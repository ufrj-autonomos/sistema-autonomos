import { NextRequest, NextResponse } from 'next/server';
import { authorizeApi } from '@/lib/session';
import { hasEffectiveRole } from '@/lib/access-policy';
import { traceApi } from '@/lib/activity/server';
import { activityTarget } from '@/lib/activity/context';
import { prisma } from '@/lib/prisma';
import { extractYoutubeVideoId } from '@/lib/areas/service';

function slugifyLesson(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 60);
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return traceApi(req, 'PATCH /api/courses/[id]', async () => {
    try {
      const access = await authorizeApi(req, false);
      if (access.error) return access.error;

      if (!hasEffectiveRole(access.user, ['COORDINATOR', 'MANAGEMENT', 'ADMIN'])) {
        return NextResponse.json(
          { error: 'Apenas coordenação, gestão ou administração pode editar cursos.' },
          { status: 403 }
        );
      }

      const { id } = await context.params;
      const existing = await prisma.course.findFirst({
        where: { OR: [{ id }, { slug: id }] },
      });
      if (!existing) {
        return NextResponse.json({ error: 'Curso não encontrado.' }, { status: 404 });
      }

      const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
      if (!body || typeof body !== 'object') {
        return NextResponse.json({ error: 'Dados inválidos.' }, { status: 400 });
      }

      const title =
        typeof body.title === 'string' && body.title.trim().length >= 2
          ? body.title.trim().slice(0, 160)
          : existing.title;
      const subtitle =
        typeof body.subtitle === 'string' ? body.subtitle.trim() || null : existing.subtitle;
      const description =
        typeof body.description === 'string' && body.description.trim().length >= 2
          ? body.description.trim()
          : existing.description;
      const level =
        typeof body.level === 'string' && body.level.trim()
          ? body.level.trim()
          : existing.level;
      const durationHours =
        typeof body.durationHours === 'number' && Number.isFinite(body.durationHours)
          ? Math.max(0, body.durationHours)
          : existing.durationHours;
      const published =
        typeof body.published === 'boolean' ? body.published : existing.published;
      const externalUrl =
        typeof body.externalUrl === 'string'
          ? body.externalUrl.trim() || null
          : existing.externalUrl;

      const updated = await prisma.course.update({
        where: { id: existing.id },
        data: {
          title,
          subtitle,
          description,
          level,
          durationHours,
          published,
          externalUrl,
        },
      });

      activityTarget('/ensino', updated.slug);
      return NextResponse.json({ success: true, course: updated });
    } catch (error) {
      console.error('Erro ao atualizar curso:', error);
      return NextResponse.json({ error: 'Erro interno ao atualizar curso.' }, { status: 500 });
    }
  });
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return traceApi(req, 'POST /api/courses/[id]', async () => {
    try {
      const access = await authorizeApi(req, false);
      if (access.error) return access.error;

      if (!hasEffectiveRole(access.user, ['COORDINATOR', 'MANAGEMENT', 'ADMIN'])) {
        return NextResponse.json(
          { error: 'Apenas coordenação, gestão ou administração pode adicionar aulas.' },
          { status: 403 }
        );
      }

      const { id } = await context.params;
      const course = await prisma.course.findFirst({
        where: { OR: [{ id }, { slug: id }] },
        include: {
          modules: {
            orderBy: { orderIndex: 'asc' },
            include: { lessons: { select: { orderIndex: true } } },
          },
        },
      });
      if (!course) {
        return NextResponse.json({ error: 'Curso não encontrado.' }, { status: 404 });
      }

      const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
      if (!body || typeof body !== 'object') {
        return NextResponse.json({ error: 'Dados inválidos.' }, { status: 400 });
      }

      const title = typeof body.title === 'string' ? body.title.trim() : '';
      if (title.length < 2) {
        return NextResponse.json({ error: 'Informe o título da aula.' }, { status: 400 });
      }

      const lessonType = body.lessonType === 'TEXT' ? 'TEXT' : 'VIDEO';
      const rawVideo = typeof body.youtubeUrl === 'string' ? body.youtubeUrl.trim() : '';
      const youtubeVideoId = rawVideo ? extractYoutubeVideoId(rawVideo) : null;
      if (rawVideo && !youtubeVideoId) {
        return NextResponse.json({ error: 'URL ou ID do YouTube inválido.' }, { status: 400 });
      }

      let targetModuleId = typeof body.moduleId === 'string' ? body.moduleId.trim() : '';
      const newModuleTitle =
        typeof body.newModuleTitle === 'string' ? body.newModuleTitle.trim() : '';

      if (newModuleTitle) {
        const nextModuleOrder =
          course.modules.reduce((max, m) => Math.max(max, m.orderIndex), 0) + 1;
        const createdMod = await prisma.module.create({
          data: {
            courseId: course.id,
            title: newModuleTitle.slice(0, 140),
            orderIndex: nextModuleOrder,
          },
        });
        targetModuleId = createdMod.id;
      } else if (!targetModuleId) {
        if (course.modules[0]) {
          targetModuleId = course.modules[0].id;
        } else {
          const createdMod = await prisma.module.create({
            data: {
              courseId: course.id,
              title: '1. Módulo Principal',
              orderIndex: 1,
            },
          });
          targetModuleId = createdMod.id;
        }
      }

      const maxOrder = course.modules
        .flatMap((m) => m.lessons)
        .reduce((max, l) => Math.max(max, l.orderIndex), 0);
      const nextOrder = maxOrder + 1;
      const slug = `${String(nextOrder).padStart(3, '0')}-${slugifyLesson(title) || 'aula'}-${Date.now().toString(36).slice(-4)}`;

      const createdLesson = await prisma.lesson.create({
        data: {
          moduleId: targetModuleId,
          orderIndex: nextOrder,
          slug,
          title: title.slice(0, 200),
          lessonType,
          youtubeVideoId: lessonType === 'TEXT' ? null : youtubeVideoId,
          videoStatus:
            lessonType === 'TEXT' ? 'TEXT_ONLY' : youtubeVideoId ? 'AVAILABLE' : 'PENDING',
          summary: typeof body.summary === 'string' ? body.summary.trim() || null : null,
          textContent: typeof body.textContent === 'string' ? body.textContent : '',
          rosDocsUrl: typeof body.rosDocsUrl === 'string' ? body.rosDocsUrl.trim() || null : null,
        },
      });

      activityTarget('/ensino', createdLesson.slug);
      return NextResponse.json({ success: true, lesson: createdLesson }, { status: 201 });
    } catch (error) {
      console.error('Erro ao adicionar aula ao curso:', error);
      return NextResponse.json({ error: 'Erro interno ao adicionar aula.' }, { status: 500 });
    }
  });
}
