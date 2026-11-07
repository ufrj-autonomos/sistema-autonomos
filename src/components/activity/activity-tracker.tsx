'use client';
import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { useSession } from '@/contexts/auth-context';
import { activityPath } from '@/lib/activity/catalog';
/** Only page visits; business actions are recorded by the server. */
export function ActivityTracker() {
  const { user } = useSession(); const pathname = usePathname(); const last = useRef('');
  useEffect(() => {
    if (!user?.id || user.role === 'ADMIN') { last.current = ''; return; }
    const path = activityPath(pathname); if (!path) return;
    const key = `${user.id}:${path}`; if (last.current === key) return; last.current = key;
    void fetch('/api/activity', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ events: [{ id: crypto.randomUUID(), action: 'PAGE_VIEW', path }] }), keepalive: true }).catch(() => {});
  }, [pathname, user?.id]);
  return null;
}
