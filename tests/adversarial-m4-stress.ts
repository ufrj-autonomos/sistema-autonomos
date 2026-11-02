// ==============================================================================
// 🧪 ADVERSARIAL STRESS TEST HARNESS — MILESTONE 4
//    Progress Persistence, Mathematical Recalculation & Resume Pointer Invariance
// Agent: m4_challenger_2
// Target: /home/gaspar/projetos/autonomos/sistema-autonomos
// ==============================================================================

import { NextRequest } from "next/server";
import { prisma } from "../src/lib/prisma";

// API Handlers
import { POST as registerHandler } from "../src/app/api/auth/register/route";
import { GET as getProgressHandler } from "../src/app/api/progress/ros2-jazzy/route";
import { POST as postLessonProgressHandler } from "../src/app/api/progress/lesson/route";
import { POST as postExerciseProgressHandler } from "../src/app/api/progress/exercise/route";

async function runAdversarialM4Stress() {
  console.log("================================================================================");
  console.log("🔥 EMPIRICAL ADVERSARIAL STRESS TEST SUITE — MILESTONE 4");
  console.log("   Boundary Values, Mathematical Recalculation, Resume Invariance & ROS 2 Code");
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

  const timestamp = Date.now();
  const testUserAEmail = `adv_m4_math_${timestamp}@autonomos.ufrj.br`;
  const testUserBEmail = `adv_m4_pointer_${timestamp}@autonomos.ufrj.br`;
  const testUserCEmail = `adv_m4_exfirst_${timestamp}@autonomos.ufrj.br`;
  const testPassword = "AdversarialPassword2026!";

  let userAId = "";
  let userBId = "";
  let userCId = "";
  let userACookie = "";
  let userBCookie = "";
  let userCCookie = "";

  const createdUserIds: string[] = [];

  try {
    // -----------------------------------------------------------------
    // 0. Curriculum Setup & Validation
    // -----------------------------------------------------------------
    console.log("--- 0. Database Baseline Validation ---");
    const course = await prisma.course.findFirst({
      where: { slug: "ros2-jazzy" },
      include: {
        modules: {
          orderBy: { orderIndex: "asc" },
          include: {
            lessons: {
              orderBy: { orderIndex: "asc" },
              include: { exercises: { orderBy: { orderIndex: "asc" } } },
            },
          },
        },
      },
    });

    assert(!!course, "Target Course 'ros2-jazzy' exists in database");
    if (!course) throw new Error("Course not found in database");

    const allLessons = course.modules.flatMap((m) => m.lessons);
    const allExercises = allLessons.flatMap((l) => l.exercises);

    assert(allLessons.length === 108, `Exactly 108 lessons found in curriculum (found: ${allLessons.length})`);
    assert(allExercises.length === 13, `Exactly 13 exercises found in curriculum (found: ${allExercises.length})`);
    assert(
      allLessons.length + allExercises.length === 121,
      `Total trackable curriculum units exactly 121 (found: ${allLessons.length + allExercises.length})`
    );

    // -----------------------------------------------------------------
    // TEST GROUP 1: Mathematical Recalculation & Boundary Value Testing
    // (User A)
    // -----------------------------------------------------------------
    console.log("\n--- TEST GROUP 1: Mathematical Recalculation & Boundary Values (User A) ---");

    // 1.1 Register User A
    const regReqA = new NextRequest("http://localhost:3000/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: testUserAEmail,
        name: "User A Math Challenger",
        password: testPassword,
      }),
    });
    const regResA = await registerHandler(regReqA);
    assert(regResA.status === 201, `User A registered successfully (HTTP 201)`);
    const regJsonA = await regResA.json();
    userAId = regJsonA.user.id;
    createdUserIds.push(userAId);

    const tokenMatchA = (regResA.headers.get("set-cookie") || "").match(/autonomos_session=([^;]+)/);
    userACookie = `autonomos_session=${tokenMatchA ? tokenMatchA[1] : ""}`;

    // 1.2 Boundary 0: 0 completed items -> exactly 0%
    const getProg0Req = new NextRequest("http://localhost:3000/api/progress/ros2-jazzy", {
      headers: { cookie: userACookie },
    });
    const getProg0Res = await getProgressHandler(getProg0Req);
    assert(getProg0Res.status === 200, "GET /api/progress/ros2-jazzy returns HTTP 200 for User A");
    const getProg0Json = await getProg0Res.json();
    assert(getProg0Json.overallPercentage === 0, `Boundary 0: overallPercentage === 0% (actual: ${getProg0Json.overallPercentage}%)`);
    assert(getProg0Json.completedLessonIds.length === 0, "Boundary 0: completedLessonIds is empty");
    assert(getProg0Json.completedExerciseIds.length === 0, "Boundary 0: completedExerciseIds is empty");

    const courseProgDb0 = await prisma.courseProgress.findUnique({
      where: { userId_courseId: { userId: userAId, courseId: course.id } },
    });
    assert(courseProgDb0?.percentage === 0.0, "Boundary 0 DB: CourseProgress.percentage === 0.0");
    assert(courseProgDb0?.isCompleted === false, "Boundary 0 DB: CourseProgress.isCompleted === false");
    assert(courseProgDb0?.completedAt === null, "Boundary 0 DB: CourseProgress.completedAt === null");

    // 1.3 Boundary 1: 1 completed item -> round(1/121 * 100) = 1%
    const mark1Req = new NextRequest("http://localhost:3000/api/progress/lesson", {
      method: "POST",
      headers: { "Content-Type": "application/json", cookie: userACookie },
      body: JSON.stringify({ lessonId: allLessons[0].id, completed: true }),
    });
    const mark1Res = await postLessonProgressHandler(mark1Req);
    assert(mark1Res.status === 200, "POST /api/progress/lesson for Lesson 1 returns HTTP 200");
    const mark1Json = await mark1Res.json();
    assert(
      mark1Json.overallPercentage === 1,
      `Boundary 1: 1 completed item yields exactly 1% (round(1/121*100) = 1, actual: ${mark1Json.overallPercentage}%)`
    );
    assert(mark1Json.completedLessonIds.length === 1, "Boundary 1: completedLessonIds length is 1");

    const courseProgDb1 = await prisma.courseProgress.findUnique({
      where: { userId_courseId: { userId: userAId, courseId: course.id } },
    });
    assert(courseProgDb1?.percentage === 1.0, "Boundary 1 DB: CourseProgress.percentage === 1.0");
    assert(courseProgDb1?.isCompleted === false, "Boundary 1 DB: CourseProgress.isCompleted === false");

    // 1.4 Boundary 60: 60 completed items -> round(60/121 * 100) = 50%
    console.log("  ... Seeding items up to 59 units (50 lessons + 9 exercises) and completing unit 60 via API endpoint ...");
    // Batch seed Lessons 1..49 (49 lessons -> total 50 completed lessons)
    const lessonsBatch1 = allLessons.slice(1, 50).map((l) => ({
      userId: userAId,
      lessonId: l.id,
      completed: true,
      completedAt: new Date(),
    }));
    await prisma.lessonProgress.createMany({ data: lessonsBatch1 });

    // Batch seed Exercises 0..8 (9 exercises -> total 59 units)
    const exercisesBatch1 = allExercises.slice(0, 9).map((e) => ({
      userId: userAId,
      exerciseId: e.id,
      completed: true,
      passed: true,
      score: 10,
      attempts: 1,
    }));
    await prisma.exerciseProgress.createMany({ data: exercisesBatch1 });

    // Complete the 60th unit (Exercise 10) directly via POST /api/progress/exercise
    const mark60Req = new NextRequest("http://localhost:3000/api/progress/exercise", {
      method: "POST",
      headers: { "Content-Type": "application/json", cookie: userACookie },
      body: JSON.stringify({
        exerciseId: allExercises[9].id,
        completed: true,
        code: "# Unit 60 - Exercise 10 completion",
      }),
    });
    const mark60Res = await postExerciseProgressHandler(mark60Req);
    assert(mark60Res.status === 200, "POST /api/progress/exercise for 60th unit returns HTTP 200");
    const mark60Json = await mark60Res.json();

    // 60/121 * 100 = 49.58677... -> Math.round is 50%
    assert(
      mark60Json.overallPercentage === 50,
      `Boundary 60: 60 completed items yields exactly 50% (round(60/121*100) = 50, actual: ${mark60Json.overallPercentage}%)`
    );

    const courseProgDb60 = await prisma.courseProgress.findUnique({
      where: { userId_courseId: { userId: userAId, courseId: course.id } },
    });
    assert(courseProgDb60?.percentage === 50.0, "Boundary 60 DB: CourseProgress.percentage === 50.0");
    assert(courseProgDb60?.isCompleted === false, "Boundary 60 DB: CourseProgress.isCompleted === false");
    assert(courseProgDb60?.completedAt === null, "Boundary 60 DB: CourseProgress.completedAt === null");

    // 1.5 Boundary 121: 121 completed items (all 108 lessons + all 13 exercises) -> exactly 100% and isCompleted = true
    console.log("  ... Seeding items up to 120 units and completing 121st unit via API endpoint ...");
    // Batch seed Lessons 50..106 (57 lessons -> 107 lessons total)
    const lessonsBatch2 = allLessons.slice(50, 107).map((l) => ({
      userId: userAId,
      lessonId: l.id,
      completed: true,
      completedAt: new Date(),
    }));
    await prisma.lessonProgress.createMany({ data: lessonsBatch2 });

    // Batch seed Exercises 10..12 (3 exercises -> all 13 exercises complete)
    // Total units so far: 107 lessons + 13 exercises = 120 units!
    const exercisesBatch2 = allExercises.slice(10, 13).map((e) => ({
      userId: userAId,
      exerciseId: e.id,
      completed: true,
      passed: true,
      score: 10,
      attempts: 1,
    }));
    await prisma.exerciseProgress.createMany({ data: exercisesBatch2 });

    // Complete the 121st unit (Lesson 108) via POST /api/progress/lesson
    const mark121Req = new NextRequest("http://localhost:3000/api/progress/lesson", {
      method: "POST",
      headers: { "Content-Type": "application/json", cookie: userACookie },
      body: JSON.stringify({ lessonId: allLessons[107].id, completed: true }),
    });
    const mark121Res = await postLessonProgressHandler(mark121Req);
    assert(mark121Res.status === 200, "POST /api/progress/lesson for 121st unit returns HTTP 200");
    const mark121Json = await mark121Res.json();

    assert(
      mark121Json.overallPercentage === 100,
      `Boundary 121: 121 completed items yields exactly 100% (actual: ${mark121Json.overallPercentage}%)`
    );
    assert(
      mark121Json.completedLessonIds.length === 108,
      `Boundary 121: completedLessonIds contains all 108 lessons (actual: ${mark121Json.completedLessonIds.length})`
    );
    assert(
      mark121Json.completedExerciseIds.length === 13,
      `Boundary 121: completedExerciseIds contains all 13 exercises (actual: ${mark121Json.completedExerciseIds.length})`
    );

    const courseProgDb121 = await prisma.courseProgress.findUnique({
      where: { userId_courseId: { userId: userAId, courseId: course.id } },
    });
    assert(courseProgDb121?.percentage === 100.0, "Boundary 121 DB: CourseProgress.percentage === 100.0");
    assert(courseProgDb121?.isCompleted === true, "Boundary 121 DB: CourseProgress.isCompleted === true");
    assert(courseProgDb121?.completedAt !== null, "Boundary 121 DB: CourseProgress.completedAt is not null");

    // Verify GET /api/progress/ros2-jazzy returns 100% and complete arrays
    const getProg121Req = new NextRequest("http://localhost:3000/api/progress/ros2-jazzy", {
      headers: { cookie: userACookie },
    });
    const getProg121Res = await getProgressHandler(getProg121Req);
    const getProg121Json = await getProg121Res.json();
    assert(getProg121Json.overallPercentage === 100, "GET /api/progress/ros2-jazzy returns 100% at full completion");
    assert(getProg121Json.completedLessonIds.length === 108, "GET confirms all 108 lessons completed");
    assert(getProg121Json.completedExerciseIds.length === 13, "GET confirms all 13 exercises completed");

    // 1.6 Boundary Untoggling: 121 -> 120 items -> drops to 99% and isCompleted = false
    console.log("  ... Untoggling Lesson 108 (121 -> 120 completed units) ...");
    const untoggle108Req = new NextRequest("http://localhost:3000/api/progress/lesson", {
      method: "POST",
      headers: { "Content-Type": "application/json", cookie: userACookie },
      body: JSON.stringify({ lessonId: allLessons[107].id, completed: false }),
    });
    const untoggle108Res = await postLessonProgressHandler(untoggle108Req);
    assert(untoggle108Res.status === 200, "POST /api/progress/lesson untoggle returns HTTP 200");
    const untoggle108Json = await untoggle108Res.json();

    // 120/121 * 100 = 99.1735... -> Math.round is 99%
    assert(
      untoggle108Json.overallPercentage === 99,
      `Untoggle 121->120: overallPercentage drops to 99% (round(120/121*100) = 99, actual: ${untoggle108Json.overallPercentage}%)`
    );
    assert(
      untoggle108Json.completedLessonIds.length === 107,
      `Untoggle 121->120: completedLessonIds length is 107 (actual: ${untoggle108Json.completedLessonIds.length})`
    );

    const courseProgDb120 = await prisma.courseProgress.findUnique({
      where: { userId_courseId: { userId: userAId, courseId: course.id } },
    });
    assert(courseProgDb120?.percentage === 99.0, "Untoggle 121->120 DB: CourseProgress.percentage === 99.0");
    assert(courseProgDb120?.isCompleted === false, "Untoggle 121->120 DB: CourseProgress.isCompleted === false");
    assert(courseProgDb120?.completedAt === null, "Untoggle 121->120 DB: CourseProgress.completedAt reset to null");

    // 1.7 Boundary Untoggling: 120 -> 119 items (untoggle Exercise 13)
    console.log("  ... Untoggling Exercise 13 (120 -> 119 completed units) ...");
    const untoggleEx13Req = new NextRequest("http://localhost:3000/api/progress/exercise", {
      method: "POST",
      headers: { "Content-Type": "application/json", cookie: userACookie },
      body: JSON.stringify({ exerciseId: allExercises[12].id, completed: false }),
    });
    const untoggleEx13Res = await postExerciseProgressHandler(untoggleEx13Req);
    assert(untoggleEx13Res.status === 200, "POST /api/progress/exercise untoggle returns HTTP 200");
    const untoggleEx13Json = await untoggleEx13Res.json();

    // 119/121 * 100 = 98.347... -> Math.round is 98%
    assert(
      untoggleEx13Json.overallPercentage === 98,
      `Untoggle 120->119: overallPercentage drops to 98% (round(119/121*100) = 98, actual: ${untoggleEx13Json.overallPercentage}%)`
    );
    assert(
      untoggleEx13Json.completedExerciseIds.length === 12,
      `Untoggle 120->119: completedExerciseIds length is 12 (actual: ${untoggleEx13Json.completedExerciseIds.length})`
    );

    const courseProgDb119 = await prisma.courseProgress.findUnique({
      where: { userId_courseId: { userId: userAId, courseId: course.id } },
    });
    assert(courseProgDb119?.percentage === 98.0, "Untoggle 120->119 DB: CourseProgress.percentage === 98.0");
    assert(courseProgDb119?.isCompleted === false, "Untoggle 120->119 DB: CourseProgress.isCompleted === false");

    // 1.8 Re-complete back to 121 items
    console.log("  ... Re-completing Lesson 108 and Exercise 13 (119 -> 121 units) ...");
    await postLessonProgressHandler(
      new NextRequest("http://localhost:3000/api/progress/lesson", {
        method: "POST",
        headers: { "Content-Type": "application/json", cookie: userACookie },
        body: JSON.stringify({ lessonId: allLessons[107].id, completed: true }),
      })
    );
    const reCompleteExRes = await postExerciseProgressHandler(
      new NextRequest("http://localhost:3000/api/progress/exercise", {
        method: "POST",
        headers: { "Content-Type": "application/json", cookie: userACookie },
        body: JSON.stringify({ exerciseId: allExercises[12].id, completed: true }),
      })
    );
    const reCompleteExJson = await reCompleteExRes.json();
    assert(reCompleteExJson.overallPercentage === 100, "Re-toggle to 121 units restores 100% overallPercentage");

    const courseProgDbRestored = await prisma.courseProgress.findUnique({
      where: { userId_courseId: { userId: userAId, courseId: course.id } },
    });
    assert(courseProgDbRestored?.isCompleted === true, "Re-toggle DB: CourseProgress.isCompleted restored to true");
    assert(courseProgDbRestored?.completedAt !== null, "Re-toggle DB: CourseProgress.completedAt restored to non-null");

    // -----------------------------------------------------------------
    // TEST GROUP 2: Resume Pointer (lastAccessedLessonId) Invariance
    // (User B)
    // -----------------------------------------------------------------
    console.log("\n--- TEST GROUP 2: Resume Pointer (lastAccessedLessonId) Invariance (User B) ---");

    // 2.1 Register User B
    const regReqB = new NextRequest("http://localhost:3000/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: testUserBEmail,
        name: "User B Pointer Challenger",
        password: testPassword,
      }),
    });
    const regResB = await registerHandler(regReqB);
    assert(regResB.status === 201, `User B registered successfully (HTTP 201)`);
    const regJsonB = await regResB.json();
    userBId = regJsonB.user.id;
    createdUserIds.push(userBId);

    const tokenMatchB = (regResB.headers.get("set-cookie") || "").match(/autonomos_session=([^;]+)/);
    userBCookie = `autonomos_session=${tokenMatchB ? tokenMatchB[1] : ""}`;

    // Select distinct test fixtures across curriculum
    const lesson10 = allLessons[9];   // Lesson 10
    const lesson50 = allLessons[49];  // Lesson 50 (furthest progress)
    const lesson75 = allLessons[74];  // Lesson 75 (navigation target)
    const exercise1 = allExercises[0]; // Exercise in early lesson

    // 2.2 User completes Lesson 10 and then Lesson 50
    await postLessonProgressHandler(
      new NextRequest("http://localhost:3000/api/progress/lesson", {
        method: "POST",
        headers: { "Content-Type": "application/json", cookie: userBCookie },
        body: JSON.stringify({ lessonId: lesson10.id, completed: true }),
      })
    );
    const markL50Res = await postLessonProgressHandler(
      new NextRequest("http://localhost:3000/api/progress/lesson", {
        method: "POST",
        headers: { "Content-Type": "application/json", cookie: userBCookie },
        body: JSON.stringify({ lessonId: lesson50.id, completed: true }),
      })
    );
    const markL50Json = await markL50Res.json();
    assert(markL50Json.lastAccessedLessonId === lesson50.id, `lastAccessedLessonId set to Lesson 50 ID (${lesson50.id})`);

    const courseProgB1 = await prisma.courseProgress.findUnique({
      where: { userId_courseId: { userId: userBId, courseId: course.id } },
    });
    assert(courseProgB1?.lastLessonId === lesson50.id, `DB: CourseProgress.lastLessonId is Lesson 50 ID`);

    // 2.3 Untoggling a previous lesson does NOT overwrite or erase lastLessonId
    console.log("  ... Untoggling Lesson 10 (completed: false) while lastLessonId is Lesson 50 ...");
    const untoggleL10Res = await postLessonProgressHandler(
      new NextRequest("http://localhost:3000/api/progress/lesson", {
        method: "POST",
        headers: { "Content-Type": "application/json", cookie: userBCookie },
        body: JSON.stringify({ lessonId: lesson10.id, completed: false }),
      })
    );
    const untoggleL10Json = await untoggleL10Res.json();
    assert(
      untoggleL10Json.lastAccessedLessonId === lesson50.id,
      `API Response: untoggling Lesson 10 preserves lastAccessedLessonId at Lesson 50 (expected: ${lesson50.id}, actual: ${untoggleL10Json.lastAccessedLessonId})`
    );

    const courseProgB2 = await prisma.courseProgress.findUnique({
      where: { userId_courseId: { userId: userBId, courseId: course.id } },
    });
    assert(
      courseProgB2?.lastLessonId === lesson50.id,
      `DB Invariance: CourseProgress.lastLessonId strictly preserved at Lesson 50 after untoggling Lesson 10`
    );

    // 2.4 Completing an exercise does NOT erase or overwrite lastLessonId
    console.log("  ... Completing Exercise 1 while lastLessonId is Lesson 50 ...");
    const markEx1Res = await postExerciseProgressHandler(
      new NextRequest("http://localhost:3000/api/progress/exercise", {
        method: "POST",
        headers: { "Content-Type": "application/json", cookie: userBCookie },
        body: JSON.stringify({
          exerciseId: exercise1.id,
          completed: true,
          code: "# Exercise 1 completed code",
        }),
      })
    );
    assert(markEx1Res.status === 200, "POST /api/progress/exercise returns HTTP 200");

    const courseProgB3 = await prisma.courseProgress.findUnique({
      where: { userId_courseId: { userId: userBId, courseId: course.id } },
    });
    assert(
      courseProgB3?.lastLessonId === lesson50.id,
      `DB Invariance: CourseProgress.lastLessonId strictly preserved at Lesson 50 after completing Exercise 1`
    );

    // 2.5 Untoggling an exercise does NOT erase lastLessonId
    console.log("  ... Untoggling Exercise 1 while lastLessonId is Lesson 50 ...");
    await postExerciseProgressHandler(
      new NextRequest("http://localhost:3000/api/progress/exercise", {
        method: "POST",
        headers: { "Content-Type": "application/json", cookie: userBCookie },
        body: JSON.stringify({ exerciseId: exercise1.id, completed: false }),
      })
    );
    const courseProgB4 = await prisma.courseProgress.findUnique({
      where: { userId_courseId: { userId: userBId, courseId: course.id } },
    });
    assert(
      courseProgB4?.lastLessonId === lesson50.id,
      `DB Invariance: CourseProgress.lastLessonId strictly preserved at Lesson 50 after untoggling Exercise 1`
    );

    // 2.6 Navigating across lessons preserves the latest visited lesson pointer
    console.log("  ... Navigating to Lesson 75 (simulating page visit upsert) ...");
    // This replicates the server action in src/app/(ensino)/curso/[lessonId]/page.tsx:202
    await prisma.courseProgress.upsert({
      where: { userId_courseId: { userId: userBId, courseId: course.id } },
      update: { lastLessonId: lesson75.id },
      create: {
        userId: userBId,
        courseId: course.id,
        lastLessonId: lesson75.id,
        totalLessonsCount: allLessons.length,
      },
    });

    const getProgNavReq = new NextRequest("http://localhost:3000/api/progress/ros2-jazzy", {
      headers: { cookie: userBCookie },
    });
    const getProgNavRes = await getProgressHandler(getProgNavReq);
    const getProgNavJson = await getProgNavRes.json();
    assert(
      getProgNavJson.lastAccessedLessonId === lesson75.id,
      `Navigating across lessons updates lastAccessedLessonId to Lesson 75 ID (${lesson75.id})`
    );

    // Subsequent untoggle of Lesson 50 preserves Lesson 75 pointer
    await postLessonProgressHandler(
      new NextRequest("http://localhost:3000/api/progress/lesson", {
        method: "POST",
        headers: { "Content-Type": "application/json", cookie: userBCookie },
        body: JSON.stringify({ lessonId: lesson50.id, completed: false }),
      })
    );
    const courseProgB5 = await prisma.courseProgress.findUnique({
      where: { userId_courseId: { userId: userBId, courseId: course.id } },
    });
    assert(
      courseProgB5?.lastLessonId === lesson75.id,
      `DB Invariance: CourseProgress.lastLessonId remains Lesson 75 even when Lesson 50 is untoggled`
    );

    // -----------------------------------------------------------------
    // TEST GROUP 3: Exercise Code Submission & Score Persistence
    // (User B)
    // -----------------------------------------------------------------
    console.log("\n--- TEST GROUP 3: Realistic ROS 2 Code Submission & Attempts Counter (User B) ---");

    const exercise2 = allExercises[1]; // Use Exercise 2 for multi-attempt testing
    assert(!!exercise2, "Exercise 2 exists for code submission test fixture");

    const realisticPythonRos2Code = `#!/usr/bin/env python3
import rclpy
from rclpy.node import Node
from std_msgs.msg import String
from rclpy.qos import QoSProfile, ReliabilityPolicy, HistoryPolicy

class JazzyTelemetryPublisher(Node):
    """Adversarial ROS 2 Jazzy node for autonomous telemetry publishing."""
    def __init__(self):
        super().__init__('jazzy_telemetry_pub')
        qos_profile = QoSProfile(
            reliability=ReliabilityPolicy.BEST_EFFORT,
            history=HistoryPolicy.KEEP_LAST,
            depth=10
        )
        self.publisher_ = self.create_publisher(String, '/autonomos/telemetry', qos_profile)
        self.timer_ = self.create_timer(0.5, self.timer_callback)
        self.packet_count_ = 0
        self.get_logger().info('JazzyTelemetryPublisher node initialized with BestEffort QoS.')

    def timer_callback(self):
        msg = String()
        msg.data = f'UFRJ_AUTONOMOS_JAZZY:seq={self.packet_count_}:status=NOMINAL'
        self.publisher_.publish(msg)
        self.packet_count_ += 1

def main(args=None):
    rclpy.init(args=args)
    node = JazzyTelemetryPublisher()
    try:
        rclpy.spin(node)
    except KeyboardInterrupt:
        pass
    finally:
        node.destroy_node()
        rclpy.shutdown()

if __name__ == '__main__':
    main()
`;

    // 3.1 Initial Code Submission (Attempt 1)
    console.log("  ... Submitting realistic ROS 2 Python code (Attempt 1) ...");
    const sub1Req = new NextRequest("http://localhost:3000/api/progress/exercise", {
      method: "POST",
      headers: { "Content-Type": "application/json", cookie: userBCookie },
      body: JSON.stringify({
        exerciseId: exercise2.id,
        completed: true,
        code: realisticPythonRos2Code,
      }),
    });
    const sub1Res = await postExerciseProgressHandler(sub1Req);
    assert(sub1Res.status === 200, "POST /api/progress/exercise (Attempt 1) returns HTTP 200");
    const sub1Json = await sub1Res.json();
    assert(sub1Json.success === true, "Response reports success: true");
    assert(sub1Json.completed === true, "Response reports completed: true");

    const exProgDb1 = await prisma.exerciseProgress.findUnique({
      where: { userId_exerciseId: { userId: userBId, exerciseId: exercise2.id } },
    });
    assert(!!exProgDb1, "ExerciseProgress row created in DB");
    assert(exProgDb1?.submittedAnswer === realisticPythonRos2Code, "ExerciseProgress.submittedAnswer matches realistic ROS 2 Python code verbatim");
    assert(exProgDb1?.attempts === 1, `ExerciseProgress.attempts === 1 on initial submission (actual: ${exProgDb1?.attempts})`);
    assert(exProgDb1?.completed === true, "ExerciseProgress.completed === true");
    assert(exProgDb1?.passed === true, "ExerciseProgress.passed === true");
    assert(exProgDb1?.score === (exercise2.points || 10), `ExerciseProgress.score matches exercise points (${exercise2.points || 10})`);

    // 3.2 Second Attempt: Re-submission with updated C++ ROS 2 code
    console.log("  ... Submitting second attempt with ROS 2 Jazzy C++ code (Attempt 2) ...");
    const realisticCppRos2Code = `// ROS 2 Jazzy Jalisco - Autonomous C++ Subscriber
#include <memory>
#include "rclcpp/rclcpp.hpp"
#include "std_msgs/msg/string.hpp"

class JazzyTelemetrySubscriber : public rclcpp::Node {
public:
  JazzyTelemetrySubscriber() : Node("jazzy_telemetry_sub") {
    auto qos = rclcpp::QoS(rclcpp::KeepLast(10)).best_effort();
    subscription_ = this->create_subscription<std_msgs::msg::String>(
      "/autonomos/telemetry", qos,
      std::bind(&JazzyTelemetrySubscriber::topic_callback, this, std::placeholders::_1)
    );
    RCLCPP_INFO(this->get_logger(), "JazzyTelemetrySubscriber listening on /autonomos/telemetry");
  }

private:
  void topic_callback(const std_msgs::msg::String & msg) const {
    RCLCPP_INFO(this->get_logger(), "Received Autonomous Telemetry: '%s'", msg.data.c_str());
  }
  rclcpp::Subscription<std_msgs::msg::String>::SharedPtr subscription_;
};

int main(int argc, char * argv[]) {
  rclcpp::init(argc, argv);
  rclcpp::spin(std::make_shared<JazzyTelemetrySubscriber>());
  rclcpp::shutdown();
  return 0;
}
`;

    const sub2Req = new NextRequest("http://localhost:3000/api/progress/exercise", {
      method: "POST",
      headers: { "Content-Type": "application/json", cookie: userBCookie },
      body: JSON.stringify({
        exerciseId: exercise2.id,
        completed: true,
        code: realisticCppRos2Code,
      }),
    });
    const sub2Res = await postExerciseProgressHandler(sub2Req);
    assert(sub2Res.status === 200, "POST /api/progress/exercise (Attempt 2) returns HTTP 200");

    const exProgDb2 = await prisma.exerciseProgress.findUnique({
      where: { userId_exerciseId: { userId: userBId, exerciseId: exercise2.id } },
    });
    assert(exProgDb2?.submittedAnswer === realisticCppRos2Code, "ExerciseProgress.submittedAnswer successfully updated to C++ code");
    assert(exProgDb2?.attempts === 2, `ExerciseProgress.attempts incremented to 2 (actual: ${exProgDb2?.attempts})`);

    // 3.3 Third Attempt: Toggle without code preserves existing submitted code
    console.log("  ... Untoggling exercise without code parameter (Attempt 3) ...");
    const sub3Req = new NextRequest("http://localhost:3000/api/progress/exercise", {
      method: "POST",
      headers: { "Content-Type": "application/json", cookie: userBCookie },
      body: JSON.stringify({
        exerciseId: exercise2.id,
        completed: false,
      }),
    });
    const sub3Res = await postExerciseProgressHandler(sub3Req);
    assert(sub3Res.status === 200, "POST /api/progress/exercise (untoggle) returns HTTP 200");

    const exProgDb3 = await prisma.exerciseProgress.findUnique({
      where: { userId_exerciseId: { userId: userBId, exerciseId: exercise2.id } },
    });
    assert(
      exProgDb3?.submittedAnswer === realisticCppRos2Code,
      "ExerciseProgress.submittedAnswer is NOT erased when code is omitted during toggle"
    );
    assert(exProgDb3?.attempts === 3, `ExerciseProgress.attempts incremented to 3 (actual: ${exProgDb3?.attempts})`);
    assert(exProgDb3?.completed === false, "ExerciseProgress.completed is false");
    assert(exProgDb3?.score === 0, "ExerciseProgress.score is 0 when untoggled");

    // -----------------------------------------------------------------
    // TEST GROUP 4: Edge Case: First Action is Completing an Exercise
    // (User C)
    // -----------------------------------------------------------------
    console.log("\n--- TEST GROUP 4: Edge Case - Fresh User Completes Exercise First (User C) ---");

    // 4.1 Register User C
    const regReqC = new NextRequest("http://localhost:3000/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: testUserCEmail,
        name: "User C Exercise First Challenger",
        password: testPassword,
      }),
    });
    const regResC = await registerHandler(regReqC);
    assert(regResC.status === 201, `User C registered successfully (HTTP 201)`);
    const regJsonC = await regResC.json();
    userCId = regJsonC.user.id;
    createdUserIds.push(userCId);

    const tokenMatchC = (regResC.headers.get("set-cookie") || "").match(/autonomos_session=([^;]+)/);
    userCCookie = `autonomos_session=${tokenMatchC ? tokenMatchC[1] : ""}`;

    // 4.2 Directly complete an exercise before any lesson access or GET call
    const exercise3 = allExercises[2];
    const exDirectReq = new NextRequest("http://localhost:3000/api/progress/exercise", {
      method: "POST",
      headers: { "Content-Type": "application/json", cookie: userCCookie },
      body: JSON.stringify({
        exerciseId: exercise3.id,
        completed: true,
        code: "# Direct exercise completion by fresh user",
      }),
    });
    const exDirectRes = await postExerciseProgressHandler(exDirectReq);
    assert(exDirectRes.status === 200, "Direct exercise completion by fresh user returns HTTP 200");
    const exDirectJson = await exDirectRes.json();
    assert(exDirectJson.overallPercentage === 1, "Overall percentage initialized to 1% (1/121 = 1%)");

    const courseProgDbC = await prisma.courseProgress.findUnique({
      where: { userId_courseId: { userId: userCId, courseId: course.id } },
    });
    assert(!!courseProgDbC, "CourseProgress created automatically upon exercise completion");
    assert(
      courseProgDbC?.lastLessonId === exercise3.lessonId,
      `CourseProgress.lastLessonId initialized to exercise's parent lesson ID (${exercise3.lessonId}) without crash`
    );
    assert(courseProgDbC?.percentage === 1.0, "CourseProgress.percentage persisted as 1.0");

    // -----------------------------------------------------------------
    // TEST GROUP 5: Malformed Inputs, Authentication & Security Boundaries
    // -----------------------------------------------------------------
    console.log("\n--- TEST GROUP 5: Adversarial Inputs & Security Verification ---");

    // 5.1 Invalid JSON body to lesson endpoint
    const badJsonLessonReq = new NextRequest("http://localhost:3000/api/progress/lesson", {
      method: "POST",
      headers: { "Content-Type": "application/json", cookie: userBCookie },
      body: "INVALID_MALFORMED_JSON{{{",
    });
    const badJsonLessonRes = await postLessonProgressHandler(badJsonLessonReq);
    assert(badJsonLessonRes.status === 400, "Malformed JSON body to /api/progress/lesson returns HTTP 400");

    // 5.2 Invalid parameter types
    const invalidTypesReq = new NextRequest("http://localhost:3000/api/progress/lesson", {
      method: "POST",
      headers: { "Content-Type": "application/json", cookie: userBCookie },
      body: JSON.stringify({ lessonId: 12345, completed: "not_a_boolean" }),
    });
    const invalidTypesRes = await postLessonProgressHandler(invalidTypesReq);
    assert(invalidTypesRes.status === 400, "Invalid parameter types to /api/progress/lesson return HTTP 400");

    // 5.3 Invalid code type to exercise endpoint
    const invalidCodeTypeReq = new NextRequest("http://localhost:3000/api/progress/exercise", {
      method: "POST",
      headers: { "Content-Type": "application/json", cookie: userBCookie },
      body: JSON.stringify({
        exerciseId: exercise2.id,
        completed: true,
        code: 999999, // Should be string
      }),
    });
    const invalidCodeTypeRes = await postExerciseProgressHandler(invalidCodeTypeReq);
    assert(invalidCodeTypeRes.status === 400, "Non-string code parameter returns HTTP 400");

    // 5.4 Forged/Tampered JWT Token
    const forgedToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.fake_signature_adversarial";
    const forgedReq = new NextRequest("http://localhost:3000/api/progress/ros2-jazzy", {
      headers: { cookie: `autonomos_session=${forgedToken}` },
    });
    const forgedRes = await getProgressHandler(forgedReq);
    assert(forgedRes.status === 401, "Forged/Tampered JWT token rejected with HTTP 401 Unauthorized");

  } catch (err) {
    console.error("❌ Exception during adversarial M4 stress tests:", err);
    failed++;
  } finally {
    // -----------------------------------------------------------------
    // TEST GROUP 6: Teardown & Database User Cleanup
    // -----------------------------------------------------------------
    console.log("\n--- TEST GROUP 6: Teardown & Database Verification of User Cleanup ---");
    for (const uid of createdUserIds) {
      try {
        const deletedUser = await prisma.user.delete({ where: { id: uid } });
        console.log(`  🧹 Cleaned up adversarial test user: ${deletedUser.email} (${uid})`);
      } catch (cleanErr) {
        console.warn(`  ⚠️ Failed to delete test user ${uid}:`, cleanErr);
      }
    }

    // Empirical verification that test users are completely deleted
    const leftoverUsers = await prisma.user.findMany({
      where: {
        email: {
          in: [testUserAEmail, testUserBEmail, testUserCEmail],
        },
      },
    });
    assert(leftoverUsers.length === 0, `DB Verification: Exactly 0 test users remaining in database (actual: ${leftoverUsers.length})`);

    await prisma.$disconnect();
  }

  console.log("\n================================================================================");
  console.log(`📊 ADVERSARIAL STRESS TEST SUMMARY: ${passed} PASSED | ${failed} FAILED`);
  console.log("================================================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runAdversarialM4Stress().catch((fatal) => {
  console.error("FATAL ERROR IN ADVERSARIAL M4 STRESS HARNESS:", fatal);
  process.exit(1);
});
