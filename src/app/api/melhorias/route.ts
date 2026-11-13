import { NextRequest, NextResponse } from 'next/server';
import { authorizeApi } from '@/lib/session';
import { traceApi } from '@/lib/activity/server';
import { activityTarget } from '@/lib/activity/context';
import {
  createFeedbackItem,
  FeedbackServiceError,
  getFeedbackDashboardData,
} from '@/lib/feedback/service';

export async function GET(req: NextRequest) {
  return traceApi(req, 'GET /api/melhorias', async () => {
    const scope =
      req.nextUrl.searchParams.get('scope') === 'management' ? 'management' : 'member';
    const access = await authorizeApi(req, scope === 'management');
    if (access.error) return access.error;

    try {
      const data = await getFeedbackDashboardData(access.user, scope);
      return NextResponse.json(data);
    } catch (error) {
      if (error instanceof FeedbackServiceError) {
        return NextResponse.json({ error: error.message }, { status: error.status });
      }
      console.error('Erro ao listar reportes e ideias:', error);
      return NextResponse.json({ error: 'Erro ao carregar melhorias.' }, { status: 500 });
    }
  });
}

export async function POST(req: NextRequest) {
  return traceApi(req, 'POST /api/melhorias', async () => {
    const access = await authorizeApi(req, false);
    if (access.error) return access.error;

    try {
      const body = await req.json();
      const item = await createFeedbackItem(access.user, body);
      activityTarget('/melhorias', item.code);
      return NextResponse.json({ success: true, item }, { status: 201 });
    } catch (error) {
      if (error instanceof FeedbackServiceError) {
        return NextResponse.json({ error: error.message }, { status: error.status });
      }
      console.error('Erro ao registrar bug/melhoria:', error);
      return NextResponse.json(
        { error: 'Erro interno ao enviar registro.' },
        { status: 500 }
      );
    }
  });
}
