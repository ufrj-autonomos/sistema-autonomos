import { NextRequest, NextResponse } from 'next/server';
import { traceApi } from '@/lib/activity/server';
import { getEvaluationsWorkspace } from '@/lib/evaluations/service';
import { authorizeEvaluationsApi, evaluationErrorResponse } from '@/lib/evaluations/http';

export async function GET(req: NextRequest) {
  return traceApi(req, 'GET /api/gestao/evaluations', async () => {
    try {
      const access = await authorizeEvaluationsApi(req);
      if (access.error) return access.error;

      const period = req.nextUrl.searchParams.get('period') || undefined;
      const data = await getEvaluationsWorkspace(access.user, period);
      return NextResponse.json(data, { headers: { 'Cache-Control': 'private, no-store' } });
    } catch (error) {
      return evaluationErrorResponse(error, 'Erro ao carregar avaliações semestrais.');
    }
  });
}
