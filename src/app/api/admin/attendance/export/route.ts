import { NextRequest, NextResponse } from 'next/server';
import { authorizeApi } from '@/lib/session';
import { attendanceCsv, attendanceReport, selectedWeek } from '@/lib/attendance/service';
import { attendanceFailure, attendanceHeaders } from '@/lib/attendance/http';
export async function GET(req: NextRequest) {
  try {
    const access = await authorizeApi(req, true);
    if (access.error) return access.error;
    const key = selectedWeek(req.nextUrl.searchParams.get('week'));
    const csv = attendanceCsv(await attendanceReport(key));
    return new NextResponse(csv, { headers: { ...attendanceHeaders, 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="presenca-${key}.csv"` } });
  } catch (error) { return attendanceFailure(error); }
}
