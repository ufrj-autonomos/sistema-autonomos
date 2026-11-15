import { traceApi } from '@/lib/activity/server';
import { NextRequest, NextResponse } from 'next/server';
import { authorizeApi, safeUserSelect } from '@/lib/session';
import { prisma } from '@/lib/prisma';
import { db as institutionalDb } from '@/lib/institutional/db';
import { isProfessorAdvisor } from '@/lib/member-fields';

export async function GET(req: NextRequest) {
  return traceApi(req, "GET /api/admin/users", async () => {
  try {
    const access = await authorizeApi(req, true);
    if (access.error) return access.error;
    const [rawUsers, instRows] = await Promise.all([
      prisma.member.findMany({
        where: {
          status: { not: 'REJECTED' },
          active: true,
          email: { not: null },
        },
        select: { ...safeUserSelect, createdAt: true },
        orderBy: { createdAt: 'desc' },
      }),
      process.env.INSTITUTIONAL_DATABASE_URL
        ? institutionalDb.institutionalMember.findMany({
            select: { id: true, role: true, area: true, active: true },
          }).catch(() => [] as Array<{ id: number; role: string; area: string; active: boolean }>)
        : Promise.resolve([] as Array<{ id: number; role: string; area: string; active: boolean }>),
    ]);
    const instMap = new Map(instRows.map((row) => [row.id, row]));
    const users = rawUsers.filter((u) => {
      if (isProfessorAdvisor(u)) return false;
      const inst = u.institutionalMemberId ? instMap.get(u.institutionalMemberId) : undefined;
      if (inst && (!inst.active || isProfessorAdvisor(inst))) return false;
      return true;
    });
    return NextResponse.json({ users }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    console.error('Erro ao listar contas:', error);
    return NextResponse.json({ error: 'Não foi possível carregar as contas. Tente novamente.' }, { status: 500 });
  }

  });
}
