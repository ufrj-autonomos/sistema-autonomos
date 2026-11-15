import test from 'node:test';
import assert from 'node:assert/strict';
import { prisma } from '../src/lib/prisma';
import { managementSectionsForRole } from '../src/lib/management-navigation';
import {
  EvaluationError,
  getEvaluationsWorkspace,
  getHomeAreaEvaluations,
  upsertMemberEvaluation,
  deleteMemberEvaluation,
  upsertAreaEvaluation,
  upsertCoordinatorEvaluation,
} from '../src/lib/evaluations/service';
import type { SafeUser } from '../src/lib/session';

delete process.env.INSTITUTIONAL_DATABASE_URL;

function makeUser(overrides: Partial<SafeUser>): SafeUser {
  return {
    id: overrides.id ?? 'user-1',
    name: overrides.name ?? 'Usuário Teste',
    email: overrides.email ?? 'teste@autonomos.ufrj.br',
    avatar: null,
    role: overrides.role ?? 'MEMBER',
    area: overrides.area ?? 'Software',
    teamId: overrides.teamId === undefined ? 2 : overrides.teamId,
    status: 'APPROVED',
    profileCompletedAt: new Date('2026-08-01T00:00:00Z'),
    institutionalMemberId: null,
  };
}

interface StubStores {
  members: Array<{
    id: string;
    name: string;
    email: string;
    avatar: string | null;
    role: string;
    area: string | null;
    teamId: number | null;
    active: boolean;
    status: string;
    institutionalMemberId: number | null;
    attendancePeriods?: unknown[];
    attendanceVisits?: unknown[];
    attendanceJustifications?: unknown[];
  }>;
  memberEvaluations: Array<{
    id: string;
    periodCode: string;
    memberId: string;
    evaluatorId: string | null;
    evaluatorName: string;
    teamId: number | null;
    area: string;
    score: number;
    notes: string;
    createdAt: Date;
    updatedAt: Date;
  }>;
  areaEvaluations: Array<{
    id: string;
    periodCode: string;
    scopeKey: string;
    teamId: number | null;
    area: string;
    score: number;
    notes: string;
    evaluatorId: string | null;
    evaluatorName: string;
    createdAt: Date;
    updatedAt: Date;
  }>;
  coordinatorEvaluations: Array<{
    id: string;
    periodCode: string;
    coordinatorId: string;
    evaluatorId: string | null;
    evaluatorName: string;
    teamId: number | null;
    area: string;
    score: number;
    notes: string;
    createdAt: Date;
    updatedAt: Date;
  }>;
}

function withPrismaStubs<T>(initial: StubStores, fn: (stores: StubStores) => Promise<T>): Promise<T> {
  const stores: StubStores = {
    members: initial.members.map((m) => ({
      attendancePeriods: [],
      attendanceVisits: [],
      attendanceJustifications: [],
      ...m,
    })),
    memberEvaluations: [...initial.memberEvaluations],
    areaEvaluations: [...initial.areaEvaluations],
    coordinatorEvaluations: [...initial.coordinatorEvaluations],
  };

  const p = prisma as unknown as Record<string, Record<string, unknown>>;
  const restore: Array<[string, string, unknown]> = [];
  const patch = (model: string, method: string, impl: unknown) => {
    if (!p[model]) p[model] = {};
    restore.push([model, method, p[model][method]]);
    p[model][method] = impl;
  };

  let seq = 1;
  const now = new Date('2026-11-15T12:00:00Z');

  patch('meetingPeriod', 'findMany', async () => [
    { id: 'mp-1', code: '26.2', name: '2026.2', isCurrent: true, createdAt: now },
    { id: 'mp-0', code: '26.1', name: '2026.1', isCurrent: false, createdAt: new Date('2026-03-01T00:00:00Z') },
  ]);

  patch('member', 'findMany', async () => stores.members);
  patch('attendanceSettings', 'findUnique', async () => ({ maxSessionSeconds: 43200 }));
  patch('attendanceVacationWeek', 'findMany', async () => []);
  patch('meeting', 'findMany', async () => []);
  patch('disciplinaryWarning', 'findMany', async () => []);

  patch('memberEvaluation', 'findMany', async (args?: { where?: { periodCode?: string }; select?: Record<string, boolean> }) => {
    const rows = args?.where?.periodCode
      ? stores.memberEvaluations.filter((r) => r.periodCode === args.where?.periodCode)
      : stores.memberEvaluations;
    if (args?.select) {
      return rows.map((r) => ({ periodCode: r.periodCode, score: r.score }));
    }
    return rows;
  });
  patch('memberEvaluation', 'findUnique', async (args: { where: { id: string } }) =>
    stores.memberEvaluations.find((r) => r.id === args.where.id) ?? null
  );
  patch('memberEvaluation', 'upsert', async (args: {
    where: { periodCode_memberId: { periodCode: string; memberId: string } };
    create: Omit<StubStores['memberEvaluations'][number], 'id' | 'createdAt' | 'updatedAt'>;
    update: Partial<StubStores['memberEvaluations'][number]>;
  }) => {
    const existing = stores.memberEvaluations.find(
      (r) =>
        r.periodCode === args.where.periodCode_memberId.periodCode &&
        r.memberId === args.where.periodCode_memberId.memberId
    );
    if (existing) {
      Object.assign(existing, args.update, { updatedAt: now });
      return existing;
    }
    const created = {
      id: `me-${seq++}`,
      createdAt: now,
      updatedAt: now,
      ...args.create,
    };
    stores.memberEvaluations.push(created);
    return created;
  });
  patch('memberEvaluation', 'delete', async (args: { where: { id: string } }) => {
    const idx = stores.memberEvaluations.findIndex((r) => r.id === args.where.id);
    if (idx === -1) return null;
    const [removed] = stores.memberEvaluations.splice(idx, 1);
    return removed;
  });

  patch('areaEvaluation', 'findMany', async (args?: { where?: { periodCode?: string }; select?: Record<string, boolean> }) => {
    const rows = args?.where?.periodCode
      ? stores.areaEvaluations.filter((r) => r.periodCode === args.where?.periodCode)
      : stores.areaEvaluations;
    if (args?.select) {
      return rows.map((r) => ({ periodCode: r.periodCode, score: r.score }));
    }
    return rows;
  });
  patch('areaEvaluation', 'upsert', async (args: {
    where: { periodCode_scopeKey: { periodCode: string; scopeKey: string } };
    create: Omit<StubStores['areaEvaluations'][number], 'id' | 'createdAt' | 'updatedAt'>;
    update: Partial<StubStores['areaEvaluations'][number]>;
  }) => {
    const existing = stores.areaEvaluations.find(
      (r) =>
        r.periodCode === args.where.periodCode_scopeKey.periodCode &&
        r.scopeKey === args.where.periodCode_scopeKey.scopeKey
    );
    if (existing) {
      Object.assign(existing, args.update, { updatedAt: now });
      return existing;
    }
    const created = {
      id: `ae-${seq++}`,
      createdAt: now,
      updatedAt: now,
      ...args.create,
    };
    stores.areaEvaluations.push(created);
    return created;
  });

  patch('coordinatorEvaluation', 'findMany', async (args?: { where?: { periodCode?: string }; select?: Record<string, boolean> }) => {
    const rows = args?.where?.periodCode
      ? stores.coordinatorEvaluations.filter((r) => r.periodCode === args.where?.periodCode)
      : stores.coordinatorEvaluations;
    if (args?.select) {
      return rows.map((r) => ({ periodCode: r.periodCode, score: r.score }));
    }
    return rows;
  });
  patch('coordinatorEvaluation', 'upsert', async (args: {
    where: { periodCode_coordinatorId: { periodCode: string; coordinatorId: string } };
    create: Omit<StubStores['coordinatorEvaluations'][number], 'id' | 'createdAt' | 'updatedAt'>;
    update: Partial<StubStores['coordinatorEvaluations'][number]>;
  }) => {
    const existing = stores.coordinatorEvaluations.find(
      (r) =>
        r.periodCode === args.where.periodCode_coordinatorId.periodCode &&
        r.coordinatorId === args.where.periodCode_coordinatorId.coordinatorId
    );
    if (existing) {
      Object.assign(existing, args.update, { updatedAt: now });
      return existing;
    }
    const created = {
      id: `ce-${seq++}`,
      createdAt: now,
      updatedAt: now,
      ...args.create,
    };
    stores.coordinatorEvaluations.push(created);
    return created;
  });

  return fn(stores).finally(() => {
    for (const [model, method, prev] of restore) {
      p[model][method] = prev;
    }
  });
}

function baseRoster(): StubStores['members'] {
  return [
    {
      id: 'coord-harpia-soft',
      name: 'Coord Harpia Soft',
      email: 'coord.hs@autonomos.ufrj.br',
      avatar: null,
      role: 'COORDINATOR',
      area: 'Software',
      teamId: 2,
      active: true,
      status: 'APPROVED',
      institutionalMemberId: null,
    },
    {
      id: 'coord-naut-soft',
      name: 'Coord Nautilus Soft',
      email: 'coord.ns@autonomos.ufrj.br',
      avatar: null,
      role: 'COORDINATOR',
      area: 'Software',
      teamId: 1,
      active: true,
      status: 'APPROVED',
      institutionalMemberId: null,
    },
    {
      id: 'admin-cap',
      name: 'Capitão Admin',
      email: 'cap@autonomos.ufrj.br',
      avatar: null,
      role: 'ADMIN',
      area: 'Gestão',
      teamId: null,
      active: true,
      status: 'APPROVED',
      institutionalMemberId: null,
    },
    {
      id: 'm-hs-1',
      name: 'Membro Harpia Soft',
      email: 'mhs@autonomos.ufrj.br',
      avatar: null,
      role: 'MEMBER',
      area: 'Software',
      teamId: 2,
      active: true,
      status: 'APPROVED',
      institutionalMemberId: null,
    },
    {
      id: 'm-hm-1',
      name: 'Membro Harpia Mec',
      email: 'mhm@autonomos.ufrj.br',
      avatar: null,
      role: 'MEMBER',
      area: 'Mecânica',
      teamId: 2,
      active: true,
      status: 'APPROVED',
      institutionalMemberId: null,
    },
    {
      id: 'm-ns-1',
      name: 'Membro Nautilus Soft',
      email: 'mns@autonomos.ufrj.br',
      avatar: null,
      role: 'TRAINEE',
      area: 'Software',
      teamId: 1,
      active: true,
      status: 'APPROVED',
      institutionalMemberId: null,
    },
    {
      id: 'm-gestao-1',
      name: 'Membro Gestão',
      email: 'mg@autonomos.ufrj.br',
      avatar: null,
      role: 'MANAGEMENT',
      area: 'Gestão',
      teamId: null,
      active: true,
      status: 'APPROVED',
      institutionalMemberId: null,
    },
  ];
}

test('navegação de gestão exibe Avaliações apenas para ADMIN e COORDINATOR', () => {
  const adminHrefs = managementSectionsForRole('ADMIN').map((s) => s.href);
  const coordHrefs = managementSectionsForRole('COORDINATOR').map((s) => s.href);
  const mgmtHrefs = managementSectionsForRole('MANAGEMENT').map((s) => s.href);
  const memberHrefs = managementSectionsForRole('MEMBER').map((s) => s.href);

  assert.ok(adminHrefs.includes('/gestao/avaliacoes'));
  assert.ok(coordHrefs.includes('/gestao/avaliacoes'));
  assert.ok(!mgmtHrefs.includes('/gestao/avaliacoes'));
  assert.ok(!memberHrefs.includes('/gestao/avaliacoes'));
});

test('MANAGEMENT, MEMBER e TRAINEE recebem 403 no workspace e endpoints de avaliações', async () => {
  await withPrismaStubs(
    { members: baseRoster(), memberEvaluations: [], areaEvaluations: [], coordinatorEvaluations: [] },
    async () => {
      for (const role of ['MANAGEMENT', 'MEMBER', 'TRAINEE'] as const) {
        const user = makeUser({ id: 'u-denied', role });
        await assert.rejects(
          () => getEvaluationsWorkspace(user, '26.2'),
          (err: unknown) => err instanceof EvaluationError && err.status === 403
        );
        await assert.rejects(
          () => upsertMemberEvaluation(user, { periodCode: '26.2', memberId: 'm-hs-1', score: 8, notes: 'ok' }),
          (err: unknown) => err instanceof EvaluationError && err.status === 403
        );
        await assert.rejects(
          () => upsertAreaEvaluation(user, { periodCode: '26.2', scopeKey: 'harpia:Software', score: 8, notes: 'ok' }),
          (err: unknown) => err instanceof EvaluationError && err.status === 403
        );
        await assert.rejects(
          () => upsertCoordinatorEvaluation(user, { periodCode: '26.2', coordinatorId: 'coord-harpia-soft', score: 8, notes: 'ok' }),
          (err: unknown) => err instanceof EvaluationError && err.status === 403
        );
      }
    }
  );
});

test('COORDINATOR vê e avalia apenas sua área+equipe e tem áreas em modo somente leitura', async () => {
  const coord = makeUser({
    id: 'coord-harpia-soft',
    name: 'Coord Harpia Soft',
    role: 'COORDINATOR',
    area: 'Software',
    teamId: 2,
  });

  await withPrismaStubs(
    {
      members: baseRoster(),
      memberEvaluations: [
        {
          id: 'me-other',
          periodCode: '26.2',
          memberId: 'm-ns-1',
          evaluatorId: 'coord-naut-soft',
          evaluatorName: 'Coord Nautilus Soft',
          teamId: 1,
          area: 'Software',
          score: 4.5,
          notes: 'Nota privada de outra equipe',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      areaEvaluations: [
        {
          id: 'ae-1',
          periodCode: '26.2',
          scopeKey: 'harpia:Software',
          teamId: 2,
          area: 'Software',
          score: 8.7,
          notes: 'Excelente entrega de Software Harpia.',
          evaluatorId: 'admin-cap',
          evaluatorName: 'Capitão Admin',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      coordinatorEvaluations: [
        {
          id: 'ce-secret',
          periodCode: '26.2',
          coordinatorId: 'coord-harpia-soft',
          evaluatorId: 'admin-cap',
          evaluatorName: 'Capitão Admin',
          teamId: 2,
          area: 'Software',
          score: 9.1,
          notes: 'Nota confidencial do próprio coordenador.',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
    },
    async () => {
      const ws = await getEvaluationsWorkspace(coord, '26.2');
      assert.equal(ws.isAdmin, false);
      assert.equal(ws.viewerRole, 'COORDINATOR');
      assert.equal(ws.dashboard, null);
      assert.deepEqual(ws.coordinators, []);
      assert.equal(ws.coordinatorScope?.scopeKey, 'harpia:Software');

      // Apenas membros da própria área + equipe (exclui Nautilus, Mecânica, Coordenadores e Admins)
      assert.deepEqual(ws.members.map((m) => m.memberId), ['m-hs-1']);

      // Áreas ficam visíveis em modo leitura, sem vazar estatísticas de avaliações individuais de outras áreas
      assert.ok(ws.areas.length >= 8);
      for (const areaRow of ws.areas) {
        if (areaRow.scopeKey === 'harpia:Software') {
          assert.equal(areaRow.metrics.memberAvgScore, null);
        } else {
          assert.equal(areaRow.metrics.memberAvgScore, undefined);
          assert.equal(areaRow.metrics.evaluatedMembersCount, undefined);
        }
      }

      const serialized = JSON.stringify(ws);
      assert.ok(!serialized.includes('Nota privada de outra equipe'));
      assert.ok(!serialized.includes('Nota confidencial do próprio coordenador'));

      // Bloqueia avaliação em outra equipe ou outra área
      await assert.rejects(
        () => upsertMemberEvaluation(coord, { periodCode: '26.2', memberId: 'm-ns-1', score: 8, notes: 'Tentativa' }),
        (err: unknown) => err instanceof EvaluationError && err.status === 403
      );
      await assert.rejects(
        () => upsertMemberEvaluation(coord, { periodCode: '26.2', memberId: 'm-hm-1', score: 8, notes: 'Tentativa' }),
        (err: unknown) => err instanceof EvaluationError && err.status === 403
      );
      // Bloqueia editar área ou avaliar coordenador
      await assert.rejects(
        () => upsertAreaEvaluation(coord, { periodCode: '26.2', scopeKey: 'harpia:Software', score: 9.5, notes: 'Tentativa' }),
        (err: unknown) => err instanceof EvaluationError && err.status === 403
      );
      await assert.rejects(
        () => upsertCoordinatorEvaluation(coord, { periodCode: '26.2', coordinatorId: 'coord-naut-soft', score: 9, notes: 'Tentativa' }),
        (err: unknown) => err instanceof EvaluationError && err.status === 403
      );
      // Bloqueia apagar avaliação de outra equipe
      await assert.rejects(
        () => deleteMemberEvaluation(coord, 'me-other'),
        (err: unknown) => err instanceof EvaluationError && err.status === 403
      );

      // Permite avaliar membro da própria área e atualizar/excluir
      const saved = await upsertMemberEvaluation(coord, {
        periodCode: '26.2',
        memberId: 'm-hs-1',
        score: 8.5,
        notes: 'Ótima evolução técnica.',
      });
      assert.equal(saved.score, 8.5);
      assert.equal(saved.memberId, 'm-hs-1');

      await deleteMemberEvaluation(coord, saved.id);
    }
  );
});

test('ADMIN avalia membros de qualquer área, áreas, coordenadores, acessa dashboard e não pode se autoavaliar', async () => {
  const admin = makeUser({
    id: 'admin-cap',
    name: 'Capitão Admin',
    role: 'ADMIN',
    area: 'Gestão',
    teamId: null,
  });

  await withPrismaStubs(
    { members: baseRoster(), memberEvaluations: [], areaEvaluations: [], coordinatorEvaluations: [] },
    async () => {
      const mSaved = await upsertMemberEvaluation(admin, {
        periodCode: '26.2',
        memberId: 'm-ns-1',
        score: 9.2,
        notes: 'Destaque em Software Nautilus.',
      });
      assert.equal(mSaved.score, 9.2);

      const aSaved = await upsertAreaEvaluation(admin, {
        periodCode: '26.2',
        scopeKey: 'nautilus:Software',
        score: 8.8,
        notes: 'Área muito bem organizada.',
      });
      assert.equal(aSaved.scopeKey, 'nautilus:Software');
      assert.equal(aSaved.score, 8.8);

      const cSaved = await upsertCoordinatorEvaluation(admin, {
        periodCode: '26.2',
        coordinatorId: 'coord-harpia-soft',
        score: 9.4,
        notes: 'Liderança consistente.',
      });
      assert.equal(cSaved.score, 9.4);

      // Bloqueia autoavaliação
      await assert.rejects(
        () => upsertMemberEvaluation(admin, { periodCode: '26.2', memberId: 'admin-cap', score: 10, notes: 'Self' }),
        (err: unknown) => err instanceof EvaluationError && err.status === 400
      );
      await assert.rejects(
        () => upsertCoordinatorEvaluation(admin, { periodCode: '26.2', coordinatorId: 'admin-cap', score: 10, notes: 'Self' }),
        (err: unknown) => err instanceof EvaluationError && err.status === 400
      );

      const ws = await getEvaluationsWorkspace(admin, '26.2');
      assert.equal(ws.isAdmin, true);
      assert.equal(ws.viewerRole, 'ADMIN');
      assert.ok(ws.members.length >= 4);
      assert.deepEqual(
        ws.coordinators.map((c) => c.coordinatorId).sort(),
        ['coord-harpia-soft', 'coord-naut-soft']
      );
      assert.ok(ws.dashboard !== null);
      assert.equal(ws.dashboard.kpis.memberEvaluatedCount, 1);
      assert.equal(ws.dashboard.kpis.areaEvaluatedCount, 1);
      assert.equal(ws.dashboard.kpis.coordinatorEvaluatedCount, 1);
      assert.equal(ws.dashboard.kpis.memberAverage, 9.2);
      assert.equal(ws.dashboard.kpis.areaAverage, 8.8);
      assert.equal(ws.dashboard.kpis.coordinatorAverage, 9.4);
    }
  );
});

test('getHomeAreaEvaluations expõe apenas nota das áreas na Home sem vazar avaliações individuais', async () => {
  await withPrismaStubs(
    {
      members: baseRoster(),
      memberEvaluations: [
        {
          id: 'me-secret',
          periodCode: '26.2',
          memberId: 'm-hs-1',
          evaluatorId: 'coord-harpia-soft',
          evaluatorName: 'Coord Harpia Soft',
          teamId: 2,
          area: 'Software',
          score: 3.1,
          notes: 'SEGREDO_INDIVIDUAL_MEMBRO',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      areaEvaluations: [
        {
          id: 'ae-home',
          periodCode: '26.2',
          scopeKey: 'harpia:Software',
          teamId: 2,
          area: 'Software',
          score: 8.6,
          notes: 'Ótimo semestre coletivo da área.',
          evaluatorId: 'admin-cap',
          evaluatorName: 'Capitão Admin',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      coordinatorEvaluations: [
        {
          id: 'ce-secret',
          periodCode: '26.2',
          coordinatorId: 'coord-harpia-soft',
          evaluatorId: 'admin-cap',
          evaluatorName: 'Capitão Admin',
          teamId: 2,
          area: 'Software',
          score: 9.0,
          notes: 'SEGREDO_INDIVIDUAL_COORD',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
    },
    async () => {
      const home = await getHomeAreaEvaluations({ area: 'Software', teamId: 2 });
      assert.equal(home.currentPeriodCode, '26.2');
      assert.equal(home.userScopeKey, 'harpia:Software');

      const areas = home.evaluationsByPeriod['26.2'] ?? [];
      const own = areas.find((a) => a.scopeKey === 'harpia:Software');
      assert.ok(own);
      assert.equal(own.isUserArea, true);
      assert.equal(own.score, 8.6);
      assert.equal(own.notes, 'Ótimo semestre coletivo da área.');

      const serialized = JSON.stringify(home);
      assert.ok(!serialized.includes('SEGREDO_INDIVIDUAL_MEMBRO'));
      assert.ok(!serialized.includes('SEGREDO_INDIVIDUAL_COORD'));
    }
  );
});
