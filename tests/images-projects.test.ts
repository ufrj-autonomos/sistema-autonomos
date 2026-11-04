import assert from 'node:assert/strict';
import { test } from 'node:test';
import sharp from 'sharp';
import { cropGeometry } from '../src/lib/image-crop';
import { prepareInstitutionalImage, storeInstitutionalImage, MAX_IMAGE_BYTES } from '../src/lib/institutional/image-upload';
import { projectPreferences, filterProjects, PROJECT_SITE_COLUMNS, type ProjectRow } from '../src/lib/project-directory';

test('profile crop matches circular preview bounds, pan and zoom without leaving the source image', () => {
  const input = { naturalWidth: 4000, naturalHeight: 3000, viewportWidth: 320, aspect: 1, zoom: 1, x: 0, y: 0, profile: true };
  const center = cropGeometry(input);
  assert.equal(center.sourceWidth, 3000); assert.equal(center.sourceHeight, 3000);
  assert.equal(center.sourceX, 500); assert.equal(center.sourceY, 0);
  assert.equal(center.outputWidth, 1024); assert.equal(center.outputHeight, 1024);
  assert.equal(cropGeometry({ ...input, x: 1 }).sourceX, 0);
  assert.equal(cropGeometry({ ...input, x: -1 }).sourceX, 1000);
  const zoomed = cropGeometry({ ...input, zoom: 2, x: -1, y: 1 });
  assert.equal(zoomed.sourceWidth, 1500); assert.equal(zoomed.sourceX, 2500); assert.equal(zoomed.sourceY, 0);
  for (const aspect of [1, 16 / 9, 3 / 4]) for (const x of [-2, 0, 2]) for (const y of [-2, 0, 2]) {
    const crop = cropGeometry({ ...input, aspect, x, y, profile: false });
    assert.ok(crop.sourceX >= 0 && crop.sourceY >= 0);
    assert.ok(crop.sourceX + crop.sourceWidth <= 4000.00001 && crop.sourceY + crop.sourceHeight <= 3000.00001);
    assert.ok(Math.abs(crop.sourceWidth / crop.sourceHeight - aspect) < 0.0001);
    assert.ok(Math.max(crop.outputWidth, crop.outputHeight) <= 2560);
  }
  assert.throws(() => cropGeometry({ ...input, naturalWidth: 0 }));
  const small = cropGeometry({ ...input, naturalWidth: 100, naturalHeight: 100 });
  assert.equal(small.outputWidth, 100, 'small photos are not enlarged');
});

test('shared image pipeline keeps project aspect and generates the square member photo', async () => {
  const bytes = await sharp({ create: { width: 1600, height: 900, channels: 3, background: '#ac4433' } }).png().toBuffer();
  const file = new File([new Uint8Array(bytes)], 'project.png', { type: 'image/png' });
  const project = await sharp(await prepareInstitutionalImage(file, false)).metadata();
  const member = await sharp(await prepareInstitutionalImage(file, true)).metadata();
  assert.deepEqual([project.width, project.height, project.format], [1600, 900, 'webp']);
  assert.equal(member.width, member.height); assert.equal(member.format, 'webp');
  for (const bad of [null, new File(['not an image'], 'bad.png', { type: 'image/png' }), new File([new Uint8Array(MAX_IMAGE_BYTES + 1)], 'large.png', { type: 'image/png' })]) {
    await assert.rejects(prepareInstitutionalImage(bad, false), (error: any) => error.status === 400);
  }
});

test('project and member uploads share the working storage bucket and safe server-only protocol', async () => {
  const originalFetch = globalThis.fetch;
  const originalUrl = process.env.INSTITUTIONAL_SUPABASE_URL;
  const originalKey = process.env.INSTITUTIONAL_SUPABASE_SECRET_KEY;
  process.env.INSTITUTIONAL_SUPABASE_URL = 'https://storage.example.invalid';
  process.env.INSTITUTIONAL_SUPABASE_SECRET_KEY = 'test-only-storage-key';
  const requests: { url: string; headers: Headers }[] = [];
  let fail = false;
  globalThis.fetch = async (url, options) => {
    requests.push({ url: String(url), headers: new Headers(options?.headers) });
    return new Response(JSON.stringify(fail ? { message: 'PRIVATE PROVIDER ERROR', statusCode: '403' } : { Key: 'image.webp' }), { status: fail ? 403 : 200, headers: { 'content-type': 'application/json' } });
  };
  try {
    const bytes = await sharp({ create: { width: 100, height: 100, channels: 3, background: '#443322' } }).png().toBuffer();
    const file = new File([new Uint8Array(bytes)], 'image.png', { type: 'image/png' });
    for (const folder of ['projects', 'members'] as const) {
      const url = await storeInstitutionalImage(file, { folder, actorId: 'test-member', profile: folder === 'members' });
      assert.ok(url.startsWith(`https://storage.example.invalid/storage/v1/object/public/galery-autonomos/uploads/${folder}/test-member-`));
    }
    assert.equal(requests.length, 2);
    assert.ok(requests.every(request => request.url.includes('/storage/v1/object/galery-autonomos/uploads/') && request.headers.get('content-type') === 'image/webp'));
    fail = true;
    await assert.rejects(storeInstitutionalImage(file, { folder: 'projects', actorId: 'test-member' }), (error: any) => error.status === 503 && !error.message.includes('PRIVATE'));
  } finally {
    globalThis.fetch = originalFetch;
    if (originalUrl === undefined) delete process.env.INSTITUTIONAL_SUPABASE_URL; else process.env.INSTITUTIONAL_SUPABASE_URL = originalUrl;
    if (originalKey === undefined) delete process.env.INSTITUTIONAL_SUPABASE_SECRET_KEY; else process.env.INSTITUTIONAL_SUPABASE_SECRET_KEY = originalKey;
  }
});

test('project view preferences reject invalid columns and search only the chosen view', () => {
  assert.deepEqual(projectPreferences({ view: 'custom', columns: ['name', 'name', 'secret', 'notes'] }), { view: 'custom', columns: ['name', 'notes'] });
  assert.deepEqual(projectPreferences({ view: 'invalid', columns: [] }), { view: 'site', columns: PROJECT_SITE_COLUMNS });
  const row: ProjectRow = { id: 1, name: 'Robô de inspeção', coverImage: null, teamName: 'Autônomos', teamSlug: 'autonomos', status: 'operacao', year: 2026, importance: 5, showOnSite: true, codename: null, slug: 'robo', tagline: '', description: '', tags: '', notes: 'Pendência interna' };
  const all = { team: 'all', status: 'all', year: 'all', visibility: 'all' };
  assert.equal(filterProjects([row], ['name'], 'robo', all).length, 1);
  assert.equal(filterProjects([row], PROJECT_SITE_COLUMNS, 'pendencia', all).length, 0);
  assert.equal(filterProjects([row], ['notes'], 'pendencia', all).length, 1);
  assert.equal(filterProjects([row], ['status'], 'operação', all).length, 1);
  assert.equal(filterProjects([row], ['name'], '', { ...all, visibility: 'hidden' }).length, 0);
  assert.equal(filterProjects([row], ['name'], '', { ...all, team: 'other' }).length, 0);
});
