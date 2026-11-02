import { createHmac } from 'node:crypto';
import { isIP } from 'node:net';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from './prisma';

function bucketKey(identifier: string) {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) throw new Error('Chave de sessão não configurada.');
  return createHmac('sha256', secret).update(identifier).digest('hex');
}

export function clientAddress(req: NextRequest): string {
  // Do not trust client-supplied forwarding headers outside a trusted reverse proxy.
  if (process.env.VERCEL !== '1' && process.env.TRUST_PROXY_HEADERS !== 'true') return 'shared';
  const forwarded = process.env.VERCEL === '1'
    ? req.headers.get('x-vercel-forwarded-for') || req.headers.get('x-forwarded-for')
    : req.headers.get('x-forwarded-for');
  const address = forwarded?.split(',')[0]?.trim();
  return address && isIP(address) ? address : 'shared';
}

export async function checkRateLimit(identifier: string, limit: number, windowSeconds: number) {
  const key = bucketKey(identifier);
  // This single statement serializes increments in PostgreSQL across every app instance.
  const [bucket] = await prisma.$queryRaw<Array<{ attempts: number; expiresAt: Date }>>`
    INSERT INTO "AuthRateLimit" ("key", "attempts", "expiresAt")
    VALUES (${key}, 1, NOW() + ${windowSeconds} * INTERVAL '1 second')
    ON CONFLICT ("key") DO UPDATE SET
      "attempts" = CASE WHEN "AuthRateLimit"."expiresAt" <= NOW()
        THEN 1 ELSE LEAST("AuthRateLimit"."attempts" + 1, ${limit + 1}) END,
      "expiresAt" = CASE WHEN "AuthRateLimit"."expiresAt" <= NOW()
        THEN NOW() + ${windowSeconds} * INTERVAL '1 second' ELSE "AuthRateLimit"."expiresAt" END
    RETURNING "attempts", "expiresAt"
  `;
  if (!bucket) throw new Error('Não foi possível verificar o limite de tentativas.');
  if (bucket.attempts <= limit) return null;
  const retryAfter = Math.max(1, Math.ceil((bucket.expiresAt.getTime() - Date.now()) / 1000));
  return NextResponse.json({ error: 'Muitas tentativas. Aguarde alguns minutos antes de tentar novamente.', retryAfter }, {
    status: 429,
    headers: { 'Retry-After': String(retryAfter), 'Cache-Control': 'no-store' },
  });
}

export async function resetRateLimit(identifier: string) {
  await prisma.authRateLimit.deleteMany({ where: { key: bucketKey(identifier) } });
}
