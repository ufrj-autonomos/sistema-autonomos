import { NextRequest, NextResponse } from 'next/server';
import { traceApi } from '@/lib/activity/server';
import { authorizeApi } from '@/lib/session';
import { getAreasWorkspace } from '@/lib/areas/service';
import { areaHubErrorResponse } from '@/lib/areas/http';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  return traceApi(req, 'GET /api/areas', async () => {
    const access = await authorizeApi(req, false);
    if (access.error) return access.error;

    try {
      const scope = req.nextUrl.searchParams.get('scope');
      const workspace = await getAreasWorkspace(access.user, scope);
      return NextResponse.json(workspace, { headers: { 'Cache-Control': 'private, no-store' } });
    } catch (error) {
      return areaHubErrorResponse(error, 'Não foi possível carregar o espaço da área.');
    }
  });
}
