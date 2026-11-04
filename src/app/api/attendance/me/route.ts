import { traceApi } from '@/lib/activity/server';
import { NextRequest, NextResponse } from 'next/server';
import { authorizeApi } from '@/lib/session';
import { attendanceReport, selectedWeek } from '@/lib/attendance/service';
import { attendanceFailure, attendanceHeaders } from '@/lib/attendance/http';
export async function GET(req: NextRequest) {
  return traceApi(req, "GET /api/attendance/me", async () => {
  try {
    const access = await authorizeApi(req);
    if (access.error) return access.error;
    return NextResponse.json(await attendanceReport(selectedWeek(req.nextUrl.searchParams.get('week')), access.user.id), { headers: attendanceHeaders });
  } catch (error) { return attendanceFailure(error); }

  });
}
