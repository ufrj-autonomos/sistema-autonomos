import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildDisciplinaryEmail,
  buildLabHoursAlertEmail,
  buildReimbursementEmail,
} from '../src/lib/email-templates';

test('buildDisciplinaryEmail explains 2 avisos = 1 advertência, 2 = risco, 3 = expulsão + score', () => {
  const email = buildDisciplinaryEmail({
    recipientName: 'Lucas <Silva>',
    occurrenceType: 'ADVERTENCIA_DIRETA',
    occurrenceReason: 'Ausência recorrente sem justificativa',
    occurrenceNotes: 'Conversa com coordenação',
    avisosCount: 1,
    directWarningsCount: 2,
    warningFromAvisos: 0,
    totalWarnings: 2,
    status: 'ALERTA',
    statusLabel: 'Risco de expulsão',
    wasAutoExpelled: false,
  });

  assert.match(email.subject, /Risco de expulsão/);
  assert.match(email.html, /Lucas &lt;Silva&gt;/);
  assert.match(email.html, /2 \/ 3/);
  assert.match(email.html, /2 avisos/i);
  assert.match(email.html, /risco de expulsão/i);
  assert.match(email.html, /3ª advertência/i);
  assert.match(email.text, /Total de advertências: 2 \/ 3/);
});

test('buildDisciplinaryEmail handles automatic expulsion on 3rd warning', () => {
  const email = buildDisciplinaryEmail({
    recipientName: 'Marina',
    occurrenceType: 'AVISO',
    occurrenceReason: 'Descumprimento automático de horas',
    avisosCount: 2,
    directWarningsCount: 2,
    warningFromAvisos: 1,
    totalWarnings: 3,
    status: 'EXPULSAO',
    statusLabel: 'Expulsa',
    wasAutoExpelled: true,
  });

  assert.match(email.subject, /Desligamento/);
  assert.match(email.html, /Desligamento Disciplinar Registrado/);
  assert.match(email.html, /3 \/ 3/);
});

test('buildLabHoursAlertEmail builds alerting email for both weekly and monthly quotas', () => {
  const weekly = buildLabHoursAlertEmail({
    recipientName: 'Rafael',
    area: 'Mecânica',
    mode: 'WEEKLY',
    periodLabel: 'Semana 09/11/2026 a 15/11/2026',
    completedFormatted: '0h 30m',
    requiredFormatted: '2h 00m',
    remainingFormatted: '1h 30m',
    deadlineText: 'até domingo às 23h59 (horário de Brasília)',
  });
  assert.match(weekly.subject, /Alerta de Horas Pendentes/);
  assert.match(weekly.html, /1h 30m/);
  assert.match(weekly.html, /duas vezes seguidas/i);

  const monthly = buildLabHoursAlertEmail({
    recipientName: 'Beatriz',
    area: 'Gestão',
    mode: 'MONTHLY',
    periodLabel: 'Novembro de 2026',
    completedFormatted: '1h 00m',
    requiredFormatted: '4h 00m',
    remainingFormatted: '3h 00m',
    deadlineText: 'até o último dia do mês às 23h59 (horário de Brasília)',
  });
  assert.match(monthly.html, /Meta Mensal/);
  assert.match(monthly.html, /3h 00m/);
});

test('buildReimbursementEmail formats creation and payment status updates', () => {
  const created = buildReimbursementEmail({
    recipientName: 'João',
    event: 'CREATED',
    code: 'RMB-042',
    title: 'Compra conectores XT60',
    amountFormatted: 'R$ 85,50',
    status: 'AGUARDANDO_REEMBOLSO',
    statusLabel: 'Aguardando Reembolso',
    pixKey: 'joao@ufrj.br',
    pixKeyType: 'E-mail',
  });
  assert.match(created.subject, /RMB-042/);
  assert.match(created.html, /R\$ 85,50/);
  assert.match(created.html, /E-mail: joao@ufrj\.br/);

  const paid = buildReimbursementEmail({
    recipientName: 'João',
    event: 'STATUS_UPDATED',
    code: 'RMB-042',
    title: 'Compra conectores XT60',
    amountFormatted: 'R$ 85,50',
    status: 'PAGO',
    statusLabel: 'Pago / Efetivado',
    reviewNotes: 'Transferência realizada via conta livre',
  });
  assert.match(paid.subject, /PAGO/);
  assert.match(paid.html, /Transferência realizada via conta livre/);
});
