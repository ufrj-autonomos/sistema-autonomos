import { NextRequest, NextResponse } from 'next/server';
import { authorizeApi } from '@/lib/session';
import { traceApi } from '@/lib/activity/server';
import { activityTarget } from '@/lib/activity/context';
import { createFinancialStatement, FinanceServiceError } from '@/lib/finance/service';

export async function POST(req: NextRequest) {
  return traceApi(req, 'POST /api/financeiro/extratos', async () => {
    const access = await authorizeApi(req, true);
    if (access.error) return access.error;

    try {
      const body = await req.json();
      const statement = await createFinancialStatement(access.user, body);
      activityTarget('/gestao/financeiro/caixa', 'financial-statement');
      return NextResponse.json({ success: true, statement }, { status: 201 });
    } catch (error) {
      if (error instanceof FinanceServiceError) {
        return NextResponse.json({ error: error.message }, { status: error.status });
      }
      console.error('Erro ao salvar extrato financeiro:', error);
      return NextResponse.json({ error: 'Erro interno ao salvar extrato.' }, { status: 500 });
    }
  });
}
