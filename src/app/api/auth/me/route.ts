import { traceApi } from '@/lib/activity/server';
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/session';

export async function GET(req: NextRequest) {
  return traceApi(req, "GET /api/auth/me", async () => {
  try {
    const user = await getCurrentUser(req);
    return NextResponse.json({ authenticated: Boolean(user), user }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    console.error('Erro em /api/auth/me:', error);
    return NextResponse.json({ authenticated: false, user: null }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }

  });
}
