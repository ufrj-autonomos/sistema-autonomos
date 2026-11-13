import { NextRequest, NextResponse } from 'next/server';
import { traceApi } from '@/lib/activity/server';
import { authorizeApi } from '@/lib/session';
import { attendanceFailure, attendanceHeaders } from '@/lib/attendance/http';
import { listVacationWeeks, setVacationWeekState } from '@/lib/attendance/vacations';

export async function GET(req: NextRequest) {
  return traceApi(req, 'GET /api/admin/attendance/vacations', async () => {
    try {
      const access = await authorizeApi(req, true);
      if (access.error) return access.error;
      const vacations = await listVacationWeeks();
      return NextResponse.json({ vacations }, { headers: attendanceHeaders });
    } catch (error) {
      return attendanceFailure(error);
    }
  });
}

export async function POST(req: NextRequest) {
  return traceApi(req, 'POST /api/admin/attendance/vacations', async () => {
    try {
      const access = await authorizeApi(req, true);
      if (access.error) return access.error;

      const body = (await req.json().catch(() => null)) as
        | { weekStartsOn?: unknown; weeks?: unknown; isVacation?: unknown; label?: unknown }
        | null;

      if (!body || typeof body !== 'object') {
        return NextResponse.json({ error: 'Payload inválido.' }, { status: 400 });
      }

      const isVacation = body.isVacation !== false;
      const label = typeof body.label === 'string' ? body.label : undefined;

      const rawWeeks = Array.isArray(body.weeks)
        ? body.weeks.filter((w): w is string => typeof w === 'string')
        : typeof body.weekStartsOn === 'string'
          ? [body.weekStartsOn]
          : [];

      if (rawWeeks.length === 0) {
        return NextResponse.json({ error: 'Informe ao menos uma semana.' }, { status: 400 });
      }

      const updated = [];
      for (const week of rawWeeks.slice(0, 20)) {
        updated.push(
          await setVacationWeekState({
            dateOrWeekKey: week,
            isVacation,
            label,
            actorId: access.user.id,
          })
        );
      }

      const vacations = await listVacationWeeks();
      return NextResponse.json({ updated, vacations }, { headers: attendanceHeaders });
    } catch (error) {
      return attendanceFailure(error);
    }
  });
}
