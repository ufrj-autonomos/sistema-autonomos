import { requirePageUser } from '@/lib/session';
import { prisma } from '@/lib/prisma';
import { CourseCatalog } from '@/components/course/course-catalog';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Ensino — UFRJ Autônomos' };

export default async function EnsinoCatalogPage() {
  const user = await requirePageUser(false);
  const courses = await prisma.course.findMany({
    where: { published: true },
    orderBy: [{ orderIndex: 'asc' }, { createdAt: 'desc' }],
    include: {
      modules: { orderBy: { orderIndex: 'asc' }, include: { lessons: {
        orderBy: { orderIndex: 'asc' }, select: { id: true, slug: true, title: true },
      } } },
      courseProgress: { where: { memberId: user.id }, take: 1 },
    },
  });
  return <CourseCatalog courses={courses.map((course) => {
    const lessons = course.modules.flatMap((module) => module.lessons);
    const progress = course.courseProgress[0];
    const resume = lessons.find((lesson) => lesson.id === progress?.lastLessonId || lesson.slug === progress?.lastLessonId) ?? lessons[0];
    return {
      id: course.id, slug: course.slug, title: course.title, description: course.description,
      subtitle: course.subtitle, area: course.area ?? (course.slug === 'ros2-jazzy' ? 'Software' : 'Geral'),
      level: course.level, durationHours: course.durationHours, totalLessons: lessons.length,
      totalModules: course.modules.length, coverImage: course.coverImage,
      progress: Math.min(100, Math.max(0, Math.round(progress?.percentage ?? 0))),
      started: Boolean(progress), completed: progress?.isCompleted ?? false,
      resumeHref: resume ? `/curso/${resume.slug}` : course.externalUrl,
      resumeTitle: resume?.title ?? null,
      detailsHref: `/ensino/cursos/${course.slug}`,
      external: lessons.length === 0 && Boolean(course.externalUrl),
    };
  })} />;
}
