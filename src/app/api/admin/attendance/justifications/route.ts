import { NextRequest, NextResponse } from 'next/server';
import { authorizeApi } from '@/lib/session';
import { traceApi } from '@/lib/activity/server';
import { activityTarget } from '@/lib/activity/context';
import { listJustifications, reviewJustification } from '@/lib/attendance/justifications';
import { attendanceFailure, attendanceHeaders } from '@/lib/attendance/http';
export async function GET(req: NextRequest) {
  try {
    const access = await authorizeApi(req, true);
    if (access.error) return access.error;
    return NextResponse.json(await listJustifications(req.nextUrl.searchParams), { headers: attendanceHeaders });
  } catch (error) { return attendanceFailure(error); }
}
export async function PATCH(req: NextRequest) {
  return traceApi(req, 'PATCH /api/admin/attendance/justifications', async () => {
    try {
      const access = await authorizeApi(req, true);
      if (access.error) return access.error;
      const input = await req.json().catch(() => null);
      const result = await reviewJustification(access.user.id, input);
      activityTarget(`/gestao/presenca`, 'justification');
      return NextResponse.json({ success: true, id: result.id, status: result.status }, { headers: attendanceHeaders });
    } catch (error) { return attendanceFailure(error); }
  });
}
