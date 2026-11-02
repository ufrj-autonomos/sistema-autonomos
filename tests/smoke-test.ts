import { NextRequest } from 'next/server';
import { prisma } from '../src/lib/prisma';
import { hashPassword, verifyPassword, createSessionToken, verifySessionToken } from '../src/lib/auth';

async function runSmokeTests() {
  console.log('🧪 ====================================================');
  console.log('🧪 INICIANDO SMOKE TESTS DO SISTEMA AUTÔNOMOS (M1)');
  console.log('🧪 ====================================================');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`✅ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${testName}`);
      failed++;
    }
  }

  try {
    // 1. DATABASE & SEED CHECKS
    console.log('\n--- 1. Validação da Persistência de Dados (Supabase PostgreSQL) ---');

    const userCount = await prisma.user.count();
    assert(userCount >= 3, `Usuários registrados no banco (esperado >= 3, atual: ${userCount})`);

    const admin = await prisma.user.findUnique({ where: { email: 'admin@autonomos.ufrj.br' } });
    assert(!!admin && admin.role === 'ADMIN', 'Usuário Admin existe com papel ADMIN');

    const course = await prisma.course.findUnique({
      where: { slug: 'ros2-jazzy' },
      include: {
        modules: {
          include: { lessons: true },
        },
      },
    });
    assert(!!course, 'Curso "ros2-jazzy" encontrado no banco');
    assert(course?.modules.length === 11, `Quantidade de módulos é 11 (atual: ${course?.modules.length})`);

    const lessonCount = await prisma.lesson.count();
    assert(lessonCount === 108, `Total de aulas no banco é exatamente 108 (atual: ${lessonCount})`);

    const availableVideos = await prisma.lesson.count({
      where: { videoStatus: 'AVAILABLE' },
    });
    assert(availableVideos === 52, `Aulas com vídeo disponível no YouTube é 52 (atual: ${availableVideos})`);

    const pendingVideos = await prisma.lesson.count({
      where: { videoStatus: 'PENDING' },
    });
    assert(pendingVideos === 26, `Aulas com vídeo pendente é 26 (atual: ${pendingVideos})`);

    const textOnlyLessons = await prisma.lesson.count({
      where: { videoStatus: 'TEXT_ONLY' },
    });
    assert(textOnlyLessons === 30, `Aulas textuais (TEXT_ONLY) é 30 (atual: ${textOnlyLessons})`);

    const exerciseCount = await prisma.exercise.count();
    assert(exerciseCount === 13, `Atividades práticas e capstone é 13 (atual: ${exerciseCount})`);

    // 2. CRYPTO & JWT UTILITIES CHECKS
    console.log('\n--- 2. Validação Criptográfica e Sessão JWT (auth.ts) ---');

    const password = 'TestPassword123!';
    const hash = await hashPassword(password);
    assert(hash.startsWith('$2'), 'Hash de senha gerado no formato bcrypt ($2)');

    const validMatch = await verifyPassword(password, hash);
    assert(validMatch === true, 'Verificação de senha com hash correto retorna true');

    const invalidMatch = await verifyPassword('WrongPassword', hash);
    assert(invalidMatch === false, 'Verificação de senha com hash incorreto retorna false');

    const token = await createSessionToken({
      sub: 'test-user-id-123',
      email: 'teste@autonomos.ufrj.br',
      name: 'Teste Autonomos',
      role: 'TRAINEE',
    });
    assert(typeof token === 'string' && token.split('.').length === 3, 'JWT gerado no formato canônico com 3 partes');

    const decoded = await verifySessionToken(token);
    assert(decoded?.sub === 'test-user-id-123' && decoded?.email === 'teste@autonomos.ufrj.br', 'JWT decodificado preserva claims originais');

    const invalidTokenDecoded = await verifySessionToken('invalid.token.here');
    assert(invalidTokenDecoded === null, 'JWT corrompido ou inválido retorna null');

    // 3. API ROUTE HANDLERS DIRECT INVOCATION CHECKS
    console.log('\n--- 3. Validação dos Route Handlers de API (/api/*) ---');

    // Test GET /api/courses/ros2-jazzy handler
    const courseRouteModule = await import('../src/app/api/courses/ros2-jazzy/route');
    const courseReq = new Request('http://localhost:3000/api/courses/ros2-jazzy');
    const courseRes = await courseRouteModule.GET(courseReq as any);
    assert(courseRes.status === 200, 'GET /api/courses/ros2-jazzy retorna status 200');
    const courseJson = await courseRes.json();
    assert(courseJson.course?.slug === 'ros2-jazzy', 'GET /api/courses/ros2-jazzy retorna objeto course com slug correto');
    assert(courseJson.course?.modules?.length === 11, 'GET /api/courses/ros2-jazzy contém 11 módulos');

    // Test GET /api/lessons/[id] handler with slug
    const lessonRouteModule = await import('../src/app/api/lessons/[id]/route');
    const lessonReq = new Request('http://localhost:3000/api/lessons/001-welcome');
    const lessonRes = await lessonRouteModule.GET(lessonReq as any, {
      params: Promise.resolve({ id: '001-welcome' }),
    });
    assert(lessonRes.status === 200, 'GET /api/lessons/001-welcome retorna status 200');
    const lessonJson = await lessonRes.json();
    assert(lessonJson.lesson?.title === 'Welcome', 'GET /api/lessons/001-welcome retorna título "Welcome"');
    assert(lessonJson.lesson?.youtubeVideoId === '6eLTFFXoqyw', 'GET /api/lessons/001-welcome possui youtubeVideoId "6eLTFFXoqyw"');
    assert(lessonJson.lesson?.videoStatus === 'available', 'GET /api/lessons/001-welcome videoStatus é "available"');

    // Test GET /api/lessons/[id] with non-existent id
    const notFoundLessonRes = await lessonRouteModule.GET(lessonReq as any, {
      params: Promise.resolve({ id: 'non-existent-lesson' }),
    });
    assert(notFoundLessonRes.status === 404, 'GET /api/lessons/non-existent retorna status 404');

    // Test POST /api/auth/login handler with valid student
    const loginRouteModule = await import('../src/app/api/auth/login/route');
    const loginReq = new Request('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'aluno@autonomos.ufrj.br',
        password: 'Aluno@2026!',
      }),
    });
    const loginRes = await loginRouteModule.POST(loginReq as any);
    assert(loginRes.status === 200, 'POST /api/auth/login com credenciais válidas retorna status 200');
    const loginJson = await loginRes.json();
    assert(loginJson.success === true, 'POST /api/auth/login retorna success: true');
    assert(loginJson.user?.email === 'aluno@autonomos.ufrj.br', 'POST /api/auth/login retorna dados do usuário');
    const setCookieHeader = loginRes.headers.get('set-cookie');
    assert(!!setCookieHeader && setCookieHeader.includes('autonomos_session'), 'POST /api/auth/login emite cookie "autonomos_session"');

    // Test POST /api/auth/login with wrong password
    const wrongLoginReq = new Request('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'aluno@autonomos.ufrj.br',
        password: 'SenhaErrada123!',
      }),
    });
    const wrongLoginRes = await loginRouteModule.POST(wrongLoginReq as any);
    assert(wrongLoginRes.status === 401, 'POST /api/auth/login com senha errada retorna status 401');

    // Test POST /api/auth/register handler with unique email
    const uniqueEmail = `smoke_user_${Date.now()}@autonomos.ufrj.br`;
    const registerRouteModule = await import('../src/app/api/auth/register/route');
    const registerReq = new Request('http://localhost:3000/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: uniqueEmail,
        name: 'Smoke Test User',
        password: 'SmokePassword2026!',
      }),
    });
    const registerRes = await registerRouteModule.POST(registerReq as any);
    assert(registerRes.status === 201, 'POST /api/auth/register com novo usuário retorna status 201');
    const registerJson = await registerRes.json();
    assert(registerJson.success === true && registerJson.user?.email === uniqueEmail, 'POST /api/auth/register cria usuário com sucesso');

    // Test POST /api/auth/register duplicate email
    const dupRegisterReq = new Request('http://localhost:3000/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: uniqueEmail,
        name: 'Smoke Test User Duplicate',
        password: 'SmokePassword2026!',
      }),
    });
    const dupRegisterRes = await registerRouteModule.POST(dupRegisterReq as any);
    assert(dupRegisterRes.status === 409, 'POST /api/auth/register com email duplicado retorna status 409');

    // Test GET /api/auth/me with valid cookie
    const tokenForMe = await createSessionToken({
      sub: registerJson.user.id,
      email: uniqueEmail,
      name: 'Smoke Test User',
      role: 'TRAINEE',
    });
    const meRouteModule = await import('../src/app/api/auth/me/route');
    const meReq = new Request('http://localhost:3000/api/auth/me', {
      headers: {
        cookie: `autonomos_session=${tokenForMe}`,
      },
    });
    const meRes = await meRouteModule.GET(meReq as any);
    assert(meRes.status === 200, 'GET /api/auth/me com cookie retorna status 200');
    const meJson = await meRes.json();
    assert(meJson.authenticated === true && meJson.user?.email === uniqueEmail, 'GET /api/auth/me identifica usuário autenticado');

    // Test POST /api/auth/logout
    const logoutRouteModule = await import('../src/app/api/auth/logout/route');
    const logoutRes = await logoutRouteModule.POST(new NextRequest('http://localhost/api/auth/logout', { method: 'POST' }));
    assert(logoutRes.status === 200, 'POST /api/auth/logout retorna status 200');
    const logoutCookie = logoutRes.headers.get('set-cookie');
    assert(!!logoutCookie && (logoutCookie.includes('Max-Age=0') || logoutCookie.includes('max-age=0')), 'POST /api/auth/logout revoga o cookie');

    // Cleanup smoke test user
    await prisma.user.delete({ where: { email: uniqueEmail } });
    console.log(`🧹 Usuário temporário de teste removido: ${uniqueEmail}`);

  } catch (error) {
    console.error('❌ Exceção não tratada durante os testes:', error);
    failed++;
  } finally {
    await prisma.$disconnect();
  }

  console.log('\n====================================================');
  console.log(`📊 RESULTADO FINAL DOS SMOKE TESTS:`);
  console.log(`   ✅ Passaram: ${passed}`);
  console.log(`   ❌ Falharam: ${failed}`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runSmokeTests();
