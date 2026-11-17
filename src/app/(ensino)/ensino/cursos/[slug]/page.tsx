import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, ArrowRight, ExternalLink } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { requirePageUser } from '@/lib/session';
import { hasEffectiveRole } from '@/lib/access-policy';
import { CourseEditorToolbar, LessonEditButton } from '@/components/course/course-inline-editor';

export const dynamic = 'force-dynamic';

export default async function CourseOverview({ params }: { params: Promise<{ slug: string }> }) {
  const user = await requirePageUser(false);
  const canEdit = hasEffectiveRole(user, ['COORDINATOR', 'MANAGEMENT', 'ADMIN']);
  const { slug } = await params;
  const course = await prisma.course.findUnique({ where: { slug }, include: {
    modules: { orderBy: { orderIndex: 'asc' }, include: { lessons: { orderBy: { orderIndex: 'asc' }, select: { id: true, slug: true, title: true, lessonType: true, youtubeVideoId: true, summary: true, textContent: true, rosDocsUrl: true } } } },
    courseProgress: { where: { memberId: user.id }, take: 1 },
  } });
  if (!course?.published && !canEdit) notFound();
  if (!course) notFound();
  const lessons = course.modules.flatMap((module) => module.lessons);
  const progress = course.courseProgress[0];
  const resume = lessons.find((lesson) => lesson.id === progress?.lastLessonId || lesson.slug === progress?.lastLessonId) ?? lessons[0];
  const href = resume ? `/curso/${resume.slug}` : course.externalUrl;
  const external = !resume && Boolean(course.externalUrl);
  return <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-8 space-y-8">
    <Link href="/ensino" className="inline-flex min-h-11 items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" />Todos os cursos</Link>
    {canEdit && (
      <CourseEditorToolbar
        course={{
          id: course.id,
          title: course.title,
          subtitle: course.subtitle,
          description: course.description,
          level: course.level,
          durationHours: course.durationHours,
          published: course.published,
          externalUrl: course.externalUrl,
        }}
        modules={course.modules.map((m) => ({ id: m.id, title: m.title }))}
      />
    )}
    <header className="space-y-4">
      <h1 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight">{course.title}</h1>
      {course.subtitle && <p className="text-lg">{course.subtitle}</p>}
      <p className="max-w-prose whitespace-pre-line text-sm leading-relaxed text-muted-foreground">{course.description}</p>
      <div className="flex flex-wrap gap-5 text-sm text-muted-foreground"><span>{course.level}</span>{course.area && <span>{course.area}</span>}{course.durationHours > 0 && <span>{course.durationHours}h</span>}<span>{lessons.length} aulas</span></div>
      {href ? <a href={href} target={external ? '_blank' : undefined} rel={external ? 'noopener noreferrer' : undefined} className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground hover:bg-primary/90">{external ? 'Acessar curso externo' : progress ? 'Continuar curso' : 'Começar curso'}{external ? <ExternalLink className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />}</a> : <p className="rounded-lg bg-muted p-4 text-sm">As aulas deste curso estão em preparação.</p>}
    </header>
    <section className="space-y-4" aria-labelledby="curriculum-title"><h2 id="curriculum-title" className="font-display text-xl font-semibold">Conteúdo do curso</h2>
      {course.modules.map((module) => <details key={module.id} open className="rounded-xl border border-border p-5"><summary className="cursor-pointer font-semibold">{module.title} <span className="text-sm font-normal text-muted-foreground">· {module.lessons.length} aulas</span></summary><ul className="mt-4 divide-y divide-border">{module.lessons.map((lesson) => <li key={lesson.id} className="flex items-center justify-between gap-2 py-2"><Link href={`/curso/${lesson.slug}`} className="flex flex-1 min-h-10 items-center justify-between gap-4 py-1 text-sm hover:text-primary">{lesson.title}<ArrowRight className="h-4 w-4 shrink-0" /></Link>{canEdit && <LessonEditButton compact lesson={lesson} />}</li>)}</ul>{module.lessons.length === 0 && <p className="mt-3 text-sm text-muted-foreground">Aulas em preparação.</p>}</details>)}
    </section>
  </div>;
}
