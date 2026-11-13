import { timingSafeEqual } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { runAttendanceAlertsAndAutoPunishments } from '@/lib/attendance/alerts';

export const dynamic = 'force-dynamic';

function isAuthorizedCron(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  const authHeader = req.headers.get('authorization') || '';
  const prefix = 'Bearer ';
  if (!authHeader.startsWith(prefix)) return false;
  const provided = authHeader.slice(prefix.length).trim();
  const a = Buffer.from(provided, 'utf8');
  const b = Buffer.from(secret, 'utf8');
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function GET(req: NextRequest) {
  if (!isAuthorizedCron(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await runAttendanceAlertsAndAutoPunishments();
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error('[cron/attendance-alerts] Erro ao executar rotina de alertas:', error);
    return NextResponse.json({ error: 'Erro interno na rotina de presença.' }, { status: 500 });
  }
}
