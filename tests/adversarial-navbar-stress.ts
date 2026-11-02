import React from "react";
import { renderToString } from "react-dom/server";
import { AppRouterContext } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { PathnameContext } from "next/dist/shared/lib/hooks-client-context.shared-runtime";
import { Navbar } from "../src/components/layout/navbar";

const mockRouter: any = {
  push: () => {},
  replace: () => {},
  refresh: () => {},
  back: () => {},
  forward: () => {},
  prefetch: () => {},
};

interface StressCase {
  inputDesc: string;
  pathname: any;
  expectedActive: {
    inicio: boolean;
    ensino: boolean;
    gestao: boolean;
  };
}

const stressCases: StressCase[] = [
  {
    inputDesc: "pathname = null",
    pathname: null,
    expectedActive: { inicio: false, ensino: false, gestao: false },
  },
  {
    inputDesc: "pathname = undefined",
    pathname: undefined,
    expectedActive: { inicio: false, ensino: false, gestao: false },
  },
  {
    inputDesc: "pathname = '' (empty string)",
    pathname: "",
    expectedActive: { inicio: false, ensino: false, gestao: false },
  },
  {
    inputDesc: "pathname = '/' (root)",
    pathname: "/",
    expectedActive: { inicio: true, ensino: false, gestao: false },
  },
  {
    inputDesc: "pathname = '/gestao'",
    pathname: "/gestao",
    expectedActive: { inicio: false, ensino: false, gestao: true },
  },
  {
    inputDesc: "pathname = '/gestao/subpath'",
    pathname: "/gestao/subpath",
    expectedActive: { inicio: false, ensino: false, gestao: true },
  },
  {
    inputDesc: "pathname = '/gestao/membros/equipe/1'",
    pathname: "/gestao/membros/equipe/1",
    expectedActive: { inicio: false, ensino: false, gestao: true },
  },
  {
    inputDesc: "pathname = '/ensino'",
    pathname: "/ensino",
    expectedActive: { inicio: false, ensino: true, gestao: false },
  },
  {
    inputDesc: "pathname = '/ensino/ros2-jazzy'",
    pathname: "/ensino/ros2-jazzy",
    expectedActive: { inicio: false, ensino: true, gestao: false },
  },
  {
    inputDesc: "pathname = '//' (double slash)",
    pathname: "//",
    expectedActive: { inicio: false, ensino: false, gestao: false },
  },
  {
    inputDesc: "pathname = '///' (triple slash)",
    pathname: "///",
    expectedActive: { inicio: false, ensino: false, gestao: false },
  },
  {
    inputDesc: "pathname = '/gestaox' (prefix collision)",
    pathname: "/gestaox",
    expectedActive: { inicio: false, ensino: false, gestao: false },
  },
  {
    inputDesc: "pathname = '/ensinando' (prefix collision)",
    pathname: "/ensinando",
    expectedActive: { inicio: false, ensino: false, gestao: false },
  },
  {
    inputDesc: "pathname = '/ensino-avancado' (hyphenated collision)",
    pathname: "/ensino-avancado",
    expectedActive: { inicio: false, ensino: false, gestao: false },
  },
  {
    inputDesc: "pathname = '/login' (unrelated route)",
    pathname: "/login",
    expectedActive: { inicio: false, ensino: false, gestao: false },
  },
  {
    inputDesc: "pathname = 'https://malicious.org' (external URL injection)",
    pathname: "https://malicious.org",
    expectedActive: { inicio: false, ensino: false, gestao: false },
  },
];

function analyzeRender(html: string) {
  // Primary desktop nav
  const desktopNavMatch = html.match(/<nav[^>]*aria-label="Navegação Principal"[\s\S]*?<\/nav>/);
  const desktopNav = desktopNavMatch ? desktopNavMatch[0] : "";

  const inicioDesktop = desktopNav.match(/<a\b[^>]*?\bhref="\/"[^>]*>/)?.[0] || "";
  const ensinoDesktop = desktopNav.match(/<a\b[^>]*?\bhref="\/ensino"[^>]*>/)?.[0] || "";
  const gestaoDesktop = desktopNav.match(/<a\b[^>]*?\bhref="\/gestao"[^>]*>/)?.[0] || "";

  const checkDesktopActive = (tag: string) => tag.includes("bg-white/10 text-zinc-100");

  // Mobile nav
  const mobileNavMatch = html.match(/<nav[^>]*aria-label="Menu Mobile"[\s\S]*?<\/nav>/);
  const mobileNav = mobileNavMatch ? mobileNavMatch[0] : "";

  const inicioMobile = mobileNav.match(/<a\b[^>]*?\bhref="\/"[^>]*>/)?.[0] || "";
  const ensinoMobile = mobileNav.match(/<a\b[^>]*?\bhref="\/ensino"[^>]*>/)?.[0] || "";
  const gestaoMobile = mobileNav.match(/<a\b[^>]*?\bhref="\/gestao"[^>]*>/)?.[0] || "";

  const checkMobileActive = (tag: string) => tag.includes("bg-white/10 text-zinc-100");

  return {
    desktop: {
      inicio: checkDesktopActive(inicioDesktop),
      ensino: checkDesktopActive(ensinoDesktop),
      gestao: checkDesktopActive(gestaoDesktop),
    },
    mobile: {
      inicio: checkMobileActive(inicioMobile),
      ensino: checkMobileActive(ensinoMobile),
      gestao: checkMobileActive(gestaoMobile),
    },
  };
}

console.log("===============================================================================");
console.log("🔥 EMPIRICAL CHALLENGER: EXTREME INPUT STRESS-TEST FOR NAVBAR RESILIENCE");
console.log("===============================================================================\n");

let passed = 0;
let failed = 0;

for (const tc of stressCases) {
  try {
    const html = renderToString(
      React.createElement(
        AppRouterContext.Provider,
        { value: mockRouter },
        React.createElement(
          PathnameContext.Provider,
          { value: tc.pathname },
          React.createElement(Navbar)
        )
      )
    );

    const actual = analyzeRender(html);

    const desktopMatch =
      actual.desktop.inicio === tc.expectedActive.inicio &&
      actual.desktop.ensino === tc.expectedActive.ensino &&
      actual.desktop.gestao === tc.expectedActive.gestao;

    const mobileMatch =
      actual.mobile.inicio === tc.expectedActive.inicio &&
      actual.mobile.ensino === tc.expectedActive.ensino &&
      actual.mobile.gestao === tc.expectedActive.gestao;

    if (desktopMatch && mobileMatch) {
      passed++;
      console.log(`  ✅ [PASS] ${tc.inputDesc}`);
      console.log(
        `     Active states: Início=${actual.desktop.inicio}, Ensino=${actual.desktop.ensino}, Gestão=${actual.desktop.gestao} (Desktop & Mobile synchronized)`
      );
    } else {
      failed++;
      console.error(`  ❌ [FAIL] ${tc.inputDesc}`);
      console.error(
        `     Expected: Início=${tc.expectedActive.inicio}, Ensino=${tc.expectedActive.ensino}, Gestão=${tc.expectedActive.gestao}`
      );
      console.error(
        `     Actual Desktop: Início=${actual.desktop.inicio}, Ensino=${actual.desktop.ensino}, Gestão=${actual.desktop.gestao}`
      );
      console.error(
        `     Actual Mobile:  Início=${actual.mobile.inicio}, Ensino=${actual.mobile.ensino}, Gestão=${actual.mobile.gestao}`
      );
    }
  } catch (err: any) {
    failed++;
    console.error(`  💥 [EXCEPTION] ${tc.inputDesc} threw: ${err.message}`);
  }
}

console.log("\n===============================================================================");
console.log(`SUMMARY: ${passed} PASSED | ${failed} FAILED (Total: ${stressCases.length})`);
console.log("===============================================================================");

if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
