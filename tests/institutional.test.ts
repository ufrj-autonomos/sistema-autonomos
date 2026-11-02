import assert from 'node:assert/strict';
import { test } from 'node:test';
import { bridgeHeaders, verifyBridge } from '../src/lib/institutional/bridge';
import { recordData } from '../src/lib/institutional/records';
import { contactData } from '../src/lib/institutional/contact';
import { adminModels } from '../src/lib/institutional/admin-config';
import { privateData } from '../src/lib/directory-validation';

const secret = 'isolated-institutional-signature-secret-at-least-32';
test('bridge signatures bind the body and purpose and reject altered or expired requests', () => {
  const raw = JSON.stringify({ action: 'revalidate' });
  const headers = new Headers(bridgeHeaders(raw, 'revalidate', secret));
  assert.equal(verifyBridge(raw, headers, 'revalidate', secret), true);
  assert.equal(verifyBridge(raw + ' ', headers, 'revalidate', secret), false);
  assert.equal(verifyBridge(raw, headers, 'contact', secret), false);
  headers.set('x-institutional-time', String(Date.now() - 600000));
  assert.equal(verifyBridge(raw, headers, 'revalidate', secret), false);
  assert.throws(() => bridgeHeaders(raw, 'contact', 'short'));
});
test('institutional record input cannot select internal application models or inject nested writes', () => {
  for (const model of ['user', 'session', '$executeRaw', 'siteSettings','contactMessage','attendanceVisit']) assert.throws(() => recordData(model, {}, true));
  assert.throws(() => recordData('member', { name: 'Example', userId: 'internal-user' }, false));
  assert.throws(() => recordData('project', { team: { connect: { id: 1 } } }, false));
  assert.throws(() => recordData('member', { active: 'true' }, false));
  assert.deepEqual(recordData('member', { roleEn: 'Member', roleFr: 'Membre' }, false), { roleEn: 'Member', roleFr: 'Membre' });
  assert.throws(() => recordData('member', { photo: 'javascript:alert(1)' }, false));
  assert.throws(() => recordData('team', { founded: '2020;DROP TABLE' }, false));
});
test('original administrative forms have valid scalar fields in the institutional schema', () => {
  assert.equal(Object.keys(adminModels).length, 8);
  assert.deepEqual(recordData('team', { name: 'Test', slug: 'test', founded: '2020' }, true), { name: 'Test', slug: 'test', founded: 2020 });
  assert.throws(() => recordData('team', { name: 'Test' }, true));
  assert.throws(() => recordData('team', { tags: 'not-json' }, false));
});
test('contacts accept only bounded fields, known teams and valid email addresses', () => {
  const data = { name: 'Test', email: 'test@example.invalid', message: 'Message' };
  assert.equal(contactData(data).teamSlug, 'autonomos');
  assert.throws(() => contactData({ ...data, email: 'invalid' }));
  assert.throws(() => contactData({ ...data, id: 1 }));
  assert.throws(() => contactData({ ...data, teamSlug: 'unexpected' }));
  assert.throws(() => contactData({ ...data, message: 'a'.repeat(6001) }));
});

test('private information cannot be written into public records and CPF is validated', () => {
  for (const field of ['cpf', 'notes', 'userId', 'missedWeeks']) assert.throws(() => recordData('member', { [field]: 'private' }, false));
  assert.deepEqual(privateData({ cpf: '529.982.247-25', notes: '  Privado  ', userId: '' }, true), { cpf: '52998224725', notes: 'Privado', userId: null });
  for (const cpf of ['11111111111', '52998224724', '123', '52998224725abc']) assert.throws(() => privateData({ cpf, notes: '', userId: '' }, true));
  assert.throws(() => privateData({ cpf: '', notes: '', userId: '', showOnSite: true }, true));
  assert.deepEqual(recordData('member', { showOnSite: false }, false), { showOnSite: false });
  assert.deepEqual(recordData('project', { showOnSite: true }, false), { showOnSite: true });
});
