import { timingSafeEqual } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const supplied = req.headers.get('authorization') || '';
  const expected = `Bearer ${secret}`;
  const suppliedBytes = Buffer.from(supplied);
  const expectedBytes = Buffer.from(expected);
  if (!secret || secret.length < 32 || suppliedBytes.length !== expectedBytes.length || !timingSafeEqual(suppliedBytes, expectedBytes)) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
  }
  try {
    const now = new Date();
    const [sessions, rateLimits] = await prisma.$transaction([
      prisma.session.deleteMany({ where: { expiresAt: { lte: now } } }),
      prisma.authRateLimit.deleteMany({ where: { expiresAt: { lte: now } } }),
    ]);
    return NextResponse.json({ success: true, removedSessions: sessions.count, removedRateLimits: rateLimits.count }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('Falha na manutenção de sessões:', error);
    return NextResponse.json({ error: 'Falha na manutenção.' }, { status: 503 });
  }
}
