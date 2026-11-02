'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/contexts/auth-context';
import { ACCOUNT_STATUSES, ROLES, ROLE_LABELS, STATUS_LABELS } from '@/lib/access-policy';

type Role = typeof ROLES[number];
type Status = typeof ACCOUNT_STATUSES[number];
type Account = { id: string; name: string; email: string; role: Role; status: Status };
const control = 'min-h-11 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-base text-zinc-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-300 disabled:opacity-50 sm:text-sm';

export function UserManagement() {
  const { user, refreshSession } = useSession();
  const router = useRouter();
  const [users, setUsers] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [filter, setFilter] = useState('ALL');
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/admin/users', { cache: 'no-store' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setUsers(data.users);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível carregar as contas. Tente novamente.');
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  async function update(account: Account, changes: { role?: Role; status?: Status }) {
    setBusy(account.id); setError(''); setNotice('');
    try {
      const response = await fetch(`/api/admin/users/${account.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(changes) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setUsers(previous => data.deleted
        ? previous.filter(item => item.id !== data.userId)
        : previous.map(item => item.id === account.id ? data.user : item));
      setNotice(data.deleted ? `Conta de ${account.name} rejeitada e excluída.` : `Conta de ${account.name} atualizada.`);
      if (account.id === user?.id) {
        const current = await refreshSession();
        if (!current || current.role !== 'ADMIN') { router.replace('/'); router.refresh(); }
      }
    } catch (err) { setError(err instanceof Error ? err.message : 'Não foi possível salvar. Tente novamente.'); }
    finally { setBusy(null); }
  }

  const visible = users.filter(account => (filter === 'ALL' || account.status === filter) && `${account.name} ${account.email}`.toLocaleLowerCase('pt-BR').includes(search.toLocaleLowerCase('pt-BR')));
  const pendingCount = users.filter(account => account.status === 'PENDING').length;

  return <section id="contas" aria-labelledby="accounts-heading" className="space-y-5">
    <div>
      <h2 id="accounts-heading" className="font-display text-2xl font-semibold">Contas e permissões</h2>
      <p className="mt-2 max-w-3xl text-sm leading-relaxed text-zinc-400">Aprove novos cadastros e defina o perfil de cada pessoa. Rejeitar exclui definitivamente a conta e seu progresso. Apenas administradores acessam a gestão. Alunos, membros e instrutores acessam o início e os cursos.</p>
      {!loading && <p className="mt-2 text-sm text-zinc-300">{pendingCount} {pendingCount === 1 ? 'cadastro aguardando aprovação' : 'cadastros aguardando aprovação'}</p>}
    </div>
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
      <label className="flex flex-1 flex-col gap-2 text-sm text-zinc-300">Buscar conta<input value={search} onChange={event => setSearch(event.target.value)} placeholder="Nome ou email" className={control} /></label>
      <label className="flex flex-col gap-2 text-sm text-zinc-300">Situação<select value={filter} onChange={event => setFilter(event.target.value)} className={control}><option value="ALL">Todas as contas</option>{ACCOUNT_STATUSES.filter(status => status !== 'REJECTED').map(status => <option key={status} value={status}>{STATUS_LABELS[status]}</option>)}</select></label>
      <button type="button" disabled={loading || !!busy} onClick={() => void load()} className={`${control} hover:bg-zinc-800`}>Atualizar lista</button>
    </div>
    {error && <p role="alert" className="rounded-lg border border-red-400/30 bg-red-400/10 p-4 text-sm text-red-300">{error}</p>}
    <p role="status" aria-live="polite" className="text-sm text-emerald-300">{notice}</p>
    {loading ? <p role="status" className="py-6 text-zinc-400">Carregando contas...</p> : <div className="divide-y divide-white/10 border-y border-white/10">
      {visible.length === 0 && <p className="py-8 text-sm text-zinc-400">{users.length === 0 ? 'Nenhuma conta disponível.' : 'Nenhuma conta encontrada com esses filtros.'}</p>}
      {visible.map(account => <div key={account.id} className="flex flex-col gap-4 py-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0 lg:max-w-xs"><h3 className="break-words font-medium text-zinc-100">{account.name}{account.id === user?.id && <span className="ml-2 text-sm text-zinc-400">(você)</span>}</h3><p className="mt-1 break-all text-sm text-zinc-400">{account.email}</p><p className={`mt-2 text-sm ${account.status === 'APPROVED' ? 'text-emerald-300' : account.status === 'PENDING' ? 'text-amber-300' : 'text-zinc-300'}`}>{STATUS_LABELS[account.status]}</p></div>
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1.5 text-sm text-zinc-400">Perfil<span className="sr-only"> de {account.name}</span><select aria-label={`Perfil de ${account.name}`} value={account.role} disabled={!!busy} onChange={event => void update(account, { role: event.target.value as Role })} className={control}>{ROLES.map(role => <option key={role} value={role}>{ROLE_LABELS[role]}</option>)}</select></label>
          <label className="flex flex-col gap-1.5 text-sm text-zinc-400">Situação<span className="sr-only"> de {account.name}</span><select aria-label={`Situação de ${account.name}`} value={account.status} disabled={!!busy} onChange={event => void update(account, { status: event.target.value as Status })} className={control}>{ACCOUNT_STATUSES.map(status => <option key={status} value={status}>{status === 'REJECTED' ? 'Rejeitar e excluir' : STATUS_LABELS[status]}</option>)}</select></label>
          {account.status === 'PENDING' && <button type="button" disabled={!!busy} onClick={() => void update(account, { status: 'APPROVED' })} className="min-h-11 rounded-lg bg-zinc-100 px-4 py-2 text-sm font-semibold text-zinc-950 hover:bg-zinc-300 disabled:opacity-50">{busy === account.id ? 'Salvando...' : 'Aprovar cadastro'}</button>}
        </div>
      </div>)}
    </div>}
  </section>;
}
