import { PrismaClient } from '@/generated/institutional';

const shared = globalThis as unknown as { institutionalDb?: PrismaClient };
function client() {
  const url = process.env.INSTITUTIONAL_DATABASE_URL;
  if (!url) throw new Error('Configure INSTITUTIONAL_DATABASE_URL para acessar o banco do site institucional.');
  if (new URL(url).username.split('.')[0] !== 'institutional_editor') throw new Error('Use o papel institutional_editor para o banco institucional.');
  return shared.institutionalDb ??= new PrismaClient({ datasourceUrl: url, log: ['error'] });
}
// Do not silently fall back to the platform database when integration is not configured.
export const db = new Proxy({} as PrismaClient, {
  get(_target, key) { const instance = client(); const value = Reflect.get(instance, key); return typeof value === 'function' ? value.bind(instance) : value; },
});
