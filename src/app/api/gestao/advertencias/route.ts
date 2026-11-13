import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/session';
import { prisma } from '@/lib/prisma';
import {
  canUserManageDisciplinary,
  getDisciplinaryDashboardData,
} from '@/lib/disciplinary/service';
import { issueDisciplinaryOccurrence, type OccurrenceInputType } from '@/lib/disciplinary/issue';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

    if (!canUserManageDisciplinary(user)) {
      return NextResponse.json({ error: 'Acesso restrito à gestão e coordenação.' }, { status: 403 });
    }

    const data = await getDisciplinaryDashboardData(user);
    return NextResponse.json(data);
  } catch (error) {
    console.error('Erro ao buscar dados disciplinares:', error);
    return NextResponse.json({ error: 'Erro ao carregar dados disciplinares.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

    if (!canUserManageDisciplinary(user)) {
      return NextResponse.json({ error: 'Apenas coordenadores, gestão e admin podem registrar advertências.' }, { status: 403 });
    }

    const body = await req.json();
    const { memberId, type, reason, notes } = body;

    if (!memberId || !type || !reason) {
      return NextResponse.json({ error: 'Membro, tipo e motivo são obrigatórios.' }, { status: 400 });
    }

    const validTypes = ['AVISO', 'ADVERTENCIA_DIRETA', 'EXPULSAO_DIRETA'];
    if (!validTypes.includes(type)) {
      return NextResponse.json({ error: 'Tipo de ocorrência inválido.' }, { status: 400 });
    }

    // Verificar se o membro alvo existe
    const targetMember = await prisma.member.findUnique({
      where: { id: memberId },
      select: { id: true, name: true, teamId: true },
    });

    if (!targetMember) {
      return NextResponse.json({ error: 'Integrante não encontrado.' }, { status: 404 });
    }

    // Coordenador só pode dar advertência a integrantes da sua equipe
    if (!canUserManageDisciplinary(user, targetMember.teamId)) {
      return NextResponse.json({ error: 'Coordenadores só podem registrar ocorrências para membros da sua própria equipe.' }, { status: 403 });
    }

    const result = await issueDisciplinaryOccurrence({
      memberId,
      type: type as OccurrenceInputType,
      reason,
      notes,
      issuedById: user.id,
    });

    return NextResponse.json(
      {
        success: true,
        expelled: result.expelled,
        autoExpelled: result.autoExpelled,
        warning: result.warning,
        summary: result.summary,
        emailSent: result.emailResult.sent,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Erro ao registrar ocorrência disciplinar:', error);
    return NextResponse.json({ error: 'Erro interno ao registrar ocorrência.' }, { status: 500 });
  }
}

