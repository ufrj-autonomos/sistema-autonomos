'use client';
import { Fragment, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, ChevronDown, Download, LayoutGrid, QrCode, RefreshCw, Table2 } from 'lucide-react';
import type { AttendanceMemberDto, AttendanceReport } from '@/lib/attendance/types';
import { formatDuration, formatLabDate, formatLabTime, getAttendanceCardTheme, GOAL_LABELS, mondayForDate, shiftWeek, VISIT_LABELS } from '@/lib/attendance/format';
import { AttendanceJustifications } from './attendance-justifications';
import { AttendanceVacationCalendar } from './attendance-vacation-calendar';
import { VisitEditor, type VisitEdit } from './visit-editor';
import { ExportGoogleSheetsButton } from '@/components/export/export-google-sheets-button';

const control = 'min-h-11 rounded-lg border border-border bg-background px-3 py-2 text-base text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-50 sm:text-sm';
function Goal({ member }: { member: AttendanceMemberDto }) {
  return <span className={`text-sm font-medium ${member.status === 'MET' ? 'text-emerald-700 dark:text-emerald-300' : member.status === 'MISSED' ? 'text-red-700 dark:text-red-300' : 'text-secondary-foreground'}`}>{GOAL_LABELS[member.status]}</span>;
}
function Audit({ visitId }: { visitId: string }) {
  const [records, setRecords] = useState<Array<{ id: string; reason: string; action: string; createdAt: string; actor: { name: string } | null }> | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function load() {
    setBusy(true); setError('');
    try {
      const response = await fetch(`/api/admin/attendance/visits/${visitId}`, { cache: 'no-store' });
      const data = await response.json(); if (!response.ok) throw new Error(data.error); setRecords(data.audits);
    } catch (err) { setError(err instanceof Error ? err.message : 'Não foi possível consultar o histórico.'); }
    finally { setBusy(false); }
  }
  return <div className="mt-2"><button type="button" onClick={() => void load()} disabled={busy} className="min-h-10 text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground disabled:opacity-50">{busy ? 'Consultando histórico...' : 'Histórico de alterações'}</button>
    {error && <p role="alert" className="text-sm text-amber-700 dark:text-amber-300">{error}</p>}
    {records && <ul className="mt-2 space-y-3 text-sm text-muted-foreground">{records.length === 0 && <li>Nenhum ajuste feito pela gestão.</li>}{records.map(record => <li key={record.id} className="border-l border-border pl-3"><p className="text-secondary-foreground">{record.action === 'VOID' ? 'Desconsiderado' : record.action === 'CREATE' ? 'Inserido manualmente' : 'Corrigido'} por {record.actor?.name || 'Administrador removido'} · {formatLabDate(record.createdAt, true)}</p><p className="mt-1 break-words">{record.reason}</p></li>)}</ul>}
  </div>;
}

export function AttendanceDashboard({ initialWeek, selectedWeek = initialWeek, admin = false }: { initialWeek: string; selectedWeek?: string; admin?: boolean }) {
  const [week, setWeek] = useState(selectedWeek);
  useEffect(() => { setWeek(selectedWeek); }, [selectedWeek]);
  const [report, setReport] = useState<AttendanceReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('ALL');
  const [area, setArea] = useState('ALL');
  const [viewMode, setViewMode] = useState<'CARDS' | 'TABLE'>('CARDS');
  const [expanded, setExpanded] = useState<string[]>([]);
  const [version, setVersion] = useState(0);
  const [edit, setEdit] = useState<VisitEdit | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError(''); setReport(previous => previous?.week.key === week ? previous : null);
    fetch(`${admin ? '/api/admin/attendance' : '/api/attendance/me'}?week=${encodeURIComponent(week)}`, { cache: 'no-store', signal: controller.signal }).then(async response => {
      const data = await response.json(); if (!response.ok) throw new Error(data.error); setReport(data);
    }).catch(err => { if (!controller.signal.aborted) setError(err.message || 'Não foi possível consultar a presença.'); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [week, admin, version]);
  useEffect(() => {
    const refresh = () => { if (!document.hidden && !edit) setVersion(value => value + 1); };
    const timer = setInterval(refresh, 60_000); window.addEventListener('focus', refresh);
    return () => { clearInterval(timer); window.removeEventListener('focus', refresh); };
  }, [edit]);
  const allMembers = report?.members || [];
  const tierCounts = allMembers.reduce(
    (acc, member) => {
      const { tier } = getAttendanceCardTheme(member);
      acc[tier]++;
      if (member.pendingReviews > 0) acc.REVIEW++;
      return acc;
    },
    { IN_LAB: 0, MET: 0, PROGRESS: 0, ZERO: 0, REVIEW: 0 }
  );
  const visible = allMembers.filter(member => {
    const matchesSearch = `${member.name} ${member.email || ''}`.toLocaleLowerCase('pt-BR').includes(search.toLocaleLowerCase('pt-BR'));
    const matchesArea = area === 'ALL' || member.area === area;
    if (!matchesSearch || !matchesArea) return false;
    if (filter === 'ALL') return true;
    if (filter === 'REVIEW') return member.pendingReviews > 0;
    const { tier } = getAttendanceCardTheme(member);
    if (filter === 'IN_LAB' || filter === 'MET' || filter === 'PROGRESS' || filter === 'ZERO') {
      return tier === filter;
    }
    return member.status === filter;
  });
  const areas = [...new Set(allMembers.map(member => member.area))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
  function toggle(id: string | number) { setExpanded(previous => previous.includes(String(id)) ? previous.filter(item => item !== String(id)) : [...previous, String(id)]); }
  function visits(member: AttendanceMemberDto) {
    return <div className="space-y-3 py-4">
      <div className="flex flex-wrap items-center justify-between gap-3"><h3 className="font-medium">Registros de {member.name}</h3>{admin && <button type="button" onClick={() => setEdit({ member, action: 'CREATE' })} className={`${control} hover:bg-accent`}>Adicionar presença</button>}</div>
      {member.visits.length === 0 && <p className="py-3 text-sm text-muted-foreground">Nenhum registro nesta semana.</p>}
      {member.visits.map(visit => <div key={visit.id} className="rounded-lg border border-border bg-background/50 p-4">
        <div className="flex flex-wrap items-start justify-between gap-4"><div>
          <p className="text-sm text-foreground">Entrada: {formatLabDate(visit.checkedInAt, true)}</p>
          <p className="mt-1 text-sm text-muted-foreground">Saída: {visit.checkedOutAt ? formatLabDate(visit.checkedOutAt, true) : 'Ainda não registrada'}</p>
          <p className={`mt-2 text-sm ${visit.needsReview ? 'text-amber-700 dark:text-amber-300' : visit.status === 'VOID' ? 'text-muted-foreground' : 'text-secondary-foreground'}`}>{visit.needsReview ? 'Revisão necessária' : VISIT_LABELS[visit.status]}{visit.status === 'CLOSED' ? ` · ${formatDuration(visit.seconds)}` : ''}{visit.source === 'MANUAL' ? ' · inserido pela gestão' : ''}</p>
        </div>{admin && <div className="flex flex-wrap gap-2"><button type="button" onClick={() => setEdit({ member, visit, action: 'CORRECT' })} className={`${control} hover:bg-accent`}>{visit.status === 'VOID' ? 'Restaurar' : 'Corrigir / validar'}</button>{visit.status !== 'VOID' && <button type="button" onClick={() => setEdit({ member, visit, action: 'VOID' })} className="min-h-11 rounded-lg border border-red-700/50 px-3 py-2 text-sm text-red-700 dark:text-red-300 hover:bg-red-950/40">Desconsiderar</button>}</div>}</div>
        {admin && <Audit key={`${visit.id}:${visit.checkedInAt}:${visit.checkedOutAt}:${visit.status}`} visitId={visit.id} />}
      </div>)}
      <p className="text-xs text-muted-foreground">Horários de Brasília. Registros que atravessam a mudança de semana têm as horas divididas entre as duas semanas.</p>
    </div>;
  }
  return <div className={admin ? 'w-full' : 'mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8'}>
    {!admin && <Link href="/" className="inline-flex min-h-11 items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" />Início</Link>}
    <header className="mt-3 flex flex-wrap items-start justify-between gap-5 border-b border-border pb-7"><div><h1 className="font-display text-3xl font-semibold sm:text-4xl">{admin ? 'Presença no laboratório' : 'Minha presença'}</h1><p className="mt-3 max-w-2xl text-base leading-relaxed text-muted-foreground">{admin ? 'Acompanhe as horas de cada membro, confira semanas anteriores e revise registros pendentes.' : 'Confira suas horas validadas, a meta semanal e seus registros de entrada e saída.'}</p></div>{admin && <Link href="/gestao/presenca/qr" className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90"><QrCode className="h-4 w-4" />QR code do laboratório</Link>}</header>
    <div className="my-6 flex flex-wrap items-end justify-between gap-4">
      <div className="flex flex-wrap items-end gap-2"><button type="button" aria-label="Semana anterior" onClick={() => setWeek(shiftWeek(week, -1))} className={control}><ArrowLeft className="h-4 w-4" /></button><label className="flex flex-col gap-2 text-sm text-secondary-foreground">Semana iniciada em<input type="date" value={week} max={initialWeek} onChange={event => { if (event.target.value) setWeek(mondayForDate(event.target.value)); }} className={control} /></label><button type="button" aria-label="Próxima semana" disabled={week >= initialWeek} onClick={() => setWeek(shiftWeek(week, 1))} className={control}><ArrowRight className="h-4 w-4" /></button><button type="button" onClick={() => setWeek(initialWeek)} className={`${control} sm:ml-2`}>Esta semana</button></div>
      <div className="flex flex-wrap items-center gap-2"><button type="button" disabled={loading} onClick={() => setVersion(value => value + 1)} className={`${control} inline-flex items-center gap-2`}><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />Atualizar</button>{admin && <><ExportGoogleSheetsButton type="attendance" period={week} label="Google Sheets" /><a href={`/api/admin/attendance/export?week=${encodeURIComponent(week)}`} className={`${control} inline-flex items-center gap-2`}><Download className="h-4 w-4" />Exportar CSV</a></>}</div>
    </div>
    <div className="space-y-4">
      {admin && (
        <AttendanceVacationCalendar
          vacationWeeks={report?.vacationWeeks || []}
          selectedWeekKey={week}
          onChanged={() => setVersion(value => value + 1)}
          onSelectWeek={(mondayKey) => setWeek(mondayKey)}
        />
      )}
      <AttendanceJustifications admin={admin} selectedWeek={week} currentWeek={initialWeek} refreshKey={version} onChanged={() => setVersion(value => value + 1)} />
    </div>
    {error && <p role="alert" className="my-5 rounded-lg border border-red-400/30 bg-red-400/10 p-4 text-sm text-red-700 dark:text-red-300">{error}</p>}
    {loading && !report && <p role="status" className="py-10 text-muted-foreground">Consultando as horas da semana...</p>}
    {report && <>
      {report.week.isVacation && (
        <div className="my-4 rounded-xl border border-sky-500/35 bg-sky-500/10 px-4 py-3 text-sm text-sky-900 dark:text-sky-200">
          <strong>🏖️ Semana de Férias / Recesso:</strong> As horas desta semana não estão sendo cobradas, sem aplicação de avisos/punições e sem registro de falta no histórico.
        </div>
      )}
      <p className="text-sm text-secondary-foreground">{formatLabDate(report.week.start)} a {formatLabDate(new Date(new Date(report.week.end).getTime() - 1).toISOString())} · Segunda a domingo · Horário de Brasília</p>
      <p className="mt-2 text-sm text-muted-foreground">{report.week.isClosed ? 'Semana encerrada: as metas abaixo do previsto entram no histórico de descumprimento.' : 'Semana em andamento: a meta pode ser cumprida até domingo (ou até o fim do mês para Marketing e Gestão com meta mensal de 4h).'} Registros com saída validada e justificativas aprovadas contam para a meta.</p>
      {admin && (
        <div className="my-6 space-y-4 border-y border-border py-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setFilter('ALL')}
                className={`inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3 transition-colors cursor-pointer ${
                  filter === 'ALL' ? 'border-foreground bg-foreground text-background' : 'border-border bg-card text-foreground hover:bg-accent'
                }`}
              >
                Todos ({allMembers.length})
              </button>
              <button
                type="button"
                onClick={() => setFilter(filter === 'IN_LAB' ? 'ALL' : 'IN_LAB')}
                className={`inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3 transition-colors cursor-pointer ${
                  filter === 'IN_LAB'
                    ? 'border-blue-600 bg-blue-600 text-white'
                    : 'border-blue-500/40 bg-blue-500/15 text-blue-700 dark:text-blue-300 hover:bg-blue-500/25'
                }`}
              >
                <span className="h-2 w-2 rounded-full bg-current" />
                Azul · No Lab ({tierCounts.IN_LAB})
              </button>
              <button
                type="button"
                onClick={() => setFilter(filter === 'MET' ? 'ALL' : 'MET')}
                className={`inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3 transition-colors cursor-pointer ${
                  filter === 'MET'
                    ? 'border-emerald-600 bg-emerald-600 text-white'
                    : 'border-emerald-500/40 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/25'
                }`}
              >
                <span className="h-2 w-2 rounded-full bg-current" />
                Verde · Meta cumprida ({tierCounts.MET})
              </button>
              <button
                type="button"
                onClick={() => setFilter(filter === 'PROGRESS' ? 'ALL' : 'PROGRESS')}
                className={`inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3 transition-colors cursor-pointer ${
                  filter === 'PROGRESS'
                    ? 'border-amber-500 bg-amber-500 text-zinc-950'
                    : 'border-amber-500/40 bg-amber-500/15 text-amber-800 dark:text-amber-300 hover:bg-amber-500/25'
                }`}
              >
                <span className="h-2 w-2 rounded-full bg-current" />
                Amarelo · &gt; 10 min ({tierCounts.PROGRESS})
              </button>
              <button
                type="button"
                onClick={() => setFilter(filter === 'ZERO' ? 'ALL' : 'ZERO')}
                className={`inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3 transition-colors cursor-pointer ${
                  filter === 'ZERO'
                    ? 'border-rose-600 bg-rose-600 text-white'
                    : 'border-rose-500/40 bg-rose-500/15 text-rose-700 dark:text-rose-300 hover:bg-rose-500/25'
                }`}
              >
                <span className="h-2 w-2 rounded-full bg-current" />
                Vermelho · 0h / ≤ 10 min ({tierCounts.ZERO})
              </button>
              {tierCounts.REVIEW > 0 && (
                <button
                  type="button"
                  onClick={() => setFilter(filter === 'REVIEW' ? 'ALL' : 'REVIEW')}
                  className={`inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3 transition-colors cursor-pointer ${
                    filter === 'REVIEW'
                      ? 'border-amber-600 bg-amber-600 text-white'
                      : 'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300 hover:bg-amber-500/20'
                  }`}
                >
                  Para revisão ({tierCounts.REVIEW})
                </button>
              )}
            </div>

            <div className="inline-flex items-center rounded-lg border border-border bg-muted/40 p-1">
              <button
                type="button"
                onClick={() => setViewMode('CARDS')}
                aria-pressed={viewMode === 'CARDS'}
                className={`inline-flex min-h-8 items-center gap-1.5 rounded-md px-3 text-xs font-semibold transition-colors cursor-pointer ${
                  viewMode === 'CARDS' ? 'bg-background text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                Cards
              </button>
              <button
                type="button"
                onClick={() => setViewMode('TABLE')}
                aria-pressed={viewMode === 'TABLE'}
                className={`inline-flex min-h-8 items-center gap-1.5 rounded-md px-3 text-xs font-semibold transition-colors cursor-pointer ${
                  viewMode === 'TABLE' ? 'bg-background text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Table2 className="h-3.5 w-3.5" />
                Tabela
              </button>
            </div>
          </div>
        </div>
      )}
      {admin && (
        <div className="mb-5 flex flex-col gap-3 sm:flex-row">
          <label className="flex flex-1 flex-col gap-2 text-sm text-secondary-foreground">
            Buscar membro
            <input value={search} onChange={event => setSearch(event.target.value)} placeholder="Nome ou email" className={control} />
          </label>
          <label className="flex flex-col gap-2 text-sm text-secondary-foreground">
            Situação
            <select value={filter} onChange={event => setFilter(event.target.value)} className={control}>
              <option value="ALL">Todas</option>
              <option value="IN_LAB">Azul — No laboratório agora</option>
              <option value="MET">Verde — Meta cumprida</option>
              <option value="PROGRESS">Amarelo — Mais de 10 min</option>
              <option value="ZERO">Vermelho — 0h ou ≤ 10 min</option>
              <option value="PENDING">Em andamento (geral)</option>
              <option value="MISSED">Abaixo da meta (encerrada)</option>
              <option value="REVIEW">Com pendências de revisão</option>
            </select>
          </label>
          <label className="flex flex-col gap-2 text-sm text-secondary-foreground">
            Área
            <select value={area} onChange={event => setArea(event.target.value)} className={control}>
              <option value="ALL">Todas as áreas</option>
              {areas.map(item => <option key={item}>{item}</option>)}
            </select>
          </label>
        </div>
      )}
      {visible.length === 0 ? (
        <p className="my-6 rounded-lg border border-dashed border-border p-6 text-sm leading-relaxed text-muted-foreground">
          {report.members.length ? 'Nenhum membro encontrado com esses filtros.' : `Nenhum acompanhamento nesta semana. Os registros começaram em ${formatLabDate(report.trackingStartedAt)}; não são criadas faltas para semanas anteriores.`}
        </p>
      ) : admin && viewMode === 'CARDS' ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {visible.map(member => {
            const theme = getAttendanceCardTheme(member);
            const pct = member.requiredSeconds > 0
              ? Math.min(100, Math.round((member.completedSeconds / member.requiredSeconds) * 100))
              : 0;
            const isOpen = expanded.includes(String(member.id));
            return (
              <article
                key={member.id}
                className={`flex flex-col justify-between gap-4 rounded-xl border p-4 sm:p-5 transition-colors ${theme.cardClass}`}
              >
                <div className="space-y-3 min-w-0">
                  <div className="flex items-start justify-between gap-2.5 min-w-0">
                    <div className="min-w-0">
                      <h3 className="truncate text-base font-semibold text-foreground">{member.name}</h3>
                      <p className="truncate text-xs text-muted-foreground">
                        {member.area}
                        {member.email ? ` · ${member.email}` : ' · Conta removida'}
                      </p>
                    </div>
                    <span className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold whitespace-nowrap ${theme.badgeClass}`}>
                      {theme.tierLabel}
                    </span>
                  </div>

                  {member.openVisit && (
                    <p className={`text-xs font-medium ${member.openVisit.needsReview ? 'text-amber-700 dark:text-amber-300' : 'text-blue-700 dark:text-blue-300'}`}>
                      {member.openVisit.needsReview
                        ? `Entrada aberta desde ${formatLabTime(member.openVisit.checkedInAt)} (precisa de revisão)`
                        : `Check-in aberto às ${formatLabTime(member.openVisit.checkedInAt)}`}
                    </p>
                  )}

                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <span className="font-mono text-lg font-bold tabular-nums text-foreground">
                        {formatDuration(member.completedSeconds)}
                      </span>
                      <span className="text-xs text-muted-foreground tabular-nums">
                        Meta: {formatDuration(member.requiredSeconds)}{member.isMonthly ? ' (mensal)' : ' (semanal)'}
                      </span>
                    </div>
                    {member.requiredSeconds > 0 && (
                      <div className="h-2 w-full overflow-hidden rounded-full bg-background/70 border border-border/60">
                        <div className={`h-full rounded-full transition-all ${theme.barClass}`} style={{ width: `${pct}%` }} />
                      </div>
                    )}
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                      <span>
                        {member.remainingSeconds > 0
                          ? `Faltam ${formatDuration(member.remainingSeconds)}`
                          : 'Meta atingida'}
                      </span>
                      <span className="tabular-nums">
                        {member.missedWeeks > 0 ? `${member.missedWeeks} sem. abaixo` : 'Sem pendências anteriores'}
                      </span>
                    </div>
                  </div>

                  {(!!member.justifiedSeconds || member.pendingReviews > 0) && (
                    <div className="flex flex-wrap gap-2 text-xs">
                      {!!member.justifiedSeconds && (
                        <span className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-emerald-700 dark:text-emerald-300">
                          +{formatDuration(member.justifiedSeconds)} justificado
                        </span>
                      )}
                      {member.pendingReviews > 0 && (
                        <span className="rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-amber-700 dark:text-amber-300 font-medium">
                          {member.pendingReviews} registro(s) para revisar
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <div className="space-y-2 border-t border-border/60 pt-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <button
                      type="button"
                      aria-expanded={isOpen}
                      onClick={() => toggle(member.id)}
                      className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-border bg-background/80 px-3 text-xs font-semibold text-foreground hover:bg-accent cursor-pointer"
                    >
                      Registros ({member.visits.length})
                      <ChevronDown className={`h-3.5 w-3.5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setEdit({ member, action: 'CREATE' })}
                      className="inline-flex min-h-9 items-center rounded-lg border border-border bg-background/80 px-3 text-xs font-medium text-foreground hover:bg-accent cursor-pointer"
                    >
                      + Adicionar presença
                    </button>
                  </div>
                  {isOpen && <div className="rounded-lg border border-border bg-card/90 px-3">{visits(member)}</div>}
                </div>
              </article>
            );
          })}
        </div>
      ) : admin ? (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full min-w-[820px] text-left text-sm">
            <caption className="sr-only">Presença semanal dos membros no laboratório</caption>
            <thead className="bg-muted text-muted-foreground">
              <tr>{['Membro', 'Validado / meta', 'Restante', 'Situação', 'Semanas abaixo da meta', 'Registros'].map(label => <th key={label} scope="col" className="px-4 py-4 font-medium">{label}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-border">
              {visible.map(member => {
                const theme = getAttendanceCardTheme(member);
                return (
                  <Fragment key={member.id}>
                    <tr>
                      <th scope="row" className="max-w-xs px-4 py-4 font-normal">
                        <p className="break-words font-medium text-foreground">{member.name}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{member.area}</p>
                        <p className="mt-1 break-all text-xs text-muted-foreground">{member.email || 'Conta removida'}</p>
                      </th>
                      <td className="whitespace-nowrap px-4 py-4 tabular-nums">
                        {formatDuration(member.completedSeconds)}
                        <p className="mt-1 text-xs text-muted-foreground">Meta: {formatDuration(member.requiredSeconds)}{member.isMonthly ? ' (mensal)' : ' (semanal)'}</p>
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 tabular-nums">{formatDuration(member.remainingSeconds)}</td>
                      <td className="px-4 py-4">
                        <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${theme.badgeClass}`}>
                          {theme.tierLabel}
                        </span>
                        <div className="mt-1"><Goal member={member} /></div>
                        {!!member.justifiedSeconds && <p className="mt-2 text-xs text-emerald-700 dark:text-emerald-300">Inclui {formatDuration(member.justifiedSeconds)} por justificativa</p>}
                        {member.pendingReviews > 0 && <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">{member.pendingReviews} para revisão</p>}
                      </td>
                      <td className="px-4 py-4 tabular-nums">{member.missedWeeks}</td>
                      <td className="px-4 py-4">
                        <button type="button" aria-expanded={expanded.includes(String(member.id))} onClick={() => toggle(member.id)} className={`${control} inline-flex items-center gap-2`}>
                          Ver<ChevronDown className={`h-4 w-4 ${expanded.includes(String(member.id)) ? 'rotate-180' : ''}`} />
                        </button>
                      </td>
                    </tr>
                    {expanded.includes(String(member.id)) && <tr><td colSpan={6} className="bg-muted/30 px-4">{visits(member)}</td></tr>}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        visible.map(member => {
          const theme = getAttendanceCardTheme(member);
          const pct = member.requiredSeconds > 0
            ? Math.min(100, Math.round((member.completedSeconds / member.requiredSeconds) * 100))
            : 0;
          return (
            <section key={member.id} className={`mt-6 rounded-xl border p-5 sm:p-6 transition-colors ${theme.cardClass}`}>
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-5">
                <div className="flex flex-wrap items-baseline gap-4">
                  <h2 className="font-display text-2xl font-semibold tabular-nums">{formatDuration(member.completedSeconds)} validados</h2>
                  <Goal member={member} />
                  <p className="text-sm text-muted-foreground">Meta: {formatDuration(member.requiredSeconds)}{member.isMonthly ? ' (mensal)' : ' (semanal)'} · Restante: {formatDuration(member.remainingSeconds)}</p>
                </div>
                <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${theme.badgeClass}`}>
                  {theme.tierLabel}
                </span>
              </div>
              {member.requiredSeconds > 0 && (
                <div className="mt-4 h-2.5 w-full overflow-hidden rounded-full bg-background/70 border border-border/60">
                  <div className={`h-full rounded-full transition-all ${theme.barClass}`} style={{ width: `${pct}%` }} />
                </div>
              )}
              {!!member.justifiedSeconds && <p className="mt-4 text-sm text-emerald-700 dark:text-emerald-300">Inclui {formatDuration(member.justifiedSeconds)} por justificativa aprovada nesta semana.</p>}
              {member.openVisit && (
                <p className={`mt-4 text-sm font-medium ${member.openVisit.needsReview ? 'text-amber-700 dark:text-amber-300' : 'text-blue-700 dark:text-blue-300'}`}>
                  {member.openVisit.needsReview
                    ? 'Você tem uma entrada sem saída há mais de 12 horas. Registre a saída e procure a gestão.'
                    : 'Você tem uma entrada em aberto. Leia novamente o QR code ao sair. As horas em aberto ainda não contam para a meta.'}
                </p>
              )}
              <div className="mt-4">{visits(member)}</div>
            </section>
          );
        })
      )}
      {admin && <p className="mt-5 text-sm leading-relaxed text-muted-foreground">“Semanas abaixo da meta” considera somente semanas já encerradas, até a semana selecionada, dentro dos períodos em que o membro estava acompanhado. Registros sem saída ou acima de 12 horas precisam de revisão.</p>}
    </>}
    {edit && <VisitEditor edit={edit} onClose={() => setEdit(null)} onSaved={() => setVersion(value => value + 1)} />}
  </div>;
}
