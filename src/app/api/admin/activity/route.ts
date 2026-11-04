import { NextRequest, NextResponse } from 'next/server';
import { authorizeAdminApi } from '@/lib/session';
import { activityLogs } from '@/lib/activity/query';
import { logFilters } from '@/lib/activity/input';
import { traceApi } from '@/lib/activity/server';
export async function GET(req: NextRequest) {
  return traceApi(req, 'GET /api/admin/activity', async () => {
    const access = await authorizeAdminApi(req);
    if (access.error) return access.error;
    let filters;
    try { filters = logFilters(req.nextUrl.searchParams); } catch { return NextResponse.json({ error: 'Filtros inválidos.' }, { status: 400 }); }
    try { return NextResponse.json(await activityLogs(filters), { headers: { 'Cache-Control': 'private, no-store' } }); }
    catch { return NextResponse.json({ error: 'Não foi possível consultar os logs.' }, { status: 503 }); }
  });
}
