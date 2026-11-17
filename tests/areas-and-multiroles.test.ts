import test from 'node:test';
import assert from 'node:assert/strict';
import { prisma } from '../src/lib/prisma';
import {
  formatMemberRoles,
  memberRoleTranslations,
  normalizeMemberRole,
  roleFromCargo,
  rolesFromCargo,
  splitMemberRoles,
} from '../src/lib/member-fields';
import {
  extractEffectiveRoles,
  hasEffectiveRole,
  hasManagementAccess,
} from '../src/lib/access-policy';
import { managementSectionsForRole } from '../src/lib/management-navigation';
import { canUserManageDisciplinary } from '../src/lib/disciplinary/service';
import { canAccessEvaluations } from '../src/lib/evaluations/service';
import {
  AreaHubError,
  addLessonToAreaCourse,
  createAreaCourse,
  createAreaTask,
  extractYoutubeVideoId,
  getAreasWorkspace,
  updateAreaTask,
} from '../src/lib/areas/service';
import type { SafeUser } from '../src/lib/session';

delete process.env.INSTITUTIONAL_DATABASE_URL;

function makeUser(overrides: Partial<SafeUser>): SafeUser {
  return {
    id: overrides.id ?? 'u-1',
    name: overrides.name ?? 'Usuário Teste',
    email: overrides.email ?? 'teste@autonomos.ufrj.br',
    avatar: null,
    role: overrides.role ?? 'MEMBER',
    roles: overrides.roles,
    status: 'APPROVED',
    area: overrides.area ?? 'Software',
    teamId: overrides.teamId === undefined ? 2 : overrides.teamId,
    profileCompletedAt: new Date('2026-08-01T00:00:00Z'),
    institutionalMemberId: null,
  };
}

interface AreaStubStore {
  members: Array<{
    id: string;
    name: string;
    email: string;
    avatar: string | null;
    role: string;
    roles: string[];
    area: string | null;
    teamId: number | null;
    active: boolean;
    status: string;
    institutionalMemberId: number | null;
  }>;
  tasks: Array<{
    id: string;
    scopeKey: string;
    teamId: number | null;
    area: string;
    title: string;
    description: string;
    status: string;
    priority: string;
    dueDate: Date | null;
    referenceUrl: string | null;
    handoffNotes: string;
    deliveryUrl: string | null;
    createdById: string | null;
    createdByName: string;
    updatedByName: string | null;
    completedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    assignments: Array<{ id: string; taskId: string; memberId: string; memberName: string; assignedAt: Date }>;
  }>;
  courses: Array<{
    id: string;
    slug: string;
    title: string;
    subtitle: string | null;
    description: string;
    badge: string | null;
    level: string;
    durationHours: number;
    published: boolean;
    orderIndex: number;
    scopeKey: string | null;
    area: string | null;
    teamId: number | null;
    externalUrl: string | null;
    createdById: string | null;
    createdAt: Date;
    modules: Array<{
      id: string;
      courseId: string;
      slug: string | null;
      title: string;
      description: string | null;
      orderIndex: number;
      lessons: Array<{
        id: string;
        moduleId: string;
        slug: string;
        title: string;
        orderIndex: number;
        lessonType: string;
        videoStatus: string;
        youtubeVideoId: string | null;
        summary: string | null;
        textContent: string;
        rosDocsUrl: string | null;
      }>;
    }>;
  }>;
}

function withAreaStubs<T>(
  initial: AreaStubStore,
  fn: (store: AreaStubStore) => Promise<T>
): Promise<T> {
  const store: AreaStubStore = {
    members: [...initial.members],
    tasks: [...initial.tasks],
    courses: [...initial.courses],
  };
  const p = prisma as unknown as Record<string, Record<string, unknown>>;
  const restore: Array<[string, string, unknown]> = [];
  const patch = (model: string, method: string, impl: unknown) => {
    if (!p[model]) p[model] = {};
    restore.push([model, method, p[model][method]]);
    p[model][method] = impl;
  };
  patch('$transaction', '__raw', undefined); // keep reference structure clean
  const originalTx = p.$transaction;

  let seq = 1;
  const now = new Date('2026-11-16T22:00:00Z');

  (p as Record<string, unknown>).$transaction = async (cb: (tx: unknown) => Promise<unknown>) =>
    cb(prisma);

  patch('member', 'findMany', async (args?: { where?: { id?: { in?: string[] } } }) => {
    if (args?.where?.id?.in) {
      return store.members.filter((m) => args.where!.id!.in!.includes(m.id));
    }
    return store.members;
  });

  patch('areaEvaluation', 'findMany', async () => []);
  patch('courseProgress', 'findMany', async () => []);

  patch('areaTask', 'findMany', async (args?: { where?: { scopeKey?: string; status?: { not?: string } } }) => {
    return store.tasks.filter((t) => {
      if (args?.where?.scopeKey && t.scopeKey !== args.where.scopeKey) return false;
      if (args?.where?.status?.not && t.status === args.where.status.not) return false;
      return true;
    });
  });

  patch('areaTask', 'findUnique', async (args: { where: { id: string } }) =>
    store.tasks.find((t) => t.id === args.where.id) ?? null
  );

  patch('areaTask', 'create', async (args: {
    data: {
      scopeKey: string;
      teamId: number | null;
      area: string;
      title: string;
      description: string;
      priority: string;
      status: string;
      dueDate: Date | null;
      referenceUrl: string | null;
      createdById: string | null;
      createdByName: string;
      assignments?: { create?: Array<{ memberId: string; memberName: string }> };
    };
  }) => {
    const id = `task-${seq++}`;
    const created = {
      id,
      scopeKey: args.data.scopeKey,
      teamId: args.data.teamId,
      area: args.data.area,
      title: args.data.title,
      description: args.data.description,
      status: args.data.status,
      priority: args.data.priority,
      dueDate: args.data.dueDate,
      referenceUrl: args.data.referenceUrl,
      handoffNotes: '',
      deliveryUrl: null,
      createdById: args.data.createdById,
      createdByName: args.data.createdByName,
      updatedByName: null,
      completedAt: null,
      createdAt: now,
      updatedAt: now,
      assignments: (args.data.assignments?.create || []).map((a) => ({
        id: `asg-${seq++}`,
        taskId: id,
        memberId: a.memberId,
        memberName: a.memberName,
        assignedAt: now,
      })),
    };
    store.tasks.push(created);
    return created;
  });

  patch('areaTask', 'update', async (args: { where: { id: string }; data: Record<string, unknown> }) => {
    const t = store.tasks.find((item) => item.id === args.where.id)!;
    Object.assign(t, args.data, { updatedAt: now });
    return t;
  });

  patch('areaTask', 'delete', async (args: { where: { id: string } }) => {
    const idx = store.tasks.findIndex((item) => item.id === args.where.id);
    if (idx !== -1) store.tasks.splice(idx, 1);
    return null;
  });

  patch('areaTaskAssignment', 'deleteMany', async (args: { where: { taskId: string } }) => {
    const t = store.tasks.find((item) => item.id === args.where.taskId);
    if (t) t.assignments = [];
    return { count: 0 };
  });

  patch('areaTaskAssignment', 'createMany', async (args: {
    data: Array<{ taskId: string; memberId: string; memberName: string }>;
  }) => {
    for (const row of args.data) {
      const t = store.tasks.find((item) => item.id === row.taskId);
      if (t) {
        t.assignments.push({
          id: `asg-${seq++}`,
          taskId: row.taskId,
          memberId: row.memberId,
          memberName: row.memberName,
          assignedAt: now,
        });
      }
    }
    return { count: args.data.length };
  });

  patch('course', 'findMany', async () => store.courses);
  patch('course', 'count', async (args?: { where?: { slug?: { startsWith?: string } } }) =>
    store.courses.filter((c) => !args?.where?.slug?.startsWith || c.slug.startsWith(args.where.slug.startsWith)).length
  );
  patch('course', 'aggregate', async () => ({
    _max: { orderIndex: store.courses.reduce((m, c) => Math.max(m, c.orderIndex), 1) },
  }));
  patch('course', 'findUnique', async (args: { where: { id: string } }) =>
    store.courses.find((c) => c.id === args.where.id) ?? null
  );
  patch('course', 'create', async (args: {
    data: {
      slug: string;
      title: string;
      subtitle: string | null;
      description: string;
      badge: string | null;
      level: string;
      durationHours: number;
      published: boolean;
      orderIndex: number;
      scopeKey: string | null;
      area: string | null;
      teamId: number | null;
      externalUrl: string | null;
      createdById: string | null;
      modules?: { create?: Array<{ slug: string; title: string; orderIndex: number }> };
    };
  }) => {
    const id = `course-${seq++}`;
    const created = {
      id,
      slug: args.data.slug,
      title: args.data.title,
      subtitle: args.data.subtitle,
      description: args.data.description,
      badge: args.data.badge,
      level: args.data.level,
      durationHours: args.data.durationHours,
      published: args.data.published,
      orderIndex: args.data.orderIndex,
      scopeKey: args.data.scopeKey,
      area: args.data.area,
      teamId: args.data.teamId,
      externalUrl: args.data.externalUrl,
      createdById: args.data.createdById,
      createdAt: now,
      modules: (args.data.modules?.create || []).map((m) => ({
        id: `mod-${seq++}`,
        courseId: id,
        slug: m.slug,
        title: m.title,
        description: null,
        orderIndex: m.orderIndex,
        lessons: [],
      })),
    };
    store.courses.push(created);
    return created;
  });

  patch('module', 'create', async (args: { data: { courseId: string; slug: string; title: string; orderIndex: number } }) => {
    const course = store.courses.find((c) => c.id === args.data.courseId)!;
    const mod = {
      id: `mod-${seq++}`,
      courseId: args.data.courseId,
      slug: args.data.slug,
      title: args.data.title,
      description: null,
      orderIndex: args.data.orderIndex,
      lessons: [],
    };
    course.modules.push(mod);
    return mod;
  });

  patch('lesson', 'create', async (args: {
    data: {
      moduleId: string;
      slug: string;
      title: string;
      orderIndex: number;
      lessonType: string;
      videoStatus: string;
      youtubeVideoId: string | null;
      summary: string | null;
      textContent: string;
      rosDocsUrl: string | null;
    };
  }) => {
    const lesson = { id: `les-${seq++}`, ...args.data };
    for (const c of store.courses) {
      const m = c.modules.find((mod) => mod.id === args.data.moduleId);
      if (m) m.lessons.push(lesson);
    }
    return lesson;
  });

  return fn(store).finally(() => {
    (p as Record<string, unknown>).$transaction = originalTx;
    for (const [model, method, prev] of restore) {
      p[model][method] = prev;
    }
  });
}

test('múltiplos cargos organizacionais no site normalizam, traduzem e derivam soma de permissões', () => {
  assert.deepEqual(
    splitMemberRoles('Coordenadora / Integrante / Diretor de Operações'),
    ['Coordenador', 'Membro', 'Diretor de Operações']
  );
  assert.equal(formatMemberRoles(['Coordenador', 'Membro']), 'Coordenador / Membro');
  assert.equal(normalizeMemberRole('Coordenadora / Integrante'), 'Coordenador / Membro');
  assert.deepEqual(memberRoleTranslations('Coordenadora / Integrante'), {
    roleEn: 'Coordinator / Member',
    roleFr: 'Coordinateur / Membre',
  });
  assert.deepEqual(rolesFromCargo('Coordenador / Membro', 'Software'), ['COORDINATOR', 'MEMBER']);
  assert.deepEqual(
    rolesFromCargo('Diretor de Operações / Coordenador', 'Software'),
    ['ADMIN', 'COORDINATOR']
  );
  assert.equal(roleFromCargo('Diretor de Operações / Coordenador', 'Software'), 'ADMIN');
  assert.equal(roleFromCargo('Coordenador / Membro', 'Software'), 'COORDINATOR');
});

test('membro com múltiplos cargos no sistema possui a liberdade somada de todos os cargos', () => {
  const dualUser = makeUser({
    id: 'u-dual',
    role: 'COORDINATOR',
    roles: ['COORDINATOR', 'MANAGEMENT'],
    area: 'Software',
    teamId: 2,
  });

  assert.deepEqual(extractEffectiveRoles(dualUser), ['COORDINATOR', 'MANAGEMENT']);
  assert.equal(hasEffectiveRole(dualUser, 'COORDINATOR'), true);
  assert.equal(hasEffectiveRole(dualUser, 'MANAGEMENT'), true);
  assert.equal(hasEffectiveRole(dualUser, 'ADMIN'), false);
  assert.equal(hasManagementAccess(dualUser), true);

  // Soma das abas na gestão: vê Avaliações (por COORDINATOR) e Contas (por MANAGEMENT)
  const hrefs = managementSectionsForRole(dualUser).map((s) => s.href);
  assert.ok(hrefs.includes('/gestao/avaliacoes'));
  assert.ok(hrefs.includes('/gestao/contas'));
  assert.ok(!hrefs.includes('/gestao/logs'));

  // Soma das permissões: acesso global em disciplinar (por MANAGEMENT) e avaliações (por COORDINATOR)
  assert.equal(canUserManageDisciplinary(dualUser, 1), true);
  assert.equal(canAccessEvaluations(dualUser), true);
});

test('extrator de ID de vídeo do YouTube aceita URLs completas, encurtadas e IDs diretos', () => {
  assert.equal(extractYoutubeVideoId('dQw4w9WgXcQ'), 'dQw4w9WgXcQ');
  assert.equal(extractYoutubeVideoId('https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=12s'), 'dQw4w9WgXcQ');
  assert.equal(extractYoutubeVideoId('https://youtu.be/dQw4w9WgXcQ'), 'dQw4w9WgXcQ');
  assert.equal(extractYoutubeVideoId('https://www.youtube.com/embed/dQw4w9WgXcQ'), 'dQw4w9WgXcQ');
  assert.equal(extractYoutubeVideoId('https://example.com/invalido'), null);
});

test('espaço da área abre na área do usuário, controla passagem de tarefas e criação de cursos por área', async () => {
  const coordHarpia = makeUser({
    id: 'coord-hs',
    name: 'Coord Harpia Software',
    role: 'COORDINATOR',
    roles: ['COORDINATOR', 'MEMBER'],
    area: 'Software',
    teamId: 2,
  });
  const memberHarpia = makeUser({
    id: 'mem-hs',
    name: 'Dev Harpia Software',
    role: 'MEMBER',
    roles: ['MEMBER'],
    area: 'Software',
    teamId: 2,
  });
  const memberNautilusMec = makeUser({
    id: 'mem-nm',
    name: 'Mecânico Nautilus',
    role: 'MEMBER',
    roles: ['MEMBER'],
    area: 'Mecânica',
    teamId: 1,
  });

  await withAreaStubs(
    {
      members: [
        {
          id: coordHarpia.id,
          name: coordHarpia.name,
          email: coordHarpia.email,
          avatar: null,
          role: 'COORDINATOR',
          roles: ['COORDINATOR', 'MEMBER'],
          area: 'Software',
          teamId: 2,
          active: true,
          status: 'APPROVED',
          institutionalMemberId: null,
        },
        {
          id: memberHarpia.id,
          name: memberHarpia.name,
          email: memberHarpia.email,
          avatar: null,
          role: 'MEMBER',
          roles: ['MEMBER'],
          area: 'Software',
          teamId: 2,
          active: true,
          status: 'APPROVED',
          institutionalMemberId: null,
        },
        {
          id: memberNautilusMec.id,
          name: memberNautilusMec.name,
          email: memberNautilusMec.email,
          avatar: null,
          role: 'MEMBER',
          roles: ['MEMBER'],
          area: 'Mecânica',
          teamId: 1,
          active: true,
          status: 'APPROVED',
          institutionalMemberId: null,
        },
      ],
      tasks: [],
      courses: [],
    },
    async () => {
      // Usuário abre direto na sua área + divisão
      const defaultMec = await getAreasWorkspace(memberNautilusMec);
      assert.equal(defaultMec.selectedScope.scopeKey, 'nautilus:Mecânica');
      assert.equal(defaultMec.canManageSelectedArea, false);
      assert.ok(defaultMec.recommendedSlots.length >= 2);

      // Coordenador cria tarefa na própria área; bloqueado em outra área
      await assert.rejects(
        () =>
          createAreaTask(coordHarpia, {
            scopeKey: 'nautilus:Mecânica',
            title: 'Tarefa invasora',
          }),
        (err: unknown) => err instanceof AreaHubError && err.status === 403
      );
      await assert.rejects(
        () =>
          createAreaTask(memberHarpia, {
            scopeKey: 'harpia:Software',
            title: 'Membro comum criando',
          }),
        (err: unknown) => err instanceof AreaHubError && err.status === 403
      );

      const task = await createAreaTask(coordHarpia, {
        scopeKey: 'harpia:Software',
        title: 'Calibrar pipeline OpenCV do drone',
        priority: 'ALTA',
        assigneeIds: [memberHarpia.id],
      });
      assert.equal(task.scopeKey, 'harpia:Software');
      assert.equal(task.assignments.length, 1);

      // Membro comum não pode redefinir título/atribuídos, mas pode registrar passagem e mover status
      await assert.rejects(
        () => updateAreaTask(memberHarpia, task.id, { title: 'Outro título' }),
        (err: unknown) => err instanceof AreaHubError && err.status === 403
      );
      const passed = await updateAreaTask(memberHarpia, task.id, {
        status: 'REVIEW',
        handoffNotes: 'Calibração validada no Gazebo; falta revisão final.',
        deliveryUrl: 'https://github.com/ufrj-autonomos/pr/12',
      });
      assert.equal(passed.status, 'REVIEW');
      assert.match(passed.handoffNotes, /Gazebo/);

      // Criação de curso e aulas na área (bloqueado para membro comum; permitido para Coordenador da área)
      await assert.rejects(
        () =>
          createAreaCourse(memberHarpia, {
            scopeKey: 'harpia:Software',
            title: 'Visão Computacional',
            description: 'Curso prático',
          }),
        (err: unknown) => err instanceof AreaHubError && err.status === 403
      );

      const course = await createAreaCourse(coordHarpia, {
        scopeKey: 'harpia:Software',
        scopeMode: 'division',
        title: 'Visão Computacional & Navegação Autônoma',
        description: 'Capacitação de visão para UAVs.',
        durationHours: 12,
      });
      assert.equal(course.scopeKey, 'harpia:Software');

      const lesson = await addLessonToAreaCourse(coordHarpia, course.id, {
        moduleId: course.modules[0].id,
        title: 'Calibração de Câmera no ROS 2',
        youtubeUrl: 'https://youtu.be/dQw4w9WgXcQ',
      });
      assert.equal(lesson.youtubeVideoId, 'dQw4w9WgXcQ');
      assert.equal(lesson.lessonType, 'VIDEO');

      const ws = await getAreasWorkspace(coordHarpia);
      assert.equal(ws.selectedScope.scopeKey, 'harpia:Software');
      assert.equal(ws.courses.length, 1);
      assert.equal(ws.courses[0].totalLessons, 1);
      // Como criamos o curso com o título do slot "Visão Computacional & Navegação Autônoma", esse slot sai dos pendentes
      assert.ok(!ws.recommendedSlots.some((s) => s.title === 'Visão Computacional & Navegação Autônoma'));
    }
  );
});
