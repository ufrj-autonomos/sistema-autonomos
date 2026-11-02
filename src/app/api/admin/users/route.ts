import { NextRequest, NextResponse } from 'next/server';
import { authorizeApi, safeUserSelect } from '@/lib/session';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const access = await authorizeApi(req, true);
    if (access.error) return access.error;
    const users = await prisma.user.findMany({ select: { ...safeUserSelect, createdAt: true }, orderBy: { createdAt: 'desc' } });
    return NextResponse.json({ users }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    console.error('Erro ao listar contas:', error);
    return NextResponse.json({ error: 'Não foi possível carregar as contas. Tente novamente.' }, { status: 500 });
  }
}
