import { activityPath, controlName } from './catalog';
import { AsyncLocalStorage } from 'node:async_hooks';
export type ActivityActor = { id: string; name: string; role: string };
export const activityContext = new AsyncLocalStorage<{ actor: ActivityActor | null; serverAction?: boolean; targetPath?: string; control?: string }>();
export function rememberActivityActor(actor: ActivityActor) { const context = activityContext.getStore(); if (context) context.actor = { id: actor.id, name: actor.name, role: actor.role }; }

export function activityTarget(path: string, control?: string) {
  const context = activityContext.getStore();
  const safePath = activityPath(path);
  if (context && safePath) context.targetPath = safePath;
  const safeControl = controlName(control);
  if (context && safeControl) context.control = safeControl;
}
