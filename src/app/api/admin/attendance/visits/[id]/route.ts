import { NextRequest, NextResponse } from 'next/server';
import { authorizeApi } from '@/lib/session';
import { prisma } from '@/lib/prisma';
import { attendanceFailure, attendanceHeaders } from '@/lib/attendance/http';
export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const access = await authorizeApi(req, true);
    if (access.error) return access.error;
    const { id } = await context.params;
    const audits = await prisma.attendanceAudit.findMany({ where: { visitId: id }, select: { id: true, action: true, reason: true, before: true, after: true, createdAt: true, actor: { select: { name: true } } }, orderBy: { createdAt: 'desc' } });
    return NextResponse.json({ audits }, { headers: attendanceHeaders });
  } catch (error) { return attendanceFailure(error); }
}
