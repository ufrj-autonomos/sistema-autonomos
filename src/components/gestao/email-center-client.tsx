'use client';

import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Bot,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  History,
  Mail,
  Power,
  RefreshCw,
  Search,
  Send,
  Sparkles,
  UserCheck,
  Users,
  Wand2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { EmailLogsDashboardData } from '@/lib/email-logs';
import type {
  AiEmailDraft,
  BatchSendSummary,
  EmailCenterData,
  EmailSituationKey,
  EmailSituationSnapshot,
} from '@/lib/email-center';
import type { EmailAccent } from '@/lib/email-templates';
import { EmailLogsPanel } from './email-logs-panel';

type TabKey = 'situations' | 'ai' | 'individual' | 'logs';
type AudienceMode = 'members' | 'situation' | 'area';

function formatDateBr(iso: string | null): string {
  if (!iso) return 'Nunca disparado';
  return new Date(iso).toLocaleString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function EmailCenterClient({
  initialCenter,
  initialLogs,
}: {
  initialCenter: EmailCenterData;
  initialLogs: EmailLogsDashboardData;
}) {
  const [center, setCenter] = useState<EmailCenterData>(initialCenter);
  const [activeTab, setActiveTab] = useState<TabKey>('situations');
  const [refreshing, setRefreshing] = useState(false);
  const [logsRefreshKey, setLogsRefreshKey] = useState(0);
  const [globalBanner, setGlobalBanner] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  // Tab 1: Situations state
  const [expandedSituations, setExpandedSituations] = useState<Record<string, boolean>>({});
  const [busyKey, setBusyKey] = useState<string | null>(null);

  // Tab 2: AI Studio state
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiAccent, setAiAccent] = useState<EmailAccent>('cyan');
  const [aiCtaPath, setAiCtaPath] = useState('/perfil');
  const [aiInstruction, setAiInstruction] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiDraft, setAiDraft] = useState<AiEmailDraft | null>(null);
  const [showManualEdit, setShowManualEdit] = useState(false);
  const [audienceMode, setAudienceMode] = useState<AudienceMode>('situation');
  const [aiTargetSituation, setAiTargetSituation] = useState<EmailSituationKey>('INCOMPLETE_PROFILE');
  const [aiTargetArea, setAiTargetArea] = useState<string>('ALL_ACTIVE');
  const [aiMemberSearch, setAiMemberSearch] = useState('');
  const [aiSelectedMemberIds, setAiSelectedMemberIds] = useState<string[]>([]);
  const [aiSending, setAiSending] = useState(false);

  // Tab 3: Individual member send state
  const [indivSearch, setIndivSearch] = useState('');
  const [indivMemberId, setIndivMemberId] = useState<string>(
    initialCenter.members.find((m) => Boolean(m.email))?.memberId || ''
  );
  const [indivKind, setIndivKind] = useState<'CUSTOM' | EmailSituationKey>('CUSTOM');
  const [indivSubject, setIndivSubject] = useState('');
  const [indivAccent, setIndivAccent] = useState<EmailAccent>('cyan');
  const [indivBody, setIndivBody] = useState('Olá, {{NOME}}!\n\n');
  const [indivCtaPath, setIndivCtaPath] = useState('/');
  const [indivSending, setIndivSending] = useState(false);

  const enabledRulesCount = useMemo(
    () => center.situations.filter((s) => s.automation.enabled).length,
    [center.situations]
  );
  const labPendingCount =
    center.situations.find((s) => s.key === 'LAB_HOURS_PENDING')?.emailableCount ?? 0;
  const incompleteProfileCount =
    center.situations.find((s) => s.key === 'INCOMPLETE_PROFILE')?.emailableCount ?? 0;

  async function refreshAll(bumpLogs = true) {
    setRefreshing(true);
    try {
      const res = await fetch('/api/gestao/emails/center', { cache: 'no-store' });
      const payload = await res.json().catch(() => null);
      if (res.ok && payload?.situations) {
        setCenter(payload);
      }
      if (bumpLogs) setLogsRefreshKey((k) => k + 1);
    } finally {
      setRefreshing(false);
    }
  }

  function showSummaryBanner(label: string, summary: BatchSendSummary) {
    const parts = [`${summary.sentCount} enviado(s)`];
    if (summary.failedCount > 0) parts.push(`${summary.failedCount} falha(s)`);
    if (summary.skippedNoEmailCount > 0) parts.push(`${summary.skippedNoEmailCount} sem e-mail`);
    if (summary.skippedAlreadySentCount > 0) parts.push(`${summary.skippedAlreadySentCount} já notificado(s) recentemente`);
    setGlobalBanner({
      kind: summary.failedCount > 0 && summary.sentCount === 0 ? 'err' : 'ok',
      text: `${label}: ${parts.join(' • ')}.`,
    });
  }

  async function handleToggleRule(sit: EmailSituationSnapshot) {
    setBusyKey(`toggle:${sit.key}`);
    setGlobalBanner(null);
    try {
      const res = await fetch('/api/gestao/emails/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'toggle_rule',
          situationKey: sit.key,
          enabled: !sit.automation.enabled,
          cooldownDays: sit.automation.cooldownDays,
        }),
      });
      const payload = await res.json().catch(() => null);
      if (!res.ok) {
        setGlobalBanner({ kind: 'err', text: payload?.error || 'Erro ao atualizar automação.' });
        return;
      }
      setGlobalBanner({
        kind: 'ok',
        text: `Automação "${sit.title}" ${!sit.automation.enabled ? 'ativada' : 'pausada'} com sucesso.`,
      });
      await refreshAll(false);
    } finally {
      setBusyKey(null);
    }
  }

  async function handleSendSituation(
    situationKey: EmailSituationKey,
    options: { memberId?: string; memberName?: string; onlyPendingInWindow?: boolean }
  ) {
    const actionKey = options.memberId
      ? `sit:${situationKey}:m:${options.memberId}`
      : `sit:${situationKey}:all:${options.onlyPendingInWindow ? 'pending' : 'force'}`;
    setBusyKey(actionKey);
    setGlobalBanner(null);
    try {
      const res = await fetch('/api/gestao/emails/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'send_situation',
          situationKey,
          memberId: options.memberId,
          onlyPendingInWindow: options.onlyPendingInWindow,
        }),
      });
      const payload = await res.json().catch(() => null);
      if (!res.ok) {
        setGlobalBanner({ kind: 'err', text: payload?.error || 'Falha ao disparar e-mails.' });
        return;
      }
      const label = options.memberName
        ? `Envio para ${options.memberName}`
        : `Disparo (${center.situations.find((s) => s.key === situationKey)?.title})`;
      showSummaryBanner(label, payload.summary);
      await refreshAll(true);
    } finally {
      setBusyKey(null);
    }
  }

  async function handleGenerateAi(isRefinement = false) {
    setAiLoading(true);
    setGlobalBanner(null);
    try {
      const sitTitle =
        audienceMode === 'situation'
          ? center.situations.find((s) => s.key === aiTargetSituation)?.title || null
          : null;
      const res = await fetch('/api/gestao/emails/ai-draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'generate',
          prompt: aiPrompt,
          instruction: isRefinement ? aiInstruction : undefined,
          currentDraft: isRefinement ? aiDraft : null,
          situationContext: sitTitle,
          accent: aiAccent,
          ctaPath: aiCtaPath,
        }),
      });
      const payload = await res.json().catch(() => null);
      if (!res.ok || !payload?.draft) {
        setGlobalBanner({ kind: 'err', text: payload?.error || 'Falha ao gerar e-mail com IA.' });
        return;
      }
      setAiDraft(payload.draft);
      if (isRefinement) setAiInstruction('');
    } finally {
      setAiLoading(false);
    }
  }

  async function handleRefreshManualPreview() {
    if (!aiDraft) return;
    setAiLoading(true);
    try {
      const res = await fetch('/api/gestao/emails/ai-draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'preview',
          subject: aiDraft.subject,
          eyebrow: aiDraft.eyebrow,
          heading: aiDraft.heading,
          subtitle: aiDraft.subtitle,
          bodyText: aiDraft.bodyText,
          accent: aiDraft.accent,
          ctaLabel: aiDraft.ctaLabel,
          ctaPath: aiDraft.ctaPath,
        }),
      });
      const payload = await res.json().catch(() => null);
      if (res.ok && payload?.previewHtml) {
        setAiDraft((prev) =>
          prev
            ? {
                ...prev,
                subject: payload.subject || prev.subject,
                previewHtml: payload.previewHtml,
              }
            : prev
        );
      }
    } finally {
      setAiLoading(false);
    }
  }

  const aiFilteredMembers = useMemo(() => {
    const q = aiMemberSearch.trim().toLowerCase();
    return center.members.filter((m) => {
      if (!q) return true;
      return (
        m.name.toLowerCase().includes(q) ||
        m.area.toLowerCase().includes(q) ||
        (m.email || '').toLowerCase().includes(q)
      );
    });
  }, [center.members, aiMemberSearch]);

  const aiTargetCount = useMemo(() => {
    if (audienceMode === 'situation') {
      return center.situations.find((s) => s.key === aiTargetSituation)?.emailableCount ?? 0;
    }
    if (audienceMode === 'members') {
      const set = new Set(aiSelectedMemberIds);
      return center.members.filter((m) => set.has(m.memberId) && Boolean(m.email)).length;
    }
    if (aiTargetArea === 'ALL_ACTIVE') {
      return center.members.filter((m) => Boolean(m.email)).length;
    }
    return center.members.filter(
      (m) => Boolean(m.email) && m.area.toLowerCase() === aiTargetArea.toLowerCase()
    ).length;
  }, [audienceMode, aiTargetSituation, aiSelectedMemberIds, aiTargetArea, center]);

  async function handleApproveAndSendAi() {
    if (!aiDraft) return;
    setAiSending(true);
    setGlobalBanner(null);
    try {
      const res = await fetch('/api/gestao/emails/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'send_custom',
          subject: aiDraft.subject,
          eyebrow: aiDraft.eyebrow,
          heading: aiDraft.heading,
          subtitle: aiDraft.subtitle,
          bodyText: aiDraft.bodyText,
          accent: aiDraft.accent,
          ctaLabel: aiDraft.ctaLabel,
          ctaPath: aiDraft.ctaPath,
          generatedByAi: true,
          ...(audienceMode === 'situation' ? { situationKey: aiTargetSituation } : {}),
          ...(audienceMode === 'members' ? { recipientMemberIds: aiSelectedMemberIds } : {}),
          ...(audienceMode === 'area' ? { areaFilter: aiTargetArea } : {}),
        }),
      });
      const payload = await res.json().catch(() => null);
      if (!res.ok) {
        setGlobalBanner({ kind: 'err', text: payload?.error || 'Erro ao enviar e-mail aprovado.' });
        return;
      }
      showSummaryBanner('E-mail criado com IA aprovado e enviado', payload.summary);
      await refreshAll(true);
    } finally {
      setAiSending(false);
    }
  }

  const indivFilteredMembers = useMemo(() => {
    const q = indivSearch.trim().toLowerCase();
    return center.members.filter((m) => {
      if (!q) return true;
      return (
        m.name.toLowerCase().includes(q) ||
        m.area.toLowerCase().includes(q) ||
        (m.email || '').toLowerCase().includes(q)
      );
    });
  }, [center.members, indivSearch]);

  const selectedMemberObj = useMemo(
    () => center.members.find((m) => m.memberId === indivMemberId) || null,
    [center.members, indivMemberId]
  );

  const selectedMemberSituationMatch = useMemo(() => {
    if (indivKind === 'CUSTOM' || !indivMemberId) return null;
    const sit = center.situations.find((s) => s.key === indivKind);
    return sit?.members.find((m) => m.memberId === indivMemberId) || null;
  }, [center.situations, indivKind, indivMemberId]);

  async function handleSendIndividual() {
    if (!indivMemberId) return;
    setIndivSending(true);
    setGlobalBanner(null);
    try {
      if (indivKind !== 'CUSTOM') {
        await handleSendSituation(indivKind, {
          memberId: indivMemberId,
          memberName: selectedMemberObj?.name || 'Membro',
        });
        return;
      }

      const res = await fetch('/api/gestao/emails/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'send_custom',
          recipientMemberIds: [indivMemberId],
          subject: indivSubject,
          bodyText: indivBody,
          accent: indivAccent,
          ctaPath: indivCtaPath,
          generatedByAi: false,
        }),
      });
      const payload = await res.json().catch(() => null);
      if (!res.ok) {
        setGlobalBanner({ kind: 'err', text: payload?.error || 'Falha ao enviar e-mail individual.' });
        return;
      }
      showSummaryBanner(`Envio individual para ${selectedMemberObj?.name || 'membro'}`, payload.summary);
      setIndivSubject('');
      setIndivBody('Olá, {{NOME}}!\n\n');
      await refreshAll(true);
    } finally {
      setIndivSending(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Automações ativas
          </p>
          <p className="mt-1.5 text-2xl font-bold tabular-nums text-foreground">
            {enabledRulesCount} <span className="text-sm font-normal text-muted-foreground">/ {center.situations.length}</span>
          </p>
        </div>
        <div className="rounded-xl border border-amber-500/25 bg-amber-500/5 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400">
            Horas pendentes (com e-mail)
          </p>
          <p className="mt-1.5 text-2xl font-bold tabular-nums text-amber-700 dark:text-amber-300">
            {labPendingCount}
          </p>
        </div>
        <div className="rounded-xl border border-yellow-500/25 bg-yellow-500/5 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-yellow-700 dark:text-yellow-400">
            Perfis incompletos
          </p>
          <p className="mt-1.5 text-2xl font-bold tabular-nums text-yellow-700 dark:text-yellow-300">
            {incompleteProfileCount}
          </p>
        </div>
        <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/5 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
            E-mails enviados (histórico)
          </p>
          <p className="mt-1.5 text-2xl font-bold tabular-nums text-emerald-700 dark:text-emerald-300">
            {initialLogs.stats.sent}
          </p>
        </div>
      </div>

      {/* Tabs + Refresh */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
        <div className="flex flex-wrap gap-2">
          {(
            [
              { id: 'situations', label: 'Automações & Situações', icon: Power },
              { id: 'ai', label: 'Criar E-mail com IA', icon: Sparkles },
              { id: 'individual', label: 'Envio Individual', icon: UserCheck },
              { id: 'logs', label: 'Histórico & Reenvio', icon: History },
            ] as const
          ).map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold transition cursor-pointer',
                  active
                    ? 'bg-primary text-primary-foreground shadow-xs'
                    : 'border border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        <button
          type="button"
          disabled={refreshing}
          onClick={() => void refreshAll(true)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-xs font-semibold text-foreground hover:bg-muted disabled:opacity-50 transition cursor-pointer"
        >
          <RefreshCw className={cn('h-3.5 w-3.5', refreshing && 'animate-spin')} />
          <span>Atualizar painel</span>
        </button>
      </div>

      {globalBanner && (
        <div
          className={cn(
            'rounded-xl border px-4 py-3 text-xs font-medium flex items-center gap-2',
            globalBanner.kind === 'ok'
              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
              : 'border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300'
          )}
        >
          {globalBanner.kind === 'ok' ? (
            <CheckCircle2 className="h-4 w-4 shrink-0" />
          ) : (
            <AlertTriangle className="h-4 w-4 shrink-0" />
          )}
          <span>{globalBanner.text}</span>
        </div>
      )}

      {/* TAB 1: SITUATIONS & AUTOMATIONS */}
      {activeTab === 'situations' && (
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-muted/25 px-4 py-3 text-xs text-muted-foreground">
            Referência atual do cron: <strong>{center.weekLabel}</strong> &bull;{' '}
            <strong>{center.monthLabel}</strong>. As regras ativadas rodam automaticamente na rotina diária das 19h (BRT) respeitando o intervalo mínimo configurável para não duplicar envios.
          </div>

          <div className="space-y-4">
            {center.situations.map((sit) => {
              const isExpanded = Boolean(expandedSituations[sit.key]);
              return (
                <div
                  key={sit.key}
                  className="rounded-2xl border border-border bg-card overflow-hidden"
                >
                  <div className="p-5 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-2 max-w-2xl">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={cn(
                            'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold',
                            sit.automation.enabled
                              ? 'border-emerald-500/30 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                              : 'border-border bg-muted text-muted-foreground'
                          )}
                        >
                          <Power className="h-3 w-3" />
                          {sit.automation.enabled ? 'Automático Ativo' : 'Automático Pausado'}
                        </span>
                        <span className="rounded-full border border-border bg-background px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground">
                          Cooldown: {sit.automation.cooldownDays}d
                        </span>
                        <span className="rounded-full border border-border bg-background px-2.5 py-0.5 text-[11px] font-semibold text-foreground">
                          {sit.totalCount} pessoa(s) nesta situação ({sit.emailableCount} com e-mail)
                        </span>
                        {sit.missingEmailCount > 0 && (
                          <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 text-[11px] font-medium text-amber-700 dark:text-amber-300">
                            {sit.missingEmailCount} sem e-mail
                          </span>
                        )}
                      </div>

                      <h3 className="text-base font-bold text-foreground">{sit.title}</h3>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {sit.description}
                      </p>
                      <p className="text-[11px] text-muted-foreground/90">
                        <strong className="text-foreground/80">Regra automática:</strong> {sit.scheduleHint} &bull;{' '}
                        <strong className="text-foreground/80">Último disparo em lote:</strong>{' '}
                        {formatDateBr(sit.automation.lastTriggeredAt)}
                        {sit.automation.lastTriggeredAt ? ` (${sit.automation.lastSentCount} envio(s))` : ''}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      <button
                        type="button"
                        disabled={busyKey === `toggle:${sit.key}`}
                        onClick={() => void handleToggleRule(sit)}
                        className={cn(
                          'inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold transition cursor-pointer disabled:opacity-50',
                          sit.automation.enabled
                            ? 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300 hover:bg-amber-500/20'
                            : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20'
                        )}
                      >
                        <Power className="h-3.5 w-3.5" />
                        <span>{sit.automation.enabled ? 'Pausar automático' : 'Ativar automático'}</span>
                      </button>

                      {sit.pendingInWindowCount > 0 && sit.pendingInWindowCount < sit.emailableCount && (
                        <button
                          type="button"
                          disabled={busyKey !== null}
                          onClick={() =>
                            void handleSendSituation(sit.key, { onlyPendingInWindow: true })
                          }
                          className="inline-flex items-center gap-1.5 rounded-lg bg-cyan-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-cyan-500 disabled:opacity-50 transition cursor-pointer"
                        >
                          <Send className="h-3.5 w-3.5" />
                          <span>Enviar pendentes ({sit.pendingInWindowCount})</span>
                        </button>
                      )}

                      <button
                        type="button"
                        disabled={busyKey !== null || sit.emailableCount === 0}
                        onClick={() =>
                          void handleSendSituation(sit.key, { onlyPendingInWindow: false })
                        }
                        className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition cursor-pointer"
                      >
                        <Users className="h-3.5 w-3.5" />
                        <span>
                          {busyKey === `sit:${sit.key}:all:force`
                            ? 'Enviando...'
                            : `Enviar para todos (${sit.emailableCount})`}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          setExpandedSituations((prev) => ({
                            ...prev,
                            [sit.key]: !prev[sit.key],
                          }))
                        }
                        className="inline-flex items-center gap-1 rounded-lg border border-border bg-background px-3 py-2 text-xs font-medium text-foreground hover:bg-muted transition cursor-pointer"
                      >
                        <span>{isExpanded ? 'Ocultar lista' : 'Ver pessoas'}</span>
                        {isExpanded ? (
                          <ChevronUp className="h-3.5 w-3.5" />
                        ) : (
                          <ChevronDown className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="border-t border-border bg-muted/20 overflow-x-auto">
                      {sit.members.length === 0 ? (
                        <p className="px-5 py-6 text-xs text-muted-foreground text-center">
                          Nenhum integrante se encontra nesta situação no momento.
                        </p>
                      ) : (
                        <table className="w-full text-left text-xs border-collapse">
                          <thead className="bg-muted/40 text-muted-foreground uppercase tracking-wider border-b border-border">
                            <tr>
                              <th className="px-4 py-2.5 font-semibold">Integrante</th>
                              <th className="px-4 py-2.5 font-semibold">Motivo / Situação</th>
                              <th className="px-4 py-2.5 font-semibold">Status na janela</th>
                              <th className="px-4 py-2.5 font-semibold text-right">Ação individual</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border">
                            {sit.members.map((m) => (
                              <tr key={m.memberId} className="hover:bg-muted/30">
                                <td className="px-4 py-2.5">
                                  <p className="font-semibold text-foreground">
                                    {m.name}
                                    <span className="ml-1.5 font-normal text-[11px] text-muted-foreground">
                                      · {m.area}
                                    </span>
                                  </p>
                                  <p className="font-mono text-[11px] text-muted-foreground">
                                    {m.email || 'Sem e-mail cadastrado'}
                                  </p>
                                </td>
                                <td className="px-4 py-2.5 text-muted-foreground max-w-md">
                                  {m.reasonSummary}
                                </td>
                                <td className="px-4 py-2.5 whitespace-nowrap">
                                  {m.alreadySentInWindow ? (
                                    <span className="inline-flex items-center rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:text-emerald-300">
                                      Enviado ({formatDateBr(m.lastSentAt)})
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-medium text-amber-700 dark:text-amber-300">
                                      Ainda não notificado
                                    </span>
                                  )}
                                </td>
                                <td className="px-4 py-2.5 text-right whitespace-nowrap">
                                  <button
                                    type="button"
                                    disabled={!m.email || busyKey !== null}
                                    onClick={() =>
                                      void handleSendSituation(sit.key, {
                                        memberId: m.memberId,
                                        memberName: m.name,
                                      })
                                    }
                                    className="inline-flex items-center gap-1 rounded-lg border border-border bg-card px-2.5 py-1 text-[11px] font-semibold text-foreground hover:bg-muted disabled:opacity-40 transition cursor-pointer"
                                  >
                                    <Send className="h-3 w-3" />
                                    <span>
                                      {busyKey === `sit:${sit.key}:m:${m.memberId}`
                                        ? 'Enviando...'
                                        : 'Enviar'}
                                    </span>
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: AI EMAIL STUDIO */}
      {activeTab === 'ai' && (
        <div className="grid gap-6 lg:grid-cols-12">
          {/* Left column: Prompt + refinement + audience */}
          <div className="lg:col-span-5 space-y-4">
            <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
              <div className="flex items-center gap-2">
                <Bot className="h-4 w-4 text-cyan-500" />
                <h3 className="text-sm font-bold text-foreground">
                  1. Descreva o e-mail para a IA criar
                </h3>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground block">
                  O que este e-mail deve comunicar?
                </label>
                <textarea
                  rows={4}
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder="Ex.: Avise aos integrantes com perfil incompleto que precisam preencher CPF, DRE, foto e biografia até quarta-feira às 20h, pois só se tornam membros oficiais após concluir o perfil."
                  className="w-full rounded-xl border border-border bg-background p-3 text-xs text-foreground focus:outline-hidden focus:ring-2 focus:ring-ring"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block mb-1">
                    Tom / Destaque
                  </label>
                  <select
                    value={aiAccent}
                    onChange={(e) => setAiAccent(e.target.value as EmailAccent)}
                    className="w-full h-9 rounded-lg border border-border bg-background px-2.5 text-xs text-foreground"
                  >
                    <option value="cyan">Informativo (Azul)</option>
                    <option value="emerald">Positivo (Verde)</option>
                    <option value="amber">Aviso / Atenção (Âmbar)</option>
                    <option value="red">Urgente / Crítico (Vermelho)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block mb-1">
                    Link do Botão (CTA)
                  </label>
                  <select
                    value={aiCtaPath}
                    onChange={(e) => setAiCtaPath(e.target.value)}
                    className="w-full h-9 rounded-lg border border-border bg-background px-2.5 text-xs text-foreground"
                  >
                    <option value="/perfil">Meu Perfil (/perfil)</option>
                    <option value="/reunioes">Reuniões (/reunioes)</option>
                    <option value="/presenca">Presença no Lab (/presenca)</option>
                    <option value="/">Início da Plataforma (/)</option>
                    <option value="/forgot-password">Definir Senha (/forgot-password)</option>
                  </select>
                </div>
              </div>

              <button
                type="button"
                disabled={aiLoading || aiPrompt.trim().length < 5}
                onClick={() => void handleGenerateAi(false)}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition cursor-pointer"
              >
                <Sparkles className="h-4 w-4" />
                <span>{aiLoading ? 'Gerando rascunho...' : aiDraft ? 'Gerar Novo Rascunho' : 'Gerar E-mail com IA'}</span>
              </button>
            </div>

            {aiDraft && (
              <>
                <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
                  <div className="flex items-center gap-2">
                    <Wand2 className="h-4 w-4 text-cyan-500" />
                    <h3 className="text-sm font-bold text-foreground">
                      2. Pedir mudanças à IA
                    </h3>
                  </div>
                  <textarea
                    rows={2}
                    value={aiInstruction}
                    onChange={(e) => setAiInstruction(e.target.value)}
                    placeholder="Ex.: Deixe mais curto, adicione o prazo de sexta às 18h ou mude o tom para mais urgente..."
                    className="w-full rounded-xl border border-border bg-background p-3 text-xs text-foreground focus:outline-hidden focus:ring-2 focus:ring-ring"
                  />
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={aiLoading || aiInstruction.trim().length < 3}
                      onClick={() => void handleGenerateAi(true)}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-3 py-2 text-xs font-semibold text-cyan-700 dark:text-cyan-300 hover:bg-cyan-500/20 disabled:opacity-50 transition cursor-pointer"
                    >
                      <Wand2 className="h-3.5 w-3.5" />
                      <span>Aplicar Alterações com IA</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowManualEdit((v) => !v)}
                      className="rounded-lg border border-border bg-background px-3 py-2 text-xs font-medium text-foreground hover:bg-muted transition cursor-pointer"
                    >
                      {showManualEdit ? 'Ocultar edição manual' : 'Editar manualmente'}
                    </button>
                  </div>
                </div>

                {/* Audience Picker & Approval */}
                <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-emerald-500" />
                    <h3 className="text-sm font-bold text-foreground">
                      3. Escolher destinatários e aprovar envio
                    </h3>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    {(
                      [
                        { id: 'situation', label: 'Por Situação' },
                        { id: 'members', label: 'Específicos' },
                        { id: 'area', label: 'Por Área' },
                      ] as const
                    ).map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setAudienceMode(opt.id)}
                        className={cn(
                          'rounded-lg border py-2 px-2 text-[11px] font-semibold transition cursor-pointer',
                          audienceMode === opt.id
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-border bg-background text-muted-foreground hover:text-foreground'
                        )}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>

                  {audienceMode === 'situation' && (
                    <select
                      value={aiTargetSituation}
                      onChange={(e) => setAiTargetSituation(e.target.value as EmailSituationKey)}
                      className="w-full h-9 rounded-lg border border-border bg-background px-3 text-xs text-foreground"
                    >
                      {center.situations.map((s) => (
                        <option key={s.key} value={s.key}>
                          {s.title} ({s.emailableCount} com e-mail)
                        </option>
                      ))}
                    </select>
                  )}

                  {audienceMode === 'area' && (
                    <select
                      value={aiTargetArea}
                      onChange={(e) => setAiTargetArea(e.target.value)}
                      className="w-full h-9 rounded-lg border border-border bg-background px-3 text-xs text-foreground"
                    >
                      <option value="ALL_ACTIVE">
                        Toda a equipe ativa ({center.members.filter((m) => Boolean(m.email)).length} com e-mail)
                      </option>
                      {['Software', 'Mecânica', 'Eletrônica', 'Gestão', 'Marketing'].map((area) => {
                        const cnt = center.members.filter(
                          (m) => Boolean(m.email) && m.area.toLowerCase() === area.toLowerCase()
                        ).length;
                        return (
                          <option key={area} value={area}>
                            Área: {area} ({cnt} com e-mail)
                          </option>
                        );
                      })}
                    </select>
                  )}

                  {audienceMode === 'members' && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="relative flex-1">
                          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                          <input
                            type="text"
                            value={aiMemberSearch}
                            onChange={(e) => setAiMemberSearch(e.target.value)}
                            placeholder="Buscar membro..."
                            className="w-full h-8 pl-8 pr-2.5 rounded-lg border border-border bg-background text-xs"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => setAiSelectedMemberIds([])}
                          className="h-8 px-2.5 rounded-lg border border-border text-[11px] hover:bg-muted cursor-pointer"
                        >
                          Limpar
                        </button>
                      </div>
                      <div className="max-h-48 overflow-y-auto rounded-xl border border-border divide-y divide-border bg-background">
                        {aiFilteredMembers.map((m) => {
                          const checked = aiSelectedMemberIds.includes(m.memberId);
                          return (
                            <label
                              key={m.memberId}
                              className="flex items-center gap-2.5 px-3 py-2 text-xs hover:bg-muted/40 cursor-pointer"
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                disabled={!m.email}
                                onChange={() =>
                                  setAiSelectedMemberIds((prev) =>
                                    checked
                                      ? prev.filter((id) => id !== m.memberId)
                                      : [...prev, m.memberId]
                                  )
                                }
                              />
                              <span className="flex-1 truncate font-medium text-foreground">
                                {m.name}
                                <span className="ml-1 text-[11px] text-muted-foreground">· {m.area}</span>
                              </span>
                              <span className="text-[10px] font-mono text-muted-foreground">
                                {m.email ? m.email : 'sem e-mail'}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <button
                    type="button"
                    disabled={aiSending || aiTargetCount === 0}
                    onClick={() => void handleApproveAndSendAi()}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-emerald-500 disabled:opacity-50 transition cursor-pointer"
                  >
                    <Send className="h-4 w-4" />
                    <span>
                      {aiSending
                        ? 'Enviando e-mails...'
                        : `Aprovar e Enviar Agora (${aiTargetCount} destinatário${aiTargetCount === 1 ? '' : 's'})`}
                    </span>
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Right column: Preview & Optional manual fields */}
          <div className="lg:col-span-7 space-y-4">
            {!aiDraft ? (
              <div className="rounded-2xl border border-dashed border-border bg-card/50 p-10 text-center space-y-2">
                <Sparkles className="h-8 w-8 text-cyan-500 mx-auto opacity-80" />
                <p className="text-sm font-semibold text-foreground">
                  Preview ao vivo do e-mail gerado pela IA
                </p>
                <p className="text-xs text-muted-foreground max-w-md mx-auto">
                  Descreva o comunicado ao lado e clique em <strong>Gerar E-mail com IA</strong>. Você poderá revisar o visual completo antes de aprovar o envio.
                </p>
              </div>
            ) : (
              <div className="rounded-2xl border border-border bg-card overflow-hidden">
                <div className="border-b border-border px-5 py-3.5 flex flex-wrap items-center justify-between gap-2 bg-muted/30">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Preview HTML
                      </span>
                      <span
                        className={cn(
                          'rounded-full px-2 py-0.5 text-[10px] font-semibold',
                          aiDraft.source === 'AI'
                            ? 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-300'
                            : 'bg-amber-500/15 text-amber-700 dark:text-amber-300'
                        )}
                      >
                        {aiDraft.source === 'AI' ? 'Gerado por Gemini IA' : 'Modelo Estruturado Local'}
                      </span>
                    </div>
                    <p className="text-xs font-bold text-foreground">{aiDraft.subject}</p>
                  </div>
                </div>

                {showManualEdit && (
                  <div className="p-4 border-b border-border bg-muted/15 space-y-3">
                    <div className="grid sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] font-semibold text-muted-foreground block mb-1">
                          Assunto
                        </label>
                        <input
                          type="text"
                          value={aiDraft.subject}
                          onChange={(e) => setAiDraft({ ...aiDraft, subject: e.target.value })}
                          className="w-full h-8 px-2.5 rounded-lg border border-border bg-background text-xs"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold text-muted-foreground block mb-1">
                          Título do Cabeçalho
                        </label>
                        <input
                          type="text"
                          value={aiDraft.heading}
                          onChange={(e) => setAiDraft({ ...aiDraft, heading: e.target.value })}
                          className="w-full h-8 px-2.5 rounded-lg border border-border bg-background text-xs"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-muted-foreground block mb-1">
                        Corpo do E-mail (aceita {'{{NOME}}'}, {'{{PRIMEIRO_NOME}}'}, {'{{AREA}}'})
                      </label>
                      <textarea
                        rows={6}
                        value={aiDraft.bodyText}
                        onChange={(e) => setAiDraft({ ...aiDraft, bodyText: e.target.value })}
                        className="w-full p-2.5 rounded-lg border border-border bg-background text-xs font-mono"
                      />
                    </div>
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => void handleRefreshManualPreview()}
                        className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground cursor-pointer"
                      >
                        Atualizar Preview
                      </button>
                    </div>
                  </div>
                )}

                <iframe
                  title="Pré-visualização do e-mail"
                  sandbox=""
                  srcDoc={aiDraft.previewHtml}
                  className="w-full h-[540px] bg-[#050a14] border-0"
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: INDIVIDUAL SEND */}
      {activeTab === 'individual' && (
        <div className="grid gap-6 lg:grid-cols-12">
          <div className="lg:col-span-5 rounded-2xl border border-border bg-card p-5 space-y-3">
            <h3 className="text-sm font-bold text-foreground">
              1. Selecionar integrante
            </h3>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <input
                type="text"
                value={indivSearch}
                onChange={(e) => setIndivSearch(e.target.value)}
                placeholder="Buscar por nome, área ou e-mail..."
                className="w-full h-9 pl-9 pr-3 rounded-lg border border-border bg-background text-xs"
              />
            </div>

            <div className="max-h-96 overflow-y-auto rounded-xl border border-border divide-y divide-border bg-background">
              {indivFilteredMembers.map((m) => {
                const selected = indivMemberId === m.memberId;
                return (
                  <button
                    key={m.memberId}
                    type="button"
                    onClick={() => setIndivMemberId(m.memberId)}
                    className={cn(
                      'w-full text-left px-3.5 py-2.5 transition cursor-pointer flex items-center justify-between gap-2',
                      selected ? 'bg-primary/10' : 'hover:bg-muted/40'
                    )}
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-foreground truncate">
                        {m.name}
                        <span className="ml-1.5 font-normal text-[11px] text-muted-foreground">
                          · {m.area}
                        </span>
                      </p>
                      <p className="text-[11px] font-mono text-muted-foreground truncate">
                        {m.email || 'Sem e-mail cadastrado'}
                      </p>
                    </div>
                    {selected && <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="lg:col-span-7 rounded-2xl border border-border bg-card p-5 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-bold text-foreground">
                2. Escolher conteúdo para {selectedMemberObj?.name || 'o integrante'}
              </h3>
              {selectedMemberObj?.email && (
                <span className="text-[11px] font-mono text-muted-foreground">
                  {selectedMemberObj.email}
                </span>
              )}
            </div>

            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block mb-1.5">
                Tipo de e-mail
              </label>
              <select
                value={indivKind}
                onChange={(e) => setIndivKind(e.target.value as 'CUSTOM' | EmailSituationKey)}
                className="w-full h-9 rounded-lg border border-border bg-background px-3 text-xs text-foreground"
              >
                <option value="CUSTOM">Comunicado Manual Personalizado</option>
                {center.situations.map((s) => (
                  <option key={s.key} value={s.key}>
                    Modelo da Situação: {s.title}
                  </option>
                ))}
              </select>
            </div>

            {indivKind === 'CUSTOM' ? (
              <div className="space-y-3">
                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-muted-foreground block mb-1">
                      Assunto
                    </label>
                    <input
                      type="text"
                      value={indivSubject}
                      onChange={(e) => setIndivSubject(e.target.value)}
                      placeholder="[Autônomos] Aviso importante..."
                      className="w-full h-9 rounded-lg border border-border bg-background px-3 text-xs"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[11px] font-semibold text-muted-foreground block mb-1">
                        Cor
                      </label>
                      <select
                        value={indivAccent}
                        onChange={(e) => setIndivAccent(e.target.value as EmailAccent)}
                        className="w-full h-9 rounded-lg border border-border bg-background px-2 text-xs"
                      >
                        <option value="cyan">Azul</option>
                        <option value="emerald">Verde</option>
                        <option value="amber">Âmbar</option>
                        <option value="red">Vermelho</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-muted-foreground block mb-1">
                        Botão
                      </label>
                      <select
                        value={indivCtaPath}
                        onChange={(e) => setIndivCtaPath(e.target.value)}
                        className="w-full h-9 rounded-lg border border-border bg-background px-2 text-xs"
                      >
                        <option value="/">Início (/)</option>
                        <option value="/perfil">Perfil (/perfil)</option>
                        <option value="/reunioes">Reuniões</option>
                        <option value="/presenca">Presença</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-muted-foreground block mb-1">
                    Mensagem (suporta {'{{NOME}}'}, {'{{PRIMEIRO_NOME}}'}, {'{{AREA}}'})
                  </label>
                  <textarea
                    rows={7}
                    value={indivBody}
                    onChange={(e) => setIndivBody(e.target.value)}
                    className="w-full rounded-xl border border-border bg-background p-3 text-xs"
                  />
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-border bg-muted/25 p-4 text-xs space-y-1.5">
                {selectedMemberSituationMatch ? (
                  <>
                    <p className="font-semibold text-emerald-700 dark:text-emerald-300">
                      Integrante elegível com dados reais desta situação:
                    </p>
                    <p className="text-muted-foreground">
                      {selectedMemberSituationMatch.reasonSummary}
                    </p>
                  </>
                ) : (
                  <p className="text-amber-700 dark:text-amber-300 font-medium">
                    Este integrante não possui pendência ativa nessa situação no momento. Escolha outra situação ou selecione &ldquo;Comunicado Manual Personalizado&rdquo;.
                  </p>
                )}
              </div>
            )}

            <button
              type="button"
              disabled={
                indivSending ||
                !selectedMemberObj?.email ||
                (indivKind === 'CUSTOM' &&
                  (indivSubject.trim().length < 3 || indivBody.trim().length < 5)) ||
                (indivKind !== 'CUSTOM' && !selectedMemberSituationMatch)
              }
              onClick={() => void handleSendIndividual()}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-xs font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition cursor-pointer"
            >
              <Mail className="h-4 w-4" />
              <span>
                {indivSending ? 'Enviando...' : 'Enviar E-mail para Integrante'}
              </span>
            </button>
          </div>
        </div>
      )}

      {/* TAB 4: LOGS & RESEND */}
      {activeTab === 'logs' && (
        <EmailLogsPanel
          initialData={initialLogs}
          refreshKey={logsRefreshKey}
          onResent={() => void refreshAll(false)}
        />
      )}
    </div>
  );
}
