import { traceApi } from '@/lib/activity/server';
import { NextRequest, NextResponse } from 'next/server';
import { verifySessionToken } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { readSessionToken, SESSION_COOKIE_NAME, sessionCookieOptions } from '@/lib/session';

export async function POST(req: NextRequest) {
  return traceApi(req, "POST /api/auth/logout", async () => {
  try {
    const token = await readSessionToken(req);
    const payload = token ? await verifySessionToken(token) : null;
    if (typeof payload?.sid === 'string') {
      await prisma.session.deleteMany({ where: { sessionToken: payload.sid } });
    }
    const response = NextResponse.json({ success: true });
    response.cookies.set(SESSION_COOKIE_NAME, '', { ...sessionCookieOptions, maxAge: 0 });
    return response;
  } catch (error) {
    console.error('Erro ao encerrar sessão:', error);
    return NextResponse.json({ error: 'Não foi possível encerrar a sessão. Tente novamente.' }, { status: 503 });
  }

  });
}
