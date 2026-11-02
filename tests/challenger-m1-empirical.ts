import { prisma } from '../src/lib/prisma';
import * as CourseRoute from '../src/app/api/courses/ros2-jazzy/route';
import * as LessonRoute from '../src/app/api/lessons/[id]/route';

interface EmpiricalResults {
  dbCounts: {
    coursesCount: number;
    hasRos2Jazzy: boolean;
    modulesCount: number;
    lessonsCount: number;
    exercisesCount: number;
  };
  ordering: {
    modulesSequential: boolean;
    modulesDetails: Array<{ id: string; orderIndex: number; title: string; lessonsCount: number }>;
    lessonsSequential: boolean;
    lessonsMinOrder: number;
    lessonsMaxOrder: number;
    lessonsMissingOrders: number[];
    lessonsDuplicateOrders: number[];
  };
  youtubeMapping: {
    availableCount: number;
    availableWithValidVideoIdCount: number;
    pendingCount: number;
    textOnlyCount: number;
    totalWithVideoId: number;
    invalidVideoIds: Array<{ orderIndex: number; slug: string; id: string }>;
  };
  exercises: {
    totalExercises: number;
    exercisesPerLesson: Array<{ lessonOrderIndex: number; lessonTitle: string; exercisesCount: number }>;
    exercisesWithoutLesson: number;
  };
  apiCoursesEndpoint: {
    status: number;
    latencyMs: number;
    payloadBytes: number;
    modulesCount: number;
    totalLessonsInPayload: number;
    firstModuleOrder: number;
    lastModuleOrder: number;
  };
  apiLessonsEndpoint: {
    bySlug: { status: number; slug: string; title: string; youtubeVideoId: string | null; videoStatus: string; latencyMs: number };
    byCuid: { status: number; cuid: string; title: string; latencyMs: number };
    byInvalidId: { status: number; error: string; latencyMs: number };
    bySpecialChars: { status: number; error: string; latencyMs: number };
    byEmptyId: { status: number; error: string; latencyMs: number };
  };
  seederIdempotency: {
    preSeedLessonCount: number;
    postSeedLessonCount: number;
    preSeedModuleCount: number;
    postSeedModuleCount: number;
    preSeedExerciseCount: number;
    postSeedExerciseCount: number;
    success: boolean;
    errorMessage?: string;
  };
}

export async function runEmpiricalTests(): Promise<EmpiricalResults> {
  const results: any = {};

  console.log('🔍 [EMPIRICAL TEST 1] Verifying live Supabase Database counts and schema...');
  
  // 1. Database Direct Queries
  const courses = await prisma.course.findMany();
  const ros2JazzyCourse = await prisma.course.findFirst({
    where: { slug: 'ros2-jazzy' },
    include: {
      modules: {
        orderBy: { orderIndex: 'asc' },
        include: {
          lessons: {
            orderBy: { orderIndex: 'asc' },
          },
        },
      },
    },
  });

  const modulesCount = await prisma.module.count();
  const lessonsCount = await prisma.lesson.count();
  const exercisesCount = await prisma.exercise.count();

  results.dbCounts = {
    coursesCount: courses.length,
    hasRos2Jazzy: !!ros2JazzyCourse,
    modulesCount,
    lessonsCount,
    exercisesCount,
  };

  console.log(`   Courses: ${courses.length}`);
  console.log(`   Modules: ${modulesCount}`);
  console.log(`   Lessons: ${lessonsCount}`);
  console.log(`   Exercises: ${exercisesCount}`);

  // Ordering & Sequence Check
  console.log('🔍 [EMPIRICAL TEST 2] Verifying module & lesson sequential ordering...');
  const allModules = await prisma.module.findMany({
    orderBy: { orderIndex: 'asc' },
    include: { lessons: true },
  });

  const modulesSequential =
    allModules.length === 11 &&
    allModules.every((mod, idx) => mod.orderIndex === idx + 1);

  const modulesDetails = allModules.map((m) => ({
    id: m.id,
    orderIndex: m.orderIndex,
    title: m.title,
    lessonsCount: m.lessons.length,
  }));

  const allLessons = await prisma.lesson.findMany({
    orderBy: { orderIndex: 'asc' },
  });

  const lessonOrders = allLessons.map((l) => l.orderIndex);
  const minOrder = Math.min(...lessonOrders);
  const maxOrder = Math.max(...lessonOrders);

  const missingOrders: number[] = [];
  const duplicateOrders: number[] = [];
  const seenOrders = new Set<number>();

  for (let i = 1; i <= 108; i++) {
    const occurrences = lessonOrders.filter((o) => o === i).length;
    if (occurrences === 0) missingOrders.push(i);
    if (occurrences > 1) duplicateOrders.push(i);
  }

  const lessonsSequential =
    missingOrders.length === 0 &&
    duplicateOrders.length === 0 &&
    minOrder === 1 &&
    maxOrder === 108 &&
    allLessons.length === 108;

  results.ordering = {
    modulesSequential,
    modulesDetails,
    lessonsSequential,
    lessonsMinOrder: minOrder,
    lessonsMaxOrder: maxOrder,
    lessonsMissingOrders: missingOrders,
    lessonsDuplicateOrders: duplicateOrders,
  };

  console.log(`   Modules sequential (1-11): ${modulesSequential}`);
  console.log(`   Lessons sequential (1-108, no gaps/dupes): ${lessonsSequential}`);

  // YouTube Mapping and Video Status Check
  console.log('🔍 [EMPIRICAL TEST 3] Verifying YouTube mappings and video status values...');
  const availableLessons = await prisma.lesson.findMany({
    where: { videoStatus: 'AVAILABLE' },
  });

  const invalidVideoIds: Array<{ orderIndex: number; slug: string; id: string }> = [];
  for (const l of availableLessons) {
    if (!l.youtubeVideoId || l.youtubeVideoId.trim() === '' || l.youtubeVideoId.length < 8) {
      invalidVideoIds.push({ orderIndex: l.orderIndex, slug: l.slug, id: l.id });
    }
  }

  const pendingLessons = await prisma.lesson.count({
    where: { videoStatus: 'PENDING' },
  });

  const textOnlyLessons = await prisma.lesson.count({
    where: { videoStatus: 'TEXT_ONLY' },
  });

  const lessonsWithAnyVideoId = await prisma.lesson.count({
    where: {
      youtubeVideoId: { not: null },
    },
  });

  results.youtubeMapping = {
    availableCount: availableLessons.length,
    availableWithValidVideoIdCount: availableLessons.length - invalidVideoIds.length,
    pendingCount: pendingLessons,
    textOnlyCount: textOnlyLessons,
    totalWithVideoId: lessonsWithAnyVideoId,
    invalidVideoIds,
  };

  console.log(`   Available videos count: ${availableLessons.length}`);
  console.log(`   Available with valid YouTube ID: ${availableLessons.length - invalidVideoIds.length}`);
  console.log(`   Pending videos count: ${pendingLessons}`);
  console.log(`   Text-only lessons count: ${textOnlyLessons}`);

  // Exercises relationships
  console.log('🔍 [EMPIRICAL TEST 4] Verifying exercises and lesson relationships...');
  const allExercises = await prisma.exercise.findMany({
    include: { lesson: true },
  });

  const exercisesWithoutLesson = allExercises.filter((e) => !e.lesson).length;
  const exercisesPerLessonMap = new Map<number, { title: string; count: number }>();
  for (const ex of allExercises) {
    const existing = exercisesPerLessonMap.get(ex.lesson.orderIndex) || { title: ex.lesson.title, count: 0 };
    existing.count += 1;
    exercisesPerLessonMap.set(ex.lesson.orderIndex, existing);
  }

  const exercisesPerLesson = Array.from(exercisesPerLessonMap.entries()).map(([order, data]) => ({
    lessonOrderIndex: order,
    lessonTitle: data.title,
    exercisesCount: data.count,
  }));

  results.exercises = {
    totalExercises: allExercises.length,
    exercisesPerLesson,
    exercisesWithoutLesson,
  };

  console.log(`   Total exercises: ${allExercises.length}`);
  console.log(`   Orphan exercises without lesson: ${exercisesWithoutLesson}`);

  // Test Course API: /api/courses/ros2-jazzy
  console.log('🔍 [EMPIRICAL TEST 5] Testing /api/courses/ros2-jazzy route handler...');
  const t0 = performance.now();
  const courseReq = new Request('http://localhost:3000/api/courses/ros2-jazzy');
  const courseRes = await CourseRoute.GET(courseReq as any);
  const courseLatency = performance.now() - t0;
  const courseBodyText = await courseRes.text();
  const courseJson = JSON.parse(courseBodyText);

  let totalLessonsInPayload = 0;
  if (courseJson.course?.modules) {
    for (const mod of courseJson.course.modules) {
      totalLessonsInPayload += mod.lessons?.length || 0;
    }
  }

  results.apiCoursesEndpoint = {
    status: courseRes.status,
    latencyMs: courseLatency,
    payloadBytes: Buffer.byteLength(courseBodyText, 'utf8'),
    modulesCount: courseJson.course?.modules?.length || 0,
    totalLessonsInPayload,
    firstModuleOrder: courseJson.course?.modules?.[0]?.orderIndex,
    lastModuleOrder: courseJson.course?.modules?.[courseJson.course.modules.length - 1]?.orderIndex,
  };

  console.log(`   /api/courses/ros2-jazzy status: ${courseRes.status}`);
  console.log(`   Latency: ${courseLatency.toFixed(2)} ms`);
  console.log(`   Payload: ${results.apiCoursesEndpoint.payloadBytes} bytes`);
  console.log(`   Modules in payload: ${results.apiCoursesEndpoint.modulesCount}`);
  console.log(`   Lessons in payload: ${totalLessonsInPayload}`);

  // Test Lesson API: /api/lessons/[id]
  console.log('🔍 [EMPIRICAL TEST 6] Testing /api/lessons/[id] route handler...');
  
  // 1. By slug
  const tSlug = performance.now();
  const slugReq = new Request('http://localhost:3000/api/lessons/001-welcome');
  const slugRes = await LessonRoute.GET(slugReq as any, {
    params: Promise.resolve({ id: '001-welcome' }),
  });
  const slugLatency = performance.now() - tSlug;
  const slugJson = await slugRes.json();

  // 2. By CUID ID
  const firstLessonCuid = allLessons[0].id;
  const tCuid = performance.now();
  const cuidReq = new Request(`http://localhost:3000/api/lessons/${firstLessonCuid}`);
  const cuidRes = await LessonRoute.GET(cuidReq as any, {
    params: Promise.resolve({ id: firstLessonCuid }),
  });
  const cuidLatency = performance.now() - tCuid;
  const cuidJson = await cuidRes.json();

  // 3. By Non-existent ID
  const tInv = performance.now();
  const invReq = new Request('http://localhost:3000/api/lessons/non-existent-lesson-id-99999');
  const invRes = await LessonRoute.GET(invReq as any, {
    params: Promise.resolve({ id: 'non-existent-lesson-id-99999' }),
  });
  const invLatency = performance.now() - tInv;
  const invJson = await invRes.json();

  // 4. By Special characters / SQL injection attempt
  const tSql = performance.now();
  const sqlReq = new Request("http://localhost:3000/api/lessons/'%20OR%201=1--");
  const sqlRes = await LessonRoute.GET(sqlReq as any, {
    params: Promise.resolve({ id: "' OR 1=1--" }),
  });
  const sqlLatency = performance.now() - tSql;
  const sqlJson = await sqlRes.json();

  // 5. By empty ID
  const tEmpty = performance.now();
  const emptyReq = new Request('http://localhost:3000/api/lessons/');
  const emptyRes = await LessonRoute.GET(emptyReq as any, {
    params: Promise.resolve({ id: '' }),
  });
  const emptyLatency = performance.now() - tEmpty;
  const emptyJson = await emptyRes.json();

  results.apiLessonsEndpoint = {
    bySlug: {
      status: slugRes.status,
      slug: slugJson.lesson?.slug,
      title: slugJson.lesson?.title,
      youtubeVideoId: slugJson.lesson?.youtubeVideoId,
      videoStatus: slugJson.lesson?.videoStatus,
      latencyMs: slugLatency,
    },
    byCuid: {
      status: cuidRes.status,
      cuid: cuidJson.lesson?.id,
      title: cuidJson.lesson?.title,
      latencyMs: cuidLatency,
    },
    byInvalidId: {
      status: invRes.status,
      error: invJson.error,
      latencyMs: invLatency,
    },
    bySpecialChars: {
      status: sqlRes.status,
      error: sqlJson.error,
      latencyMs: sqlLatency,
    },
    byEmptyId: {
      status: emptyRes.status,
      error: emptyJson.error,
      latencyMs: emptyLatency,
    },
  };

  console.log(`   /api/lessons/001-welcome status: ${slugRes.status} (${slugLatency.toFixed(2)} ms)`);
  console.log(`   /api/lessons/${firstLessonCuid} status: ${cuidRes.status} (${cuidLatency.toFixed(2)} ms)`);
  console.log(`   /api/lessons/non-existent status: ${invRes.status} (${invLatency.toFixed(2)} ms)`);
  console.log(`   /api/lessons/' OR 1=1-- status: ${sqlRes.status} (${sqlLatency.toFixed(2)} ms)`);
  console.log(`   /api/lessons/'' status: ${emptyRes.status} (${emptyLatency.toFixed(2)} ms)`);

  return results;
}

if (require.main === module || process.argv[1]?.endsWith('challenger-m1-empirical.ts')) {
  runEmpiricalTests()
    .then((res) => {
      console.log('\n================ EMPIRICAL SUMMARY ================');
      console.log(JSON.stringify(res, null, 2));
      process.exit(0);
    })
    .catch((err) => {
      console.error('Fatal test error:', err);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
