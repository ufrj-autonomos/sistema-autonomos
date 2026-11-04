import assert from 'node:assert/strict';
import { beforeEach, test } from 'node:test';
import { NextRequest } from 'next/server';
import { prisma } from '../src/lib/prisma';
import { checkRateLimit, clientAddress, resetRateLimit } from '../src/lib/rate-limit';
import { getAppOrigin } from '../src/lib/environment';
import { readAuthPayload } from '../src/lib/auth-request';
import { proxy } from '../src/proxy';
import { GET as health } from '../src/app/api/health/route';
import { GET as maintenance } from '../src/app/api/cron/maintenance/route';
import { POST as login } from '../src/app/api/auth/login/route';
import { POST as register } from '../src/app/api/auth/register/route';
import { hashPassword } from '../src/lib/auth';
import { checkProductionEnvironment } from '../scripts/check-production-env.mjs';
import nextConfig from '../next.config';

// Do not inherit the live site's integration from a local .env during fixture tests.
delete process.env.INSTITUTIONAL_DATABASE_URL;

type Bucket = { attempts: number; expiresAt: Date };
const buckets = new Map<string, Bucket>();
let storageAvailable = true;
let knownUser: Record<string, unknown> | null = null;
function stub(object: any, name: string, fn: (...args: any[]) => any) { object[name] = fn; }
stub(prisma, '$queryRaw', async (_sql: unknown, key: string, seconds: number, maximum: number) => {
  if (!storageAvailable) throw new Error('Storage unavailable');
  const previous = buckets.get(key);
  const bucket = previous && previous.expiresAt.getTime() > Date.now()
    ? { ...previous, attempts: Math.min(previous.attempts + 1, maximum) }
    : { attempts: 1, expiresAt: new Date(Date.now() + seconds * 1000) };
  buckets.set(key, bucket);
  return [bucket];
});
stub(prisma.authRateLimit, 'deleteMany', async ({ where }: any) => {
  let count = 0;
  for (const [key, value] of buckets) {
    if ((where.key && key === where.key) || (where.expiresAt && value.expiresAt <= where.expiresAt.lte)) { buckets.delete(key); count++; }
  }
  return { count };
});
stub(prisma.authRateLimit, 'count', async () => { if (!storageAvailable) throw new Error('Unavailable'); return buckets.size; });
stub(prisma.member, 'findUnique', async () => knownUser ? { ...knownUser, credential: knownUser.passwordHash ? { passwordHash: knownUser.passwordHash } : null } : null);
stub(prisma.session, 'create', async ({ data }: any) => data);
stub(prisma.session, 'deleteMany', async () => ({ count: 0 }));
stub(prisma.authChallenge, 'deleteMany', async () => ({ count: 0 }));
stub(prisma, '$transaction', async (operations: any) => Promise.all(operations));

beforeEach(() => {
  buckets.clear(); storageAvailable = true; knownUser = null;
  Object.assign(process.env, { NODE_ENV: 'production', JWT_SECRET: 'test-production-signing-key-at-least-32-characters', CRON_SECRET: 'test-production-maintenance-key-at-least-32-characters', NEXT_PUBLIC_APP_URL: 'https://app.example.invalid', TRUST_PROXY_HEADERS: 'false' });
  delete process.env.VERCEL; delete process.env.VERCEL_URL;
});
function authRequest(body: unknown) {
  return new NextRequest('https://app.example.invalid/api/auth/login', { method: 'POST', body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' } });
}

test('rate limits allow the configured attempts then return 429 and Retry-After', async () => {
  assert.equal(await checkRateLimit('login-account:test@example.invalid', 2, 60), null);
  assert.equal(await checkRateLimit('login-account:test@example.invalid', 2, 60), null);
  const blocked = await checkRateLimit('login-account:test@example.invalid', 2, 60);
  assert.equal(blocked?.status, 429);
  assert.ok(Number(blocked?.headers.get('retry-after')) > 0);
  for (const key of buckets.keys()) assert.match(key, /^[a-f0-9]{64}$/, 'email/IP must not be stored in plaintext');
});

test('expired buckets restart and a successful account reset clears the limit', async () => {
  await checkRateLimit('account', 1, 60);
  assert.equal((await checkRateLimit('account', 1, 60))?.status, 429);
  for (const bucket of buckets.values()) bucket.expiresAt = new Date(0);
  assert.equal(await checkRateLimit('account', 1, 60), null);
  await resetRateLimit('account');
  assert.equal(buckets.size, 0);
});

test('login enforces the same account limit for case and whitespace variants', async () => {
  for (let index = 0; index < 10; index++) assert.equal((await login(authRequest({ email: index % 2 ? ' USER@example.invalid ' : 'user@example.invalid', password: 'incorrect' }))).status, 401);
  assert.equal((await login(authRequest({ email: 'user@example.invalid', password: 'incorrect' }))).status, 429);
});

test('a valid approved login resets its account bucket and issues a secure cookie', async () => {
  knownUser = { id: 'approved-user', name: 'User', email: 'user@example.invalid', role: 'TRAINEE', status: 'APPROVED', passwordHash: await hashPassword('valid-password') };
  const response = await login(authRequest({ email: 'user@example.invalid', password: 'valid-password' }));
  assert.equal(response.status, 200);
  assert.match(response.headers.get('set-cookie')!, /Secure/);
  assert.match(response.headers.get('set-cookie')!, /HttpOnly/);
  assert.equal(buckets.size, 1, 'only the address bucket remains after a successful login');
});

test('signup is limited even when malformed payloads are submitted', async () => {
  for (let index = 0; index < 30; index++) assert.equal((await register(authRequest({}))).status, 400);
  assert.equal((await register(authRequest({}))).status, 429);
});

test('forwarding headers are only trusted on Vercel or an explicitly trusted proxy', () => {
  const req = new NextRequest('https://app.example.invalid', { headers: { 'x-forwarded-for': '198.51.100.7', 'x-vercel-forwarded-for': '192.0.2.3' } });
  assert.equal(clientAddress(req), 'shared');
  process.env.VERCEL = '1';
  assert.equal(clientAddress(req), '192.0.2.3');
  delete process.env.VERCEL; process.env.TRUST_PROXY_HEADERS = 'true';
  assert.equal(clientAddress(req), '198.51.100.7');
});

test('write requests reject untrusted origins even if the Host header matches them', async () => {
  const req = new NextRequest('https://attacker.invalid/api/auth/login', { method: 'POST', headers: { host: 'attacker.invalid', origin: 'https://attacker.invalid' } });
  assert.equal((await proxy(req)).status, 403);
  const allowed = new NextRequest('https://app.example.invalid/api/auth/login', { method: 'POST', headers: { origin: 'https://app.example.invalid' } });
  assert.equal((await proxy(allowed)).status, 200);
});

test('origins require HTTPS and cannot contain login paths or embedded credentials', () => {
  assert.equal(getAppOrigin(), 'https://app.example.invalid');
  for (const url of ['http://app.example.invalid', 'https://app.example.invalid/login', 'https://user:password@app.example.invalid']) {
    process.env.NEXT_PUBLIC_APP_URL = url;
    assert.throws(() => getAppOrigin());
  }
});

test('authentication bodies reject oversized UTF-8 input without parsing it', async () => {
  const response = await readAuthPayload(authRequest({ name: 'é'.repeat(3000) }));
  assert.equal(response.error?.status, 413);
  const valid = await readAuthPayload(authRequest({ email: 'user@example.invalid' }));
  assert.deepEqual(valid.body, { email: 'user@example.invalid' });
});

test('health checks report 503 without exposing infrastructure details on failure', async () => {
  assert.equal((await health()).status, 200);
  storageAvailable = false;
  const response = await health();
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), { status: 'unavailable' });
});

test('maintenance rejects missing, invalid and malformed bearer credentials', async () => {
  for (const header of ['', 'Bearer wrong', 'é'.repeat(100)]) {
    const response = await maintenance(new NextRequest('https://app.example.invalid/api/cron/maintenance', { headers: { authorization: header } }));
    assert.equal(response.status, 401);
  }
  await checkRateLimit('expired', 1, 1);
  for (const bucket of buckets.values()) bucket.expiresAt = new Date(0);
  const response = await maintenance(new NextRequest('https://app.example.invalid/api/cron/maintenance', { headers: { authorization: `Bearer ${process.env.CRON_SECRET}` } }));
  assert.equal(response.status, 200);
  assert.equal(buckets.size, 0);
});

test('production validation rejects insecure settings and accepts explicit HTTPS/TLS configuration', () => {
  const environment = { NODE_ENV: 'production' as const, DATABASE_URL: 'postgresql://app_user:test-only-password@db.example.invalid/postgres?sslmode=require', DIRECT_URL: 'postgresql://app_user:test-only-password@db.example.invalid/postgres?sslmode=require', JWT_SECRET: 'test-key-with-at-least-32-characters-long', CRON_SECRET: 'test-cron-with-at-least-32-characters-long', NEXT_PUBLIC_APP_URL: 'https://app.example.invalid', SEED_DEMO_USERS: 'false' };
  assert.doesNotThrow(() => checkProductionEnvironment(environment));
  assert.throws(() => checkProductionEnvironment({ ...environment, JWT_SECRET: 'short' }));
  assert.throws(() => checkProductionEnvironment({ ...environment, SEED_DEMO_USERS: 'true' }));
  assert.throws(() => checkProductionEnvironment({ ...environment, DATABASE_URL: 'postgresql://app_user:test-only-password@db.example.invalid/postgres' }));
  assert.throws(() => checkProductionEnvironment({ ...environment, DATABASE_URL: 'postgresql://USER:PASSWORD@HOST/DATABASE?sslmode=require' }));
});

test('security headers retain YouTube embeds and block embedding the platform elsewhere', async () => {
  const groups = await nextConfig.headers!();
  const headers = Object.fromEntries(groups[0].headers.map(header => [header.key, header.value]));
  assert.equal(headers['X-Content-Type-Options'], 'nosniff');
  assert.equal(headers['X-Frame-Options'], 'DENY');
  assert.match(headers['Content-Security-Policy'], /frame-src https:\/\/www.youtube-nocookie.com/);
  assert.match(headers['Content-Security-Policy'], /frame-ancestors 'none'/);
  assert.ok(!headers['Content-Security-Policy'].includes('unsafe-eval'));
  assert.equal(headers['Strict-Transport-Security'], 'max-age=31536000');
});
