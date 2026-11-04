'use client';
import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { useSession } from '@/contexts/auth-context';
import { activityPath, controlName } from '@/lib/activity/catalog';
type ClientEvent = { id: string; action: string; path: string; targetPath?: string; control?: string };
export function ActivityTracker() {
  const { user } = useSession();
  const pathname = usePathname();
  const path = useRef(pathname);
  const queue = useRef<ClientEvent[]>([]);
  const flush = useRef<() => void>(() => {});
  useEffect(() => { path.current = pathname; }, [pathname]);
  useEffect(() => {
    if (!user?.id) return;
    let busy = false;
    const send = () => {
      if (busy || !queue.current.length) return;
      const events = queue.current.splice(0, 20);
      busy = true;
      void fetch('/api/activity', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ events }), keepalive: true }).catch(() => {}).finally(() => { busy = false; });
    };
    flush.current = send;
    const add = (action: string, element: HTMLElement, targetPath?: string) => {
      const current = activityPath(path.current); if (!current || queue.current.length >= 100) return;
      const control = controlName(element.id || element.getAttribute('name'));
      // No input values, typed text, form bodies, query strings or arbitrary labels.
      queue.current.push({ id: crypto.randomUUID(), action, path: current, ...(targetPath ? { targetPath } : {}), ...(control ? { control } : {}) });
      if (queue.current.length >= 20) send();
    };
    const click = (event: MouseEvent) => {
      const element = event.target instanceof Element ? event.target.closest<HTMLElement>('button,a,summary,input[type="checkbox"],input[type="radio"]') : null;
      if (!element) return;
      const href = element instanceof HTMLAnchorElement && element.origin === location.origin ? activityPath(element.pathname) : null;
      add(element.dataset.activity === 'theme' ? 'THEME_CHANGE' : element instanceof HTMLAnchorElement ? 'LINK_CLICK' : 'BUTTON_CLICK', element, href || undefined);
    };
    const submit = (event: SubmitEvent) => { if (event.target instanceof HTMLFormElement) add('FORM_SUBMIT', event.target); };
    const change = (event: Event) => { if (event.target instanceof HTMLSelectElement || (event.target instanceof HTMLInputElement && ['checkbox', 'radio', 'date'].includes(event.target.type))) add('CONTROL_CHANGE', event.target); };
    const unload = () => { const events = queue.current.splice(0, 20); if (events.length) navigator.sendBeacon('/api/activity', new Blob([JSON.stringify({ events })], { type: 'application/json' })); };
    const hidden = () => { if (document.visibilityState === 'hidden') send(); };
    document.addEventListener('click', click, true); document.addEventListener('submit', submit, true); document.addEventListener('change', change, true); document.addEventListener('visibilitychange', hidden); window.addEventListener('pagehide', unload);
    const timer = setInterval(send, 3000);
    return () => { send(); queue.current = []; flush.current = () => {}; clearInterval(timer); document.removeEventListener('click', click, true); document.removeEventListener('submit', submit, true); document.removeEventListener('change', change, true); document.removeEventListener('visibilitychange', hidden); window.removeEventListener('pagehide', unload); };
  }, [user?.id]);
  useEffect(() => {
    if (!user?.id) return;
    const current = activityPath(pathname); if (!current) return;
    queue.current.push({ id: crypto.randomUUID(), action: 'PAGE_VIEW', path: current });
    flush.current();
  }, [pathname, user?.id]);
  return null;
}
