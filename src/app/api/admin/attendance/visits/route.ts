import { traceApi } from '@/lib/activity/server';
import { NextRequest, NextResponse } from 'next/server';
import { authorizeApi } from '@/lib/session';
import { readAuthPayload } from '@/lib/auth-request';
import { manageAttendanceVisit } from '@/lib/attendance/service';
import { attendanceFailure, attendanceHeaders } from '@/lib/attendance/http';
export async function POST(req: NextRequest) {
  return traceApi(req, "POST /api/admin/attendance/visits", async () => {
  try {
    const access = await authorizeApi(req, true);
    if (access.error) return access.error;
    const payload = await readAuthPayload(req);
    if (payload.error) return payload.error;
    const visit = await manageAttendanceVisit(access.user.id, payload.body);
    return NextResponse.json({ visit }, { headers: attendanceHeaders });
  } catch (error) { return attendanceFailure(error); }

  });
}
