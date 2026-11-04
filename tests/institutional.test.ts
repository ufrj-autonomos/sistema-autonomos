import './helpers/activity-memory';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { bridgeHeaders, verifyBridge } from '../src/lib/institutional/bridge';
import { recordData } from '../src/lib/institutional/records';
import { contactData } from '../src/lib/institutional/contact';
import { adminModels } from '../src/lib/institutional/admin-config';
import { privateData } from '../src/lib/directory-validation';
import { normalizeMemberArea, normalizeMemberRole, resolveMemberAreas, MEMBER_ROLES, memberRoleTranslations, planMemberAreaRepairs } from '../src/lib/member-fields';
import { selectOptions } from '../src/lib/form-select';
import { profileChangeDiff, siteAssetUrl, validateSiteProfileChanges } from '../src/lib/site-profile-changes';
import { filterMembers, initialMemberPreferences, INTERNAL_COLUMNS, MEMBER_COLUMNS, memberPreferences, memberValue, SITE_COLUMNS, type MemberDirectoryRow } from '../src/lib/member-directory';

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
  for (const field of ['cpf', 'notes', 'userId', 'missedWeeks', 'email', 'phone', 'dre', 'birthDate', 'academicPeriod', 'emergencyContactName', 'emergencyContactPhone']) assert.throws(() => recordData('member', { [field]: 'private' }, false));
  assert.deepEqual(privateData({ cpf: '529.982.247-25', notes: '  Privado  ', userId: '' }, true), { cpf: '52998224725', notes: 'Privado', userId: null });
  for (const cpf of ['11111111111', '52998224724', '123', '52998224725abc']) assert.throws(() => privateData({ cpf, notes: '', userId: '' }, true));
  assert.throws(() => privateData({ cpf: '', notes: '', userId: '', showOnSite: true }, true));
  assert.deepEqual(recordData('member', { showOnSite: false }, false), { showOnSite: false });
  assert.deepEqual(recordData('project', { showOnSite: true }, false), { showOnSite: true });
});

test('operational fields validate dates and contacts while preserving omitted fields', () => {
  const input = { cpf: '', notes: '', userId: '', name: ' Nome interno ', area: 'Pesquisa', email: ' Pessoa@EXAMPLE.invalid ', phone: '(21) 99999-9999', dre: '001.234.567', birthDate: '2000-02-29', course: 'Engenharia', academicPeriod: '6º período', emergencyContactName: 'Contato', emergencyContactPhone: '+55 21 98888-8888' };
  const clean = privateData(input, true);
  assert.ok('cpf' in clean);
  if ('cpf' in clean) {
    assert.equal(clean.name, 'Nome interno'); assert.equal(clean.email, 'pessoa@example.invalid'); assert.equal(clean.dre, '001234567');
    assert.equal(clean.birthDate?.toISOString(), '2000-02-29T00:00:00.000Z');
  }
  for (const date of ['2001-02-29', '2000-02-30', '2100-01-01', '2000-1-1', 'invalid']) assert.throws(() => privateData({ ...input, birthDate: date }, true));
  for (const value of [{ email: 'invalid' }, { phone: 'abc12345678' }, { phone: '123' }, { emergencyContactPhone: '123' }, { dre: 'invalid' }, { academicPeriod: 'a'.repeat(51) }]) assert.throws(() => privateData({ ...input, ...value }, true));
  assert.equal('birthDate' in privateData({ cpf: '', notes: '', userId: '' }, true), false);
  assert.equal((privateData({ ...input, birthDate: '' }, true) as any).birthDate, null);
});

test('member views have a validated column selection and never put attendance in the site preset', () => {
  assert.equal(SITE_COLUMNS.includes('missedWeeks'), false);
  assert.deepEqual(INTERNAL_COLUMNS, ['internalName', 'internalArea', 'email', 'phone', 'dre', 'cpf', 'birthDate', 'internalCourse', 'academicPeriod', 'emergencyContact']);
  assert.deepEqual(memberPreferences({ view: 'custom', columns: ['cpf', 'internalName'] }), { view: 'custom', columns: ['cpf', 'internalName'] });
  for (const input of [{ view: 'custom', columns: [] }, { view: 'custom', columns: ['cpf', 'cpf'] }, { view: 'custom', columns: ['passwordHash'] }, { view: 'unknown', columns: ['name'] }, { view: 'site', columns: ['name'], userId: 'another-account' }]) assert.throws(() => memberPreferences(input));
  assert.equal(initialMemberPreferences(null).view, 'site');
  assert.equal(new Set(MEMBER_COLUMNS.map(column => column.key)).size, MEMBER_COLUMNS.length);
});

test('table search respects visible columns and supports accents, filters and formatted CPF', () => {
  const row = { id: 1, name: 'João', area: 'Mecânica', teamId: 17, active: true, course: 'Engenharia', internal: { name: 'João Silva', area: 'Software', cpf: '52998224725', emergencyContactName: 'Maria', emergencyContactPhone: '(21) 99999-9999' } } as MemberDirectoryRow;
  const base = { search: '', team: 'all', area: 'all', status: 'all' };
  assert.equal(filterMembers([row], SITE_COLUMNS, { ...base, search: 'joao' }, 'site').length, 1);
  assert.equal(filterMembers([row], SITE_COLUMNS, { ...base, search: '52998224725' }, 'site').length, 0);
  assert.equal(filterMembers([row], INTERNAL_COLUMNS, { ...base, search: '529.982.247-25' }, 'internal').length, 1);
  assert.equal(filterMembers([row], INTERNAL_COLUMNS, { ...base, team: '17', area: 'Software', status: 'active' }, 'internal').length, 1);
  assert.equal(filterMembers([row], INTERNAL_COLUMNS, { ...base, area: 'Mecânica' }, 'internal').length, 0);
  assert.equal(filterMembers([row], SITE_COLUMNS, { ...base, area: 'Mecânica' }, 'site').length, 1);
  assert.equal(filterMembers([row], INTERNAL_COLUMNS, { ...base, status: 'inactive' }, 'internal').length, 0);
  assert.equal(memberValue(row, 'internalCourse'), 'Engenharia');
  assert.equal(memberValue(row, 'emergencyContact'), 'Maria\n(21) 99999-9999');
});

test('Autônomos is an explicit selection and existing cargos are never lost by the dropdown', () => {
  const general = selectOptions([{ label: 'UFRJ Autônomos', value: '' }, { label: 'Harpia', value: 2 }], null);
  assert.equal(general.showPlaceholder, false);
  assert.equal(general.options.filter(option => option.value === '').length, 1);
  assert.equal(general.options[0].label, 'UFRJ Autônomos');
  assert.equal(selectOptions([{ label: 'Harpia', value: 2 }], null).showPlaceholder, true);
  const legacy = selectOptions(MEMBER_ROLES, 'Conta Institucional');
  assert.equal(legacy.options[0].value, 'Conta Institucional');
  assert.equal(normalizeMemberRole('Integrante'), 'Membro');
  assert.equal(normalizeMemberRole('Coordenadora'), 'Coordenador');
  assert.equal(normalizeMemberRole('Conta Institucional'), 'Conta Institucional');
  assert.deepEqual(memberRoleTranslations('Integrante'), { roleEn: 'Member', roleFr: 'Membre' });
  assert.deepEqual(recordData('member', { role: 'Integrante', teamId: '' }, false), { role: 'Membro', teamId: null });
  assert.equal(MEMBER_ROLES.length, new Set(MEMBER_ROLES.map(option => option.value)).size);
});

test('Gestão and other selected areas survive placeholders, spelling variants and two database sources', () => {
  assert.equal(normalizeMemberArea(' gestao '), 'Gestão');
  assert.equal(normalizeMemberArea('Não informada'), null);
  assert.equal(normalizeMemberArea('Pesquisa'), 'Pesquisa');
  assert.deepEqual(resolveMemberAreas('Não informada', 'Gestão'), { site: 'Gestão', internal: 'Gestão' });
  assert.deepEqual(resolveMemberAreas('Gestão', 'Não informada'), { site: 'Gestão', internal: 'Gestão' });
  assert.deepEqual(resolveMemberAreas('Software', 'Gestão'), { site: 'Software', internal: 'Gestão' });
  assert.deepEqual(resolveMemberAreas('Não informada', null), { site: null, internal: null });
  assert.throws(() => recordData('member', { area: 'Não informada' }, false));
});

test('site requests preserve false and removals, reject unsafe photos and omit restored changes', () => {
  assert.deepEqual(validateSiteProfileChanges({ area: 'gestao', photo: 'https://example.invalid/member.webp', bio: null, isFemale: false }), { area: 'Gestão', bio: null, photo: 'https://example.invalid/member.webp', isFemale: false });
  for (const url of ['javascript:alert(1)', '//example.invalid/a.png', '/\\example.invalid/a.png', 'data:image/svg+xml,test']) {
    assert.equal(siteAssetUrl(url, 'https://example.invalid'), null);
    assert.throws(() => validateSiteProfileChanges({ photo: url }));
  }
  assert.equal(siteAssetUrl('/images/member.webp', 'https://example.invalid'), 'https://example.invalid/images/member.webp');
  assert.throws(() => validateSiteProfileChanges({ cpf: '52998224725' }));
  assert.throws(() => validateSiteProfileChanges({ isFemale: 'false' }));
  assert.throws(() => validateSiteProfileChanges({ name: null }));
  assert.deepEqual(profileChangeDiff({ bio: null, isFemale: false, name: 'Current' }, { bio: '', isFemale: true, name: 'Current' }), { isFemale: false });
  assert.deepEqual(profileChangeDiff({ photo: null }, { photo: 'https://example.invalid/old.webp' }), { photo: null });
});

test('area repairs only fill missing areas through explicit links, preserving distinct choices', () => {
  const site = [{ id: 10, area: 'Não informada' }, { id: 20, area: 'Gestão' }, { id: 30, area: 'Software' }, { id: 40, area: 'Não informada' }];
  const internal = [{ id: 'a', institutionalMemberId: 10, area: 'Gestão' }, { id: 'b', institutionalMemberId: 20, area: 'Não informada' }, { id: 'c', institutionalMemberId: 30, area: 'Gestão' }, { id: 'd', institutionalMemberId: 40, area: 'Não informada' }, { id: 'e', institutionalMemberId: null, area: 'Gestão' }];
  assert.deepEqual(planMemberAreaRepairs(site, internal), { siteUpdates: [{ id: 10, from: 'Não informada', to: 'Gestão' }], internalUpdates: [{ id: 'b', from: 'Não informada', to: 'Gestão' }] });
  site[0].area = 'Gestão'; internal[1].area = 'Gestão';
  assert.deepEqual(planMemberAreaRepairs(site, internal), { siteUpdates: [], internalUpdates: [] });
});
