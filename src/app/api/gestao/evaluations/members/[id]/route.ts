import { NextRequest, NextResponse } from 'next/server';
import { traceApi } from '@/lib/activity/server';
import { deleteMemberEvaluation } from '@/lib/evaluations/service';
import { authorizeEvaluationsApi, evaluationErrorResponse } from '@/lib/evaluations/http';

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return traceApi(req, 'DELETE /api/gestao/evaluations/members/[id]', async () => {
    try {
      const access = await authorizeEvaluationsApi(req);
      if (access.error) return access.error;

      const { id } = await context.params;
      await deleteMemberEvaluation(access.user, id);
      return NextResponse.json({ ok: true });
    } catch (error) {
      return evaluationErrorResponse(error, 'Erro ao remover avaliação do integrante.');
    }
  });
}
