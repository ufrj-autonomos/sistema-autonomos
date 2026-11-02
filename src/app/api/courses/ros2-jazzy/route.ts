import { authorizeApi } from '@/lib/session';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(_req: NextRequest) {
  try {
    const access = await authorizeApi(_req, false);
    if (access.error) return access.error;
    const course = await prisma.course.findFirst({
      where: {
        OR: [
          { slug: 'ros2-jazzy' },
          { slug: 'ros2-jazzy-iniciantes' },
        ],
      },
      include: {
        modules: {
          orderBy: { orderIndex: 'asc' },
          include: {
            lessons: {
              orderBy: { orderIndex: 'asc' },
              select: {
                id: true,
                slug: true,
                title: true,
                orderIndex: true,
                lessonType: true,
                videoStatus: true,
                youtubeVideoId: true,
                videoDurationSeconds: true,
                summary: true,
              },
            },
          },
        },
      },
    });

    if (!course) {
      return NextResponse.json(
        { error: 'Curso não encontrado.' },
        { status: 404 }
      );
    }

    const formattedCourse = {
      id: course.id,
      slug: course.slug,
      title: course.title,
      subtitle: course.subtitle,
      description: course.description,
      coverImage: course.coverImage,
      badge: course.badge,
      level: course.level,
      durationHours: course.durationHours,
      published: course.published,
      orderIndex: course.orderIndex,
      modules: course.modules.map((mod) => ({
        id: mod.id,
        courseId: mod.courseId,
        slug: mod.slug,
        title: mod.title,
        description: mod.description,
        orderIndex: mod.orderIndex,
        lessons: mod.lessons.map((l) => ({
          id: l.id,
          slug: l.slug,
          title: l.title,
          orderIndex: l.orderIndex,
          type: l.lessonType.toLowerCase() as 'video' | 'text',
          lessonType: l.lessonType,
          videoStatus: l.videoStatus.toLowerCase() as 'available' | 'pending' | 'text_only',
          youtubeVideoId: l.youtubeVideoId,
          durationSeconds: l.videoDurationSeconds,
          summary: l.summary,
        })),
      })),
    };

    return NextResponse.json({ course: formattedCourse }, { status: 200 });
  } catch (error) {
    console.error('Erro ao consultar curso (/api/courses/ros2-jazzy):', error);
    return NextResponse.json(
      { error: 'Erro interno ao consultar informações do curso.' },
      { status: 500 }
    );
  }
}
