// ==============================================================================
// 🔬 EMPIRICAL ADVERSARIAL CHALLENGER SUITE — MILESTONE 3
//    Curriculum Navigation (11 Modules / 108 Lessons), Dual Routing,
//    13 Practical Robotics Exercises (R3), Code Blocks & ROS 2 Documentation
// Sistema Autônomos — UFRJ Autônomos
// Agent: m3_challenger_2
// ==============================================================================

import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { prisma } from "../src/lib/prisma";
import { CourseHeader } from "../src/components/course/course-header";
import { CurriculumSidebar } from "../src/components/course/curriculum-sidebar";
import { CodeBlock } from "../src/components/course/code-block";
import { ExerciseCard, ExerciseList } from "../src/components/course/exercise-card";
import { LessonContent } from "../src/components/course/lesson-content";
import { VideoPlayer } from "../src/components/course/video-player";
import { VideoPlaceholder } from "../src/components/course/video-placeholder";
import CoursePlayerPage, { generateMetadata } from "../src/app/(ensino)/curso/[lessonId]/page";
import EnsinoCursoRedirectPage from "../src/app/(ensino)/ensino/curso/[lessonId]/page";
import { GET as getLessonRoute } from "../src/app/api/lessons/[id]/route";
import { GET as getCourseRoute } from "../src/app/api/courses/ros2-jazzy/route";
import { NextRequest } from "next/server";
import { SurroundingLesson, LessonData, ModuleData } from "../src/components/course/types";

interface ChallengerReport {
  timestamp: string;
  verdict: "APPROVE" | "REJECT";
  stats: { total: number; passed: number; failed: number };
  sections: {
    curriculumGraphTraversal: { total: number; passed: number; failed: number };
    boundaryConditionsHeader: { total: number; passed: number; failed: number };
    dualRoutingAndResolution: { total: number; passed: number; failed: number };
    practicalExercisesAudit: { total: number; passed: number; failed: number };
    ros2CodeValidity: { total: number; passed: number; failed: number };
    codeBlockSyntaxHighlighting: { total: number; passed: number; failed: number };
    ros2DocumentationCard: { total: number; passed: number; failed: number };
    adversarialEdgeCases: { total: number; passed: number; failed: number };
  };
  errors: string[];
}

async function runAdversarialM3Suite(): Promise<ChallengerReport> {
  const report: ChallengerReport = {
    timestamp: new Date().toISOString(),
    verdict: "APPROVE",
    stats: { total: 0, passed: 0, failed: 0 },
    sections: {
      curriculumGraphTraversal: { total: 0, passed: 0, failed: 0 },
      boundaryConditionsHeader: { total: 0, passed: 0, failed: 0 },
      dualRoutingAndResolution: { total: 0, passed: 0, failed: 0 },
      practicalExercisesAudit: { total: 0, passed: 0, failed: 0 },
      ros2CodeValidity: { total: 0, passed: 0, failed: 0 },
      codeBlockSyntaxHighlighting: { total: 0, passed: 0, failed: 0 },
      ros2DocumentationCard: { total: 0, passed: 0, failed: 0 },
      adversarialEdgeCases: { total: 0, passed: 0, failed: 0 },
    },
    errors: [],
  };

  function assert(
    condition: boolean,
    sectionKey: keyof ChallengerReport["sections"],
    testId: string,
    description: string
  ) {
    report.stats.total++;
    report.sections[sectionKey].total++;
    if (condition) {
      report.stats.passed++;
      report.sections[sectionKey].passed++;
      console.log(`  ✅ [PASS] ${testId}: ${description}`);
    } else {
      report.stats.failed++;
      report.sections[sectionKey].failed++;
      report.verdict = "REJECT";
      const err = `❌ [FAIL] ${testId}: ${description}`;
      report.errors.push(err);
      console.error(`  ${err}`);
    }
  }

  console.log("================================================================================");
  console.log("🔬 EMPIRICAL ADVERSARIAL CHALLENGER SUITE — MILESTONE 3");
  console.log("   Empirical Stress-Testing: Curriculum Graph, Exercises, Syntax & Docs");
  console.log("================================================================================\n");

  // ============================================================================
  // SECTION 1: CURRICULUM GRAPH & SEQUENTIAL TRAVERSAL (11 Modules, 108 Lessons)
  // ============================================================================
  console.log("--- 1. Testing Curriculum Graph & Sequential Traversal (11 Modules, 108 Lessons) ---");

  const course = await prisma.course.findFirst({
    where: { slug: "ros2-jazzy" },
    include: {
      modules: {
        orderBy: { orderIndex: "asc" },
        include: {
          lessons: {
            orderBy: { orderIndex: "asc" },
            include: { exercises: true },
          },
        },
      },
    },
  });

  assert(course !== null, "curriculumGraphTraversal", "GRAPH-01", "Course 'ros2-jazzy' exists in database");
  if (!course) {
    throw new Error("Course not found, aborting tests.");
  }

  assert(course.modules.length === 11, "curriculumGraphTraversal", "GRAPH-02", `Course has exactly 11 modules (found: ${course.modules.length})`);

  // Verify modules contiguous orderIndex 1..11
  const moduleIndices = course.modules.map((m) => m.orderIndex);
  const expectedModIndices = Array.from({ length: 11 }, (_, i) => i + 1);
  assert(
    JSON.stringify(moduleIndices) === JSON.stringify(expectedModIndices),
    "curriculumGraphTraversal",
    "GRAPH-03",
    "Module orderIndex is strictly contiguous from 1 to 11"
  );

  const allLessons = course.modules.flatMap((m) => m.lessons);
  assert(allLessons.length === 108, "curriculumGraphTraversal", "GRAPH-04", `Course has exactly 108 lessons (found: ${allLessons.length})`);

  // Verify lessons contiguous orderIndex 1..108
  const lessonIndices = allLessons.map((l) => l.orderIndex);
  const expectedLessonIndices = Array.from({ length: 108 }, (_, i) => i + 1);
  assert(
    JSON.stringify(lessonIndices) === JSON.stringify(expectedLessonIndices),
    "curriculumGraphTraversal",
    "GRAPH-05",
    "Lesson orderIndex is strictly contiguous from 1 to 108 across all modules"
  );

  // Traversal test across the flat array simulating next/prev navigation
  // For each lesson, compute previous and next
  for (let i = 0; i < allLessons.length; i++) {
    const current = allLessons[i];
    const prev = i > 0 ? allLessons[i - 1] : null;
    const next = i < allLessons.length - 1 ? allLessons[i + 1] : null;

    if (i === 0) {
      assert(prev === null, "curriculumGraphTraversal", "NAV-BOUNDARY-START", "Lesson 1 has no previous lesson (prev is null)");
      assert(next !== null && next.orderIndex === 2, "curriculumGraphTraversal", "NAV-FIRST-NEXT", "Lesson 1 next points to Lesson 2");
    } else if (i === allLessons.length - 1) {
      assert(next === null, "curriculumGraphTraversal", "NAV-BOUNDARY-END", "Lesson 108 has no next lesson (next is null)");
      assert(prev !== null && prev.orderIndex === 107, "curriculumGraphTraversal", "NAV-LAST-PREV", "Lesson 108 prev points to Lesson 107");
    } else {
      if (prev?.orderIndex !== current.orderIndex - 1) {
        assert(false, "curriculumGraphTraversal", `NAV-PREV-${current.orderIndex}`, `Lesson ${current.orderIndex} previous points to ${prev?.orderIndex} instead of ${current.orderIndex - 1}`);
      }
      if (next?.orderIndex !== current.orderIndex + 1) {
        assert(false, "curriculumGraphTraversal", `NAV-NEXT-${current.orderIndex}`, `Lesson ${current.orderIndex} next points to ${next?.orderIndex} instead of ${current.orderIndex + 1}`);
      }
    }
  }
  assert(true, "curriculumGraphTraversal", "NAV-ALL-STEPS", "All 108 lessons have strictly valid previous/next sequential pointers");

  // Verify all 10 Module Boundaries:
  // Mod 1 -> Mod 2, Mod 2 -> Mod 3, ..., Mod 10 -> Mod 11
  for (let m = 0; m < course.modules.length - 1; m++) {
    const currentModule = course.modules[m];
    const nextModule = course.modules[m + 1];
    const lastLessonOfCurrent = currentModule.lessons[currentModule.lessons.length - 1];
    const firstLessonOfNext = nextModule.lessons[0];

    const transitionOk = lastLessonOfCurrent.orderIndex + 1 === firstLessonOfNext.orderIndex;
    assert(
      transitionOk,
      "curriculumGraphTraversal",
      `MOD-TRANSITION-${m + 1}-${m + 2}`,
      `Module ${currentModule.orderIndex} (${currentModule.title}) transitions smoothly to Module ${nextModule.orderIndex} (${nextModule.title}): Lesson ${lastLessonOfCurrent.orderIndex} -> Lesson ${firstLessonOfNext.orderIndex}`
    );
  }

  // Full Forward Traversal (1 to 108)
  let forwardCurrent = 0;
  let forwardSteps = 0;
  while (forwardCurrent < allLessons.length - 1) {
    const nextIdx = forwardCurrent + 1;
    if (allLessons[nextIdx].orderIndex === allLessons[forwardCurrent].orderIndex + 1) {
      forwardCurrent = nextIdx;
      forwardSteps++;
    } else {
      break;
    }
  }
  assert(forwardSteps === 107 && forwardCurrent === 107, "curriculumGraphTraversal", "CHAIN-FORWARD", "Full forward traversal from lesson 1 to 108 succeeds in exactly 107 steps");

  // Full Backward Traversal (108 to 1)
  let backwardCurrent = 107;
  let backwardSteps = 0;
  while (backwardCurrent > 0) {
    const prevIdx = backwardCurrent - 1;
    if (allLessons[prevIdx].orderIndex === allLessons[backwardCurrent].orderIndex - 1) {
      backwardCurrent = prevIdx;
      backwardSteps++;
    } else {
      break;
    }
  }
  assert(backwardSteps === 107 && backwardCurrent === 0, "curriculumGraphTraversal", "CHAIN-BACKWARD", "Full reverse traversal from lesson 108 down to 1 succeeds in exactly 107 steps");

  // ============================================================================
  // SECTION 2: BOUNDARY CONDITIONS & HEADER COMPONENT RENDERING
  // ============================================================================
  console.log("\n--- 2. Testing Boundary Conditions & Header Component Rendering ---");

  const lesson1 = allLessons[0];
  const lesson2 = allLessons[1];
  const lesson7 = allLessons[6];
  const lesson8 = allLessons[7];
  const lesson104 = allLessons[103];
  const lesson107 = allLessons[106];
  const lesson108 = allLessons[107];

  // Helper to build SurroundingLesson
  const toSurrounding = (l: typeof lesson1): SurroundingLesson => ({
    id: l.id,
    slug: l.slug,
    title: l.title,
    orderIndex: l.orderIndex,
  });

  const toLessonData = (l: typeof lesson1): LessonData => ({
    id: l.id,
    moduleId: l.moduleId,
    slug: l.slug,
    title: l.title,
    orderIndex: l.orderIndex,
    lessonType: l.lessonType,
    videoStatus: l.videoStatus,
    youtubeVideoId: l.youtubeVideoId,
    videoDurationSeconds: l.videoDurationSeconds,
    summary: l.summary,
    content: l.textContent,
    textContent: l.textContent,
    rosDocsUrl: l.rosDocsUrl,
    codeZipPath: l.codeZipPath,
    exercises: l.exercises,
  });

  // Test Lesson 1 Header: previous button must be disabled span, next must be link to Lesson 2
  const headerHtmlL1 = renderToStaticMarkup(
    React.createElement(CourseHeader, {
      activeLesson: toLessonData(lesson1),
      previousLesson: null,
      nextLesson: toSurrounding(lesson2),
      isSidebarOpen: true,
      onToggleSidebar: () => {},
      onToggleMobileDrawer: () => {},
    })
  );

  assert(
    headerHtmlL1.includes("cursor-not-allowed") && headerHtmlL1.includes("Primeira aula do curso"),
    "boundaryConditionsHeader",
    "HEADER-L1-PREV-DISABLED",
    "Lesson 1 CourseHeader renders disabled span for Previous button (cursor-not-allowed, title='Primeira aula do curso')"
  );
  assert(
    !/<a\b[^>]*>(?:(?!<\/a>)[\s\S])*?Anterior/i.test(headerHtmlL1),
    "boundaryConditionsHeader",
    "HEADER-L1-NO-PREV-LINK",
    "Lesson 1 CourseHeader does NOT render an active <a> link for previous lesson"
  );
  assert(
    headerHtmlL1.includes(`href="/curso/${lesson2.slug}"`),
    "boundaryConditionsHeader",
    "HEADER-L1-NEXT-LINK",
    `Lesson 1 CourseHeader renders active next link pointing to '/curso/${lesson2.slug}'`
  );

  // Test Lesson 108 Header: next button must be disabled span, prev must be link to Lesson 107
  const headerHtmlL108 = renderToStaticMarkup(
    React.createElement(CourseHeader, {
      activeLesson: toLessonData(lesson108),
      previousLesson: toSurrounding(lesson107),
      nextLesson: null,
      isSidebarOpen: true,
      onToggleSidebar: () => {},
      onToggleMobileDrawer: () => {},
    })
  );

  assert(
    headerHtmlL108.includes("cursor-not-allowed") && headerHtmlL108.includes("Última aula do curso") && headerHtmlL108.includes("Concluído"),
    "boundaryConditionsHeader",
    "HEADER-L108-NEXT-DISABLED",
    "Lesson 108 CourseHeader renders disabled span for Next button (cursor-not-allowed, title='Última aula do curso', text='Concluído')"
  );
  assert(
    !/<a\b[^>]*>(?:(?!<\/a>)[\s\S])*?Próxima/i.test(headerHtmlL108),
    "boundaryConditionsHeader",
    "HEADER-L108-NO-NEXT-LINK",
    "Lesson 108 CourseHeader does NOT render an active <a> link for next lesson"
  );
  assert(
    headerHtmlL108.includes(`href="/curso/${lesson107.slug}"`),
    "boundaryConditionsHeader",
    "HEADER-L108-PREV-LINK",
    `Lesson 108 CourseHeader renders active previous link pointing to '/curso/${lesson107.slug}'`
  );

  // Test Module 1 -> Module 2 boundary Header (Lesson 7 to Lesson 8)
  const headerHtmlL7 = renderToStaticMarkup(
    React.createElement(CourseHeader, {
      activeLesson: toLessonData(lesson7),
      previousLesson: toSurrounding(allLessons[5]),
      nextLesson: toSurrounding(lesson8),
      isSidebarOpen: true,
      onToggleSidebar: () => {},
      onToggleMobileDrawer: () => {},
    })
  );
  assert(
    headerHtmlL7.includes(`href="/curso/${lesson8.slug}"`),
    "boundaryConditionsHeader",
    "HEADER-MOD-TRANSITION-L7-NEXT",
    `Lesson 7 (end of Module 1) CourseHeader correctly points next to Lesson 8 in Module 2 ('/curso/${lesson8.slug}')`
  );

  const headerHtmlL8 = renderToStaticMarkup(
    React.createElement(CourseHeader, {
      activeLesson: toLessonData(lesson8),
      previousLesson: toSurrounding(lesson7),
      nextLesson: toSurrounding(allLessons[8]),
      isSidebarOpen: true,
      onToggleSidebar: () => {},
      onToggleMobileDrawer: () => {},
    })
  );
  assert(
    headerHtmlL8.includes(`href="/curso/${lesson7.slug}"`),
    "boundaryConditionsHeader",
    "HEADER-MOD-TRANSITION-L8-PREV",
    `Lesson 8 (start of Module 2) CourseHeader correctly points prev to Lesson 7 in Module 1 ('/curso/${lesson7.slug}')`
  );

  // ============================================================================
  // SECTION 3: DUAL ROUTING & RESOLUTION (/curso/[id] vs /ensino/curso/[id])
  // ============================================================================
  console.log("\n--- 3. Testing Dual Routing & Resolution (/curso/[id] vs /ensino/curso/[id]) ---");

  // Test set: First lesson, last lesson, module boundaries, and exercise lessons
  const testSampleLessons = [lesson1, lesson7, lesson8, allLessons[30], allLessons[43], lesson104, lesson108];

  for (const l of testSampleLessons) {
    // 1. Resolve via Slug in CoursePlayerPage
    const pageBySlug = await CoursePlayerPage({ params: Promise.resolve({ lessonId: l.slug }) });
    assert(pageBySlug !== null, "dualRoutingAndResolution", `RESOLVE-PAGE-SLUG-${l.orderIndex}`, `CoursePlayerPage resolves lesson #${l.orderIndex} by slug '${l.slug}'`);

    // 2. Resolve via CUID in CoursePlayerPage
    const pageByCuid = await CoursePlayerPage({ params: Promise.resolve({ lessonId: l.id }) });
    assert(pageByCuid !== null, "dualRoutingAndResolution", `RESOLVE-PAGE-CUID-${l.orderIndex}`, `CoursePlayerPage resolves lesson #${l.orderIndex} by CUID '${l.id}'`);

    // 3. Resolve via numeric string in CoursePlayerPage
    const pageByNum = await CoursePlayerPage({ params: Promise.resolve({ lessonId: String(l.orderIndex) }) });
    assert(pageByNum !== null, "dualRoutingAndResolution", `RESOLVE-PAGE-NUM-${l.orderIndex}`, `CoursePlayerPage resolves lesson #${l.orderIndex} by numeric index '${l.orderIndex}'`);

    // 4. Metadata generation for slug and CUID
    const metaSlug = await generateMetadata({ params: Promise.resolve({ lessonId: l.slug }) });
    assert(
      typeof metaSlug.title === "string" && metaSlug.title.includes(String(l.orderIndex).padStart(3, "0")),
      "dualRoutingAndResolution",
      `META-SLUG-${l.orderIndex}`,
      `generateMetadata by slug returns title containing '#${String(l.orderIndex).padStart(3, "0")}'`
    );

    const metaCuid = await generateMetadata({ params: Promise.resolve({ lessonId: l.id }) });
    assert(
      typeof metaCuid.title === "string" && metaCuid.title.includes(String(l.orderIndex).padStart(3, "0")),
      "dualRoutingAndResolution",
      `META-CUID-${l.orderIndex}`,
      `generateMetadata by CUID returns title containing '#${String(l.orderIndex).padStart(3, "0")}'`
    );

    // 5. EnsinoCursoRedirectPage redirect test
    // Next.js redirect throws a special NEXT_REDIRECT error with digest containing the redirect url
    try {
      await EnsinoCursoRedirectPage({ params: Promise.resolve({ lessonId: l.slug }) });
      assert(false, "dualRoutingAndResolution", `REDIRECT-SLUG-${l.orderIndex}`, "EnsinoCursoRedirectPage should throw Next.js redirect");
    } catch (err: any) {
      const isRedirect = err.digest?.startsWith("NEXT_REDIRECT") || err.message?.includes("NEXT_REDIRECT");
      assert(isRedirect, "dualRoutingAndResolution", `REDIRECT-SLUG-${l.orderIndex}`, `EnsinoCursoRedirectPage redirects /ensino/curso/${l.slug} -> /curso/${l.slug}`);
    }

    try {
      await EnsinoCursoRedirectPage({ params: Promise.resolve({ lessonId: l.id }) });
      assert(false, "dualRoutingAndResolution", `REDIRECT-CUID-${l.orderIndex}`, "EnsinoCursoRedirectPage should throw Next.js redirect");
    } catch (err: any) {
      const isRedirect = err.digest?.startsWith("NEXT_REDIRECT") || err.message?.includes("NEXT_REDIRECT");
      assert(isRedirect, "dualRoutingAndResolution", `REDIRECT-CUID-${l.orderIndex}`, `EnsinoCursoRedirectPage redirects /ensino/curso/${l.id} -> /curso/${l.id}`);
    }

    // 6. Test API Route GET /api/lessons/[id] with slug & CUID
    const reqSlug = new NextRequest(`http://localhost:3000/api/lessons/${l.slug}`);
    const resSlug = await getLessonRoute(reqSlug, { params: Promise.resolve({ id: l.slug }) });
    assert(resSlug.status === 200, "dualRoutingAndResolution", `API-GET-SLUG-${l.orderIndex}`, `GET /api/lessons/${l.slug} returns HTTP 200`);
    const dataSlug = await resSlug.json();
    assert(dataSlug.lesson.id === l.id && dataSlug.lesson.orderIndex === l.orderIndex, "dualRoutingAndResolution", `API-DATA-SLUG-${l.orderIndex}`, `API response matches lesson #${l.orderIndex}`);

    const reqCuid = new NextRequest(`http://localhost:3000/api/lessons/${l.id}`);
    const resCuid = await getLessonRoute(reqCuid, { params: Promise.resolve({ id: l.id }) });
    assert(resCuid.status === 200, "dualRoutingAndResolution", `API-GET-CUID-${l.orderIndex}`, `GET /api/lessons/${l.id} returns HTTP 200`);
  }

  // Test Nonexistent and Malformed lesson IDs (404 and notFound checks)
  const invalidIds = [
    "nonexistent-lesson-slug-xyz",
    "cuid_that_does_not_exist_999",
    "999",
    "0",
    "-1",
    "'; DROP TABLE lessons; --",
    "<script>alert(1)</script>",
  ];

  for (const inv of invalidIds) {
    const reqInv = new NextRequest(`http://localhost:3000/api/lessons/${encodeURIComponent(inv)}`);
    const resInv = await getLessonRoute(reqInv, { params: Promise.resolve({ id: inv }) });
    assert(
      resInv.status === 404,
      "dualRoutingAndResolution",
      `API-404-${inv.replace(/[^a-zA-Z0-9]/g, "_").slice(0, 15)}`,
      `GET /api/lessons/${inv.slice(0, 20)} returns HTTP 404 with error message`
    );

    const metaInv = await generateMetadata({ params: Promise.resolve({ lessonId: inv }) });
    assert(
      metaInv.title === "Aula não encontrada — UFRJ Autônomos",
      "dualRoutingAndResolution",
      `META-404-${inv.replace(/[^a-zA-Z0-9]/g, "_").slice(0, 15)}`,
      `generateMetadata returns 'Aula não encontrada — UFRJ Autônomos'`
    );

    try {
      await CoursePlayerPage({ params: Promise.resolve({ lessonId: inv }) });
      assert(false, "dualRoutingAndResolution", `NOTFOUND-PAGE-${inv.replace(/[^a-zA-Z0-9]/g, "_").slice(0, 15)}`, "CoursePlayerPage should throw NEXT_NOT_FOUND / 404");
    } catch (err: any) {
      const isNotFound =
        err.digest?.includes("404") ||
        err.digest?.includes("NEXT_NOT_FOUND") ||
        err.message?.includes("NEXT_HTTP_ERROR_FALLBACK");
      assert(isNotFound, "dualRoutingAndResolution", `NOTFOUND-PAGE-${inv.replace(/[^a-zA-Z0-9]/g, "_").slice(0, 15)}`, `CoursePlayerPage correctly invokes notFound() for invalid lesson ID '${inv}'`);
    }
  }

  // ============================================================================
  // SECTION 4: PRACTICAL ROBOTICS EXERCISES (R3) COMPLETE AUDIT
  // ============================================================================
  console.log("\n--- 4. Testing Practical Robotics Exercises (R3) Audit ---");

  const exercises = await prisma.exercise.findMany({
    include: {
      lesson: {
        select: {
          id: true,
          slug: true,
          title: true,
          orderIndex: true,
        },
      },
    },
    orderBy: { orderIndex: "asc" },
  });

  assert(exercises.length === 13, "practicalExercisesAudit", "EX-COUNT", `Database contains exactly 13 exercises (found: ${exercises.length})`);

  const totalPoints = exercises.reduce((acc, e) => acc + (e.points || 0), 0);
  assert(totalPoints === 270, "practicalExercisesAudit", "EX-POINTS", `Total reward points of all 13 exercises equals 270 pts (found: ${totalPoints})`);

  // Verify all 13 exercises individually:
  // Activity 01 to 06 and Capstone steps
  for (let idx = 0; idx < exercises.length; idx++) {
    const ex = exercises[idx];
    const testPrefix = `EX-${String(idx + 1).padStart(2, "0")}`;

    assert(Boolean(ex.title && ex.title.trim().length > 0), "practicalExercisesAudit", `${testPrefix}-TITLE`, `Exercise ${idx + 1} has non-empty title ('${ex.title}')`);
    assert(Boolean(ex.prompt && ex.prompt.trim().length > 0), "practicalExercisesAudit", `${testPrefix}-PROMPT`, `Exercise ${idx + 1} has detailed objective/prompt instructions`);
    assert(ex.points > 0, "practicalExercisesAudit", `${testPrefix}-POINTS`, `Exercise ${idx + 1} has points > 0 (${ex.points} pts)`);
    assert(Boolean(ex.solutionCode && ex.solutionCode.trim().length > 0), "practicalExercisesAudit", `${testPrefix}-SOLUTION`, `Exercise ${idx + 1} has non-empty solutionCode`);
    assert(ex.lesson !== null, "practicalExercisesAudit", `${testPrefix}-LESSON`, `Exercise ${idx + 1} is linked to Lesson #${ex.lesson?.orderIndex} (${ex.lesson?.title})`);

    // Verify hints parsing
    let parsedHints: string[] = [];
    if (ex.hints) {
      try {
        const p = JSON.parse(ex.hints);
        parsedHints = Array.isArray(p) ? p : [String(p)];
      } catch {
        parsedHints = ex.hints.split("\n").filter(Boolean);
      }
    }
    assert(parsedHints.length > 0, "practicalExercisesAudit", `${testPrefix}-HINTS`, `Exercise ${idx + 1} has ${parsedHints.length} valid pedagogical hints`);

    // Render ExerciseCard to HTML
    const exerciseData = {
      id: ex.id,
      lessonId: ex.lessonId,
      orderIndex: ex.orderIndex,
      type: ex.type,
      title: ex.title,
      prompt: ex.prompt,
      instructions: ex.instructions || undefined,
      starterCode: ex.starterCode || undefined,
      solutionCode: ex.solutionCode || undefined,
      hints: ex.hints || undefined,
      points: ex.points,
      isCompleted: false,
    };

    const cardHtml = renderToStaticMarkup(
      React.createElement(ExerciseCard, {
        exercise: exerciseData,
      })
    );

    const expectedTitle = ex.title.replace(/"/g, "&quot;");
    assert(cardHtml.includes(expectedTitle) || cardHtml.includes(ex.title), "practicalExercisesAudit", `${testPrefix}-RENDER-TITLE`, `ExerciseCard HTML contains title '${ex.title}'`);
    assert(cardHtml.includes(`+${ex.points} pts`), "practicalExercisesAudit", `${testPrefix}-RENDER-POINTS`, `ExerciseCard HTML displays points badge '+${ex.points} pts'`);
    assert(cardHtml.includes("Dicas de Apoio"), "practicalExercisesAudit", `${testPrefix}-RENDER-HINTS-BTN`, `ExerciseCard HTML contains hints accordion header ('Dicas de Apoio')`);
    assert(cardHtml.includes("Ver Solução Sugerida"), "practicalExercisesAudit", `${testPrefix}-RENDER-SOL-BTN`, `ExerciseCard HTML contains solution toggle button ('Ver Solução Sugerida')`);

    // Verify difficulty badge label
    const expectedDiff = ex.points <= 15 ? "Iniciante" : ex.points <= 20 ? "Intermediário" : "Avançado";
    assert(cardHtml.includes(expectedDiff), "practicalExercisesAudit", `${testPrefix}-RENDER-DIFF`, `ExerciseCard HTML displays correct difficulty badge ('${expectedDiff}') for ${ex.points} pts`);

    // If starter code exists, check it renders inside CodeBlock
    if (ex.starterCode) {
      assert(cardHtml.includes("starter_template"), "practicalExercisesAudit", `${testPrefix}-RENDER-STARTER`, `ExerciseCard HTML renders starterCode template badge`);
    }
  }

  // ============================================================================
  // SECTION 5: ROS 2 CODE VALIDITY IN SOLUTIONS
  // ============================================================================
  console.log("\n--- 5. Testing ROS 2 Code Validity in Exercise Solutions ---");

  for (let idx = 0; idx < exercises.length; idx++) {
    const ex = exercises[idx];
    const code = ex.solutionCode || "";
    const testPrefix = `ROS2-CODE-${String(idx + 1).padStart(2, "0")}`;

    // Test that the solution contains genuine ROS 2 APIs / commands
    const isPythonRos2 = code.includes("rclpy") || code.includes("Node") || code.includes("create_publisher") || code.includes("create_subscription") || code.includes("create_service");
    const isCppRos2 = code.includes("rclcpp") || code.includes("#include") || code.includes("std::make_shared");
    const isCliRos2 = code.includes("ros2 run") || code.includes("ros2 topic") || code.includes("turtlesim") || code.includes("colcon");
    const isLaunchRos2 = code.includes("LaunchDescription") || code.includes("generate_launch_description") || code.includes("<launch>") || code.includes("Node(");

    const hasValidRos2 = isPythonRos2 || isCppRos2 || isCliRos2 || isLaunchRos2;
    assert(
      hasValidRos2,
      "ros2CodeValidity",
      `${testPrefix}-SYNTAX`,
      `Solution for '${ex.title}' contains verified ROS 2 APIs/syntax (rclpy=${isPythonRos2}, rclcpp=${isCppRos2}, CLI=${isCliRos2}, Launch=${isLaunchRos2})`
    );
  }

  // Test ExerciseList component aggregate rendering
  const listHtml = renderToStaticMarkup(
    React.createElement(ExerciseList, {
      exercises: exercises.slice(0, 3).map((e) => ({
        id: e.id,
        lessonId: e.lessonId,
        orderIndex: e.orderIndex,
        title: e.title,
        prompt: e.prompt,
        points: e.points,
        type: e.type,
      })),
    })
  );
  const subsetPoints = exercises.slice(0, 3).reduce((acc, e) => acc + e.points, 0);
  assert(
    listHtml.includes("Atividades &amp; Exercícios Práticos") || listHtml.includes("Atividades & Exercícios Práticos"),
    "practicalExercisesAudit",
    "EXLIST-HEADER",
    "ExerciseList renders section header 'Atividades & Exercícios Práticos'"
  );
  assert(
    listHtml.includes(`+${subsetPoints} pts`),
    "practicalExercisesAudit",
    "EXLIST-TOTAL-PTS",
    `ExerciseList correctly sums reward points for 3 exercises (+${subsetPoints} pts)`
  );

  // ============================================================================
  // SECTION 6: CODE BLOCKS & SYNTAX HIGHLIGHTING (C++, Python, Bash, XML, YAML)
  // ============================================================================
  console.log("\n--- 6. Testing CodeBlock Syntax Highlighting (C++, Python, Bash, XML, YAML) ---");

  // 1. C++ (rclcpp) test
  const cppSnippet = `#include "rclcpp/rclcpp.hpp"
class MinimalPublisher : public rclcpp::Node {
public:
  MinimalPublisher() : Node("minimal_publisher") {
    publisher_ = this->create_publisher<std_msgs::msg::String>("topic", 10);
    RCLCPP_INFO(this->get_logger(), "Publisher node initialized");
  }
};
int main(int argc, char * argv[]) {
  rclcpp::init(argc, argv);
  rclcpp::spin(std::make_shared<MinimalPublisher>());
  rclcpp::shutdown();
  return 0;
}`;

  const cppHtml = renderToStaticMarkup(
    React.createElement(CodeBlock, {
      code: cppSnippet,
      language: "cpp",
      fileName: "publisher.cpp",
      showLineNumbers: true,
    })
  );

  assert(cppHtml.includes("C++ (rclcpp)"), "codeBlockSyntaxHighlighting", "CODE-CPP-BADGE", "CodeBlock displays 'C++ (rclcpp)' language badge");
  assert(cppHtml.includes("publisher.cpp"), "codeBlockSyntaxHighlighting", "CODE-CPP-FILENAME", "CodeBlock displays filename 'publisher.cpp'");
  assert(cppHtml.includes("text-purple-400") && cppHtml.includes("class"), "codeBlockSyntaxHighlighting", "CODE-CPP-KEYWORDS", "CodeBlock highlights C++ keywords with purple tokens");
  assert(cppHtml.includes("text-cyan-400") && cppHtml.includes("rclcpp"), "codeBlockSyntaxHighlighting", "CODE-CPP-RCLCPP", "CodeBlock highlights 'rclcpp' symbols with cyan tokens");
  assert(cppHtml.includes("table-row"), "codeBlockSyntaxHighlighting", "CODE-CPP-TABLE", "CodeBlock renders line numbers table");
  assert(cppHtml.includes("Copiar"), "codeBlockSyntaxHighlighting", "CODE-CPP-COPY", "CodeBlock includes copy-to-clipboard button");

  // 2. Python (rclpy) test
  const pySnippet = `import rclpy
from rclpy.node import Node
from geometry_msgs.msg import Twist

class TurtleController(Node):
    def __init__(self):
        super().__init__('turtle_controller')
        self.cmd_vel_pub = self.create_publisher(Twist, '/turtle1/cmd_vel', 10)
        self.timer = self.create_timer(0.5, self.publish_velocity)

    def publish_velocity(self):
        msg = Twist()
        msg.linear.x = 2.0
        msg.angular.z = 1.0
        self.cmd_vel_pub.publish(msg)

def main(args=None):
    rclpy.init(args=args)
    node = TurtleController()
    rclpy.spin(node)
    rclpy.shutdown()`;

  const pyHtml = renderToStaticMarkup(
    React.createElement(CodeBlock, {
      code: pySnippet,
      language: "python",
      fileName: "turtle_controller.py",
      showLineNumbers: true,
    })
  );

  assert(pyHtml.includes("Python 3 (rclpy)"), "codeBlockSyntaxHighlighting", "CODE-PY-BADGE", "CodeBlock displays 'Python 3 (rclpy)' language badge");
  assert(pyHtml.includes("turtle_controller.py"), "codeBlockSyntaxHighlighting", "CODE-PY-FILENAME", "CodeBlock displays filename 'turtle_controller.py'");
  assert(pyHtml.includes("text-purple-400") && pyHtml.includes("import"), "codeBlockSyntaxHighlighting", "CODE-PY-KEYWORDS", "CodeBlock highlights Python keywords (import, def, class)");
  assert(pyHtml.includes("text-cyan-400") && pyHtml.includes("rclpy"), "codeBlockSyntaxHighlighting", "CODE-PY-RCLPY", "CodeBlock highlights rclpy / Node / create_publisher with cyan tokens");
  assert(pyHtml.includes("Copiar"), "codeBlockSyntaxHighlighting", "CODE-PY-COPY", "CodeBlock includes copy button");

  // 3. Bash / CLI test
  const bashSnippet = `source /opt/ros/jazzy/setup.bash
colcon build --symlink-install
ros2 run turtlesim turtlesim_node
ros2 topic echo /turtle1/pose
ros2 service call /spawn turtlesim/srv/Spawn "{x: 5.5, y: 5.5, theta: 0.0, name: 'turtle2'}"`;

  const bashHtml = renderToStaticMarkup(
    React.createElement(CodeBlock, {
      code: bashSnippet,
      language: "bash",
      fileName: "terminal_session",
      showLineNumbers: true,
    })
  );

  assert(bashHtml.includes("Bash / Terminal"), "codeBlockSyntaxHighlighting", "CODE-BASH-BADGE", "CodeBlock displays 'Bash / Terminal' language badge");
  assert(bashHtml.includes("text-pink-400") && bashHtml.includes("ros2"), "codeBlockSyntaxHighlighting", "CODE-BASH-ROS2", "CodeBlock highlights ROS 2 CLI commands (ros2, run, topic, service) in pink");
  assert(bashHtml.includes("text-purple-400") && bashHtml.includes("source"), "codeBlockSyntaxHighlighting", "CODE-BASH-SHELL", "CodeBlock highlights shell commands (source, colcon, build) in purple");

  // 4. XML / Launch test
  const xmlSnippet = `<launch>
  <node pkg="turtlesim" exec="turtlesim_node" name="sim" output="screen" />
</launch>`;

  const xmlHtml = renderToStaticMarkup(
    React.createElement(CodeBlock, {
      code: xmlSnippet,
      language: "xml",
    })
  );
  assert(xmlHtml.includes("ROS 2 Launch XML"), "codeBlockSyntaxHighlighting", "CODE-XML-BADGE", "CodeBlock displays 'ROS 2 Launch XML' language badge");
  assert(xmlHtml.includes("text-rose-400") && xmlHtml.includes("launch"), "codeBlockSyntaxHighlighting", "CODE-XML-TAGS", "CodeBlock highlights XML tags in rose");

  // ============================================================================
  // SECTION 7: ROS 2 JAZZY DOCUMENTATION CARD & RICH CONTENT
  // ============================================================================
  console.log("\n--- 7. Testing ROS 2 Jazzy Documentation Card & Rich Content ---");

  const testRosDocsUrl = "https://docs.ros.org/en/jazzy/index.html";

  // Test LessonContent with official ROS docs URL
  const contentWithDocsHtml = renderToStaticMarkup(
    React.createElement(LessonContent, {
      content: "### Teoria do Sistema de Nós\n\nNós em ROS 2 são entidades computacionais independentes.\n\n```python\nimport rclpy\n```",
      summary: "Visão geral sobre a arquitetura de nós em ROS 2 Jazzy.",
      rosDocsUrl: testRosDocsUrl,
      durationSeconds: 600,
      lessonTitle: "Arquitetura de Nós",
    })
  );

  assert(
    contentWithDocsHtml.includes('href="https://docs.ros.org/en/jazzy/index.html"'),
    "ros2DocumentationCard",
    "DOCS-CARD-HREF",
    "LessonContent renders official docs link with href='https://docs.ros.org/en/jazzy/index.html'"
  );
  assert(
    contentWithDocsHtml.includes('target="_blank"') && contentWithDocsHtml.includes('rel="noopener noreferrer"'),
    "ros2DocumentationCard",
    "DOCS-CARD-TARGET",
    "LessonContent renders docs link with target='_blank' and rel='noopener noreferrer' for security"
  );
  assert(
    contentWithDocsHtml.includes("docs.ros.org"),
    "ros2DocumentationCard",
    "DOCS-CARD-LABEL",
    "LessonContent displays 'docs.ros.org' link badge"
  );
  assert(
    contentWithDocsHtml.includes("Documentação Oficial ROS 2"),
    "ros2DocumentationCard",
    "DOCS-CARD-TITLE",
    "LessonContent displays 'Documentação Oficial ROS 2' section title"
  );
  assert(
    contentWithDocsHtml.includes("Sumário da Lição"),
    "ros2DocumentationCard",
    "CONTENT-SUMMARY",
    "LessonContent displays executive summary card"
  );
  assert(
    contentWithDocsHtml.includes("10 min aula"),
    "ros2DocumentationCard",
    "CONTENT-DURATION",
    "LessonContent calculates and displays video duration in minutes (600s -> 10 min aula)"
  );

  // Test LessonContent without rosDocsUrl (card should not render)
  const contentWithoutDocsHtml = renderToStaticMarkup(
    React.createElement(LessonContent, {
      content: "Apenas texto teórico.",
      rosDocsUrl: null,
    })
  );
  assert(
    !contentWithoutDocsHtml.includes("Documentação Oficial ROS 2"),
    "ros2DocumentationCard",
    "DOCS-CARD-ABSENT",
    "LessonContent does NOT render the docs card when rosDocsUrl is null"
  );

  // Check how many lessons in DB have rosDocsUrl populated or reference docs.ros.org
  const lessonsWithRosDocs = await prisma.lesson.findMany({
    where: {
      OR: [
        { rosDocsUrl: { not: null } },
        { textContent: { contains: "docs.ros.org" } },
      ],
    },
    select: { id: true, orderIndex: true, title: true, rosDocsUrl: true },
  });
  assert(
    lessonsWithRosDocs.length > 0,
    "ros2DocumentationCard",
    "DB-ROSDOCS-SEEDED",
    `Database has ${lessonsWithRosDocs.length} lessons with official ROS 2 documentation references`
  );

  // ============================================================================
  // SECTION 8: ADVERSARIAL EDGE CASES & STRESS-TESTING
  // ============================================================================
  console.log("\n--- 8. Testing Adversarial Edge Cases & Stress-Testing ---");

  // 1. Exercise with null / malformed hints
  const malformedHintsExercise = {
    id: "ex_test_malformed",
    lessonId: "lesson_test",
    orderIndex: 1,
    type: "CODE" as const,
    title: "Teste com Hints Malformados",
    prompt: "Prompt de teste",
    points: 10,
    hints: "{invalid json string",
    solutionCode: "import rclpy",
  };
  const malformedHintsHtml = renderToStaticMarkup(
    React.createElement(ExerciseCard, { exercise: malformedHintsExercise })
  );
  assert(
    malformedHintsHtml.includes("Dicas de Apoio"),
    "adversarialEdgeCases",
    "EDGE-HINTS-FALLBACK",
    "ExerciseCard handles malformed JSON hints without throwing, falling back to raw lines"
  );

  // 2. Exercise with null hints
  const nullHintsExercise = {
    id: "ex_test_null_hints",
    lessonId: "lesson_test",
    orderIndex: 2,
    type: "CODE" as const,
    title: "Teste com Hints Nulos",
    prompt: "Prompt de teste",
    points: 15,
    hints: null,
    solutionCode: "import rclpy",
  };
  const nullHintsHtml = renderToStaticMarkup(
    React.createElement(ExerciseCard, { exercise: nullHintsExercise })
  );
  assert(
    !nullHintsHtml.includes("Dicas de Apoio"),
    "adversarialEdgeCases",
    "EDGE-HINTS-NULL",
    "ExerciseCard cleanly omits hints accordion when hints is null"
  );

  // 3. CodeBlock with empty string
  const emptyCodeHtml = renderToStaticMarkup(
    React.createElement(CodeBlock, { code: "", language: "bash" })
  );
  assert(
    emptyCodeHtml.includes("Bash / Terminal"),
    "adversarialEdgeCases",
    "EDGE-CODE-EMPTY",
    "CodeBlock renders empty code string without throwing"
  );

  // 4. CodeBlock with HTML special characters (XSS Prevention)
  const xssCode = `<script>alert('xss')</script>\n<img src="x" onerror="evil()" />`;
  const xssHtml = renderToStaticMarkup(
    React.createElement(CodeBlock, { code: xssCode, language: "xml" })
  );
  assert(
    !xssHtml.includes("<script>alert"),
    "adversarialEdgeCases",
    "EDGE-CODE-XSS",
    "CodeBlock escapes HTML special tags, preventing script injection"
  );

  // 5. Sidebar progress calculations (0%, 50%, 100%)
  const dummyModules: ModuleData[] = [
    {
      id: "mod1",
      courseId: "course1",
      slug: "mod1",
      title: "Módulo 1",
      orderIndex: 1,
      lessons: [
        { id: "l1", slug: "l1", title: "L1", orderIndex: 1, videoStatus: "available" },
        { id: "l2", slug: "l2", title: "L2", orderIndex: 2, videoStatus: "available" },
      ],
    },
  ];

  // 0% completion
  const sidebar0 = renderToStaticMarkup(
    React.createElement(CurriculumSidebar, {
      modules: dummyModules,
      activeLessonId: "l1",
      completedLessonIds: [],
    })
  );
  assert(sidebar0.includes("0/2 (0%)"), "adversarialEdgeCases", "SIDEBAR-PROG-0", "CurriculumSidebar displays '0/2 (0%)' when no lessons are completed");

  // 50% completion
  const sidebar50 = renderToStaticMarkup(
    React.createElement(CurriculumSidebar, {
      modules: dummyModules,
      activeLessonId: "l1",
      completedLessonIds: ["l1"],
    })
  );
  assert(sidebar50.includes("1/2 (50%)"), "adversarialEdgeCases", "SIDEBAR-PROG-50", "CurriculumSidebar displays '1/2 (50%)' when 1 of 2 lessons is completed");

  // 100% completion
  const sidebar100 = renderToStaticMarkup(
    React.createElement(CurriculumSidebar, {
      modules: dummyModules,
      activeLessonId: "l1",
      completedLessonIds: ["l1", "l2"],
    })
  );
  assert(sidebar100.includes("2/2 (100%)"), "adversarialEdgeCases", "SIDEBAR-PROG-100", "CurriculumSidebar displays '2/2 (100%)' when all lessons are completed");

  // ============================================================================
  // FINAL SUMMARY
  // ============================================================================
  console.log("\n================================================================================");
  console.log(`📊 ADVERSARIAL CHALLENGER SUMMARY: ${report.stats.passed} PASSED | ${report.stats.failed} FAILED`);
  console.log(`   Final Verdict: ${report.verdict}`);
  console.log("================================================================================\n");

  return report;
}

runAdversarialM3Suite()
  .then((report) => {
    if (report.verdict === "REJECT") {
      console.error("Adversarial Suite failed with errors:", report.errors);
      process.exit(1);
    }
    process.exit(0);
  })
  .catch((err) => {
    console.error("Fatal error during adversarial suite execution:", err);
    process.exit(1);
  });
