import { NextRequest } from 'next/server';
import { prisma } from '../src/lib/prisma';
import {
  hashPassword,
  verifyPassword,
  createSessionToken,
  verifySessionToken,
} from '../src/lib/auth';
import { SignJWT } from 'jose';

async function runAdversarialAudit() {
  console.log('================================================================');
  console.log('🕵️‍♂️ INICIANDO AUDITORIA ADVERSARIAL E VERIFICAÇÃO DE ROBUSTEZ (M1)');
  console.log('================================================================\n');

  let totalTests = 0;
  let passedTests = 0;
  let failedTests = 0;
  const findings: string[] = [];

  function record(condition: boolean, desc: string, findingIfFail?: string) {
    totalTests++;
    if (condition) {
      console.log(`  ✅ [PASS] ${desc}`);
      passedTests++;
    } else {
      console.error(`  ❌ [FAIL] ${desc}`);
      failedTests++;
      if (findingIfFail) findings.push(findingIfFail);
    }
  }

  try {
    // =========================================================================
    // 1. PASSWORD HASHING SECURITY & TIMING ATTACKS
    // =========================================================================
    console.log('--- 1. Criptografia de Senhas, Salt Rounds e Timing Attacks ---');

    const samplePassword = 'StrongPassword2026!@#';
    const hash1 = await hashPassword(samplePassword);
    const hash2 = await hashPassword(samplePassword);

    // 1.1 Salt rounds extraction
    const match = hash1.match(/^\$2[aby]\$(\d\d)\$/);
    const saltRounds = match ? parseInt(match[1], 10) : 0;
    record(saltRounds === 10, `Bcrypt salt rounds é exatamente 10 (extraído: ${saltRounds})`, 'Salt rounds difere de 10');
    record(hash1 !== hash2, 'Hashes para a mesma senha são distintos (salt aleatório garantido)', 'Hashes idênticos para mesma senha');

    // 1.2 Verificação de senha
    const isCorrectValid = await verifyPassword(samplePassword, hash1);
    const isWrongValid = await verifyPassword('IncorrectPassword123', hash1);
    record(isCorrectValid === true, 'verifyPassword valida senha correta', 'verifyPassword falhou para senha válida');
    record(isWrongValid === false, 'verifyPassword rejeita senha incorreta', 'verifyPassword aceitou senha incorreta');

    // 1.3 Senhas com caracteres especiais e UTF-8
    const unicodePassword = 'SenhaComAcentuaçãoEEmóji🚀2026';
    const unicodeHash = await hashPassword(unicodePassword);
    const unicodeValid = await verifyPassword(unicodePassword, unicodeHash);
    record(unicodeValid === true, 'Suporte robusto a senhas UTF-8 e emojis', 'Falha ao tratar senhas com UTF-8/emoji');

    // 1.4 Teste de Timing Attack na rota /api/auth/login
    console.log('  ⏱️  Medindo latência de login para usuário existente vs inexistente...');
    const loginModule = await import('../src/app/api/auth/login/route');

    // Aquecimento
    await loginModule.POST(new Request('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'nonexistent_warmup@autonomos.ufrj.br', password: 'dummy' }),
    }) as any);

    const timingTrials = 5;
    let nonExistentTotalMs = 0;
    let wrongPasswordTotalMs = 0;

    for (let i = 0; i < timingTrials; i++) {
      // Caso A: Usuário não existente
      const t0 = performance.now();
      await loginModule.POST(new Request('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: `nonexistent_${Date.now()}_${i}@autonomos.ufrj.br`, password: 'DummyPassword123!' }),
      }) as any);
      nonExistentTotalMs += (performance.now() - t0);

      // Caso B: Usuário existente (aluno@autonomos.ufrj.br), senha errada
      const t1 = performance.now();
      await loginModule.POST(new Request('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'aluno@autonomos.ufrj.br', password: 'WrongPassword123!' }),
      }) as any);
      wrongPasswordTotalMs += (performance.now() - t1);
    }

    const avgNonExistentMs = nonExistentTotalMs / timingTrials;
    const avgWrongPasswordMs = wrongPasswordTotalMs / timingTrials;
    console.log(`     - Média Usuário Inexistente: ${avgNonExistentMs.toFixed(2)} ms`);
    console.log(`     - Média Usuário Existente (senha errada): ${avgWrongPasswordMs.toFixed(2)} ms`);

    const timingDelta = avgWrongPasswordMs - avgNonExistentMs;
    console.log(`     - Diferença observada (Delta): ${timingDelta.toFixed(2)} ms`);
    // Documentamos a diferença observada para o relatório de auditoria

    // =========================================================================
    // 2. SESSION COOKIE FLAGS & JWT INTEGRITY
    // =========================================================================
    console.log('\n--- 2. Flags do Cookie de Sessão e Integridade Criptográfica de JWT ---');

    // 2.1 Inspeção do Set-Cookie em POST /api/auth/login
    const loginRes = await loginModule.POST(new Request('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'aluno@autonomos.ufrj.br', password: 'Aluno@2026!' }),
    }) as any);

    const setCookie = loginRes.headers.get('set-cookie') || '';
    record(setCookie.includes('autonomos_session='), 'Cookie autonomos_session emitido no cabeçalho', 'Cookie name ausente');
    record(/httponly/i.test(setCookie), 'Flag HttpOnly presente no cookie', 'HttpOnly ausente');
    record(/path=\//i.test(setCookie), 'Flag Path=/ presente no cookie', 'Path=/ ausente');
    record(/samesite=lax/i.test(setCookie), 'Flag SameSite=Lax presente no cookie', 'SameSite=Lax ausente');
    record(/max-age=604800/i.test(setCookie), 'Flag Max-Age=604800 (7 dias) presente no cookie', 'Max-Age inválido no login');

    // 2.2 Inspeção do Set-Cookie em POST /api/auth/logout
    const logoutModule = await import('../src/app/api/auth/logout/route');
    const logoutRes = await logoutModule.POST(new NextRequest('http://localhost/api/auth/logout', { method: 'POST' }));
    const logoutCookie = logoutRes.headers.get('set-cookie') || '';
    record(/max-age=0/i.test(logoutCookie), 'Logout define Max-Age=0 para expirar o cookie', 'Max-Age=0 ausente no logout');
    record(/httponly/i.test(logoutCookie), 'Logout preserva flag HttpOnly', 'HttpOnly ausente no logout');

    // 2.3 JWT tampering & expiration
    const validToken = await createSessionToken({
      sub: 'user-audit-123',
      email: 'audit@autonomos.ufrj.br',
      name: 'Auditor',
      role: 'TRAINEE',
    });

    // Tampered token (change payload)
    const parts = validToken.split('.');
    const tamperedPayload = Buffer.from(JSON.stringify({ sub: 'admin-id', role: 'ADMIN' })).toString('base64url');
    const tamperedToken = `${parts[0]}.${tamperedPayload}.${parts[2]}`;
    const tamperedResult = await verifySessionToken(tamperedToken);
    record(tamperedResult === null, 'JWT adulterado com assinatura incompatível é rejeitado (retorna null)', 'JWT adulterado foi aceito!');

    // Expired token
    const secretKey = new TextEncoder().encode(
      process.env.JWT_SECRET || process.env.SUPABASE_SECRET_KEY || 'ufrj-autonomos-secret-key-2026'
    );
    const expiredToken = await new SignJWT({ sub: 'expired-user' })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt(Math.floor(Date.now() / 1000) - 100)
      .setExpirationTime(Math.floor(Date.now() / 1000) - 10)
      .sign(secretKey);

    const expiredResult = await verifySessionToken(expiredToken);
    record(expiredResult === null, 'JWT expirado é rejeitado (retorna null)', 'JWT expirado foi aceito!');

    // Token sem algoritmo válido ("alg: none")
    const noneHeader = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
    const noneToken = `${noneHeader}.${parts[1]}.`;
    const noneResult = await verifySessionToken(noneToken);
    record(noneResult === null, 'JWT com alg=none é rejeitado', 'JWT alg=none foi aceito!');

    // 2.4 GET /api/auth/me com token de usuário inexistente
    const meModule = await import('../src/app/api/auth/me/route');
    const ghostToken = await createSessionToken({
      sub: 'ghost-user-id-does-not-exist',
      email: 'ghost@autonomos.ufrj.br',
      name: 'Ghost',
      role: 'TRAINEE',
    });
    const ghostRes = await meModule.GET(new Request('http://localhost:3000/api/auth/me', {
      headers: { cookie: `autonomos_session=${ghostToken}` },
    }) as any);
    const ghostJson = await ghostRes.json();
    record(ghostJson.authenticated === false && ghostJson.user === null, 'GET /api/auth/me para usuário removido do banco retorna authenticated: false', 'Ghost user retornou authenticated true');

    // =========================================================================
    // 3. PRISMA SCHEMA RELATIONS, INDEXES, CASCADES & DB HANDLING
    // =========================================================================
    console.log('\n--- 3. Validação do Esquema Prisma, Relacionamentos e Cascading Deletes ---');

    // 3.1 Teste funcional de Cascading Delete no Supabase PostgreSQL
    const testCascadeEmail = `cascade_test_${Date.now()}@autonomos.ufrj.br`;
    const cascadeUser = await prisma.user.create({
      data: {
        email: testCascadeEmail,
        name: 'Cascade Test User',
        passwordHash: '$2a$10$dummyhashforcadcadedeleterobustnesstest',
        role: 'TRAINEE',
      },
    });

    const testCourse = await prisma.course.findFirst({ where: { slug: 'ros2-jazzy' } });
    if (!testCourse) throw new Error('Curso ros2-jazzy não encontrado para teste de cascade');

    const firstLesson = await prisma.lesson.findFirst({ where: { module: { courseId: testCourse.id } } });
    const firstExercise = await prisma.exercise.findFirst();

    // Criar registros filhos
    const testSession = await prisma.session.create({
      data: {
        sessionToken: `token_cascade_${Date.now()}`,
        userId: cascadeUser.id,
        expiresAt: new Date(Date.now() + 86400000),
      },
    });

    const testCourseProgress = await prisma.courseProgress.create({
      data: {
        userId: cascadeUser.id,
        courseId: testCourse.id,
        percentage: 10.0,
      },
    });

    let testLessonProgress: any = null;
    if (firstLesson) {
      testLessonProgress = await prisma.lessonProgress.create({
        data: {
          userId: cascadeUser.id,
          lessonId: firstLesson.id,
          completed: true,
        },
      });
    }

    let testExerciseProgress: any = null;
    if (firstExercise) {
      testExerciseProgress = await prisma.exerciseProgress.create({
        data: {
          userId: cascadeUser.id,
          exerciseId: firstExercise.id,
          completed: true,
          score: 10,
        },
      });
    }

    // Deleta o usuário principal
    await prisma.user.delete({ where: { id: cascadeUser.id } });

    // Verifica se os filhos foram deletados em cascata
    const checkSession = await prisma.session.findUnique({ where: { id: testSession.id } });
    const checkCourseProg = await prisma.courseProgress.findUnique({ where: { id: testCourseProgress.id } });
    const checkLessonProg = testLessonProgress ? await prisma.lessonProgress.findUnique({ where: { id: testLessonProgress.id } }) : null;
    const checkExerciseProg = testExerciseProgress ? await prisma.exerciseProgress.findUnique({ where: { id: testExerciseProgress.id } }) : null;

    record(checkSession === null, 'Cascade delete eliminou Session associada', 'Session órfã permaneceu após delete do User');
    record(checkCourseProg === null, 'Cascade delete eliminou CourseProgress associado', 'CourseProgress órfão permaneceu');
    record(checkLessonProg === null, 'Cascade delete eliminou LessonProgress associado', 'LessonProgress órfão permaneceu');
    record(checkExerciseProg === null, 'Cascade delete eliminou ExerciseProgress associado', 'ExerciseProgress órfão permaneceu');

    // 3.2 Teste de onDelete: SetNull em Member relation
    const memberUser = await prisma.user.create({
      data: {
        email: `member_user_${Date.now()}@autonomos.ufrj.br`,
        name: 'Member Cascade Test',
        passwordHash: '$2a$10$dummyhash',
        role: 'MEMBER',
      },
    });

    const testMember = await prisma.member.create({
      data: {
        userId: memberUser.id,
        name: 'Member Cascade Test',
        role: 'Pesquisador',
        area: 'Visão Computacional',
      },
    });

    await prisma.user.delete({ where: { id: memberUser.id } });
    const updatedMember = await prisma.member.findUnique({ where: { id: testMember.id } });
    record(updatedMember !== null && updatedMember.userId === null, 'onDelete: SetNull preserva Member com userId nulo ao remover User', 'Member não foi preservado com userId null');

    // Cleanup member
    await prisma.member.delete({ where: { id: testMember.id } });

    // 3.3 Verificação de Índices e Chaves Únicas no PostgreSQL
    const indexes: any = await prisma.$queryRaw`
      SELECT tablename, indexname, indexdef
      FROM pg_indexes
      WHERE schemaname = 'public'
      ORDER BY tablename, indexname;
    `;
    const indexNames = indexes.map((idx: any) => idx.indexname);
    record(indexNames.includes('User_email_key'), 'Índice de unicidade User_email_key ativo no PostgreSQL', 'User_email_key ausente');
    record(indexNames.some((n: string) => n.includes('Lesson_moduleId_orderIndex')), 'Índice único Lesson(moduleId, orderIndex) ativo', 'Lesson unique orderIndex ausente');
    record(indexNames.some((n: string) => n.includes('Module_courseId_orderIndex')), 'Índice único Module(courseId, orderIndex) ativo', 'Module unique orderIndex ausente');

    // =========================================================================
    // 4. CURRICULUM COVERAGE (11 MODULES, 108 LESSONS, YOUTUBE IDS)
    // =========================================================================
    console.log('\n--- 4. Auditoria de Cobertura do Currículo ROS 2 Jazzy ---');

    const course = await prisma.course.findUnique({
      where: { slug: 'ros2-jazzy' },
      include: {
        modules: {
          orderBy: { orderIndex: 'asc' },
          include: {
            lessons: {
              orderBy: { orderIndex: 'asc' },
            },
          },
        },
      },
    });

    record(!!course, 'Curso ros2-jazzy encontrado no banco', 'Curso não encontrado');
    record(course?.modules.length === 11, `Quantidade exata de módulos é 11 (atual: ${course?.modules.length})`, 'Contagem de módulos incorreta');

    let allLessonsCount = 0;
    let availableCount = 0;
    let pendingCount = 0;
    let textOnlyCount = 0;
    const youtubeIdsFound = new Set<string>();
    let orderIndicesSequential = true;
    let expectedGlobalIndex = 1;

    for (const mod of course?.modules || []) {
      for (const les of mod.lessons) {
        allLessonsCount++;
        if (les.orderIndex !== expectedGlobalIndex) {
          orderIndicesSequential = false;
        }
        expectedGlobalIndex++;

        if (les.videoStatus === 'AVAILABLE') {
          availableCount++;
          if (les.youtubeVideoId && les.youtubeVideoId.length >= 10) {
            youtubeIdsFound.add(les.youtubeVideoId);
          }
        } else if (les.videoStatus === 'PENDING') {
          pendingCount++;
        } else if (les.videoStatus === 'TEXT_ONLY') {
          textOnlyCount++;
        }
      }
    }

    record(allLessonsCount === 108, `Total de lições cadastradas é 108 (atual: ${allLessonsCount})`, 'Total de lições difere de 108');
    record(orderIndicesSequential, 'OrderIndex sequencial de 1 a 108 em toda a grade curricular', 'Ordem de lições inconsistente');
    record(availableCount === 52, `52 aulas com vídeo disponível (atual: ${availableCount})`, 'Contagem de aulas disponíveis incorreta');
    record(pendingCount === 26, `26 aulas com vídeo pendente (atual: ${pendingCount})`, 'Contagem de aulas pendentes incorreta');
    record(textOnlyCount === 30, `30 aulas textuais / TEXT_ONLY (atual: ${textOnlyCount})`, 'Contagem de aulas textuais incorreta');
    record(youtubeIdsFound.size === 52, `52 IDs de YouTube únicos e válidos vinculados (encontrados: ${youtubeIdsFound.size})`, 'IDs de YouTube ausentes ou duplicados');

    // 4.2 Verificação dos 11 títulos de módulos
    const moduleTitles = (course?.modules || []).map(m => m.title);
    const expectedModules = [
      '1. Introduction',
      '2. Install ROS2 and Setup Your Environment',
      '3. Write Your First ROS 2 Program',
      '4. Introduction to ROS 2 Tools',
      '5. ROS 2 Topics - Make Your Nodes Communicate',
      '6. ROS 2 Services - Client Server Communication',
      '7. Create Custom ROS 2 Interfaces Msg and Srv',
      '8. Change Node Settings at Runtime with Parameters',
      '9. Scale Your Application With ROS 2 Launch Files',
      '10. Complete Project With Turtlesim ("Catch Them All")',
      '11. Conclusion'
    ];
    let allModulesMatch = true;
    for (let i = 0; i < 11; i++) {
      if (!moduleTitles[i]?.startsWith(expectedModules[i])) {
        allModulesMatch = false;
        console.warn(`    ⚠️ Módulo ${i+1}: atual="${moduleTitles[i]}" vs esperado="${expectedModules[i]}"`);
      }
    }
    record(allModulesMatch, 'Todos os 11 títulos dos módulos estão alinhados com a especificação do curso', 'Títulos de módulos divergentes');

    // 4.3 Verificação dos exercícios e capstone
    const exercises = await prisma.exercise.findMany();
    record(exercises.length === 13, `13 exercícios práticos cadastrados (atual: ${exercises.length})`, 'Contagem de exercícios incorreta');
    const capstoneExercise = exercises.find(e => e.title.includes('Capstone'));
    record(!!capstoneExercise, 'Desafio do Capstone Project cadastrado nos exercícios', 'Capstone não encontrado nos exercícios');

    // =========================================================================
    // 5. RESISTÊNCIA A INJEÇÃO E ENTRADAS MALICIOSAS
    // =========================================================================
    console.log('\n--- 5. Testes de Injeção e Edge Cases em Endpoints ---');

    // 5.1 SQL Injection payload em email
    const sqlInjectionEmail = "' OR '1'='1' --";
    const sqliRes = await loginModule.POST(new Request('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: sqlInjectionEmail, password: 'password' }),
    }) as any);
    record(sqliRes.status === 401, 'Tentativa de SQL Injection no login retorna 401 seguro', 'SQL Injection não retornou 401');

    // 5.2 Requisição com JSON malformado / corpo vazio
    const emptyRegisterRes = await (await import('../src/app/api/auth/register/route')).POST(new Request('http://localhost:3000/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    }) as any);
    record(emptyRegisterRes.status === 400, 'POST /api/auth/register com payload vazio retorna status 400', 'Registro vazio não retornou 400');

    // 5.3 Registro com senha curta (< 6 caracteres)
    const shortPassRes = await (await import('../src/app/api/auth/register/route')).POST(new Request('http://localhost:3000/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: `shortpass_${Date.now()}@autonomos.ufrj.br`, name: 'Short', password: '123' }),
    }) as any);
    record(shortPassRes.status === 400, 'POST /api/auth/register com senha menor que 6 caracteres retorna 400', 'Senha curta não retornou 400');

    // 5.4 Registro com email sem @
    const invalidEmailRes = await (await import('../src/app/api/auth/register/route')).POST(new Request('http://localhost:3000/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'invalidemailformat', name: 'Invalid', password: 'ValidPassword123!' }),
    }) as any);
    record(invalidEmailRes.status === 400, 'POST /api/auth/register com formato de email sem @ retorna 400', 'Email inválido não retornou 400');

  } catch (err) {
    console.error('❌ Erro fatal durante a auditoria adversarial:', err);
    failedTests++;
  } finally {
    await prisma.$disconnect();
  }

  console.log('\n================================================================');
  console.log('📊 RESUMO DA AUDITORIA ADVERSARIAL:');
  console.log(`   Total de Testes: ${totalTests}`);
  console.log(`   ✅ Aprovados:    ${passedTests}`);
  console.log(`   ❌ Reprovados:   ${failedTests}`);
  if (findings.length > 0) {
    console.log(`   ⚠️ Findings:     ${findings.length}`);
    findings.forEach((f, i) => console.log(`      ${i+1}. ${f}`));
  }
  console.log('================================================================\n');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runAdversarialAudit();
