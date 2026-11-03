import { timingSafeEqual } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { syncAllMemberBirthdays } from '@/lib/birthdays';
import { syncAllMissingTranslations } from '@/lib/translation';

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
    const operations: Promise<unknown>[] = [
      prisma.session.deleteMany({ where: { expiresAt: { lte: now } } }),
      prisma.authRateLimit.deleteMany({ where: { expiresAt: { lte: now } } }),
    ];
    if ('authChallenge' in prisma && typeof (prisma as any).authChallenge?.deleteMany === 'function') {
      operations.push((prisma as any).authChallenge.deleteMany({ where: { expiresAt: { lte: now } } }));
    }
    const [sessions, rateLimits] = await prisma.$transaction(operations as any);

    let birthdayUpdates = 0;
    try {
      const bdays = await syncAllMemberBirthdays(now);
      birthdayUpdates = bdays.updatedCount;
    } catch (bdayError) {
      console.warn('Aviso na atualização de aniversários no cron:', bdayError);
    }

    let translationStats = { updatedMembers: 0, pendingMembers: 0, updatedProjects: 0, pendingProjects: 0 };
    try {
      translationStats = await syncAllMissingTranslations({ delayMs: 1200 });
    } catch (transError) {
      console.warn('Aviso na sincronização de traduções pendentes no cron:', transError);
    }

    return NextResponse.json(
      {
        success: true,
        removedSessions: (sessions as { count: number }).count,
        removedRateLimits: (rateLimits as { count: number }).count,
        updatedBirthdays: birthdayUpdates,
        translatedMembers: translationStats.updatedMembers,
        translatedProjects: translationStats.updatedProjects,
        remainingPendingMembers: translationStats.pendingMembers,
        remainingPendingProjects: translationStats.pendingProjects,
      },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    console.error('Falha na manutenção de sessões:', error);
    return NextResponse.json({ error: 'Falha na manutenção.' }, { status: 503 });
  }
}
