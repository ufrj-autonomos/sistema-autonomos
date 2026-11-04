'use client';
import { Fragment, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, ChevronDown, Download, QrCode, RefreshCw } from 'lucide-react';
import type { AttendanceMemberDto, AttendanceReport, AttendanceVisitDto } from '@/lib/attendance/types';
import { formatDuration, formatLabDate, GOAL_LABELS, mondayForDate, shiftWeek, VISIT_LABELS } from '@/lib/attendance/format';
import { VisitEditor, type VisitEdit } from './visit-editor';

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
  const visible = (report?.members || []).filter(member => `${member.name} ${member.email || ''}`.toLocaleLowerCase('pt-BR').includes(search.toLocaleLowerCase('pt-BR')) && (area === 'ALL' || member.area === area) && (filter === 'ALL' || member.status === filter || (filter === 'REVIEW' && member.pendingReviews > 0) || (filter === 'IN_LAB' && member.openVisit && !member.openVisit.needsReview)));
  const areas = [...new Set((report?.members || []).map(member => member.area))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
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
      <div className="flex gap-2"><button type="button" disabled={loading} onClick={() => setVersion(value => value + 1)} className={`${control} inline-flex items-center gap-2`}><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />Atualizar</button>{admin && <a href={`/api/admin/attendance/export?week=${encodeURIComponent(week)}`} className={`${control} inline-flex items-center gap-2`}><Download className="h-4 w-4" />Exportar CSV</a>}</div>
    </div>
    {error && <p role="alert" className="my-5 rounded-lg border border-red-400/30 bg-red-400/10 p-4 text-sm text-red-700 dark:text-red-300">{error}</p>}
    {loading && !report && <p role="status" className="py-10 text-muted-foreground">Consultando as horas da semana...</p>}
    {report && <>
      <p className="text-sm text-secondary-foreground">{formatLabDate(report.week.start)} a {formatLabDate(new Date(new Date(report.week.end).getTime() - 1).toISOString())} · Segunda a domingo · Horário de Brasília</p>
      <p className="mt-2 text-sm text-muted-foreground">{report.week.isClosed ? 'Semana encerrada: as metas abaixo de 2 horas entram no histórico de descumprimento.' : 'Semana em andamento: a meta pode ser cumprida até domingo.'} Apenas registros com saída validada contam para a meta.</p>
      {admin && <dl className="my-6 flex flex-wrap gap-x-8 gap-y-4 border-y border-border py-5 text-sm"><div><dt className="text-muted-foreground">Membros acompanhados</dt><dd className="mt-1 text-lg font-medium tabular-nums">{report.summary.requiredMembers}</dd></div><div><dt className="text-muted-foreground">Meta cumprida</dt><dd className="mt-1 text-lg font-medium tabular-nums text-emerald-700 dark:text-emerald-300">{report.summary.met}</dd></div><div><dt className="text-muted-foreground">{report.week.isClosed ? 'Abaixo da meta' : 'Ainda em andamento'}</dt><dd className="mt-1 text-lg font-medium tabular-nums">{report.week.isClosed ? report.summary.missed : report.summary.pending}</dd></div><div><dt className="text-muted-foreground">No laboratório</dt><dd className="mt-1 text-lg font-medium tabular-nums">{report.summary.inLab}</dd></div><div><dt className="text-muted-foreground">Registros para revisão</dt><dd className="mt-1 text-lg font-medium tabular-nums text-amber-700 dark:text-amber-300">{report.summary.review}</dd></div></dl>}
      {admin && <div className="mb-5 flex flex-col gap-3 sm:flex-row"><label className="flex flex-1 flex-col gap-2 text-sm text-secondary-foreground">Buscar membro<input value={search} onChange={event => setSearch(event.target.value)} placeholder="Nome ou email" className={control} /></label><label className="flex flex-col gap-2 text-sm text-secondary-foreground">Situação<select value={filter} onChange={event => setFilter(event.target.value)} className={control}><option value="ALL">Todas</option><option value="MET">Meta cumprida</option><option value="PENDING">Em andamento</option><option value="MISSED">Abaixo da meta</option><option value="REVIEW">Com pendências</option><option value="IN_LAB">No laboratório</option></select></label><label className="flex flex-col gap-2 text-sm text-secondary-foreground">Área<select value={area} onChange={event => setArea(event.target.value)} className={control}><option value="ALL">Todas as áreas</option>{areas.map(item => <option key={item}>{item}</option>)}</select></label></div>}
      {visible.length === 0 ? <p className="my-6 rounded-lg border border-dashed border-border p-6 text-sm leading-relaxed text-muted-foreground">{report.members.length ? 'Nenhum membro encontrado com esses filtros.' : `Nenhum acompanhamento nesta semana. Os registros começaram em ${formatLabDate(report.trackingStartedAt)}; não são criadas faltas para semanas anteriores.`}</p> : admin ? <div className="overflow-x-auto rounded-lg border border-border"><table className="w-full min-w-[820px] text-left text-sm"><caption className="sr-only">Presença semanal dos membros no laboratório</caption><thead className="bg-muted text-muted-foreground"><tr>{['Membro', 'Validado / meta', 'Restante', 'Situação', 'Semanas abaixo da meta', 'Registros'].map(label => <th key={label} scope="col" className="px-4 py-4 font-medium">{label}</th>)}</tr></thead><tbody className="divide-y divide-border">{visible.map(member => <Fragment key={member.id}><tr><th scope="row" className="max-w-xs px-4 py-4 font-normal"><p className="break-words font-medium text-foreground">{member.name}</p><p className="mt-1 text-xs text-muted-foreground">{member.area}</p><p className="mt-1 break-all text-xs text-muted-foreground">{member.email || 'Conta removida'}</p>{member.openVisit && <p className={`mt-2 text-xs ${member.openVisit.needsReview ? 'text-amber-700 dark:text-amber-300' : 'text-emerald-700 dark:text-emerald-300'}`}>{member.openVisit.needsReview ? 'Entrada sem saída' : 'No laboratório'}</p>}</th><td className="whitespace-nowrap px-4 py-4 tabular-nums">{formatDuration(member.completedSeconds)}<p className="mt-1 text-xs text-muted-foreground">Meta: {formatDuration(member.requiredSeconds)}</p></td><td className="whitespace-nowrap px-4 py-4 tabular-nums">{formatDuration(member.remainingSeconds)}</td><td className="px-4 py-4"><Goal member={member} />{member.pendingReviews > 0 && <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">{member.pendingReviews} para revisão</p>}</td><td className="px-4 py-4 tabular-nums">{member.missedWeeks}</td><td className="px-4 py-4"><button type="button" aria-expanded={expanded.includes(String(member.id))} onClick={() => toggle(member.id)} className={`${control} inline-flex items-center gap-2`}>Ver<ChevronDown className={`h-4 w-4 ${expanded.includes(String(member.id)) ? 'rotate-180' : ''}`} /></button></td></tr>{expanded.includes(String(member.id)) && <tr><td colSpan={6} className="bg-muted/30 px-4">{visits(member)}</td></tr>}</Fragment>)}</tbody></table></div> : visible.map(member => <section key={member.id} className="mt-6"><div className="flex flex-wrap items-baseline gap-4 border-b border-border pb-5"><h2 className="font-display text-2xl font-semibold tabular-nums">{formatDuration(member.completedSeconds)} validados</h2><Goal member={member} /><p className="text-sm text-muted-foreground">Meta: {formatDuration(member.requiredSeconds)} · Restante: {formatDuration(member.remainingSeconds)}</p></div>{member.openVisit && <p className="mt-4 text-sm text-amber-700 dark:text-amber-300">Você tem uma entrada em aberto. Leia novamente o QR code ao sair. As horas em aberto ainda não contam para a meta.</p>}{visits(member)}</section>)}
      {admin && <p className="mt-5 text-sm leading-relaxed text-muted-foreground">“Semanas abaixo da meta” considera somente semanas já encerradas, até a semana selecionada, dentro dos períodos em que o membro estava acompanhado. Registros sem saída ou acima de 12 horas precisam de revisão.</p>}
    </>}
    {edit && <VisitEditor edit={edit} onClose={() => setEdit(null)} onSaved={() => setVersion(value => value + 1)} />}
  </div>;
}
