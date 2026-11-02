// ==============================================================================
// 🧪 SMOKE & INTEGRATION TEST SUITE — MILESTONE 4
//    Progress Persistence, Atomic Percentage & User Flows
// Sistema Autônomos — UFRJ Autônomos
// ==============================================================================

import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { NextRequest } from "next/server";
import { prisma } from "../src/lib/prisma";
import { createSessionToken, verifySessionToken } from "../src/lib/auth";
import { CurriculumSidebar } from "../src/components/course/curriculum-sidebar";
import { CourseHeader } from "../src/components/course/course-header";
import { ExerciseCard } from "../src/components/course/exercise-card";
import { CoursePlayerShell } from "../src/components/course/course-player-shell";
import EnsinoCatalogPage from "../src/app/(ensino)/ensino/page";
import CoursePlayerPage from "../src/app/(ensino)/curso/[lessonId]/page";

// API Handlers (dynamically imported to support standalone execution)
import { POST as registerHandler } from "../src/app/api/auth/register/route";
import { POST as loginHandler } from "../src/app/api/auth/login/route";
import { GET as meHandler } from "../src/app/api/auth/me/route";
import { GET as getProgressHandler } from "../src/app/api/progress/ros2-jazzy/route";
import { POST as postLessonProgressHandler } from "../src/app/api/progress/lesson/route";
import { POST as postExerciseProgressHandler } from "../src/app/api/progress/exercise/route";

async function runM4SmokeTests() {
  console.log("================================================================================");
  console.log("🧪 SMOKE & INTEGRATION TEST SUITE — MILESTONE 4");
  console.log("   Progress Persistence, Atomic Percentage Updates & User Flows");
  console.log("================================================================================\n");

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, description: string) {
    if (condition) {
      console.log(`  ✅ [PASS] ${description}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${description}`);
      failed++;
    }
  }

  const testUserEmail = `smoke_m4_${Date.now()}@autonomos.ufrj.br`;
  const testUserPassword = "PasswordM4Secure2026!";
  let testUserId = "";
  let sessionCookie = "";

  try {
    // -----------------------------------------------------------------
    // 1. Database Prerequisite Checks (Curriculum & Exercises)
    // -----------------------------------------------------------------
    console.log("--- 1. Testing Database Models & Seed Data ---");
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

    assert(!!course, "Course 'ros2-jazzy' exists in database");
    if (!course) {
      throw new Error("Course 'ros2-jazzy' not found in database");
    }
    const allLessons = course.modules.flatMap((m) => m.lessons);
    assert(allLessons.length === 108, `Exactly 108 lessons found in course (found: ${allLessons.length})`);

    const allExercises = allLessons.flatMap((l) => l.exercises);
    assert(allExercises.length === 13, `Exactly 13 practical exercises found (found: ${allExercises.length})`);

    const lesson1 = allLessons[0];
    const lesson2 = allLessons[1];
    const exercise1 = allExercises[0];

    assert(!!lesson1 && !!lesson2, "Lesson 1 and Lesson 2 are available for test fixtures");
    assert(!!exercise1, "Exercise 1 is available for test fixtures");

    // -----------------------------------------------------------------
    // 2. Auth Flow: Registration, Session Cookie & Login
    // -----------------------------------------------------------------
    console.log("\n--- 2. Testing Auth Registration & Session Cookie ---");

    // 2.1 Register new test user
    const regReq = new NextRequest("http://localhost:3000/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: testUserEmail,
        name: "Estudante M4 Smoke Test",
        password: testUserPassword,
      }),
    });
    const regRes = await registerHandler(regReq);
    assert(regRes.status === 201, `POST /api/auth/register returned HTTP 201 (status: ${regRes.status})`);

    const regJson = await regRes.json();
    assert(regJson.success === true && regJson.user?.email === testUserEmail, "User registered successfully");
    testUserId = regJson.user.id;

    // Extract session cookie
    const setCookieHeader = regRes.headers.get("set-cookie") || "";
    assert(setCookieHeader.includes("autonomos_session"), "Registration sets 'autonomos_session' cookie");
    const tokenMatch = setCookieHeader.match(/autonomos_session=([^;]+)/);
    const token = tokenMatch ? tokenMatch[1] : "";
    assert(token.length > 20, "Session token is a valid JWT string");

    sessionCookie = `autonomos_session=${token}`;

    // 2.2 Verify JWT claims
    const decoded = await verifySessionToken(token);
    assert(decoded?.sub === testUserId, "JWT token sub matches registered user ID");
    assert(decoded?.email === testUserEmail, "JWT token email matches registered email");

    // 2.3 Verify /api/auth/me
    const meReq = new NextRequest("http://localhost:3000/api/auth/me", {
      headers: { cookie: sessionCookie },
    });
    const meRes = await meHandler(meReq);
    assert(meRes.status === 200, "GET /api/auth/me returns HTTP 200");
    const meJson = await meRes.json();
    assert(meJson.authenticated === true && meJson.user?.id === testUserId, "User is recognized as authenticated");

    // -----------------------------------------------------------------
    // 3. Initial Progress State (0% Completion, Auto-Enrollment)
    // -----------------------------------------------------------------
    console.log("\n--- 3. Testing Initial Progress & Auto-Enrollment ---");

    const initProgReq = new NextRequest("http://localhost:3000/api/progress/ros2-jazzy", {
      headers: { cookie: sessionCookie },
    });
    const initProgRes = await getProgressHandler(initProgReq);
    assert(initProgRes.status === 200, "GET /api/progress/ros2-jazzy returns HTTP 200");

    const initProgJson = await initProgRes.json();
    assert(initProgJson.enrolled === true, "User is automatically enrolled upon first progress query");
    assert(Array.isArray(initProgJson.completedLessonIds) && initProgJson.completedLessonIds.length === 0, "Initial completedLessonIds is empty");
    assert(Array.isArray(initProgJson.completedExerciseIds) && initProgJson.completedExerciseIds.length === 0, "Initial completedExerciseIds is empty");
    assert(initProgJson.overallPercentage === 0, "Initial overallPercentage is 0%");

    // Verify CourseProgress record in DB
    const courseProgDb = await prisma.courseProgress.findUnique({
      where: {
        userId_courseId: {
          userId: testUserId,
          courseId: course.id,
        },
      },
    });
    assert(!!courseProgDb, "CourseProgress row persisted in database");
    assert(courseProgDb?.percentage === 0, "Persisted CourseProgress percentage is 0.0");
    assert(courseProgDb?.completedLessonsCount === 0, "Persisted completedLessonsCount is 0");

    // -----------------------------------------------------------------
    // 4. Lesson Progress Mutation & Persistence (/api/progress/lesson)
    // -----------------------------------------------------------------
    console.log("\n--- 4. Testing Lesson Progress Completion & Recalculation ---");

    // Mark Lesson 1 as completed
    const markL1Req = new NextRequest("http://localhost:3000/api/progress/lesson", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        cookie: sessionCookie,
      },
      body: JSON.stringify({
        lessonId: lesson1.id,
        completed: true,
      }),
    });
    const markL1Res = await postLessonProgressHandler(markL1Req);
    assert(markL1Res.status === 200, "POST /api/progress/lesson (mark Lesson 1) returns HTTP 200");

    const markL1Json = await markL1Res.json();
    assert(markL1Json.success === true, "Response returns success: true");
    assert(markL1Json.completedLessonIds?.includes(lesson1.id), "completedLessonIds includes Lesson 1 ID");
    assert(markL1Json.lastAccessedLessonId === lesson1.id, "lastAccessedLessonId set to Lesson 1 ID");
    assert(markL1Json.overallPercentage > 0, `overallPercentage recalculated to > 0% (actual: ${markL1Json.overallPercentage}%)`);

    // Direct DB check for Lesson 1
    const l1Db = await prisma.lessonProgress.findUnique({
      where: {
        userId_lessonId: {
          userId: testUserId,
          lessonId: lesson1.id,
        },
      },
    });
    assert(l1Db?.completed === true, "LessonProgress row for Lesson 1 has completed: true in DB");

    // Mark Lesson 2 as completed
    const markL2Req = new NextRequest("http://localhost:3000/api/progress/lesson", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        cookie: sessionCookie,
      },
      body: JSON.stringify({
        lessonId: lesson2.id,
        completed: true,
      }),
    });
    const markL2Res = await postLessonProgressHandler(markL2Req);
    assert(markL2Res.status === 200, "POST /api/progress/lesson (mark Lesson 2) returns HTTP 200");

    const markL2Json = await markL2Res.json();
    assert(markL2Json.completedLessonIds?.includes(lesson2.id), "completedLessonIds includes Lesson 2 ID");
    assert(markL2Json.completedLessonIds?.length === 2, "completedLessonIds length is exactly 2");
    assert(markL2Json.lastAccessedLessonId === lesson2.id, "lastAccessedLessonId updated to Lesson 2 ID");

    // Check CourseProgress in DB after 2 completed lessons
    const courseProgDb2 = await prisma.courseProgress.findUnique({
      where: {
        userId_courseId: {
          userId: testUserId,
          courseId: course.id,
        },
      },
    });
    assert(courseProgDb2?.completedLessonsCount === 2, "CourseProgress completedLessonsCount is 2 in DB");
    assert(courseProgDb2?.lastLessonId === lesson2.id, "CourseProgress lastLessonId is Lesson 2 in DB");

    // Formula check: (2 lessons + 0 exercises) / (108 + 13 = 121) * 100 = 1.65% -> 2%
    const expectedPct = Math.round((2 / 121) * 100);
    assert(
      Math.round(courseProgDb2?.percentage || 0) === expectedPct,
      `Course percentage matches atomic formula (expected: ${expectedPct}%, found: ${Math.round(courseProgDb2?.percentage || 0)}%)`
    );

    // -----------------------------------------------------------------
    // 5. Exercise Progress Mutation & Persistence (/api/progress/exercise)
    // -----------------------------------------------------------------
    console.log("\n--- 5. Testing Exercise Progress Completion ---");

    const markExReq = new NextRequest("http://localhost:3000/api/progress/exercise", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        cookie: sessionCookie,
      },
      body: JSON.stringify({
        exerciseId: exercise1.id,
        completed: true,
        code: "import rclpy\nprint('smoke test pass')",
      }),
    });
    const markExRes = await postExerciseProgressHandler(markExReq);
    assert(markExRes.status === 200, "POST /api/progress/exercise returns HTTP 200");

    const markExJson = await markExRes.json();
    assert(markExJson.success === true, "Exercise response returns success: true");
    assert(markExJson.completedExerciseIds?.includes(exercise1.id), "completedExerciseIds contains Exercise 1 ID");

    // Direct DB check for Exercise 1
    const exDb = await prisma.exerciseProgress.findUnique({
      where: {
        userId_exerciseId: {
          userId: testUserId,
          exerciseId: exercise1.id,
        },
      },
    });
    assert(exDb?.completed === true, "ExerciseProgress row in DB has completed: true");
    assert(exDb?.submittedAnswer?.includes("smoke test pass") === true, "ExerciseProgress persisted submitted code answer");

    // Verify recalculation after exercise: (2 + 1) / 121 * 100 = 2.47% -> 2%
    const progAfterExReq = new NextRequest("http://localhost:3000/api/progress/ros2-jazzy", {
      headers: { cookie: sessionCookie },
    });
    const progAfterExRes = await getProgressHandler(progAfterExReq);
    const progAfterExJson = await progAfterExRes.json();
    assert(progAfterExJson.completedExerciseIds.length === 1, "Progress query returns 1 completed exercise");

    // -----------------------------------------------------------------
    // 6. Untoggle (Incomplete) State Mutation
    // -----------------------------------------------------------------
    console.log("\n--- 6. Testing Untoggling (Mark as Incomplete) ---");

    const unmarkL1Req = new NextRequest("http://localhost:3000/api/progress/lesson", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        cookie: sessionCookie,
      },
      body: JSON.stringify({
        lessonId: lesson1.id,
        completed: false,
      }),
    });
    const unmarkL1Res = await postLessonProgressHandler(unmarkL1Req);
    assert(unmarkL1Res.status === 200, "POST /api/progress/lesson (unmark Lesson 1) returns HTTP 200");

    const unmarkL1Json = await unmarkL1Res.json();
    assert(!unmarkL1Json.completedLessonIds.includes(lesson1.id), "Lesson 1 removed from completedLessonIds");
    assert(unmarkL1Json.completedLessonIds.includes(lesson2.id), "Lesson 2 remains in completedLessonIds");

    const l1DbAfter = await prisma.lessonProgress.findUnique({
      where: {
        userId_lessonId: {
          userId: testUserId,
          lessonId: lesson1.id,
        },
      },
    });
    assert(l1DbAfter?.completed === false, "LessonProgress row in DB updated to completed: false");

    // -----------------------------------------------------------------
    // 7. Resume Pointer Across Session Restarts
    // -----------------------------------------------------------------
    console.log("\n--- 7. Testing Resume Pointer (lastAccessedLessonId) Across Sessions ---");

    // Issue a brand-new session token for the user (simulating login from new browser)
    const newSessionToken = await createSessionToken({
      sub: testUserId,
      email: testUserEmail,
      name: "Estudante M4 Smoke Test",
      role: "STUDENT",
    });
    const newSessionCookie = `autonomos_session=${newSessionToken}`;

    const newSessionProgReq = new NextRequest("http://localhost:3000/api/progress/ros2-jazzy", {
      headers: { cookie: newSessionCookie },
    });
    const newSessionProgRes = await getProgressHandler(newSessionProgReq);
    const newSessionProgJson = await newSessionProgRes.json();

    assert(
      newSessionProgJson.lastAccessedLessonId === lesson2.id,
      `lastAccessedLessonId strictly preserved across session restart (expected: ${lesson2.id}, actual: ${newSessionProgJson.lastAccessedLessonId})`
    );
    assert(
      newSessionProgJson.completedLessonIds.length === 1 && newSessionProgJson.completedLessonIds[0] === lesson2.id,
      "Completed lesson IDs accurately preserved across session restart"
    );

    // -----------------------------------------------------------------
    // 8. Static Component Rendering Verification (HTML Output)
    // -----------------------------------------------------------------
    console.log("\n--- 8. Testing Component Rendering with Progress States ---");

    // 8.1 CurriculumSidebar with completed lesson
    const htmlSidebar = renderToStaticMarkup(
      React.createElement(CurriculumSidebar, {
        modules: course.modules,
        activeLessonId: lesson2.id,
        completedLessonIds: [lesson2.id],
      })
    );
    assert(htmlSidebar.includes("1 de 108 aulas concluídas") || htmlSidebar.includes("1/108"), "CurriculumSidebar renders completed counter");
    assert(htmlSidebar.includes("text-emerald-400"), "CurriculumSidebar includes emerald styling for completed lessons");

    // 8.2 CourseHeader with completion toggle button
    const htmlHeaderCompleted = renderToStaticMarkup(
      React.createElement(CourseHeader, {
        courseTitle: course.title,
        activeLesson: lesson2,
        isCompleted: true,
        onToggleComplete: () => {},
        isSidebarOpen: true,
        onToggleSidebar: () => {},
        onToggleMobileDrawer: () => {},
      })
    );
    assert(htmlHeaderCompleted.includes("Concluída"), "CourseHeader renders 'Concluída' badge when isCompleted=true");
    assert(htmlHeaderCompleted.includes("text-emerald-400"), "CourseHeader renders emerald checkmark icon");

    const htmlHeaderPending = renderToStaticMarkup(
      React.createElement(CourseHeader, {
        courseTitle: course.title,
        activeLesson: lesson1,
        isCompleted: false,
        onToggleComplete: () => {},
        isSidebarOpen: true,
        onToggleSidebar: () => {},
        onToggleMobileDrawer: () => {},
      })
    );
    assert(htmlHeaderPending.includes("Concluir"), "CourseHeader renders 'Concluir' button when isCompleted=false");

    // 8.3 ExerciseCard with completion status
    const htmlExCompleted = renderToStaticMarkup(
      React.createElement(ExerciseCard, {
        exercise: {
          ...exercise1,
          isCompleted: true,
        },
      })
    );
    assert(htmlExCompleted.includes("Exercício Concluído") || htmlExCompleted.includes("Concluído"), "ExerciseCard renders completed status button");
    assert(htmlExCompleted.includes("border-emerald-500"), "ExerciseCard applies emerald border when completed");

    // 8.4 CoursePlayerShell integration
    const htmlShell = renderToStaticMarkup(
      React.createElement(CoursePlayerShell, {
        course: {
          ...course,
          modules: course.modules.map((m) => ({
            ...m,
            lessons: m.lessons.map((l) => ({
              ...l,
              exercises: l.exercises.map((e) => ({ ...e, points: e.points })),
            })),
          })),
        },
        activeLesson: lesson2,
        initialCompletedLessonIds: [lesson2.id],
        initialCompletedExerciseIds: [exercise1.id],
      })
    );
    assert(htmlShell.includes("Concluída") || htmlShell.includes("Aula Concluída"), "CoursePlayerShell renders lesson completion status");

    // -----------------------------------------------------------------
    // 9. Security, Authentication & Error Boundaries
    // -----------------------------------------------------------------
    console.log("\n--- 9. Testing Security & Error Boundaries ---");

    // 9.1 Unauthenticated requests return 401
    const unauthLessonReq = new NextRequest("http://localhost:3000/api/progress/lesson", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lessonId: lesson1.id, completed: true }),
    });
    const unauthLessonRes = await postLessonProgressHandler(unauthLessonReq);
    assert(unauthLessonRes.status === 401, "POST /api/progress/lesson without session returns HTTP 401 Unauthorized");

    const unauthExReq = new NextRequest("http://localhost:3000/api/progress/exercise", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ exerciseId: exercise1.id, completed: true }),
    });
    const unauthExRes = await postExerciseProgressHandler(unauthExReq);
    assert(unauthExRes.status === 401, "POST /api/progress/exercise without session returns HTTP 401 Unauthorized");

    // 9.2 Non-existent IDs return 404
    const notFoundLessonReq = new NextRequest("http://localhost:3000/api/progress/lesson", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        cookie: sessionCookie,
      },
      body: JSON.stringify({ lessonId: "nonexistent-cuid-9999", completed: true }),
    });
    const notFoundLessonRes = await postLessonProgressHandler(notFoundLessonReq);
    assert(notFoundLessonRes.status === 404, "POST /api/progress/lesson with non-existent lessonId returns HTTP 404");

    const notFoundExReq = new NextRequest("http://localhost:3000/api/progress/exercise", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        cookie: sessionCookie,
      },
      body: JSON.stringify({ exerciseId: "nonexistent-ex-9999", completed: true }),
    });
    const notFoundExRes = await postExerciseProgressHandler(notFoundExReq);
    assert(notFoundExRes.status === 404, "POST /api/progress/exercise with non-existent exerciseId returns HTTP 404");

  } catch (error) {
    console.error("❌ Exception during M4 smoke test suite:", error);
    failed++;
  } finally {
    // -----------------------------------------------------------------
    // 10. Clean Teardown
    // -----------------------------------------------------------------
    console.log("\n--- 10. Clean Teardown & Isolation ---");
    if (testUserId) {
      try {
        await prisma.user.delete({ where: { id: testUserId } });
        console.log(`  🧹 Cleaned up temporary test user: ${testUserEmail} (${testUserId})`);
      } catch (cleanupErr) {
        console.warn("  ⚠️ Warning: Failed to delete temporary test user:", cleanupErr);
      }
    }
    await prisma.$disconnect();
  }

  console.log("\n================================================================================");
  console.log(`📊 MILESTONE 4 SMOKE TEST SUMMARY: ${passed} PASSED | ${failed} FAILED`);
  console.log("================================================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runM4SmokeTests().catch((err) => {
  console.error("FATAL ERROR IN M4 SMOKE TEST SUITE:", err);
  process.exit(1);
});
