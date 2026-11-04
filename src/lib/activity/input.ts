import { ACTIVITY_KINDS, CLIENT_ACTIONS, activityPath, controlName } from './catalog';
const EVENT_KIND: Record<string, string> = { PAGE_VIEW: 'PAGE_VIEW', BUTTON_CLICK: 'UI_CLICK', LINK_CLICK: 'UI_CLICK', FORM_SUBMIT: 'FORM_SUBMIT', CONTROL_CHANGE: 'CONTROL_CHANGE', THEME_CHANGE: 'CONTROL_CHANGE' };
export function clientEvents(input: unknown) {
  if (!input || typeof input !== 'object' || Array.isArray(input) || Object.keys(input).some(key => key !== 'events')) throw new Error('Lote inválido.');
  const events = (input as { events?: unknown }).events;
  if (!Array.isArray(events) || events.length < 1 || events.length > 20) throw new Error('Envie de 1 a 20 eventos.');
  return events.map(value => {
    if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).some(key => !['id', 'action', 'path', 'targetPath', 'control'].includes(key))) throw new Error('Evento inválido.');
    const data = value as Record<string, unknown>;
    if (typeof data.id !== 'string' || !/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(data.id) || typeof data.action !== 'string' || !(CLIENT_ACTIONS as readonly string[]).includes(data.action)) throw new Error('Evento inválido.');
    const path = activityPath(data.path);
    const targetPath = data.targetPath === undefined ? null : activityPath(data.targetPath);
    if (!path || path.startsWith('/api/') || (data.targetPath !== undefined && !targetPath)) throw new Error('Página inválida.');
    const control = data.control === undefined ? null : controlName(data.control);
    if (data.control !== undefined && !control) throw new Error('Controle inválido.');
    return { clientEventId: data.id, action: data.action, kind: EVENT_KIND[data.action], path, targetPath, control, outcome: 'OBSERVED' };
  });
}
export type LogFilters = { q: string; kind: string; outcome: string; days: number; cursor?: string };
export function logFilters(params: URLSearchParams): LogFilters {
  const q = (params.get('q') || '').trim();
  const kind = params.get('kind') || '';
  const outcome = params.get('outcome') || '';
  const days = Number(params.get('days') || '7');
  const cursor = params.get('cursor') || undefined;
  if (q.length > 100 || (kind && !(ACTIVITY_KINDS as readonly string[]).includes(kind)) || (outcome && !['SUCCESS', 'FAILURE', 'OBSERVED'].includes(outcome)) || ![1, 7, 30, 90, 0].includes(days) || (cursor && !/^[a-z0-9_-]{1,64}$/i.test(cursor))) throw new Error('Confira os filtros de atividade.');
  return { q, kind, outcome, days, cursor };
}
