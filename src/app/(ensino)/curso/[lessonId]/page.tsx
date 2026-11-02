import { requirePageUser } from '@/lib/session';
import { notFound } from "next/navigation";
import { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { CoursePlayerShell } from "@/components/course/course-player-shell";
import { CourseData, LessonData, SurroundingLesson } from "@/components/course/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface PageProps {
  params: Promise<{ lessonId: string }>;
}

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  await requirePageUser();
  const { lessonId } = await props.params;
  const numId = Number(lessonId);

  const lesson = await prisma.lesson.findFirst({
    where: {
      OR: [
        { id: lessonId },
        { slug: lessonId },
        ...(!isNaN(numId) && numId > 0 ? [{ orderIndex: numId }] : []),
      ],
    },
    select: { title: true, orderIndex: true, summary: true },
  });

  if (!lesson) {
    return {
      title: "Aula não encontrada — UFRJ Autônomos",
    };
  }

  return {
    title: `#${String(lesson.orderIndex).padStart(3, "0")}: ${lesson.title} — ROS 2 Jazzy | UFRJ Autônomos`,
    description:
      lesson.summary ||
      `Aula ${lesson.orderIndex} do curso ROS 2 Jazzy para Iniciantes.`,
  };
}

export default async function CoursePlayerPage(props: PageProps) {
  await requirePageUser(false);
  const { lessonId } = await props.params;
  const numId = Number(lessonId);

  // 1. Busca da aula ativa e relações
  const lesson = await prisma.lesson.findFirst({
    where: {
      OR: [
        { id: lessonId },
        { slug: lessonId },
        ...(!isNaN(numId) && numId > 0 ? [{ orderIndex: numId }] : []),
      ],
    },
    include: {
      exercises: {
        orderBy: { orderIndex: "asc" },
      },
      module: {
        select: {
          id: true,
          title: true,
          orderIndex: true,
        },
      },
    },
  });

  if (!lesson) {
    notFound();
  }

  // 2. Busca do curso completo com os 11 módulos e 108 aulas
  const course = await prisma.course.findFirst({
    where: { slug: "ros2-jazzy" },
    include: {
      modules: {
        orderBy: { orderIndex: "asc" },
        include: {
          lessons: {
            orderBy: { orderIndex: "asc" },
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
    notFound();
  }

  // 3. Cálculo de aulas vizinhas (Previous / Next)
  const allLessons = course.modules.flatMap((m) => m.lessons);
  const currentIndex = allLessons.findIndex((l) => l.id === lesson.id);

  const previousLesson: SurroundingLesson | null =
    currentIndex > 0
      ? {
          id: allLessons[currentIndex - 1].id,
          slug: allLessons[currentIndex - 1].slug,
          title: allLessons[currentIndex - 1].title,
          orderIndex: allLessons[currentIndex - 1].orderIndex,
        }
      : null;

  const nextLesson: SurroundingLesson | null =
    currentIndex >= 0 && currentIndex < allLessons.length - 1
      ? {
          id: allLessons[currentIndex + 1].id,
          slug: allLessons[currentIndex + 1].slug,
          title: allLessons[currentIndex + 1].title,
          orderIndex: allLessons[currentIndex + 1].orderIndex,
        }
      : null;

  const activeLessonData: LessonData = {
    id: lesson.id,
    moduleId: lesson.moduleId,
    slug: lesson.slug,
    title: lesson.title,
    orderIndex: lesson.orderIndex,
    lessonType: lesson.lessonType,
    videoStatus: lesson.videoStatus,
    youtubeVideoId: lesson.youtubeVideoId,
    videoDurationSeconds: lesson.videoDurationSeconds,
    summary: lesson.summary,
    content: lesson.textContent,
    textContent: lesson.textContent,
    rosDocsUrl: lesson.rosDocsUrl,
    codeZipPath: lesson.codeZipPath,
    exercises: lesson.exercises,
    module: lesson.module,
  };

  const courseData: CourseData = {
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
    modules: course.modules.map((m) => ({
      id: m.id,
      courseId: m.courseId,
      slug: m.slug,
      title: m.title,
      description: m.description,
      orderIndex: m.orderIndex,
      lessons: m.lessons.map((l) => ({
        id: l.id,
        slug: l.slug,
        title: l.title,
        orderIndex: l.orderIndex,
        lessonType: l.lessonType,
        videoStatus: l.videoStatus,
        youtubeVideoId: l.youtubeVideoId,
        videoDurationSeconds: l.videoDurationSeconds,
        summary: l.summary,
      })),
    })),
  };

  // 4. Verificação de Sessão do Usuário e Hidratação de Progresso Persistido
  const session = await getSession();
  let initialCompletedLessonIds: string[] = [];
  let initialCompletedExerciseIds: string[] = [];

  if (session?.sub) {
    const [completedLessons, completedExercises] = await Promise.all([
      prisma.lessonProgress.findMany({
        where: { userId: session.sub, completed: true },
        select: { lessonId: true },
      }),
      prisma.exerciseProgress.findMany({
        where: { userId: session.sub, completed: true },
        select: { exerciseId: true },
      }),
    ]);

    initialCompletedLessonIds = completedLessons.map((p) => p.lessonId);
    initialCompletedExerciseIds = completedExercises.map((p) => p.exerciseId);

    // Atualizar automaticamente o ponteiro de última lição acessada no banco
    await prisma.courseProgress.upsert({
      where: {
        userId_courseId: {
          userId: session.sub,
          courseId: course.id,
        },
      },
      update: {
        lastLessonId: lesson.id,
      },
      create: {
        userId: session.sub,
        courseId: course.id,
        lastLessonId: lesson.id,
        totalLessonsCount: course.modules.flatMap((m) => m.lessons).length,
      },
    });
  }

  return (
    <CoursePlayerShell
      course={courseData}
      activeLesson={activeLessonData}
      previousLesson={previousLesson}
      nextLesson={nextLesson}
      initialCompletedLessonIds={initialCompletedLessonIds}
      initialCompletedExerciseIds={initialCompletedExerciseIds}
    />
  );
}
