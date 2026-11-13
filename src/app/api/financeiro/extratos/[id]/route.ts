import { NextRequest, NextResponse } from 'next/server';
import { authorizeApi } from '@/lib/session';
import { traceApi } from '@/lib/activity/server';
import { activityTarget } from '@/lib/activity/context';
import { deleteFinancialStatement, FinanceServiceError } from '@/lib/finance/service';

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return traceApi(req, 'DELETE /api/financeiro/extratos/[id]', async () => {
    const access = await authorizeApi(req, true);
    if (access.error) return access.error;

    try {
      const { id } = await context.params;
      await deleteFinancialStatement(access.user, id);
      activityTarget(`/gestao/financeiro/caixa#extrato-${id}`, 'financial-statement');
      return NextResponse.json({ success: true });
    } catch (error) {
      if (error instanceof FinanceServiceError) {
        return NextResponse.json({ error: error.message }, { status: error.status });
      }
      console.error('Erro ao excluir extrato financeiro:', error);
      return NextResponse.json({ error: 'Erro interno ao excluir extrato.' }, { status: 500 });
    }
  });
}
