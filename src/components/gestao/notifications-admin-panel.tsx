'use client';

import { useState } from 'react';
import {
  Bell,
  BellRing,
  CheckCircle2,
  Send,
  Sparkles,
  Trash2,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';
import type {
  NotificationCategoryKey,
  NotificationRuleDTO,
  NotificationsAdminDashboardDTO,
} from '@/lib/notifications-meta';
import { cn } from '@/lib/utils';

const TONE_BADGE: Record<NotificationRuleDTO['tone'], string> = {
  sky: 'border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300',
  violet: 'border-violet-500/30 bg-violet-500/10 text-violet-700 dark:text-violet-300',
  emerald: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  amber: 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300',
  rose: 'border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300',
  slate: 'border-border bg-muted text-muted-foreground',
};

const QUICK_ROUTES = [
  { label: 'Sem link', value: '' },
  { label: 'Início (/)', value: '/' },
  { label: 'Bugs & Ideias (/melhorias)', value: '/melhorias' },
  { label: 'Meu Perfil (/perfil)', value: '/perfil' },
  { label: 'Horas & Presença (/presenca)', value: '/presenca' },
  { label: 'Reembolsos (/reembolsos)', value: '/reembolsos' },
  { label: 'Reuniões (/reunioes)', value: '/reunioes' },
  { label: 'Triagem Ideias (/gestao/melhorias)', value: '/gestao/melhorias' },
];

export function NotificationsAdminPanel({
  initialData,
}: {
  initialData: NotificationsAdminDashboardDTO;
}) {
  const [data, setData] = useState<NotificationsAdminDashboardDTO>(initialData);
  const [togglingKey, setTogglingKey] = useState<string | null>(null);
  const [cleaning, setCleaning] = useState(false);

  // Manual broadcast form
  const [targetType, setTargetType] = useState<'ALL' | 'AREA' | 'MEMBER' | 'MANAGEMENT'>('ALL');
  const [targetArea, setTargetArea] = useState(initialData.areas[0] || '');
  const [targetMemberId, setTargetMemberId] = useState(initialData.members[0]?.id || '');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [link, setLink] = useState('/');
  const [sending, setSending] = useState(false);

  async function refreshDashboard() {
    const res = await fetch('/api/gestao/notifications', { cache: 'no-store' });
    if (!res.ok) return;
    const json = (await res.json()) as NotificationsAdminDashboardDTO;
    setData(json);
  }

  async function handleToggleRule(
    category: NotificationCategoryKey,
    patch: { enabled?: boolean; sendToManagement?: boolean }
  ) {
    setTogglingKey(category);
    try {
      const res = await fetch('/api/gestao/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'toggle_rule',
          category,
          ...patch,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Erro ao atualizar regra.');
      toast.success('Configuração de notificação atualizada.');
      await refreshDashboard();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Falha ao atualizar regra.');
    } finally {
      setTogglingKey(null);
    }
  }

  async function handleSendManual(e: React.FormEvent) {
    e.preventDefault();
    if (title.trim().length < 3 || message.trim().length < 4) {
      toast.error('Informe título e mensagem válidos.');
      return;
    }
    setSending(true);
    try {
      const res = await fetch('/api/gestao/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'send_manual',
          targetType,
          targetArea: targetType === 'AREA' ? targetArea : undefined,
          targetMemberId: targetType === 'MEMBER' ? targetMemberId : undefined,
          title: title.trim(),
          message: message.trim(),
          link: link.trim() || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Erro ao enviar notificação.');
      toast.success(`Notificação enviada no app para ${json.sentCount} integrante(s)!`);
      setTitle('');
      setMessage('');
      await refreshDashboard();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao enviar notificação.');
    } finally {
      setSending(false);
    }
  }

  async function handleCleanup() {
    setCleaning(true);
    try {
      const res = await fetch('/api/gestao/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cleanup_read', daysOld: 30 }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Erro ao limpar notificações.');
      toast.success(`${json.deleted} notificações lidas antigas removidas.`);
      await refreshDashboard();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Falha ao limpar.');
    } finally {
      setCleaning(false);
    }
  }

  return (
    <section className="space-y-6 border-t border-border pt-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-primary">
            <BellRing className="h-3.5 w-3.5" />
            Notificações no App
          </span>
          <h2 className="mt-2 font-display text-xl font-bold text-foreground">
            Administração de Notificações (Sininho)
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Ative ou desative gatilhos automáticos, envie avisos manuais para integrantes e acompanhe as entregas no sininho do sistema.
          </p>
        </div>

        <button
          type="button"
          disabled={cleaning}
          onClick={() => void handleCleanup()}
          className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-border bg-card px-3 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground cursor-pointer disabled:opacity-50"
        >
          <Trash2 className="h-3.5 w-3.5" />
          {cleaning ? 'Limpando…' : 'Limpar lidas (+30 dias)'}
        </button>
      </div>

      {/* KPIs */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
            Gatilhos Ativos
          </p>
          <p className="mt-1 font-mono text-2xl font-bold text-foreground tabular-nums">
            {data.stats.activeRulesCount} / {data.rules.length}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
            Total Emitido
          </p>
          <p className="mt-1 font-mono text-2xl font-bold text-foreground tabular-nums">
            {data.stats.totalNotifications}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
            Não Lidas no App
          </p>
          <p className="mt-1 font-mono text-2xl font-bold text-rose-600 dark:text-rose-400 tabular-nums">
            {data.stats.unreadNotifications}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
            Últimas 24h
          </p>
          <p className="mt-1 font-mono text-2xl font-bold text-sky-600 dark:text-sky-400 tabular-nums">
            {data.stats.last24hCount}
          </p>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-5">
        {/* Regras automáticas */}
        <div className="xl:col-span-3 rounded-2xl border border-border bg-card overflow-hidden">
          <div className="border-b border-border bg-muted/35 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Sparkles className="h-4 w-4 text-primary" />
              Gatilhos Automáticos por Evento
            </div>
            <span className="text-[11px] text-muted-foreground">
              Alternância imediata
            </span>
          </div>

          <div className="divide-y divide-border">
            {data.rules.map(rule => {
              const busy = togglingKey === rule.category;
              return (
                <div
                  key={rule.category}
                  className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={cn(
                          'rounded-full border px-2 py-0.5 text-[11px] font-semibold',
                          TONE_BADGE[rule.tone]
                        )}
                      >
                        {rule.label}
                      </span>
                      <span className="text-[11px] font-mono text-muted-foreground">
                        {rule.sentCount} emitidas · {rule.unreadCount} não lidas
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">{rule.description}</p>
                    {rule.supportsManagementToggle && (
                      <label className="mt-1.5 inline-flex items-center gap-2 text-xs text-foreground cursor-pointer">
                        <input
                          type="checkbox"
                          disabled={busy || !rule.enabled}
                          checked={rule.sendToManagement}
                          onChange={e =>
                            void handleToggleRule(rule.category, {
                              sendToManagement: e.target.checked,
                            })
                          }
                          className="h-4 w-4 rounded border-border accent-primary"
                        />
                        <span>Notificar todos os membros da Gestão / Admin</span>
                      </label>
                    )}
                  </div>

                  <button
                    type="button"
                    disabled={busy}
                    onClick={() =>
                      void handleToggleRule(rule.category, { enabled: !rule.enabled })
                    }
                    className={cn(
                      'inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-lg border px-3 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50',
                      rule.enabled
                        ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                        : 'border-border bg-muted text-muted-foreground'
                    )}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    {rule.enabled ? 'Ativado' : 'Desativado'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Envio manual no app */}
        <form
          onSubmit={handleSendManual}
          className="xl:col-span-2 rounded-2xl border border-border bg-card p-5 space-y-4 h-fit"
        >
          <div className="flex items-center gap-2 border-b border-border pb-3">
            <Users className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">
              Enviar Notificação Manual no App
            </h3>
          </div>

          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                Destinatários
              </label>
              <select
                value={targetType}
                onChange={e =>
                  setTargetType(
                    e.target.value as 'ALL' | 'AREA' | 'MEMBER' | 'MANAGEMENT'
                  )
                }
                className="min-h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground"
              >
                <option value="ALL">Todos os integrantes ativos ({data.members.length})</option>
                <option value="MANAGEMENT">Somente Gestão / Coordenação / Admin</option>
                <option value="AREA">Por área específica</option>
                <option value="MEMBER">Integrante específico</option>
              </select>
            </div>

            {targetType === 'AREA' && (
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  Área
                </label>
                <select
                  value={targetArea}
                  onChange={e => setTargetArea(e.target.value)}
                  className="min-h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground"
                >
                  {data.areas.map(area => (
                    <option key={area} value={area}>
                      {area}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {targetType === 'MEMBER' && (
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  Integrante
                </label>
                <select
                  value={targetMemberId}
                  onChange={e => setTargetMemberId(e.target.value)}
                  className="min-h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground"
                >
                  {data.members.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.area})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                Título curto *
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Ex: Reunião Geral adiada para amanhã"
                className="min-h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                Mensagem da notificação *
              </label>
              <textarea
                required
                rows={3}
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder="Explique o aviso de forma direta para aparecer no sininho dos membros…"
                className="w-full rounded-lg border border-input bg-background p-3 text-sm text-foreground"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                Atalho ao clicar (opcional)
              </label>
              <select
                value={link}
                onChange={e => setLink(e.target.value)}
                className="min-h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground"
              >
                {QUICK_ROUTES.map(r => (
                  <option key={r.value || 'none'} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <button
            type="submit"
            disabled={sending}
            className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60 cursor-pointer"
          >
            <Send className="h-3.5 w-3.5" />
            {sending ? 'Enviando notificação…' : 'Disparar no Sininho'}
          </button>
        </form>
      </div>

      {/* Últimas notificações emitidas */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="border-b border-border bg-muted/35 px-4 py-3 flex items-center gap-2 text-sm font-semibold text-foreground">
          <Bell className="h-4 w-4 text-primary" />
          Últimas Notificações Registradas ({data.recentLogs.length})
        </div>
        {data.recentLogs.length === 0 ? (
          <div className="p-6 text-center text-xs text-muted-foreground">
            Nenhuma notificação emitida ainda.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-border bg-muted/20 text-[11px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-2.5">Destinatário</th>
                  <th className="px-4 py-2.5">Tipo</th>
                  <th className="px-4 py-2.5">Conteúdo</th>
                  <th className="px-4 py-2.5">Status</th>
                  <th className="px-4 py-2.5">Quando</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.recentLogs.map(log => (
                  <tr key={log.id} className="hover:bg-muted/20">
                    <td className="px-4 py-2.5 font-medium text-foreground whitespace-nowrap">
                      {log.recipientName}
                      <div className="text-[10px] font-normal text-muted-foreground">
                        {log.recipientArea}
                      </div>
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap text-muted-foreground">
                      {log.categoryLabel}
                    </td>
                    <td className="px-4 py-2.5 max-w-md">
                      <div className="font-semibold text-foreground">{log.title}</div>
                      <div className="text-muted-foreground line-clamp-1">{log.message}</div>
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      {log.readAt ? (
                        <span className="rounded-full bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300">
                          Lida
                        </span>
                      ) : (
                        <span className="rounded-full bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:text-amber-300">
                          Não lida
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap font-mono text-muted-foreground">
                      {new Date(log.createdAt).toLocaleString('pt-BR', {
                        day: '2-digit',
                        month: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
