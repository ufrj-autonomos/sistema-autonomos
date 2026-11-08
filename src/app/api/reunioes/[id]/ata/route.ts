import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/session';
import { prisma } from '@/lib/prisma';
import { canUserManageMeetings } from '@/lib/meetings/service';
import { minutesInput, summarizeMinutes } from '@/lib/meetings/minutes';
const headers = { 'Cache-Control': 'private, no-store' };
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser(req);
    if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    const meeting = await prisma.meeting.findUnique({ where: { id: (await params).id } });
    if (!meeting) return NextResponse.json({ error: 'Reunião não encontrada.' }, { status: 404 });
    if (user.role !== 'ADMIN' && (user.teamId ?? null) !== meeting.teamId) return NextResponse.json({ error: 'Você não tem acesso a esta reunião.' }, { status: 403 });
    return NextResponse.json({ minutes: meeting.minutes, summary: meeting.minutesSummary, source: meeting.minutesSummarySource, updatedAt: meeting.minutesUpdatedAt?.toISOString() || null }, { headers });
  } catch { return NextResponse.json({ error: 'Não foi possível abrir a ata. Tente novamente.' }, { status: 503, headers }); }
}
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser(req);
    if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    const id = (await params).id;
    const meeting = await prisma.meeting.findUnique({ where: { id } });
    if (!meeting) return NextResponse.json({ error: 'Reunião não encontrada.' }, { status: 404 });
    if (!canUserManageMeetings(user, meeting.teamId)) return NextResponse.json({ error: 'Somente a coordenação desta equipe ou Admin pode adicionar a ata.' }, { status: 403 });
    let input;
    try { input = minutesInput(await req.json().catch(() => null)); } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Ata inválida.' }, { status: 400 }); }
    if ((meeting.minutesUpdatedAt?.getTime() || null) !== (input.expectedUpdatedAt?.getTime() || null)) return NextResponse.json({ error: 'Outra pessoa atualizou esta ata. Reabra a versão atual antes de salvar; seu texto continua no editor.' }, { status: 409 });
    const generated = await summarizeMinutes(input.minutes);
    const result = await prisma.meeting.updateMany({ where: { id, minutesUpdatedAt: input.expectedUpdatedAt }, data: { minutes: input.minutes, minutesSummary: generated.summary, minutesSummarySource: generated.source, minutesUpdatedAt: new Date(Math.max(Date.now(), (meeting.minutesUpdatedAt?.getTime() || 0) + 1)) } });
    if (!result.count) return NextResponse.json({ error: 'Outra pessoa atualizou esta ata. Reabra a versão atual antes de salvar; seu texto continua no editor.' }, { status: 409 });
    return NextResponse.json({ success: true }, { headers });
  } catch { return NextResponse.json({ error: 'Não foi possível salvar a ata. Seu texto continua no editor. Tente novamente.' }, { status: 503, headers }); }
}
