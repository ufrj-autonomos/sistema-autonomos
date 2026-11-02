// ==============================================================================
// 🔬 EMPIRICAL ADVERSARIAL CHALLENGER SUITE — MILESTONE 4
//    Progress Persistence, Race Conditions, Idempotency & Auth Boundaries
// Sistema Autônomos — UFRJ Autônomos
// Agent: m4_challenger_1
// ==============================================================================

import { NextRequest } from "next/server";
import { SignJWT } from "jose";
import { prisma } from "../src/lib/prisma";
import {
  createSessionToken,
  verifySessionToken,
  hashPassword,
} from "../src/lib/auth";
import {
  calculateOverallPercentage,
  TOTAL_LESSONS,
  TOTAL_EXERCISES,
  TOTAL_COURSE_ITEMS,
} from "../src/lib/progress";

// API Handlers
import { POST as registerHandler } from "../src/app/api/auth/register/route";
import { POST as loginHandler } from "../src/app/api/auth/login/route";
import { GET as meHandler } from "../src/app/api/auth/me/route";
import { GET as getProgressHandler } from "../src/app/api/progress/ros2-jazzy/route";
import { POST as postLessonProgressHandler } from "../src/app/api/progress/lesson/route";
import { POST as postExerciseProgressHandler } from "../src/app/api/progress/exercise/route";

interface ChallengerStats {
  total: number;
  passed: number;
  failed: number;
}

interface TestFailure {
  category: string;
  test: string;
  error: string;
  expected: string;
  actual: string;
}

const stats: ChallengerStats = { total: 0, passed: 0, failed: 0 };
const failures: TestFailure[] = [];

function assert(
  condition: boolean,
  category: string,
  testName: string,
  details: { expected?: string; actual?: string; message?: string } = {}
) {
  stats.total++;
  if (condition) {
    stats.passed++;
    console.log(`  ✅ [PASS] [${category}] ${testName}`);
  } else {
    stats.failed++;
    const errMsg = details.message || "Assertion failed";
    console.error(`  ❌ [FAIL] [${category}] ${testName} - ${errMsg}`);
    if (details.expected && details.actual) {
      console.error(`     Expected: ${details.expected} | Actual: ${details.actual}`);
    }
    failures.push({
      category,
      test: testName,
      error: errMsg,
      expected: details.expected || "N/A",
      actual: details.actual || "N/A",
    });
  }
}

// Helper to make NextRequest with cookie
function makeReq(
  url: string,
  method: "GET" | "POST",
  cookie?: string,
  body?: unknown
): NextRequest {
  const headers: Record<string, string> = {};
  if (cookie) headers["cookie"] = cookie;
  if (body !== undefined) headers["content-type"] = "application/json";

  return new NextRequest(url, {
    method,
    headers,
    body: body !== undefined ? (typeof body === "string" ? body : JSON.stringify(body)) : undefined,
  });
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

async function runAdversarialM4Challenger() {
  console.log("================================================================================");
  console.log("🔬 EMPIRICAL ADVERSARIAL CHALLENGER SUITE — MILESTONE 4");
  console.log("   Progress Persistence, Race Conditions, Idempotency & Auth Boundaries");
  console.log("================================================================================\n");

  const createdUserIds: string[] = [];

  try {
    // -------------------------------------------------------------------------
    // 0. Database Discovery & Verification of Course Elements
    // -------------------------------------------------------------------------
    console.log("--- 0. Database Integrity & Course Elements ---");
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

    assert(!!course, "COURSE_DISCOVERY", "Course 'ros2-jazzy' exists in database");
    if (!course) throw new Error("Course not found");

    const allLessons = course.modules.flatMap((m) => m.lessons);
    const allExercises = allLessons.flatMap((l) => l.exercises);

    assert(
      allLessons.length === TOTAL_LESSONS,
      "COURSE_DISCOVERY",
      `Total lessons matches domain constant (${TOTAL_LESSONS})`,
      { expected: `${TOTAL_LESSONS}`, actual: `${allLessons.length}` }
    );
    assert(
      allExercises.length === TOTAL_EXERCISES,
      "COURSE_DISCOVERY",
      `Total exercises matches domain constant (${TOTAL_EXERCISES})`,
      { expected: `${TOTAL_EXERCISES}`, actual: `${allExercises.length}` }
    );

    // -------------------------------------------------------------------------
    // 1. SECTION 1: AUTHENTICATION SECURITY & BOUNDARIES
    // -------------------------------------------------------------------------
    console.log("\n--- 1. Section 1: Authentication Security & Boundaries ---");

    // 1.1 Forged JWT (signed with malicious key)
    const maliciousSecret = new TextEncoder().encode("malicious-fake-key-attacker-666");
    const forgedToken = await new SignJWT({
      sub: "attacker-user-id",
      email: "attacker@evil.com",
      name: "Malicious Attacker",
      role: "ADMIN",
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("7d")
      .sign(maliciousSecret);

    const forgedCookie = `autonomos_session=${forgedToken}`;

    const forgedProgRes = await getProgressHandler(
      makeReq("http://localhost:3000/api/progress/ros2-jazzy", "GET", forgedCookie)
    );
    assert(
      forgedProgRes.status === 401,
      "AUTH_FORGERY",
      "GET /api/progress/ros2-jazzy rejects forged JWT with HTTP 401",
      { expected: "401", actual: `${forgedProgRes.status}` }
    );

    const forgedLessonRes = await postLessonProgressHandler(
      makeReq("http://localhost:3000/api/progress/lesson", "POST", forgedCookie, {
        lessonId: allLessons[0].id,
        completed: true,
      })
    );
    assert(
      forgedLessonRes.status === 401,
      "AUTH_FORGERY",
      "POST /api/progress/lesson rejects forged JWT with HTTP 401",
      { expected: "401", actual: `${forgedLessonRes.status}` }
    );

    const forgedExRes = await postExerciseProgressHandler(
      makeReq("http://localhost:3000/api/progress/exercise", "POST", forgedCookie, {
        exerciseId: allExercises[0].id,
        completed: true,
      })
    );
    assert(
      forgedExRes.status === 401,
      "AUTH_FORGERY",
      "POST /api/progress/exercise rejects forged JWT with HTTP 401",
      { expected: "401", actual: `${forgedExRes.status}` }
    );

    const forgedMeRes = await meHandler(
      makeReq("http://localhost:3000/api/auth/me", "GET", forgedCookie)
    );
    const forgedMeJson = await forgedMeRes.json();
    assert(
      forgedMeRes.status === 200 && forgedMeJson.authenticated === false,
      "AUTH_FORGERY",
      "GET /api/auth/me rejects forged JWT (authenticated: false)",
      { expected: "false", actual: `${forgedMeJson.authenticated}` }
    );

    // 1.2 Garbage / Corrupt JWT strings
    const garbageCookie = "autonomos_session=not.a.valid.jwt.token.structure";
    const garbageProgRes = await getProgressHandler(
      makeReq("http://localhost:3000/api/progress/ros2-jazzy", "GET", garbageCookie)
    );
    assert(
      garbageProgRes.status === 401,
      "AUTH_CORRUPTION",
      "GET /api/progress/ros2-jazzy rejects garbage JWT with HTTP 401",
      { expected: "401", actual: `${garbageProgRes.status}` }
    );

    // 1.3 Expired JWT (signed with legitimate key but past expiration)
    const validSecret = new TextEncoder().encode(
      process.env.JWT_SECRET ||
      process.env.SUPABASE_SECRET_KEY ||
      "ufrj-autonomos-secret-key-2026"
    );

    const expiredToken = await new SignJWT({
      sub: "expired-user-id",
      email: "expired@ufrj.br",
      name: "Expired User",
      role: "STUDENT",
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt(Math.floor(Date.now() / 1000) - 3600)
      .setExpirationTime(Math.floor(Date.now() / 1000) - 60) // Expired 1 minute ago
      .sign(validSecret);

    const expiredCookie = `autonomos_session=${expiredToken}`;

    const expProgRes = await getProgressHandler(
      makeReq("http://localhost:3000/api/progress/ros2-jazzy", "GET", expiredCookie)
    );
    assert(
      expProgRes.status === 401,
      "AUTH_EXPIRATION",
      "GET /api/progress/ros2-jazzy rejects expired JWT with HTTP 401",
      { expected: "401", actual: `${expProgRes.status}` }
    );

    const expLessonRes = await postLessonProgressHandler(
      makeReq("http://localhost:3000/api/progress/lesson", "POST", expiredCookie, {
        lessonId: allLessons[0].id,
        completed: true,
      })
    );
    assert(
      expLessonRes.status === 401,
      "AUTH_EXPIRATION",
      "POST /api/progress/lesson rejects expired JWT with HTTP 401",
      { expected: "401", actual: `${expLessonRes.status}` }
    );

    const expExRes = await postExerciseProgressHandler(
      makeReq("http://localhost:3000/api/progress/exercise", "POST", expiredCookie, {
        exerciseId: allExercises[0].id,
        completed: true,
      })
    );
    assert(
      expExRes.status === 401,
      "AUTH_EXPIRATION",
      "POST /api/progress/exercise rejects expired JWT with HTTP 401",
      { expected: "401", actual: `${expExRes.status}` }
    );

    // 1.4 Valid JWT signature for Non-Existent (Ghost) User
    const ghostToken = await createSessionToken({
      sub: "cuid_ghost_non_existent_9999",
      email: "ghost@autonomos.ufrj.br",
      name: "Ghost User",
      role: "STUDENT",
    });
    const ghostCookie = `autonomos_session=${ghostToken}`;

    const ghostProgRes = await getProgressHandler(
      makeReq("http://localhost:3000/api/progress/ros2-jazzy", "GET", ghostCookie)
    );
    assert(
      ghostProgRes.status === 401,
      "AUTH_GHOST_USER",
      "Valid token for non-existent user rejected with HTTP 401 (DB user check)",
      { expected: "401", actual: `${ghostProgRes.status}` }
    );

    // 1.5 Malformed Payloads to POST /api/auth/login
    console.log("\n--- Testing Malformed Payloads: /api/auth/login ---");

    // Empty object
    const loginEmptyRes = await loginHandler(
      makeReq("http://localhost:3000/api/auth/login", "POST", undefined, {})
    );
    assert(
      loginEmptyRes.status === 400,
      "LOGIN_VALIDATION",
      "Empty object {} rejected with HTTP 400",
      { expected: "400", actual: `${loginEmptyRes.status}` }
    );

    // Missing password
    const loginNoPassRes = await loginHandler(
      makeReq("http://localhost:3000/api/auth/login", "POST", undefined, {
        email: "someuser@ufrj.br",
      })
    );
    assert(
      loginNoPassRes.status === 400,
      "LOGIN_VALIDATION",
      "Missing password rejected with HTTP 400",
      { expected: "400", actual: `${loginNoPassRes.status}` }
    );

    // Missing email
    const loginNoEmailRes = await loginHandler(
      makeReq("http://localhost:3000/api/auth/login", "POST", undefined, {
        password: "somepassword",
      })
    );
    assert(
      loginNoEmailRes.status === 400,
      "LOGIN_VALIDATION",
      "Missing email rejected with HTTP 400",
      { expected: "400", actual: `${loginNoEmailRes.status}` }
    );

    // Empty string fields
    const loginEmptyStringsRes = await loginHandler(
      makeReq("http://localhost:3000/api/auth/login", "POST", undefined, {
        email: "",
        password: "",
      })
    );
    assert(
      loginEmptyStringsRes.status === 400,
      "LOGIN_VALIDATION",
      "Empty string email & password rejected with HTTP 400",
      { expected: "400", actual: `${loginEmptyStringsRes.status}` }
    );

    // Non-existent email credentials
    const loginNotFoundRes = await loginHandler(
      makeReq("http://localhost:3000/api/auth/login", "POST", undefined, {
        email: "nonexistent_challenger@ufrj.br",
        password: "ValidPassword123!",
      })
    );
    assert(
      loginNotFoundRes.status === 401,
      "LOGIN_CREDENTIALS",
      "Non-existent email rejected with HTTP 401 Credenciais inválidas",
      { expected: "401", actual: `${loginNotFoundRes.status}` }
    );

    // 1.6 Malformed Payloads to POST /api/auth/register
    console.log("\n--- Testing Malformed Payloads: /api/auth/register ---");

    // Empty body
    const regEmptyRes = await registerHandler(
      makeReq("http://localhost:3000/api/auth/register", "POST", undefined, {})
    );
    assert(
      regEmptyRes.status === 400,
      "REGISTER_VALIDATION",
      "Empty object {} rejected with HTTP 400",
      { expected: "400", actual: `${regEmptyRes.status}` }
    );

    // Missing name
    const regNoNameRes = await registerHandler(
      makeReq("http://localhost:3000/api/auth/register", "POST", undefined, {
        email: "test_no_name@ufrj.br",
        password: "ValidPassword123!",
      })
    );
    assert(
      regNoNameRes.status === 400,
      "REGISTER_VALIDATION",
      "Missing name rejected with HTTP 400",
      { expected: "400", actual: `${regNoNameRes.status}` }
    );

    // Invalid email format (missing @)
    const regBadEmailRes = await registerHandler(
      makeReq("http://localhost:3000/api/auth/register", "POST", undefined, {
        name: "Test User",
        email: "invalid-email-without-at",
        password: "ValidPassword123!",
      })
    );
    assert(
      regBadEmailRes.status === 400,
      "REGISTER_VALIDATION",
      "Email without '@' rejected with HTTP 400",
      { expected: "400", actual: `${regBadEmailRes.status}` }
    );

    // Short password (< 6 chars)
    const regShortPassRes = await registerHandler(
      makeReq("http://localhost:3000/api/auth/register", "POST", undefined, {
        name: "Test User",
        email: "short_pass@ufrj.br",
        password: "12345",
      })
    );
    assert(
      regShortPassRes.status === 400,
      "REGISTER_VALIDATION",
      "Password < 6 characters rejected with HTTP 400",
      { expected: "400", actual: `${regShortPassRes.status}` }
    );

    // Non-string types in register
    const regNonStringRes = await registerHandler(
      makeReq("http://localhost:3000/api/auth/register", "POST", undefined, {
        name: "Test User",
        email: 123456 as unknown as string,
        password: "ValidPassword123!",
      })
    );
    assert(
      regNonStringRes.status === 400,
      "REGISTER_VALIDATION",
      "Non-string email rejected with HTTP 400",
      { expected: "400", actual: `${regNonStringRes.status}` }
    );

    // 1.7 Duplicate Email & Case-Insensitive Rejection
    console.log("\n--- Testing Duplicate Email & Case-Insensitive Registration ---");
    const uniqueTimestamp = Date.now();
    const testRegEmail = `adv_m4_student_${uniqueTimestamp}@ufrj.br`;
    const testRegPassword = "PasswordM4Valid2026!";

    // First registration: must succeed
    const firstRegRes = await registerHandler(
      makeReq("http://localhost:3000/api/auth/register", "POST", undefined, {
        name: "Estudante M4 Adversarial",
        email: testRegEmail,
        password: testRegPassword,
      })
    );
    assert(
      firstRegRes.status === 201,
      "REGISTER_DUPLICATE",
      "First registration succeeds with HTTP 201",
      { expected: "201", actual: `${firstRegRes.status}` }
    );
    const firstRegJson = await firstRegRes.json();
    const activeTestUserId = firstRegJson.user?.id;
    if (activeTestUserId) createdUserIds.push(activeTestUserId);

    // Duplicate registration with exact same email
    const dupRegRes = await registerHandler(
      makeReq("http://localhost:3000/api/auth/register", "POST", undefined, {
        name: "Estudante M4 Clone",
        email: testRegEmail,
        password: testRegPassword,
      })
    );
    assert(
      dupRegRes.status === 409,
      "REGISTER_DUPLICATE",
      "Duplicate email registration rejected with HTTP 409 Conflict",
      { expected: "409", actual: `${dupRegRes.status}` }
    );

    // Duplicate registration with UPPERCASE email
    const upperDupRes = await registerHandler(
      makeReq("http://localhost:3000/api/auth/register", "POST", undefined, {
        name: "Estudante M4 Uppercase",
        email: testRegEmail.toUpperCase(),
        password: testRegPassword,
      })
    );
    assert(
      upperDupRes.status === 409,
      "REGISTER_DUPLICATE",
      "Case-insensitive duplicate email rejected with HTTP 409 Conflict",
      { expected: "409", actual: `${upperDupRes.status}` }
    );

    // Valid login with registered credentials
    const validLoginRes = await loginHandler(
      makeReq("http://localhost:3000/api/auth/login", "POST", undefined, {
        email: testRegEmail,
        password: testRegPassword,
      })
    );
    assert(
      validLoginRes.status === 200,
      "LOGIN_SUCCESS",
      "Legitimate login returns HTTP 200 with session cookie",
      { expected: "200", actual: `${validLoginRes.status}` }
    );

    // Login with wrong password
    const wrongPassLoginRes = await loginHandler(
      makeReq("http://localhost:3000/api/auth/login", "POST", undefined, {
        email: testRegEmail,
        password: "WrongPassword999!",
      })
    );
    assert(
      wrongPassLoginRes.status === 401,
      "LOGIN_CREDENTIALS",
      "Incorrect password returns HTTP 401",
      { expected: "401", actual: `${wrongPassLoginRes.status}` }
    );

    // 1.8 Open-Redirect Attacks Sanitization (`safeRedirect`)
    console.log("\n--- Testing Open-Redirect Attack Sanitization ---");
    const openRedirectAttacks = [
      { input: "https://evil.com", expected: "/ensino", desc: "Absolute https URL" },
      { input: "http://attacker.com/pwned", expected: "/ensino", desc: "Absolute http URL" },
      { input: "//evil.com", expected: "/ensino", desc: "Protocol-relative //evil.com" },
      { input: "///evil.com", expected: "/ensino", desc: "Triple slash ///evil.com" },
      { input: "/\\evil.com", expected: "/ensino", desc: "Backslash bypass /\\evil.com" },
      { input: "javascript:alert(1)", expected: "/ensino", desc: "javascript: URI scheme" },
      { input: "data:text/html,evil", expected: "/ensino", desc: "data: URI scheme" },
      { input: "\\\\evil.com", expected: "/ensino", desc: "Backslash \\\\evil.com" },
      { input: "ftp://files.evil.com", expected: "/ensino", desc: "ftp: URI scheme" },
      { input: "", expected: "/ensino", desc: "Empty redirect string" },
      { input: null, expected: "/ensino", desc: "Null redirect" },
      { input: undefined, expected: "/ensino", desc: "Undefined redirect" },
      { input: "/curso/001-welcome", expected: "/curso/001-welcome", desc: "Legitimate relative course URL" },
      { input: "/ensino", expected: "/ensino", desc: "Legitimate /ensino URL" },
      { input: "/gestao", expected: "/gestao", desc: "Legitimate /gestao URL" },
      { input: "/curso/015-ros2-nodes?tab=exercises", expected: "/curso/015-ros2-nodes?tab=exercises", desc: "Legitimate relative URL with query string" },
    ];

    for (const attack of openRedirectAttacks) {
      const sanitized = sanitizeRedirect(attack.input);
      assert(
        sanitized === attack.expected,
        "OPEN_REDIRECT",
        `Sanitizing '${attack.input ?? "null"}': ${attack.desc}`,
        { expected: attack.expected, actual: sanitized }
      );
    }

    // -------------------------------------------------------------------------
    // 2. SECTION 2: CONCURRENT PROGRESS UPDATES & RACE CONDITIONS
    // -------------------------------------------------------------------------
    console.log("\n--- 2. Section 2: Concurrent Progress Updates & Race Conditions ---");

    // Create a new dedicated test user for concurrency tests
    const concEmail = `adv_concurrent_${Date.now()}@ufrj.br`;
    const concRegRes = await registerHandler(
      makeReq("http://localhost:3000/api/auth/register", "POST", undefined, {
        name: "Estudante Concorrente",
        email: concEmail,
        password: "ConcurrencePass2026!",
      })
    );
    assert(concRegRes.status === 201, "CONCURRENCY_SETUP", "Concurrency test user created");
    const concUserJson = await concRegRes.json();
    const concUserId = concUserJson.user.id;
    createdUserIds.push(concUserId);

    const concToken = await createSessionToken({
      sub: concUserId,
      email: concEmail,
      name: "Estudante Concorrente",
      role: "STUDENT",
    });
    const concCookie = `autonomos_session=${concToken}`;

    // Select 10 distinct lessons to toggle concurrently
    const testLessonsBatch = allLessons.slice(0, 10);
    assert(testLessonsBatch.length === 10, "CONCURRENCY_SETUP", "Selected batch of 10 distinct lessons");

    console.log("  ⚡ Firing 10 concurrent POST /api/progress/lesson requests in parallel via Promise.all...");
    const startConcurrentTs = Date.now();

    const concurrentResults = await Promise.all(
      testLessonsBatch.map((lesson) =>
        postLessonProgressHandler(
          makeReq("http://localhost:3000/api/progress/lesson", "POST", concCookie, {
            lessonId: lesson.id,
            completed: true,
          })
        )
      )
    );

    const concurrentDurationMs = Date.now() - startConcurrentTs;
    console.log(`  ⚡ 10 concurrent requests completed in ${concurrentDurationMs}ms`);

    // Verify all 10 requests returned HTTP 200
    const all200 = concurrentResults.every((res) => res.status === 200);
    assert(
      all200,
      "CONCURRENCY_HTTP",
      "All 10 parallel progress update requests returned HTTP 200",
      {
        expected: "All 200",
        actual: `Statuses: ${concurrentResults.map((r) => r.status).join(", ")}`,
      }
    );

    // Verify underlying LessonProgress rows in Database
    const dbCompletedLessonRows = await prisma.lessonProgress.findMany({
      where: {
        userId: concUserId,
        completed: true,
      },
    });

    assert(
      dbCompletedLessonRows.length === 10,
      "CONCURRENCY_PERSISTENCE",
      `All 10 lesson completions persisted in LessonProgress table without lost updates`,
      { expected: "10", actual: `${dbCompletedLessonRows.length}` }
    );

    // Verify CourseProgress aggregate row in Database
    const dbCourseProgressAfterConc = await prisma.courseProgress.findUnique({
      where: {
        userId_courseId: {
          userId: concUserId,
          courseId: course.id,
        },
      },
    });

    assert(
      !!dbCourseProgressAfterConc,
      "CONCURRENCY_COURSE_PROGRESS",
      "CourseProgress row exists in database"
    );

    // Expected percentage: 10 lessons completed / 121 items = 8.26% -> 8%
    const expectedConcurrentPct = calculateOverallPercentage(10, 0);

    console.log(`  📊 CourseProgress after concurrency: completedLessonsCount=${dbCourseProgressAfterConc?.completedLessonsCount}, percentage=${dbCourseProgressAfterConc?.percentage}%`);

    assert(
      dbCourseProgressAfterConc?.completedLessonsCount === 10,
      "CONCURRENCY_COUNTER",
      `CourseProgress.completedLessonsCount matches exact count (10) without lost updates`,
      {
        expected: "10",
        actual: `${dbCourseProgressAfterConc?.completedLessonsCount}`,
      }
    );

    assert(
      dbCourseProgressAfterConc?.percentage === expectedConcurrentPct,
      "CONCURRENCY_PERCENTAGE",
      `CourseProgress.percentage matches exact calculation (${expectedConcurrentPct}%)`,
      {
        expected: `${expectedConcurrentPct}`,
        actual: `${dbCourseProgressAfterConc?.percentage}`,
      }
    );

    // Now query GET /api/progress/ros2-jazzy to ensure client sync returns exact 10 completed lessons
    const concSyncRes = await getProgressHandler(
      makeReq("http://localhost:3000/api/progress/ros2-jazzy", "GET", concCookie)
    );
    const concSyncJson = await concSyncRes.json();

    assert(
      concSyncJson.completedLessonIds.length === 10,
      "CONCURRENCY_GET_SYNC",
      `GET /api/progress/ros2-jazzy returns exactly 10 completedLessonIds`,
      { expected: "10", actual: `${concSyncJson.completedLessonIds.length}` }
    );
    assert(
      concSyncJson.overallPercentage === expectedConcurrentPct,
      "CONCURRENCY_GET_SYNC",
      `GET /api/progress/ros2-jazzy returns overallPercentage = ${expectedConcurrentPct}%`,
      { expected: `${expectedConcurrentPct}`, actual: `${concSyncJson.overallPercentage}` }
    );

    // 2.2 Stress Test: Mixed Concurrent Updates (Simultaneous Mark & Unmark)
    console.log("\n--- Testing Mixed Concurrent Updates (Parallel Toggle On & Off) ---");
    // Lessons 0..4 set to completed: false; Lessons 10..14 set to completed: true
    const lessonsToUnmark = testLessonsBatch.slice(0, 5); // 5 lessons unmark
    const lessonsToMarkNew = allLessons.slice(10, 15);    // 5 new lessons mark

    console.log("  ⚡ Firing 10 mixed parallel requests (5 unmark + 5 mark new)...");
    const mixedResults = await Promise.all([
      ...lessonsToUnmark.map((l) =>
        postLessonProgressHandler(
          makeReq("http://localhost:3000/api/progress/lesson", "POST", concCookie, {
            lessonId: l.id,
            completed: false,
          })
        )
      ),
      ...lessonsToMarkNew.map((l) =>
        postLessonProgressHandler(
          makeReq("http://localhost:3000/api/progress/lesson", "POST", concCookie, {
            lessonId: l.id,
            completed: true,
          })
        )
      ),
    ]);

    const allMixed200 = mixedResults.every((r) => r.status === 200);
    assert(allMixed200, "MIXED_CONCURRENCY", "All 10 mixed parallel requests returned HTTP 200");

    // Net completed should still be: (10 initial - 5 unmarked + 5 newly marked) = 10 completed
    const dbMixedCompleted = await prisma.lessonProgress.findMany({
      where: { userId: concUserId, completed: true },
    });
    assert(
      dbMixedCompleted.length === 10,
      "MIXED_CONCURRENCY",
      "Net completed lessons count in database is exactly 10 after mixed concurrent updates",
      { expected: "10", actual: `${dbMixedCompleted.length}` }
    );

    // Query CourseProgress
    const dbCourseProgMixed = await prisma.courseProgress.findUnique({
      where: {
        userId_courseId: {
          userId: concUserId,
          courseId: course.id,
        },
      },
    });
    assert(
      dbCourseProgMixed?.completedLessonsCount === 10,
      "MIXED_CONCURRENCY",
      "CourseProgress.completedLessonsCount accurately reflects 10 after mixed concurrent updates",
      { expected: "10", actual: `${dbCourseProgMixed?.completedLessonsCount}` }
    );

    // 2.3 Concurrent Cross-Entity Updates (Lessons AND Exercises Simultaneously)
    console.log("\n--- Testing Concurrent Cross-Entity Updates (Lessons + Exercises) ---");
    const testExBatch = allExercises.slice(0, 3);
    const testLessonBatchCross = allLessons.slice(15, 20); // 5 lessons

    console.log("  ⚡ Firing 8 concurrent requests across lessons and exercises...");
    const crossResults = await Promise.all([
      ...testLessonBatchCross.map((l) =>
        postLessonProgressHandler(
          makeReq("http://localhost:3000/api/progress/lesson", "POST", concCookie, {
            lessonId: l.id,
            completed: true,
          })
        )
      ),
      ...testExBatch.map((e) =>
        postExerciseProgressHandler(
          makeReq("http://localhost:3000/api/progress/exercise", "POST", concCookie, {
            exerciseId: e.id,
            completed: true,
            code: "import rclpy\nprint('concurrent test')",
          })
        )
      ),
    ]);

    const allCross200 = crossResults.every((r) => r.status === 200);
    assert(allCross200, "CROSS_CONCURRENCY", "All cross-entity parallel requests returned HTTP 200");

    // Total completed should be 10 existing + 5 new = 15 lessons, plus 3 exercises
    const totalCompletedLessonsCross = await prisma.lessonProgress.count({
      where: { userId: concUserId, completed: true },
    });
    const totalCompletedExCross = await prisma.exerciseProgress.count({
      where: { userId: concUserId, completed: true },
    });

    assert(
      totalCompletedLessonsCross === 15,
      "CROSS_CONCURRENCY",
      "Exact 15 lessons completed in DB",
      { expected: "15", actual: `${totalCompletedLessonsCross}` }
    );
    assert(
      totalCompletedExCross === 3,
      "CROSS_CONCURRENCY",
      "Exact 3 exercises completed in DB",
      { expected: "3", actual: `${totalCompletedExCross}` }
    );

    const expectedCrossPct = calculateOverallPercentage(15, 3); // (15 + 3) / 121 = 14.87% -> 15%

    // Query CourseProgress
    const courseProgCross = await prisma.courseProgress.findUnique({
      where: { userId_courseId: { userId: concUserId, courseId: course.id } },
    });

    assert(
      courseProgCross?.completedLessonsCount === 15,
      "CROSS_CONCURRENCY",
      "CourseProgress.completedLessonsCount is 15",
      { expected: "15", actual: `${courseProgCross?.completedLessonsCount}` }
    );

    assert(
      courseProgCross?.percentage === expectedCrossPct,
      "CROSS_CONCURRENCY",
      `CourseProgress.percentage is ${expectedCrossPct}%`,
      { expected: `${expectedCrossPct}`, actual: `${courseProgCross?.percentage}` }
    );

    // -------------------------------------------------------------------------
    // 3. SECTION 3: RAPID TOGGLE & IDEMPOTENCY
    // -------------------------------------------------------------------------
    console.log("\n--- 3. Section 3: Rapid Toggle & Idempotency ---");

    // 3.1 Idempotent Single-State Toggling (Repeat completed: true 5 times)
    const idempotencyLesson = allLessons[25];
    console.log(`  Testing idempotent repeated ON toggles on lesson ${idempotencyLesson.slug}...`);

    for (let i = 1; i <= 5; i++) {
      const res = await postLessonProgressHandler(
        makeReq("http://localhost:3000/api/progress/lesson", "POST", concCookie, {
          lessonId: idempotencyLesson.id,
          completed: true,
        })
      );
      assert(
        res.status === 200,
        "IDEMPOTENCY_ON",
        `Repeated ON toggle #${i} returns HTTP 200`,
        { expected: "200", actual: `${res.status}` }
      );
    }

    // Verify only ONE database record exists for this user-lesson pair
    const lessonRowsInDb = await prisma.lessonProgress.findMany({
      where: { userId: concUserId, lessonId: idempotencyLesson.id },
    });
    assert(
      lessonRowsInDb.length === 1,
      "IDEMPOTENCY_ON",
      "Exactly 1 row exists in LessonProgress (no duplicates created)",
      { expected: "1", actual: `${lessonRowsInDb.length}` }
    );
    assert(
      lessonRowsInDb[0].completed === true,
      "IDEMPOTENCY_ON",
      "Lesson status remains completed: true"
    );

    // 3.2 Idempotent Repeated OFF Toggles (Repeat completed: false 5 times)
    console.log(`  Testing idempotent repeated OFF toggles on lesson ${idempotencyLesson.slug}...`);
    for (let i = 1; i <= 5; i++) {
      const res = await postLessonProgressHandler(
        makeReq("http://localhost:3000/api/progress/lesson", "POST", concCookie, {
          lessonId: idempotencyLesson.id,
          completed: false,
        })
      );
      assert(
        res.status === 200,
        "IDEMPOTENCY_OFF",
        `Repeated OFF toggle #${i} returns HTTP 200`,
        { expected: "200", actual: `${res.status}` }
      );
    }

    const lessonRowsAfterOff = await prisma.lessonProgress.findMany({
      where: { userId: concUserId, lessonId: idempotencyLesson.id },
    });
    assert(
      lessonRowsAfterOff.length === 1,
      "IDEMPOTENCY_OFF",
      "Exactly 1 row in LessonProgress after 5 repeated OFF toggles",
      { expected: "1", actual: `${lessonRowsAfterOff.length}` }
    );
    assert(
      lessonRowsAfterOff[0].completed === false,
      "IDEMPOTENCY_OFF",
      "Lesson status correctly set to completed: false"
    );

    // 3.3 Rapid Alternating Toggle Sequence (11 Rapid Flips)
    console.log(`  Testing rapid alternating toggle sequence (11 flips)...`);
    const toggleSequence = [
      true, false, true, false, true, false, true, false, true, false, true
    ];
    // Sequence ends on 'true'

    for (let i = 0; i < toggleSequence.length; i++) {
      const targetState = toggleSequence[i];
      const res = await postLessonProgressHandler(
        makeReq("http://localhost:3000/api/progress/lesson", "POST", concCookie, {
          lessonId: idempotencyLesson.id,
          completed: targetState,
        })
      );
      assert(
        res.status === 200,
        "RAPID_FLIP",
        `Rapid flip #${i + 1} (${targetState ? "ON" : "OFF"}) returns HTTP 200`
      );
    }

    // State convergence check
    const finalLessonDb = await prisma.lessonProgress.findUnique({
      where: {
        userId_lessonId: {
          userId: concUserId,
          lessonId: idempotencyLesson.id,
        },
      },
    });
    assert(
      finalLessonDb?.completed === true,
      "RAPID_FLIP",
      "Lesson state converged to expected final state (completed: true)",
      { expected: "true", actual: `${finalLessonDb?.completed}` }
    );

    // 3.4 Exercise Attempts & Code Resubmission
    console.log(`  Testing Exercise code resubmission & attempt counter...`);
    const testEx = allExercises[4];

    // Attempt 1
    const exRes1 = await postExerciseProgressHandler(
      makeReq("http://localhost:3000/api/progress/exercise", "POST", concCookie, {
        exerciseId: testEx.id,
        completed: true,
        code: "print('Attempt 1')",
      })
    );
    assert(exRes1.status === 200, "EXERCISE_ATTEMPT", "Exercise Attempt 1 returns HTTP 200");

    const exDb1 = await prisma.exerciseProgress.findUnique({
      where: { userId_exerciseId: { userId: concUserId, exerciseId: testEx.id } },
    });
    assert(exDb1?.attempts === 1, "EXERCISE_ATTEMPT", "Exercise attempts = 1 after first submission");
    assert(exDb1?.submittedAnswer === "print('Attempt 1')", "EXERCISE_ATTEMPT", "Exercise code answer matches Attempt 1");

    // Attempt 2 (update code)
    const exRes2 = await postExerciseProgressHandler(
      makeReq("http://localhost:3000/api/progress/exercise", "POST", concCookie, {
        exerciseId: testEx.id,
        completed: true,
        code: "print('Attempt 2 - Refactored')",
      })
    );
    assert(exRes2.status === 200, "EXERCISE_ATTEMPT", "Exercise Attempt 2 returns HTTP 200");

    const exDb2 = await prisma.exerciseProgress.findUnique({
      where: { userId_exerciseId: { userId: concUserId, exerciseId: testEx.id } },
    });
    assert(exDb2?.attempts === 2, "EXERCISE_ATTEMPT", "Exercise attempts incremented to 2", {
      expected: "2",
      actual: `${exDb2?.attempts}`,
    });
    assert(
      exDb2?.submittedAnswer === "print('Attempt 2 - Refactored')",
      "EXERCISE_ATTEMPT",
      "Exercise code answer updated to Attempt 2"
    );

    // Untoggle exercise
    const exResOff = await postExerciseProgressHandler(
      makeReq("http://localhost:3000/api/progress/exercise", "POST", concCookie, {
        exerciseId: testEx.id,
        completed: false,
      })
    );
    assert(exResOff.status === 200, "EXERCISE_ATTEMPT", "Untoggling exercise returns HTTP 200");
    const exDbOff = await prisma.exerciseProgress.findUnique({
      where: { userId_exerciseId: { userId: concUserId, exerciseId: testEx.id } },
    });
    assert(exDbOff?.completed === false, "EXERCISE_ATTEMPT", "Exercise completed set to false");
    assert(exDbOff?.score === 0, "EXERCISE_ATTEMPT", "Exercise score set to 0 when completed: false");

    // -------------------------------------------------------------------------
    // 4. SECTION 4: RESUME POINTER INTEGRITY ACROSS FLOWS
    // -------------------------------------------------------------------------
    console.log("\n--- 4. Section 4: Resume Pointer Integrity Across Flows ---");

    // When completing lesson 50, lastLessonId should update to lesson 50
    const lesson50 = allLessons[49];
    await postLessonProgressHandler(
      makeReq("http://localhost:3000/api/progress/lesson", "POST", concCookie, {
        lessonId: lesson50.id,
        completed: true,
      })
    );

    const courseProgAfter50 = await prisma.courseProgress.findUnique({
      where: { userId_courseId: { userId: concUserId, courseId: course.id } },
    });
    assert(
      courseProgAfter50?.lastLessonId === lesson50.id,
      "RESUME_POINTER",
      `lastLessonId updated to lesson 50 (${lesson50.slug}) upon completion`,
      { expected: lesson50.id, actual: `${courseProgAfter50?.lastLessonId}` }
    );

    // When untoggling an earlier lesson (e.g. lesson 1), lastLessonId must NOT be corrupted
    const lesson1 = allLessons[0];
    await postLessonProgressHandler(
      makeReq("http://localhost:3000/api/progress/lesson", "POST", concCookie, {
        lessonId: lesson1.id,
        completed: false,
      })
    );

    const courseProgAfterUntoggle = await prisma.courseProgress.findUnique({
      where: { userId_courseId: { userId: concUserId, courseId: course.id } },
    });
    assert(
      courseProgAfterUntoggle?.lastLessonId === lesson50.id,
      "RESUME_POINTER",
      `lastLessonId strictly preserved at lesson 50 when untoggling an earlier lesson`,
      { expected: lesson50.id, actual: `${courseProgAfterUntoggle?.lastLessonId}` }
    );

  } catch (criticalErr) {
    console.error("💥 CRITICAL SUITE FAILURE:", criticalErr);
    stats.failed++;
    failures.push({
      category: "CRITICAL_CRASH",
      test: "Adversarial Suite Execution",
      error: String(criticalErr),
      expected: "Clean test execution",
      actual: "Unhandled Exception",
    });
  } finally {
    // -------------------------------------------------------------------------
    // 5. CLEAN TEARDOWN & USER ISOLATION
    // -------------------------------------------------------------------------
    console.log("\n--- 5. Clean Teardown & Isolation ---");
    for (const uid of createdUserIds) {
      try {
        await prisma.user.delete({ where: { id: uid } });
        console.log(`  🧹 Cleaned up test user: ${uid}`);
      } catch (cleanErr) {
        console.warn(`  ⚠️ Warning: Failed to clean up user ${uid}:`, cleanErr);
      }
    }
    await prisma.$disconnect();
  }

  // ---------------------------------------------------------------------------
  // Summary & Verdict
  // ---------------------------------------------------------------------------
  console.log("\n================================================================================");
  console.log(`📊 ADVERSARIAL STRESS TEST SUMMARY: ${stats.passed} PASSED | ${stats.failed} FAILED (Total: ${stats.total})`);
  const verdict = stats.failed === 0 ? "APPROVE" : "REJECT";
  console.log(`🏆 EMPIRICAL VERDICT: ${verdict}`);
  console.log("================================================================================");

  if (failures.length > 0) {
    console.error("\n❌ RECORDED FAILURES:");
    failures.forEach((f, idx) => {
      console.error(`  ${idx + 1}. [${f.category}] ${f.test}: ${f.error}`);
      console.error(`     Expected: ${f.expected} | Actual: ${f.actual}`);
    });
    process.exit(1);
  }
}

runAdversarialM4Challenger().catch((err) => {
  console.error("FATAL ERROR IN ADVERSARIAL SUITE:", err);
  process.exit(1);
});
