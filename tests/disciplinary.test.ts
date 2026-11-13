import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateDisciplinaryStatus,
  canUserManageDisciplinary,
  getMemberDisciplinarySummary,
} from '../src/lib/disciplinary/service';
import type { SafeUser } from '../src/lib/session';
import { prisma } from '../src/lib/prisma';

test('Disciplinary calculation rules (2 Avisos = 1 Advertência | 3 Advertências = Expulsão)', () => {
  // 0 avisos, 0 advertências -> Regular
  const r0 = calculateDisciplinaryStatus(0, 0);
  assert.equal(r0.status, 'REGULAR');
  assert.equal(r0.totalWarnings, 0);
  assert.equal(r0.warningFromAvisos, 0);
  assert.equal(r0.statusColor, 'green');

  // 1 aviso, 0 advertências -> Atenção (ainda 0 advertências completas)
  const r1 = calculateDisciplinaryStatus(1, 0);
  assert.equal(r1.status, 'ATENCAO');
  assert.equal(r1.totalWarnings, 0);
  assert.equal(r1.warningFromAvisos, 0);
  assert.equal(r1.statusColor, 'yellow');

  // 2 avisos, 0 advertências -> Atenção (2 avisos convertidos em 1 advertência)
  const r2 = calculateDisciplinaryStatus(2, 0);
  assert.equal(r2.status, 'ATENCAO');
  assert.equal(r2.totalWarnings, 1);
  assert.equal(r2.warningFromAvisos, 1);
  assert.equal(r2.statusColor, 'yellow');

  // 0 avisos, 1 advertência direta -> Atenção
  const r3 = calculateDisciplinaryStatus(0, 1);
  assert.equal(r3.status, 'ATENCAO');
  assert.equal(r3.totalWarnings, 1);
  assert.equal(r3.warningFromAvisos, 0);
  assert.equal(r3.statusColor, 'yellow');

  // 1 aviso, 1 advertência direta -> Atenção (1 total)
  const r4 = calculateDisciplinaryStatus(1, 1);
  assert.equal(r4.status, 'ATENCAO');
  assert.equal(r4.totalWarnings, 1);
  assert.equal(r4.warningFromAvisos, 0);

  // 2 avisos, 1 advertência direta -> Risco de expulsão (1 direta + 1 por avisos = 2 total)
  const r5 = calculateDisciplinaryStatus(2, 1);
  assert.equal(r5.status, 'ALERTA');
  assert.equal(r5.statusLabel, 'Risco de expulsão');
  assert.equal(r5.totalWarnings, 2);
  assert.equal(r5.warningFromAvisos, 1);
  assert.equal(r5.statusColor, 'orange');

  // 0 avisos, 2 advertências diretas -> Risco de expulsão
  const r6 = calculateDisciplinaryStatus(0, 2);
  assert.equal(r6.status, 'ALERTA');
  assert.equal(r6.statusLabel, 'Risco de expulsão');
  assert.equal(r6.totalWarnings, 2);
  assert.equal(r6.statusColor, 'orange');

  // 0 avisos, 3 advertências diretas -> Expulsa
  const r7 = calculateDisciplinaryStatus(0, 3);
  assert.equal(r7.status, 'EXPULSAO');
  assert.equal(r7.statusLabel, 'Expulsa');
  assert.equal(r7.totalWarnings, 3);
  assert.equal(r7.statusColor, 'red');

  // 6 avisos, 0 advertências diretas -> Expulsa (6/2 = 3)
  const r8 = calculateDisciplinaryStatus(6, 0);
  assert.equal(r8.status, 'EXPULSAO');
  assert.equal(r8.statusLabel, 'Expulsa');
  assert.equal(r8.totalWarnings, 3);
  assert.equal(r8.warningFromAvisos, 3);
  assert.equal(r8.statusColor, 'red');
});

test('Disciplinary permission checks: Coordenadores, Gestão e Admin podem gerenciar', () => {
  const admin: SafeUser = {
    id: 'u-admin',
    name: 'Admin',
    email: 'admin@ufrj.br',
    role: 'ADMIN',
    status: 'APPROVED',
  };

  const management: SafeUser = {
    id: 'u-gestao',
    name: 'Gestor',
    email: 'gestor@ufrj.br',
    role: 'MANAGEMENT',
    status: 'APPROVED',
  };

  const coordHarpia: SafeUser = {
    id: 'u-coord-harpia',
    name: 'Coordenador Harpia',
    email: 'coord@ufrj.br',
    role: 'COORDINATOR',
    status: 'APPROVED',
    teamId: 2,
    teamSlug: 'harpia',
  };

  const member: SafeUser = {
    id: 'u-membro',
    name: 'Membro',
    email: 'membro@ufrj.br',
    role: 'MEMBER',
    status: 'APPROVED',
    teamId: 2,
  };

  const trainee: SafeUser = {
    id: 'u-trainee',
    name: 'Trainee',
    email: 'trainee@ufrj.br',
    role: 'TRAINEE',
    status: 'APPROVED',
  };

  // Admin e Gestão têm permissão irrestrita
  assert.equal(canUserManageDisciplinary(admin), true);
  assert.equal(canUserManageDisciplinary(admin, 1), true);
  assert.equal(canUserManageDisciplinary(admin, 2), true);
  assert.equal(canUserManageDisciplinary(admin, null), true);

  assert.equal(canUserManageDisciplinary(management), true);
  assert.equal(canUserManageDisciplinary(management, 1), true);
  assert.equal(canUserManageDisciplinary(management, 2), true);

  // Coordenador pode dar advertência para membros da sua equipe, mas não de outras
  assert.equal(canUserManageDisciplinary(coordHarpia), true);
  assert.equal(canUserManageDisciplinary(coordHarpia, 2), true); // Mesma equipe (Harpia)
  assert.equal(canUserManageDisciplinary(coordHarpia, 1), false); // Outra equipe (Nautilus)
  assert.equal(canUserManageDisciplinary(coordHarpia, null), false); // Autônomos Geral

  // Membros comuns e trainees não têm permissão
  assert.equal(canUserManageDisciplinary(member), false);
  assert.equal(canUserManageDisciplinary(trainee), false);
});

test('Member disciplinary summary matches Google Spreadsheet records', { skip: process.env.TEST_IMPORTED_SPREADSHEETS !== '1' }, async () => {
  const kauan = await prisma.member.findFirst({ where: { name: { contains: 'Kauan Chaves' } } });
  const gabrielFelix = await prisma.member.findFirst({ where: { name: { contains: 'Gabriel Felix' } } });
  const arthur = await prisma.member.findFirst({ where: { name: { contains: 'Arthur Bacci' } } });

  assert.ok(kauan, 'Kauan deve existir no banco');
  assert.ok(gabrielFelix, 'Gabriel Felix deve existir no banco');
  assert.ok(arthur, 'Arthur Bacci deve existir no banco');

  const kauanSummary = await getMemberDisciplinarySummary(kauan.id);
  assert.ok(kauanSummary);
  assert.equal(kauanSummary.avisosCount, 1, 'Kauan tem 1 aviso');
  assert.equal(kauanSummary.directWarningsCount, 0, 'Kauan tem 0 advertências diretas');
  assert.equal(kauanSummary.totalWarnings, 0, 'Kauan tem 0 advertências consolidadas');
  assert.equal(kauanSummary.status, 'ATENCAO', 'Kauan está com status de Atenção por ter 1 aviso');

  const felixSummary = await getMemberDisciplinarySummary(gabrielFelix.id);
  assert.ok(felixSummary);
  assert.equal(felixSummary.avisosCount, 0);
  assert.equal(felixSummary.directWarningsCount, 1);
  assert.equal(felixSummary.totalWarnings, 1);
  assert.equal(felixSummary.status, 'ATENCAO');

  const arthurSummary = await getMemberDisciplinarySummary(arthur.id);
  assert.ok(arthurSummary);
  assert.equal(arthurSummary.avisosCount, 0);
  assert.equal(arthurSummary.directWarningsCount, 1);
  assert.equal(arthurSummary.totalWarnings, 1);
  assert.equal(arthurSummary.status, 'ATENCAO');
});

