import { NextRequest, NextResponse } from 'next/server';

const MAX_AUTH_BODY_BYTES = 4096;

export async function readAuthPayload(req: NextRequest) {
  const reader = req.body?.getReader();
  if (!reader) return { body: null, error: NextResponse.json({ error: 'Dados inválidos.' }, { status: 400 }) };
  const decoder = new TextDecoder();
  let size = 0;
  let text = '';
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      size += chunk.value.byteLength;
      if (size > MAX_AUTH_BODY_BYTES) {
        await reader.cancel();
        return { body: null, error: NextResponse.json({ error: 'Dados enviados excedem o tamanho permitido.' }, { status: 413 }) };
      }
      text += decoder.decode(chunk.value, { stream: true });
    }
    text += decoder.decode();
    const body: unknown = JSON.parse(text);
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error('Formato inválido');
    return { body: body as Record<string, unknown>, error: null };
  } catch {
    return { body: null, error: NextResponse.json({ error: 'Dados inválidos.' }, { status: 400 }) };
  } finally { reader.releaseLock(); }
}
