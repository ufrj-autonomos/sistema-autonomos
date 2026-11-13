import { NextRequest, NextResponse } from 'next/server';
import { authorizeApi } from '@/lib/session';
import { traceApi } from '@/lib/activity/server';
import { activityTarget } from '@/lib/activity/context';
import {
  AssetServiceError,
  createInventoryAsset,
  getInventoryDashboardData,
} from '@/lib/assets/service';

export async function GET(req: NextRequest) {
  return traceApi(req, 'GET /api/patrimonio', async () => {
    const access = await authorizeApi(req, true);
    if (access.error) return access.error;

    try {
      const data = await getInventoryDashboardData();
      return NextResponse.json(data);
    } catch (error) {
      console.error('Erro ao carregar patrimônio:', error);
      return NextResponse.json({ error: 'Erro ao carregar patrimônio.' }, { status: 500 });
    }
  });
}

export async function POST(req: NextRequest) {
  return traceApi(req, 'POST /api/patrimonio', async () => {
    const access = await authorizeApi(req, true);
    if (access.error) return access.error;

    try {
      const body = await req.json();
      const asset = await createInventoryAsset(access.user, body);
      activityTarget('/gestao/financeiro/patrimonio', asset.assetTag);
      return NextResponse.json({ success: true, asset }, { status: 201 });
    } catch (error) {
      if (error instanceof AssetServiceError) {
        return NextResponse.json({ error: error.message }, { status: error.status });
      }
      console.error('Erro ao cadastrar item de patrimônio:', error);
      return NextResponse.json({ error: 'Erro interno ao cadastrar material.' }, { status: 500 });
    }
  });
}
