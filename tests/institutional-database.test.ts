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
  let platformClient: import('@prisma/client').PrismaClient | undefined;
    let accountId: string | undefined;
    let publicMemberId: number | undefined;
    let publicProjectId: number | undefined;
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
      const publicMember = await db.institutionalMember.create({ data: recordData('member',{teamId:team.id,name:'Nome correto do site',role:'Integrante',area:'Software',active:true},true) as any });
      publicMemberId = publicMember.id; publicProjectId = project.id;
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
      // Apply the additive production migration twice: content and visibility survive.
      for (let attempt = 0; attempt < 2; attempt++) run(['--import','tsx','scripts/institutional/migrate-directory.ts'], { INSTITUTIONAL_OWNER_DATABASE_URL: testUrl.toString() });
      assert.equal((await editor.institutionalMember.findUniqueOrThrow({where:{id:publicMember.id}})).name,'Nome correto do site');
      assert.equal((await reader.institutionalMember.findUniqueOrThrow({where:{id:publicMember.id}})).showOnSite,true);
      await editor.institutionalMember.update({where:{id:publicMember.id},data:{showOnSite:false}});
      await editor.project.update({where:{id:project.id},data:{showOnSite:false}});
      assert.equal(await reader.institutionalMember.findUnique({where:{id:publicMember.id}}),null);
      assert.equal(await reader.project.findFirst({where:{slug:'fixture'}}),null);
      assert.equal(await reader.project.count(),0);
      assert.equal(await reader.galleryImage.count(),0);
      assert.equal(await editor.project.count(),1);
      assert.equal(await editor.institutionalMember.count(),1);
      await editor.project.update({where:{id:project.id},data:{showOnSite:true,name:'Projeto atualizado'}});
      assert.equal((await reader.project.findUniqueOrThrow({where:{id:project.id}})).name,'Projeto atualizado');
      assert.equal(await reader.galleryImage.count(),1);

      process.env.DATABASE_URL = url; process.env.DIRECT_URL = url;
      const { prisma } = await import('../src/lib/prisma'); platformClient = prisma;
      const { savePrivateDetails, memberPrivateDetails } = await import('../src/lib/directory');
      const account = await prisma.member.create({data:{name:'Cadastro interno genérico',email:`directory-${name}@example.invalid`,status:'APPROVED',area:'Não informada'}});
      accountId = account.id;
      const period = await prisma.attendancePeriod.create({data:{memberId:account.id,startsOn:new Date('2026-10-19'),targetSeconds:7200}});
      const visit = await prisma.attendanceVisit.create({data:{memberId:account.id,checkedInAt:new Date('2026-10-20T12:00:00Z'),checkedOutAt:new Date('2026-10-20T14:00:00Z'),status:'CLOSED'}});
      await savePrivateDetails('member',publicMember.id,{cpf:'529.982.247-25',notes:'Privado',userId:account.id});
      await savePrivateDetails('project',project.id,{notes:'Orçamento interno'});
      assert.equal((await prisma.member.findUniqueOrThrow({where:{institutionalMemberId:publicMember.id}})).id,account.id);
      assert.equal((await memberPrivateDetails(publicMember.id)).cpf,'52998224725');
      const publicBeforeInternalEdit = await editor.institutionalMember.findUniqueOrThrow({where:{id:publicMember.id}});
      await savePrivateDetails('member',publicMember.id,{cpf:'52998224725',notes:'Privado',userId:account.id,name:'Nome operacional',area:'Pesquisa',email:'operacao@example.invalid',phone:'(21) 99999-9999',dre:'001234567',birthDate:'2000-02-29',course:'Curso interno',academicPeriod:'6º período',emergencyContactName:'Contato de emergência',emergencyContactPhone:'(21) 98888-8888'});
      const operational = await memberPrivateDetails(publicMember.id);
      assert.equal(operational.name,'Nome operacional'); assert.equal(operational.dre,'001234567'); assert.equal(operational.birthDate,'2000-02-29');
      assert.equal(operational.email,'operacao@example.invalid'); assert.equal(operational.emergencyContactPhone,'(21) 98888-8888');
      assert.deepEqual(await editor.institutionalMember.findUniqueOrThrow({where:{id:publicMember.id}}),publicBeforeInternalEdit,'internal edits must never modify any institutional column');
      await prisma.member.update({where:{id:account.id},data:{memberDirectoryPreferences:{view:'custom',columns:['cpf','name']}}});
      assert.deepEqual((await prisma.member.findUniqueOrThrow({where:{id:account.id}})).memberDirectoryPreferences,{view:'custom',columns:['cpf','name']});
      assert.equal((await prisma.attendanceVisit.findUniqueOrThrow({where:{id:visit.id}})).memberId,account.id);
      assert.equal((await prisma.attendancePeriod.findUniqueOrThrow({where:{id:period.id}})).startsOn.toISOString(),'2026-10-19T00:00:00.000Z');
      assert.equal(await prisma.member.count({where:{id:account.id}}),1);
      assert.equal((await editor.institutionalMember.findUniqueOrThrow({where:{id:publicMember.id}})).name,'Nome correto do site');
      assert.equal('cpf' in (await editor.institutionalMember.findUniqueOrThrow({where:{id:publicMember.id}})),false);
      await assert.rejects(savePrivateDetails('member',publicMember.id,{cpf:'11111111111',notes:'',userId:account.id}));
      const other = await editor.institutionalMember.create({data:{name:'Outra pessoa',role:'Membro',area:'Software',showOnSite:false}});
      await assert.rejects(savePrivateDetails('member',other.id,{cpf:'',notes:'',userId:account.id}),/vinculado/);
      assert.equal(await prisma.member.count({where:{institutionalMemberId:other.id}}),0);
      await editor.institutionalMember.delete({where:{id:other.id}});
      const acl = await target.$queryRaw<Array<{ name: string; protected: boolean; anonwrite: boolean; readerwrite: boolean }>>`SELECT c.relname AS name,c.relrowsecurity AS protected,has_table_privilege('anon',c.oid,'INSERT, UPDATE, DELETE') AS anonwrite,has_table_privilege('institutional_reader',c.oid,'INSERT, UPDATE, DELETE') AS readerwrite FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind='r'`;
      assert.equal(acl.length,10);assert.ok(acl.every(table=>table.protected && !table.anonwrite && !table.readerwrite));
      await db.team.delete({where:{id:team.id}});assert.equal(await reader.project.count(),0);assert.equal(await reader.galleryImage.count(),0);
      await db.$disconnect();
      console.log('Banco institucional isolado: CRUD de todos os modelos, RLS, leitura pública restrita, mensagens privadas e cascatas passaram.');
    } finally {
      if (platformClient) {
        if(publicProjectId) await platformClient.projectDetails.deleteMany({where:{institutionalProjectId:publicProjectId}});
        if(accountId) await platformClient.member.deleteMany({where:{id:accountId}});
        await platformClient.$disconnect();
      }
    if (institutionalClient) await institutionalClient.$disconnect();
    for(const connection of connections) await connection.$disconnect();
    if(created) await owner.$executeRawUnsafe(`DROP DATABASE "${name}" WITH (FORCE)`);
    await owner.$disconnect();fs.rmSync(secretsFile,{force:true});
  }
}
main().catch(error=>{console.error(error);process.exitCode=1;});
