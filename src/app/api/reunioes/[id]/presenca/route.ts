import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/session';
import { prisma } from '@/lib/prisma';
import { canUserManageMeetings } from '@/lib/meetings/service';
import type { MeetingAttendanceStatus } from '@prisma/client';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser(req);
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    const { id: meetingId } = await params;
    const meeting = await prisma.meeting.findUnique({ where: { id: meetingId } });
    if (!meeting) return NextResponse.json({ error: 'Reunião não encontrada.' }, { status: 404 });

    if (!canUserManageMeetings(user, meeting.teamId)) {
      return NextResponse.json({ error: 'Você não tem permissão para alterar presenças em reuniões desta equipe.' }, { status: 403 });
    }

    const body = await req.json();
    const { memberId, status, notes } = body;

    if (!memberId || !status) {
      return NextResponse.json({ error: 'memberId e status são obrigatórios.' }, { status: 400 });
    }

    const validStatuses: MeetingAttendanceStatus[] = ['PRESENT', 'ABSENT', 'JUSTIFIED', 'LATE', 'NO_MEETING', 'NOT_A_MEMBER'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: 'Status de presença inválido.' }, { status: 400 });
    }

    const attendance = await prisma.meetingAttendance.upsert({
      where: {
        meetingId_memberId: {
          meetingId,
          memberId,
        },
      },
      update: {
        status,
        ...(notes !== undefined ? { notes } : {}),
      },
      create: {
        meetingId,
        memberId,
        status,
        notes: notes || null,
      },
    });

    return NextResponse.json({ success: true, attendance });
  } catch (error) {
    console.error('Erro ao atualizar presença na reunião:', error);
    return NextResponse.json({ error: 'Erro ao atualizar presença.' }, { status: 500 });
  }
}

