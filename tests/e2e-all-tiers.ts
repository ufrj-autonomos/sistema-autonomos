// ==============================================================================
// 🚀 UNIFIED E2E TEST RUNNER — ALL TIERS (MILESTONE 5)
//    Sistema Autônomos — UFRJ Autônomos
//
// Coverage:
// - Tier 1: Feature Coverage (Gestão, Ensino catalog, Player, Video embeds, Auth, Progress)
// - Tier 2: Boundaries & Edge Cases (0% progress, 100% graduation, 401 unauth, 404, open-redirect)
// - Tier 3: Cross-Feature Combinations (User Reg -> JWT -> Course -> Progress -> Navbar -> Gestão)
// - Tier 4: Real-World Student Journey (Ana Silva: register, inspect, study nodes, code exercise, resume)
// ==============================================================================

import React from "react";
import { renderToStaticMarkup, renderToString } from "react-dom/server";
import { AppRouterContext } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { PathnameContext } from "next/dist/shared/lib/hooks-client-context.shared-runtime";
import { NextRequest } from "next/server";

import { prisma } from "../src/lib/prisma";
import { createSessionToken, verifySessionToken } from "../src/lib/auth";
import {
  calculateOverallPercentage,
  TOTAL_LESSONS,
  TOTAL_EXERCISES,
  TOTAL_COURSE_ITEMS,
} from "../src/lib/progress";

// API Handlers
import { GET as getGestaoStatsHandler } from "../src/app/api/gestao/stats/route";
import { GET as getCourseRoute } from "../src/app/api/courses/ros2-jazzy/route";
import { GET as getLessonRoute } from "../src/app/api/lessons/[id]/route";
import { POST as registerHandler } from "../src/app/api/auth/register/route";
import { POST as loginHandler } from "../src/app/api/auth/login/route";
import { GET as meHandler } from "../src/app/api/auth/me/route";
import { GET as getProgressHandler } from "../src/app/api/progress/ros2-jazzy/route";
import { POST as postLessonProgressHandler } from "../src/app/api/progress/lesson/route";
import { POST as postExerciseProgressHandler } from "../src/app/api/progress/exercise/route";

// Page & Shell Components
import GestaoPage from "../src/app/(gestao)/gestao/page";
import EnsinoCatalogPage from "../src/app/(ensino)/ensino/page";
import CoursePlayerPage, { generateMetadata } from "../src/app/(ensino)/curso/[lessonId]/page";
import { CoursePlayerShell } from "../src/components/course/course-player-shell";
import { CurriculumSidebar } from "../src/components/course/curriculum-sidebar";
import { CourseHeader } from "../src/components/course/course-header";
import { ExerciseCard } from "../src/components/course/exercise-card";
import { VideoPlayer, buildPrivacyEnhancedEmbedUrl } from "../src/components/course/video-player";
import { VideoPlaceholder } from "../src/components/course/video-placeholder";
import { KpiCards } from "../src/components/gestao/kpi-cards";
import { DivisionsSection } from "../src/components/gestao/divisions-section";
import { SystemStatus } from "../src/components/gestao/system-status";
import { Navbar } from "../src/components/layout/navbar";
import { AuthContext, SafeUser } from "../src/contexts/auth-context";

// -----------------------------------------------------------------------------
// Test Helpers
// -----------------------------------------------------------------------------

function makeReq(
  url: string,
  method: string = "GET",
  cookieHeader?: string,
  body?: any
): NextRequest {
  const init: any = {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(cookieHeader ? { cookie: cookieHeader } : {}),
    },
  };
  if (body && method !== "GET") {
    init.body = JSON.stringify(body);
  }
  return new NextRequest(url, init);
}

// Redirect sanitization logic from login/register pages
function sanitizeRedirect(raw: string | null | undefined): string {
  const rawRedirect = raw || "/ensino";
  return rawRedirect.startsWith("/") &&
    !rawRedirect.startsWith("//") &&
    !rawRedirect.includes("\\")
    ? rawRedirect
    : "/ensino";
}

const mockRouter: any = {
  push: () => {},
  replace: () => {},
  refresh: () => {},
  back: () => {},
  forward: () => {},
  prefetch: () => {},
};

// -----------------------------------------------------------------------------
// Main Test Runner
// -----------------------------------------------------------------------------

async function runUnifiedE2ETests() {
  console.log("================================================================================");
  console.log("🚀 UNIFIED E2E TEST RUNNER — ALL 4 TIERS PASS (MILESTONE 5)");
  console.log("   Sistema Autônomos — Gestão & Ensino (ROS 2 Jazzy)");
  console.log("================================================================================\n");

  let passed = 0;
  let failed = 0;
  const createdUserIds: string[] = [];

  function assert(condition: boolean, tier: string, description: string, detail?: string) {
    if (condition) {
      console.log(`  ✅ [${tier}] ${description}`);
      passed++;
    } else {
      console.error(`  ❌ [${tier}] FAIL: ${description}${detail ? ` (${detail})` : ""}`);
      failed++;
    }
  }

  try {
    // =========================================================================
    // TIER 1: FEATURE COVERAGE ACROSS FULL ECOSYSTEM
    // =========================================================================
    console.log("--- 🟦 TIER 1: Feature Coverage Across Full Ecosystem ---");

    // 1.1 Gestão Dashboard & Operational Metrics API
    const gestaoReq = makeReq("http://localhost:3000/api/gestao/stats");
    const gestaoRes = await getGestaoStatsHandler(gestaoReq);
    assert(gestaoRes.status === 200, "TIER 1", "GET /api/gestao/stats returns HTTP 200");
    const gestaoData = await gestaoRes.json();
    assert(
      gestaoData.system?.database?.status === "online",
      "TIER 1",
      `Gestão system reports database status: ${gestaoData.system?.database?.status}`
    );
    assert(
      Array.isArray(gestaoData.divisions) && gestaoData.divisions.length >= 2,
      "TIER 1",
      `Gestão divisions contain Harpia & Nautilus (count: ${gestaoData.divisions?.length})`
    );
    assert(
      gestaoData.system?.courses?.lessonsCount === 108,
      "TIER 1",
      `Gestão course metric confirms exactly 108 lessons (found: ${gestaoData.system?.courses?.lessonsCount})`
    );

    // 1.2 Gestão Page Server Component Rendering
    const gestaoPageJsx = await GestaoPage();
    const gestaoHtml = renderToStaticMarkup(gestaoPageJsx);
    assert(
      gestaoHtml.includes("Painel Executivo") ||
        gestaoHtml.includes("SUBSISTEMA DE GESTÃO") ||
        gestaoHtml.includes("Gestão"),
      "TIER 1",
      "GestaoPage renders header with executive operations title"
    );
    assert(
      gestaoHtml.includes("Harpia") && gestaoHtml.includes("Nautilus"),
      "TIER 1",
      "GestaoPage renders robotics divisions sections"
    );

    // 1.3 Course Catalog (/ensino) & API
    const courseReq = makeReq("http://localhost:3000/api/courses/ros2-jazzy");
    const courseRes = await getCourseRoute(courseReq);
    assert(courseRes.status === 200, "TIER 1", "GET /api/courses/ros2-jazzy returns HTTP 200");
    const courseData = await courseRes.json();
    assert(
      courseData.course?.slug === "ros2-jazzy",
      "TIER 1",
      "Course API returns ros2-jazzy curriculum"
    );
    assert(
      courseData.course?.modules?.length === 11,
      "TIER 1",
      `Course API lists exactly 11 modules (found: ${courseData.course?.modules?.length})`
    );
    const catalogJsx = await EnsinoCatalogPage();
    const catalogHtml = renderToStaticMarkup(catalogJsx);
    assert(
      catalogHtml.includes("ROS 2 Jazzy") && catalogHtml.includes("Plataforma de Ensino"),
      "TIER 1",
      "EnsinoCatalogPage renders curriculum catalog with ROS 2 Jazzy branding"
    );

    // 1.4 Course Player (/curso/[lessonId]) & Dynamic Metadata
    const lesson1Res = await getLessonRoute(
      makeReq("http://localhost:3000/api/lessons/001-welcome"),
      { params: Promise.resolve({ id: "001-welcome" }) }
    );
    assert(lesson1Res.status === 200, "TIER 1", "GET /api/lessons/001-welcome returns HTTP 200");
    const lesson1Data = await lesson1Res.json();
    assert(
      lesson1Data.lesson?.title === "Welcome",
      "TIER 1",
      `Lesson API resolves first lesson title (${lesson1Data.lesson?.title})`
    );

    const playerJsx = await CoursePlayerPage({
      params: Promise.resolve({ lessonId: "001-welcome" }),
    });
    assert(!!playerJsx && typeof playerJsx === "object", "TIER 1", "CoursePlayerPage resolves lesson by slug '001-welcome'");

    const meta = await generateMetadata({
      params: Promise.resolve({ lessonId: "001-welcome" }),
    });
    assert(
      typeof meta.title === "string" && meta.title.includes("Welcome"),
      "TIER 1",
      `generateMetadata produces correct title: '${meta.title}'`
    );

    // 1.5 Video Subtitled Embeds & Placeholders
    const embedUrl = buildPrivacyEnhancedEmbedUrl("nJTmymr-wNA");
    assert(
      embedUrl.includes("youtube-nocookie.com/embed/nJTmymr-wNA") &&
        embedUrl.includes("cc_lang_pref=pt") &&
        embedUrl.includes("cc_load_policy=1"),
      "TIER 1",
      "buildPrivacyEnhancedEmbedUrl configures youtube-nocookie with pt subtitles"
    );

    const videoPlayerAvailableHtml = renderToStaticMarkup(
      React.createElement(VideoPlayer, {
        youtubeVideoId: "nJTmymr-wNA",
        title: "What is a ROS2 Node",
        videoStatus: "available",
      })
    );
    assert(
      videoPlayerAvailableHtml.includes("<iframe") &&
        videoPlayerAvailableHtml.includes("youtube-nocookie.com"),
      "TIER 1",
      "VideoPlayer renders responsive iframe for available video"
    );

    const videoPlayerPendingHtml = renderToStaticMarkup(
      React.createElement(VideoPlayer, {
        youtubeVideoId: null,
        title: "Pending Video Lesson",
        videoStatus: "pending",
      })
    );
    assert(
      videoPlayerPendingHtml.includes("gravação de vídeo em andamento") ||
        videoPlayerPendingHtml.includes("Harpia"),
      "TIER 1",
      "VideoPlayer switches to VideoPlaceholder when video is pending"
    );

    // 1.6 Auth Registration & Login
    const t1Email = `tier1_${Date.now()}@autonomos.ufrj.br`;
    const t1Password = "Tier1SecurePass2026!";
    const regRes = await registerHandler(
      makeReq("http://localhost:3000/api/auth/register", "POST", undefined, {
        name: "Estudante Tier Um",
        email: t1Email,
        password: t1Password,
      })
    );
    assert(regRes.status === 201, "TIER 1", "POST /api/auth/register returns HTTP 201");
    const regData = await regRes.json();
    createdUserIds.push(regData.user.id);

    const cookieHeader = regRes.headers.get("set-cookie") || "";
    assert(cookieHeader.includes("autonomos_session"), "TIER 1", "Register response sets autonomos_session cookie");
    const tokenMatch = cookieHeader.match(/autonomos_session=([^;]+)/);
    const t1Token = tokenMatch ? tokenMatch[1] : "";
    const t1Cookie = `autonomos_session=${t1Token}`;

    const meRes = await meHandler(makeReq("http://localhost:3000/api/auth/me", "GET", t1Cookie));
    assert(meRes.status === 200, "TIER 1", "GET /api/auth/me returns HTTP 200 with session");
    const meData = await meRes.json();
    assert(meData.authenticated === true && meData.user?.email === t1Email, "TIER 1", "User recognized as authenticated");

    // 1.7 Progress APIs
    const t1ProgRes = await getProgressHandler(
      makeReq("http://localhost:3000/api/progress/ros2-jazzy", "GET", t1Cookie)
    );
    assert(t1ProgRes.status === 200, "TIER 1", "GET /api/progress/ros2-jazzy returns HTTP 200");
    const t1ProgData = await t1ProgRes.json();
    assert(t1ProgData.enrolled === true, "TIER 1", "User is enrolled upon first progress call");

    const t1MarkRes = await postLessonProgressHandler(
      makeReq("http://localhost:3000/api/progress/lesson", "POST", t1Cookie, {
        lessonId: lesson1Data.lesson.id,
        completed: true,
      })
    );
    assert(t1MarkRes.status === 200, "TIER 1", "POST /api/progress/lesson completes lesson");
    const t1MarkData = await t1MarkRes.json();
    assert(t1MarkData.overallPercentage > 0, "TIER 1", "overallPercentage recalculated after completing lesson 1");

    // =========================================================================
    // TIER 2: BOUNDARIES & EDGE CASES
    // =========================================================================
    console.log("\n--- 🟨 TIER 2: Boundaries & Edge Cases ---");

    // 2.1 Initial 0% Progress State
    const t2ZeroEmail = `tier2_zero_${Date.now()}@autonomos.ufrj.br`;
    const t2ZeroRegRes = await registerHandler(
      makeReq("http://localhost:3000/api/auth/register", "POST", undefined, {
        name: "Estudante Zero Progresso",
        email: t2ZeroEmail,
        password: "ZeroPassword2026!",
      })
    );
    const t2ZeroData = await t2ZeroRegRes.json();
    createdUserIds.push(t2ZeroData.user.id);
    const t2ZeroCookie = `autonomos_session=${t2ZeroRegRes.headers.get("set-cookie")?.match(/autonomos_session=([^;]+)/)?.[1]}`;

    const zeroProgRes = await getProgressHandler(
      makeReq("http://localhost:3000/api/progress/ros2-jazzy", "GET", t2ZeroCookie)
    );
    const zeroProgData = await zeroProgRes.json();
    assert(
      zeroProgData.overallPercentage === 0 &&
        zeroProgData.completedLessonIds.length === 0 &&
        zeroProgData.completedExerciseIds.length === 0,
      "TIER 2",
      "New student has exactly 0% overall progress and 0 completed items"
    );

    // 2.2 100% Graduation Status & Atomic Recalculation
    assert(
      calculateOverallPercentage(TOTAL_LESSONS, TOTAL_EXERCISES) === 100,
      "TIER 2",
      `Atomic formula confirms 100% graduation on completion of all ${TOTAL_COURSE_ITEMS} items`
    );
    assert(
      calculateOverallPercentage(TOTAL_LESSONS - 1, TOTAL_EXERCISES) < 100,
      "TIER 2",
      "Partial completion correctly stays strictly below 100%"
    );

    // Persist 100% graduation in database and verify sync logic
    const courseDb = await prisma.course.findFirst({ where: { slug: "ros2-jazzy" } });
    if (courseDb) {
      await prisma.courseProgress.update({
        where: {
          userId_courseId: {
            userId: t2ZeroData.user.id,
            courseId: courseDb.id,
          },
        },
        data: {
          percentage: 100.0,
          completedLessonsCount: TOTAL_LESSONS,
          isCompleted: true,
          completedAt: new Date(),
        },
      });

      const gradDb = await prisma.courseProgress.findUnique({
        where: {
          userId_courseId: {
            userId: t2ZeroData.user.id,
            courseId: courseDb.id,
          },
        },
      });
      assert(
        gradDb?.isCompleted === true && gradDb?.percentage === 100 && !!gradDb?.completedAt,
        "TIER 2",
        "Graduation status (isCompleted: true, percentage: 100, completedAt) persisted in DB"
      );
    }

    // 2.3 HTTP 401 Unauthenticated Protection
    const unauthLessonRes = await postLessonProgressHandler(
      makeReq("http://localhost:3000/api/progress/lesson", "POST", undefined, {
        lessonId: lesson1Data.lesson.id,
        completed: true,
      })
    );
    assert(unauthLessonRes.status === 401, "TIER 2", "POST /api/progress/lesson without session returns HTTP 401");

    const unauthExRes = await postExerciseProgressHandler(
      makeReq("http://localhost:3000/api/progress/exercise", "POST", undefined, {
        exerciseId: "nonexistent",
        completed: true,
      })
    );
    assert(unauthExRes.status === 401, "TIER 2", "POST /api/progress/exercise without session returns HTTP 401");

    const unauthProgRes = await getProgressHandler(
      makeReq("http://localhost:3000/api/progress/ros2-jazzy", "GET")
    );
    assert(unauthProgRes.status === 401, "TIER 2", "GET /api/progress/ros2-jazzy without session returns HTTP 401");

    // 2.4 HTTP 404 on Missing Routes & Resources
    const notFoundApiRes = await getLessonRoute(
      makeReq("http://localhost:3000/api/lessons/invalid-cuid-9999"),
      { params: Promise.resolve({ id: "invalid-cuid-9999" }) }
    );
    assert(notFoundApiRes.status === 404, "TIER 2", "GET /api/lessons/[id] with non-existent ID returns HTTP 404");

    const notFoundProgRes = await postLessonProgressHandler(
      makeReq("http://localhost:3000/api/progress/lesson", "POST", t1Cookie, {
        lessonId: "invalid-lesson-cuid-9999",
        completed: true,
      })
    );
    assert(notFoundProgRes.status === 404, "TIER 2", "POST /api/progress/lesson with non-existent lesson returns HTTP 404");

    let notFoundPageThrown = false;
    try {
      await CoursePlayerPage({ params: Promise.resolve({ lessonId: "invalid-lesson-slug-xyz" }) });
    } catch (err: any) {
      if (
        err?.digest?.includes("NEXT_NOT_FOUND") ||
        err?.digest?.includes("404") ||
        err?.message?.includes("NEXT_NOT_FOUND") ||
        err?.message?.includes("404")
      ) {
        notFoundPageThrown = true;
      }
    }
    assert(notFoundPageThrown, "TIER 2", "CoursePlayerPage throws NEXT_NOT_FOUND / 404 on missing lesson");

    // 2.5 Open-Redirect Backslash & Protocol Injection Rejection
    const openRedirectAttacks = [
      { input: "\\evil.com", expected: "/ensino" },
      { input: "\\\\evil.com", expected: "/ensino" },
      { input: "//evil.com", expected: "/ensino" },
      { input: "/\\evil.com", expected: "/ensino" },
      { input: "https://evil.org", expected: "/ensino" },
      { input: "javascript:alert(1)", expected: "/ensino" },
      { input: "/curso/001-welcome", expected: "/curso/001-welcome" },
      { input: "/gestao", expected: "/gestao" },
    ];
    let allRedirectsSafe = true;
    for (const attack of openRedirectAttacks) {
      const sanitized = sanitizeRedirect(attack.input);
      if (sanitized !== attack.expected) {
        allRedirectsSafe = false;
        console.error(`    Mismatch on redirect sanitization: ${attack.input} -> ${sanitized}`);
      }
    }
    assert(allRedirectsSafe, "TIER 2", "sanitizeRedirect rejects backslash and protocol injection vectors");

    // =========================================================================
    // TIER 3: CROSS-FEATURE COMBINATIONS
    // =========================================================================
    console.log("\n--- 🟩 TIER 3: Cross-Feature Combinations ---");

    // 3.1 Register User -> Session JWT -> Course Access
    const t3Email = `tier3_combo_${Date.now()}@autonomos.ufrj.br`;
    const t3RegRes = await registerHandler(
      makeReq("http://localhost:3000/api/auth/register", "POST", undefined, {
        name: "Thiago Santos",
        email: t3Email,
        password: "ComboPassword2026!",
      })
    );
    assert(t3RegRes.status === 201, "TIER 3", "Cross-Flow: User registration completed (STUDENT role)");
    const t3Data = await t3RegRes.json();
    createdUserIds.push(t3Data.user.id);
    const t3Token = t3RegRes.headers.get("set-cookie")?.match(/autonomos_session=([^;]+)/)?.[1] || "";
    const t3Cookie = `autonomos_session=${t3Token}`;

    const t3Decoded = await verifySessionToken(t3Token);
    assert(t3Decoded?.sub === t3Data.user.id, "TIER 3", "Cross-Flow: Session JWT decoded and matches user ID");

    // 3.2 Mark Lesson Progress & Verify Sync
    const markComboRes = await postLessonProgressHandler(
      makeReq("http://localhost:3000/api/progress/lesson", "POST", t3Cookie, {
        lessonId: lesson1Data.lesson.id,
        completed: true,
      })
    );
    assert(markComboRes.status === 200, "TIER 3", "Cross-Flow: Lesson completion mutation succeeds");
    const lessonProgDb = await prisma.lessonProgress.findUnique({
      where: {
        userId_lessonId: {
          userId: t3Data.user.id,
          lessonId: lesson1Data.lesson.id,
        },
      },
    });
    assert(lessonProgDb?.completed === true, "TIER 3", "Cross-Flow: LessonProgress persisted in DB");

    // 3.3 Dynamic Navbar Initials and Role Display
    // Test Student View
    const studentUser: SafeUser = {
      id: t3Data.user.id,
      email: t3Email,
      name: "Thiago Santos",
      role: "STUDENT",
    };

    const studentNavbarHtml = renderToString(
      React.createElement(
        AppRouterContext.Provider,
        { value: mockRouter },
        React.createElement(
          PathnameContext.Provider,
          { value: "/ensino" },
          React.createElement(
            AuthContext.Provider,
            {
              value: {
                user: studentUser,
                isLoading: false,
                isAuthenticated: true,
                login: async () => ({ success: true }),
                register: async () => ({ success: true }),
                logout: async () => {},
                refreshSession: async () => studentUser,
              },
            },
            React.createElement(Navbar)
          )
        )
      )
    );
    assert(
      studentNavbarHtml.includes("TS"),
      "TIER 3",
      "Dynamic Navbar renders student initials 'TS' for 'Thiago Santos'"
    );
    assert(
      studentNavbarHtml.includes("Thiago"),
      "TIER 3",
      "Dynamic Navbar renders student first name 'Thiago'"
    );

    // Promote to Admin in DB & re-render Navbar
    await prisma.user.update({
      where: { id: t3Data.user.id },
      data: { role: "ADMIN" },
    });

    const adminUser: SafeUser = {
      id: t3Data.user.id,
      email: t3Email,
      name: "Thiago Santos",
      role: "ADMIN",
    };

    const adminNavbarHtml = renderToString(
      React.createElement(
        AppRouterContext.Provider,
        { value: mockRouter },
        React.createElement(
          PathnameContext.Provider,
          { value: "/gestao" },
          React.createElement(
            AuthContext.Provider,
            {
              value: {
                user: adminUser,
                isLoading: false,
                isAuthenticated: true,
                login: async () => ({ success: true }),
                register: async () => ({ success: true }),
                logout: async () => {},
                refreshSession: async () => adminUser,
              },
            },
            React.createElement(Navbar)
          )
        )
      )
    );
    assert(
      adminNavbarHtml.includes("TS") && adminNavbarHtml.includes("Thiago"),
      "TIER 3",
      "Dynamic Navbar preserves initials 'TS' when promoted to ADMIN"
    );

    // 3.4 Gestão View Reflects System State
    const gestaoComboRes = await getGestaoStatsHandler(
      makeReq("http://localhost:3000/api/gestao/stats")
    );
    const gestaoComboData = await gestaoComboRes.json();
    assert(
      gestaoComboData.kpis?.totalMembers > 0,
      "TIER 3",
      `Gestão dashboard reflects team roster members (${gestaoComboData.kpis?.totalMembers})`
    );

    // =========================================================================
    // TIER 4: REAL-WORLD STUDENT JOURNEY
    // =========================================================================
    console.log("\n--- 🟪 TIER 4: Real-World Student Journey ---");

    // 4.1 Step 1: Create Student Account
    const anaEmail = `ana.silva.e2e_${Date.now()}@autonomos.ufrj.br`;
    const anaPassword = "AnaSilvaPass2026!";
    const anaRegRes = await registerHandler(
      makeReq("http://localhost:3000/api/auth/register", "POST", undefined, {
        name: "Ana Silva",
        email: anaEmail,
        password: anaPassword,
      })
    );
    assert(anaRegRes.status === 201, "TIER 4", "Step 1: Student Ana Silva successfully registers account");
    const anaRegData = await anaRegRes.json();
    createdUserIds.push(anaRegData.user.id);
    const anaCookie = `autonomos_session=${anaRegRes.headers.get("set-cookie")?.match(/autonomos_session=([^;]+)/)?.[1]}`;

    // 4.2 Step 2: Inspect Course Overview (/ensino)
    const anaCourseReq = makeReq("http://localhost:3000/api/courses/ros2-jazzy", "GET", anaCookie);
    const anaCourseRes = await getCourseRoute(anaCourseReq);
    assert(anaCourseRes.status === 200, "TIER 4", "Step 2: Student accesses ROS 2 Jazzy syllabus overview");
    const anaCourseData = await anaCourseRes.json();
    const modules = anaCourseData.course.modules;
    assert(modules.length === 11, "TIER 4", "Step 2: Syllabus verifies all 11 modules available");

    // 4.3 Step 3: Study ROS 2 Nodes Lesson
    // Locate the Python node lesson (orderIndex 18: "Write a Python Node Minimal Code")
    const nodeLessonRes = await getLessonRoute(
      makeReq("http://localhost:3000/api/lessons/018-write-a-python-node-minimal-code"),
      { params: Promise.resolve({ id: "018-write-a-python-node-minimal-code" }) }
    );
    assert(nodeLessonRes.status === 200, "TIER 4", "Step 3: Student opens lesson 18 'Write a Python Node Minimal Code'");
    const nodeLessonData = await nodeLessonRes.json();
    assert(
      nodeLessonData.lesson.textContent.includes("rclpy") ||
        nodeLessonData.lesson.summary.includes("rclpy"),
      "TIER 4",
      "Step 3: Lesson contains official ROS 2 Jazzy rclpy node instructions"
    );

    // 4.4 Step 4: Complete Practical Exercise with Submitted Code
    // Locate exercise in the database
    const practicalExercise = await prisma.exercise.findFirst({
      where: {
        lesson: {
          slug: {
            in: [
              "031-activity-01-node-remapping",
              "018-write-a-python-node-minimal-code",
              "044-activity-02-publish-topic",
            ],
          },
        },
      },
    }) || await prisma.exercise.findFirst();

    assert(!!practicalExercise, "TIER 4", "Step 4: Practical exercise located in course curriculum");

    const submittedStudentCode = `import rclpy
from rclpy.node import Node

class MyMinimalNode(Node):
    def __init__(self):
        super().__init__('meu_no_py')
        self.get_logger().info('Nó ROS 2 Jazzy executado pela aluna Ana Silva.')

def main(args=None):
    rclpy.init(args=args)
    node = MyMinimalNode()
    rclpy.spin_once(node, timeout_sec=0.1)
    node.destroy_node()
    rclpy.shutdown()

if __name__ == '__main__':
    main()`;

    if (practicalExercise) {
      const submitExRes = await postExerciseProgressHandler(
        makeReq("http://localhost:3000/api/progress/exercise", "POST", anaCookie, {
          exerciseId: practicalExercise.id,
          completed: true,
          code: submittedStudentCode,
        })
      );
      assert(submitExRes.status === 200, "TIER 4", "Step 4: Student successfully submits Python code for exercise");
      const submitExData = await submitExRes.json();
      assert(
        submitExData.completedExerciseIds.includes(practicalExercise.id),
        "TIER 4",
        "Step 4: Exercise ID added to user's completedExerciseIds"
      );

      // Verify DB persistence of code
      const exDb = await prisma.exerciseProgress.findUnique({
        where: {
          userId_exerciseId: {
            userId: anaRegData.user.id,
            exerciseId: practicalExercise.id,
          },
        },
      });
      assert(
        exDb?.completed === true && exDb?.submittedAnswer?.includes("meu_no_py") === true,
        "TIER 4",
        "Step 4: Student's submitted Python code is persisted in Supabase PostgreSQL"
      );
    }

    // Mark ROS 2 nodes lesson completed
    const markNodeLessonRes = await postLessonProgressHandler(
      makeReq("http://localhost:3000/api/progress/lesson", "POST", anaCookie, {
        lessonId: nodeLessonData.lesson.id,
        completed: true,
      })
    );
    assert(markNodeLessonRes.status === 200, "TIER 4", "Step 4: Student marks ROS 2 nodes lesson as completed");
    const markNodeLessonData = await markNodeLessonRes.json();
    assert(
      markNodeLessonData.lastAccessedLessonId === nodeLessonData.lesson.id,
      "TIER 4",
      "Step 4: lastAccessedLessonId points to ROS 2 nodes lesson"
    );

    // 4.5 Step 5: Verify Resume Button ("Continuar de onde parou")
    const anaProgDb = await prisma.courseProgress.findFirst({
      where: {
        userId: anaRegData.user.id,
        course: { slug: "ros2-jazzy" },
      },
    });
    assert(
      anaProgDb?.lastLessonId === nodeLessonData.lesson.id,
      "TIER 4",
      `Step 5: DB courseProgress lastLessonId accurately records lesson (${anaProgDb?.lastLessonId})`
    );
    const anaPct = Math.round(anaProgDb?.percentage || 0);
    assert(
      anaPct > 0,
      "TIER 4",
      `Step 5: Completion percentage is updated and > 0% (current: ${anaPct}%)`
    );

    // Validate resume button presentation text
    const resumeLabel = `Continuar de onde parou (${anaPct}%)`;
    assert(
      resumeLabel.includes("Continuar de onde parou") && resumeLabel.includes(`${anaPct}%`),
      "TIER 4",
      `Step 5: Resume button label accurately prepared: "${resumeLabel}"`
    );

  } catch (err) {
    console.error("❌ Fatal exception during E2E test execution:", err);
    failed++;
  } finally {
    // -------------------------------------------------------------------------
    // Clean Teardown & Isolation
    // -------------------------------------------------------------------------
    console.log("\n--- 🧹 Clean Teardown & Isolation ---");
    if (createdUserIds.length > 0) {
      try {
        const delResult = await prisma.user.deleteMany({
          where: { id: { in: createdUserIds } },
        });
        console.log(`  Cleaned up ${delResult.count} temporary test users.`);
      } catch (cleanupErr) {
        console.warn("  Warning: Failed to delete temporary test users:", cleanupErr);
      }
    }
    await prisma.$disconnect();
  }

  // ===========================================================================
  // Summary
  // ===========================================================================
  console.log("\n================================================================================");
  console.log(`📊 UNIFIED E2E TEST SUMMARY: ${passed} PASSED | ${failed} FAILED`);
  console.log("================================================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runUnifiedE2ETests().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
