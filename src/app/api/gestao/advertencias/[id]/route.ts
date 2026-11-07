import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/session';
import { prisma } from '@/lib/prisma';
import { canUserManageDisciplinary } from '@/lib/disciplinary/service';

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser(req);
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

    const { id } = await params;
    const warning = await prisma.disciplinaryWarning.findUnique({
      where: { id },
      include: {
        member: { select: { teamId: true } },
      },
    });

    if (!warning) {
      return NextResponse.json({ error: 'Ocorrência não encontrada.' }, { status: 404 });
    }

    if (!canUserManageDisciplinary(user, warning.member.teamId)) {
      return NextResponse.json({ error: 'Você não tem permissão para remover esta ocorrência.' }, { status: 403 });
    }

    await prisma.disciplinaryWarning.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erro ao excluir ocorrência disciplinar:', error);
    return NextResponse.json({ error: 'Erro ao excluir ocorrência.' }, { status: 500 });
  }
}

