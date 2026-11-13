import { NextRequest, NextResponse } from 'next/server';
import { authorizeApi } from '@/lib/session';
import { traceApi } from '@/lib/activity/server';
import { activityTarget } from '@/lib/activity/context';
import { FeedbackServiceError, toggleFeedbackVote } from '@/lib/feedback/service';

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return traceApi(req, 'POST /api/melhorias/[id]/vote', async () => {
    const access = await authorizeApi(req, false);
    if (access.error) return access.error;

    try {
      const { id } = await context.params;
      const result = await toggleFeedbackVote(access.user, id);
      activityTarget(`/melhorias#${id}`, 'feedback-vote');
      return NextResponse.json({ success: true, ...result });
    } catch (error) {
      if (error instanceof FeedbackServiceError) {
        return NextResponse.json({ error: error.message }, { status: error.status });
      }
      console.error('Erro ao votar na ideia:', error);
      return NextResponse.json({ error: 'Erro ao registrar apoio.' }, { status: 500 });
    }
  });
}
