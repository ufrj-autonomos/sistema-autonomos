import assert from 'node:assert/strict';
import { beforeEach, test } from 'node:test';
import { NextRequest, NextResponse } from 'next/server';
import { recordedActivity } from './helpers/activity-memory';
import { traceApi, traceServerAction, writeActivity } from '../src/lib/activity/server';
import { rememberActivityActor, activityTarget } from '../src/lib/activity/context';
import { activityPath } from '../src/lib/activity/catalog';
import { clientEvents, logFilters } from '../src/lib/activity/input';
import { prisma } from '../src/lib/prisma';
Object.assign(process.env, { NODE_ENV: 'test' });
const actor = { id: 'admin', name: 'Admin', role: 'ADMIN' };
const event = { id: '7adf4b99-1aa1-42c5-815b-745d5d1e86cc', action: 'BUTTON_CLICK', path: '/perfil?token=SECRET#CPF' };
beforeEach(() => { recordedActivity.length = 0; });
test('paths strip queries and fragments and reject external/control paths', () => {
  assert.equal(activityPath('/perfil?password=SECRET#fragment'), '/perfil');
  for (const path of ['//example.invalid', 'https://example.invalid', '/\\evil', '/bad\npath', '/%0asecret']) assert.equal(activityPath(path), null);
});
test('client can only submit bounded observed interactions, never identity, credentials or server outcome', () => {
  const row = clientEvents({ events: [event] })[0];
  assert.equal(row.path, '/perfil'); assert.equal(row.outcome, 'OBSERVED');
  for (const key of ['actorId', 'actorRole', 'password', 'values', 'outcome']) assert.throws(() => clientEvents({ events: [{ ...event, [key]: 'ADMIN' }] }));
  assert.throws(() => clientEvents({ events: [{ ...event, action: 'createRecord' }] }));
  assert.throws(() => clientEvents({ events: Array(21).fill(event) }));
  assert.throws(() => clientEvents({ events: [{ ...event, control: 'CPF: 123.456.789-09' }] }));
});
test('API trace keeps actor contexts separate under concurrent requests and records failures', async () => {
  await Promise.all(['Ana', 'Bia'].map((name, index) => traceApi(new NextRequest('http://localhost/api/profile?cpf=SECRET'), 'GET /api/profile', async () => {
    rememberActivityActor({ ...actor, id: name, name });
    await new Promise(resolve => setTimeout(resolve, index ? 1 : 8));
    return NextResponse.json({ privateData: 'DO NOT LOG' }, { status: index ? 403 : 200 });
  })));
  assert.equal(recordedActivity.length, 2);
  assert.equal(recordedActivity.find(row => row.actorName === 'Ana').outcome, 'SUCCESS');
  assert.equal(recordedActivity.find(row => row.actorName === 'Bia').outcome, 'FAILURE');
  assert.ok(recordedActivity.every(row => row.path === '/api/profile'));
  assert.ok(!JSON.stringify(recordedActivity).includes('SECRET'));
  assert.ok(!JSON.stringify(recordedActivity).includes('DO NOT LOG'));
});
test('server actions retain a safe target, preserve results and do not duplicate nested operations', async () => {
  const result = await traceServerAction('updateMemberQuickField', async () => {
    rememberActivityActor(actor); activityTarget('/gestao/integrantes/12?token=SECRET', 'area');
    return traceServerAction('updateRecord', async () => ({ success: true }));
  });
  assert.equal(result.success, true); assert.equal(recordedActivity.length, 1);
  assert.equal(recordedActivity[0].actorId, 'admin'); assert.equal(recordedActivity[0].control, 'area');
  assert.equal(recordedActivity[0].targetPath, '/gestao/integrantes/12');
});
test('returned failures and exceptions are recorded without storing error contents', async () => {
  await traceServerAction('saveDirectoryDetails', async () => ({ success: false, error: 'CPF SECRET' }));
  await assert.rejects(traceServerAction('updateRecord', async () => { throw Error('DATABASE SECRET'); }));
  assert.ok(recordedActivity.every(row => row.outcome === 'FAILURE'));
  assert.ok(!JSON.stringify(recordedActivity).includes('SECRET'));
});
test('an actor deleted during the action retains a detached snapshot and log failures never change action results', async () => {
  const original = prisma.activityLog.create;
  let calls = 0;
  try {
    (prisma.activityLog as any).create = async ({ data }: any) => { calls++; if (data.actorId) throw { code: 'P2003' }; recordedActivity.push(data); return data; };
    await writeActivity({ actor, kind: 'SERVER_ACTION', action: 'deleteRecord', path: '/gestao', outcome: 'SUCCESS' });
    assert.equal(calls, 2); assert.equal(recordedActivity[0].actorId, null); assert.equal(recordedActivity[0].actorName, 'Admin');
    (prisma.activityLog as any).create = async () => { throw Error('offline'); };
    assert.equal((await traceServerAction('saveDirectoryDetails', async () => ({ success: true }))).success, true);
  } finally { prisma.activityLog.create = original; }
});
test('log filters have bounded periods, query lengths and cursors', () => {
  assert.equal(logFilters(new URLSearchParams()).days, 7);
  assert.equal(logFilters(new URLSearchParams('days=0')).days, 0);
  for (const filter of ['days=10000', 'kind=PRIVATE', 'outcome=ADMIN', `q=${'a'.repeat(101)}`, 'cursor=../private']) assert.throws(() => logFilters(new URLSearchParams(filter)));
});
