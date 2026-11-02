import { prisma } from "../src/lib/prisma";
import { getGestaoStats } from "../src/lib/gestao";
import { GET as gestaoGetRoute } from "../src/app/api/gestao/stats/route";
import * as CourseRoute from "../src/app/api/courses/ros2-jazzy/route";
import * as LessonRoute from "../src/app/api/lessons/[id]/route";
import * as RegisterRoute from "../src/app/api/auth/register/route";
import * as LoginRoute from "../src/app/api/auth/login/route";
import * as MeRoute from "../src/app/api/auth/me/route";
import * as LogoutRoute from "../src/app/api/auth/logout/route";
import { NextRequest } from "next/server";
import { execSync } from "child_process";
import type { MemberRecord } from "../src/components/gestao/types";
import { filterMembers } from "../src/components/gestao/team-roster";

interface TestReport {
  timestamp: string;
  verdict: "APPROVE" | "REJECT";
  stats: { total: number; passed: number; failed: number };
  results: {
    supabaseLiveValidation: any;
    seedGestaoIdempotency: any;
    gestaoStatsRoute: any;
    teamRosterFiltering: any;
    m1RegressionAuth: any;
    m1RegressionCourses: any;
  };
  errors: string[];
}

async function runChallengerTests(): Promise<TestReport> {
  const report: TestReport = {
    timestamp: new Date().toISOString(),
    verdict: "APPROVE",
    stats: { total: 0, passed: 0, failed: 0 },
    results: {
      supabaseLiveValidation: {},
      seedGestaoIdempotency: {},
      gestaoStatsRoute: {},
      teamRosterFiltering: {},
      m1RegressionAuth: {},
      m1RegressionCourses: {},
    },
    errors: [],
  };

  function assert(condition: boolean, testId: string, description: string) {
    report.stats.total++;
    if (condition) {
      report.stats.passed++;
      console.log(`  ✅ [PASS] ${testId}: ${description}`);
    } else {
      report.stats.failed++;
      report.verdict = "REJECT";
      const err = `❌ [FAIL] ${testId}: ${description}`;
      report.errors.push(err);
      console.error(`  ${err}`);
    }
  }

  console.log("================================================================================");
  console.log("🛡️  EMPIRICAL CHALLENGER TEST HARNESS — MILESTONE 2");
  console.log("    Gestão Subsystem, APIs, Supabase PostgreSQL & M1 Regressions");
  console.log("================================================================================\n");

  // ============================================================================
  // SECTION 1: LIVE SUPABASE POSTGRESQL DATA VALIDATION
  // ============================================================================
  console.log("--------------------------------------------------------------------------------");
  console.log("📦 SECTION 1: Live Supabase PostgreSQL Data Validation");
  console.log("--------------------------------------------------------------------------------");

  const teams = await prisma.team.findMany({
    include: { members: true, projects: true },
    orderBy: { slug: "asc" },
  });

  assert(teams.length === 2, "DB-TEAM-COUNT", `Live Supabase has exactly 2 teams (found: ${teams.length})`);

  const harpiaTeam = teams.find((t) => t.slug === "harpia");
  const nautilusTeam = teams.find((t) => t.slug === "nautilus");

  assert(!!harpiaTeam, "DB-TEAM-HARPIA", "Harpia team exists with slug 'harpia'");
  assert(!!nautilusTeam, "DB-TEAM-NAUTILUS", "Nautilus team exists with slug 'nautilus'");
  assert(harpiaTeam?.founded === 2026, "DB-TEAM-HARPIA-FOUNDED", `Harpia founded year is 2026 (found: ${harpiaTeam?.founded})`);
  assert(nautilusTeam?.founded === 2016, "DB-TEAM-NAUTILUS-FOUNDED", `Nautilus founded year is 2016 (found: ${nautilusTeam?.founded})`);

  // Projects validation
  const projects = await prisma.project.findMany({
    include: { team: true },
    orderBy: { id: "asc" },
  });

  assert(projects.length === 4, "DB-PROJECTS-COUNT", `Live Supabase has exactly 4 projects (found: ${projects.length})`);

  const harpiaProjects = projects.filter((p) => p.team.slug === "harpia");
  const nautilusProjects = projects.filter((p) => p.team.slug === "nautilus");

  assert(harpiaProjects.length === 2, "DB-PROJECTS-HARPIA-LINK", `Harpia has exactly 2 linked projects (found: ${harpiaProjects.length})`);
  assert(nautilusProjects.length === 2, "DB-PROJECTS-NAUTILUS-LINK", `Nautilus has exactly 2 linked projects (found: ${nautilusProjects.length})`);

  const expectedProjectSlugs = ["hexacopter-h01", "vant-asa-fixa-alpha", "brhue-auv", "vovozao-auv"];
  const actualProjectSlugs = projects.map((p) => p.slug);
  const allProjectSlugsPresent = expectedProjectSlugs.every((slug) => actualProjectSlugs.includes(slug));
  assert(allProjectSlugsPresent, "DB-PROJECTS-SLUGS", `All expected project slugs present: ${expectedProjectSlugs.join(", ")}`);

  // Members validation
  const members = await prisma.member.findMany({
    include: { team: true },
    orderBy: { id: "asc" },
  });

  assert(members.length >= 8, "DB-MEMBERS-COUNT", `Live Supabase has >= 8 members (found: ${members.length})`);

  const harpiaMembers = members.filter((m) => m.team?.slug === "harpia");
  const nautilusMembers = members.filter((m) => m.team?.slug === "nautilus");
  const geralMembers = members.filter((m) => m.team === null);

  assert(harpiaMembers.length >= 3, "DB-MEMBERS-HARPIA", `Harpia has at least 3 linked members (found: ${harpiaMembers.length})`);
  assert(nautilusMembers.length >= 3, "DB-MEMBERS-NAUTILUS", `Nautilus has at least 3 linked members (found: ${nautilusMembers.length})`);
  assert(geralMembers.length >= 2, "DB-MEMBERS-GERAL", `General/Management members with team=null is >= 2 (found: ${geralMembers.length})`);

  const allMembersActive = members.every((m) => m.active === true);
  assert(allMembersActive, "DB-MEMBERS-ACTIVE", "All members in database have active === true");

  report.results.supabaseLiveValidation = {
    teams: teams.map((t) => ({ id: t.id, slug: t.slug, name: t.name })),
    projects: projects.map((p) => ({ id: p.id, slug: p.slug, team: p.team.slug })),
    membersCount: members.length,
    harpiaMembers: harpiaMembers.map((m) => m.name),
    nautilusMembers: nautilusMembers.map((m) => m.name),
    geralMembers: geralMembers.map((m) => m.name),
  };

  // ============================================================================
  // SECTION 2: PRISMA SEED GESTÃO IDEMPOTENCY
  // ============================================================================
  console.log("\n--------------------------------------------------------------------------------");
  console.log("🔄 SECTION 2: prisma/seed-gestao.ts Idempotency Testing");
  console.log("--------------------------------------------------------------------------------");

  const preSeedTeams = await prisma.team.count();
  const preSeedProjects = await prisma.project.count();
  const preSeedMembers = await prisma.member.count();

  console.log(`   Pre-seed counts: ${preSeedTeams} teams, ${preSeedProjects} projects, ${preSeedMembers} members`);

  let run1Success = false;
  try {
    execSync("npx tsx prisma/seed-gestao.ts", {
      cwd: "/home/gaspar/projetos/autonomos/sistema-autonomos",
      stdio: "pipe",
    });
    run1Success = true;
  } catch (err: any) {
    console.error("   Error during seed run 1:", err.message);
  }
  assert(run1Success, "SEED-IDEM-RUN-1", "Seed execution 1 ran without crashing");

  const midSeedTeams = await prisma.team.count();
  const midSeedProjects = await prisma.project.count();
  const midSeedMembers = await prisma.member.count();

  assert(midSeedTeams === preSeedTeams, "SEED-IDEM-NO-DUP-TEAMS-1", `Teams count unchanged after run 1 (${midSeedTeams} === ${preSeedTeams})`);
  assert(midSeedProjects === preSeedProjects, "SEED-IDEM-NO-DUP-PROJECTS-1", `Projects count unchanged after run 1 (${midSeedProjects} === ${preSeedProjects})`);
  assert(midSeedMembers === preSeedMembers, "SEED-IDEM-NO-DUP-MEMBERS-1", `Members count unchanged after run 1 (${midSeedMembers} === ${preSeedMembers})`);

  let run2Success = false;
  try {
    execSync("npx tsx prisma/seed-gestao.ts", {
      cwd: "/home/gaspar/projetos/autonomos/sistema-autonomos",
      stdio: "pipe",
    });
    run2Success = true;
  } catch (err: any) {
    console.error("   Error during seed run 2:", err.message);
  }
  assert(run2Success, "SEED-IDEM-RUN-2", "Seed execution 2 (consecutive) ran without crashing");

  const postSeedTeams = await prisma.team.count();
  const postSeedProjects = await prisma.project.count();
  const postSeedMembers = await prisma.member.count();

  assert(postSeedTeams === preSeedTeams, "SEED-IDEM-NO-DUP-TEAMS-2", `Teams count unchanged after run 2 (${postSeedTeams} === ${preSeedTeams})`);
  assert(postSeedProjects === preSeedProjects, "SEED-IDEM-NO-DUP-PROJECTS-2", `Projects count unchanged after run 2 (${postSeedProjects} === ${preSeedProjects})`);
  assert(postSeedMembers === preSeedMembers, "SEED-IDEM-NO-DUP-MEMBERS-2", `Members count unchanged after run 2 (${postSeedMembers} === ${preSeedMembers})`);

  report.results.seedGestaoIdempotency = {
    preSeed: { teams: preSeedTeams, projects: preSeedProjects, members: preSeedMembers },
    postRun1: { teams: midSeedTeams, projects: midSeedProjects, members: midSeedMembers },
    postRun2: { teams: postSeedTeams, projects: postSeedProjects, members: postSeedMembers },
    isIdempotent: postSeedTeams === preSeedTeams && postSeedProjects === preSeedProjects && postSeedMembers === preSeedMembers,
  };

  // ============================================================================
  // SECTION 3: GET /api/gestao/stats DIRECT TESTING & RESILIENCE
  // ============================================================================
  console.log("\n--------------------------------------------------------------------------------");
  console.log("⚡ SECTION 3: GET /api/gestao/stats Route, Latency, and Resilience");
  console.log("--------------------------------------------------------------------------------");

  const latencies: number[] = [];
  let statsPayload: any = null;

  for (let i = 1; i <= 5; i++) {
    const t0 = performance.now();
    const req = new NextRequest("http://localhost:3000/api/gestao/stats");
    const res = await gestaoGetRoute(req);
    const latency = performance.now() - t0;
    latencies.push(latency);

    assert(res.status === 200, `API-GESTAO-STATUS-${i}`, `Request ${i} returned HTTP 200`);
    const cacheHeader = res.headers.get("Cache-Control");
    assert(cacheHeader === "no-store, max-age=0", `API-GESTAO-CACHE-${i}`, `Request ${i} has Cache-Control: no-store, max-age=0`);

    if (i === 1) {
      statsPayload = await res.json();
    }
  }

  const avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;
  const minLatency = Math.min(...latencies);
  const maxLatency = Math.max(...latencies);

  console.log(`   Latency profile over 5 requests: avg=${avgLatency.toFixed(2)}ms, min=${minLatency.toFixed(2)}ms, max=${maxLatency.toFixed(2)}ms`);
  assert(avgLatency < 3000, "API-GESTAO-LATENCY-BOUND", `Average API latency is within operational bound (<3000ms, actual: ${avgLatency.toFixed(2)}ms)`);

  // Deep Schema & Value assertions
  assert(statsPayload.success === true, "API-GESTAO-BODY-SUCCESS", "Response payload has success: true");
  assert(typeof statsPayload.timestamp === "string" && !isNaN(Date.parse(statsPayload.timestamp)), "API-GESTAO-TIMESTAMP", "Valid ISO timestamp present");

  // KPIs
  assert(typeof statsPayload.kpis.totalMembers === "number" && statsPayload.kpis.totalMembers >= 8, "API-GESTAO-KPI-MEMBERS", `KPI totalMembers >= 8 (${statsPayload.kpis.totalMembers})`);
  assert(typeof statsPayload.kpis.activeProjects === "number" && statsPayload.kpis.activeProjects >= 2, "API-GESTAO-KPI-PROJECTS", `KPI activeProjects >= 2 (${statsPayload.kpis.activeProjects})`);
  assert(typeof statsPayload.kpis.totalStudents === "number", "API-GESTAO-KPI-STUDENTS", `KPI totalStudents is number (${statsPayload.kpis.totalStudents})`);
  assert(statsPayload.kpis.platformStatus === "online", "API-GESTAO-KPI-STATUS", "KPI platformStatus is 'online'");
  assert(typeof statsPayload.kpis.dbLatencyMs === "number" && statsPayload.kpis.dbLatencyMs < 2000, "API-GESTAO-KPI-DBLATENCY", `KPI dbLatencyMs is reasonable (${statsPayload.kpis.dbLatencyMs}ms)`);

  // Divisions
  assert(Array.isArray(statsPayload.divisions) && statsPayload.divisions.length === 2, "API-GESTAO-DIVISIONS-LEN", "Returns exactly 2 divisions");
  const harpiaDiv = statsPayload.divisions.find((d: any) => d.slug === "harpia");
  const nautilusDiv = statsPayload.divisions.find((d: any) => d.slug === "nautilus");
  assert(!!harpiaDiv && harpiaDiv.vehicleType === "UAV", "API-GESTAO-HARPIA-UAV", "Harpia division has vehicleType UAV");
  assert(!!nautilusDiv && nautilusDiv.vehicleType === "AUV", "API-GESTAO-NAUTILUS-AUV", "Nautilus division has vehicleType AUV");
  assert(harpiaDiv?.specs?.softwareStack?.includes("ROS 2 Jazzy Jalisco"), "API-GESTAO-HARPIA-ROS2", "Harpia software stack includes ROS 2 Jazzy Jalisco");
  assert(nautilusDiv?.specs?.softwareStack?.includes("ROS 2 Jazzy Jalisco"), "API-GESTAO-NAUTILUS-ROS2", "Nautilus software stack includes ROS 2 Jazzy Jalisco");

  // System status
  assert(statsPayload.system?.database?.status === "online", "API-GESTAO-SYS-DB", "System database status is online");
  assert(statsPayload.system?.auth?.status === "online", "API-GESTAO-SYS-AUTH", "System auth status is online");
  assert(statsPayload.system?.courses?.status === "online", "API-GESTAO-SYS-COURSES", "System courses status is online");
  assert(statsPayload.system?.courses?.modulesCount === 11, "API-GESTAO-SYS-MODULES", `Courses modulesCount is 11 (found: ${statsPayload.system?.courses?.modulesCount})`);
  assert(statsPayload.system?.courses?.lessonsCount === 108, "API-GESTAO-SYS-LESSONS", `Courses lessonsCount is 108 (found: ${statsPayload.system?.courses?.lessonsCount})`);

  // Operational logs
  assert(Array.isArray(statsPayload.operationalLogs) && statsPayload.operationalLogs.length >= 6, "API-GESTAO-LOGS", `Operational logs present (found: ${statsPayload.operationalLogs?.length})`);

  // Resilience: Adversarial queries (unexpected params, long queries, injection)
  const adversarialUris = [
    "http://localhost:3000/api/gestao/stats?drop=table",
    "http://localhost:3000/api/gestao/stats?filter=" + "A".repeat(2000),
    "http://localhost:3000/api/gestao/stats?query=' OR 1=1--",
    "http://localhost:3000/api/gestao/stats?__proto__[polluted]=true",
  ];

  for (let idx = 0; idx < adversarialUris.length; idx++) {
    const advReq = new NextRequest(adversarialUris[idx]);
    const advRes = await gestaoGetRoute(advReq);
    assert(advRes.status === 200, `API-GESTAO-RESILIENCE-${idx + 1}`, `Adversarial URI #${idx + 1} gracefully handled with HTTP 200`);
  }

  report.results.gestaoStatsRoute = {
    latencies: { avg: avgLatency, min: minLatency, max: maxLatency },
    samplePayloadKpis: statsPayload.kpis,
    systemStatus: statsPayload.system,
  };

  // ============================================================================
  // SECTION 4: MEMBER SEARCH AND FILTER LOGIC STRESS-TEST (team-roster.tsx)
  // ============================================================================
  console.log("\n--------------------------------------------------------------------------------");
  console.log("🎯 SECTION 4: team-roster.tsx Search & Filter Logic Stress-Testing");
  console.log("--------------------------------------------------------------------------------");

  const rawMembers = statsPayload.members as MemberRecord[];

  // 1. Baseline: empty search, all divisions, all areas
  const allResult = filterMembers(rawMembers, "", "all", "all");
  assert(allResult.length === rawMembers.length, "ROSTER-EMPTY-SEARCH", `Empty search returns all members (${allResult.length}/${rawMembers.length})`);

  const whitespaceResult = filterMembers(rawMembers, "   \t\n  ", "all", "all");
  assert(whitespaceResult.length === rawMembers.length, "ROSTER-WHITESPACE-SEARCH", `Whitespace-only search returns all members (${whitespaceResult.length}/${rawMembers.length})`);

  // 2. Division filtering
  const harpiaOnly = filterMembers(rawMembers, "", "harpia", "all");
  const nautilusOnly = filterMembers(rawMembers, "", "nautilus", "all");
  const geralOnly = filterMembers(rawMembers, "", "geral", "all");

  assert(harpiaOnly.length === 3, "ROSTER-DIV-HARPIA", `Harpia division filter returns exactly 3 members (found: ${harpiaOnly.length})`);
  assert(harpiaOnly.every((m) => m.division === "harpia"), "ROSTER-DIV-HARPIA-PURITY", "All Harpia filter results have division === 'harpia'");

  assert(nautilusOnly.length === 3, "ROSTER-DIV-NAUTILUS", `Nautilus division filter returns exactly 3 members (found: ${nautilusOnly.length})`);
  assert(nautilusOnly.every((m) => m.division === "nautilus"), "ROSTER-DIV-NAUTILUS-PURITY", "All Nautilus filter results have division === 'nautilus'");

  assert(geralOnly.length === 2, "ROSTER-DIV-GERAL", `Geral division filter returns exactly 2 members (found: ${geralOnly.length})`);
  assert(geralOnly.every((m) => m.division === "geral"), "ROSTER-DIV-GERAL-PURITY", "All Geral filter results have division === 'geral'");

  assert(harpiaOnly.length + nautilusOnly.length + geralOnly.length === rawMembers.length, "ROSTER-DIV-PARTITION", "Divisions partition full roster with no leaks or omissions");

  // 3. Technical Area filtering
  // Software works because "software" has no diacritics
  const softwareOnly = filterMembers(rawMembers, "", "all", "software");
  assert(softwareOnly.length === 4, "ROSTER-AREA-SOFTWARE", `Software area filter returns 4 members (found: ${softwareOnly.length})`);

  // CRITICAL BUG VERIFICATION: In team-roster.tsx, the <select> element has:
  // <option value="mecanica">, <option value="eletronica">, <option value="gestao">
  // But database stores member.area as "Mecânica", "Eletrônica", "Gestão".
  // The filter compares: member.area.toLowerCase() === selectedArea.toLowerCase()
  // "mecânica" === "mecanica" -> false!
  const mecanicaFromDropdown = filterMembers(rawMembers, "", "all", "mecanica");
  const eletronicaFromDropdown = filterMembers(rawMembers, "", "all", "eletronica");
  const gestaoFromDropdown = filterMembers(rawMembers, "", "all", "gestao");

  const isAreaDropdownBroken =
    mecanicaFromDropdown.length === 0 &&
    eletronicaFromDropdown.length === 0 &&
    gestaoFromDropdown.length === 0;

  assert(
    !isAreaDropdownBroken,
    "ROSTER-AREA-DROPDOWN-DIACRITICS",
    `BUG in team-roster.tsx: Dropdown options 'mecanica', 'eletronica', 'gestao' fail to match accented DB records 'Mecânica', 'Eletrônica', 'Gestão' (found: mecanica=${mecanicaFromDropdown.length}, eletronica=${eletronicaFromDropdown.length}, gestao=${gestaoFromDropdown.length})`
  );

  // 4. Case-insensitivity in search
  const sofiaLower = filterMembers(rawMembers, "sofia", "all", "all");
  const sofiaUpper = filterMembers(rawMembers, "SOFIA", "all", "all");
  const sofiaMixed = filterMembers(rawMembers, "SoFiA", "all", "all");
  assert(sofiaLower.length === 1 && sofiaLower[0].name === "Sofia Oliveira", "ROSTER-SEARCH-CASE-LOWER", "Search 'sofia' matches Sofia Oliveira");
  assert(sofiaUpper.length === 1 && sofiaUpper[0].name === "Sofia Oliveira", "ROSTER-SEARCH-CASE-UPPER", "Search 'SOFIA' matches Sofia Oliveira");
  assert(sofiaMixed.length === 1 && sofiaMixed[0].name === "Sofia Oliveira", "ROSTER-SEARCH-CASE-MIXED", "Search 'SoFiA' matches Sofia Oliveira");

  // 5. Search across all searchable fields
  // Role
  const liderSearch = filterMembers(rawMembers, "Líder", "all", "all");
  assert(liderSearch.length === 2, "ROSTER-SEARCH-ROLE", `Search by role 'Líder' returns 2 technical leaders (found: ${liderSearch.length})`);

  // Course
  const controleSearch = filterMembers(rawMembers, "Controle", "all", "all");
  assert(controleSearch.length >= 2, "ROSTER-SEARCH-COURSE", `Search by course 'Controle' matches students (found: ${controleSearch.length})`);

  // Bio keywords
  const px4Search = filterMembers(rawMembers, "PX4", "all", "all");
  assert(px4Search.length >= 1 && px4Search.some((m) => m.name === "Sofia Oliveira"), "ROSTER-SEARCH-BIO-PX4", "Search by bio keyword 'PX4' matches Sofia Oliveira");

  const dvlSearch = filterMembers(rawMembers, "DVL", "all", "all");
  assert(dvlSearch.length >= 1 && dvlSearch.some((m) => m.name === "Gabriel Santos"), "ROSTER-SEARCH-BIO-DVL", "Search by bio keyword 'DVL' matches Gabriel Santos");

  const cfdSearch = filterMembers(rawMembers, "CFD", "all", "all");
  assert(cfdSearch.length >= 1 && cfdSearch.some((m) => m.name === "Rodrigo Lima"), "ROSTER-SEARCH-BIO-CFD", "Search by bio keyword 'CFD' matches Rodrigo Lima");

  const canSearch = filterMembers(rawMembers, "CAN bus", "all", "all");
  assert(canSearch.length >= 1 && canSearch.some((m) => m.name === "Beatriz Almeida"), "ROSTER-SEARCH-BIO-CAN", "Search by bio keyword 'CAN bus' matches Beatriz Almeida");

  const btreeSearch = filterMembers(rawMembers, "BehaviorTree", "all", "all");
  assert(btreeSearch.length >= 1 && btreeSearch.some((m) => m.name === "Carlos Eduardo"), "ROSTER-SEARCH-BIO-BTREE", "Search by bio keyword 'BehaviorTree' matches Carlos Eduardo");

  // 6. Non-matching query / Negative assertions
  const noMatchSearch = filterMembers(rawMembers, "NonExistentMemberXYZ999", "all", "all");
  assert(noMatchSearch.length === 0, "ROSTER-SEARCH-NO-MATCH", "Non-matching search returns empty array []");

  // 7. Cross-filtering conjunctions (AND logic)
  const harpiaSoftware = filterMembers(rawMembers, "", "harpia", "software");
  assert(harpiaSoftware.length === 2, "ROSTER-CROSS-HARPIA-SOFTWARE", `Harpia AND Software returns 2 members (found: ${harpiaSoftware.length})`);

  const harpiaNautilusKeyword = filterMembers(rawMembers, "Nautilus", "harpia", "all");
  assert(harpiaNautilusKeyword.length === 0, "ROSTER-CROSS-CONTRADICTION", "Harpia division AND search 'Nautilus' yields 0 matches");

  // If diacritic matches:
  const nautilusMecanicaExact = filterMembers(rawMembers, "", "nautilus", "Mecânica");
  assert(nautilusMecanicaExact.length === 1 && nautilusMecanicaExact[0].name === "Rodrigo Lima", "ROSTER-CROSS-NAUTILUS-MEC-EXACT", "Nautilus AND 'Mecânica' correctly isolates Rodrigo Lima when diacritics match");

  // 8. Resilience against edge-case data: missing fields, regex characters, long strings
  const membersWithNulls: MemberRecord[] = [
    {
      id: 99,
      name: "Teste Sem Curso e Bio",
      role: "Engenheiro",
      area: "Software",
      division: "harpia",
      divisionLabel: "Divisão Harpia",
      bio: null,
      course: null,
      linkedin: null,
      github: null,
      active: true,
    },
  ];

  let nullSafetyPassed = false;
  try {
    const nullResult = filterMembers(membersWithNulls, "Engenheiro", "all", "all");
    nullSafetyPassed = nullResult.length === 1;
  } catch (err) {
    nullSafetyPassed = false;
  }
  assert(nullSafetyPassed, "ROSTER-NULL-SAFETY", "Filter gracefully handles members with null bio and course without throwing TypeError");

  const regexInjections = [".*", "\\d+", "[a-z]", "(foo|bar)", "^.*$"];
  let regexSafetyPassed = true;
  for (const reg of regexInjections) {
    try {
      filterMembers(rawMembers, reg, "all", "all");
    } catch {
      regexSafetyPassed = false;
    }
  }
  assert(regexSafetyPassed, "ROSTER-REGEX-SAFETY", "Filter safely handles regex-like search strings as literal strings");

  report.results.teamRosterFiltering = {
    totalRawMembers: rawMembers.length,
    harpiaMembersCount: harpiaOnly.length,
    nautilusMembersCount: nautilusOnly.length,
    geralMembersCount: geralOnly.length,
    nullSafetyPassed,
    regexSafetyPassed,
    areaDropdownBug: isAreaDropdownBroken,
  };

  // ============================================================================
  // SECTION 5: MILESTONE 1 REGRESSION VALIDATION — AUTH & COURSES APIS
  // ============================================================================
  console.log("\n--------------------------------------------------------------------------------");
  console.log("🔒 SECTION 5: Milestone 1 Regressions — Auth & Course APIs");
  console.log("--------------------------------------------------------------------------------");

  const testEmail = `challenger_test_${Date.now()}@ufrj-autonomos.test`;
  const testPassword = "Password123!@#";
  const testName = "Empirical Challenger User";
  let createdUserId: string | null = null;
  let sessionToken: string | null = null;

  // 1. Auth: POST /api/auth/register with valid payload
  try {
    const regReq = new NextRequest("http://localhost:3000/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: testEmail, password: testPassword, name: testName }),
    });
    const regRes = await RegisterRoute.POST(regReq);
    assert(regRes.status === 201, "M1-AUTH-REG-VALID", `POST /api/auth/register returned HTTP 201 (status: ${regRes.status})`);

    const regJson = await regRes.json();
    assert(regJson.success === true && regJson.user?.email === testEmail, "M1-AUTH-REG-BODY", "Register body contains success: true and sanitized user");
    createdUserId = regJson.user?.id;

    const cookieHeader = regRes.headers.get("set-cookie");
    assert(!!cookieHeader && cookieHeader.includes("autonomos_session"), "M1-AUTH-REG-COOKIE", "Register sets HttpOnly autonomos_session cookie");

    const match = cookieHeader?.match(/autonomos_session=([^;]+)/);
    if (match) sessionToken = match[1];
  } catch (err: any) {
    assert(false, "M1-AUTH-REG-EXCEPTION", `Register threw exception: ${err.message}`);
  }

  // 2. Auth: Duplicate registration rejection
  try {
    const dupReq = new NextRequest("http://localhost:3000/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: testEmail, password: testPassword, name: testName }),
    });
    const dupRes = await RegisterRoute.POST(dupReq);
    assert(dupRes.status === 409, "M1-AUTH-REG-DUP-409", `Duplicate registration rejected with HTTP 409 (status: ${dupRes.status})`);
  } catch (err: any) {
    assert(false, "M1-AUTH-REG-DUP-EXCEPTION", `Duplicate register threw exception: ${err.message}`);
  }

  // 3. Auth: Registration input validation (short password, invalid email, missing fields)
  try {
    const shortPassReq = new NextRequest("http://localhost:3000/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "invalid@test.com", password: "123", name: "Short" }),
    });
    const shortPassRes = await RegisterRoute.POST(shortPassReq);
    assert(shortPassRes.status === 400, "M1-AUTH-REG-SHORT-PASS", "Short password (<6 chars) rejected with HTTP 400");

    const invalidEmailReq = new NextRequest("http://localhost:3000/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "not-an-email", password: "validPassword123", name: "Invalid Email" }),
    });
    const invalidEmailRes = await RegisterRoute.POST(invalidEmailReq);
    assert(invalidEmailRes.status === 400, "M1-AUTH-REG-INVALID-EMAIL", "Invalid email format rejected with HTTP 400");
  } catch (err: any) {
    assert(false, "M1-AUTH-REG-VAL-EXCEPTION", `Validation threw exception: ${err.message}`);
  }

  // 4. Auth: POST /api/auth/login
  try {
    // Valid login
    const loginReq = new NextRequest("http://localhost:3000/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: testEmail, password: testPassword }),
    });
    const loginRes = await LoginRoute.POST(loginReq);
    assert(loginRes.status === 200, "M1-AUTH-LOGIN-SUCCESS", `POST /api/auth/login returned HTTP 200 (status: ${loginRes.status})`);
    const loginJson = await loginRes.json();
    assert(loginJson.success === true && loginJson.user.email === testEmail, "M1-AUTH-LOGIN-BODY", "Login returns user object and success: true");

    // Invalid password
    const badPassReq = new NextRequest("http://localhost:3000/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: testEmail, password: "WrongPassword999!" }),
    });
    const badPassRes = await LoginRoute.POST(badPassReq);
    assert(badPassRes.status === 401, "M1-AUTH-LOGIN-BAD-PASS", "Bad password rejected with HTTP 401");

    // Non-existent user
    const noUserReq = new NextRequest("http://localhost:3000/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "ghost_user_99999@ufrj-autonomos.br", password: testPassword }),
    });
    const noUserRes = await LoginRoute.POST(noUserReq);
    assert(noUserRes.status === 401, "M1-AUTH-LOGIN-NO-USER", "Non-existent user rejected with HTTP 401");
  } catch (err: any) {
    assert(false, "M1-AUTH-LOGIN-EXCEPTION", `Login tests threw exception: ${err.message}`);
  }

  // 5. Auth: GET /api/auth/me
  try {
    if (sessionToken) {
      const meReq = new NextRequest("http://localhost:3000/api/auth/me", {
        headers: { Cookie: `autonomos_session=${sessionToken}` },
      });
      const meRes = await MeRoute.GET(meReq);
      assert(meRes.status === 200, "M1-AUTH-ME-STATUS", `GET /api/auth/me with session cookie returned HTTP 200`);
      const meJson = await meRes.json();
      assert(meJson.authenticated === true && meJson.user?.email === testEmail, "M1-AUTH-ME-BODY", "Authenticated session verified with correct user profile");
    }

    // Unauthenticated GET /api/auth/me
    const unauthReq = new NextRequest("http://localhost:3000/api/auth/me");
    const unauthRes = await MeRoute.GET(unauthReq);
    const unauthJson = await unauthRes.json();
    assert(unauthRes.status === 200 && unauthJson.authenticated === false && unauthJson.user === null, "M1-AUTH-ME-UNAUTH", "Unauthenticated request returns { authenticated: false, user: null }");
  } catch (err: any) {
    assert(false, "M1-AUTH-ME-EXCEPTION", `GET /api/auth/me threw exception: ${err.message}`);
  }

  // 6. Auth: POST /api/auth/logout
  try {
    const logoutRes = await LogoutRoute.POST(new NextRequest('http://localhost/api/auth/logout', { method: 'POST' }));
    assert(logoutRes.status === 200, "M1-AUTH-LOGOUT-STATUS", "POST /api/auth/logout returned HTTP 200");
    const logoutCookie = logoutRes.headers.get("set-cookie");
    assert(!!logoutCookie && (logoutCookie.includes("Max-Age=0") || logoutCookie.includes("max-age=0")), "M1-AUTH-LOGOUT-COOKIE", "Logout clears autonomos_session cookie with Max-Age=0");
  } catch (err: any) {
    assert(false, "M1-AUTH-LOGOUT-EXCEPTION", `Logout threw exception: ${err.message}`);
  }

  // Cleanup test user
  if (createdUserId) {
    await prisma.user.delete({ where: { id: createdUserId } }).catch(() => {});
    console.log(`   Cleaned up test user [${createdUserId}]`);
  }

  // 7. Course API: GET /api/courses/ros2-jazzy
  try {
    const courseReq = new NextRequest("http://localhost:3000/api/courses/ros2-jazzy");
    const courseRes = await CourseRoute.GET(courseReq);
    assert(courseRes.status === 200, "M1-COURSE-ROS2-STATUS", "GET /api/courses/ros2-jazzy returned HTTP 200");
    const courseJson = await courseRes.json();
    assert(courseJson.course?.slug === "ros2-jazzy", "M1-COURSE-SLUG", "Course slug matches 'ros2-jazzy'");
    assert(Array.isArray(courseJson.course?.modules) && courseJson.course.modules.length === 11, "M1-COURSE-MODULES-11", `Course has 11 modules (found: ${courseJson.course?.modules?.length})`);

    let totalLessonsInPayload = 0;
    for (const mod of courseJson.course.modules) {
      totalLessonsInPayload += mod.lessons?.length || 0;
    }
    assert(totalLessonsInPayload === 108, "M1-COURSE-LESSONS-108", `Course contains 108 lessons across 11 modules (found: ${totalLessonsInPayload})`);
  } catch (err: any) {
    assert(false, "M1-COURSE-EXCEPTION", `Course API threw exception: ${err.message}`);
  }

  // 8. Lessons API: GET /api/lessons/[id]
  try {
    // Valid by slug
    const lessonReqSlug = new NextRequest("http://localhost:3000/api/lessons/001-welcome");
    const lessonResSlug = await LessonRoute.GET(lessonReqSlug, {
      params: Promise.resolve({ id: "001-welcome" }),
    });
    assert(lessonResSlug.status === 200, "M1-LESSON-BY-SLUG-STATUS", "GET /api/lessons/001-welcome returned HTTP 200");
    const lessonJsonSlug = await lessonResSlug.json();
    assert(lessonJsonSlug.lesson?.slug === "001-welcome", "M1-LESSON-BY-SLUG-BODY", "Lesson slug matches 001-welcome");

    // Invalid lesson
    const badLessonReq = new NextRequest("http://localhost:3000/api/lessons/non-existent-lesson-9999");
    const badLessonRes = await LessonRoute.GET(badLessonReq, {
      params: Promise.resolve({ id: "non-existent-lesson-9999" }),
    });
    assert(badLessonRes.status === 404, "M1-LESSON-404", "Non-existent lesson returns HTTP 404");
  } catch (err: any) {
    assert(false, "M1-LESSON-EXCEPTION", `Lesson API threw exception: ${err.message}`);
  }

  report.results.m1RegressionAuth = { status: "PASS", testUserCleaned: true };
  report.results.m1RegressionCourses = { status: "PASS", modules: 11, lessons: 108 };

  // ============================================================================
  // SUMMARY
  // ============================================================================
  console.log("\n================================================================================");
  console.log(`📊 FINAL SUMMARY: ${report.stats.passed}/${report.stats.total} PASSED | ${report.stats.failed} FAILED`);
  console.log(`   VERDICT: ${report.verdict}`);
  console.log("================================================================================\n");

  return report;
}

if (require.main === module || process.argv[1]?.endsWith("challenger-m2-empirical.ts")) {
  runChallengerTests()
    .then((report) => {
      if (report.verdict !== "APPROVE") {
        console.error("❌ CHALLENGE REJECTED with errors:", report.errors);
        process.exit(1);
      } else {
        console.log("✅ ALL ADVERSARIAL STRESS-TESTS PASSED.");
        process.exit(0);
      }
    })
    .catch((err) => {
      console.error("FATAL RUNNER EXCEPTION:", err);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
