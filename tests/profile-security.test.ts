import './helpers/activity-memory';
import assert from 'node:assert/strict';
import { beforeEach, test } from 'node:test';
import { NextRequest } from 'next/server';
import { prisma } from '../src/lib/prisma';
import { createSessionToken, hashPassword, hashVerificationCode, verifyPassword } from '../src/lib/auth';
import { SESSION_COOKIE_NAME } from '../src/lib/session';
import { buildEmailChangeStatusEmail, buildSecurityCodeEmail } from '../src/lib/email-templates';
import { POST as sendPwCode } from '../src/app/api/profile/security/password/send-code/route';
import { POST as confirmPwChange } from '../src/app/api/profile/security/password/confirm/route';
import { POST as sendEmailCode } from '../src/app/api/profile/security/email/send-code/route';
import { POST as requestEmailChange } from '../src/app/api/profile/security/email/request/route';
import { POST as reviewEmailChange } from '../src/app/api/admin/email-changes/route';

process.env.JWT_SECRET = 'test-only-signing-key-32-characters-minimum';
process.env.NEXT_PUBLIC_APP_URL = 'https://app.example.invalid';
Object.assign(process.env, { NODE_ENV: 'test' });
process.env.SMTP_HOST = '';
process.env.DATABASE_URL = 'postgresql://test:password@db.example.invalid:5432/postgres';

type Row = Record<string, any>;
function stub(object: any, key: string, implementation: (...args: any[]) => any) {
  object[key] = implementation;
}

let members: Row[] = [];
let credentials: Row[] = [];
let sessions: Row[] = [];
let challenges: Row[] = [];
let emailChangeRequests: Row[] = [];

beforeEach(async () => {
  const initialHash = await hashPassword('old-password-123');
  members = [
    {
      id: 'm-user',
      name: 'Vitória Sabline',
      email: 'vitoria@ufrj.br',
      role: 'MEMBER',
      status: 'APPROVED',
      area: 'Gestão',
      avatar: null,
      institutionalMemberId: 12,
      profileCompletedAt: null,
    },
    {
      id: 'm-mgmt',
      name: 'Gestão Líder',
      email: 'gestao@autonomos.ufrj.br',
      role: 'MANAGEMENT',
      status: 'APPROVED',
      area: 'Gestão',
      avatar: null,
      institutionalMemberId: 13,
      profileCompletedAt: null,
    },
    {
      id: 'm-other',
      name: 'Outro Integrante',
      email: 'ocupado@ufrj.br',
      role: 'MEMBER',
      status: 'APPROVED',
      area: 'Software',
      avatar: null,
      institutionalMemberId: 14,
      profileCompletedAt: null,
    },
  ];
  credentials = [{ memberId: 'm-user', passwordHash: initialHash, passwordChangedAt: new Date() }];
  sessions = [];
  challenges = [];
  emailChangeRequests = [];

  stub(prisma, '$transaction', async (arg: any) => (Array.isArray(arg) ? Promise.all(arg) : arg(prisma)));
  stub(prisma, '$queryRaw', async () => [{ attempts: 1, expiresAt: new Date(Date.now() + 900_000) }]);
  stub(prisma.authRateLimit, 'deleteMany', async () => ({ count: 1 }));

  stub(prisma.session, 'findUnique', async ({ where }: any) => {
    const s = sessions.find((row) => row.sessionToken === where.sessionToken);
    if (!s) return null;
    const member = members.find((m) => m.id === s.userId);
    return member ? { ...s, memberId: s.userId, member } : null;
  });

  stub(prisma.member, 'findUnique', async ({ where }: any) => {
    return members.find((m) => m.id === where.id || m.email === where.email) || null;
  });

  stub(prisma.member, 'findFirst', async ({ where }: any) => {
    return (
      members.find((m) => {
        if (where.email && m.email !== where.email) return false;
        if (where.id?.not && m.id === where.id.not) return false;
        return true;
      }) || null
    );
  });

  stub(prisma.member, 'update', async ({ where, data }: any) => {
    const idx = members.findIndex((m) => m.id === where.id);
    if (idx >= 0) members[idx] = { ...members[idx], ...data };
    return members[idx];
  });

  stub(prisma.memberCredential, 'upsert', async ({ where, update, create }: any) => {
    const idx = credentials.findIndex((c) => c.memberId === where.memberId);
    if (idx >= 0) {
      credentials[idx] = { ...credentials[idx], ...update };
      return credentials[idx];
    }
    const created = { ...create };
    credentials.push(created);
    return created;
  });

  stub(prisma.authChallenge, 'updateMany', async ({ where, data }: any) => {
    challenges = challenges.map((c) =>
      c.email === where.email && c.purpose === where.purpose && c.consumedAt === null ? { ...c, ...data } : c
    );
    return { count: 1 };
  });

  stub(prisma.authChallenge, 'create', async ({ data }: any) => {
    const row = { id: `ch-${challenges.length + 1}`, attempts: 0, consumedAt: null, createdAt: new Date(), ...data };
    challenges.push(row);
    return row;
  });

  stub(prisma.authChallenge, 'findFirst', async ({ where }: any) => {
    return (
      [...challenges]
        .reverse()
        .find(
          (c) =>
            c.email === where.email &&
            c.purpose === where.purpose &&
            (where.memberId === undefined || c.memberId === where.memberId) &&
            c.consumedAt === null &&
            c.expiresAt > new Date()
        ) || null
    );
  });

  stub(prisma.authChallenge, 'update', async ({ where, data }: any) => {
    const idx = challenges.findIndex((c) => c.id === where.id);
    if (idx >= 0) challenges[idx] = { ...challenges[idx], ...data };
    return challenges[idx];
  });

  stub(prisma.emailChangeRequest, 'findFirst', async ({ where }: any) => {
    return (
      emailChangeRequests.find(
        (r) =>
          (!where.newEmail || r.newEmail === where.newEmail) &&
          (!where.status || r.status === where.status) &&
          (!where.memberId?.not || r.memberId !== where.memberId.not)
      ) || null
    );
  });

  stub(prisma.emailChangeRequest, 'updateMany', async ({ where, data }: any) => {
    emailChangeRequests = emailChangeRequests.map((r) =>
      r.memberId === where.memberId && r.status === where.status ? { ...r, ...data } : r
    );
    return { count: 1 };
  });

  stub(prisma.emailChangeRequest, 'create', async ({ data }: any) => {
    const row = { id: `ecr-${emailChangeRequests.length + 1}`, createdAt: new Date(), updatedAt: new Date(), ...data };
    emailChangeRequests.push(row);
    return row;
  });

  stub(prisma.emailChangeRequest, 'findUnique', async ({ where, include }: any) => {
    const found = emailChangeRequests.find((r) => r.id === where.id);
    if (!found) return null;
    if (include?.member) {
      return { ...found, member: members.find((m) => m.id === found.memberId) };
    }
    return found;
  });

  stub(prisma.emailChangeRequest, 'update', async ({ where, data }: any) => {
    const idx = emailChangeRequests.findIndex((r) => r.id === where.id);
    if (idx >= 0) emailChangeRequests[idx] = { ...emailChangeRequests[idx], ...data };
    return emailChangeRequests[idx];
  });
});

async function tokenFor(memberId: string) {
  const member = members.find((m) => m.id === memberId)!;
  const sid = `sid-${sessions.length + 1}`;
  sessions.push({ sessionToken: sid, userId: memberId, expiresAt: new Date(Date.now() + 60_000) });
  return createSessionToken({ sub: memberId, name: member.name, email: member.email, role: member.role, sid });
}

test('buildSecurityCodeEmail & buildEmailChangeStatusEmail render expected copy', () => {
  const regEmail = buildSecurityCodeEmail({
    purpose: 'REGISTER_VERIFY',
    recipientName: 'Carlos',
    code: '482910',
  });
  assert.match(regEmail.subject, /Confirme seu e-mail/);
  assert.match(regEmail.html, /482910/);

  const approved = buildEmailChangeStatusEmail({
    recipientName: 'Vitória',
    previousEmail: 'antigo@ufrj.br',
    newEmail: 'novo@poli.ufrj.br',
    approved: true,
  });
  assert.match(approved.subject, /aprovado/);
  assert.match(approved.html, /novo@poli\.ufrj\.br/);
});

test('profile password change requires OTP code verification', async () => {
  const token = await tokenFor('m-user');
  const sendRes = await sendPwCode(
    new NextRequest('http://localhost:3000/api/profile/security/password/send-code', {
      method: 'POST',
      headers: { cookie: `${SESSION_COOKIE_NAME}=${token}` },
    })
  );
  assert.equal(sendRes.status, 200);
  assert.equal(challenges.length, 1);

  const validCode = '778899';
  challenges[0].codeHash = hashVerificationCode('m-user', validCode);

  const wrongRes = await confirmPwChange(
    new NextRequest('http://localhost:3000/api/profile/security/password/confirm', {
      method: 'POST',
      headers: { cookie: `${SESSION_COOKIE_NAME}=${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: '000000', newPassword: 'new-password-456' }),
    })
  );
  assert.equal(wrongRes.status, 400);

  const okRes = await confirmPwChange(
    new NextRequest('http://localhost:3000/api/profile/security/password/confirm', {
      method: 'POST',
      headers: { cookie: `${SESSION_COOKIE_NAME}=${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: validCode, newPassword: 'new-password-456' }),
    })
  );
  assert.equal(okRes.status, 200);
  assert.equal(await verifyPassword('new-password-456', credentials[0].passwordHash), true);
});

test('profile email change requires OTP verification on new email and Management approval on Integrantes', async () => {
  const userToken = await tokenFor('m-user');

  const conflictRes = await sendEmailCode(
    new NextRequest('http://localhost:3000/api/profile/security/email/send-code', {
      method: 'POST',
      headers: { cookie: `${SESSION_COOKIE_NAME}=${userToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ newEmail: 'ocupado@ufrj.br' }),
    })
  );
  assert.equal(conflictRes.status, 409);

  const sendRes = await sendEmailCode(
    new NextRequest('http://localhost:3000/api/profile/security/email/send-code', {
      method: 'POST',
      headers: { cookie: `${SESSION_COOKIE_NAME}=${userToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ newEmail: 'vitoria.novo@poli.ufrj.br' }),
    })
  );
  assert.equal(sendRes.status, 200);

  const otpCode = '314159';
  challenges[challenges.length - 1].codeHash = hashVerificationCode('m-user:vitoria.novo@poli.ufrj.br', otpCode);

  const reqRes = await requestEmailChange(
    new NextRequest('http://localhost:3000/api/profile/security/email/request', {
      method: 'POST',
      headers: { cookie: `${SESSION_COOKIE_NAME}=${userToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ newEmail: 'vitoria.novo@poli.ufrj.br', code: otpCode }),
    })
  );
  assert.equal(reqRes.status, 200);
  assert.equal(emailChangeRequests.length, 1);
  assert.equal(emailChangeRequests[0].status, 'PENDING');
  assert.equal(members[0].email, 'vitoria@ufrj.br', 'email does not change before Management approval');

  // Non-management member cannot approve
  const forbiddenRes = await reviewEmailChange(
    new NextRequest('http://localhost:3000/api/admin/email-changes', {
      method: 'POST',
      headers: { cookie: `${SESSION_COOKIE_NAME}=${userToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ requestId: emailChangeRequests[0].id, action: 'APPROVE' }),
    })
  );
  assert.equal(forbiddenRes.status, 403);

  // Management approves
  const mgmtToken = await tokenFor('m-mgmt');
  const approveRes = await reviewEmailChange(
    new NextRequest('http://localhost:3000/api/admin/email-changes', {
      method: 'POST',
      headers: { cookie: `${SESSION_COOKIE_NAME}=${mgmtToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ requestId: emailChangeRequests[0].id, action: 'APPROVE' }),
    })
  );
  assert.equal(approveRes.status, 200);
  assert.equal(emailChangeRequests[0].status, 'APPROVED');
  assert.equal(members[0].email, 'vitoria.novo@poli.ufrj.br');
});
