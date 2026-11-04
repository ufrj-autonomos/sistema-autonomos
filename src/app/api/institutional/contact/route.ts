import { traceApi } from '@/lib/activity/server';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/institutional/db';
import { verifyBridge } from '@/lib/institutional/bridge';
import { boundedBridgeBody, contactData } from '@/lib/institutional/contact';
import { InstitutionalError } from '@/lib/institutional/records';
import { checkRateLimit } from '@/lib/rate-limit';
export async function POST(req: NextRequest) {
  return traceApi(req, "POST /api/institutional/contact", async () => {
  try {
    if ((process.env.INSTITUTIONAL_BRIDGE_SECRET || '').length < 32) return NextResponse.json({ error: 'Integração indisponível.' }, { status: 503 });
    const raw = await boundedBridgeBody(req);
    if (!verifyBridge(raw, req.headers, 'contact')) return NextResponse.json({ error: 'Solicitação não autorizada.' }, { status: 401 });
    const blocked = await checkRateLimit('institutional:contact:relay', 60, 60); if (blocked) return blocked;
    const nonce = req.headers.get('x-institutional-nonce')!;
    const replay = await checkRateLimit(`institutional:contact:nonce:${nonce}`, 1, 600);
    if (replay) return NextResponse.json({ ok: true });
    let data; try { data = JSON.parse(raw); } catch { throw new InstitutionalError('Dados inválidos.'); }
    await db.contactMessage.create({ data: contactData(data) });
    return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return NextResponse.json({ error: error instanceof InstitutionalError ? error.message : 'Não foi possível receber a mensagem.' }, { status: error instanceof InstitutionalError ? error.status : 503 }); }

  });
}
