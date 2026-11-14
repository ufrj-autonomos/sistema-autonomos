'use client';

import { useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Eye,
  Mail,
  RefreshCw,
  Search,
  SkipForward,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { EmailDispatchLogDTO, EmailLogCategory, EmailLogsDashboardData } from '@/lib/email-logs';

const CATEGORY_BADGE: Record<EmailLogCategory, string> = {
  DISCIPLINARY: 'bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/30',
  LAB_HOURS_ALERT: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30',
  REIMBURSEMENT: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
  ACCOUNT_APPROVED: 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border-cyan-500/30',
  AUTH_CODE: 'bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30',
  EMAIL_CHANGE: 'bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30',
  OTHER: 'bg-muted text-muted-foreground border-border',
};

function formatDateTimeBr(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export function EmailLogsPanel({
  initialData,
}: {
  initialData: EmailLogsDashboardData;
}) {
  const [data, setData] = useState<EmailLogsDashboardData>(initialData);
  const [category, setCategory] = useState('ALL');
  const [status, setStatus] = useState('ALL');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedLog, setSelectedLog] = useState<EmailDispatchLogDTO | null>(null);

  async function refresh(nextCategory = category, nextStatus = status, nextSearch = search) {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams();
      if (nextCategory !== 'ALL') qs.set('category', nextCategory);
      if (nextStatus !== 'ALL') qs.set('status', nextStatus);
      if (nextSearch.trim()) qs.set('q', nextSearch.trim());

      const res = await fetch(`/api/gestao/emails?${qs.toString()}`, {
        cache: 'no-store',
      });
      const payload = await res.json().catch(() => null);
      if (!res.ok) {
        setError(payload?.error || 'Falha ao carregar logs de e-mail.');
        return;
      }
      setData(payload);
    } catch {
      setError('Erro de conexão ao consultar logs de e-mail.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="space-y-4 pt-6 border-t border-border">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-1.5 font-mono text-xs uppercase tracking-wider text-muted-foreground">
            <Mail className="h-3.5 w-3.5 text-cyan-500" />
            <span>SISTEMA DE E-MAILS &amp; NOTIFICAÇÕES</span>
          </div>
          <h2 className="font-display text-xl sm:text-2xl font-bold text-foreground mt-1">
            Log de E-mails Enviados
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Registro automático de todos os e-mails disparados para membros (punições, alertas de horas, reembolsos e conta).
          </p>
        </div>

        <button
          type="button"
          disabled={loading}
          onClick={() => void refresh()}
          className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3.5 py-2 text-xs font-semibold text-foreground hover:bg-muted disabled:opacity-50 transition cursor-pointer"
        >
          <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
          <span>Atualizar logs</span>
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Total registrado
          </p>
          <p className="mt-1.5 text-2xl font-bold tabular-nums text-foreground">{data.stats.total}</p>
        </div>
        <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/5 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
            Enviados com sucesso
          </p>
          <p className="mt-1.5 text-2xl font-bold tabular-nums text-emerald-700 dark:text-emerald-300">
            {data.stats.sent}
          </p>
        </div>
        <div className="rounded-xl border border-cyan-500/25 bg-cyan-500/5 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-cyan-700 dark:text-cyan-400">
            Últimas 24h
          </p>
          <p className="mt-1.5 text-2xl font-bold tabular-nums text-cyan-700 dark:text-cyan-300">
            {data.stats.last24h}
          </p>
        </div>
        <div className="rounded-xl border border-red-500/25 bg-red-500/5 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-red-700 dark:text-red-400">
            Falhas / Pulados
          </p>
          <p className="mt-1.5 text-2xl font-bold tabular-nums text-red-700 dark:text-red-300">
            {data.stats.failed + data.stats.skipped}
          </p>
        </div>
      </div>

      {/* Filtros */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void refresh();
        }}
        className="flex flex-wrap items-center gap-2.5"
      >
        <div className="relative flex-1 min-w-56">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por membro, e-mail, assunto ou conteúdo..."
            className="w-full h-9 pl-9 pr-3 rounded-lg border border-border bg-background text-xs text-foreground focus:outline-hidden focus:ring-2 focus:ring-ring"
          />
        </div>

        <select
          value={category}
          onChange={(e) => {
            const val = e.target.value;
            setCategory(val);
            void refresh(val, status, search);
          }}
          className="h-9 px-3 rounded-lg border border-border bg-background text-xs text-foreground focus:outline-hidden focus:ring-2 focus:ring-ring"
        >
          <option value="ALL">Todas as categorias</option>
          <option value="DISCIPLINARY">Disciplinar</option>
          <option value="LAB_HOURS_ALERT">Alerta de Horas</option>
          <option value="REIMBURSEMENT">Reembolso</option>
          <option value="ACCOUNT_APPROVED">Aprovação de Conta</option>
          <option value="AUTH_CODE">Código de Senha</option>
        </select>

        <select
          value={status}
          onChange={(e) => {
            const val = e.target.value;
            setStatus(val);
            void refresh(category, val, search);
          }}
          className="h-9 px-3 rounded-lg border border-border bg-background text-xs text-foreground focus:outline-hidden focus:ring-2 focus:ring-ring"
        >
          <option value="ALL">Todos os status</option>
          <option value="SENT">Enviados</option>
          <option value="FAILED">Com falha</option>
          <option value="SKIPPED">SMTP não config.</option>
        </select>

        <button
          type="submit"
          disabled={loading}
          className="h-9 px-3.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 disabled:opacity-50 transition cursor-pointer"
        >
          Filtrar
        </button>
      </form>

      {error && (
        <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-xs text-red-700 dark:text-red-300">
          {error}
        </p>
      )}

      {/* Tabela de Logs */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-muted/50 text-muted-foreground uppercase tracking-wider border-b border-border">
              <tr>
                <th className="px-4 py-3 font-semibold">Data / Hora</th>
                <th className="px-4 py-3 font-semibold">Membro / Destinatário</th>
                <th className="px-4 py-3 font-semibold">Tipo</th>
                <th className="px-4 py-3 font-semibold">Qual foi o e-mail (Assunto)</th>
                <th className="px-4 py-3 font-semibold text-center">Status</th>
                <th className="px-4 py-3 font-semibold text-right">Detalhes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data.logs.length > 0 ? (
                data.logs.map((log) => (
                  <tr key={log.id} className="hover:bg-muted/35 transition">
                    <td className="px-4 py-3 whitespace-nowrap font-mono text-[11px] text-muted-foreground">
                      {formatDateTimeBr(log.createdAt)}
                    </td>

                    <td className="px-4 py-3">
                      <p className="font-semibold text-foreground">
                        {log.recipientName || 'Sem vínculo'}
                        {log.recipientArea && (
                          <span className="ml-1.5 font-normal text-[11px] text-muted-foreground">
                            · {log.recipientArea}
                          </span>
                        )}
                      </p>
                      <p className="text-[11px] font-mono text-muted-foreground break-all">
                        {log.recipientEmail}
                      </p>
                    </td>

                    <td className="px-4 py-3 whitespace-nowrap">
                      <span
                        className={cn(
                          'inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold',
                          CATEGORY_BADGE[log.category] || CATEGORY_BADGE.OTHER
                        )}
                      >
                        {log.categoryLabel}
                      </span>
                    </td>

                    <td className="px-4 py-3 max-w-md">
                      <p className="font-medium text-foreground truncate" title={log.subject}>
                        {log.subject}
                      </p>
                      {log.previewText && (
                        <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                          {log.previewText.replace(/\s+/g, ' ').slice(0, 120)}
                        </p>
                      )}
                      {log.errorMessage && (
                        <p className="text-[11px] text-red-600 dark:text-red-400 mt-0.5 truncate">
                          Erro: {log.errorMessage}
                        </p>
                      )}
                    </td>

                    <td className="px-4 py-3 text-center whitespace-nowrap">
                      {log.status === 'SENT' ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
                          <CheckCircle2 className="h-3 w-3" />
                          Enviado
                        </span>
                      ) : log.status === 'FAILED' ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-red-500/15 px-2.5 py-0.5 text-[11px] font-semibold text-red-700 dark:text-red-300">
                          <AlertCircle className="h-3 w-3" />
                          Falhou
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2.5 py-0.5 text-[11px] font-semibold text-amber-700 dark:text-amber-300">
                          <SkipForward className="h-3 w-3" />
                          Pulado
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => setSelectedLog(log)}
                        className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1 text-[11px] font-medium text-foreground hover:bg-muted transition cursor-pointer"
                      >
                        <Eye className="h-3 w-3" />
                        <span>Ver</span>
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-sm text-muted-foreground">
                    Nenhum registro de e-mail encontrado com os filtros atuais.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {data.totalCount > data.logs.length && (
          <div className="px-4 py-2.5 border-t border-border bg-muted/20 text-[11px] text-muted-foreground">
            Exibindo os {data.logs.length} registros mais recentes de {data.totalCount} encontrados.
          </div>
        )}
      </div>

      {/* Modal de visualização do conteúdo */}
      {selectedLog && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs"
          onClick={() => setSelectedLog(null)}
        >
          <div
            className="w-full max-w-xl rounded-2xl border border-border bg-card p-5 shadow-xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 border-b border-border pb-3">
              <div>
                <span
                  className={cn(
                    'inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold',
                    CATEGORY_BADGE[selectedLog.category] || CATEGORY_BADGE.OTHER
                  )}
                >
                  {selectedLog.categoryLabel}
                </span>
                <h3 className="mt-2 text-base font-bold text-foreground">
                  {selectedLog.subject}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Para: <strong>{selectedLog.recipientName || 'Destinatário'}</strong> ({selectedLog.recipientEmail}) &bull;{' '}
                  {formatDateTimeBr(selectedLog.createdAt)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer"
                aria-label="Fechar detalhes"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {selectedLog.errorMessage && (
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-700 dark:text-red-300">
                <strong>Erro no envio:</strong> {selectedLog.errorMessage}
              </div>
            )}

            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                Conteúdo enviado
              </p>
              <pre className="whitespace-pre-wrap break-words rounded-xl border border-border bg-background p-3.5 font-mono text-xs leading-relaxed text-foreground max-h-72 overflow-y-auto">
                {selectedLog.previewText || '(Sem resumo de texto disponível)'}
              </pre>
            </div>

            {selectedLog.metadata && (
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                  Metadados
                </p>
                <pre className="whitespace-pre-wrap rounded-xl border border-border bg-muted/30 p-3 font-mono text-[11px] text-muted-foreground">
                  {JSON.stringify(selectedLog.metadata, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
