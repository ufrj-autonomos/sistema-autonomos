import fs from "fs";
import path from "path";
import { getGestaoStats } from "../src/lib/gestao";
import { GET as gestaoGetRoute } from "../src/app/api/gestao/stats/route";
import GestaoPage from "../src/app/(gestao)/gestao/page";
import {
  AUTONOMOS_LOGOS,
  HARPIA_LOGOS,
  NAUTILUS_LOGOS,
} from "../src/components/brand/logo";
import { Navbar } from "../src/components/layout/navbar";
import { Footer } from "../src/components/layout/footer";
import { NextRequest } from "next/server";

async function runSmokeTests() {
  console.log("====================================================");
  console.log("🧪 SMOKE TEST SUITE — MILESTONE 2");
  console.log("   Visual Identity, Shell Navigation & Gestão");
  console.log("====================================================\n");

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
  // 1. Database & Gestão Service Tests
  // -----------------------------------------------------------------
  console.log("--- 1. Testing Gestão Service & Data Aggregation ---");
  try {
    const data = await getGestaoStats();
    assert(data.success === true, "getGestaoStats() returns success: true");
    assert(typeof data.kpis.totalMembers === "number" && data.kpis.totalMembers >= 8, `KPI totalMembers is valid number (${data.kpis.totalMembers})`);
    assert(typeof data.kpis.activeProjects === "number" && data.kpis.activeProjects >= 2, `KPI activeProjects is valid number (${data.kpis.activeProjects})`);
    assert(typeof data.kpis.totalStudents === "number", `KPI totalStudents is valid number (${data.kpis.totalStudents})`);
    assert(data.kpis.platformStatus === "online", "Platform status is reported as online");

    assert(data.divisions.length === 2, "Returns 2 divisions (Harpia & Nautilus)");
    const harpia = data.divisions.find((d) => d.slug === "harpia");
    const nautilus = data.divisions.find((d) => d.slug === "nautilus");
    assert(!!harpia && harpia.vehicleType === "UAV", "Harpia division classified as UAV");
    assert(!!nautilus && nautilus.vehicleType === "AUV", "Nautilus division classified as AUV");
    assert(harpia?.specs.softwareStack.includes("ROS 2 Jazzy Jalisco") ?? false, "Harpia software stack includes ROS 2 Jazzy Jalisco");
    assert(nautilus?.specs.softwareStack.includes("ROS 2 Jazzy Jalisco") ?? false, "Nautilus software stack includes ROS 2 Jazzy Jalisco");

    assert(data.members.length >= 8, `Member roster contains at least 8 technical members (${data.members.length} found)`);
    assert(data.projects.length >= 4, `Robotics projects list contains at least 4 projects (${data.projects.length} found)`);
    assert(data.system.database.status === "online", "Supabase PostgreSQL status is online");
    assert(data.operationalLogs.length > 0, `Operational logs stream present (${data.operationalLogs.length} logs)`);
  } catch (err) {
    assert(false, `getGestaoStats() threw an unexpected exception: ${err}`);
  }

  // -----------------------------------------------------------------
  // 2. API Route GET /api/gestao/stats
  // -----------------------------------------------------------------
  console.log("\n--- 2. Testing API Route GET /api/gestao/stats ---");
  try {
    const fakeReq = new NextRequest("http://localhost:3000/api/gestao/stats");
    const res = await gestaoGetRoute(fakeReq);
    assert(res.status === 200, "GET /api/gestao/stats returns HTTP 200");
    const json = await res.json();
    assert(json.success === true, "Route JSON body contains success: true");
    assert(json.divisions[0].slug === "harpia", "First division in API response is Harpia");
    assert(json.divisions[1].slug === "nautilus", "Second division in API response is Nautilus");
  } catch (err) {
    assert(false, `API route test failed: ${err}`);
  }

  // -----------------------------------------------------------------
  // 3. Official Vector Logo Component & Assets
  // -----------------------------------------------------------------
  console.log("\n--- 3. Testing Official Vector Logo Assets ---");
  const basePath = path.resolve(__dirname, "../public");
  
  const sampleLogos = [
    AUTONOMOS_LOGOS.horizontalWhite,
    AUTONOMOS_LOGOS.horizontalDark,
    AUTONOMOS_LOGOS.stackedWhite,
    AUTONOMOS_LOGOS.symbolWhite,
    AUTONOMOS_LOGOS.badgeRounded,
    HARPIA_LOGOS.horizontalWhite,
    HARPIA_LOGOS.symbolEagleWhite,
    HARPIA_LOGOS.symbolDroneWhite,
    HARPIA_LOGOS.badgeRounded,
    NAUTILUS_LOGOS.horizontalWhite,
    NAUTILUS_LOGOS.symbolAuvWhite,
    NAUTILUS_LOGOS.symbolShellWhite,
    NAUTILUS_LOGOS.badgeRounded,
  ];

  let missingFiles = 0;
  for (const relSrc of sampleLogos) {
    const fullPath = path.join(basePath, relSrc);
    if (!fs.existsSync(fullPath)) {
      missingFiles++;
      console.error(`     Missing asset: ${fullPath}`);
    }
  }
  assert(missingFiles === 0, `All ${sampleLogos.length} sample SVG logo files exist in public/images/logos`);

  // -----------------------------------------------------------------
  // 4. Gestão Page Server Component Render
  // -----------------------------------------------------------------
  console.log("\n--- 4. Testing Gestão Page Server Component ---");
  try {
    const pageElement = await GestaoPage();
    assert(!!pageElement && typeof pageElement === "object", "GestaoPage() renders a valid React JSX tree");
    assert((pageElement as any).type === "div", "GestaoPage root container is a div");
  } catch (err) {
    assert(false, `GestaoPage() threw error during render: ${err}`);
  }

  // -----------------------------------------------------------------
  // 5. Navigation Shell Components (Navbar & Footer)
  // -----------------------------------------------------------------
  console.log("\n--- 5. Testing Layout Shell Components ---");
  assert(typeof Navbar === "function", "Navbar component is exported as function");
  assert(typeof Footer === "function", "Footer component is exported as function");

  console.log("\n====================================================");
  console.log(`SUMMARY: ${passed} PASSED | ${failed} FAILED`);
  console.log("====================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runSmokeTests().catch((err) => {
  console.error("FATAL ERROR IN SMOKE TEST:", err);
  process.exit(1);
});
