import { NextRequest, NextResponse } from 'next/server';
import { traceApi } from '@/lib/activity/server';
import { authorizeApi } from '@/lib/session';
import { getEmailLogsDashboard } from '@/lib/email-logs';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  return traceApi(req, 'GET /api/gestao/emails', async () => {
    const access = await authorizeApi(req, true);
    if (access.error) return access.error;

    try {
      const sp = req.nextUrl.searchParams;
      const limit = Number(sp.get('limit') || '80');
      const offset = Number(sp.get('offset') || '0');

      const data = await getEmailLogsDashboard({
        category: sp.get('category'),
        status: sp.get('status'),
        q: sp.get('q'),
        limit: Number.isFinite(limit) ? limit : 80,
        offset: Number.isFinite(offset) ? offset : 0,
      });

      return NextResponse.json(data, {
        headers: { 'Cache-Control': 'no-store' },
      });
    } catch (error) {
      console.error('[api/gestao/emails] Erro ao consultar logs de e-mail:', error);
      return NextResponse.json(
        { error: 'Erro ao carregar o log de e-mails enviados.' },
        { status: 500 }
      );
    }
  });
}
