import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
export function bridgeHeaders(body: string, purpose: string, secret = process.env.INSTITUTIONAL_BRIDGE_SECRET || '') {
  if (secret.length < 32) throw new Error('Configure INSTITUTIONAL_BRIDGE_SECRET com pelo menos 32 caracteres.');
  const timestamp = String(Date.now()); const nonce = randomUUID();
  return { 'Content-Type': 'application/json', 'x-institutional-time': timestamp, 'x-institutional-nonce': nonce, 'x-institutional-signature': createHmac('sha256', secret).update(`${purpose}.${timestamp}.${nonce}.${body}`).digest('hex') };
}
export function verifyBridge(body: string, headers: Headers, purpose: string, secret = process.env.INSTITUTIONAL_BRIDGE_SECRET || '') {
  const timestamp = headers.get('x-institutional-time') || ''; const nonce = headers.get('x-institutional-nonce') || ''; const signature = headers.get('x-institutional-signature') || '';
  if (secret.length < 32 || !/^\d{13}$/.test(timestamp) || Math.abs(Date.now() - Number(timestamp)) > 300000 || !/^[a-f\d-]{36}$/.test(nonce) || !/^[a-f\d]{64}$/.test(signature)) return false;
  const expected = createHmac('sha256', secret).update(`${purpose}.${timestamp}.${nonce}.${body}`).digest('hex');
  return timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}
