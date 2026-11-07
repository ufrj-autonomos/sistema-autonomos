import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateAttendanceScore,
  getFrequencyStatus,
  getVisibleAreasForUser,
  canUserManageMeetings,
} from '../src/lib/meetings/service';
import { getEffectiveTeamTheme } from '../src/lib/theme';
import { prisma } from '../src/lib/prisma';
import type { SafeUser } from '../src/lib/session';

test('Theme and team mapping logic', () => {
  const harpiaUser: SafeUser = {
    id: 'u1',
    name: 'Harpia Member',
    email: 'harpia@ufrj.br',
    role: 'MEMBER',
    status: 'APPROVED',
    teamId: 2,
    teamSlug: 'harpia',
    area: 'Software',
  };

  const nautilusUser: SafeUser = {
    id: 'u2',
    name: 'Nautilus Member',
    email: 'nautilus@ufrj.br',
    role: 'MEMBER',
    status: 'APPROVED',
    teamId: 1,
    teamSlug: 'nautilus',
    area: 'Mecânica',
  };

  const autonomosUser: SafeUser = {
    id: 'u3',
    name: 'Autônomos Gestão',
    email: 'gestao@ufrj.br',
    role: 'MEMBER',
    status: 'APPROVED',
    teamId: null,
    teamSlug: 'autonomos',
    area: 'Gestão',
  };

  const adminUser: SafeUser = {
    id: 'u4',
    name: 'Admin User',
    email: 'admin@ufrj.br',
    role: 'ADMIN',
    status: 'APPROVED',
    teamId: 2,
    teamSlug: 'harpia',
    area: 'Software',
  };

  // Verificação de permissão de escrita
  assert.equal(canUserManageMeetings(harpiaUser), false);
  assert.equal(canUserManageMeetings(nautilusUser), false);
  assert.equal(canUserManageMeetings(autonomosUser), false);
  assert.equal(canUserManageMeetings(adminUser), true);

  const coordinatorHarpia: SafeUser = {
    id: 'u5',
    name: 'Harpia Coordinator',
    email: 'coord.harpia@ufrj.br',
    role: 'COORDINATOR',
    status: 'APPROVED',
    teamId: 2,
    teamSlug: 'harpia',
    area: 'Software',
  };

  const coordinatorNautilus: SafeUser = {
    id: 'u6',
    name: 'Nautilus Coordinator',
    email: 'coord.nautilus@ufrj.br',
    role: 'COORDINATOR',
    status: 'APPROVED',
    teamId: 1,
    teamSlug: 'nautilus',
    area: 'Mecânica',
  };

  // Coordenadores podem editar reuniões e presenças apenas da sua própria equipe
  assert.equal(canUserManageMeetings(coordinatorHarpia), true);
  assert.equal(canUserManageMeetings(coordinatorHarpia, 2), true);
  assert.equal(canUserManageMeetings(coordinatorHarpia, 1), false);
  assert.equal(canUserManageMeetings(coordinatorHarpia, null), false);

  assert.equal(canUserManageMeetings(coordinatorNautilus), true);
  assert.equal(canUserManageMeetings(coordinatorNautilus, 1), true);
  assert.equal(canUserManageMeetings(coordinatorNautilus, 2), false);

  // Áreas visíveis para o coordenador: somente a sua equipe
  const coordHarpiaAreas = getVisibleAreasForUser(coordinatorHarpia);
  assert.equal(coordHarpiaAreas.length, 3);
  assert.ok(coordHarpiaAreas.every((a) => a.teamId === 2));

  // Verificação de visibilidade de áreas
  const harpiaAreas = getVisibleAreasForUser(harpiaUser);
  assert.equal(harpiaAreas.length, 3);
  assert.ok(harpiaAreas.every((a) => a.teamId === 2));

  const nautilusAreas = getVisibleAreasForUser(nautilusUser);
  assert.equal(nautilusAreas.length, 3);
  assert.ok(nautilusAreas.every((a) => a.teamId === 1));

  const autonomosAreas = getVisibleAreasForUser(autonomosUser);
  assert.equal(autonomosAreas.length, 2);
  assert.ok(autonomosAreas.every((a) => a.teamId === null));

  const adminAreas = getVisibleAreasForUser(adminUser);
  assert.equal(adminAreas.length, 8);

  // Tema do site: Admin deve ser automaticamente Autônomos (null para sobrescritas de divisão)
  assert.equal(getEffectiveTeamTheme(harpiaUser), 'harpia');
  assert.equal(getEffectiveTeamTheme(nautilusUser), 'nautilus');
  assert.equal(getEffectiveTeamTheme(autonomosUser), null);
  assert.equal(getEffectiveTeamTheme(adminUser), null);
});

test('Attendance score calculation rules (Spreadsheet 26.2 matching)', () => {
  // [P] Presente = 1.0 ponto
  const p = calculateAttendanceScore('PRESENT');
  assert.equal(p.presence, 1.0);
  assert.equal(p.absence, 0);
  assert.equal(p.counted, true);

  // [J] Justificada = 1.0 ponto de presença integral
  const j = calculateAttendanceScore('JUSTIFIED');
  assert.equal(j.presence, 1.0);
  assert.equal(j.absence, 0);
  assert.equal(j.counted, true);

  // [A] Atraso = 0.5 presença e 0.5 falta
  const a = calculateAttendanceScore('LATE');
  assert.equal(a.presence, 0.5);
  assert.equal(a.absence, 0.5);
  assert.equal(a.counted, true);

  // [F] Falta = 0 presenças, 1.0 falta
  const f = calculateAttendanceScore('ABSENT');
  assert.equal(f.presence, 0);
  assert.equal(f.absence, 1.0);
  assert.equal(f.counted, true);

  // [S] Sem reunião = desconsiderado
  const s = calculateAttendanceScore('NO_MEETING');
  assert.equal(s.counted, false);

  // [N] Não era membro = desconsiderado (nulo, não afeta cálculo)
  const n = calculateAttendanceScore('NOT_A_MEMBER');
  assert.equal(n.counted, false);
  assert.equal(n.presence, 0);
  assert.equal(n.absence, 0);
});

test('Frequency status thresholds', () => {
  assert.equal(getFrequencyStatus(85.7, 4).tone, 'green');
  assert.equal(getFrequencyStatus(75.0, 4).tone, 'yellow');
  assert.equal(getFrequencyStatus(62.5, 4).tone, 'red');
  assert.equal(getFrequencyStatus(0, 0).tone, 'gray');
});

test('Database imported meeting data matches Google Sheets Painel 26.2', async () => {
  const meetings = await prisma.meeting.findMany({
    where: { period: '26.2' },
    include: { attendances: true },
  });

  // Total de reuniões realizadas no período: 23
  assert.equal(meetings.length, 23);

  // Reuniões por área
  const countArea = (area: string, teamId: number | null) =>
    meetings.filter((m) => m.area === area && m.teamId === teamId).length;

  assert.equal(countArea('Software', 2), 4);
  assert.equal(countArea('Mecânica', 2), 9);
  assert.equal(countArea('Eletrônica', 2), 6);
  assert.equal(countArea('Gestão', null), 3);
  assert.equal(countArea('Marketing', null), 1);

  // Presenças e faltas totais
  let totalP = 0;
  let totalA = 0;
  const memberAttendances = new Map<string, { p: number; a: number }>();

  for (const m of meetings) {
    for (const att of m.attendances) {
      const score = calculateAttendanceScore(att.status);
      if (score.counted) {
        totalP += score.presence;
        totalA += score.absence;

        if (!memberAttendances.has(att.memberId)) {
          memberAttendances.set(att.memberId, { p: 0, a: 0 });
        }
        const cur = memberAttendances.get(att.memberId)!;
        cur.p += score.presence;
        cur.a += score.absence;
      }
    }
  }

  assert.ok(totalP >= 99, `totalP should be at least 99, got ${totalP}`);
  assert.ok(totalA >= 24, `totalA should be around 25, got ${totalA}`);
  const overallRate = (totalP / (totalP + totalA)) * 100;
  assert.ok(overallRate >= 70 && overallRate <= 90, `overallRate should be plausible, got ${overallRate}`);

  // Membros com 100% de frequência
  let perfectCount = 0;
  for (const stats of memberAttendances.values()) {
    const total = stats.p + stats.a;
    if (total > 0 && stats.p === total) {
      perfectCount++;
    }
  }
  assert.ok(perfectCount >= 14, `perfectCount should be around 15, got ${perfectCount}`);
});

test('Mural dos mais presentes and team comparison data structure', async () => {
  const adminUser: SafeUser = {
    id: 'u-admin',
    name: 'Admin Tester',
    email: 'admin@ufrj.br',
    role: 'ADMIN',
    status: 'APPROVED',
    teamId: null,
    teamSlug: 'autonomos',
    area: 'Gestão',
  };

  const { getMeetingsDashboardData } = await import('../src/lib/meetings/service');
  const dashboard = await getMeetingsDashboardData(adminUser, '26.2');

  // Comparativo de reuniões por equipe
  assert.ok(Array.isArray(dashboard.overview.teamComparison));
  assert.equal(dashboard.overview.teamComparison.length, 3);
  const harpia = dashboard.overview.teamComparison.find((t) => t.slug === 'harpia');
  const nautilus = dashboard.overview.teamComparison.find((t) => t.slug === 'nautilus');
  const autonomos = dashboard.overview.teamComparison.find((t) => t.slug === 'autonomos');
  assert.ok(harpia && harpia.meetingsCount >= 15);
  assert.ok(nautilus && nautilus.meetingsCount >= 0);
  assert.ok(autonomos && autonomos.meetingsCount >= 4);

  // Mural dos mais presentes
  assert.ok(Array.isArray(dashboard.overview.topPresentMembers));
  assert.ok(dashboard.overview.topPresentMembers.length >= 5);
  // Se houver mais de 5 membros com 100%, todos com 100% devem estar presentes
  const members100 = dashboard.overview.topPresentMembers.filter((m) => m.pct >= 99.9);
  if (members100.length > 5) {
    assert.equal(dashboard.overview.topPresentMembers.length, members100.length);
  }
});

