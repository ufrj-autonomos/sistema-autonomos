import { traceApi } from '@/lib/activity/server';
import { NextRequest, NextResponse } from 'next/server';
import { authorizeApi } from '@/lib/session';
import { attendanceReport, selectedWeek } from '@/lib/attendance/service';
import { attendanceFailure, attendanceHeaders } from '@/lib/attendance/http';
export async function GET(req: NextRequest) {
  return traceApi(req, "GET /api/admin/attendance", async () => {
  try {
    const access = await authorizeApi(req, true);
    if (access.error) return access.error;
    return NextResponse.json(await attendanceReport(selectedWeek(req.nextUrl.searchParams.get('week'))), { headers: attendanceHeaders });
  } catch (error) { return attendanceFailure(error); }

  });
}
