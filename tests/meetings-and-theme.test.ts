import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateAttendanceScore,
  getFrequencyStatus,
  getVisibleAreasForUser,
  canUserManageMeetings,
} from '../src/lib/meetings/service';
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

  assert.equal(totalP, 99);
  assert.equal(totalA, 25);
  const overallRate = (totalP / (totalP + totalA)) * 100;
  assert.equal(overallRate.toFixed(1), '79.8');

  // Membros com 100% de frequência
  let perfectCount = 0;
  for (const stats of memberAttendances.values()) {
    const total = stats.p + stats.a;
    if (total > 0 && stats.p === total) {
      perfectCount++;
    }
  }
  assert.equal(perfectCount, 15);
});

