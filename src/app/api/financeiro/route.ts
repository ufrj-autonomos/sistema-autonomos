import { NextRequest, NextResponse } from 'next/server';
import { authorizeApi } from '@/lib/session';
import { hasManagementAccess } from '@/lib/access-policy';
import { traceApi } from '@/lib/activity/server';
import { activityTarget } from '@/lib/activity/context';
import {
  createFinancialEntry,
  FinanceServiceError,
  getFinancialDashboardData,
  getMemberReimbursementsData,
  updateMemberPixKey,
} from '@/lib/finance/service';

export async function GET(req: NextRequest) {
  return traceApi(req, 'GET /api/financeiro', async () => {
    const access = await authorizeApi(req, false);
    if (access.error) return access.error;

    try {
      const { searchParams } = new URL(req.url);
      const scope = searchParams.get('scope');
      const isManager = hasManagementAccess(access.user.role);

      if (scope === 'management' || (isManager && scope !== 'mine')) {
        if (!isManager) {
          return NextResponse.json(
            { error: 'Apenas a gestão pode acessar o livro caixa completo.' },
            { status: 403 }
          );
        }
        const dashboard = await getFinancialDashboardData();
        return NextResponse.json({ scope: 'management', ...dashboard });
      }

      const mine = await getMemberReimbursementsData(access.user.id);
      return NextResponse.json({ scope: 'mine', ...mine });
    } catch (error) {
      if (error instanceof FinanceServiceError) {
        return NextResponse.json({ error: error.message }, { status: error.status });
      }
      console.error('Erro ao buscar dados financeiros:', error);
      return NextResponse.json({ error: 'Erro interno ao buscar dados financeiros.' }, { status: 500 });
    }
  });
}

export async function POST(req: NextRequest) {
  return traceApi(req, 'POST /api/financeiro', async () => {
    const access = await authorizeApi(req, false);
    if (access.error) return access.error;

    try {
      const body = await req.json();

      if (body?.action === 'update_pix') {
        const pixKey = typeof body.pixKey === 'string' ? body.pixKey : '';
        const pixKeyType = typeof body.pixKeyType === 'string' ? body.pixKeyType : null;
        const updated = await updateMemberPixKey(access.user.id, pixKey, pixKeyType);
        activityTarget('/reembolsos', 'pix');
        return NextResponse.json({ success: true, ...updated });
      }

      const entry = await createFinancialEntry(access.user, body);
      activityTarget(entry.isReimbursement ? '/reembolsos' : '/gestao/financeiro/caixa', 'financial-entry');
      return NextResponse.json({ success: true, entry }, { status: 201 });
    } catch (error) {
      if (error instanceof FinanceServiceError) {
        return NextResponse.json({ error: error.message }, { status: error.status });
      }
      console.error('Erro ao criar lançamento financeiro:', error);
      return NextResponse.json({ error: 'Erro interno ao registrar lançamento financeiro.' }, { status: 500 });
    }
  });
}
