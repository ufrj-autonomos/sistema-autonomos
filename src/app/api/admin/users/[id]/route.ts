import { NextRequest, NextResponse } from 'next/server';
import { authorizeApi } from '@/lib/session';
import { AccountUpdateError, updateAccount } from '@/lib/user-administration';

export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const access = await authorizeApi(req, true);
    if (access.error) return access.error;
    let body: unknown;
    try { body = await req.json(); } catch { return NextResponse.json({ error: 'Dados inválidos.' }, { status: 400 }); }
    const { id } = await context.params;
    const result = await updateAccount(access.user.id, id, body);
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    if (error instanceof AccountUpdateError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error('Erro ao atualizar conta:', error);
    return NextResponse.json({ error: 'Não foi possível atualizar a conta. Tente novamente.' }, { status: 500 });
  }
}
