import { NextRequest, NextResponse } from 'next/server';
import { authorizeApi } from '@/lib/session';
import { traceApi } from '@/lib/activity/server';
import { activityTarget } from '@/lib/activity/context';
import {
  AssetServiceError,
  deleteInventoryAsset,
  updateInventoryAsset,
} from '@/lib/assets/service';

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return traceApi(req, 'PATCH /api/patrimonio/[id]', async () => {
    const access = await authorizeApi(req, true);
    if (access.error) return access.error;

    try {
      const { id } = await context.params;
      const body = await req.json();
      const asset = await updateInventoryAsset(access.user, id, body);
      activityTarget('/gestao/financeiro/patrimonio', asset.assetTag);
      return NextResponse.json({ success: true, asset });
    } catch (error) {
      if (error instanceof AssetServiceError) {
        return NextResponse.json({ error: error.message }, { status: error.status });
      }
      console.error('Erro ao atualizar item de patrimônio:', error);
      return NextResponse.json({ error: 'Erro interno ao atualizar material.' }, { status: 500 });
    }
  });
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return traceApi(req, 'DELETE /api/patrimonio/[id]', async () => {
    const access = await authorizeApi(req, true);
    if (access.error) return access.error;

    try {
      const { id } = await context.params;
      const deleted = await deleteInventoryAsset(access.user, id);
      activityTarget('/gestao/financeiro/patrimonio', deleted.assetTag);
      return NextResponse.json({ success: true, deleted });
    } catch (error) {
      if (error instanceof AssetServiceError) {
        return NextResponse.json({ error: error.message }, { status: error.status });
      }
      console.error('Erro ao remover item de patrimônio:', error);
      return NextResponse.json({ error: 'Erro interno ao remover material.' }, { status: 500 });
    }
  });
}
