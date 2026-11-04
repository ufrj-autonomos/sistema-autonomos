import { traceApi } from '@/lib/activity/server';
import { NextRequest, NextResponse } from 'next/server';
import { authorizeApi } from '@/lib/session';
import { readAuthPayload } from '@/lib/auth-request';
import { checkRateLimit } from '@/lib/rate-limit';
import { registerAttendance } from '@/lib/attendance/service';
import { attendanceFailure, attendanceHeaders } from '@/lib/attendance/http';
export async function POST(req: NextRequest) {
  return traceApi(req, "POST /api/attendance/scan", async () => {
  try {
    const access = await authorizeApi(req);
    if (access.error) return access.error;
    const blocked = await checkRateLimit(`attendance:${access.user.id}`, 20, 60);
    if (blocked) return blocked;
    const payload = await readAuthPayload(req);
    if (payload.error) return payload.error;
    const result = await registerAttendance(access.user.id, payload.body);
    return NextResponse.json(result, { headers: attendanceHeaders });
  } catch (error) { return attendanceFailure(error); }

  });
}
