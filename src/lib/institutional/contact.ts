import { InstitutionalError } from './records';
export function contactData(input: unknown) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new InstitutionalError('Dados inválidos.');
  const body = input as Record<string, unknown>;
  if (Object.keys(body).some(key => !['name','email','subject','message','intent','teamSlug'].includes(key))) throw new InstitutionalError('Dados inválidos.');
  const value = (key: string, max: number, fallback = '') => { const text = body[key] ?? fallback; if (typeof text !== 'string' || text.length > max || text.includes('\0')) throw new InstitutionalError('Dados de contato inválidos.'); return text.trim(); };
  const data = { name: value('name',120), email: value('email',254), subject: value('subject',200,'(sem assunto)'), message: value('message',6000), intent: value('intent',30,'outro'), teamSlug: value('teamSlug',30,'autonomos') };
  if (!data.name || !data.message || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email) || !['autonomos','nautilus','harpia'].includes(data.teamSlug) || !['recrutamento','patrocinio','duvida','outro'].includes(data.intent)) throw new InstitutionalError('Preencha os dados de contato corretamente.');
  return data;
}
export async function boundedBridgeBody(req: Request) {
  const reader = req.body?.getReader(); if (!reader) throw new InstitutionalError('Dados inválidos.');
  const chunks: Uint8Array[] = []; let size = 0;
  try { while (true) { const chunk = await reader.read(); if (chunk.done) break; size += chunk.value.byteLength; if (size > 16384) { await reader.cancel(); throw new InstitutionalError('Mensagem muito extensa.', 413); } chunks.push(chunk.value); } }
  finally { reader.releaseLock(); }
  return Buffer.concat(chunks).toString('utf8');
}
