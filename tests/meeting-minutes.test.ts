import assert from 'node:assert/strict';
import { test } from 'node:test';
import { minutesInput, minutesExcerpt, summarizeMinutes } from '../src/lib/meetings/minutes';
test('minutes require bounded text and a valid version, without accepting forged fields', () => {
  assert.equal(minutesInput({ minutes: '  Revisamos o projeto e definimos os próximos passos.  ', expectedUpdatedAt: null }).minutes, 'Revisamos o projeto e definimos os próximos passos.');
  for (const input of [{ minutes: 'curto', expectedUpdatedAt: null }, { minutes: 'a'.repeat(20001), expectedUpdatedAt: null }, { minutes: 'Ata da reunião completa', expectedUpdatedAt: 'invalid' }, { minutes: 'Ata da reunião completa', expectedUpdatedAt: null, teamId: 2 }]) assert.throws(() => minutesInput(input));
});
test('summary fallback is a clearly identified excerpt and AI returns only a short paragraph', async () => {
  const oldKey = process.env.GEMINI_API_KEY, oldAlias = process.env.GEMINI_API, oldFetch = globalThis.fetch;
  try {
    delete process.env.GEMINI_API_KEY; delete process.env.GEMINI_API;
    assert.deepEqual(await summarizeMinutes('Decidimos testar o protótipo. Próxima etapa: ensaio.'), { summary: 'Decidimos testar o protótipo. Próxima etapa: ensaio.', source: 'EXCERPT' });
    assert.ok(minutesExcerpt('Longa ata com decisões. '.repeat(100)).length <= 480);
    process.env.GEMINI_API_KEY = 'test-only-key';
    globalThis.fetch = async (_url, options) => { assert.ok(String(options?.body).includes('Retorne somente JSON')); return Response.json({ candidates: [{ content: { parts: [{ text: JSON.stringify({ summary: 'A equipe revisou o protótipo.\nO próximo passo será o ensaio.' }) }] } }] }); };
    assert.deepEqual(await summarizeMinutes('Ata de teste completa.'), { summary: 'A equipe revisou o protótipo. O próximo passo será o ensaio.', source: 'AI' });
    globalThis.fetch = async () => new Response(null, { status: 503 });
    assert.equal((await summarizeMinutes('Ata preservada mesmo sem IA.')).source, 'EXCERPT');
    globalThis.fetch = async () => Response.json({ candidates: [{ content: { parts: [{ text: 'not valid json' }] } }] });
    assert.equal((await summarizeMinutes('Ata preservada mesmo sem IA.')).source, 'EXCERPT');
  } finally {
    globalThis.fetch = oldFetch;
    if (oldKey === undefined) delete process.env.GEMINI_API_KEY; else process.env.GEMINI_API_KEY = oldKey;
    if (oldAlias === undefined) delete process.env.GEMINI_API; else process.env.GEMINI_API = oldAlias;
  }
});
