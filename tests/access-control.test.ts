import { recordedActivity } from './helpers/activity-memory';
import { GET as activityLogs } from '../src/app/api/admin/activity/route';
import { POST as collectActivity } from '../src/app/api/activity/route';
import { managementSectionsForRole } from '../src/lib/management-navigation';
import { beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { NextRequest } from 'next/server';
import { prisma } from '../src/lib/prisma';
import { createSessionToken, hashPassword } from '../src/lib/auth';
import { getCurrentUser, SESSION_COOKIE_NAME } from '../src/lib/session';
import { updateAccount, AccountUpdateError } from '../src/lib/user-administration';
import { proxy } from '../src/proxy';
import { POST as register } from '../src/app/api/auth/register/route';
import { POST as login } from '../src/app/api/auth/login/route';
import { POST as logout } from '../src/app/api/auth/logout/route';
import { POST as forgotPassword } from '../src/app/api/auth/forgot-password/route';
import { POST as resetPassword } from '../src/app/api/auth/reset-password/route';
import { GET as me } from '../src/app/api/auth/me/route';
import { GET as accounts } from '../src/app/api/admin/users/route';
import { PATCH as patchAccount } from '../src/app/api/admin/users/[id]/route';
import { GET as course } from '../src/app/api/courses/ros2-jazzy/route';
import { GET as lesson } from '../src/app/api/lessons/[id]/route';
import { GET as stats } from '../src/app/api/gestao/stats/route';
import { getAuthenticatedUserId } from '../src/lib/progress';

process.env.JWT_SECRET = 'test-only-signing-key-32-characters-minimum';
process.env.NEXT_PUBLIC_APP_URL = 'https://app.example.invalid';
Object.assign(process.env, { NODE_ENV: 'test' });
process.env.SMTP_HOST = ''; // Local .env credentials must never send email from fixture tests.
delete process.env.INSTITUTIONAL_DATABASE_URL;
type Row = Record<string, any>;
function stub(object: any, key: string, implementation: (...args: any[]) => any) { object[key] = implementation; }
let users: Row[] = [];
let sessions: Row[] = [];
let challenges: Row[] = [];
let passwordHash = '';
function project(row: Row | undefined, select?: Row, include?: Row) {
  if (!row) return null;
  if (select) {
    return Object.fromEntries(Object.keys(select).filter(key => select[key] === true).map(key => [key, row[key]]));
  }
  const copy = { ...row };
  if (include?.credential && row.passwordHash) {
    copy.credential = { memberId: row.id, passwordHash: row.passwordHash };
  }
  return copy;
}
stub(prisma.member, 'findUnique', async ({ where, select, include }: any) => project(users.find(user => Object.entries(where).every(([key, value]) => user[key] === value)), select, include));
stub(prisma.member, 'findMany', async ({ select, where }: any) => users
  .filter(user => (!where?.status?.not || user.status !== where.status.not) && (!where?.email?.not || user.email !== null))
  .map(user => project(user, select)));
stub(prisma.member, 'count', async ({ where }: any) => users.filter(user => !where || Object.entries(where).every(([key, value]) => user[key] === value)).length);
stub(prisma.member, 'create', async ({ data, select }: any) => {
  const { credential, ...rest } = data;
  const row = {
    id: `user-${users.length}`,
    ...rest,
    ...(credential?.create?.passwordHash ? { passwordHash: credential.create.passwordHash } : {}),
  };
  users.push(row);
  return project(row, select);
});
stub(prisma.member, 'update', async ({ where, data, select }: any) => {
  const index = users.findIndex(user => user.id === where.id);
  users[index] = { ...users[index], ...data };
  return project(users[index], select);
});
stub(prisma.member, 'delete', async ({ where }: any) => {
  const user = users.find(row => row.id === where.id);
  users = users.filter(row => row.id !== where.id);
  sessions = sessions.filter(row => (row.memberId ?? row.userId) !== where.id);
  return user;
});
stub(prisma.memberCredential, 'upsert', async ({ where, create, update }: any) => {
  const index = users.findIndex(user => user.id === where.memberId);
  if (index >= 0) users[index].passwordHash = update.passwordHash ?? create.passwordHash;
  return { memberId: where.memberId, passwordHash: update.passwordHash ?? create.passwordHash };
});
stub(prisma.authChallenge, 'updateMany', async ({ where, data }: any) => {
  challenges = challenges.map(c => c.memberId === where.memberId && c.consumedAt === null ? { ...c, ...data } : c);
  return { count: 1 };
});
stub(prisma.authChallenge, 'create', async ({ data }: any) => {
  const row = { id: `ch-${challenges.length}`, attempts: 0, consumedAt: null, createdAt: new Date(), ...data };
  challenges.push(row);
  return row;
});
stub(prisma.authChallenge, 'findFirst', async ({ where }: any) => {
  return challenges.find(c => c.memberId === where.memberId && c.consumedAt === null && c.expiresAt > new Date()) || null;
});
stub(prisma.authChallenge, 'update', async ({ where, data }: any) => {
  const idx = challenges.findIndex(c => c.id === where.id);
  if (idx >= 0) challenges[idx] = { ...challenges[idx], ...data };
  return challenges[idx];
});
stub(prisma.session, 'create', async ({ data }: any) => { sessions.push(data); return data; });
stub(prisma.session, 'findUnique', async ({ where }: any) => {
  const session = sessions.find(row => row.sessionToken === where.sessionToken);
  const ownerId = session && (session.memberId ?? session.userId);
  const member = ownerId && users.find(row => row.id === ownerId);
  return session && member ? { ...session, memberId: ownerId, member: project(member, { id: true, email: true, name: true, role: true, status: true, avatar: true, institutionalMemberId: true, profileCompletedAt: true }) } : null;
});
stub(prisma.session, 'deleteMany', async ({ where }: any) => {
  sessions = sessions.filter(row => !Object.entries(where).every(([key, value]) => (key === 'memberId' ? (row.memberId ?? row.userId) : row[key]) === value));
  return { count: 1 };
});
stub(prisma.member, 'upsert', async ({ create }: any) => ({ id: 'member-100', status: 'APPROVED', ...create }));
stub(prisma.attendancePeriod, 'findFirst', async () => null);
stub(prisma.attendancePeriod, 'upsert', async ({ create }: any) => ({ id: 'period', ...create }));
stub(prisma.attendancePeriod, 'findMany', async () => []);
stub(prisma.attendanceVisit, 'updateMany', async () => ({ count: 0 }));
stub(prisma, '$transaction', async (arg: any) => Array.isArray(arg) ? Promise.all(arg) : arg(prisma));
stub(prisma, '$queryRaw', async () => [{ attempts: 1, expiresAt: new Date(Date.now() + 900_000) }]);
stub(prisma.authRateLimit, 'deleteMany', async () => ({ count: 1 }));

beforeEach(async () => {
  recordedActivity.length = 0;
  passwordHash ||= await hashPassword('valid-password');
  users = [
    { id: 'admin', email: 'admin@test.local', name: 'Admin', role: 'ADMIN', status: 'APPROVED', passwordHash },
    { id: 'student', email: 'student@test.local', name: 'Student', role: 'TRAINEE', status: 'APPROVED', passwordHash },
    { id: 'pending', email: 'pending@test.local', name: 'Pending', role: 'TRAINEE', status: 'PENDING', passwordHash },
  ];
  sessions = [];
  challenges = [];
});
function request(path: string, token?: string, body?: unknown, method?: string) {
  return new NextRequest(`http://localhost:3000${path}`, {
    method: method ?? (body ? 'POST' : 'GET'),
    headers: { ...(token ? { cookie: `${SESSION_COOKIE_NAME}=${token}` } : {}), 'Content-Type': 'application/json' },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
}
async function tokenFor(id: string, claims: Row = {}) {
  const user = users.find(user => user.id === id)!;
  const sid = `sid-${sessions.length}`;
  sessions.push({ sessionToken: sid, userId: id, expiresAt: new Date(Date.now() + 60_000) });
  return createSessionToken({ sub: id, name: user.name, email: user.email, role: user.role, sid, ...claims });
}

test('anonymous visitors cannot access pages or any protected API category', async () => {
  for (const path of ['/', '/ensino', '/curso/1', '/ensino/curso/1', '/gestao', '/new-route']) {
    const response = await proxy(request(path));
    assert.equal(response.status, 307, path);
    assert.equal(new URL(response.headers.get('location')!).pathname, '/login');
  }
  for (const path of ['/api/courses/ros2-jazzy', '/api/lessons/1', '/api/progress/ros2-jazzy', '/api/progress/lesson', '/api/progress/exercise', '/api/gestao/stats', '/api/admin/users']) {
    assert.equal((await proxy(request(path))).status, 401, path);
  }
});

test('login and registration remain publicly accessible', async () => {
  for (const path of ['/login', '/register', '/api/auth/login', '/api/auth/register']) assert.equal((await proxy(request(path))).status, 200);
});

test('invalid JWTs and legacy JWTs without a server session grant no access', async () => {
  assert.equal(await getCurrentUser(request('/', 'forged-token')), null);
  const token = await createSessionToken({ sub: 'admin', name: 'Admin', email: 'admin@test.local', role: 'ADMIN' });
  assert.equal(await getCurrentUser(request('/', token)), null);
});

test('registration always creates a pending trainee without issuing a session', async () => {
  const response = await register(request('/api/auth/register', undefined, { name: 'New Person', email: 'NEW@test.local', password: 'valid-password', role: 'ADMIN', status: 'APPROVED' }));
  assert.equal(response.status, 201);
  const data = await response.json();
  assert.equal(data.user.role, 'TRAINEE');
  assert.equal(data.user.status, 'PENDING');
  assert.equal(data.pendingApproval, true);
  assert.equal(data.user.passwordHash, undefined);
  assert.equal(response.headers.get('set-cookie'), null);
  assert.equal(sessions.length, 0);
});

test('malformed signup and login payloads return validation errors', async () => {
  for (const handler of [register, login]) {
    const response = await handler(new NextRequest('http://localhost:3000/api/auth', { method: 'POST', body: '{invalid' }));
    assert.equal(response.status, 400);
  }
  assert.equal((await register(request('/api/auth/register', undefined, { name: {}, email: 'x@test.local', password: 'valid-password' }))).status, 400);
  assert.equal((await login(request('/api/auth/login', undefined, { email: 'admin@test.local', password: {} }))).status, 400);
});

test('pending, rejected and suspended users cannot sign in', async () => {
  for (const status of ['PENDING', 'REJECTED', 'SUSPENDED']) {
    users[2].status = status;
    const response = await login(request('/api/auth/login', undefined, { email: 'pending@test.local', password: 'valid-password' }));
    assert.equal(response.status, 403);
    assert.equal(response.headers.get('set-cookie'), null);
  }
});

test('approved login persists a revocable session and logout revokes the token', async () => {
  const response = await login(request('/api/auth/login', undefined, { email: 'STUDENT@test.local', password: 'valid-password' }));
  assert.equal(response.status, 200);
  assert.equal(sessions.length, 1);
  const cookie = response.headers.get('set-cookie')!;
  assert.match(cookie, /HttpOnly/i);
  const token = cookie.split(';')[0].split('=')[1];
  assert.equal((await getCurrentUser(request('/', token)))?.id, 'student');
  assert.equal((await logout(request('/api/auth/logout', token, undefined, 'POST'))).status, 200);
  assert.equal(await getCurrentUser(request('/', token)), null);
});

test('trainees and members can access learning but cannot access management', async () => {
  for (const role of ['TRAINEE', 'MEMBER']) {
    users[1].role = role;
    const token = await tokenFor('student');
    assert.equal((await proxy(request('/ensino', token))).status, 200);
    assert.equal((await proxy(request('/gestao', token))).status, 200, 'proxy preflight does not grant management access');
    assert.equal((await accounts(request('/api/admin/users', token))).status, 403);
    assert.equal((await stats(request('/api/gestao/stats', token))).status, 403);
  }
});

test('role claims in a valid JWT never override the live database role', async () => {
  const token = await tokenFor('student', { role: 'ADMIN' });
  assert.equal((await getCurrentUser(request('/', token)))?.role, 'TRAINEE');
  assert.equal((await accounts(request('/api/admin/users', token))).status, 403);
});

test('route handlers independently reject anonymous requests without the proxy', async () => {
  assert.equal((await course(request('/api/courses/ros2-jazzy'))).status, 401);
  assert.equal((await lesson(request('/api/lessons/1'), { params: Promise.resolve({ id: '1' }) })).status, 401);
  assert.equal((await stats(request('/api/gestao/stats'))).status, 401);
  assert.equal(await getAuthenticatedUserId(request('/api/progress/lesson')), null);
  assert.equal((await patchAccount(request('/api/admin/users/student', undefined, { role: 'ADMIN' }, 'PATCH'), { params: Promise.resolve({ id: 'student' }) })).status, 401);
});

test('suspension, deletion and expiry invalidate existing sessions', async () => {
  const token = await tokenFor('student');
  sessions[0].expiresAt = new Date(0);
  assert.equal(await getCurrentUser(request('/', token)), null);
  sessions[0].expiresAt = new Date(Date.now() + 60_000);
  users[1].status = 'SUSPENDED';
  assert.equal(await getAuthenticatedUserId(request('/api/progress/lesson', token)), null);
  assert.equal((await (await me(request('/api/auth/me', token))).json()).authenticated, false);
  users.splice(1, 1);
  assert.equal(await getCurrentUser(request('/', token)), null);
});

test('administrators can list accounts without password hashes', async () => {
  const token = await tokenFor('admin');
  const response = await accounts(request('/api/admin/users', token));
  assert.equal(response.status, 200);
  for (const row of (await response.json()).users) assert.equal(row.passwordHash, undefined);
});

test('accounts rejected before the deletion flow are excluded from the list', async () => {
  users.push({ id: 'old-rejected', name: 'Rejected User', email: 'rejected@test.local', role: 'TRAINEE', status: 'REJECTED', passwordHash });
  const token = await tokenFor('admin');
  const response = await accounts(request('/api/admin/users', token));
  assert.equal(response.status, 200);
  const list = (await response.json()).users;
  assert.equal(list.some((row: Row) => row.id === 'old-rejected'), false);
  assert.equal(list.some((row: Row) => row.id === 'pending'), true);
});

test('trainees, pending users and suspended administrators cannot change accounts', async () => {
  for (const id of ['student', 'pending']) await assert.rejects(updateAccount(id, 'pending', { status: 'APPROVED' }), (error: any) => error instanceof AccountUpdateError && error.status === 403);
  users[0].status = 'SUSPENDED';
  await assert.rejects(updateAccount('admin', 'pending', { status: 'APPROVED' }));
});

test('administrator can approve, promote, demote, suspend and reapprove accounts', async () => {
  await updateAccount('admin', 'pending', { status: 'APPROVED', role: 'MEMBER' });
  assert.equal(users[2].status, 'APPROVED');
  const token = await tokenFor('pending');
  await updateAccount('admin', 'pending', { role: 'ADMIN' });
  assert.equal((await accounts(request('/api/admin/users', token))).status, 200);
  await updateAccount('admin', 'pending', { role: 'TRAINEE' });
  assert.equal((await accounts(request('/api/admin/users', token))).status, 403);
  await updateAccount('admin', 'pending', { status: 'SUSPENDED' });
  assert.equal(sessions.length, 0);
  assert.equal(await getCurrentUser(request('/', token)), null);
  await updateAccount('admin', 'pending', { status: 'APPROVED' });
  assert.equal(await getCurrentUser(request('/', token)), null, 'reactivation must not restore revoked sessions');
});

test('rejecting an account deletes it and removes it from the API list', async () => {
  const token = await tokenFor('admin');
  const response = await patchAccount(request('/api/admin/users/pending', token, { status: 'REJECTED' }, 'PATCH'), { params: Promise.resolve({ id: 'pending' }) });
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { success: true, deleted: true, userId: 'pending', user: null });
  assert.equal(users.some(row => row.id === 'pending'), false);
  const list = await (await accounts(request('/api/admin/users', token))).json();
  assert.equal(list.users.some((row: Row) => row.id === 'pending'), false);
  const signup = await register(request('/api/auth/register', undefined, { name: 'New Signup', email: 'pending@test.local', password: 'valid-password' }));
  assert.equal(signup.status, 201, 'the email is available for a new signup');
  assert.equal((await signup.json()).user.status, 'PENDING');
});

test('rejection deletes active sessions and prevents login with the deleted account', async () => {
  const token = await tokenFor('student');
  await updateAccount('admin', 'student', { status: 'REJECTED' });
  assert.equal(sessions.length, 0);
  assert.equal(await getCurrentUser(request('/', token)), null);
  const response = await login(request('/api/auth/login', undefined, { email: 'student@test.local', password: 'valid-password' }));
  assert.equal(response.status, 401);
});

test('trainees cannot reject and delete accounts', async () => {
  const token = await tokenFor('student');
  const response = await patchAccount(request('/api/admin/users/pending', token, { status: 'REJECTED' }, 'PATCH'), { params: Promise.resolve({ id: 'pending' }) });
  assert.equal(response.status, 403);
  assert.equal(users.some(row => row.id === 'pending'), true);
});

test('last approved administrator cannot be demoted, rejected, suspended or made pending', async () => {
  for (const change of [{ role: 'MEMBER' }, { status: 'SUSPENDED' }, { status: 'REJECTED' }, { status: 'PENDING' }]) {
    await assert.rejects(updateAccount('admin', 'admin', change), (error: any) => error.status === 409);
  }
  assert.equal(users[0].role, 'ADMIN');
  assert.equal(users[0].status, 'APPROVED');
});

test('self-demotion is allowed when another approved administrator exists', async () => {
  users[1].role = 'ADMIN';
  await updateAccount('admin', 'admin', { role: 'TRAINEE' });
  assert.equal(users[0].role, 'TRAINEE');
});

test('unknown fields, invalid roles and invalid statuses cannot be written', async () => {
  for (const change of [{ role: 'OWNER' }, { status: 'ACTIVE' }, { passwordHash: 'x' }, {}, null]) {
    await assert.rejects(updateAccount('admin', 'student', change), (error: any) => error.status === 400);
  }
});

test('cross-origin writes are blocked', async () => {
  const req = new NextRequest('http://localhost:3000/api/auth/register', { method: 'POST', headers: { origin: 'https://attacker.example', host: 'localhost:3000' } });
  assert.equal((await proxy(req)).status, 403);
});


test('proxy never loads session records; authoritative APIs fail closed during database outages', async () => {
  const token = await tokenFor('admin');
  const original = prisma.session.findUnique;
  let calls = 0;
  stub(prisma.session, 'findUnique', async () => { calls++; throw new Error('isolated database outage'); });
  try {
    assert.equal((await proxy(request('/', token))).status, 200);
    assert.equal((await proxy(request('/api/admin/users', token))).status, 200);
    assert.equal(calls, 0, 'routing must not query Prisma or depend on native database engines');
    await assert.rejects(getCurrentUser(request('/', token)), /isolated database outage/);
    assert.equal((await me(request('/api/auth/me', token))).status, 503);
    assert.equal((await accounts(request('/api/admin/users', token))).status, 500);
  } finally { stub(prisma.session, 'findUnique', original); }
});

test('signed preflight cookies never grant access after server session revocation', async () => {
  const token = await tokenFor('admin');
  sessions = [];
  assert.equal((await proxy(request('/gestao', token))).status, 200);
  assert.equal((await accounts(request('/api/admin/users', token))).status, 401);
  assert.equal((await stats(request('/api/gestao/stats', token))).status, 401);
  assert.equal((await course(request('/api/courses/ros2-jazzy', token))).status, 401);
  const legacy = await createSessionToken({ sub: 'admin', name: 'Admin', email: 'admin@test.local', role: 'ADMIN' });
  assert.equal((await proxy(request('/gestao', legacy))).status, 307);
  assert.equal((await proxy(request('/api/admin/users', 'invalid'))).status, 401);
});

test('Gestão can enter management, list accounts and approve or reject pending members', async () => {
  users.push({ id: 'manager', email: 'manager@test.local', name: 'Gestão', role: 'MANAGEMENT', status: 'APPROVED', passwordHash });
  const token = await tokenFor('manager');
  assert.equal((await accounts(request('/api/admin/users', token))).status, 200);
  const approved = await patchAccount(request('/api/admin/users/pending', token, { status: 'APPROVED' }, 'PATCH'), { params: Promise.resolve({ id: 'pending' }) });
  assert.equal(approved.status, 200);
  assert.equal(users[2].role, 'TRAINEE', 'approval cannot assign or change a role');
  users.push({ id: 'deny-pending', email: 'denied@test.local', name: 'Pending member', role: 'MEMBER', status: 'PENDING', passwordHash });
  const denied = await updateAccount('manager', 'deny-pending', { status: 'REJECTED' });
  assert.equal(denied.deleted, true);
  assert.equal(users.some(user => user.id === 'deny-pending'), false);
});

test('Gestão cannot change roles, suspend users, reactivate accounts or remove approved members', async () => {
  users.push({ id: 'manager', email: 'manager@test.local', name: 'Gestão', role: 'MANAGEMENT', status: 'APPROVED', passwordHash });
  const unchanged = JSON.stringify(users);
  for (const [id, changes] of [
    ['pending', { role: 'ADMIN', status: 'APPROVED' }],
    ['pending', { role: 'MEMBER' }],
    ['pending', { status: 'SUSPENDED' }],
    ['student', { status: 'REJECTED' }],
    ['student', { status: 'PENDING' }],
    ['student', { status: 'APPROVED' }],
    ['student', { status: 'SUSPENDED' }],
    ['manager', { role: 'ADMIN' }],
    ['admin', { role: 'MEMBER' }],
  ] as const) {
    await assert.rejects(updateAccount('manager', id, changes), (error: any) => error instanceof AccountUpdateError && error.status === 403);
  }
  assert.equal(JSON.stringify(users), unchanged);
  const token = await tokenFor('manager');
  assert.equal((await patchAccount(request('/api/admin/users/student', token, { role: 'MANAGEMENT' }, 'PATCH'), { params: Promise.resolve({ id: 'student' }) })).status, 403);
});

test('Gestão cannot approve privileged pending accounts or use stale management claims', async () => {
  users.push({ id: 'manager', email: 'manager@test.local', name: 'Gestão', role: 'MANAGEMENT', status: 'APPROVED', passwordHash });
  for (const role of ['MANAGEMENT','ADMIN']) {
    users[2].role = role;
    for (const status of ['APPROVED','REJECTED']) await assert.rejects(updateAccount('manager', 'pending', { status }), (error: any) => error.status === 403);
  }
  const token = await tokenFor('manager');
  users.find(user => user.id === 'manager')!.role = 'MEMBER';
  assert.equal((await accounts(request('/api/admin/users', token))).status, 403);
  await assert.rejects(updateAccount('manager', 'pending', { status: 'APPROVED' }), (error: any) => error.status === 403);
});

test('only Admin grants Gestão or Admin and the last Admin remains protected', async () => {
  users.push({ id: 'manager', email: 'manager@test.local', name: 'Gestão', role: 'MANAGEMENT', status: 'APPROVED', passwordHash });
  await updateAccount('admin', 'student', { role: 'MANAGEMENT' });
  assert.equal(users[1].role, 'MANAGEMENT');
  await assert.rejects(updateAccount('admin', 'admin', { role: 'MANAGEMENT' }), (error: any) => error.status === 409);
  await updateAccount('admin', 'student', { role: 'ADMIN' });
  await updateAccount('admin', 'admin', { role: 'MANAGEMENT' });
  assert.equal(users[0].role, 'MANAGEMENT');
});

test('existing directory member with email cannot register a duplicate account and can set password via forgot-password flow', async () => {
  users.push({ id: 'existing-member', email: 'integrante@poli.ufrj.br', name: 'Integrante Existente', role: 'MEMBER', status: 'APPROVED', institutionalMemberId: 50 });
  const duplicateSignup = await register(request('/api/auth/register', undefined, { name: 'Integrante Existente', email: 'INTEGRANTE@poli.ufrj.br', password: 'valid-password' }));
  assert.equal(duplicateSignup.status, 409, 'existing member email must reject registration with 409');

  const noPasswordLogin = await login(request('/api/auth/login', undefined, { email: 'integrante@poli.ufrj.br', password: 'valid-password' }));
  assert.equal(noPasswordLogin.status, 401);

  const forgot = await forgotPassword(request('/api/auth/forgot-password', undefined, { email: 'integrante@poli.ufrj.br' }));
  assert.equal(forgot.status, 200);
  assert.equal(challenges.length, 1);

  const wrongCode = await resetPassword(request('/api/auth/reset-password', undefined, { email: 'integrante@poli.ufrj.br', code: '000000', password: 'new-password' }));
  assert.equal(wrongCode.status, 400);
});

stub(prisma.activityLog, 'findMany', async () => []);
stub(prisma.activityLog, 'count', async () => 0);
stub(prisma.activityLog, 'aggregate', async () => ({ _min: { createdAt: null } }));
test('only a live approved Admin may read logs; management and forged role claims cannot', async () => {
  assert.equal((await activityLogs(request('/api/admin/activity'))).status, 401);
  for (const role of ['MEMBER', 'TRAINEE', 'MANAGEMENT']) {
    users[1].role = role;
    assert.equal((await activityLogs(request('/api/admin/activity', await tokenFor('student', { role: 'ADMIN' })))).status, 403);
    assert.ok(!managementSectionsForRole(role).some(item => item.href === '/gestao/logs'));
  }
  const token = await tokenFor('admin');
  assert.equal((await activityLogs(request('/api/admin/activity', token))).status, 200);
  assert.ok(managementSectionsForRole('ADMIN').some(item => item.href === '/gestao/logs'));
  users[0].role = 'MANAGEMENT';
  assert.equal((await activityLogs(request('/api/admin/activity', token))).status, 403);
  users[0].status = 'SUSPENDED';
  assert.equal((await activityLogs(request('/api/admin/activity', token))).status, 401);
});
test('activity ingestion binds the actor to the approved session and rejects identity spoofing', async () => {
  const body = { events: [{ id: '7adf4b99-1aa1-42c5-815b-745d5d1e86cc', action: 'PAGE_VIEW', path: '/perfil?cpf=SECRET' }] };
  assert.equal((await collectActivity(request('/api/activity', undefined, body))).status, 401);
  const token = await tokenFor('student');
  assert.equal((await collectActivity(request('/api/activity', token, body))).status, 204);
  assert.equal(recordedActivity.at(-1).actorId, 'student');
  assert.equal(recordedActivity.at(-1).actorRole, 'TRAINEE');
  assert.equal(recordedActivity.at(-1).path, '/perfil');
  assert.equal((await collectActivity(request('/api/activity', token, { events: [{ ...body.events[0], actorId: 'admin' }] }))).status, 400);
  assert.equal((await collectActivity(request('/api/activity', token, { events: Array(21).fill(body.events[0]) }))).status, 400);
});
test('successful login and logout keep verified actor snapshots without request passwords', async () => {
  const response = await login(request('/api/auth/login', undefined, { email: 'admin@test.local', password: 'valid-password' }));
  assert.equal(response.status, 200);
  assert.equal(recordedActivity.at(-1).actorId, 'admin');
  const cookie = response.headers.get('set-cookie')!.split(';')[0].split('=').slice(1).join('=');
  assert.equal((await logout(request('/api/auth/logout', cookie, undefined, 'POST'))).status, 200);
  assert.equal(recordedActivity.at(-1).actorId, 'admin');
  assert.ok(!JSON.stringify(recordedActivity).includes('valid-password'));
});
