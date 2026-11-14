'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, CheckCheck, ExternalLink, Trash2 } from 'lucide-react';
import type { NotificationFeedDTO, NotificationItemDTO } from '@/lib/notifications-meta';
import { cn } from '@/lib/utils';

const TONE_DOT: Record<NotificationItemDTO['tone'], string> = {
  sky: 'bg-sky-500',
  violet: 'bg-violet-500',
  emerald: 'bg-emerald-500',
  amber: 'bg-amber-500',
  rose: 'bg-rose-500',
  slate: 'bg-slate-400',
};

function formatRelativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diffMs / 60_000);
  if (min < 1) return 'agora';
  if (min < 60) return `${min} min`;
  const hrs = Math.floor(min / 60);
  if (hrs < 24) return `${hrs} h`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days} d`;
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

export function NotificationBell({ className }: { className?: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [feed, setFeed] = useState<NotificationFeedDTO>({ unreadCount: 0, items: [] });
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const loadFeed = useCallback(async (showSpinner = false) => {
    if (showSpinner) setLoading(true);
    try {
      const res = await fetch('/api/notifications?limit=25', { cache: 'no-store' });
      if (!res.ok) return;
      const json = (await res.json()) as NotificationFeedDTO;
      setFeed(json);
    } catch {
      // ignore transient network errors during background poll
    } finally {
      if (showSpinner) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadFeed(true);

    const interval = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        void loadFeed(false);
      }
    }, 45_000);

    const onFocus = () => void loadFeed(false);
    window.addEventListener('focus', onFocus);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener('focus', onFocus);
    };
  }, [loadFeed]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  async function markAllRead() {
    if (feed.unreadCount === 0) return;
    const nowIso = new Date().toISOString();
    setFeed(prev => ({
      unreadCount: 0,
      items: prev.items.map(i => (i.readAt ? i : { ...i, readAt: nowIso })),
    }));
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAll: true }),
      });
    } catch {
      void loadFeed(false);
    }
  }

  async function handleSelectItem(item: NotificationItemDTO) {
    if (!item.readAt) {
      const nowIso = new Date().toISOString();
      setFeed(prev => ({
        unreadCount: Math.max(0, prev.unreadCount - 1),
        items: prev.items.map(i => (i.id === item.id ? { ...i, readAt: nowIso } : i)),
      }));
      void fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationId: item.id }),
      }).catch(() => {});
    }

    if (item.link) {
      setOpen(false);
      router.push(item.link);
    }
  }

  async function handleDismiss(e: React.MouseEvent, id: string, wasUnread: boolean) {
    e.stopPropagation();
    setFeed(prev => ({
      unreadCount: wasUnread ? Math.max(0, prev.unreadCount - 1) : prev.unreadCount,
      items: prev.items.filter(i => i.id !== id),
    }));
    void fetch(`/api/notifications?id=${encodeURIComponent(id)}`, {
      method: 'DELETE',
    }).catch(() => {});
  }

  const unreadLabel = feed.unreadCount > 99 ? '99+' : String(feed.unreadCount);

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <button
        type="button"
        onClick={() => {
          const next = !open;
          setOpen(next);
          if (next) void loadFeed(false);
        }}
        aria-label={
          feed.unreadCount > 0
            ? `Notificações (${feed.unreadCount} não lidas)`
            : 'Notificações'
        }
        aria-expanded={open}
        aria-haspopup="true"
        className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-background/70 text-foreground hover:bg-accent transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring cursor-pointer"
        title="Notificações"
      >
        <Bell className="h-[18px] w-[18px]" />
        {feed.unreadCount > 0 && (
          <span className="absolute -right-1.5 -top-1.5 flex min-w-[18px] h-[18px] items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-bold leading-none text-white shadow-xs ring-2 ring-background tabular-nums">
            {unreadLabel}
          </span>
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Central de Notificações"
          className="absolute right-0 mt-2 w-[min(92vw,23rem)] rounded-xl border border-border bg-card text-card-foreground shadow-xl z-50 overflow-hidden"
        >
          <div className="flex items-center justify-between gap-2 border-b border-border bg-muted/40 px-3.5 py-2.5">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-foreground">Notificações</span>
              {feed.unreadCount > 0 && (
                <span className="rounded-full bg-rose-500/15 border border-rose-500/30 px-2 py-0.5 font-mono text-[11px] font-semibold text-rose-600 dark:text-rose-400">
                  {feed.unreadCount} nova{feed.unreadCount === 1 ? '' : 's'}
                </span>
              )}
            </div>

            {feed.unreadCount > 0 && (
              <button
                type="button"
                onClick={() => void markAllRead()}
                className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium text-primary hover:bg-primary/10 cursor-pointer"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                Marcar lidas
              </button>
            )}
          </div>

          <div className="max-h-[26rem] overflow-y-auto divide-y divide-border">
            {loading && feed.items.length === 0 ? (
              <div className="p-6 text-center text-xs text-muted-foreground">
                Carregando notificações…
              </div>
            ) : feed.items.length === 0 ? (
              <div className="p-8 text-center space-y-1.5">
                <Bell className="mx-auto h-7 w-7 text-muted-foreground/60" />
                <p className="text-xs font-medium text-foreground">Tudo em dia por aqui</p>
                <p className="text-[11px] text-muted-foreground">
                  Você verá avisos de ideias/bugs, horas no lab, reembolsos e gestão aqui.
                </p>
              </div>
            ) : (
              feed.items.map(item => {
                const isUnread = !item.readAt;
                return (
                  <div
                    key={item.id}
                    onClick={() => void handleSelectItem(item)}
                    className={cn(
                      'group flex items-start gap-2.5 px-3.5 py-3 transition-colors',
                      item.link ? 'cursor-pointer hover:bg-muted/40' : '',
                      isUnread ? 'bg-primary/[0.04]' : 'bg-card'
                    )}
                  >
                    <span
                      className={cn(
                        'mt-1.5 h-2 w-2 shrink-0 rounded-full',
                        isUnread ? TONE_DOT[item.tone] : 'bg-muted-foreground/30'
                      )}
                    />
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center justify-between gap-2 text-[10px] text-muted-foreground">
                        <span className="font-semibold uppercase tracking-wider truncate">
                          {item.categoryLabel}
                        </span>
                        <span className="shrink-0 font-mono">
                          {formatRelativeTime(item.createdAt)}
                        </span>
                      </div>
                      <p
                        className={cn(
                          'text-xs leading-snug',
                          isUnread ? 'font-semibold text-foreground' : 'font-medium text-foreground/85'
                        )}
                      >
                        {item.title}
                      </p>
                      <p className="text-[11px] text-muted-foreground line-clamp-2 whitespace-pre-line">
                        {item.message}
                      </p>
                      <div className="flex items-center justify-between gap-2 pt-0.5">
                        {item.actorName ? (
                          <span className="text-[10px] text-muted-foreground truncate">
                            Por {item.actorName}
                          </span>
                        ) : (
                          <span />
                        )}
                        {item.link && (
                          <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-primary">
                            Abrir <ExternalLink className="h-2.5 w-2.5" />
                          </span>
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={e => void handleDismiss(e, item.id, isUnread)}
                      aria-label="Remover notificação"
                      title="Remover"
                      className="opacity-60 sm:opacity-0 sm:group-hover:opacity-100 rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground transition-opacity cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
