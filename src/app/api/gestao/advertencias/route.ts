import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/session';
import { prisma } from '@/lib/prisma';
import { db as institutionalDb } from '@/lib/institutional/db';
import {
  canUserManageDisciplinary,
  getDisciplinaryDashboardData,
} from '@/lib/disciplinary/service';
import type { DisciplinaryWarningType } from '@prisma/client';

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

    const isDirectExpulsion = type === 'EXPULSAO_DIRETA';
    const validTypes = ['AVISO', 'ADVERTENCIA_DIRETA', 'EXPULSAO_DIRETA'];
    if (!validTypes.includes(type)) {
      return NextResponse.json({ error: 'Tipo de ocorrência inválido.' }, { status: 400 });
    }

    // Verificar se o membro alvo existe
    const targetMember = await prisma.member.findUnique({
      where: { id: memberId },
      select: { id: true, name: true, teamId: true, institutionalMemberId: true },
    });

    if (!targetMember) {
      return NextResponse.json({ error: 'Integrante não encontrado.' }, { status: 404 });
    }

    // Coordenador só pode dar advertência a integrantes da sua equipe
    if (!canUserManageDisciplinary(user, targetMember.teamId)) {
      return NextResponse.json({ error: 'Coordenadores só podem registrar ocorrências para membros da sua própria equipe.' }, { status: 403 });
    }

    const created = await prisma.disciplinaryWarning.create({
      data: {
        memberId,
        type: isDirectExpulsion ? 'ADVERTENCIA_DIRETA' : (type as DisciplinaryWarningType),
        reason: isDirectExpulsion ? `[EXPULSÃO DIRETA] ${reason.trim()}` : reason.trim(),
        notes: notes ? notes.trim() : null,
        issuedById: user.id,
      },
      include: {
        member: { select: { id: true, name: true, area: true } },
        issuedBy: { select: { id: true, name: true } },
      },
    });

    if (isDirectExpulsion) {
      const now = new Date();
      await prisma.member.update({
        where: { id: memberId },
        data: {
          active: false,
          inactivatedAt: now,
          inactivationReason: `Expulsão: ${reason.trim()}`,
        },
      });

      if (targetMember.institutionalMemberId && process.env.INSTITUTIONAL_DATABASE_URL) {
        try {
          await institutionalDb.institutionalMember.update({
            where: { id: targetMember.institutionalMemberId },
            data: {
              active: false,
              leftYear: String(now.getFullYear()),
            },
          });
        } catch (instError) {
          console.warn('Falha ao atualizar status de inativação no banco institucional:', instError);
        }
      }
    }

    return NextResponse.json({ success: true, expelled: isDirectExpulsion, warning: created }, { status: 201 });
  } catch (error) {
    console.error('Erro ao registrar ocorrência disciplinar:', error);
    return NextResponse.json({ error: 'Erro interno ao registrar ocorrência.' }, { status: 500 });
  }
}

