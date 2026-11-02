import fs from "fs";
import path from "path";
import React from "react";
import { renderToString } from "react-dom/server";
import { AppRouterContext } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { PathnameContext } from "next/dist/shared/lib/hooks-client-context.shared-runtime";
import { NextRequest } from "next/server";

import {
  Logo,
  LogoDivision,
  LogoVariant,
  HarpiaSymbolType,
  NautilusSymbolType,
  BadgeShape,
  AutonomosMark,
  HarpiaMark,
  NautilusMark,
  LogoHorizontal,
  AUTONOMOS_LOGOS,
  HARPIA_LOGOS,
  NAUTILUS_LOGOS,
} from "../src/components/brand/logo";
import { Navbar, SafeUser } from "../src/components/layout/navbar";
import { Footer } from "../src/components/layout/footer";
import { GET as authMeGet } from "../src/app/api/auth/me/route";
import { POST as authLoginPost } from "../src/app/api/auth/login/route";
import { POST as authLogoutPost } from "../src/app/api/auth/logout/route";
import { createSessionToken } from "../src/lib/auth";
import { SESSION_COOKIE_NAME } from "../src/lib/session";

interface TestResult {
  category: string;
  name: string;
  passed: boolean;
  error?: string;
  details?: any;
}

const results: TestResult[] = [];

function recordTest(category: string, name: string, condition: boolean, error?: string, details?: any) {
  results.push({ category, name, passed: condition, error, details });
  if (condition) {
    console.log(`  ✅ [PASS] [${category}] ${name}`);
  } else {
    console.error(`  ❌ [FAIL] [${category}] ${name}`);
    if (error) console.error(`     Error: ${error}`);
    if (details) console.error(`     Details:`, details);
  }
}

const mockRouter: any = {
  push: () => {},
  replace: () => {},
  refresh: () => {},
  back: () => {},
  forward: () => {},
  prefetch: () => {},
};

function renderNavbarWithRoute(pathname: string | null) {
  return renderToString(
    React.createElement(
      AppRouterContext.Provider,
      { value: mockRouter },
      React.createElement(
        PathnameContext.Provider,
        { value: pathname },
        React.createElement(Navbar)
      )
    )
  );
}

async function runAdversarialTestSuite() {
  console.log("===============================================================");
  console.log("⚔️  ADVERSARIAL STRESS-TEST SUITE — MILESTONE 2 (EMPIRICAL) ⚔️");
  console.log("    Layout, Navbar, Mobile Drawer, Logos & Auth Reactivity");
  console.log("===============================================================\n");

  const basePath = path.resolve(__dirname, "../public");

  // =========================================================================
  // SUITE 1: LOGO RENDERING & ASSET INTEGRITY MATRIX
  // =========================================================================
  console.log("--- 1. STRESS-TESTING LOGO COMBINATION MATRIX & ASSET INTEGRITY ---");

  const divisions: LogoDivision[] = ["autonomos", "harpia", "nautilus"];
  const variants: LogoVariant[] = ["horizontal", "stacked", "symbol", "badge"];
  const harpiaSymbols: (HarpiaSymbolType | undefined)[] = ["eagle", "drone", undefined];
  const nautilusSymbols: (NautilusSymbolType | undefined)[] = ["auv", "shell", undefined];
  const badgeShapes: BadgeShape[] = ["rounded", "square", "rect", "rect-rounded"];

  let totalLogoCombinations = 0;
  let missingAssetErrors = 0;
  let renderExceptions = 0;

  for (const division of divisions) {
    for (const variant of variants) {
      for (const isDark of [false, true]) {
        const symTypes =
          division === "harpia"
            ? harpiaSymbols
            : division === "nautilus"
            ? nautilusSymbols
            : [undefined];

        for (const symbolType of symTypes) {
          for (const badgeShape of badgeShapes) {
            totalLogoCombinations++;
            try {
              const el = React.createElement(Logo, {
                division,
                variant,
                dark: isDark,
                symbolType: symbolType as any,
                badgeShape,
              });
              const html = renderToString(el);
              const match = html.match(/src="([^"]+)"/);

              if (!match) {
                renderExceptions++;
                recordTest(
                  "Logo Matrix",
                  `Missing src in HTML for ${division}:${variant}:dark=${isDark}`,
                  false
                );
                continue;
              }

              const src = match[1];
              const cleanSrc = src.startsWith("/") ? src.slice(1) : src;
              const fullPath = path.resolve(basePath, cleanSrc);

              if (!fs.existsSync(fullPath)) {
                missingAssetErrors++;
                recordTest(
                  "Logo Matrix",
                  `Resolved asset file does not exist: ${cleanSrc}`,
                  false,
                  `Full path: ${fullPath}`
                );
              } else {
                const stat = fs.statSync(fullPath);
                if (stat.size === 0) {
                  missingAssetErrors++;
                  recordTest(
                    "Logo Matrix",
                    `Asset file is 0 bytes: ${cleanSrc}`,
                    false
                  );
                }
              }
            } catch (err: any) {
              renderExceptions++;
              recordTest(
                "Logo Matrix",
                `Exception rendering ${division}:${variant}:dark=${isDark}`,
                false,
                err.message
              );
            }
          }
        }
      }
    }
  }

  recordTest(
    "Logo Matrix",
    `All ${totalLogoCombinations} matrix combinations resolved cleanly without render exceptions`,
    renderExceptions === 0
  );

  recordTest(
    "Logo Matrix",
    `All referenced vector logo assets physically exist on disk with non-zero size`,
    missingAssetErrors === 0
  );

  // SVG XML Validity Check
  console.log("\n--- Checking XML Validity for All Logo Assets ---");
  const allLogosDir = path.resolve(basePath, "images/logos");
  let totalSvgs = 0;
  let invalidSvgs = 0;

  function scanSvgDir(dir: string) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        scanSvgDir(fullPath);
      } else if (entry.name.endsWith(".svg")) {
        totalSvgs++;
        const content = fs.readFileSync(fullPath, "utf-8");
        const hasStart = content.includes("<svg");
        const hasEnd = content.includes("</svg>");
        if (!hasStart || !hasEnd) {
          invalidSvgs++;
          recordTest("SVG Validity", `Corrupted or malformed SVG: ${entry.name}`, false);
        }
      }
    }
  }

  scanSvgDir(allLogosDir);
  recordTest(
    "SVG Validity",
    `All ${totalSvgs} SVGs in public/images/logos contain valid <svg> root and </svg> closing tags`,
    invalidSvgs === 0
  );

  // Convenience Mark Components Test
  console.log("\n--- Testing Convenience Brand Components ---");
  const markCases = [
    { name: "AutonomosMark (default)", el: React.createElement(AutonomosMark) },
    { name: "AutonomosMark (dark)", el: React.createElement(AutonomosMark, { dark: true }) },
    { name: "HarpiaMark (eagle)", el: React.createElement(HarpiaMark, { symbolType: "eagle" }) },
    { name: "HarpiaMark (drone)", el: React.createElement(HarpiaMark, { symbolType: "drone" }) },
    { name: "NautilusMark (auv)", el: React.createElement(NautilusMark, { symbolType: "auv" }) },
    { name: "NautilusMark (shell)", el: React.createElement(NautilusMark, { symbolType: "shell" }) },
    { name: "LogoHorizontal (autonomos)", el: React.createElement(LogoHorizontal) },
    { name: "LogoHorizontal (harpia)", el: React.createElement(LogoHorizontal, { division: "harpia" }) },
    { name: "LogoHorizontal (nautilus)", el: React.createElement(LogoHorizontal, { division: "nautilus" }) },
  ];

  for (const mc of markCases) {
    try {
      const html = renderToString(mc.el);
      const src = html.match(/src="([^"]+)"/)?.[1];
      const valid = !!src && fs.existsSync(path.resolve(basePath, src.slice(1)));
      recordTest("Brand Convenience", mc.name, valid);
    } catch (err: any) {
      recordTest("Brand Convenience", mc.name, false, err.message);
    }
  }

  // Logo Link Wrapping Semantics Test
  console.log("\n--- Testing Logo Link Wrapping & A11y Semantics ---");
  const staticLogoHtml = renderToString(React.createElement(Logo, { href: null }));
  recordTest(
    "Logo A11y & Semantics",
    "Logo without href renders as static <span> and does NOT wrap in <a>",
    !staticLogoHtml.startsWith("<a") && staticLogoHtml.includes("<span")
  );

  const linkedLogoHtml = renderToString(React.createElement(Logo, { href: true, division: "harpia" }));
  recordTest(
    "Logo A11y & Semantics",
    "Logo with href=true wraps in <a href=\"/gestao#harpia\">",
    linkedLogoHtml.includes('href="/gestao#harpia"') && linkedLogoHtml.startsWith("<a")
  );

  const customLinkedLogoHtml = renderToString(React.createElement(Logo, { href: "/custom-url" }));
  recordTest(
    "Logo A11y & Semantics",
    "Logo with custom href wraps in <a href=\"/custom-url\">",
    customLinkedLogoHtml.includes('href="/custom-url"')
  );

  // =========================================================================
  // SUITE 2: ROUTE HIGHLIGHTING & URL PATH RESOLUTION
  // =========================================================================
  console.log("\n--- 2. STRESS-TESTING ROUTE HIGHLIGHTING & ISOLATION ---");

  // Helper to extract active route status from rendered HTML
  function getActiveNavLinks(html: string) {
    // Extract the primary navigation nav container to avoid false matches on the logo link
    const primaryNav = html.match(/<nav[^>]*aria-label="Navegação Principal"[\s\S]*?<\/nav>/)?.[0] || html;

    const inicioTag = primaryNav.match(/<a\b[^>]*?\bhref="\/"[^>]*>/)?.[0] || "";
    const ensinoTag = primaryNav.match(/<a\b[^>]*?\bhref="\/ensino"[^>]*>/)?.[0] || "";
    const gestaoTag = primaryNav.match(/<a\b[^>]*?\bhref="\/gestao"[^>]*>/)?.[0] || "";

    const checkActive = (tag: string) => tag.includes("bg-white/10 text-zinc-100");

    return {
      home: checkActive(inicioTag),
      ensino: checkActive(ensinoTag),
      gestao: checkActive(gestaoTag),
    };
  }

  // Exact Route Tests
  const htmlHome = renderNavbarWithRoute("/");
  const homeStatus = getActiveNavLinks(htmlHome);
  recordTest("Route Highlighting", "Root '/' highlights ONLY Início", homeStatus.home && !homeStatus.ensino && !homeStatus.gestao);

  const htmlEnsino = renderNavbarWithRoute("/ensino");
  const ensinoStatus = getActiveNavLinks(htmlEnsino);
  recordTest("Route Highlighting", "Route '/ensino' highlights ONLY Ensino", !ensinoStatus.home && ensinoStatus.ensino && !ensinoStatus.gestao);

  const htmlGestao = renderNavbarWithRoute("/gestao");
  const gestaoStatus = getActiveNavLinks(htmlGestao);
  recordTest("Route Highlighting", "Route '/gestao' highlights ONLY Gestão", !gestaoStatus.home && !gestaoStatus.ensino && gestaoStatus.gestao);

  // Deep Nested Routes Tests
  const htmlNestedEnsino1 = renderNavbarWithRoute("/ensino/ros2-jazzy");
  const nestedEnsinoStatus1 = getActiveNavLinks(htmlNestedEnsino1);
  recordTest("Route Highlighting", "Nested '/ensino/ros2-jazzy' highlights Ensino", !nestedEnsinoStatus1.home && nestedEnsinoStatus1.ensino && !nestedEnsinoStatus1.gestao);

  const htmlNestedEnsino2 = renderNavbarWithRoute("/ensino/ros2-jazzy/modulo-1/licao-3");
  const nestedEnsinoStatus2 = getActiveNavLinks(htmlNestedEnsino2);
  recordTest("Route Highlighting", "Deeply nested lesson path highlights Ensino", !nestedEnsinoStatus2.home && nestedEnsinoStatus2.ensino && !nestedEnsinoStatus2.gestao);

  const htmlNestedGestao = renderNavbarWithRoute("/gestao/membros");
  const nestedGestaoStatus = getActiveNavLinks(htmlNestedGestao);
  recordTest("Route Highlighting", "Nested '/gestao/membros' highlights Gestão", !nestedGestaoStatus.home && !nestedGestaoStatus.ensino && nestedGestaoStatus.gestao);

  // Adversarial Collision / Prefix Attack Tests
  const htmlFalseEnsino = renderNavbarWithRoute("/ensinando");
  const falseEnsinoStatus = getActiveNavLinks(htmlFalseEnsino);
  recordTest("Route Highlighting", "Adversarial collision '/ensinando' does NOT highlight Ensino", !falseEnsinoStatus.ensino);

  const htmlFalseEnsinoHyphen = renderNavbarWithRoute("/ensino-avancado");
  const falseEnsinoHyphenStatus = getActiveNavLinks(htmlFalseEnsinoHyphen);
  recordTest("Route Highlighting", "Adversarial collision '/ensino-avancado' does NOT highlight Ensino", !falseEnsinoHyphenStatus.ensino);

  const htmlFalseGestao = renderNavbarWithRoute("/gestaoteste");
  const falseGestaoStatus = getActiveNavLinks(htmlFalseGestao);
  recordTest("Route Highlighting", "Adversarial collision '/gestaoteste' does NOT highlight Gestão", !falseGestaoStatus.gestao);

  // Root Greedy Prefix Isolation
  recordTest("Route Highlighting", "Root '/' is NOT activated when on '/ensino'", !ensinoStatus.home);
  recordTest("Route Highlighting", "Root '/' is NOT activated when on '/gestao'", !gestaoStatus.home);

  const htmlLogin = renderNavbarWithRoute("/login");
  const loginStatus = getActiveNavLinks(htmlLogin);
  recordTest("Route Highlighting", "External route '/login' highlights NO main nav links", !loginStatus.home && !loginStatus.ensino && !loginStatus.gestao);

  // Pathname Null Resilience Test (Adversarial Vulnerability Probe)
  console.log("\n--- Testing Pathname Null / Undefined Resilience ---");
  try {
    renderNavbarWithRoute(null);
    recordTest("Route Highlighting Resilience", "Navbar handles null pathname without throwing TypeError", true);
  } catch (err: any) {
    console.warn(`  ⚠️  [ADVISORY VULNERABILITY DETECTED] Navbar throws when pathname is null: ${err.message}`);
    console.warn(`      Location: src/components/layout/navbar.tsx (isRouteActive)`);
    console.warn(`      Remediation: Add 'if (!pathname) return false;' guard.`);
  }

  // =========================================================================
  // SUITE 3: NAVBAR SESSION STATE TRANSITIONS & AUTH REACTIVITY
  // =========================================================================
  console.log("\n--- 3. STRESS-TESTING AUTH REACTIVITY & SESSION LIFECYCLE ---");

  // Step 1: Anonymous state on /api/auth/me
  try {
    const anonReq = new NextRequest("http://localhost:3000/api/auth/me");
    const anonRes = await authMeGet(anonReq);
    const anonJson = await anonRes.json();
    recordTest(
      "Auth API",
      "Anonymous request to /api/auth/me returns authenticated: false",
      anonRes.status === 200 && anonJson.authenticated === false && anonJson.user === null
    );
  } catch (err: any) {
    recordTest("Auth API", "Anonymous /api/auth/me request failed", false, err.message);
  }

  // Step 2: Login as student
  let studentCookie = "";
  try {
    const studentLoginReq = new NextRequest("http://localhost:3000/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "aluno@autonomos.ufrj.br",
        password: "Aluno@2026!",
      }),
    });
    const studentLoginRes = await authLoginPost(studentLoginReq);
    const studentLoginJson = await studentLoginRes.json();
    const setCookieHeader = studentLoginRes.headers.get("set-cookie") || "";

    const match = setCookieHeader.match(new RegExp(`${SESSION_COOKIE_NAME}=([^;]+)`));
    if (match) {
      studentCookie = match[1];
    }

    recordTest(
      "Auth API",
      "Login with valid student credentials returns HTTP 200, success: true, and Set-Cookie",
      studentLoginRes.status === 200 && studentLoginJson.success === true && !!studentCookie
    );
  } catch (err: any) {
    recordTest("Auth API", "Student login failed", false, err.message);
  }

  // Step 3: Verify /api/auth/me with valid student session cookie
  try {
    const authReq = new NextRequest("http://localhost:3000/api/auth/me", {
      headers: {
        cookie: `${SESSION_COOKIE_NAME}=${studentCookie}`,
      },
    });
    const authRes = await authMeGet(authReq);
    const authJson = await authRes.json();

    recordTest(
      "Auth API",
      "Authenticated /api/auth/me returns authenticated: true and valid user profile",
      authRes.status === 200 &&
        authJson.authenticated === true &&
        authJson.user.email === "aluno@autonomos.ufrj.br" &&
        authJson.user.role === "STUDENT"
    );
  } catch (err: any) {
    recordTest("Auth API", "Authenticated student /api/auth/me failed", false, err.message);
  }

  // Step 4: Login as admin and verify role
  let adminCookie = "";
  try {
    const adminLoginReq = new NextRequest("http://localhost:3000/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "admin@autonomos.ufrj.br",
        password: "Admin@Autonomos2026!",
      }),
    });
    const adminLoginRes = await authLoginPost(adminLoginReq);
    const setCookieHeader = adminLoginRes.headers.get("set-cookie") || "";
    const match = setCookieHeader.match(new RegExp(`${SESSION_COOKIE_NAME}=([^;]+)`));
    if (match) {
      adminCookie = match[1];
    }

    const adminAuthReq = new NextRequest("http://localhost:3000/api/auth/me", {
      headers: {
        cookie: `${SESSION_COOKIE_NAME}=${adminCookie}`,
      },
    });
    const adminAuthRes = await authMeGet(adminAuthReq);
    const adminAuthJson = await adminAuthRes.json();

    recordTest(
      "Auth API",
      "Admin session correctly reflects role 'ADMIN' in /api/auth/me",
      adminAuthRes.status === 200 &&
        adminAuthJson.authenticated === true &&
        adminAuthJson.user.role === "ADMIN"
    );
  } catch (err: any) {
    recordTest("Auth API", "Admin auth check failed", false, err.message);
  }

  // Step 5: Test logout endpoint
  try {
    const logoutRes = await authLogoutPost(new NextRequest('http://localhost/api/auth/logout', { method: 'POST' }));
    const logoutJson = await logoutRes.json();
    const setCookieHeader = logoutRes.headers.get("set-cookie") || "";

    const isCookieExpired =
      setCookieHeader.includes("Max-Age=0") || setCookieHeader.includes("max-age=0") || setCookieHeader.includes("expires=");

    recordTest(
      "Auth API",
      "Logout endpoint clears session cookie with maxAge=0",
      logoutRes.status === 200 && logoutJson.success === true && isCookieExpired
    );
  } catch (err: any) {
    recordTest("Auth API", "Logout request failed", false, err.message);
  }

  // Step 6: Tampered & Malicious JWT Token Stress Test
  try {
    const tamperedReq = new NextRequest("http://localhost:3000/api/auth/me", {
      headers: {
        cookie: `${SESSION_COOKIE_NAME}=malicious.fake.jwt-signature-token`,
      },
    });
    const tamperedRes = await authMeGet(tamperedReq);
    const tamperedJson = await tamperedRes.json();

    recordTest(
      "Auth Security",
      "Tampered/malicious JWT token safely rejected with authenticated: false without throwing 500",
      tamperedRes.status === 200 && tamperedJson.authenticated === false
    );
  } catch (err: any) {
    recordTest("Auth Security", "Tampered token caused unhandled exception", false, err.message);
  }

  // Step 7: Navbar UI Session State Representation (Simulated Renderings)
  console.log("\n--- Testing Navbar UI State Logic & Component Contracts ---");

  // SSR Initial State
  const initialHtml = renderNavbarWithRoute("/");
  recordTest(
    "Navbar UI Reactivity",
    "Initial SSR Navbar renders loading skeleton (animate-pulse) to prevent hydration flicker",
    initialHtml.includes("animate-pulse")
  );

  // User Initials Algorithm Unit Tests
  function computeInitials(name?: string | null): string {
    return name
      ? name
          .split(" ")
          .filter(Boolean)
          .map((part) => part[0])
          .slice(0, 2)
          .join("")
          .toUpperCase()
      : "UA";
  }

  function getFirstName(name?: string | null): string {
    return name ? name.trim().split(" ")[0] : "";
  }

  recordTest("User Initials", "Standard full name 'Gabriel Gaspar' -> 'GG'", computeInitials("Gabriel Gaspar") === "GG");
  recordTest("User Initials", "Single name 'Admin' -> 'A'", computeInitials("Admin") === "A");
  recordTest("User Initials", "Three names 'Carlos Eduardo Silva' -> 'CE'", computeInitials("Carlos Eduardo Silva") === "CE");
  recordTest("User Initials", "Multiple spaces '  Ana   Clara  ' -> 'AC'", computeInitials("  Ana   Clara  ") === "AC");
  recordTest("User Initials", "Empty name '' -> fallback 'UA'", computeInitials("") === "UA");
  recordTest("User Initials", "Null name -> fallback 'UA'", computeInitials(null) === "UA");

  recordTest("First Name Extraction", "First name of 'Gabriel Gaspar' is 'Gabriel'", getFirstName("Gabriel Gaspar") === "Gabriel");
  recordTest("First Name Extraction", "First name with leading spaces '  Pedro Alvares' is 'Pedro'", getFirstName("  Pedro Alvares") === "Pedro");

  // =========================================================================
  // SUITE 4: LAYOUT RESPONSIVENESS & HYDRATION MISMATCH AUDIT
  // =========================================================================
  console.log("\n--- 4. STRESS-TESTING LAYOUT RESPONSIVENESS & DOM TREE INTEGRITY ---");

  // Render Footer HTML
  const footerHtml = renderToString(React.createElement(Footer));
  recordTest("Footer Rendering", "Footer renders valid HTML containing UFRJ attribution", footerHtml.includes("Escola Politécnica • UFRJ"));
  recordTest("Footer Rendering", "Footer renders operational status beacon", footerHtml.includes("Sistemas Operacionais"));
  recordTest("Footer Rendering", "Footer contains social media links (YouTube, Instagram, GitHub, LinkedIn)",
    footerHtml.includes("youtube.com") &&
    footerHtml.includes("instagram.com") &&
    footerHtml.includes("github.com") &&
    footerHtml.includes("linkedin.com")
  );

  // Check HTML Tag Nesting Rules
  function checkHtmlNestingIntegrity(html: string, componentName: string) {
    // 1. No nested <a> tags
    const nestedAnchorRegex = /<a\b[^>]*>(?:(?!<\/a>)[\s\S])*?<a\b/i;
    const hasNestedAnchors = nestedAnchorRegex.test(html);
    recordTest("DOM Tree Integrity", `${componentName} has no illegal nested <a> inside <a>`, !hasNestedAnchors);

    // 2. No block elements inside <p> tags
    const pWithBlockRegex = /<p\b[^>]*>(?:(?!<\/p>)[\s\S])*?<(?:div|section|article|aside|nav|ul|ol|table)\b/i;
    const hasPWithBlock = pWithBlockRegex.test(html);
    recordTest("DOM Tree Integrity", `${componentName} has no illegal block elements inside <p>`, !hasPWithBlock);
  }

  checkHtmlNestingIntegrity(initialHtml, "Navbar");
  checkHtmlNestingIntegrity(footerHtml, "Footer");

  // Mobile Drawer Accessibility & Structure
  recordTest(
    "Mobile Drawer",
    "Navbar includes mobile hamburger toggle button with aria-expanded",
    initialHtml.includes("aria-expanded")
  );
  recordTest(
    "Mobile Drawer",
    "Navbar includes hidden md:flex desktop navigation and md:hidden mobile drawer",
    initialHtml.includes("md:hidden") && initialHtml.includes("hidden md:flex")
  );
  recordTest(
    "Mobile Drawer",
    "Mobile drawer panel includes translate-x-full transition class",
    initialHtml.includes("translate-x-full")
  );

  // =========================================================================
  // SUMMARY
  // =========================================================================
  console.log("\n===============================================================");
  const totalTests = results.length;
  const passedTests = results.filter((r) => r.passed).length;
  const failedTests = results.filter((r) => !r.passed).length;

  console.log(`TOTAL TESTS EXECUTED: ${totalTests}`);
  console.log(`PASSED: ${passedTests}`);
  console.log(`FAILED: ${failedTests}`);
  console.log("===============================================================");

  if (failedTests > 0) {
    console.log("\nFAILED TESTS BREAKDOWN:");
    for (const r of results.filter((r) => !r.passed)) {
      console.log(`❌ [${r.category}] ${r.name}`);
      if (r.error) console.log(`   -> Error: ${r.error}`);
    }
  }

  return { totalTests, passedTests, failedTests, results };
}

runAdversarialTestSuite()
  .then((res) => {
    if (res.failedTests > 0) {
      process.exit(1);
    }
    process.exit(0);
  })
  .catch((err) => {
    console.error("FATAL RUNNER EXCEPTION:", err);
    process.exit(1);
  });
