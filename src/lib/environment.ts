export function getAppOrigin(): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL;
  if (!configured) {
    if (process.env.NODE_ENV !== 'production') return 'http://localhost:3000';
    throw new Error('Configure NEXT_PUBLIC_APP_URL com o endereço HTTPS da plataforma.');
  }
  const url = new URL(configured);
  if (url.username || url.password || url.pathname !== '/' || url.search || url.hash) {
    throw new Error('NEXT_PUBLIC_APP_URL deve conter apenas a origem da plataforma.');
  }
  if (process.env.NODE_ENV === 'production' && url.protocol !== 'https:') {
    throw new Error('O endereço de produção deve usar HTTPS.');
  }
  if (!['https:', 'http:'].includes(url.protocol)) throw new Error('Protocolo de endereço inválido.');
  return url.origin;
}

export function allowedRequestOrigins(): string[] {
  const origins = [getAppOrigin()];
  // Vercel supplies this server-side deployment URL for preview/production deployments.
  if (process.env.VERCEL === '1' && process.env.VERCEL_URL) {
    origins.push(new URL(`https://${process.env.VERCEL_URL}`).origin);
  }
  return origins;
}
