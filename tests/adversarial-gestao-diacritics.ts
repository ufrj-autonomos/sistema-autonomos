import { normalizeText, filterMembers } from "../src/components/gestao/team-roster";
import type { MemberRecord } from "../src/components/gestao/types";

interface AssertReport {
  passed: number;
  failed: number;
  failures: string[];
}

const report: AssertReport = {
  passed: 0,
  failed: 0,
  failures: [],
};

function assert(condition: boolean, testId: string, message: string) {
  if (condition) {
    report.passed++;
    console.log(`  ✅ [PASS] ${testId}: ${message}`);
  } else {
    report.failed++;
    const failMsg = `❌ [FAIL] ${testId}: ${message}`;
    report.failures.push(failMsg);
    console.error(`  ${failMsg}`);
  }
}

// Canonical seed members representing Gestão database state
const mockMembers: MemberRecord[] = [
  {
    id: 1,
    name: "Sofia Oliveira",
    role: "Líder Técnico Harpia",
    area: "Software",
    division: "harpia",
    divisionLabel: "Divisão Harpia",
    bio: "Pesquisadora em navegação autônoma e fusão sensorial com PX4 e ROS 2.",
    course: "Engenharia de Controle e Automação",
    linkedin: "https://linkedin.com/in/sofia-autonomos",
    github: "https://github.com/sofia-ufrj",
    active: true,
  },
  {
    id: 2,
    name: "Carlos Eduardo",
    role: "Engenheiro de Software",
    area: "Software",
    division: "harpia",
    divisionLabel: "Divisão Harpia",
    bio: "Especialista em planejamento de rotas e árvores de comportamento (BehaviorTree).",
    course: "Ciência da Computação",
    linkedin: null,
    github: "https://github.com/carloseduardo-autonomos",
    active: true,
  },
  {
    id: 3,
    name: "Rodrigo Lima",
    role: "Engenheiro Mecânico",
    area: "Mecânica",
    division: "nautilus",
    divisionLabel: "Divisão Nautilus",
    bio: "Modelagem hidrodinâmica de cascos e simulação CFD no Gazebo.",
    course: "Engenharia Mecânica",
    linkedin: "https://linkedin.com/in/rodrigo-nautilus",
    github: null,
    active: true,
  },
  {
    id: 4,
    name: "Beatriz Almeida",
    role: "Engenheira Eletrônica",
    area: "Eletrônica",
    division: "harpia",
    divisionLabel: "Divisão Harpia",
    bio: "Desenvolvimento de placas de distribuição de potência (PDB) e barramento CAN bus.",
    course: "Engenharia Eletrônica e de Computação",
    linkedin: "https://linkedin.com/in/beatriz-harpia",
    github: "https://github.com/beatriz-autonomos",
    active: true,
  },
  {
    id: 5,
    name: "Gabriel Santos",
    role: "Líder Técnico Nautilus",
    area: "Software",
    division: "nautilus",
    divisionLabel: "Divisão Nautilus",
    bio: "Controle de estabilidade subaquática e odometria acústica com DVL.",
    course: "Engenharia de Controle e Automação",
    linkedin: "https://linkedin.com/in/gabriel-nautilus",
    github: "https://github.com/gabrielsantos-ufrj",
    active: true,
  },
  {
    id: 6,
    name: "Mariana Costa",
    role: "Engenheira de Visão",
    area: "Software",
    division: "nautilus",
    divisionLabel: "Divisão Nautilus",
    bio: "Visão computacional submarina, detecção de marcadores acústicos e ópticos.",
    course: "Ciência da Computação",
    linkedin: null,
    github: "https://github.com/marianacosta-vision",
    active: true,
  },
  {
    id: 7,
    name: "Lucas Silva",
    role: "Diretor Geral",
    area: "Gestão",
    division: "geral",
    divisionLabel: "Geral",
    bio: "Coordenação estratégica, patrocínios institucionais e relações com a UFRJ.",
    course: "Engenharia de Produção",
    linkedin: "https://linkedin.com/in/lucassilva-gestao",
    github: null,
    active: true,
  },
  {
    id: 8,
    name: "Juliana Mendes",
    role: "Coordenadora de Operações",
    area: "Gestão",
    division: "geral",
    divisionLabel: "Geral",
    bio: "Logística de testes de campo, compliance de segurança e gestão orçamentária.",
    course: "Administração",
    linkedin: "https://linkedin.com/in/julianamendes-ops",
    github: null,
    active: true,
  },
];

console.log("================================================================================");
console.log("⚔️  ADVERSARIAL STRESS-TEST: Gestão Team Roster Diacritics & Filtering");
console.log("================================================================================\n");

// -----------------------------------------------------------------------------
// PART 1: normalizeText ADVERSARIAL STRESS-TEST
// -----------------------------------------------------------------------------
console.log("--- PART 1: normalizeText Robustness & Diacritic Decomposition ---");

// 1.1 Uppercase accented characters
assert(normalizeText("MECÂNICA") === "mecanica", "NORM-UPPER-MECANICA", "MECÂNICA -> mecanica");
assert(normalizeText("ELETRÔNICA") === "eletronica", "NORM-UPPER-ELETRONICA", "ELETRÔNICA -> eletronica");
assert(normalizeText("GESTÃO") === "gestao", "NORM-UPPER-GESTAO", "GESTÃO -> gestao");
assert(normalizeText("CIÊNCIA DA COMPUTAÇÃO") === "ciencia da computacao", "NORM-UPPER-COMPUTACAO", "CIÊNCIA DA COMPUTAÇÃO -> ciencia da computacao");
assert(normalizeText("ÁÉÍÓÚÂÊÎÔÛÃÕÀÈÌÒÙÄËÏÖÜÇ") === "aeiouaeiouaoaeiouaeiouc", "NORM-ALL-UPPER-ACCENTS", "All Portuguese uppercase accented letters decomposed and stripped");

// 1.2 Lowercase accented characters
assert(normalizeText("mecânica") === "mecanica", "NORM-LOWER-MECANICA", "mecânica -> mecanica");
assert(normalizeText("eletrônica") === "eletronica", "NORM-LOWER-ELETRONICA", "eletrônica -> eletronica");
assert(normalizeText("gestão") === "gestao", "NORM-LOWER-GESTAO", "gestão -> gestao");
assert(normalizeText("líder") === "lider", "NORM-LOWER-LIDER", "líder -> lider");
assert(normalizeText("áéíóúâêîôûãõàèìòùäëïöüç") === "aeiouaeiouaoaeiouaeiouc", "NORM-ALL-LOWER-ACCENTS", "All Portuguese lowercase accented letters decomposed and stripped");

// 1.3 Mixed cases with accents
assert(normalizeText("MecÂnIcA") === "mecanica", "NORM-MIXED-MECANICA", "MecÂnIcA -> mecanica");
assert(normalizeText("eLeTrÔnIcA") === "eletronica", "NORM-MIXED-ELETRONICA", "eLeTrÔnIcA -> eletronica");
assert(normalizeText("gEsTãO") === "gestao", "NORM-MIXED-GESTAO", "gEsTãO -> gestao");
assert(normalizeText("LíDeR TéCnIcO") === "lider tecnico", "NORM-MIXED-LIDER-TECNICO", "LíDeR TéCnIcO -> lider tecnico");

// 1.4 Falsy, null, undefined, whitespace inputs
assert(normalizeText(null) === "", "NORM-NULL", "null input returns empty string without throwing");
assert(normalizeText(undefined) === "", "NORM-UNDEFINED", "undefined input returns empty string without throwing");
assert(normalizeText("") === "", "NORM-EMPTY", "empty string returns empty string");
assert(normalizeText("   ") === "", "NORM-SPACES", "spaces return empty string");
assert(normalizeText("\t\r\n   \t") === "", "NORM-WHITESPACE-SPECIAL", "tabs and newlines return empty string");
assert(normalizeText("   Mecânica   ") === "mecanica", "NORM-TRIM-EDGES", "surrounding spaces trimmed");

// 1.5 Edge cases: special characters, emojis, already normalized ASCII
assert(normalizeText("Software") === "software", "NORM-ASCII-WORD", "ASCII word lowercased");
assert(normalizeText("ROS 2 Jazzy") === "ros 2 jazzy", "NORM-ALPHANUMERIC", "Alphanumeric preserved");
assert(normalizeText("🚀 Robótica! #1") === "🚀 robotica! #1", "NORM-EMOJI-PUNCTUATION", "Emoji and punctuation preserved while accents stripped");

// -----------------------------------------------------------------------------
// PART 2: filterMembers AREA DROPDOWN ADVERSARIAL STRESS-TEST
// -----------------------------------------------------------------------------
console.log("\n--- PART 2: filterMembers Area Dropdown Tests ---");

// 2.1 Unaccented dropdown values (as in JSX <option value="mecanica"> etc.)
const mecUnaccented = filterMembers(mockMembers, "", "all", "mecanica");
assert(mecUnaccented.length === 1 && mecUnaccented[0].name === "Rodrigo Lima", "ROSTER-AREA-MECANICA-UNACCENTED", `Dropdown 'mecanica' finds 1 member: Rodrigo Lima (found: ${mecUnaccented.length})`);

const eletUnaccented = filterMembers(mockMembers, "", "all", "eletronica");
assert(eletUnaccented.length === 1 && eletUnaccented[0].name === "Beatriz Almeida", "ROSTER-AREA-ELETRONICA-UNACCENTED", `Dropdown 'eletronica' finds 1 member: Beatriz Almeida (found: ${eletUnaccented.length})`);

const gestaoUnaccented = filterMembers(mockMembers, "", "all", "gestao");
assert(gestaoUnaccented.length === 2 && gestaoUnaccented.some(m => m.name === "Lucas Silva") && gestaoUnaccented.some(m => m.name === "Juliana Mendes"), "ROSTER-AREA-GESTAO-UNACCENTED", `Dropdown 'gestao' finds 2 members: Lucas Silva & Juliana Mendes (found: ${gestaoUnaccented.length})`);

const softUnaccented = filterMembers(mockMembers, "", "all", "software");
assert(softUnaccented.length === 4, "ROSTER-AREA-SOFTWARE-UNACCENTED", `Dropdown 'software' finds 4 members (found: ${softUnaccented.length})`);

// 2.2 Accented dropdown values (e.g. if passed canonical Portuguese)
const mecAccented = filterMembers(mockMembers, "", "all", "Mecânica");
assert(mecAccented.length === 1 && mecAccented[0].name === "Rodrigo Lima", "ROSTER-AREA-MECANICA-ACCENTED", "Canonical 'Mecânica' finds Rodrigo Lima");

const eletAccented = filterMembers(mockMembers, "", "all", "Eletrônica");
assert(eletAccented.length === 1 && eletAccented[0].name === "Beatriz Almeida", "ROSTER-AREA-ELETRONICA-ACCENTED", "Canonical 'Eletrônica' finds Beatriz Almeida");

const gestaoAccented = filterMembers(mockMembers, "", "all", "Gestão");
assert(gestaoAccented.length === 2, "ROSTER-AREA-GESTAO-ACCENTED", "Canonical 'Gestão' finds 2 members");

// 2.3 Uppercase & Mixed Case Area queries
const mecUpper = filterMembers(mockMembers, "", "all", "MECÂNICA");
assert(mecUpper.length === 1, "ROSTER-AREA-MECANICA-UPPER", "Uppercase 'MECÂNICA' finds 1 member");

const eletMixed = filterMembers(mockMembers, "", "all", "eLeTrÔnIcA");
assert(eletMixed.length === 1, "ROSTER-AREA-ELETRONICA-MIXED", "Mixed case 'eLeTrÔnIcA' finds 1 member");

const gestaoUpper = filterMembers(mockMembers, "", "all", "GESTÃO");
assert(gestaoUpper.length === 2, "ROSTER-AREA-GESTAO-UPPER", "Uppercase 'GESTÃO' finds 2 members");

// 2.4 Dropdown area "all", empty, whitespace
const areaAll = filterMembers(mockMembers, "", "all", "all");
assert(areaAll.length === 8, "ROSTER-AREA-ALL", "Area 'all' returns all 8 members");

const areaEmpty = filterMembers(mockMembers, "", "all", "");
assert(areaEmpty.length === 8, "ROSTER-AREA-EMPTY", "Area '' returns all 8 members");

const areaWhitespace = filterMembers(mockMembers, "", "all", "   ");
assert(areaWhitespace.length === 8, "ROSTER-AREA-WHITESPACE", "Area '   ' normalizes to '' and returns all 8 members");

// -----------------------------------------------------------------------------
// PART 3: filterMembers FREE-TEXT SEARCH ADVERSARIAL STRESS-TEST
// -----------------------------------------------------------------------------
console.log("\n--- PART 3: filterMembers Free-Text Search Tests ---");

// 3.1 Search queries without diacritics matching accented target fields
// Name search
const searchRodrigoNoAccent = filterMembers(mockMembers, "rodrigo", "all", "all");
assert(searchRodrigoNoAccent.length === 1 && searchRodrigoNoAccent[0].name === "Rodrigo Lima", "SEARCH-NAME-RODRIGO", "Search 'rodrigo' matches Rodrigo Lima");

// Role search with and without accent
const searchLiderNoAccent = filterMembers(mockMembers, "lider", "all", "all");
assert(searchLiderNoAccent.length === 2, "SEARCH-ROLE-LIDER-NO-ACCENT", `Search unaccented 'lider' matches 2 leaders (found: ${searchLiderNoAccent.length})`);

const searchLiderAccented = filterMembers(mockMembers, "Líder", "all", "all");
assert(searchLiderAccented.length === 2, "SEARCH-ROLE-LIDER-ACCENTED", `Search accented 'Líder' matches 2 leaders (found: ${searchLiderAccented.length})`);

const searchLiderUpperAccented = filterMembers(mockMembers, "LÍDER", "all", "all");
assert(searchLiderUpperAccented.length === 2, "SEARCH-ROLE-LIDER-UPPER-ACCENTED", `Search uppercase accented 'LÍDER' matches 2 leaders (found: ${searchLiderUpperAccented.length})`);

const searchCoordenadoraNoAccent = filterMembers(mockMembers, "coordenacao", "all", "all");
// "Coordenação estratégica" is in Lucas Silva's bio
assert(searchCoordenadoraNoAccent.length >= 1 && searchCoordenadoraNoAccent.some(m => m.name === "Lucas Silva"), "SEARCH-BIO-COORDENACAO", "Search 'coordenacao' matches 'Coordenação'");

// Course search with and without accent
const searchCienciaNoAccent = filterMembers(mockMembers, "ciencia", "all", "all");
assert(searchCienciaNoAccent.length === 2, "SEARCH-COURSE-CIENCIA-NO-ACCENT", `Search unaccented 'ciencia' matches 2 Computer Science students (found: ${searchCienciaNoAccent.length})`);

const searchCienciaAccented = filterMembers(mockMembers, "Ciência", "all", "all");
assert(searchCienciaAccented.length === 2, "SEARCH-COURSE-CIENCIA-ACCENTED", `Search accented 'Ciência' matches 2 Computer Science students (found: ${searchCienciaAccented.length})`);

const searchComputacaoNoAccent = filterMembers(mockMembers, "computacao", "all", "all");
assert(searchComputacaoNoAccent.length >= 2, "SEARCH-COURSE-COMPUTACAO-NO-ACCENT", `Search unaccented 'computacao' matches 'Computação' (found: ${searchComputacaoNoAccent.length})`);

const searchProducaoNoAccent = filterMembers(mockMembers, "producao", "all", "all");
assert(searchProducaoNoAccent.length === 1 && searchProducaoNoAccent[0].name === "Lucas Silva", "SEARCH-COURSE-PRODUCAO-NO-ACCENT", "Search unaccented 'producao' matches 'Engenharia de Produção'");

const searchAdministracaoNoAccent = filterMembers(mockMembers, "administracao", "all", "all");
assert(searchAdministracaoNoAccent.length === 1 && searchAdministracaoNoAccent[0].name === "Juliana Mendes", "SEARCH-COURSE-ADMINISTRACAO-NO-ACCENT", "Search unaccented 'administracao' matches 'Administração'");

// Bio search with and without accent
const searchAutonomaNoAccent = filterMembers(mockMembers, "autonoma", "all", "all");
assert(searchAutonomaNoAccent.length >= 1 && searchAutonomaNoAccent.some(m => m.name === "Sofia Oliveira"), "SEARCH-BIO-AUTONOMA-NO-ACCENT", "Search unaccented 'autonoma' matches 'autônoma' in bio");

const searchPatrocinioNoAccent = filterMembers(mockMembers, "patrocinios", "all", "all");
assert(searchPatrocinioNoAccent.length === 1 && searchPatrocinioNoAccent[0].name === "Lucas Silva", "SEARCH-BIO-PATROCINIOS-NO-ACCENT", "Search unaccented 'patrocinios' matches 'patrocínios' in bio");

const searchOrcamentariaNoAccent = filterMembers(mockMembers, "orcamentaria", "all", "all");
assert(searchOrcamentariaNoAccent.length === 1 && searchOrcamentariaNoAccent[0].name === "Juliana Mendes", "SEARCH-BIO-ORCAMENTARIA-NO-ACCENT", "Search unaccented 'orcamentaria' matches 'orçamentária' in bio");

// -----------------------------------------------------------------------------
// PART 4: EDGE-CASE RECORD RESILIENCE & FUZZING
// -----------------------------------------------------------------------------
console.log("\n--- PART 4: Edge-Case Record Resilience & Fuzzing ---");

const pathologicalMembers: MemberRecord[] = [
  {
    id: 101,
    name: "Null Fields Member",
    role: "Dev",
    area: "Software",
    division: "harpia",
    divisionLabel: "Harpia",
    bio: null,
    course: null,
    linkedin: null,
    github: null,
    active: true,
  },
  {
    id: 102,
    name: "Empty Strings Member",
    role: "",
    area: "" as any,
    division: "geral",
    divisionLabel: "",
    bio: "",
    course: "",
    linkedin: "",
    github: "",
    active: false,
  },
  {
    id: 103,
    name: "Special Chars Member #!$%",
    role: "Líder @#$",
    area: "Mecânica",
    division: "nautilus",
    divisionLabel: "Nautilus",
    bio: "Test <html> tags & symbols: <>/?;:'\"{}[]|\\",
    course: "Física (IF/UFRJ)",
    linkedin: null,
    github: null,
    active: true,
  },
];

let edgeCasePassed = false;
try {
  const r1 = filterMembers(pathologicalMembers, "", "all", "all");
  const r2 = filterMembers(pathologicalMembers, "Dev", "all", "all");
  const r3 = filterMembers(pathologicalMembers, "Special", "all", "all");
  const r4 = filterMembers(pathologicalMembers, "lider", "all", "all");
  const r5 = filterMembers(pathologicalMembers, "html", "all", "all");
  const r6 = filterMembers(pathologicalMembers, "", "all", "mecanica");
  edgeCasePassed = r1.length === 3 && r2.length === 1 && r3.length === 1 && r4.length === 1 && r5.length === 1 && r6.length === 1;
} catch (e: any) {
  edgeCasePassed = false;
  console.error("Pathological member crashed filterMembers:", e);
}
assert(edgeCasePassed, "EDGE-PATHOLOGICAL-MEMBERS", "Pathological records with nulls, empty strings, and special chars filtered without crash");

// Fuzz test: 10,000 synthetic members
console.log("Fuzz testing 10,000 synthetic members...");
const areas = ["Software", "Mecânica", "Eletrônica", "Gestão"] as const;
const divisions = ["harpia", "nautilus", "geral"] as const;
const syntheticMembers: MemberRecord[] = Array.from({ length: 10000 }, (_, i) => ({
  id: 1000 + i,
  name: `Integrante Número ${i} São João`,
  role: i % 2 === 0 ? "Líder Técnico" : "Engenheiro Operacional",
  area: areas[i % areas.length],
  division: divisions[i % divisions.length],
  divisionLabel: "Divisão Teste",
  bio: i % 3 === 0 ? null : `Bio com acentuação e descrição técnica número ${i}`,
  course: i % 4 === 0 ? null : "Engenharia de Controle e Automação",
  linkedin: null,
  github: null,
  active: true,
}));

// Best-of-3 sampling to avoid GC/OS thread contention jitter
const samples: number[] = [];
let fuzzResult: any[] = [];
for (let run = 0; run < 3; run++) {
  const t0 = performance.now();
  fuzzResult = filterMembers(syntheticMembers, "joao", "harpia", "mecanica");
  const t1 = performance.now();
  samples.push(t1 - t0);
}
const elapsed = Math.min(...samples);
console.log(`  ⚡ Fuzz filter completed in ${elapsed.toFixed(2)}ms (samples: ${samples.map(s => s.toFixed(1)).join(", ")}ms, matched: ${fuzzResult.length})`);
assert(fuzzResult.length > 0, "FUZZ-SCALE-TEST-COUNT", `Fuzz test on 10,000 records completed in ${elapsed.toFixed(2)}ms and found ${fuzzResult.length} matches`);
assert(elapsed < 200, "FUZZ-SCALE-TEST-PERF", `Fuzz performance < 200ms for 10,000 records (actual: ${elapsed.toFixed(2)}ms)`);

console.log("\n================================================================================");
console.log(`📊 ADVERSARIAL STRESS-TEST SUMMARY: ${report.passed} PASSED | ${report.failed} FAILED`);
console.log(`   VERDICT: ${report.failed === 0 ? "APPROVE" : "REJECT"}`);
console.log("================================================================================\n");

if (report.failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
