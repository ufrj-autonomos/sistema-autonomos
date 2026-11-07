import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/session';
import { prisma } from '@/lib/prisma';
import { canUserManageMeetings } from '@/lib/meetings/service';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser(req);
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    if (!canUserManageMeetings(user)) {
      return NextResponse.json({ error: 'Apenas ADMIN pode editar reuniões.' }, { status: 403 });
    }

    const { id } = await params;
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
    if (!canUserManageMeetings(user)) {
      return NextResponse.json({ error: 'Apenas ADMIN pode excluir reuniões.' }, { status: 403 });
    }

    const { id } = await params;
    await prisma.meeting.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erro ao excluir reunião:', error);
    return NextResponse.json({ error: 'Erro ao excluir reunião.' }, { status: 500 });
  }
}

