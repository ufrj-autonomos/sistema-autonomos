// ==============================================================================
// 🧪 SMOKE & INTEGRATION TEST SUITE — MILESTONE 3
//    Ensino Subsystem, Udemy Course Player, Videos, Code Block & Exercises
// Sistema Autônomos — UFRJ Autônomos
// ==============================================================================

import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { prisma } from "../src/lib/prisma";
import {
  VideoPlayer,
  buildPrivacyEnhancedEmbedUrl,
} from "../src/components/course/video-player";
import { VideoPlaceholder } from "../src/components/course/video-placeholder";
import { CodeBlock } from "../src/components/course/code-block";
import { Callout } from "../src/components/course/callout";
import { LessonContent } from "../src/components/course/lesson-content";
import {
  ExerciseCard,
  ExerciseList,
} from "../src/components/course/exercise-card";
import { CurriculumSidebar } from "../src/components/course/curriculum-sidebar";
import { CourseHeader } from "../src/components/course/course-header";
import { CoursePlayerShell } from "../src/components/course/course-player-shell";
import EnsinoCatalogPage from "../src/app/(ensino)/ensino/page";
import CoursePlayerPage, {
  generateMetadata,
} from "../src/app/(ensino)/curso/[lessonId]/page";
import EnsinoCursoRedirectPage from "../src/app/(ensino)/ensino/curso/[lessonId]/page";
import { GET as getCourseRoute } from "../src/app/api/courses/ros2-jazzy/route";
import { GET as getLessonRoute } from "../src/app/api/lessons/[id]/route";
import { NextRequest } from "next/server";

async function runM3SmokeTests() {
  console.log("================================================================================");
  console.log("🧪 SMOKE & INTEGRATION TEST SUITE — MILESTONE 3");
  console.log("   Ensino Subsystem: Udemy Course Player, Videos, Code & Exercises");
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

  // -----------------------------------------------------------------
  // 1. Database & Curriculum Structure Validation (Supabase PostgreSQL)
  // -----------------------------------------------------------------
  console.log("--- 1. Testing Live Database Curriculum Structure ---");
  try {
    const course = await prisma.course.findFirst({
      where: { slug: "ros2-jazzy" },
      include: {
        modules: {
          orderBy: { orderIndex: "asc" },
          include: {
            lessons: {
              orderBy: { orderIndex: "asc" },
              include: {
                exercises: { orderBy: { orderIndex: "asc" } },
              },
            },
          },
        },
      },
    });

    assert(!!course, "Course 'ros2-jazzy' exists in database");
    assert(course?.modules.length === 11, `Course has exactly 11 modules (found: ${course?.modules.length})`);

    const allLessons = course?.modules.flatMap((m) => m.lessons) || [];
    assert(allLessons.length === 108, `Course has exactly 108 lessons (found: ${allLessons.length})`);

    // Validação da sequência 1..108
    const isSequential = allLessons.every((l, idx) => l.orderIndex === idx + 1);
    assert(isSequential, "All 108 lessons have continuous orderIndex from 1 to 108");

    // Validação de distribuição de vídeos
    const availableVideos = allLessons.filter((l) => l.videoStatus === "AVAILABLE");
    const pendingVideos = allLessons.filter((l) => l.videoStatus === "PENDING");
    const textOnlyLessons = allLessons.filter((l) => l.videoStatus === "TEXT_ONLY");

    assert(availableVideos.length === 52, `Exactly 52 lessons have videoStatus AVAILABLE (found: ${availableVideos.length})`);
    assert(pendingVideos.length === 26, `Exactly 26 lessons have videoStatus PENDING (found: ${pendingVideos.length})`);
    assert(textOnlyLessons.length === 30, `Exactly 30 lessons have videoStatus TEXT_ONLY (found: ${textOnlyLessons.length})`);

    // Todos os vídeos AVAILABLE possuem youtubeVideoId não-vazio
    const allAvailableHaveVideoId = availableVideos.every(
      (l) => typeof l.youtubeVideoId === "string" && l.youtubeVideoId.length > 5
    );
    assert(allAvailableHaveVideoId, "All 52 AVAILABLE lessons have a non-empty YouTube video ID");

    // Validação de Exercícios e Capstone
    const allExercises = allLessons.flatMap((l) => l.exercises);
    assert(allExercises.length === 13, `Exactly 13 practical exercises/capstone steps seeded (found: ${allExercises.length})`);

    const totalPoints = allExercises.reduce((acc, ex) => acc + ex.points, 0);
    assert(totalPoints === 270, `Total exercise reward points equals 270 pts (found: ${totalPoints})`);

    // Lições com atividades chave:
    // Lição 31 = Atividade 01
    const lesson31 = allLessons.find((l) => l.orderIndex === 31);
    assert(lesson31?.exercises.length === 1 && lesson31.exercises[0].type === "TASK", "Lesson 31 contains Atividade 01 (TASK)");

    // Lição 44 = Atividade 02
    const lesson44 = allLessons.find((l) => l.orderIndex === 44);
    assert(
      lesson44?.exercises.length === 1 &&
      Boolean(lesson44.exercises[0].starterCode) &&
      Boolean(lesson44.exercises[0].solutionCode),
      "Lesson 44 contains Atividade 02 with starterCode and solutionCode"
    );

    // Lição 104 = Capstone Etapa 6
    const lesson104 = allLessons.find((l) => l.orderIndex === 104);
    assert(lesson104?.exercises.length === 1 && lesson104.exercises[0].points === 30, "Lesson 104 contains Capstone Etapa 6 (30 pts)");
  } catch (err) {
    assert(false, `Database curriculum check threw an exception: ${err}`);
  }

  // -----------------------------------------------------------------
  // 2. Video Player & Embed URL Verification (Requirement R4)
  // -----------------------------------------------------------------
  console.log("\n--- 2. Testing Video Player & Subtitle URL Builder ---");
  try {
    const testVideoId = "6eLTFFXoqyw";
    const embedUrl = buildPrivacyEnhancedEmbedUrl(testVideoId);

    assert(embedUrl.startsWith("https://www.youtube-nocookie.com/embed/6eLTFFXoqyw?"), "Embed URL uses youtube-nocookie.com domain");
    assert(embedUrl.includes("cc_lang_pref=pt"), "Embed URL includes 'cc_lang_pref=pt' for Portuguese subtitles");
    assert(embedUrl.includes("cc_load_policy=1"), "Embed URL includes 'cc_load_policy=1' to auto-activate subtitles");
    assert(embedUrl.includes("hl=pt-BR"), "Embed URL includes 'hl=pt-BR' Brazilian Portuguese interface");
    assert(embedUrl.includes("rel=0"), "Embed URL includes 'rel=0' to prevent unrelated video recommendations");
    assert(embedUrl.includes("modestbranding=1"), "Embed URL includes 'modestbranding=1'");
    assert(embedUrl.includes("playsinline=1"), "Embed URL includes 'playsinline=1'");

    // Componente VideoPlayer renderiza iframe válido para vídeo disponível
    const htmlAvailable = renderToStaticMarkup(
      React.createElement(VideoPlayer, {
        youtubeVideoId: "6eLTFFXoqyw",
        title: "Welcome",
        videoStatus: "available",
      })
    );
    assert(htmlAvailable.includes("iframe") && htmlAvailable.includes("6eLTFFXoqyw"), "VideoPlayer renders iframe with videoId in HTML");
    assert(htmlAvailable.includes("LEGENDAS EM PORTUGUÊS (PT-BR) ATIVADAS"), "VideoPlayer includes Portuguese subtitle badge");

    // Componente VideoPlayer chaveia para VideoPlaceholder quando pendente
    const htmlPending = renderToStaticMarkup(
      React.createElement(VideoPlayer, {
        youtubeVideoId: null,
        title: "Awaiting Video",
        videoStatus: "pending",
      })
    );
    assert(htmlPending.includes("Vídeo em Gravação") && htmlPending.includes("Harpia"), "VideoPlayer automatically falls back to VideoPlaceholder when pending");

    // Componente VideoPlayer chaveia para Card Teórico quando text_only
    const htmlTextOnly = renderToStaticMarkup(
      React.createElement(VideoPlayer, {
        youtubeVideoId: null,
        title: "Teoria do DDS",
        videoStatus: "text_only",
      })
    );
    assert(htmlTextOnly.includes("AULA TEÓRICA &amp; DOCUMENTAÇÃO TÉCNICA") || htmlTextOnly.includes("AULA TEÓRICA"), "VideoPlayer renders structured theoretical card for text_only lessons");
  } catch (err) {
    assert(false, `VideoPlayer verification failed: ${err}`);
  }

  // -----------------------------------------------------------------
  // 3. Video Placeholder Component Verification (Requirement R4)
  // -----------------------------------------------------------------
  console.log("\n--- 3. Testing Video Placeholder Component ---");
  try {
    const htmlPlaceholder = renderToStaticMarkup(
      React.createElement(VideoPlaceholder, {
        title: "Aula em Gravação",
        moduleTitle: "Módulo 05: ROS 2 Topics",
        duration: 600,
      })
    );
    assert(htmlPlaceholder.includes("Aula em Gravação"), "VideoPlaceholder renders lesson title");
    assert(htmlPlaceholder.includes("UFRJ Harpia") || htmlPlaceholder.includes("Time Harpia"), "VideoPlaceholder includes Harpia division branding");
    assert(htmlPlaceholder.includes("sem interrupções"), "VideoPlaceholder includes reassuring notice for uninterrupted study");
    assert(htmlPlaceholder.includes("Ver conteúdo e exercícios abaixo"), "VideoPlaceholder provides smooth scroll prompt to theory and exercises");
  } catch (err) {
    assert(false, `VideoPlaceholder verification failed: ${err}`);
  }

  // -----------------------------------------------------------------
  // 4. Code Block & Syntax Highlighting Verification (Requirement R3)
  // -----------------------------------------------------------------
  console.log("\n--- 4. Testing CodeBlock Syntax Highlighting ---");
  try {
    const pythonCode = `import rclpy\nfrom rclpy.node import Node\n\ndef main():\n    rclpy.init()\n    node = Node('test_node')\n    rclpy.spin(node)`;
    const htmlPy = renderToStaticMarkup(
      React.createElement(CodeBlock, {
        code: pythonCode,
        language: "python",
        fileName: "node.py",
        showLineNumbers: true,
      })
    );
    assert(htmlPy.includes("rclpy") && htmlPy.includes("Python 3 (rclpy)"), "CodeBlock renders Python badge and rclpy tokens");
    assert(htmlPy.includes("Copiar"), "CodeBlock includes copy button");

    const cppCode = `#include "rclcpp/rclcpp.hpp"\nint main(int argc, char **argv) {\n  rclcpp::init(argc, argv);\n  auto node = std::make_shared<rclcpp::Node>("cpp_node");\n  return 0;\n}`;
    const htmlCpp = renderToStaticMarkup(
      React.createElement(CodeBlock, {
        code: cppCode,
        language: "cpp",
        fileName: "main.cpp",
        showLineNumbers: true,
      })
    );
    assert(htmlCpp.includes("rclcpp") && htmlCpp.includes("C++ (rclcpp)"), "CodeBlock renders C++ badge and rclcpp tokens");

    const bashCode = `ros2 run turtlesim turtlesim_node --ros-args -r __node:=my_turtle`;
    const htmlBash = renderToStaticMarkup(
      React.createElement(CodeBlock, {
        code: bashCode,
        language: "bash",
        showLineNumbers: false,
      })
    );
    assert(htmlBash.includes("ros2") && htmlBash.includes("Bash / Terminal"), "CodeBlock renders Bash badge and CLI tokens");

    const xmlCode = `<launch>\n  <node pkg="turtlesim" exec="turtlesim_node" name="sim" />\n</launch>`;
    const htmlXml = renderToStaticMarkup(
      React.createElement(CodeBlock, {
        code: xmlCode,
        language: "xml",
        fileName: "sim.launch.xml",
      })
    );
    assert(htmlXml.includes("launch") && htmlXml.includes("ROS 2 Launch XML"), "CodeBlock renders XML badge and launch tokens");
  } catch (err) {
    assert(false, `CodeBlock verification failed: ${err}`);
  }

  // -----------------------------------------------------------------
  // 5. Callout Cards Component Verification
  // -----------------------------------------------------------------
  console.log("\n--- 5. Testing Callout Cards Component ---");
  try {
    const htmlTip = renderToStaticMarkup(
      React.createElement(
        Callout,
        { type: "tip", title: "Dica de Performance" },
        "Utilize single-threaded executor para nós simples."
      )
    );
    assert(htmlTip.includes("Dica de Performance") && htmlTip.includes("border-l-emerald-500"), "Callout 'tip' renders emerald border and title");

    const htmlWarn = renderToStaticMarkup(
      React.createElement(
        Callout,
        { type: "warning", title: "Atenção com DDS" },
        "Verifique o ROS_DOMAIN_ID na sua rede local."
      )
    );
    assert(htmlWarn.includes("Atenção com DDS") && htmlWarn.includes("border-l-amber-500"), "Callout 'warning' renders amber border and title");

    const htmlTerminal = renderToStaticMarkup(
      React.createElement(
        Callout,
        { type: "terminal", title: "Comando Shell" },
        "colcon build --symlink-install"
      )
    );
    assert(htmlTerminal.includes("Comando Shell") && htmlTerminal.includes("border-l-purple-500"), "Callout 'terminal' renders purple border and title");

    const htmlInfo = renderToStaticMarkup(
      React.createElement(
        Callout,
        { type: "info", title: "Conceito Chave" },
        "Nós ROS 2 comunicam-se via publicadores e assinantes."
      )
    );
    assert(htmlInfo.includes("Conceito Chave") && htmlInfo.includes("border-l-blue-500"), "Callout 'info' renders blue border and title");
  } catch (err) {
    assert(false, `Callout verification failed: ${err}`);
  }

  // -----------------------------------------------------------------
  // 6. Lesson Content & Rich Markdown / HTML Parser Verification
  // -----------------------------------------------------------------
  console.log("\n--- 6. Testing Lesson Content Rich Parser ---");
  try {
    const sampleContent = `
### Instalação do ROS 2 Jazzy no Ubuntu 24.04

Execute os passos a seguir:

\`\`\`bash
sudo apt update && sudo apt install ros-jazzy-desktop
\`\`\`

> [!TIP]
> Lembre-se de adicionar o source no seu ~/.bashrc.

[Warning] Não execute como root! [/Warning]
`;
    const htmlLesson = renderToStaticMarkup(
      React.createElement(LessonContent, {
        content: sampleContent,
        summary: "Instalação da distribuição Jazzy",
        rosDocsUrl: "https://docs.ros.org/en/jazzy/Installation.html",
        durationSeconds: 900,
        lessonTitle: "Instalação do ROS 2 Jazzy",
      })
    );

    assert(htmlLesson.includes("Instalação do ROS 2 Jazzy"), "LessonContent renders lesson title");
    assert(htmlLesson.includes("docs.ros.org"), "LessonContent renders official docs.ros.org link");
    assert(htmlLesson.includes("Sumário da Lição"), "LessonContent renders executive summary block");
    assert(
      htmlLesson.includes("sudo") &&
      htmlLesson.includes("apt") &&
      htmlLesson.includes("jazzy"),
      "LessonContent parses and renders embedded code block"
    );
  } catch (err) {
    assert(false, `LessonContent verification failed: ${err}`);
  }

  // -----------------------------------------------------------------
  // 7. Practical Exercise & Capstone Components Verification
  // -----------------------------------------------------------------
  console.log("\n--- 7. Testing Practical Exercise Components ---");
  try {
    const htmlExCard = renderToStaticMarkup(
      React.createElement(ExerciseCard, {
        exercise: {
          id: "test-ex-1",
          lessonId: "lesson-44",
          title: "Atividade 02: Tópicos Publicador e Contador",
          type: "CODE",
          prompt: "Crie um publicador em Python que emite números inteiros crescentes.",
          instructions: "1. Inicialize o rclpy\n2. Crie um timer de 1.0s",
          starterCode: "import rclpy\n# TODO: complete",
          solutionCode: "import rclpy\nfrom rclpy.node import Node\n# solucao completa",
          hints: JSON.stringify(["Use create_publisher", "Use Int64 da std_msgs"]),
          points: 20,
          orderIndex: 1,
        },
      })
    );

    assert(htmlExCard.includes("Atividade 02"), "ExerciseCard renders exercise title");
    assert(htmlExCard.includes("Desafio em Código"), "ExerciseCard displays Code challenge badge");
    assert(htmlExCard.includes("Intermediário"), "ExerciseCard dynamically calculates Intermediário difficulty for 20 pts");
    assert(htmlExCard.includes("+20 pts"), "ExerciseCard displays reward points (+20 pts)");
    assert(htmlExCard.includes("Dicas de Apoio"), "ExerciseCard renders hints accordion header");
    assert(htmlExCard.includes("Ver Solução Sugerida"), "ExerciseCard renders solution toggle button");

    const htmlExList = renderToStaticMarkup(
      React.createElement(ExerciseList, {
        exercises: [
          {
            id: "ex-1",
            lessonId: "l-1",
            title: "Tarefa 1",
            type: "TASK",
            prompt: "Verifique o grafo",
            points: 10,
            orderIndex: 1,
          },
          {
            id: "ex-2",
            lessonId: "l-1",
            title: "Código 2",
            type: "CODE",
            prompt: "Implemente o nó",
            points: 25,
            orderIndex: 2,
          },
        ],
      })
    );

    assert(htmlExList.includes("Atividades &amp; Exercícios Práticos") || htmlExList.includes("Atividades & Exercícios Práticos"), "ExerciseList renders section header");
    assert(htmlExList.includes("+35 pts"), "ExerciseList aggregates total reward points correctly (10 + 25 = 35 pts)");
  } catch (err) {
    assert(false, `Exercise component verification failed: ${err}`);
  }

  // -----------------------------------------------------------------
  // 8. Navigation Shell & Sidebar Verification (Requirement R2)
  // -----------------------------------------------------------------
  console.log("\n--- 8. Testing Sidebar and Player Shell Components ---");
  try {
    const sampleModules = [
      {
        id: "mod-1",
        courseId: "course-1",
        title: "1. Introdução",
        orderIndex: 1,
        lessons: [
          {
            id: "l-1",
            slug: "001-welcome",
            title: "Welcome",
            orderIndex: 1,
            videoStatus: "AVAILABLE",
            youtubeVideoId: "6eLTFFXoqyw",
          },
          {
            id: "l-2",
            slug: "002-prerequisites",
            title: "Prerequisites",
            orderIndex: 2,
            videoStatus: "TEXT_ONLY",
          },
        ],
      },
    ];

    const htmlSidebar = renderToStaticMarkup(
      React.createElement(CurriculumSidebar, {
        modules: sampleModules,
        activeLessonId: "l-1",
        completedLessonIds: ["l-1"],
      })
    );
    assert(htmlSidebar.includes("Grade Curricular"), "CurriculumSidebar renders header title");
    assert(htmlSidebar.includes("001-welcome") && htmlSidebar.includes("002-prerequisites"), "CurriculumSidebar renders lesson links");
    assert(htmlSidebar.includes("Módulo 01"), "CurriculumSidebar displays module badge");

    const htmlHeader = renderToStaticMarkup(
      React.createElement(CourseHeader, {
        courseTitle: "ROS 2 Jazzy para Iniciantes",
        activeLesson: sampleModules[0].lessons[0],
        previousLesson: null,
        nextLesson: { id: "l-2", slug: "002-prerequisites", title: "Prerequisites", orderIndex: 2 },
        isSidebarOpen: true,
        onToggleSidebar: () => {},
        onToggleMobileDrawer: () => {},
      })
    );
    assert(htmlHeader.includes("Catálogo"), "CourseHeader renders return to catalog link");
    assert(htmlHeader.includes("Próxima") && htmlHeader.includes("002-prerequisites"), "CourseHeader renders next lesson navigation link");

    const htmlShell = renderToStaticMarkup(
      React.createElement(CoursePlayerShell, {
        course: {
          id: "course-1",
          slug: "ros2-jazzy",
          title: "ROS 2 Jazzy para Iniciantes",
          description: "Curso completo",
          level: "Iniciante",
          durationHours: 15,
          published: true,
          orderIndex: 1,
          modules: sampleModules,
        },
        activeLesson: sampleModules[0].lessons[0],
        previousLesson: null,
        nextLesson: { id: "l-2", slug: "002-prerequisites", title: "Prerequisites", orderIndex: 2 },
      })
    );
    assert(htmlShell.includes("6eLTFFXoqyw"), "CoursePlayerShell renders VideoPlayer with active videoId");
    assert(htmlShell.includes("Grade Curricular"), "CoursePlayerShell embeds CurriculumSidebar in 2-column layout");
  } catch (err) {
    assert(false, `Shell component verification failed: ${err}`);
  }

  // -----------------------------------------------------------------
  // 9. App Router Server Components Verification
  // -----------------------------------------------------------------
  console.log("\n--- 9. Testing Next.js App Router Server Pages ---");
  try {
    // 9.1 Catálogo /ensino
    const catalogPage = await EnsinoCatalogPage();
    assert(!!catalogPage && typeof catalogPage === "object", "EnsinoCatalogPage renders valid Server Component JSX");

    // 9.2 Leitor Dinâmico /curso/[lessonId] por slug
    const playerPageBySlug = await CoursePlayerPage({
      params: Promise.resolve({ lessonId: "001-welcome" }),
    });
    assert(!!playerPageBySlug && typeof playerPageBySlug === "object", "CoursePlayerPage resolves lesson by slug '001-welcome'");

    // 9.3 Leitor Dinâmico por orderIndex numérico
    const playerPageByNum = await CoursePlayerPage({
      params: Promise.resolve({ lessonId: "36" }),
    });
    assert(!!playerPageByNum && typeof playerPageByNum === "object", "CoursePlayerPage resolves lesson by numerical index '36'");

    // 9.4 Metadata Generator
    const metadata = await generateMetadata({
      params: Promise.resolve({ lessonId: "001-welcome" }),
    });
    assert(
      typeof metadata.title === "string" && metadata.title.includes("Welcome"),
      `generateMetadata produces correct title: '${metadata.title}'`
    );

    // 9.5 Rota Aliada /ensino/curso/[lessonId] Redirect Page
    assert(typeof EnsinoCursoRedirectPage === "function", "EnsinoCursoRedirectPage is exported as async function for redirect support");
  } catch (err) {
    assert(false, `App router page component verification failed: ${err}`);
  }

  // -----------------------------------------------------------------
  // 10. API Route Handlers Verification
  // -----------------------------------------------------------------
  console.log("\n--- 10. Testing Course and Lessons API Routes ---");
  try {
    // GET /api/courses/ros2-jazzy
    const courseReq = new NextRequest("http://localhost:3000/api/courses/ros2-jazzy");
    const courseRes = await getCourseRoute(courseReq);
    assert(courseRes.status === 200, "GET /api/courses/ros2-jazzy returns HTTP 200");
    const courseJson = await courseRes.json();
    assert(courseJson.course?.modules?.length === 11, "API response returns course with 11 modules");

    // GET /api/lessons/001-welcome
    const reqLesson1 = new NextRequest("http://localhost:3000/api/lessons/001-welcome");
    const lessonRes = await getLessonRoute(reqLesson1, {
      params: Promise.resolve({ id: "001-welcome" }),
    });
    assert(lessonRes.status === 200, "GET /api/lessons/001-welcome returns HTTP 200");
    const lessonJson = await lessonRes.json();
    assert(lessonJson.lesson?.youtubeVideoId === "6eLTFFXoqyw", "Lesson 001 returns correct youtubeVideoId ('6eLTFFXoqyw')");
    assert(lessonJson.lesson?.videoStatus === "available", "Lesson 001 returns videoStatus 'available'");

    // GET /api/lessons/031-activity-01
    const reqLesson31 = new NextRequest("http://localhost:3000/api/lessons/031-activity-01");
    const lesson31Res = await getLessonRoute(reqLesson31, {
      params: Promise.resolve({ id: "031-activity-01" }),
    });
    assert(lesson31Res.status === 200, "GET /api/lessons/031-activity-01 returns HTTP 200");
    const lesson31Json = await lesson31Res.json();
    assert(lesson31Json.lesson?.exercises?.length === 1, "Lesson 31 returns 1 practical exercise in API response");

    // GET /api/lessons/44 (by numeric index)
    const reqLesson44 = new NextRequest("http://localhost:3000/api/lessons/44");
    const lesson44Res = await getLessonRoute(reqLesson44, {
      params: Promise.resolve({ id: "44" }),
    });
    assert(lesson44Res.status === 200, "GET /api/lessons/44 by numeric index returns HTTP 200");
    const lesson44Json = await lesson44Res.json();
    assert(Boolean(lesson44Json.lesson?.exercises?.[0]?.starterCode), "Lesson 44 returns exercise with starterCode");
  } catch (err) {
    assert(false, `API routes verification failed: ${err}`);
  }

  console.log("\n================================================================================");
  console.log(`📊 MILESTONE 3 SMOKE TEST SUMMARY: ${passed} PASSED | ${failed} FAILED`);
  console.log("================================================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runM3SmokeTests().catch((err) => {
  console.error("FATAL ERROR IN M3 SMOKE TEST:", err);
  process.exit(1);
});
