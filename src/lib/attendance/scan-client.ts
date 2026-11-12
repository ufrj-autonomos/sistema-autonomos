import type { ScanResult } from './types';

export async function submitAttendanceScan(code: string, requestId: string, timeoutMs = 20_000): Promise<ScanResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch('/api/attendance/scan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, requestId }),
      signal: controller.signal,
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Não foi possível registrar sua presença.');
    return data;
  } catch (error) {
    if (controller.signal.aborted) throw new Error('A confirmação demorou para chegar. Toque em “Tentar novamente” para conferir seu registro com segurança.');
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}
