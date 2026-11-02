import fs from 'node:fs';
import path from 'node:path';
import { loadEnvConfig } from '@next/env';
import { PrismaClient } from '../../src/generated/institutional';

loadEnvConfig(process.cwd());
async function main() {
  const url = process.env.INSTITUTIONAL_OWNER_DATABASE_URL;
  if (!url) throw new Error('Defina INSTITUTIONAL_OWNER_DATABASE_URL para aplicar a migração institucional.');
  const db = new PrismaClient({ datasourceUrl: url });
  try {
    const sql = fs.readFileSync(path.join(process.cwd(), 'scripts/institutional/shared-directory.sql'), 'utf8');
    // Execute in a single PostgreSQL transaction; the input is a tracked SQL file.
    const statements = sql.replace(/--[^\n]*/g, '').split(';').map(part => part.trim()).filter(part => part && !['BEGIN', 'COMMIT'].includes(part));
    await db.$transaction(async tx => {
      for (const statement of statements) await tx.$executeRawUnsafe(statement);
    });
    console.log('Diretório institucional atualizado. Cadastros existentes e visibilidade preservados.');
  } finally { await db.$disconnect(); }
}
main().catch(() => { console.error('Migração institucional não concluída. Confira a conexão do proprietário e as permissões.'); process.exitCode = 1; });
