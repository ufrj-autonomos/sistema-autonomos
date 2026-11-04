import { NextRequest, NextResponse } from 'next/server';
import { authorizeApi } from '@/lib/session';
import { checkRateLimit } from '@/lib/rate-limit';
import { prisma } from '@/lib/prisma';
import { clientEvents } from '@/lib/activity/input';
export async function POST(req: NextRequest) {
  const access = await authorizeApi(req);
  if (access.error) return access.error;
  const length = Number(req.headers.get('content-length') || '0');
  if (length > 16384) return NextResponse.json({ error: 'Lote muito grande.' }, { status: 413 });
  const text = await req.text();
  if (Buffer.byteLength(text) > 16384) return NextResponse.json({ error: 'Lote muito grande.' }, { status: 413 });
  let events;
  try { events = clientEvents(JSON.parse(text)); } catch { return NextResponse.json({ error: 'Eventos inválidos.' }, { status: 400 }); }
  const blocked = await checkRateLimit(`activity:${access.user.id}`, 30, 60);
  if (blocked) return blocked;
  try {
    await prisma.activityLog.createMany({ data: events.map(event => ({ ...event, actorId: access.user.id, actorName: access.user.name.slice(0, 200), actorRole: access.user.role })), skipDuplicates: true });
    return new NextResponse(null, { status: 204 });
  } catch { return NextResponse.json({ error: 'Não foi possível registrar a atividade.' }, { status: 503 }); }
}
