'use client';
import { useEffect, useRef, useState } from 'react';
import type { AttendanceMemberDto, AttendanceVisitDto } from '@/lib/attendance/types';
import { inputLabDateTime } from '@/lib/attendance/format';

export interface VisitEdit { member: AttendanceMemberDto; visit?: AttendanceVisitDto; action: 'CREATE' | 'CORRECT' | 'VOID' }
export function VisitEditor({ edit, onClose, onSaved }: { edit: VisitEdit; onClose: () => void; onSaved: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [start, setStart] = useState(edit.visit ? inputLabDateTime(edit.visit.checkedInAt) : '');
  const [end, setEnd] = useState(edit.visit?.checkedOutAt ? inputLabDateTime(edit.visit.checkedOutAt) : '');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => { dialog.current?.showModal(); }, []);
  async function save(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError('');
    try {
      const response = await fetch('/api/admin/attendance/visits', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: edit.action, memberId: edit.member.id, ...(edit.visit ? { visitId: edit.visit.id } : {}), ...(edit.action !== 'VOID' ? { checkedInAt: start, checkedOutAt: end } : {}), reason }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      onSaved(); onClose();
    } catch (err) { setError(err instanceof Error ? err.message : 'Não foi possível salvar o registro.'); }
    finally { setBusy(false); }
  }
  const field = 'mt-2 min-h-11 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-base text-zinc-100 focus-visible:outline-2 focus-visible:outline-zinc-300';
  return <dialog ref={dialog} onClose={onClose} onCancel={event => { if (busy) event.preventDefault(); }} aria-labelledby="visit-editor-heading" className="fixed inset-0 m-auto max-h-[90dvh] w-[calc(100%_-_2rem)] max-w-lg overflow-y-auto rounded-xl border border-zinc-700 bg-zinc-900 p-6 text-zinc-100 backdrop:bg-black/70">
    <form onSubmit={save}>
      <h2 id="visit-editor-heading" className="font-display text-xl font-semibold">{edit.action === 'CREATE' ? 'Adicionar presença' : edit.action === 'VOID' ? 'Desconsiderar registro' : 'Revisar presença'}</h2>
      <p className="mt-2 break-words text-sm text-zinc-400">{edit.member.name} · Horário de Brasília</p>
      {edit.action !== 'VOID' && <div className="mt-5 grid gap-4 sm:grid-cols-2"><label className="text-sm text-zinc-300">Entrada<input type="datetime-local" value={start} onChange={event => setStart(event.target.value)} required disabled={busy} className={field} /></label><label className="text-sm text-zinc-300">Saída<input type="datetime-local" value={end} onChange={event => setEnd(event.target.value)} required disabled={busy} className={field} /></label></div>}
      <label className="mt-5 block text-sm text-zinc-300">Justificativa<textarea value={reason} onChange={event => setReason(event.target.value)} required minLength={10} maxLength={1000} rows={3} disabled={busy} className={field} placeholder="Explique o motivo do ajuste ou da desconsideração." /></label>
      <p className="mt-2 text-sm text-zinc-400">A alteração e sua justificativa ficam no histórico de auditoria.</p>
      {error && <p role="alert" className="mt-4 text-sm text-red-300">{error}</p>}
      <div className="mt-6 flex flex-wrap justify-end gap-3"><button type="button" disabled={busy} onClick={onClose} className="min-h-11 rounded-lg border border-zinc-700 px-4 py-2 disabled:opacity-50">Cancelar</button><button type="submit" disabled={busy} className={`min-h-11 rounded-lg px-4 py-2 font-semibold text-white disabled:opacity-50 ${edit.action === 'VOID' ? 'bg-red-700 hover:bg-red-800' : 'bg-emerald-700 hover:bg-emerald-800'}`}>{busy ? 'Salvando...' : edit.action === 'VOID' ? 'Desconsiderar' : 'Salvar registro'}</button></div>
    </form>
  </dialog>;
}
