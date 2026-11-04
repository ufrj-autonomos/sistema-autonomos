import type { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { activityContext, type ActivityActor } from './context';
import { activityPath } from './catalog';
import { getCurrentUser, SESSION_COOKIE_NAME } from '@/lib/session';
import type { Prisma } from '@prisma/client';

export async function writeActivity(data: { actor?: ActivityActor | null; kind: string; action: string; path: string; outcome: string; method?: string; statusCode?: number; durationMs?: number; targetPath?: string; control?: string }) {
  // Collection errors never make a successfully completed business action fail.
  try {
    const { actor, ...event } = data;
    const row = { ...event, path: activityPath(event.path) || '/', action: event.action.slice(0, 100), actorId: actor?.id || null, actorName: actor?.name.slice(0, 200) || null, actorRole: actor?.role.slice(0, 24) || null };
    try { await prisma.activityLog.create({ data: row }); }
    catch (error) { if (actor && error && typeof error === 'object' && 'code' in error && error.code === 'P2003') await prisma.activityLog.create({ data: { ...row, actorId: null } }); else throw error; }
  } catch { if (process.env.NODE_ENV !== 'test') console.error('[activity] Não foi possível persistir um evento.'); }
}
export async function traceApi<T extends Response>(req: NextRequest, action: string, handler: () => Promise<T>): Promise<T> {
  return activityContext.run({ actor: null }, async () => {
    const start = Date.now();
    const path = activityPath(req.nextUrl.pathname) || '/';
    if (path === '/api/auth/logout') await getCurrentUser(req).catch(() => null);
    try {
      const response = await handler();
      const context = activityContext.getStore()!;
      if (!context.actor && req.cookies.has(SESSION_COOKIE_NAME)) await getCurrentUser(req).catch(() => null);
      if (path === '/api/auth/login' && response.ok) {
        // Only the server's successful login response can establish this actor.
        const body = await response.clone().json().catch(() => null);
        if (body?.success && body.user?.id && body.user?.status === 'APPROVED') context.actor = { id: body.user.id, name: body.user.name, role: body.user.role };
      }
      await writeActivity({ actor: context.actor, kind: path.startsWith('/api/auth/') ? 'AUTH' : 'API_REQUEST', action, path, method: req.method, statusCode: response.status, outcome: response.status < 400 ? 'SUCCESS' : 'FAILURE', durationMs: Date.now() - start });
      return response;
    } catch (error) {
      await writeActivity({ actor: activityContext.getStore()?.actor, kind: 'API_REQUEST', action, path, method: req.method, statusCode: 500, outcome: 'FAILURE', durationMs: Date.now() - start });
      throw error;
    }
  });
}
export async function traceServerAction<T>(action: string, handler: () => Promise<T>): Promise<T> {
  if (activityContext.getStore()?.serverAction) return handler();
  return activityContext.run({ actor: null, serverAction: true }, async () => {
    const start = Date.now();
    let outcome = 'SUCCESS';
    try {
      const result = await handler();
      if (result && typeof result === 'object' && 'success' in result && result.success === false) outcome = 'FAILURE';
      return result;
    } catch (error) { outcome = 'FAILURE'; throw error; }
    finally { const context = activityContext.getStore(); await writeActivity({ actor: context?.actor, targetPath: context?.targetPath, control: context?.control, kind: 'SERVER_ACTION', action, path: '/gestao', outcome, durationMs: Date.now() - start }); }
  });
}
export type ActivityInsert = Prisma.ActivityLogCreateManyInput;
