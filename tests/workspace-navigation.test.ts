import assert from 'node:assert/strict';
import { test } from 'node:test';
import { defaultWorkspacePath, jumpLinks, loginDestination, workspaceLinks } from '../src/lib/workspace-navigation';

test('approved management roles land in their operational workspace and members keep their personal home', () => {
  for (const role of ['ADMIN', 'MANAGEMENT']) assert.equal(defaultWorkspacePath(role), '/gestao');
  for (const role of ['MEMBER', 'TRAINEE', undefined, 'unknown']) assert.equal(defaultWorkspacePath(role), '/');
});
test('login preserves the requested lesson or tool and prioritizes first-login profile completion', () => {
  assert.equal(loginDestination('ADMIN', '/'), '/gestao');
  assert.equal(loginDestination('MEMBER', '/'), '/');
  assert.equal(loginDestination('ADMIN', '/ensino/curso/aula-1?tab=exercises'), '/ensino/curso/aula-1?tab=exercises');
  assert.equal(loginDestination('MEMBER', '/presenca/registrar?token=qr'), '/presenca/registrar?token=qr');
  assert.equal(loginDestination('ADMIN', '/gestao/integrantes', true), '/perfil?welcome=1');
});
test('login rejects external, malformed and authentication-loop redirects', () => {
  for (const path of ['https://example.invalid', '//example.invalid', '/\\example.invalid', '/\nexample.invalid', '/login', '/login?redirect=/', '/register', '/forgot-password', '/reset-password']) {
    assert.equal(loginDestination('ADMIN', path), '/gestao', path);
  }
});
test('member navigation and jump search never offer management tools to members', () => {
  for (const item of [...workspaceLinks(false, false), ...jumpLinks(false, false)]) assert.ok(!item.href.startsWith('/gestao'));
  assert.equal(workspaceLinks(false, true)[0].href, '/meu-espaco');
  assert.ok(jumpLinks(false, true).some(item => item.href === '/gestao'));
});
test('management navigation includes core jobs and course access stays secondary', () => {
  const links = workspaceLinks(true, true);
  for (const path of ['/gestao/integrantes', '/gestao/presenca', '/gestao/contas']) assert.ok(links.some(item => item.href === path));
  assert.ok(!links.some(item => item.href === '/ensino'));
  const jump = jumpLinks(true, true);
  assert.ok(jump.some(item => item.href === '/ensino'));
  assert.ok(jump.some(item => item.href === '/gestao/site/mensagens'));
  assert.equal(new Set(jump.map(item => item.href)).size, jump.length);
});
