import { NextRequest, NextResponse } from 'next/server';
import { traceApi } from '@/lib/activity/server';
import { authorizeApi } from '@/lib/session';
import { getEmailCenterData } from '@/lib/email-center';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  return traceApi(req, 'GET /api/gestao/emails/center', async () => {
    const access = await authorizeApi(req, true);
    if (access.error) return access.error;

    try {
      const data = await getEmailCenterData();
      return NextResponse.json(data, {
        headers: { 'Cache-Control': 'no-store' },
      });
    } catch (error) {
      console.error('[api/gestao/emails/center] Erro ao carregar central de e-mails:', error);
      return NextResponse.json(
        { error: 'Erro ao carregar os dados de automação e situações de e-mail.' },
        { status: 500 }
      );
    }
  });
}
