import { NextRequest, NextResponse } from 'next/server';
import { traceApi } from '@/lib/activity/server';
import { upsertAreaEvaluation } from '@/lib/evaluations/service';
import { authorizeEvaluationsApi, evaluationErrorResponse } from '@/lib/evaluations/http';

export async function POST(req: NextRequest) {
  return traceApi(req, 'POST /api/gestao/evaluations/areas', async () => {
    try {
      const access = await authorizeEvaluationsApi(req, { adminOnly: true });
      if (access.error) return access.error;

      const body = await req.json();
      const evaluation = await upsertAreaEvaluation(access.user, {
        periodCode: body?.periodCode,
        scopeKey: body?.scopeKey,
        score: body?.score,
        notes: body?.notes,
      });

      return NextResponse.json({ evaluation }, { status: 200 });
    } catch (error) {
      return evaluationErrorResponse(error, 'Erro ao salvar nota da área.');
    }
  });
}
