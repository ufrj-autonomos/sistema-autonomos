import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import { PrismaClient } from '../src/generated/institutional';

async function main() {
  const url = process.env.TEST_DATABASE_URL;
  if (!url || !['localhost','127.0.0.1','[::1]'].includes(new URL(url).hostname)) throw new Error('Use somente PostgreSQL de testes local e descartável.');
  const name = `institutional_test_${randomUUID().replaceAll('-','')}`;
  const owner = new PrismaClient({ datasourceUrl: url });
  const testUrl = new URL(url); testUrl.pathname = `/${name}`;
  const secretsFile = `/tmp/${name}-roles.json`;
  const connections: PrismaClient[] = [];
  let created = false;
  let institutionalClient: PrismaClient | undefined;
  function run(args: string[], extra: Record<string,string>) {
    const result = spawnSync(process.execPath, args, { env: { ...process.env, ...extra }, encoding: 'utf8' });
    if (result.status !== 0) throw new Error(`Falha na preparação isolada: ${result.stdout}\n${result.stderr}`);
  }
  try {
    await owner.$executeRawUnsafe(`CREATE DATABASE "${name}"`); created = true;
    const target = new PrismaClient({ datasourceUrl: testUrl.toString() }); connections.push(target);
    for (const role of ['anon','authenticated']) await target.$executeRawUnsafe(`DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='${role}') THEN CREATE ROLE ${role} NOLOGIN; END IF; END $$`);
    run(['node_modules/prisma/build/index.js','db','push','--schema','prisma/institutional.prisma','--skip-generate'], { INSTITUTIONAL_DATABASE_URL: testUrl.toString() });
    run(['--import','tsx','scripts/institutional/provision.ts'], { INSTITUTIONAL_OWNER_DATABASE_URL: testUrl.toString(), INSTITUTIONAL_ROLE_SECRETS_FILE: secretsFile });
    const secrets = JSON.parse(fs.readFileSync(secretsFile,'utf8'));
    const connection = (role: string, password: string) => { const copy = new URL(testUrl); copy.username=role;copy.password=password;return copy.toString(); };
    process.env.INSTITUTIONAL_DATABASE_URL = connection('institutional_editor',secrets.editor);
    const editor = new PrismaClient({ datasourceUrl: process.env.INSTITUTIONAL_DATABASE_URL });connections.push(editor);
    const reader = new PrismaClient({ datasourceUrl: connection('institutional_reader',secrets.reader) });connections.push(reader);
    const { db } = await import('../src/lib/institutional/db'); institutionalClient = db;
    const { recordData } = await import('../src/lib/institutional/records');
    const team = await db.team.create({ data: recordData('team',{name:'Fixture',slug:'fixture',founded:2020},true) as any });
    const model = await db.model3D.create({ data: recordData('model3D',{name:'Fixture',value:'fixture'},true) as any });
    const project = await db.project.create({ data: recordData('project',{teamId:team.id,name:'Fixture',slug:'fixture',tagline:'Fixture',description:'Fixture',status:'desenvolvimento',year:2026,tags:'fixture',specs:'[]',subsystems:'[]',model3dId:model.id},true) as any });
    await db.member.create({ data: recordData('member',{teamId:team.id,name:'Fixture',role:'Integrante',area:'Software',active:true},true) as any });
    await db.sponsor.create({ data: recordData('sponsor',{name:'Fixture',tier:'apoio',teamId:team.id},true) as any });
    const competition = await db.competition.create({ data: recordData('competition',{teamId:team.id,name:'Fixture',year:2026,location:'Fixture',country:'Brasil'},true) as any });
    const event = await db.timelineEvent.create({ data: recordData('timelineEvent',{teamId:team.id,title:'Fixture',description:'Fixture',date:'2026-11',category:'marco'},true) as any });
    await db.galleryImage.create({ data: recordData('galleryImage',{teamId:team.id,url:'https://example.invalid/fixture.webp',caption:'Fixture',projectId:project.id,timelineEventId:event.id,competitionId:competition.id},true) as any });
    await db.siteSettings.create({ data:{id:1,contactEmails:'fixture@example.invalid',whatsappNumber:'',location:'Fixture'} });
    await db.contactMessage.create({data:{name:'Fixture',email:'fixture@example.invalid',subject:'Fixture',message:'Private message',teamSlug:'autonomos',intent:'outro'}});
    assert.equal(await reader.team.count(),1); assert.equal(await reader.galleryImage.count(),1);
    await assert.rejects(reader.contactMessage.count());
    await assert.rejects(reader.$executeRawUnsafe('UPDATE "Team" SET "name"="name" WHERE false'));
    await db.team.update({where:{id:team.id},data:recordData('team',{name:'Updated fixture'},false) as any});
    assert.equal((await reader.team.findUniqueOrThrow({where:{id:team.id}})).name,'Updated fixture');
    const acl = await target.$queryRaw<Array<{ name: string; protected: boolean; anonwrite: boolean; readerwrite: boolean }>>`SELECT c.relname AS name,c.relrowsecurity AS protected,has_table_privilege('anon',c.oid,'INSERT, UPDATE, DELETE') AS anonwrite,has_table_privilege('institutional_reader',c.oid,'INSERT, UPDATE, DELETE') AS readerwrite FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind='r'`;
    assert.equal(acl.length,10);assert.ok(acl.every(table=>table.protected && !table.anonwrite && !table.readerwrite));
    await db.team.delete({where:{id:team.id}});assert.equal(await reader.project.count(),0);assert.equal(await reader.galleryImage.count(),0);
    await db.$disconnect();
    console.log('Banco institucional isolado: CRUD de todos os modelos, RLS, leitura pública restrita, mensagens privadas e cascatas passaram.');
  } finally {
    if (institutionalClient) await institutionalClient.$disconnect();
    for(const connection of connections) await connection.$disconnect();
    if(created) await owner.$executeRawUnsafe(`DROP DATABASE "${name}" WITH (FORCE)`);
    await owner.$disconnect();fs.rmSync(secretsFile,{force:true});
  }
}
main().catch(error=>{console.error(error);process.exitCode=1;});
