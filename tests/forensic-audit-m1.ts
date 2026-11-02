import { NextRequest } from 'next/server';
import { prisma } from '../src/lib/prisma';
import { hashPassword, verifyPassword, createSessionToken, verifySessionToken } from '../src/lib/auth';
import * as RegisterRoute from '../src/app/api/auth/register/route';
import * as LoginRoute from '../src/app/api/auth/login/route';
import * as LogoutRoute from '../src/app/api/auth/logout/route';
import * as MeRoute from '../src/app/api/auth/me/route';
import * as CourseRoute from '../src/app/api/courses/ros2-jazzy/route';
import * as LessonRoute from '../src/app/api/lessons/[id]/route';
import { SignJWT } from 'jose';

interface AuditCheck {
  id: string;
  category: string;
  name: string;
  passed: boolean;
  details: string;
  rawOutput?: any;
}

const checks: AuditCheck[] = [];

function recordCheck(id: string, category: string, name: string, passed: boolean, details: string, rawOutput?: any) {
  checks.push({ id, category, name, passed, details, rawOutput });
  const icon = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`[${icon}] [${category}] ${id}: ${name} — ${details}`);
}

async function runForensicAudit() {
  console.log('================================================================');
  console.log('🕵️  INICIANDO AUDITORIA FORENSE ADVERSARIAL — MILESTONE 1');
  console.log('================================================================\n');

  // ==========================================================================
  // PHASE 1: DATABASE REPOSITORY & SCHEMA EMPIRICAL FORENSICS
  // ==========================================================================
  console.log('--- FASE 1: Verificação Empírica da Base de Dados Supabase ---');

  // 1.1 Conexão ao vivo e contagem de modelos
  const userCount = await prisma.user.count();
  const courseCount = await prisma.course.count();
  const moduleCount = await prisma.module.count();
  const lessonCount = await prisma.lesson.count();
  const exerciseCount = await prisma.exercise.count();

  recordCheck('DB-01', 'Database', 'Contagem de Registros Canônicos', 
    userCount >= 3 && courseCount === 1 && moduleCount === 11 && lessonCount === 108 && exerciseCount === 13,
    `Users: ${userCount}, Courses: ${courseCount}, Modules: ${moduleCount}, Lessons: ${lessonCount}, Exercises: ${exerciseCount}`,
    { userCount, courseCount, moduleCount, lessonCount, exerciseCount }
  );

  // 1.2 Recuperação de todas as 108 aulas para análise forense profunda
  const allLessons = await prisma.lesson.findMany({
    orderBy: { orderIndex: 'asc' },
    select: {
      id: true,
      slug: true,
      title: true,
      orderIndex: true,
      lessonType: true,
      videoStatus: true,
      youtubeVideoId: true,
      videoDurationSeconds: true,
      textContent: true,
      rosDocsUrl: true,
    },
  });

  // 1.3 Verificação de singularidade de títulos e ausência de cópias "Lesson 1", "Lesson 1"
  const distinctTitles = new Set(allLessons.map(l => l.title.trim().toLowerCase()));
  const titleFrequency: Record<string, number> = {};
  for (const l of allLessons) {
    const t = l.title.trim();
    titleFrequency[t] = (titleFrequency[t] || 0) + 1;
  }
  const repeatedTitles = Object.entries(titleFrequency).filter(([title, count]) => count > 1);

  // Repetições estruturais aceitáveis por módulo (Intro, Section Conclusion)
  const suspiciousTitleRepeats = repeatedTitles.filter(([title]) => 
    !['intro', 'section conclusion', 'introduction', 'welcome', 'conclusion'].includes(title.toLowerCase())
  );

  recordCheck('DB-02', 'Database', 'Singularidade e Autenticidade dos Títulos das Lições',
    suspiciousTitleRepeats.length === 0 && distinctTitles.size >= 85,
    `Títulos distintos: ${distinctTitles.size}/108. Repetições estruturais aceitáveis: ${repeatedTitles.map(([t, c]) => `${t}(x${c})`).join(', ')}. Repetições suspeitas: ${suspiciousTitleRepeats.length}`,
    { distinctTitlesCount: distinctTitles.size, repeatedTitles, suspiciousTitleRepeats }
  );

  // 1.4 Verificação de singularidade absoluta dos slugs
  const distinctSlugs = new Set(allLessons.map(l => l.slug));
  recordCheck('DB-03', 'Database', 'Singularidade Absoluta dos Slugs',
    distinctSlugs.size === 108,
    `Slugs únicos: ${distinctSlugs.size} de 108 esperados.`,
    { distinctSlugs: distinctSlugs.size }
  );

  // 1.5 Sequenciamento contínuo dos orderIndexes (1 a 108 sem saltos nem duplicatas)
  const orderIndices = allLessons.map(l => l.orderIndex);
  let isContinuous = true;
  const missingOrders: number[] = [];
  for (let i = 1; i <= 108; i++) {
    if (!orderIndices.includes(i)) {
      isContinuous = false;
      missingOrders.push(i);
    }
  }
  recordCheck('DB-04', 'Database', 'Sequenciamento Contínuo dos Índices (1 a 108)',
    isContinuous && orderIndices.length === 108,
    isContinuous ? 'Sequência de 1 a 108 perfeita sem omissões.' : `Índices ausentes: ${missingOrders.join(', ')}`
  );

  // 1.6 Análise Forense dos IDs de Vídeo do YouTube
  const availableLessons = allLessons.filter(l => l.videoStatus === 'AVAILABLE');
  const pendingLessons = allLessons.filter(l => l.videoStatus === 'PENDING');
  const textOnlyLessons = allLessons.filter(l => l.videoStatus === 'TEXT_ONLY');

  const youtubeIds = availableLessons.map(l => l.youtubeVideoId).filter((id): id is string => !!id);
  const distinctYoutubeIds = new Set(youtubeIds);
  const invalidYoutubeIds = youtubeIds.filter(id => !/^[a-zA-Z0-9_-]{11}$/.test(id));

  recordCheck('DB-05', 'Database', 'Integridade e Validade dos IDs do YouTube',
    availableLessons.length === 52 && 
    youtubeIds.length === 52 && 
    distinctYoutubeIds.size === 52 && 
    invalidYoutubeIds.length === 0,
    `Aulas AVAILABLE: ${availableLessons.length}/52. IDs válidos: ${youtubeIds.length}. IDs únicos: ${distinctYoutubeIds.size}/52. IDs inválidos: ${invalidYoutubeIds.length}`,
    { youtubeIdsSample: youtubeIds.slice(0, 5), invalidYoutubeIds }
  );

  recordCheck('DB-06', 'Database', 'Distribuição das Aulas por Status de Vídeo',
    availableLessons.length === 52 && pendingLessons.length === 26 && textOnlyLessons.length === 30,
    `Available: ${availableLessons.length} (esperado 52), Pending: ${pendingLessons.length} (esperado 26), TextOnly: ${textOnlyLessons.length} (esperado 30)`,
    { available: availableLessons.length, pending: pendingLessons.length, textOnly: textOnlyLessons.length }
  );

  // 1.7 Análise de Conteúdo das Lições (ausência de "Lorem ipsum", ausência de textos vazios, vocabulário técnico de robótica)
  let lessonsEmpty = 0;
  let loremIpsumFound = false;
  let roboticsKeywordHits = 0;
  const roboticsKeywords = [
    'ros', 'ros2', 'jazzy', 'node', 'no', 'nó', 'nós', 'topic', 'topico', 'tópico', 'tópicos',
    'service', 'servico', 'serviço', 'serviços', 'action', 'acao', 'ação', 'ações', 'colcon',
    'rclpy', 'rclcpp', 'launch', 'xml', 'yaml', 'param', 'parametro', 'parâmetro', 'parâmetros',
    'turtlesim', 'package', 'pacote', 'pacotes', 'workspace', 'c++', 'python', 'msg', 'srv',
    'interface', 'interfaces', 'publish', 'subscribe', 'publicador', 'subscritor', 'controlador', 'cli'
  ];

  for (const l of allLessons) {
    const text = ((l.title || '') + ' ' + (l.textContent || '')).toLowerCase();
    if ((l.textContent || '').trim().length === 0) lessonsEmpty++;
    if (text.includes('lorem ipsum')) loremIpsumFound = true;
    const hasKeyword = roboticsKeywords.some(kw => text.includes(kw));
    if (hasKeyword) roboticsKeywordHits++;
  }

  recordCheck('DB-07', 'Database', 'Autenticidade e Densidade Textual do Conteúdo ROS 2',
    !loremIpsumFound && lessonsEmpty === 0 && roboticsKeywordHits >= 100,
    `Aulas sem Lorem Ipsum: ${!loremIpsumFound}. Aulas com conteúdo textual: ${108 - lessonsEmpty}/108. Aulas com vocabulário técnico de ROS 2 e Robótica: ${roboticsKeywordHits}/108`,
    { loremIpsumFound, lessonsEmpty, roboticsKeywordHits }
  );

  // 1.8 Módulos e Exercícios
  const modules = await prisma.module.findMany({ orderBy: { orderIndex: 'asc' } });
  const exercises = await prisma.exercise.findMany();
  const exercisesWithPrompt = exercises.filter(e => e.prompt && e.prompt.trim().length > 20);

  recordCheck('DB-08', 'Database', 'Estrutura dos 11 Módulos e 13 Exercícios Práticos',
    modules.length === 11 && exercises.length === 13 && exercisesWithPrompt.length === 13,
    `Módulos: ${modules.length}/11. Exercícios: ${exercises.length}/13. Exercícios com enunciado instrucional detalhado: ${exercisesWithPrompt.length}/13`,
    { moduleTitles: modules.map(m => m.title), exerciseCount: exercises.length }
  );

  // ==========================================================================
  // PHASE 2: CRYPTOGRAPHIC INTEGRITY & TOKEN VERIFICATION
  // ==========================================================================
  console.log('\n--- FASE 2: Verificação Criptográfica de Senhas e Tokens ---');

  // 2.1 Verificação do Bcrypt (salt dinâmico, formato $2, tempo de processamento)
  const testPw = 'ForensicAuditorPassword2026!';
  const startTime = Date.now();
  const hash1 = await hashPassword(testPw);
  const hash2 = await hashPassword(testPw);
  const hashDuration = Date.now() - startTime;

  const isBcryptFormat1 = /^\$2[abxy]?\$\d{2}\$[./A-Za-z0-9]{53}$/.test(hash1);
  const isBcryptFormat2 = /^\$2[abxy]?\$\d{2}\$[./A-Za-z0-9]{53}$/.test(hash2);
  const hasDistinctSalts = hash1 !== hash2; // Salts must be randomized!
  const verifyValid = await verifyPassword(testPw, hash1);
  const verifyInvalid = await verifyPassword(testPw + '_wrong', hash1);

  recordCheck('SEC-01', 'Security', 'Validação Criptográfica do Bcrypt (Hashing & Comparação)',
    isBcryptFormat1 && isBcryptFormat2 && hasDistinctSalts && verifyValid && !verifyInvalid,
    `Formatos válidos: ${isBcryptFormat1 && isBcryptFormat2}. Sais distintos para mesma senha: ${hasDistinctSalts}. Tempo para 2 hashes: ${hashDuration}ms. Verificação correta: ${verifyValid}. Rejeição de senha errada: ${!verifyInvalid}`,
    { hash1: hash1.slice(0, 20) + '...', hash2: hash2.slice(0, 20) + '...', hashDuration }
  );

  // 2.2 Verificação do Jose JWT (assinatura genuína HMAC-SHA256, rejeição de tamper)
  const tokenPayload = {
    sub: 'auditor-user-uuid-999',
    email: 'auditor@autonomos.ufrj.br',
    name: 'Auditor Forense',
    role: 'ADMIN',
  };
  const token = await createSessionToken(tokenPayload);
  const decodedValid = await verifySessionToken(token);

  // Teste de adulteração (Tampering test): alterar os dados do payload sem recalcular a assinatura
  const tokenParts = token.split('.');
  const tamperedPayloadB64 = Buffer.from(JSON.stringify({ ...tokenPayload, role: 'SUPERUSER_HACK' })).toString('base64url');
  const tamperedToken = `${tokenParts[0]}.${tamperedPayloadB64}.${tokenParts[2]}`;
  const decodedTampered = await verifySessionToken(tamperedToken);

  // Teste de token assinado com chave secreta falsa
  const FAKE_SECRET = new TextEncoder().encode('fake-unauthorized-secret-key-123456');
  const fakeSecretToken = await new SignJWT(tokenPayload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(FAKE_SECRET);
  const decodedFakeSecret = await verifySessionToken(fakeSecretToken);

  recordCheck('SEC-02', 'Security', 'Validação Criptográfica do Jose JWT (Assinatura e Rejeição de Adulteração)',
    !!decodedValid && decodedValid.sub === tokenPayload.sub && decodedTampered === null && decodedFakeSecret === null,
    `Token válido aceito: ${!!decodedValid}. Token adulterado (tampered) rejeitado com null: ${decodedTampered === null}. Token com chave forjada rejeitado com null: ${decodedFakeSecret === null}`,
    { validSub: decodedValid?.sub, tamperedRejected: decodedTampered === null, fakeKeyRejected: decodedFakeSecret === null }
  );

  // ==========================================================================
  // PHASE 3: LIVE API ROUTE EXECUTION & PERSISTENCE ROUNDTRIP
  // ==========================================================================
  console.log('\n--- FASE 3: Validação de Execução das Rotas de API e Persistência no Banco ---');

  // 3.1 Registro de usuário ao vivo via POST /api/auth/register
  const forensicEmail = `forensic_user_${Date.now()}@autonomos.ufrj.br`;
  const forensicPass = 'AuditTestPass123!@#';
  const forensicName = 'Auditor de Integridade';

  const regReq = new Request('http://localhost:3000/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: forensicEmail, name: forensicName, password: forensicPass }),
  });
  const regRes = await RegisterRoute.POST(regReq as any);
  const regStatus = regRes.status;
  const regJson = await regRes.json();
  const regSetCookie = regRes.headers.get('set-cookie') || '';

  // Verificar se o usuário foi REALMENTE inserido na tabela do PostgreSQL
  const dbUser = await prisma.user.findUnique({ where: { email: forensicEmail } });
  const passwordNotPlaintext = dbUser ? dbUser.passwordHash !== forensicPass && dbUser.passwordHash.startsWith('$2') : false;

  recordCheck('API-01', 'API / Auth', 'POST /api/auth/register (Persistência Real no PostgreSQL e Hash Bcrypt)',
    regStatus === 201 && !!dbUser && passwordNotPlaintext && regSetCookie.includes('autonomos_session'),
    `Status: ${regStatus}. Inserido no PostgreSQL: ${!!dbUser} (ID: ${dbUser?.id}). Senha protegida por hash bcrypt: ${passwordNotPlaintext}. Cookie de sessão emitido: ${regSetCookie.includes('autonomos_session')}`,
    { regStatus, userId: dbUser?.id, passwordHashPrefix: dbUser?.passwordHash.slice(0, 10) }
  );

  // 3.2 Tentativa de registro duplicado (deve retornar 409 Conflict)
  const dupReq = new Request('http://localhost:3000/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: forensicEmail, name: forensicName, password: forensicPass }),
  });
  const dupRes = await RegisterRoute.POST(dupReq as any);
  const dupStatus = dupRes.status;

  recordCheck('API-02', 'API / Auth', 'POST /api/auth/register (Prevenção de E-mail Duplicado - 409 Conflict)',
    dupStatus === 409,
    `Status retornado para e-mail repetido: ${dupStatus} (esperado 409 Conflict)`
  );

  // 3.3 Login com credenciais válidas via POST /api/auth/login
  const loginReq = new Request('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: forensicEmail, password: forensicPass }),
  });
  const loginRes = await LoginRoute.POST(loginReq as any);
  const loginStatus = loginRes.status;
  const loginJson = await loginRes.json();
  const loginSetCookie = loginRes.headers.get('set-cookie') || '';
  const tokenMatch = loginSetCookie.match(/autonomos_session=([^;]+)/);
  const sessionToken = tokenMatch ? decodeURIComponent(tokenMatch[1]) : '';

  recordCheck('API-03', 'API / Auth', 'POST /api/auth/login (Autenticação Válida e Emissão de Cookie)',
    loginStatus === 200 && loginJson.success === true && !!sessionToken,
    `Status: ${loginStatus}. Sucesso: ${loginJson.success}. Token extraído do Set-Cookie: ${!!sessionToken}`,
    { loginStatus, user: loginJson.user }
  );

  // 3.4 Login com senha inválida (deve retornar 401 Unauthorized)
  const invalidLoginReq = new Request('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: forensicEmail, password: 'WRONG_PASSWORD_XYZ' }),
  });
  const invalidLoginRes = await LoginRoute.POST(invalidLoginReq as any);
  const invalidLoginStatus = invalidLoginRes.status;

  recordCheck('API-04', 'API / Auth', 'POST /api/auth/login (Rejeição de Senha Incorreta - 401 Unauthorized)',
    invalidLoginStatus === 401,
    `Status retornado para senha incorreta: ${invalidLoginStatus} (esperado 401)`
  );

  // 3.5 Consulta de sessão ativa via GET /api/auth/me
  const meReq = new Request('http://localhost:3000/api/auth/me', {
    headers: {
      cookie: `autonomos_session=${sessionToken}`,
    },
  });
  const meRes = await MeRoute.GET(meReq as any);
  const meStatus = meRes.status;
  const meJson = await meRes.json();

  recordCheck('API-05', 'API / Auth', 'GET /api/auth/me (Validação de Sessão Autenticada a partir do Banco)',
    meStatus === 200 && meJson.authenticated === true && meJson.user?.email === forensicEmail,
    `Status: ${meStatus}. Authenticated: ${meJson.authenticated}. Usuário recuperado: ${meJson.user?.email} (esperado: ${forensicEmail})`,
    { meJson }
  );

  // 3.6 Consulta de sessão anônima/inválida via GET /api/auth/me
  const anonReq = new Request('http://localhost:3000/api/auth/me');
  const anonRes = await MeRoute.GET(anonReq as any);
  const anonJson = await anonRes.json();

  recordCheck('API-06', 'API / Auth', 'GET /api/auth/me (Requisição Anônima retorna authenticated: false)',
    anonRes.status === 200 && anonJson.authenticated === false && anonJson.user === null,
    `Status: ${anonRes.status}. Authenticated: ${anonJson.authenticated}. User: ${anonJson.user}`
  );

  // 3.7 Logout via POST /api/auth/logout
  const logoutRes = await LogoutRoute.POST(new NextRequest('http://localhost/api/auth/logout', { method: 'POST' }));
  const logoutCookie = logoutRes.headers.get('set-cookie') || '';
  recordCheck('API-07', 'API / Auth', 'POST /api/auth/logout (Invalidação e Limpeza do Cookie de Sessão)',
    logoutRes.status === 200 && (logoutCookie.includes('Max-Age=0') || logoutCookie.includes('max-age=0')),
    `Status: ${logoutRes.status}. Cookie com Max-Age=0: ${logoutCookie.includes('Max-Age=0') || logoutCookie.includes('max-age=0')}`,
    { logoutCookie }
  );

  // Limpeza forense do usuário de teste
  if (dbUser) {
    await prisma.user.delete({ where: { id: dbUser.id } });
    console.log(`🧹 Usuário forense de teste (${forensicEmail}) removido do banco com sucesso.`);
  }

  // 3.8 Rota do Curso: GET /api/courses/ros2-jazzy
  const courseReq = new Request('http://localhost:3000/api/courses/ros2-jazzy');
  const courseRes = await CourseRoute.GET(courseReq as any);
  const courseStatus = courseRes.status;
  const courseJson = await courseRes.json();
  const apiModuleCount = courseJson.course?.modules?.length || 0;
  let apiTotalLessons = 0;
  for (const m of (courseJson.course?.modules || [])) {
    apiTotalLessons += (m.lessons || []).length;
  }

  recordCheck('API-08', 'API / Content', 'GET /api/courses/ros2-jazzy (Consulta Real do Curso e Estrutura)',
    courseStatus === 200 && apiModuleCount === 11 && apiTotalLessons === 108,
    `Status: ${courseStatus}. Módulos na API: ${apiModuleCount}/11. Total de Lições na API: ${apiTotalLessons}/108. Slug: ${courseJson.course?.slug}`,
    { slug: courseJson.course?.slug, title: courseJson.course?.title, apiModuleCount, apiTotalLessons }
  );

  // 3.9 Rota de Lição: GET /api/lessons/[id] por Slug e CUID
  const firstLesson = allLessons[0];
  const lessonBySlugRes = await LessonRoute.GET(
    new Request(`http://localhost:3000/api/lessons/${firstLesson.slug}`) as any,
    { params: Promise.resolve({ id: firstLesson.slug }) }
  );
  const lessonBySlugJson = await lessonBySlugRes.json();

  const lessonByCuidRes = await LessonRoute.GET(
    new Request(`http://localhost:3000/api/lessons/${firstLesson.id}`) as any,
    { params: Promise.resolve({ id: firstLesson.id }) }
  );
  const lessonByCuidJson = await lessonByCuidRes.json();

  const lessonNotFoundRes = await LessonRoute.GET(
    new Request('http://localhost:3000/api/lessons/non-existent-lesson-uuid-999') as any,
    { params: Promise.resolve({ id: 'non-existent-lesson-uuid-999' }) }
  );

  recordCheck('API-09', 'API / Content', 'GET /api/lessons/[id] (Busca por Slug, CUID e Tratamento de 404)',
    lessonBySlugRes.status === 200 && 
    lessonByCuidRes.status === 200 && 
    lessonNotFoundRes.status === 404 &&
    lessonBySlugJson.lesson?.id === firstLesson.id &&
    lessonByCuidJson.lesson?.slug === firstLesson.slug,
    `Busca por Slug status: ${lessonBySlugRes.status}. Busca por CUID status: ${lessonByCuidRes.status}. 404 para ID inexistente: ${lessonNotFoundRes.status}`,
    { lessonTitle: lessonBySlugJson.lesson?.title, slug: lessonBySlugJson.lesson?.slug }
  );

  // ==========================================================================
  // FINAL VERDICT CALCULATION
  // ==========================================================================
  console.log('\n================================================================');
  console.log('📊 RESUMO DOS CHECKS DA AUDITORIA FORENSE:');
  console.log('================================================================');

  let passedCount = 0;
  let failedCount = 0;
  for (const c of checks) {
    if (c.passed) {
      passedCount++;
    } else {
      failedCount++;
      console.error(`❌ VIOLAÇÃO DETECTADA [${c.id}]: ${c.name} — ${c.details}`);
    }
  }

  console.log(`\nTotal de Verificações: ${checks.length}`);
  console.log(`Aprovadas: ${passedCount}`);
  console.log(`Falhadas: ${failedCount}`);

  const verdict = failedCount === 0 ? 'CLEAN' : 'INTEGRITY VIOLATION';
  console.log(`\nVEREDITO FORENSE FINAL: ${verdict}`);
  console.log('================================================================\n');

  return { verdict, passedCount, failedCount, checks };
}

runForensicAudit()
  .then(res => {
    process.exit(res.failedCount === 0 ? 0 : 1);
  })
  .catch(err => {
    console.error('ERRO FATAL NA EXECUÇÃO DA AUDITORIA:', err);
    process.exit(2);
  })
  .finally(() => {
    prisma.$disconnect();
  });
