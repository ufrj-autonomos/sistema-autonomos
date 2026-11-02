import fs from 'node:fs';
import { randomBytes } from 'node:crypto';
import { PrismaClient } from '../../src/generated/institutional';

// Run with INSTITUTIONAL_OWNER_DATABASE_URL, never install owner credentials in the public site.
async function main() {
  const owner = process.env.INSTITUTIONAL_OWNER_DATABASE_URL;
  if (!owner) throw new Error('Defina INSTITUTIONAL_OWNER_DATABASE_URL somente para o provisionamento.');
  const ownerUrl = new URL(owner); if (!['localhost','127.0.0.1','[::1]'].includes(ownerUrl.hostname)) ownerUrl.searchParams.set('sslmode', 'require');
  const db = new PrismaClient({ datasourceUrl: ownerUrl.toString() });
  const secretsFile = process.env.INSTITUTIONAL_ROLE_SECRETS_FILE || '.backups/institutional-roles.json';
  const secrets = fs.existsSync(secretsFile) ? JSON.parse(fs.readFileSync(secretsFile, 'utf8')) : { reader: randomBytes(32).toString('hex'), editor: randomBytes(32).toString('hex') };
  if (![secrets.reader, secrets.editor].every(value => /^[a-f0-9]{64}$/.test(value))) throw new Error('Arquivo de credenciais inválido.');
  fs.mkdirSync(secretsFile.slice(0, secretsFile.lastIndexOf('/')) || '.', { recursive: true, mode: 0o700 });
  fs.writeFileSync(secretsFile, JSON.stringify(secrets), { mode: 0o600 });
  const tables = ['Team','Project','Member','Sponsor','Competition','TimelineEvent','GalleryImage','Model3D','SiteSettings','ContactMessage'];
  try {
    await db.$transaction(async tx => {
      for (const [role, password] of [['institutional_reader', secrets.reader], ['institutional_editor', secrets.editor]]) {
        await tx.$executeRawUnsafe(`DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='${role}') THEN CREATE ROLE ${role} LOGIN; END IF; END $$`);
        await tx.$executeRawUnsafe(`ALTER ROLE ${role} WITH LOGIN NOCREATEDB NOCREATEROLE NOINHERIT PASSWORD '${password}'`);
        await tx.$executeRawUnsafe(`GRANT USAGE ON SCHEMA public TO ${role}`);
      }
      const privileges = await tx.$queryRaw<Array<{ rolsuper: boolean; rolbypassrls: boolean; rolcreaterole: boolean }>>`SELECT rolsuper,rolbypassrls,rolcreaterole FROM pg_roles WHERE rolname IN ('institutional_reader','institutional_editor')`;
      if (privileges.some(role => role.rolsuper || role.rolbypassrls || role.rolcreaterole)) throw new Error('Os papéis institucionais não podem ter privilégios elevados.');
      await tx.$executeRawUnsafe('ALTER ROLE institutional_reader SET default_transaction_read_only = on');
      for (const table of tables) {
        await tx.$executeRawUnsafe(`ALTER TABLE public."${table}" ENABLE ROW LEVEL SECURITY`);
        await tx.$executeRawUnsafe(`REVOKE ALL ON public."${table}" FROM PUBLIC, anon, authenticated, institutional_reader, institutional_editor`);
        await tx.$executeRawUnsafe(`GRANT SELECT, INSERT, UPDATE, DELETE ON public."${table}" TO institutional_editor`);
        await tx.$executeRawUnsafe(`DROP POLICY IF EXISTS institutional_editor_access ON public."${table}"`);
        await tx.$executeRawUnsafe(`CREATE POLICY institutional_editor_access ON public."${table}" FOR ALL TO institutional_editor USING (true) WITH CHECK (true)`);
        if (table !== 'ContactMessage') {
          await tx.$executeRawUnsafe(`GRANT SELECT ON public."${table}" TO institutional_reader`);
          await tx.$executeRawUnsafe(`DROP POLICY IF EXISTS institutional_reader_access ON public."${table}"`);
          await tx.$executeRawUnsafe(`CREATE POLICY institutional_reader_access ON public."${table}" FOR SELECT TO institutional_reader USING (${table === 'Member' || table === 'Project' ? '"showOnSite"' : table === 'GalleryImage' ? '"projectId" IS NULL OR EXISTS (SELECT 1 FROM public."Project" p WHERE p.id = "projectId" AND p."showOnSite")' : 'true'})`);
        }
      }
      const sequences = await tx.$queryRaw<Array<{ name: string }>>`SELECT c.relname AS name FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind='S'`;
      for (const { name } of sequences) {
        const quoted = `"${name.replaceAll('"','""')}"`;
        await tx.$executeRawUnsafe(`REVOKE ALL ON SEQUENCE public.${quoted} FROM PUBLIC, anon, authenticated, institutional_reader`);
        await tx.$executeRawUnsafe(`GRANT USAGE, SELECT ON SEQUENCE public.${quoted} TO institutional_editor`);
      }
      // Public API roles must not call SECURITY DEFINER functions to bypass table grants.
      const functions = await tx.$queryRaw<Array<{ signature: string }>>`SELECT p.oid::regprocedure::text AS signature FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.prosecdef`;
      for (const { signature } of functions) {
        if (!/^[\w"., ()\[\]]+$/.test(signature)) throw new Error('Revise a função privilegiada antes do provisionamento.');
        await tx.$executeRawUnsafe(`REVOKE EXECUTE ON FUNCTION ${signature} FROM PUBLIC, anon, authenticated, institutional_reader`);
      }
    }, { timeout: 120000 });
    console.log('Papéis institucional_reader/editor e RLS configurados; nenhum conteúdo foi alterado.');
  } finally { await db.$disconnect(); }
}
main().catch(error => { console.error(error instanceof Error ? error.name + ': provisionamento não concluído' : 'Falha no provisionamento'); console.error('Code:', (error as {code?:string})?.code); const detail = (error as { meta?: { code?: string; message?: string; error?: string } })?.meta; if (detail) console.error(String(detail.code || '') + ': ' + String(detail.message || detail.error || '').replace(/postgres(?:ql)?:\/\/[^\s]+/g,'[conexão privada]').replace(/[a-f0-9]{64}/g,'[segredo privado]')); process.exitCode = 1; });
