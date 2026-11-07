import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/session';
import { prisma } from '@/lib/prisma';
import { canUserManageMeetings, getMeetingsDashboardData } from '@/lib/meetings/service';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const period = searchParams.get('period') || '26.2';

    const data = await getMeetingsDashboardData(user, period);
    return NextResponse.json(data);
  } catch (error) {
    console.error('Erro ao buscar dados de reuniões:', error);
    return NextResponse.json({ error: 'Erro interno ao processar reuniões.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    if (!canUserManageMeetings(user)) {
      return NextResponse.json({ error: 'Acesso negado. Apenas ADMIN pode criar reuniões.' }, { status: 403 });
    }

    const body = await req.json();
    const { title, date, area, teamId, period = '26.2', description } = body;

    if (!title || !date || !area) {
      return NextResponse.json({ error: 'Título, data e área são obrigatórios.' }, { status: 400 });
    }

    const parsedDate = new Date(date);
    if (isNaN(parsedDate.getTime())) {
      return NextResponse.json({ error: 'Data inválida.' }, { status: 400 });
    }

    const normalizedTeamId = teamId === null || teamId === undefined || teamId === '' ? null : Number(teamId);

    // 1. Criar a reunião
    const meeting = await prisma.meeting.create({
      data: {
        title,
        date: parsedDate,
        area,
        teamId: normalizedTeamId,
        period,
        description,
        createdById: user.id,
      },
    });

    // 2. Buscar membros da área/equipe para inicializar presenças
    const areaMembers = await prisma.member.findMany({
      where: {
        active: true,
        ...(normalizedTeamId !== null ? { teamId: normalizedTeamId } : { teamId: null }),
        area: { contains: area, mode: 'insensitive' },
      },
      select: { id: true },
    });

    if (areaMembers.length > 0) {
      await prisma.meetingAttendance.createMany({
        data: areaMembers.map((m) => ({
          meetingId: meeting.id,
          memberId: m.id,
          status: 'PRESENT',
        })),
        skipDuplicates: true,
      });
    }

    return NextResponse.json({ success: true, meeting });
  } catch (error) {
    console.error('Erro ao criar reunião:', error);
    return NextResponse.json({ error: 'Erro ao criar reunião.' }, { status: 500 });
  }
}

