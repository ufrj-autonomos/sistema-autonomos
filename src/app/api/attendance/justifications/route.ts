import { NextRequest, NextResponse } from 'next/server';
import { authorizeApi } from '@/lib/session';
import { traceApi } from '@/lib/activity/server';
import { activityTarget } from '@/lib/activity/context';
import { listJustifications, submitJustification } from '@/lib/attendance/justifications';
import { attendanceFailure, attendanceHeaders } from '@/lib/attendance/http';
export async function GET(req: NextRequest) {
  try {
    const access = await authorizeApi(req);
    if (access.error) return access.error;
    return NextResponse.json(await listJustifications(req.nextUrl.searchParams, access.user.id), { headers: attendanceHeaders });
  } catch (error) { return attendanceFailure(error); }
}
export async function POST(req: NextRequest) {
  return traceApi(req, 'POST /api/attendance/justifications', async () => {
    try {
      const access = await authorizeApi(req);
      if (access.error) return access.error;
      const input = await req.json().catch(() => null);
      const result = await submitJustification(access.user.id, input);
      activityTarget('/presenca', 'justification');
      return NextResponse.json({ success: true, id: result.id, status: result.status }, { status: 201, headers: attendanceHeaders });
    } catch (error) { return attendanceFailure(error); }
  });
}
