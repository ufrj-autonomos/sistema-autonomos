import { randomUUID } from 'node:crypto';

// The fixed QR has no requestId. Each scan gets its own URL; reloads and retries
// keep that URL so the server can safely replay an already processed punch.
export function resolveScanAttempt(params: { code?: unknown; requestId?: unknown }, createId: () => string = randomUUID) {
  const code = typeof params.code === 'string' && /^[a-f0-9]{64}$/.test(params.code) ? params.code : '';
  if (!code) return { code, requestId: '', redirectTo: null };
  if (typeof params.requestId === 'string' && /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(params.requestId)) {
    return { code, requestId: params.requestId, redirectTo: null };
  }
  const requestId = createId();
  return { code, requestId, redirectTo: `/presenca/registrar?${new URLSearchParams({ code, requestId })}` };
}
