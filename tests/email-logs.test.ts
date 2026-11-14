import './helpers/activity-memory';
import assert from 'node:assert/strict';
import { beforeEach, test } from 'node:test';
import { NextRequest } from 'next/server';
import { prisma } from '../src/lib/prisma';
import { createSessionToken } from '../src/lib/auth';
import { SESSION_COOKIE_NAME } from '../src/lib/session';
import { EMAIL_CATEGORY_LABELS, getEmailLogsDashboard } from '../src/lib/email-logs';
import { GET as getEmailLogsRoute } from '../src/app/api/gestao/emails/route';
import { POST as sendEmailsRoute } from '../src/app/api/gestao/emails/send/route';
import { POST as aiDraftRoute } from '../src/app/api/gestao/emails/ai-draft/route';
import { GET as getEmailCenterRoute } from '../src/app/api/gestao/emails/center/route';
import { MANAGEMENT_SECTIONS } from '../src/lib/management-navigation';

process.env.JWT_SECRET = 'test-only-signing-key-32-characters-minimum';
process.env.NEXT_PUBLIC_APP_URL = 'https://app.example.invalid';
Object.assign(process.env, { NODE_ENV: 'test' });
process.env.DATABASE_URL = 'postgresql://test:password@db.example.invalid:5432/postgres';

type Row = Record<string, any>;
function stub(object: any, key: string, implementation: (...args: any[]) => any) {
  object[key] = implementation;
}

let members: Row[] = [];
let sessions: Row[] = [];
let emailRows: Row[] = [];
let capturedFindManyArgs: any = null;

beforeEach(() => {
  members = [
    {
      id: 'm-admin',
      name: 'Admin Gestão',
      email: 'gestao@autonomos.ufrj.br',
      role: 'MANAGEMENT',
      status: 'APPROVED',
      area: 'Gestão',
      avatar: null,
      institutionalMemberId: null,
      profileCompletedAt: null,
    },
    {
      id: 'm-member',
      name: 'Membro Técnico',
      email: 'tecnico@autonomos.ufrj.br',
      role: 'MEMBER',
      status: 'APPROVED',
      area: 'Software',
      avatar: null,
      institutionalMemberId: null,
      profileCompletedAt: null,
    },
  ];
  sessions = [];
  capturedFindManyArgs = null;
  emailRows = [
    {
      id: 'log-1',
      category: 'DISCIPLINARY',
      recipientName: 'Membro Técnico',
      recipientEmail: 'tecnico@autonomos.ufrj.br',
      memberId: 'm-member',
      member: { id: 'm-member', name: 'Membro Técnico', area: 'Software' },
      subject: '[UFRJ Autônomos] Notificação Disciplinar — Aviso',
      previewText: 'Você recebeu 1 aviso disciplinar.',
      status: 'SENT',
      errorMessage: null,
      metadata: { statusLabel: 'Estável' },
      createdAt: new Date('2026-11-14T18:00:00.000Z'),
    },
    {
      id: 'log-2',
      category: 'AUTH_CODE',
      recipientName: 'Admin Gestão',
      recipientEmail: 'gestao@autonomos.ufrj.br',
      memberId: 'm-admin',
      member: { id: 'm-admin', name: 'Admin Gestão', area: 'Gestão' },
      subject: '[UFRJ Autônomos] Código de verificação de senha',
      previewText: 'Código de verificação enviado para gestao@autonomos.ufrj.br (código omitido no log por segurança).',
      status: 'FAILED',
      errorMessage: 'SMTP connection refused',
      metadata: { reason: 'password-reset' },
      createdAt: new Date('2026-11-14T17:00:00.000Z'),
    },
  ];

  stub(prisma.session, 'findUnique', async ({ where }: any) => {
    const s = sessions.find((row) => row.sessionToken === where.sessionToken);
    if (!s) return null;
    const member = members.find((m) => m.id === s.userId);
    return member ? { ...s, memberId: s.userId, member } : null;
  });
  stub(prisma.emailDispatchLog, 'findMany', async (args: any) => {
    capturedFindManyArgs = args;
    return emailRows;
  });
  stub(prisma.emailDispatchLog, 'count', async ({ where }: any) => {
    if (where?.createdAt) return 1;
    return emailRows.length;
  });
  stub(prisma.emailDispatchLog, 'groupBy', async () => [
    { status: 'SENT', _count: { _all: 1 } },
    { status: 'FAILED', _count: { _all: 1 } },
  ]);
});

async function tokenFor(memberId: string) {
  const member = members.find((m) => m.id === memberId)!;
  const sid = `sid-${sessions.length + 1}`;
  sessions.push({ sessionToken: sid, userId: memberId, expiresAt: new Date(Date.now() + 60_000) });
  return createSessionToken({ sub: memberId, name: member.name, email: member.email, role: member.role, sid });
}

test('EMAIL_CATEGORY_LABELS covers every email category', () => {
  for (const key of [
    'DISCIPLINARY',
    'DISCIPLINARY_RISK',
    'LAB_HOURS_ALERT',
    'INCOMPLETE_PROFILE',
    'MEETING_LOW_ATTENDANCE',
    'ACCESS_SETUP',
    'REIMBURSEMENT',
    'ACCOUNT_APPROVED',
    'AUTH_CODE',
    'EMAIL_CHANGE',
    'ANNOUNCEMENT',
    'OTHER',
  ] as const) {
    assert.ok(EMAIL_CATEGORY_LABELS[key]);
  }
});

test('getEmailLogsDashboard clamps pagination, passes filters, and summarizes stats', async () => {
  const data = await getEmailLogsDashboard({
    category: 'DISCIPLINARY',
    status: 'SENT',
    q: 'tecnico',
    limit: 999,
    offset: -5,
  });

  assert.equal(capturedFindManyArgs.take, 200);
  assert.equal(capturedFindManyArgs.skip, 0);
  assert.equal(capturedFindManyArgs.where.category, 'DISCIPLINARY');
  assert.equal(capturedFindManyArgs.where.status, 'SENT');
  assert.equal(Array.isArray(capturedFindManyArgs.where.OR), true);
  assert.equal(data.totalCount, 2);
  assert.deepEqual(data.stats, { total: 2, sent: 1, failed: 1, skipped: 0, last24h: 1 });
  assert.equal(data.logs[0]?.categoryLabel, 'Disciplinar');
  assert.equal(data.logs[0]?.recipientArea, 'Software');
  assert.equal(data.logs[1]?.status, 'FAILED');
});

test('GET /api/gestao/emails requires live management privileges', async () => {
  const anonRes = await getEmailLogsRoute(new NextRequest('http://localhost:3000/api/gestao/emails'));
  assert.equal(anonRes.status, 401);

  const memberToken = await tokenFor('m-member');
  const memberRes = await getEmailLogsRoute(
    new NextRequest('http://localhost:3000/api/gestao/emails', {
      headers: { cookie: `${SESSION_COOKIE_NAME}=${memberToken}` },
    })
  );
  assert.equal(memberRes.status, 403);

  const mgmtToken = await tokenFor('m-admin');
  const okRes = await getEmailLogsRoute(
    new NextRequest('http://localhost:3000/api/gestao/emails?category=DISCIPLINARY&limit=20', {
      headers: { cookie: `${SESSION_COOKIE_NAME}=${mgmtToken}` },
    })
  );
  assert.equal(okRes.status, 200);
  const body = await okRes.json();
  assert.equal(body.logs.length, 2);
  assert.equal(body.stats.sent, 1);
  assert.equal(body.logs[0].canResend, true);
  assert.equal(body.logs[1].canResend, false);
});

test('Email Center routes require management privileges, prevent AUTH_CODE resend, and preview/generate AI drafts', async () => {
  assert.ok(MANAGEMENT_SECTIONS.some((s) => s.href === '/gestao/emails'));

  const memberToken = await tokenFor('m-member');
  const mgmtToken = await tokenFor('m-admin');

  // Unauthorized / forbidden checks
  assert.equal(
    (await getEmailCenterRoute(new NextRequest('http://localhost:3000/api/gestao/emails/center'))).status,
    401
  );
  assert.equal(
    (await sendEmailsRoute(
      new NextRequest('http://localhost:3000/api/gestao/emails/send', {
        method: 'POST',
        headers: { cookie: `${SESSION_COOKIE_NAME}=${memberToken}`, 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'resend_log', logId: 'log-1' }),
      })
    )).status,
    403
  );
  assert.equal(
    (await aiDraftRoute(
      new NextRequest('http://localhost:3000/api/gestao/emails/ai-draft', {
        method: 'POST',
        headers: { cookie: `${SESSION_COOKIE_NAME}=${memberToken}`, 'content-type': 'application/json' },
        body: JSON.stringify({ mode: 'generate', prompt: 'Teste' }),
      })
    )).status,
    403
  );

  // Resend AUTH_CODE blocked for security; DISICIPLINARY succeeds (with SMTP_HOST='' -> skipped in test)
  const prevSmtp = process.env.SMTP_HOST;
  process.env.SMTP_HOST = '';
  stub(prisma.emailDispatchLog, 'findUnique', async ({ where }: any) => {
    const found = emailRows.find((r) => r.id === where.id);
    return found ? { ...found, htmlBody: null } : null;
  });

  try {
    const otpResend = await sendEmailsRoute(
      new NextRequest('http://localhost:3000/api/gestao/emails/send', {
        method: 'POST',
        headers: { cookie: `${SESSION_COOKIE_NAME}=${mgmtToken}`, 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'resend_log', logId: 'log-2' }),
      })
    );
    assert.equal(otpResend.status, 400);

    const validResend = await sendEmailsRoute(
      new NextRequest('http://localhost:3000/api/gestao/emails/send', {
        method: 'POST',
        headers: { cookie: `${SESSION_COOKIE_NAME}=${mgmtToken}`, 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'resend_log', logId: 'log-1' }),
      })
    );
    assert.equal(validResend.status, 200);
    const validBody = await validResend.json();
    assert.equal(validBody.ok, true);
    assert.equal(validBody.result.targetEmail, 'tecnico@autonomos.ufrj.br');

    // AI draft preview mode renders live HTML shell
    const previewRes = await aiDraftRoute(
      new NextRequest('http://localhost:3000/api/gestao/emails/ai-draft', {
        method: 'POST',
        headers: { cookie: `${SESSION_COOKIE_NAME}=${mgmtToken}`, 'content-type': 'application/json' },
        body: JSON.stringify({
          mode: 'preview',
          subject: 'Aviso de Cadastro',
          bodyText: 'Olá, {{NOME}}! Preencha seu perfil em {{AREA}}.',
        }),
      })
    );
    assert.equal(previewRes.status, 200);
    const previewJson = await previewRes.json();
    assert.match(previewJson.previewHtml, /Integrante Exemplo/);
    assert.match(previewJson.previewHtml, /Software/);
  } finally {
    if (prevSmtp === undefined) delete process.env.SMTP_HOST;
    else process.env.SMTP_HOST = prevSmtp;
  }
});
