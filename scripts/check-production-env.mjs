import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

const { loadEnvConfig } = createRequire(import.meta.url)('@next/env');

export function checkProductionEnvironment(env = process.env) {
  const required = ['DATABASE_URL', 'DIRECT_URL', 'JWT_SECRET', 'CRON_SECRET', 'NEXT_PUBLIC_APP_URL'];
  const errors = required.filter(key => !env[key]).map(key => `${key} não configurada`);
  for (const key of ['JWT_SECRET', 'CRON_SECRET']) {
    if (env[key] && env[key].length < 32) errors.push(`${key} deve ter pelo menos 32 caracteres aleatórios`);
  }
  for (const key of ['DATABASE_URL', 'DIRECT_URL']) {
    if (env[key]) {
      try {
        const url = new URL(env[key]);
        const placeholders = [url.hostname, url.username, url.password, url.pathname.slice(1)].some(value => /^(USER|PASSWORD|HOST|DATABASE)$/i.test(value));
        if (!['postgres:', 'postgresql:'].includes(url.protocol) || !url.hostname || !url.username || !url.password || placeholders) errors.push(`${key} inválida`);
        if (!['require', 'verify-ca', 'verify-full'].includes(url.searchParams.get('sslmode'))) errors.push(`${key} precisa de sslmode=require ou verificação de certificado`);
      } catch { errors.push(`${key} inválida`); }
    }
  }
  if (env.NEXT_PUBLIC_APP_URL) {
    try {
      const url = new URL(env.NEXT_PUBLIC_APP_URL);
      if (url.protocol !== 'https:' || url.pathname !== '/' || url.username || url.password || url.search || url.hash) errors.push('NEXT_PUBLIC_APP_URL precisa ser uma origem HTTPS, sem caminho');
    } catch { errors.push('NEXT_PUBLIC_APP_URL inválida'); }
  }
  if (env.SEED_DEMO_USERS === 'true') errors.push('SEED_DEMO_USERS deve estar desativada');
  if (env.NODE_ENV && env.NODE_ENV !== 'production') errors.push('NODE_ENV deve ser production');
  if (errors.length) throw new Error(errors.join('\n'));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  loadEnvConfig(process.cwd(), false);
  try { checkProductionEnvironment(); console.log('Configuração de produção validada. Nenhum segredo foi exibido.'); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
