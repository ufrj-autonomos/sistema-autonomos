// ==============================================================================
// 🕵️ INDEPENDENT FORENSIC AUDITOR CHALLENGE SUITE — MILESTONE 3
//    Adversarial Stress-Testing, Edge Cases, Anti-Cheat & Boundary Verification
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
import CoursePlayerPage, {
  generateMetadata,
} from "../src/app/(ensino)/curso/[lessonId]/page";
import { GET as getCourseRoute } from "../src/app/api/courses/ros2-jazzy/route";
import { GET as getLessonRoute } from "../src/app/api/lessons/[id]/route";
import { NextRequest } from "next/server";

async function runAuditorChallenge() {
  console.log("================================================================================");
  console.log("🕵️ FORENSIC AUDITOR ADVERSARIAL CHALLENGE — MILESTONE 3");
  console.log("   Independent Verification of Integrity, Boundaries, and Edge Cases");
  console.log("================================================================================\n");

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testId: string, description: string) {
    if (condition) {
      console.log(`  ✅ [PASS] ${testId}: ${description}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${testId}: ${description}`);
      failed++;
    }
  }

  // -----------------------------------------------------------------
  // SECTION 1: Boundary & Navigation Graph Integrity
  // -----------------------------------------------------------------
  console.log("--- 1. Testing Boundary & Navigation Graph Integrity ---");
  try {
    // Lesson 1 (First Lesson)
    const pageL1 = await CoursePlayerPage({
      params: Promise.resolve({ lessonId: "1" }),
    });
    const shellPropsL1 = (pageL1 as any).props;
    assert(
      shellPropsL1.previousLesson === null,
      "BOUND-L1-PREV-NULL",
      "Lesson 1 has previousLesson === null (beginning of curriculum)"
    );
    assert(
      shellPropsL1.nextLesson?.orderIndex === 2,
      "BOUND-L1-NEXT-L2",
      "Lesson 1 has nextLesson pointing to orderIndex 2"
    );

    // Lesson 108 (Last Lesson)
    const pageL108 = await CoursePlayerPage({
      params: Promise.resolve({ lessonId: "108" }),
    });
    const shellPropsL108 = (pageL108 as any).props;
    assert(
      shellPropsL108.nextLesson === null,
      "BOUND-L108-NEXT-NULL",
      "Lesson 108 has nextLesson === null (end of curriculum)"
    );
    assert(
      shellPropsL108.previousLesson?.orderIndex === 107,
      "BOUND-L108-PREV-L107",
      "Lesson 108 has previousLesson pointing to orderIndex 107"
    );

    // Lesson 54 (Middle Lesson)
    const pageL54 = await CoursePlayerPage({
      params: Promise.resolve({ lessonId: "54" }),
    });
    const shellPropsL54 = (pageL54 as any).props;
    assert(
      shellPropsL54.previousLesson?.orderIndex === 53 &&
      shellPropsL54.nextLesson?.orderIndex === 55,
      "BOUND-L54-MIDDLE",
      "Lesson 54 has continuous surrounding chain (53 <- 54 -> 55)"
    );

    // Header rendering at boundaries
    const htmlHeaderStart = renderToStaticMarkup(
      React.createElement(CourseHeader, {
        activeLesson: shellPropsL1.activeLesson,
        previousLesson: shellPropsL1.previousLesson,
        nextLesson: shellPropsL1.nextLesson,
        isSidebarOpen: true,
        onToggleSidebar: () => {},
        onToggleMobileDrawer: () => {},
      })
    );
    assert(
      htmlHeaderStart.includes("cursor-not-allowed") && htmlHeaderStart.includes("Anterior"),
      "HEADER-L1-PREV-DISABLED",
      "Header disables Anterior button with cursor-not-allowed at Lesson 1"
    );

    const htmlHeaderEnd = renderToStaticMarkup(
      React.createElement(CourseHeader, {
        activeLesson: shellPropsL108.activeLesson,
        previousLesson: shellPropsL108.previousLesson,
        nextLesson: shellPropsL108.nextLesson,
        isSidebarOpen: true,
        onToggleSidebar: () => {},
        onToggleMobileDrawer: () => {},
      })
    );
    assert(
      htmlHeaderEnd.includes("cursor-not-allowed") && htmlHeaderEnd.includes("Concluído"),
      "HEADER-L108-NEXT-DISABLED",
      "Header disables Próxima button with 'Concluído' at Lesson 108"
    );
  } catch (err) {
    assert(false, "SECTION-1-FATAL", `Navigation boundary test failed with error: ${err}`);
  }

  // -----------------------------------------------------------------
  // SECTION 2: Adversarial Route & Injection Resilience
  // -----------------------------------------------------------------
  console.log("\n--- 2. Testing Adversarial Route & Injection Resilience ---");
  try {
    // Non-existent ID in API route
    const reqNotFound = new NextRequest("http://localhost:3000/api/lessons/non-existent-9999");
    const resNotFound = await getLessonRoute(reqNotFound, {
      params: Promise.resolve({ id: "non-existent-9999" }),
    });
    assert(resNotFound.status === 404, "API-404-NONEXISTENT", "GET /api/lessons/non-existent-9999 returns HTTP 404");

    // Negative orderIndex in API route
    const reqNegative = new NextRequest("http://localhost:3000/api/lessons/-1");
    const resNegative = await getLessonRoute(reqNegative, {
      params: Promise.resolve({ id: "-1" }),
    });
    assert(resNegative.status === 404, "API-404-NEGATIVE", "GET /api/lessons/-1 returns HTTP 404");

    // Out of bounds orderIndex (109) in API route
    const reqOOB = new NextRequest("http://localhost:3000/api/lessons/109");
    const resOOB = await getLessonRoute(reqOOB, {
      params: Promise.resolve({ id: "109" }),
    });
    assert(resOOB.status === 404, "API-404-OOB", "GET /api/lessons/109 returns HTTP 404");

    // Path traversal attempt in API route
    const reqPathTraversal = new NextRequest("http://localhost:3000/api/lessons/../../etc/passwd");
    const resPathTraversal = await getLessonRoute(reqPathTraversal, {
      params: Promise.resolve({ id: "../../etc/passwd" }),
    });
    assert(resPathTraversal.status === 404, "API-404-TRAVERSAL", "GET /api/lessons/../../etc/passwd safely rejected with HTTP 404");

    // SQL Injection attempt in API route
    const reqSqlInject = new NextRequest("http://localhost:3000/api/lessons/'%20OR%201=1--");
    const resSqlInject = await getLessonRoute(reqSqlInject, {
      params: Promise.resolve({ id: "' OR 1=1--" }),
    });
    assert(resSqlInject.status === 404, "API-404-SQLI", "SQL injection attempt safely returns HTTP 404 via Prisma parameterization");

    // Metadata generator on non-existent lesson
    const metaNotFound = await generateMetadata({
      params: Promise.resolve({ lessonId: "totally-fake-lesson" }),
    });
    assert(
      metaNotFound.title === "Aula não encontrada — UFRJ Autônomos",
      "META-NOT-FOUND",
      "generateMetadata handles unknown lesson gracefully"
    );
  } catch (err) {
    assert(false, "SECTION-2-FATAL", `Route resilience test failed: ${err}`);
  }

  // -----------------------------------------------------------------
  // SECTION 3: Video Player & Embed Security & Subtitle Rigor (R4)
  // -----------------------------------------------------------------
  console.log("\n--- 3. Testing Video Player & Subtitle Rigor (R4) ---");
  try {
    // Dirty ID sanitization
    const dirtyVideoId = "  6eLTFFXoqyw \n ";
    const sanitizedEmbedUrl = buildPrivacyEnhancedEmbedUrl(dirtyVideoId);
    assert(
      sanitizedEmbedUrl.includes("embed/6eLTFFXoqyw?"),
      "VIDEO-SANITIZATION",
      "buildPrivacyEnhancedEmbedUrl trims whitespace properly"
    );

    // Verify all mandatory YouTube parameters per R4
    const urlObj = new URL(sanitizedEmbedUrl);
    assert(urlObj.hostname === "www.youtube-nocookie.com", "VIDEO-DOMAIN", "Domain is strictly youtube-nocookie.com");
    assert(urlObj.searchParams.get("cc_lang_pref") === "pt", "VIDEO-PARAM-LANG", "cc_lang_pref is strictly 'pt'");
    assert(urlObj.searchParams.get("cc_load_policy") === "1", "VIDEO-PARAM-POLICY", "cc_load_policy is strictly '1'");
    assert(urlObj.searchParams.get("hl") === "pt-BR", "VIDEO-PARAM-HL", "hl is strictly 'pt-BR'");
    assert(urlObj.searchParams.get("rel") === "0", "VIDEO-PARAM-REL", "rel is strictly '0'");

    // Case insensitivity of VideoStatus
    const htmlCaseAvailable = renderToStaticMarkup(
      React.createElement(VideoPlayer, {
        youtubeVideoId: "6eLTFFXoqyw",
        videoStatus: "AVAILABLE",
      })
    );
    assert(htmlCaseAvailable.includes("iframe"), "VIDEO-CASE-AVAILABLE", "VideoPlayer supports uppercase 'AVAILABLE'");

    const htmlCasePending = renderToStaticMarkup(
      React.createElement(VideoPlayer, {
        youtubeVideoId: "some-id",
        videoStatus: "PENDING",
      })
    );
    assert(htmlCasePending.includes("Vídeo em Gravação"), "VIDEO-CASE-PENDING", "VideoPlayer honors uppercase 'PENDING'");

    const htmlCaseTextOnly = renderToStaticMarkup(
      React.createElement(VideoPlayer, {
        youtubeVideoId: null,
        videoStatus: "TEXT_ONLY",
      })
    );
    assert(htmlCaseTextOnly.includes("AULA TEÓRICA"), "VIDEO-CASE-TEXTONLY", "VideoPlayer honors uppercase 'TEXT_ONLY'");

    // Null and empty videoId fallback
    const htmlEmptyId = renderToStaticMarkup(
      React.createElement(VideoPlayer, {
        youtubeVideoId: "",
        videoStatus: "available",
      })
    );
    assert(
      htmlEmptyId.includes("Vídeo em Gravação"),
      "VIDEO-EMPTY-ID-FALLBACK",
      "VideoPlayer safely falls back to placeholder when videoId is empty string"
    );
  } catch (err) {
    assert(false, "SECTION-3-FATAL", `Video player test failed: ${err}`);
  }

  // -----------------------------------------------------------------
  // SECTION 4: CodeBlock Tokenizer Adversarial & Line Number Verification
  // -----------------------------------------------------------------
  console.log("\n--- 4. Testing CodeBlock Tokenizer & Line Numbers ---");
  try {
    // Empty code handling
    const htmlEmptyCode = renderToStaticMarkup(
      React.createElement(CodeBlock, { code: "" })
    );
    assert(htmlEmptyCode.includes("Copiar"), "CODE-EMPTY-SAFE", "CodeBlock handles empty string without crash");

    // Single line code
    const htmlSingleLine = renderToStaticMarkup(
      React.createElement(CodeBlock, { code: "echo 'hello'", showLineNumbers: true })
    );
    assert(htmlSingleLine.includes(">1<"), "CODE-LINE-NUM-1", "CodeBlock displays line number 1");

    // Multi-line line counting precision
    const multilineCode = "line1\nline2\n\nline4\nline5";
    const htmlMultiLine = renderToStaticMarkup(
      React.createElement(CodeBlock, { code: multilineCode, showLineNumbers: true })
    );
    assert(
      htmlMultiLine.includes(">1<") &&
      htmlMultiLine.includes(">2<") &&
      htmlMultiLine.includes(">3<") &&
      htmlMultiLine.includes(">4<") &&
      htmlMultiLine.includes(">5<"),
      "CODE-LINE-NUMS-ACCURATE",
      "CodeBlock accurately renders continuous line numbers 1 through 5 including empty lines"
    );

    // HTML character escaping in code blocks & tag tokenization
    const htmlWithEntities = '<launch>\n  <param name="rate" value="10" />\n</launch>';
    const htmlRenderedCode = renderToStaticMarkup(
      React.createElement(CodeBlock, { code: htmlWithEntities, language: "xml" })
    );
    assert(
      htmlRenderedCode.includes("launch</span>") &&
      htmlRenderedCode.includes("text-rose-400") &&
      htmlRenderedCode.includes("text-amber-400") &&
      htmlRenderedCode.includes("&quot;rate&quot;"),
      "CODE-TAGS-PRESERVED",
      "CodeBlock correctly tokenizes XML tags ('launch'), attributes ('name'), and string values ('rate')"
    );

    // Unsupported language fallback
    const htmlUnknownLang = renderToStaticMarkup(
      React.createElement(CodeBlock, { code: "fn main() {}", language: "rust" })
    );
    assert(htmlUnknownLang.includes("RUST"), "CODE-UNKNOWN-LANG-SAFE", "CodeBlock gracefully handles unfamiliar language tags");
  } catch (err) {
    assert(false, "SECTION-4-FATAL", `CodeBlock test failed: ${err}`);
  }

  // -----------------------------------------------------------------
  // SECTION 5: Callout Types & Diacritic Compatibility
  // -----------------------------------------------------------------
  console.log("\n--- 5. Testing Callout Types & Diacritics ---");
  try {
    const types: Array<{ input: any; expectedBorder: string }> = [
      { input: "tip", expectedBorder: "border-l-emerald-500" },
      { input: "dica", expectedBorder: "border-l-emerald-500" },
      { input: "warning", expectedBorder: "border-l-amber-500" },
      { input: "atencao", expectedBorder: "border-l-amber-500" },
      { input: "atenção", expectedBorder: "border-l-amber-500" },
      { input: "terminal", expectedBorder: "border-l-purple-500" },
      { input: "comando", expectedBorder: "border-l-purple-500" },
      { input: "info", expectedBorder: "border-l-blue-500" },
      { input: "conceito", expectedBorder: "border-l-blue-500" },
    ];

    for (const t of types) {
      const htmlCallout = renderToStaticMarkup(
        React.createElement(Callout, { type: t.input }, "Mensagem de teste")
      );
      assert(
        htmlCallout.includes(t.expectedBorder),
        `CALLOUT-${t.input}`,
        `Callout type '${t.input}' renders correct border '${t.expectedBorder}'`
      );
    }
  } catch (err) {
    assert(false, "SECTION-5-FATAL", `Callout test failed: ${err}`);
  }

  // -----------------------------------------------------------------
  // SECTION 6: Practical Exercises & Capstone Database Integrity
  // -----------------------------------------------------------------
  console.log("\n--- 6. Testing Practical Exercises & Capstone DB Integrity ---");
  try {
    const exercises = await prisma.exercise.findMany({
      orderBy: { orderIndex: "asc" },
      include: { lesson: { select: { title: true, orderIndex: true } } },
    });

    assert(exercises.length === 13, "EX-COUNT-13", `Exact total of 13 exercises in database (found: ${exercises.length})`);

    // All exercises have prompt, title, and positive points
    const allValid = exercises.every(
      (e) => e.title.length > 5 && e.prompt.length > 15 && e.points > 0
    );
    assert(allValid, "EX-FIELDS-VALID", "All 13 exercises have valid non-empty title, detailed prompt, and positive points");

    // Exercises with solutionCode (Atividade 01, 02, 03) render solution toggle
    const exWithSolution = exercises.filter((e) => Boolean(e.solutionCode));
    assert(exWithSolution.length >= 3, "EX-SOLUTIONS-COUNT", `At least 3 foundational exercises have solutions (found: ${exWithSolution.length})`);
    
    const htmlWithSol = renderToStaticMarkup(
      React.createElement(ExerciseCard, { exercise: exWithSolution[0] as any })
    );
    assert(htmlWithSol.includes("Ver Solução Sugerida"), "EX-SOLUTION-TOGGLE-SHOWN", "ExerciseCard renders solution toggle when solutionCode is present");

    // Exercises without solutionCode cleanly omit the solution toggle without empty artifacts
    const exWithoutSolution = exercises.filter((e) => !e.solutionCode);
    const targetWithoutSol = exWithoutSolution[0] || {
      id: "mock-no-sol",
      lessonId: "l1",
      title: "Ex Sem Solução",
      prompt: "Prompt para teste sem solução",
      points: 10,
      type: "CODE",
      orderIndex: 1,
      solutionCode: null,
      isCompleted: false,
    };
    const htmlWithoutSol = renderToStaticMarkup(
      React.createElement(ExerciseCard, { exercise: targetWithoutSol as any })
    );
    assert(!htmlWithoutSol.includes("Ver Solução Sugerida"), "EX-SOLUTION-TOGGLE-OMITTED", "ExerciseCard cleanly omits solution toggle when solutionCode is null");

    // Capstone Project Step 6 (Lesson 104)
    const capstoneStep6 = exercises.find((e) => e.lesson.orderIndex === 104);
    assert(
      !!capstoneStep6 && capstoneStep6.points === 30,
      "EX-CAPSTONE-STEP6",
      "Capstone Step 6 exists in Lesson 104 with 30 reward points"
    );

    // Difficulty categorization logic in ExerciseCard
    const htmlIniciante = renderToStaticMarkup(
      React.createElement(ExerciseCard, {
        exercise: { id: "ex-ini", lessonId: "l1", title: "Ex 1", prompt: "Prompt", points: 10, type: "CODE", orderIndex: 1 },
      })
    );
    assert(htmlIniciante.includes("Iniciante"), "EX-DIFF-INICIANTE", "10 points classified as Iniciante");

    const htmlIntermediario = renderToStaticMarkup(
      React.createElement(ExerciseCard, {
        exercise: { id: "ex-int", lessonId: "l1", title: "Ex 2", prompt: "Prompt", points: 20, type: "CODE", orderIndex: 1 },
      })
    );
    assert(htmlIntermediario.includes("Intermediário"), "EX-DIFF-INTERMEDIARIO", "20 points classified as Intermediário");

    const htmlAvancado = renderToStaticMarkup(
      React.createElement(ExerciseCard, {
        exercise: { id: "ex-av", lessonId: "l1", title: "Ex 3", prompt: "Prompt", points: 30, type: "CODE", orderIndex: 1 },
      })
    );
    assert(htmlAvancado.includes("Avançado / Capstone"), "EX-DIFF-AVANCADO", "30 points classified as Avançado / Capstone");
  } catch (err) {
    assert(false, "SECTION-6-FATAL", `Exercise DB integrity test failed: ${err}`);
  }

  // -----------------------------------------------------------------
  // SECTION 7: Rich Markdown/HTML Parser Stress-Testing
  // -----------------------------------------------------------------
  console.log("\n--- 7. Testing LessonContent Rich Markdown/HTML Parser ---");
  try {
    const complexLesson = `
# Título Principal

Texto com código inline \`ros2 topic list\` e negrito **rclpy.spin**.

Link: [Documentação ROS](https://docs.ros.org)

\`\`\`python
import rclpy
from rclpy.node import Node
class MyNode(Node):
    def __init__(self):
        super().__init__('my_node')
\`\`\`

<pre class="language-cpp"><code>
#include "rclcpp/rclcpp.hpp"
int main() {
    rclcpp::init(0, nullptr);
}
</code></pre>

> [!TIP]
> Dica usando citação Markdown padrão.

[Warning]
Aviso usando shortcode colchetes.
[/Warning]

- Item de lista 1
- Item de lista 2

1. Passo um
2. Passo dois
`;

    const htmlParsed = renderToStaticMarkup(
      React.createElement(LessonContent, {
        content: complexLesson,
        lessonTitle: "Aula Avançada",
      })
    );

    assert(htmlParsed.includes("ros2 topic list"), "PARSER-INLINE-CODE", "Parser renders inline code snippets");
    assert(htmlParsed.includes("rclpy.spin"), "PARSER-BOLD-TEXT", "Parser renders bold text tags");
    assert(htmlParsed.includes("https://docs.ros.org"), "PARSER-MARKDOWN-LINK", "Parser renders markdown links with href");
    assert(htmlParsed.includes("rclpy") && htmlParsed.includes("Python 3 (rclpy)"), "PARSER-PYTHON-CODEBLOCK", "Parser converts python code fences into CodeBlock");
    assert(htmlParsed.includes("rclcpp") && htmlParsed.includes("C++ (rclcpp)"), "PARSER-HTML-PRE-CODEBLOCK", "Parser converts HTML pre blocks into CodeBlock");
    assert(htmlParsed.includes("border-l-emerald-500"), "PARSER-CALLOUT-TIP", "Parser converts > [!TIP] into emerald Callout");
    assert(htmlParsed.includes("border-l-amber-500"), "PARSER-CALLOUT-WARN", "Parser converts [Warning] into amber Callout");
    assert(htmlParsed.includes("Item de lista 1"), "PARSER-UNORDERED-LIST", "Parser renders unordered list items");
    assert(htmlParsed.includes("Passo um"), "PARSER-ORDERED-LIST", "Parser renders ordered list items");
  } catch (err) {
    assert(false, "SECTION-7-FATAL", `Parser stress test failed: ${err}`);
  }

  // -----------------------------------------------------------------
  // SECTION 8: Brand & Visual Identity Compliance
  // -----------------------------------------------------------------
  console.log("\n--- 8. Testing Brand & Visual Identity Compliance ---");
  try {
    const htmlSidebar = renderToStaticMarkup(
      React.createElement(CurriculumSidebar, {
        modules: [
          {
            id: "m-1",
            courseId: "c-1",
            title: "Módulo 1",
            orderIndex: 1,
            lessons: [
              { id: "l-1", slug: "l-1", title: "Lesson 1", orderIndex: 1, videoStatus: "AVAILABLE", youtubeVideoId: "123" },
            ],
          },
        ],
        activeLessonId: "l-1",
      })
    );

    assert(
      htmlSidebar.includes("#0D0D10") || htmlSidebar.includes("bg-[#0D0D10]"),
      "BRAND-DARK-TITANIUM",
      "CurriculumSidebar applies Engineering Studio dark titanium background (#0D0D10)"
    );

    const htmlPlaceholder = renderToStaticMarkup(
      React.createElement(VideoPlaceholder, {
        title: "Aula Placeholder",
      })
    );

    assert(
      htmlPlaceholder.includes("#8530B0") || htmlPlaceholder.includes("#702191"),
      "BRAND-HARPIA-PURPLE",
      "VideoPlaceholder uses official Harpia purple accents (#8530B0 / #702191)"
    );

    assert(
      htmlPlaceholder.includes("blueprint-corners"),
      "BRAND-BLUEPRINT-CORNERS",
      "VideoPlaceholder applies blueprint-corners technical aesthetic"
    );
  } catch (err) {
    assert(false, "SECTION-8-FATAL", `Brand compliance test failed: ${err}`);
  }

  console.log("\n================================================================================");
  console.log(`📊 AUDITOR ADVERSARIAL CHALLENGE SUMMARY: ${passed} PASSED | ${failed} FAILED`);
  console.log("================================================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runAuditorChallenge().catch((err) => {
  console.error("FATAL ERROR IN AUDITOR CHALLENGE:", err);
  process.exit(1);
});
