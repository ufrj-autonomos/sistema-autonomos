'use client';
import { ProfileChangeReview } from './profile-change-review';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { AdminModel } from '@/lib/institutional/admin-config';
import type { AttendanceMemberDto } from '@/lib/attendance/types';
import { OPERATIONAL_FIELDS, type OperationalKey } from '@/lib/member-directory';
import { formatDuration } from '@/lib/attendance/format';
import { DynamicForm } from '@/components/institutional/dynamic-form';
import { saveDirectoryDetails } from '@/app/(gestao)/gestao/directory-actions';

const inputClass = 'mt-2 min-h-11 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-300';
type Details = Partial<Record<OperationalKey, string>> & {
  notes?: string;
  userId?: string;
  accountEmail?: string;
  attendance?: AttendanceMemberDto | null;
  pendingChange?: { id: string; createdAt: string; updatedAt?: string; changes: Record<string, unknown> } | null;
} | null;

export function DirectoryEditor({ table, id, config, initialData, projectsList, relationsData, details, accounts, initialTab = 'shared' }: {
  table: 'member' | 'project'; id: number | null; config: AdminModel; initialData: Record<string, unknown>;
  projectsList: { id: number; name: string; slug: string; teamId: number }[]; relationsData: Record<string, unknown[]>;
  details: Details; accounts: { id: string; label: string }[]; initialTab?: 'shared' | 'private';
}) {
  const [tab, setTab] = useState(initialTab);
  const [operational, setOperational] = useState<Record<OperationalKey, string>>(() => Object.fromEntries(OPERATIONAL_FIELDS.map(field => [field.key, details?.[field.key] || ''])) as Record<OperationalKey, string>);
  const [notes, setNotes] = useState(details?.notes || '');
  const [userId, setUserId] = useState(details?.userId || '');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [failed, setFailed] = useState(false);
  const router = useRouter();
  const attendance = details?.attendance;
  const pendingChange = details?.pendingChange;

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!id) return;
    setSaving(true); setMessage(''); setFailed(false);
    try {
      const result = await saveDirectoryDetails(table, id, table === 'member' ? { ...operational, notes, userId } : { notes });
      setFailed(!result.success);
      setMessage(result.success ? 'Dados internos salvos.' : result.error);
      if (result.success) router.refresh();
    } catch { setFailed(true); setMessage('Não foi possível salvar. Confira sua conexão e tente novamente.'); }
    finally { setSaving(false); }
  }
  return <div className="space-y-6">
    <div className="flex flex-wrap gap-2 border-b border-zinc-800 pb-3" aria-label="Dados do cadastro">
      {[['shared', 'Dados compartilhados e site'], ['private', 'Dados internos']].map(([key, label]) => <button key={key} type="button" aria-pressed={tab === key} onClick={() => setTab(key as 'shared' | 'private')} className={`min-h-11 rounded-lg px-4 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-300 ${tab === key ? 'bg-zinc-100 text-zinc-950' : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100'}`}>{label}</button>)}
    </div>
    <div hidden={tab !== 'shared'}>
      {pendingChange && (
        <div className="mb-6 rounded-xl border border-amber-500/30 bg-amber-950/20 p-4 space-y-3 text-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-semibold text-amber-200">Alterações enviadas pelo integrante aguardando aprovação para o site</p>
              <p className="mt-1 text-xs text-zinc-300">Ao aprovar, os campos abaixo serão aplicados ao banco institucional, traduzidos automaticamente (EN/FR) e publicados no site.</p>
            </div>
            <ProfileChangeReview name={String(initialData.name || '')} current={initialData} change={pendingChange} />
          </div>
        </div>
      )}
      <p className="mb-5 max-w-prose text-sm text-zinc-400">Estes dados alimentam o cadastro da equipe e o site. A opção “Exibir no site” controla a publicação. Novos cadastros começam visíveis somente na gestão.</p>
      <DynamicForm config={config} initialData={initialData} isNew={!id} tableSlug={table} projectsList={projectsList} relationsData={relationsData} />
    </div>
    <div hidden={tab !== 'private'} className="space-y-8">
      {!id ? <p className="text-sm text-zinc-400">Salve o cadastro primeiro. Depois, abra a edição para preencher as informações internas.</p> : <>
        <p className="max-w-prose text-sm text-zinc-400">Informações acessíveis a Gestão e Admin. Os dados internos ficam no banco do sistema.</p>
        <form onSubmit={save} className="space-y-8">
          {table === 'member' && <>
            <fieldset className="space-y-4"><legend className="text-base font-semibold text-zinc-100">Identificação e contato</legend><p className="max-w-prose text-sm leading-relaxed text-zinc-400">Nome, área e curso vazios usam os dados atuais do site como referência. Preencher estes campos altera apenas o cadastro interno. O email vazio usa a conta vinculada, quando disponível.</p><div className="grid gap-x-6 gap-y-5 sm:grid-cols-2">{OPERATIONAL_FIELDS.filter(field => !field.key.startsWith('emergency')).map(field => <label key={field.key} className="block text-sm font-medium text-zinc-200" htmlFor={`internal-${field.key}`}>{field.label}<input id={`internal-${field.key}`} type={field.type} autoComplete="off" inputMode={field.key === 'cpf' || field.key === 'dre' ? 'numeric' : undefined} list={field.key === 'area' ? 'internal-area-options' : undefined} maxLength={field.maxLength} value={operational[field.key]} onChange={event => setOperational(previous => ({ ...previous, [field.key]: event.target.value }))} className={inputClass} placeholder={field.key === 'name' || field.key === 'area' || field.key === 'course' ? String(initialData[field.key] || '') : field.key === 'email' ? details?.accountEmail || 'nome@exemplo.com' : field.key === 'cpf' ? '000.000.000-00' : field.type === 'tel' ? '(21) 99999-9999' : field.key === 'academicPeriod' ? 'Ex.: 6º período' : undefined} /></label>)}</div><datalist id="internal-area-options">{config.fields.find(field => field.name === 'area')?.options?.map(option => <option key={option.value} value={option.value} />)}</datalist></fieldset>
            <fieldset className="space-y-4 border-t border-zinc-800 pt-6"><legend className="pt-6 text-base font-semibold text-zinc-100">Contato de emergência</legend><div className="grid gap-x-6 gap-y-5 sm:grid-cols-2">{OPERATIONAL_FIELDS.filter(field => field.key.startsWith('emergency')).map(field => <label key={field.key} className="block text-sm font-medium text-zinc-200" htmlFor={`internal-${field.key}`}>{field.label}<input id={`internal-${field.key}`} type={field.type} autoComplete="off" maxLength={field.maxLength} value={operational[field.key]} onChange={event => setOperational(previous => ({ ...previous, [field.key]: event.target.value }))} className={inputClass} placeholder={field.type === 'tel' ? '(21) 99999-9999' : 'Nome completo'} /></label>)}</div></fieldset>
            <div className="border-t border-zinc-800 pt-6"><label className="block text-sm font-medium text-zinc-200" htmlFor="member-account">Conta no sistema<select id="member-account" value={userId} onChange={event => setUserId(event.target.value)} className={inputClass}><option value="">Sem vínculo com conta</option>{accounts.map(account => <option key={account.id} value={account.id}>{account.label}</option>)}</select></label><p className="mt-2 text-sm text-zinc-400">Selecione a conta da mesma pessoa para consultar sua presença. O histórico existente é preservado. Contas vinculadas a outro integrante ficam indisponíveis.</p></div>
          </>}
          <label className="block text-sm font-medium text-zinc-200" htmlFor="internal-notes">Observações internas<textarea id="internal-notes" rows={6} maxLength={10000} value={notes} onChange={event => setNotes(event.target.value)} className={inputClass} /></label>
          <div className="flex flex-wrap items-center gap-4"><button disabled={saving} className="min-h-11 rounded-lg bg-zinc-100 px-4 text-sm font-medium text-zinc-950 hover:bg-white disabled:opacity-50">{saving ? 'Salvando…' : 'Salvar dados internos'}</button><p role={failed ? 'alert' : 'status'} className={`text-sm ${failed ? 'text-red-300' : 'text-emerald-300'}`}>{message}</p></div>
        </form>
        {table === 'member' && <section className="border-t border-zinc-800 pt-6" aria-labelledby="member-attendance"><h2 id="member-attendance" className="text-lg font-semibold text-zinc-100">Presença no laboratório</h2>{attendance ? <><dl className="mt-4 flex flex-wrap gap-x-10 gap-y-4 text-sm"><div><dt className="text-zinc-400">Horas validadas nesta semana</dt><dd className="mt-1 font-medium text-zinc-100">{formatDuration(attendance.completedSeconds)}</dd></div><div><dt className="text-zinc-400">Meta desta semana</dt><dd className="mt-1 font-medium text-zinc-100">{formatDuration(attendance.requiredSeconds)}</dd></div><div><dt className="text-zinc-400">Semanas abaixo da meta</dt><dd className="mt-1 font-medium text-zinc-100">{attendance.missedWeeks}</dd></div></dl><Link href="/gestao/presenca" className="mt-4 inline-flex min-h-11 items-center text-sm text-zinc-300 underline underline-offset-4">Consultar histórico e ajustar registros</Link></> : <p className="mt-3 text-sm text-zinc-400">Vincule uma conta e salve para consultar o acompanhamento de presença.</p>}</section>}
      </>}
    </div>
  </div>;
}
