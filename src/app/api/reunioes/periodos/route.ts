import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/session';
import { listMeetingPeriods, createNewMeetingPeriod } from '@/lib/meetings/service';
import { hasManagementAccess } from '@/lib/access-policy';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    }

    const periods = await listMeetingPeriods();
    return NextResponse.json({ success: true, periods });
  } catch (error) {
    console.error('Erro ao listar períodos de reuniões:', error);
    return NextResponse.json(
      { error: 'Erro ao listar períodos de reuniões.' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    }

    if (!hasManagementAccess(user.role)) {
      return NextResponse.json(
        { error: 'Acesso negado. Apenas Coordenadores, Gestão e Administradores podem reiniciar ciclos de reuniões.' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { code, name, description } = body;

    if (!code || typeof code !== 'string' || !code.trim()) {
      return NextResponse.json(
        { error: 'O código do período é obrigatório (ex: "27.1", "2027.1").' },
        { status: 400 }
      );
    }

    const newPeriod = await createNewMeetingPeriod(user, {
      code,
      name,
      description,
    });

    return NextResponse.json({ success: true, period: newPeriod });
  } catch (error: unknown) {
    console.error('Erro ao criar novo período de reuniões:', error);
    const msg = error instanceof Error ? error.message : 'Erro ao criar novo período.';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
