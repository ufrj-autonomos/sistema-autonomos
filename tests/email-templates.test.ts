import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildAccessSetupEmail,
  buildCustomNoticeEmail,
  buildDisciplinaryEmail,
  buildDisciplinaryRiskEmail,
  buildIncompleteProfileEmail,
  buildLabHoursAlertEmail,
  buildMeetingLowAttendanceEmail,
  buildReimbursementEmail,
} from '../src/lib/email-templates';
import { computeMissingProfileFields } from '../src/lib/member-fields';

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
  assert.match(weekly.html, /passível de receber um/i);

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

test('buildIncompleteProfileEmail explains official member rule and lists missing fields', () => {
  const email = buildIncompleteProfileEmail({
    recipientName: 'Beatriz',
    area: 'Software',
    missingFields: ['Foto', 'CPF', 'DRE'],
  });
  assert.match(email.subject, /oficializar/i);
  assert.match(email.html, /membro oficial/i);
  assert.match(email.html, /Foto/);
  assert.match(email.html, /CPF/);
  assert.match(email.html, /DRE/);
  assert.match(email.text, /membro oficial/i);
});

test('buildMeetingLowAttendanceEmail, buildDisciplinaryRiskEmail, buildAccessSetupEmail and buildCustomNoticeEmail render properly', () => {
  const meeting = buildMeetingLowAttendanceEmail({
    recipientName: 'Carlos',
    area: 'Eletrônica',
    periodCode: '26.2',
    attendancePct: 55,
    presences: 5.5,
    absences: 4.5,
    totalMeetings: 10,
  });
  assert.match(meeting.subject, /55%/);
  assert.match(meeting.html, /55%/);
  assert.match(meeting.html, /5\.5/);

  const risk = buildDisciplinaryRiskEmail({
    recipientName: 'Carlos',
    area: 'Eletrônica',
    avisosCount: 1,
    directWarningsCount: 2,
    totalWarnings: 2,
    statusLabel: 'Risco de expulsão',
  });
  assert.match(risk.subject, /2\/3 advertências/);
  assert.match(risk.html, /2 \/ 3/);

  const access = buildAccessSetupEmail({
    recipientName: 'Marina',
    area: 'Gestão',
    email: 'marina@poli.ufrj.br',
  });
  assert.match(access.html, /forgot-password/);
  assert.match(access.html, /marina@poli\.ufrj\.br/);

  const custom = buildCustomNoticeEmail({
    recipientName: 'Marina',
    subject: 'Mutirão no laboratório',
    bodyText: 'Olá, Marina!\n\nAmanhã teremos mutirão às 14h.',
    ctaLabel: 'Confirmar Presença',
    ctaPath: '/presenca',
  });
  assert.equal(custom.subject, '[Autônomos] Mutirão no laboratório');
  assert.match(custom.html, /Mutirão no laboratório/);
  assert.match(custom.html, /Confirmar Presença/);
});

test('computeMissingProfileFields accurately detects pending fields and initial confirmation', () => {
  assert.deepEqual(
    computeMissingProfileFields({
      photo: null,
      bio: '',
      siteCourse: null,
      hasInternalAccount: true,
      course: 'Engenharia',
      phone: '',
      cpf: '',
      dre: '123456',
      birthDate: null,
      profileCompletedAt: null,
    }),
    ['Foto', 'Biografia', 'WhatsApp', 'CPF', 'Data de nascimento']
  );

  assert.deepEqual(
    computeMissingProfileFields({
      photo: 'https://img.example/a.jpg',
      bio: 'Bio ok',
      siteCourse: 'Engenharia',
      hasInternalAccount: true,
      course: 'Engenharia',
      phone: '21999999999',
      cpf: '11122233344',
      dre: '123456',
      birthDate: new Date('2002-01-01'),
      profileCompletedAt: null,
    }),
    ['Confirmação inicial do perfil']
  );

  assert.deepEqual(
    computeMissingProfileFields({
      photo: 'https://img.example/a.jpg',
      bio: 'Bio ok',
      siteCourse: 'Engenharia',
      hasInternalAccount: true,
      course: 'Engenharia',
      phone: '21999999999',
      cpf: '11122233344',
      dre: '123456',
      birthDate: new Date('2002-01-01'),
      profileCompletedAt: new Date(),
    }),
    []
  );
});
