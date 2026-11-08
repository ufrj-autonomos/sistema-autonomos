import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/session';
import { prisma } from '@/lib/prisma';
import { canUserManageMeetings, getMeetingsDashboardData, KNOWN_AREAS } from '@/lib/meetings/service';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const period = searchParams.get('period') || '26.2';

    const data = await getMeetingsDashboardData(user, period);
    return NextResponse.json(data, { headers: { 'Cache-Control': 'private, no-store' } });
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

    if (!canUserManageMeetings(user, normalizedTeamId)) {
      return NextResponse.json({ error: 'Acesso negado. Você não tem permissão para gerenciar reuniões nesta equipe.' }, { status: 403 });
    }

    if (typeof title !== 'string' || !title.trim() || title.length > 200 || typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date) || parsedDate.toISOString().slice(0, 10) !== date || typeof period !== 'string' || !/^[a-z0-9_.-]{1,24}$/i.test(period) || !KNOWN_AREAS.some(item => item.area === area && item.teamId === normalizedTeamId) || (description !== undefined && (typeof description !== 'string' || description.length > 5000))) return NextResponse.json({ error: 'Confira o título, a data, a área e a equipe da reunião.' }, { status: 400 });

    // 1. Criar a reunião
    const meeting = await prisma.$transaction(async tx => {
    const created = await tx.meeting.create({
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
    const areaMembers = await tx.member.findMany({
      where: {
        active: true,
        status: 'APPROVED',
        ...(normalizedTeamId !== null ? { teamId: normalizedTeamId } : { teamId: null }),
        area: { contains: area, mode: 'insensitive' },
      },
      select: { id: true },
    });

    if (areaMembers.length > 0) {
      await tx.meetingAttendance.createMany({
        data: areaMembers.map((m) => ({
          meetingId: created.id,
          memberId: m.id,
          status: 'NOT_A_MEMBER',
        })),
        skipDuplicates: true,
      });
    }

    return created;
    });
    return NextResponse.json({ success: true, meeting });
  } catch (error) {
    console.error('Erro ao criar reunião:', error);
    return NextResponse.json({ error: 'Erro ao criar reunião.' }, { status: 500 });
  }
}

