import { NextRequest, NextResponse } from 'next/server';
import { traceApi } from '@/lib/activity/server';
import { authorizeApi } from '@/lib/session';
import { getManagementPendencies } from '@/lib/management-pendencies';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  return traceApi(req, 'GET /api/gestao/pendencies', async () => {
    const access = await authorizeApi(req, true);
    if (access.error) return access.error;

    const summary = await getManagementPendencies(access.user);
    return NextResponse.json(summary);
  });
}
