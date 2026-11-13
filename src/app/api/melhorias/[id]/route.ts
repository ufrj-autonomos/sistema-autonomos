import { NextRequest, NextResponse } from 'next/server';
import { authorizeApi } from '@/lib/session';
import { traceApi } from '@/lib/activity/server';
import { activityTarget } from '@/lib/activity/context';
import {
  deleteFeedbackItem,
  FeedbackServiceError,
  reviewFeedbackItem,
} from '@/lib/feedback/service';

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return traceApi(req, 'PATCH /api/melhorias/[id]', async () => {
    const access = await authorizeApi(req, true);
    if (access.error) return access.error;

    try {
      const { id } = await context.params;
      const body = await req.json();
      const item = await reviewFeedbackItem(access.user, id, body);
      activityTarget('/gestao/melhorias', item.code);
      return NextResponse.json({ success: true, item });
    } catch (error) {
      if (error instanceof FeedbackServiceError) {
        return NextResponse.json({ error: error.message }, { status: error.status });
      }
      console.error('Erro na triagem de melhoria:', error);
      return NextResponse.json(
        { error: 'Erro interno ao atualizar triagem.' },
        { status: 500 }
      );
    }
  });
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return traceApi(req, 'DELETE /api/melhorias/[id]', async () => {
    const access = await authorizeApi(req, false);
    if (access.error) return access.error;

    try {
      const { id } = await context.params;
      const deleted = await deleteFeedbackItem(access.user, id);
      activityTarget('/melhorias', deleted.code);
      return NextResponse.json({ success: true, deleted });
    } catch (error) {
      if (error instanceof FeedbackServiceError) {
        return NextResponse.json({ error: error.message }, { status: error.status });
      }
      console.error('Erro ao excluir reporte:', error);
      return NextResponse.json({ error: 'Erro interno ao excluir registro.' }, { status: 500 });
    }
  });
}
