import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/session';
import { prisma } from '@/lib/prisma';
import { canUserManageMeetings } from '@/lib/meetings/service';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser(req);
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    const { id } = await params;
    const meeting = await prisma.meeting.findUnique({ where: { id } });
    if (!meeting) return NextResponse.json({ error: 'Reunião não encontrada.' }, { status: 404 });

    if (!canUserManageMeetings(user, meeting.teamId)) {
      return NextResponse.json({ error: 'Acesso negado para editar reuniões desta equipe.' }, { status: 403 });
    }

    const body = await req.json();
    const { title, date, description } = body;

    const data: Record<string, unknown> = {};
    if (title) data.title = title;
    if (date) data.date = new Date(date);
    if (description !== undefined) data.description = description;

    const updated = await prisma.meeting.update({
      where: { id },
      data,
    });

    return NextResponse.json({ success: true, meeting: updated });
  } catch (error) {
    console.error('Erro ao atualizar reunião:', error);
    return NextResponse.json({ error: 'Erro ao atualizar reunião.' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser(req);
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    const { id } = await params;
    const meeting = await prisma.meeting.findUnique({ where: { id } });
    if (!meeting) return NextResponse.json({ error: 'Reunião não encontrada.' }, { status: 404 });

    if (!canUserManageMeetings(user, meeting.teamId)) {
      return NextResponse.json({ error: 'Acesso negado para excluir reuniões desta equipe.' }, { status: 403 });
    }

    await prisma.meeting.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erro ao excluir reunião:', error);
    return NextResponse.json({ error: 'Erro ao excluir reunião.' }, { status: 500 });
  }
}

