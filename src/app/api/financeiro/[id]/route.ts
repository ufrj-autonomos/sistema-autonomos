import { NextRequest, NextResponse } from 'next/server';
import { authorizeApi } from '@/lib/session';
import { traceApi } from '@/lib/activity/server';
import { activityTarget } from '@/lib/activity/context';
import {
  deleteFinancialEntry,
  FinanceServiceError,
  updateFinancialEntry,
} from '@/lib/finance/service';

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return traceApi(req, 'PATCH /api/financeiro/[id]', async () => {
    const access = await authorizeApi(req, false);
    if (access.error) return access.error;

    try {
      const { id } = await context.params;
      const body = await req.json();
      const entry = await updateFinancialEntry(access.user, id, body);
      activityTarget(`/gestao/financeiro/reembolsos#${id}`, 'financial-entry');
      return NextResponse.json({ success: true, entry });
    } catch (error) {
      if (error instanceof FinanceServiceError) {
        return NextResponse.json({ error: error.message }, { status: error.status });
      }
      console.error('Erro ao atualizar lançamento financeiro:', error);
      return NextResponse.json({ error: 'Erro interno ao atualizar lançamento financeiro.' }, { status: 500 });
    }
  });
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return traceApi(req, 'DELETE /api/financeiro/[id]', async () => {
    const access = await authorizeApi(req, true);
    if (access.error) return access.error;

    try {
      const { id } = await context.params;
      await deleteFinancialEntry(access.user, id);
      activityTarget(`/gestao/financeiro/caixa#${id}`, 'financial-entry');
      return NextResponse.json({ success: true });
    } catch (error) {
      if (error instanceof FinanceServiceError) {
        return NextResponse.json({ error: error.message }, { status: error.status });
      }
      console.error('Erro ao excluir lançamento financeiro:', error);
      return NextResponse.json({ error: 'Erro interno ao excluir lançamento financeiro.' }, { status: 500 });
    }
  });
}
