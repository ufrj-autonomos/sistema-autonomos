import { bridgeHeaders } from './bridge';
export async function publishInstitutionalSite() {
  try {
    const url = new URL('/api/institutional/revalidate', process.env.INSTITUTIONAL_SITE_URL || 'https://ufrjautonomos.com');
    if (url.protocol !== 'https:' && !['localhost','127.0.0.1'].includes(url.hostname)) throw new Error('HTTPS obrigatório');
    const body = JSON.stringify({ action: 'revalidate' });
    const response = await fetch(url, { method: 'POST', headers: bridgeHeaders(body, 'revalidate'), body, signal: AbortSignal.timeout(10000), cache: 'no-store' });
    if (!response.ok) throw new Error('Falha na atualização do cache');
    return undefined;
  } catch { return 'Dados salvos. A atualização do cache do site não foi confirmada; a publicação pode aguardar o próximo ciclo de atualização do site.'; }
}
