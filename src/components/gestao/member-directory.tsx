'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowDown, ArrowUp, ArrowUpDown, Check, ChevronDown, Clock, Columns3, Edit3, Globe, Loader2, LockKeyhole, Search, SlidersHorizontal, Trash2, X } from 'lucide-react';
import { saveMemberPreferences } from '@/app/(gestao)/gestao/directory-actions';
import { deleteRecord } from '@/app/(gestao)/gestao/site/actions';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/institutional/ui/dialog';
import { useInstitutionalAsset } from '@/components/institutional/site-context';
import { filterMembers, INTERNAL_COLUMNS, MEMBER_COLUMNS, memberValue, SITE_COLUMNS, type MemberColumnKey, type MemberDirectoryRow, type MemberPreferences, type MemberView } from '@/lib/member-directory';

const focus = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-300';
const secondary = `inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-zinc-700 px-3 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white disabled:opacity-50 ${focus}`;
const views = [{ key: 'site', label: 'Site', icon: Globe }, { key: 'internal', label: 'Interna', icon: LockKeyhole }, { key: 'custom', label: 'Personalizada', icon: Columns3 }] as const;

export function MemberDirectory({ rows, initialPreferences }: { rows: MemberDirectoryRow[]; initialPreferences: MemberPreferences }) {
  const [view, setView] = useState<MemberView>(initialPreferences.view);
  const [custom, setCustom] = useState<MemberColumnKey[]>(initialPreferences.columns);
  const [draft, setDraft] = useState<MemberColumnKey[]>(initialPreferences.columns);
  const [configuring, setConfiguring] = useState(false);
  const [search, setSearch] = useState('');
  const [team, setTeam] = useState('all');
  const [area, setArea] = useState('all');
  const [status, setStatus] = useState('all');
  const [sort, setSort] = useState<{ key: MemberColumnKey; direction: 'asc' | 'desc' }>({ key: 'name', direction: 'asc' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [target, setTarget] = useState<MemberDirectoryRow | null>(null);
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const router = useRouter();
  const asset = useInstitutionalAsset();
  const keys = view === 'site' ? SITE_COLUMNS : view === 'internal' ? INTERNAL_COLUMNS : custom;
  const columns = keys.map(key => MEMBER_COLUMNS.find(column => column.key === key)!);
  const teams = useMemo(() => [...new Map(rows.map(row => [String(row.teamId ?? 'general'), row.teamName])).entries()].sort((a, b) => a[1].localeCompare(b[1], 'pt-BR')), [rows]);
  const areas = useMemo(() => [...new Set(rows.map(row => String(memberValue(row, view === 'site' ? 'area' : 'internalArea') || '')).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt-BR')), [rows, view]);
  const pendingRows = useMemo(() => rows.filter(row => Boolean(row.pendingChange)), [rows]);
  const filtered = useMemo(() => {
    const result = filterMembers(rows, keys, { search, team, area, status }, view);
    // Sorting uses displayed values too; changing views cannot sort by a hidden field.
    const key = keys.includes(sort.key) ? sort.key : keys[0];
    return result.sort((a, b) => {
      const av = memberValue(a, key); const bv = memberValue(b, key);
      if (av === null || av === '') return bv === null || bv === '' ? a.id - b.id : 1;
      if (bv === null || bv === '') return -1;
      const comparison = typeof av === 'number' && typeof bv === 'number' ? av - bv : String(av).localeCompare(String(bv), 'pt-BR', { numeric: true, sensitivity: 'base' });
      return comparison * (sort.direction === 'asc' ? 1 : -1) || a.id - b.id;
    });
  }, [rows, keys, search, team, area, status, sort, view]);
  const hasFilters = Boolean(search || team !== 'all' || area !== 'all' || status !== 'all');
  function clearFilters() { setSearch(''); setTeam('all'); setArea('all'); setStatus('all'); }
  async function persist(nextView: MemberView, nextColumns: MemberColumnKey[] = custom) {
    setSaving(true); setError(''); setMessage('');
    try {
      const result = await saveMemberPreferences({ view: nextView, columns: nextColumns });
      if (!result.success) { setError(result.error); return; }
      setView(nextView); setCustom(nextColumns); setArea('all');
      setSort({ key: nextView === 'site' ? 'name' : nextView === 'internal' ? 'internalName' : nextColumns[0], direction: 'asc' });
      if (configuring) { setConfiguring(false); setMessage('Visualização personalizada salva na sua conta.'); }
    } catch { setError('Não foi possível salvar sua visualização. Confira a conexão e tente novamente.'); }
    finally { setSaving(false); }
  }
  function moveColumn(index: number, delta: number) {
    const next = [...draft];
    [next[index], next[index + delta]] = [next[index + delta], next[index]];
    setDraft(next);
  }
  function editUrl(row: MemberDirectoryRow) { return `/gestao/integrantes/${row.id}?view=${view === 'site' ? 'site' : 'internal'}`; }
  async function remove() {
    if (!target) return;
    setDeleting(true); setError('');
    try {
      const result = await deleteRecord('member', target.id);
      if (!result.success) setError(result.error || 'Não foi possível excluir o cadastro.');
      else { if (result.warning) setError(result.warning); setTarget(null); router.refresh(); }
    } catch { setError('Não foi possível excluir. Tente novamente.'); }
    finally { setDeleting(false); }
  }
  async function reviewProfileChange(changeId: string, action: 'APPROVE' | 'REJECT') {
    setReviewingId(changeId); setError(''); setMessage('');
    try {
      const res = await fetch('/api/admin/profile-changes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ changeId, action }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Não foi possível processar a revisão.');
      setMessage(data.message);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao revisar alteração de perfil.');
    } finally {
      setReviewingId(null);
    }
  }
  function cell(row: MemberDirectoryRow, key: MemberColumnKey) {
    const value = memberValue(row, key);
    const isPendingField = Boolean(row.pendingChange && key in row.pendingChange.changes);
    const badge = isPendingField ? <span className="ml-1.5 inline-flex items-center gap-1 rounded bg-amber-950/80 px-1.5 py-0.5 text-[10px] font-medium text-amber-300 border border-amber-700/60" title="Alteração proposta pelo integrante, aguardando aprovação da Gestão">Pendente</span> : null;
    if (value === null || value === '') return <span className="text-zinc-500" aria-label="Não informado">—{badge}</span>;
    if (key === 'active' || key === 'showOnSite') return <span className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs ${value ? 'bg-emerald-950 text-emerald-200' : 'bg-zinc-800 text-zinc-300'}`}><span className={`h-1.5 w-1.5 rounded-full ${value ? 'bg-emerald-400' : 'bg-zinc-500'}`} />{key === 'active' ? value ? 'Ativo' : 'Inativo' : value ? 'Visível' : 'Oculto'}</span>;
    if (key === 'isFemale') return <span>{value ? 'Sim' : 'Não'}{badge}</span>;
    if (key === 'birthDate') return new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' }).format(new Date(`${value}T00:00:00Z`));
    if (key === 'cpf') return String(value).replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4');
    if (key === 'photo') return <div className="flex items-center gap-1.5"><img src={asset(String(value))} alt={`Foto de ${row.name}`} className="h-10 w-10 rounded-full object-cover" width={40} height={40} loading="lazy" />{badge}</div>;
    if (key === 'email') return <a href={`mailto:${value}`} className={`rounded-sm text-zinc-200 underline-offset-4 hover:underline ${focus}`}>{String(value)}</a>;
    if (key === 'phone') return <a href={`tel:${String(value).replace(/[^+\d]/g, '')}`} className={`rounded-sm underline-offset-4 hover:underline ${focus}`}>{String(value)}</a>;
    if (['linkedin', 'github', 'instagram'].includes(key) && /^https?:\/\//i.test(String(value))) return <div className="flex items-center gap-1.5"><a href={String(value)} target="_blank" rel="noopener noreferrer" className={`block max-w-64 truncate underline underline-offset-4 ${focus}`} title={String(value)}>{String(value).replace(/^https?:\/\/(www\.)?/, '')}</a>{badge}</div>;
    if (key === 'name' || key === 'internalName') return <div className="flex flex-wrap items-center gap-1.5"><Link href={editUrl(row)} className={`block max-w-64 whitespace-normal rounded-sm font-medium leading-relaxed text-zinc-100 underline-offset-4 hover:underline ${focus}`}>{String(value)}</Link>{row.pendingChange && <span className="inline-flex items-center gap-1 rounded bg-amber-950/90 px-1.5 py-0.5 text-[10px] font-medium text-amber-300 border border-amber-700/60" title="Possui alterações de site aguardando aprovação"><Clock className="h-3 w-3" />Revisar site</span>}</div>;
    return <span className={`block max-w-80 whitespace-pre-line break-words leading-relaxed ${['bio', 'bioEn', 'bioFr', 'notes', 'projectNames'].includes(key) ? 'line-clamp-3' : ''}`} title={String(value)}>{String(value)}{badge}</span>;
  }
  const currentSort = keys.includes(sort.key) ? sort.key : keys[0];
  return <section className="min-w-0 space-y-4" aria-label="Diretório de integrantes">
    {pendingRows.length > 0 && (
      <div className="rounded-xl border border-amber-500/30 bg-amber-950/20 p-4 space-y-3">
        <div className="flex items-center gap-2 text-amber-200 font-medium text-sm">
          <Clock className="h-4 w-4 text-amber-400 shrink-0" />
          <span>{pendingRows.length} {pendingRows.length === 1 ? 'integrante enviou alterações' : 'integrantes enviaram alterações'} para o site institucional aguardando aprovação da Gestão:</span>
        </div>
        <div className="divide-y divide-amber-500/20">
          {pendingRows.map(row => {
            const pc = row.pendingChange!;
            const changedFields = Object.keys(pc.changes);
            const busy = reviewingId === pc.id;
            return (
              <div key={pc.id} className="py-3 flex flex-wrap items-center justify-between gap-3 text-sm">
                <div className="min-w-0">
                  <Link href={editUrl(row)} className="font-medium text-zinc-100 hover:underline">{row.name}</Link>
                  <span className="ml-2 text-xs text-zinc-400">Campos alterados: <strong className="text-amber-200">{changedFields.join(', ')}</strong></span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={Boolean(reviewingId)}
                    onClick={() => void reviewProfileChange(pc.id, 'REJECT')}
                    className="min-h-9 rounded-lg border border-red-800/60 bg-red-950/50 px-3 py-1.5 text-xs font-medium text-red-200 hover:bg-red-900/60 disabled:opacity-50"
                  >
                    Recusar
                  </button>
                  <button
                    type="button"
                    disabled={Boolean(reviewingId)}
                    onClick={() => void reviewProfileChange(pc.id, 'APPROVE')}
                    className="min-h-9 rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-600 disabled:opacity-50"
                  >
                    {busy ? 'Publicando e traduzindo...' : 'Aprovar e publicar no site'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    )}

    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800 pb-4">
      <div className="inline-flex max-w-full flex-wrap gap-1 rounded-lg bg-zinc-900 p-1" role="group" aria-label="Visualização da tabela">
        {views.map(({ key, label, icon: Icon }) => <button key={key} type="button" aria-pressed={view === key} disabled={saving} onClick={() => void persist(key)} className={`inline-flex min-h-10 items-center gap-2 rounded-md px-3 text-sm font-medium transition-colors disabled:opacity-60 ${focus} ${view === key ? 'bg-zinc-100 text-zinc-950' : 'text-zinc-400 hover:text-zinc-100'}`}><Icon className="h-4 w-4" aria-hidden="true" />{label}</button>)}
      </div>
      <button type="button" disabled={saving} onClick={() => { setDraft([...custom]); setConfiguring(!configuring); setError(''); setMessage(''); }} className={secondary} aria-expanded={configuring} aria-controls="member-column-settings"><SlidersHorizontal className="h-4 w-4" />Escolher colunas<ChevronDown className={`h-4 w-4 transition-transform ${configuring ? 'rotate-180' : ''}`} /></button>
    </div>

    {configuring && <div id="member-column-settings" className="space-y-6 rounded-xl border border-zinc-700 bg-zinc-900/50 p-4 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-base font-semibold text-zinc-100">Sua visualização personalizada</h2><p className="mt-1 max-w-prose text-sm text-zinc-400">Escolha as colunas e ajuste a ordem. Essa configuração fica salva apenas na sua conta.</p></div><button type="button" aria-label="Fechar configuração de colunas" onClick={() => setConfiguring(false)} className={`flex h-11 w-11 items-center justify-center rounded-lg text-zinc-400 hover:bg-zinc-800 ${focus}`}><X className="h-4 w-4" /></button></div>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{['Interno', 'Site', 'Presença'].map(group => <fieldset key={group} className="min-w-0"><legend className="mb-2 text-sm font-medium text-zinc-200">{group}</legend><div className="space-y-0.5">{MEMBER_COLUMNS.filter(column => column.group === group).map(column => <label key={column.key} className="flex min-h-10 cursor-pointer items-center gap-3 rounded-md px-2 text-sm text-zinc-300 hover:bg-zinc-800"><input type="checkbox" checked={draft.includes(column.key)} onChange={event => setDraft(event.target.checked ? [...draft, column.key] : draft.filter(key => key !== column.key))} className={`h-4 w-4 shrink-0 accent-zinc-100 ${focus}`} />{column.label}</label>)}</div></fieldset>)}</div>
        <div className="min-w-0"><h3 className="text-sm font-medium text-zinc-200">Ordem das colunas <span className="text-zinc-400">({draft.length})</span></h3><ol className="mt-3 max-h-96 space-y-1 overflow-y-auto pr-1">{draft.map((key, index) => <li key={key} className="flex min-h-10 items-center gap-2 rounded-md bg-zinc-950 px-3"><span className="min-w-0 flex-1 text-sm text-zinc-300">{MEMBER_COLUMNS.find(column => column.key === key)!.label}</span>{[-1, 1].map(delta => <button key={delta} type="button" disabled={index + delta < 0 || index + delta >= draft.length} onClick={() => moveColumn(index, delta)} aria-label={`${delta < 0 ? 'Mover para a esquerda' : 'Mover para a direita'}: ${MEMBER_COLUMNS.find(column => column.key === key)!.label}`} className={`flex h-10 w-8 shrink-0 items-center justify-center rounded text-zinc-400 hover:text-white disabled:opacity-25 ${focus}`}>{delta < 0 ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />}</button>)}</li>)}</ol>{!draft.length && <p className="mt-3 text-sm text-amber-200">Selecione pelo menos uma coluna.</p>}</div>
      </div>
      <div className="flex flex-wrap items-center gap-3 border-t border-zinc-800 pt-4"><button type="button" disabled={saving || !draft.length} onClick={() => void persist('custom', draft)} className={`inline-flex min-h-11 items-center gap-2 rounded-lg bg-zinc-100 px-4 text-sm font-medium text-zinc-950 hover:bg-white disabled:opacity-50 ${focus}`}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}Salvar visualização</button><button type="button" disabled={saving} onClick={() => setDraft([...INTERNAL_COLUMNS])} className={secondary}>Usar campos internos</button><button type="button" disabled={saving} onClick={() => setDraft([...SITE_COLUMNS])} className={secondary}>Usar campos do site</button></div>
    </div>}

    <p className="max-w-prose text-sm text-zinc-400">{view === 'site' ? 'Dados que alimentam o site institucional. Inclui cadastros ocultos do público e edições pendentes de aprovação.' : view === 'internal' ? 'Cadastro operacional. Contatos, documentos e informações acadêmicas ficam somente no sistema.' : 'Sua seleção de dados do site, informações internas e presença.'}</p>
    <div className="grid items-end gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(14rem,1fr)_10rem_11rem_8rem]">
      <div><label htmlFor="member-search" className="mb-1.5 block text-xs font-medium text-zinc-400">Buscar nas colunas visíveis</label><div className="relative"><Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-zinc-400" /><input id="member-search" type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Nome, área ou outra informação…" className={`min-h-11 w-full rounded-lg border border-zinc-700 bg-zinc-950 pl-10 pr-3 text-sm text-zinc-100 placeholder:text-zinc-400 ${focus}`} /></div></div>
      <label className="block text-xs font-medium text-zinc-400" htmlFor="member-area">Área<select id="member-area" value={area} onChange={event => setArea(event.target.value)} className={`mt-1.5 min-h-11 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 text-sm text-zinc-200 ${focus}`}><option value="all">Todas as áreas</option>{areas.map(value => <option key={value} value={value}>{value}</option>)}</select></label>
      <label className="block text-xs font-medium text-zinc-400" htmlFor="member-team">Equipe<select id="member-team" value={team} onChange={event => setTeam(event.target.value)} className={`mt-1.5 min-h-11 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 text-sm text-zinc-200 ${focus}`}><option value="all">Todas as equipes</option>{teams.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <label className="block text-xs font-medium text-zinc-400" htmlFor="member-status">Status<select id="member-status" value={status} onChange={event => setStatus(event.target.value)} className={`mt-1.5 min-h-11 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 text-sm text-zinc-200 ${focus}`}><option value="all">Todos</option><option value="active">Ativos</option><option value="inactive">Inativos</option></select></label>
    </div>
    {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
    {message && <p role="status" className="text-sm text-emerald-300">{message}</p>}
    <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-zinc-400"><p role="status" aria-live="polite"><span className="font-medium tabular-nums text-zinc-200">{filtered.length}</span> de {rows.length} integrantes · {columns.length} colunas{saving ? ' · Salvando visualização…' : ''}</p>{hasFilters ? <button type="button" onClick={clearFilters} className={`inline-flex min-h-10 items-center gap-1.5 rounded px-2 text-zinc-300 hover:text-white ${focus}`}><X className="h-3.5 w-3.5" />Limpar filtros</button> : <span>Role para o lado para ver todas as informações</span>}</div>
    <div className="overflow-hidden rounded-xl border border-zinc-800">
      {filtered.length ? <div tabIndex={0} role="region" aria-label={`Tabela de integrantes, visão ${views.find(item => item.key === view)!.label}`} className={`max-h-[70vh] overflow-auto overscroll-x-contain ${focus}`}>
        <table className="w-full border-separate border-spacing-0 text-left text-sm"><caption className="sr-only">Integrantes — visão {views.find(item => item.key === view)!.label}. Cabeçalhos permitem ordenar os dados.</caption><thead><tr>{columns.map((column, index) => <th key={column.key} scope="col" aria-sort={currentSort === column.key ? sort.direction === 'asc' ? 'ascending' : 'descending' : 'none'} className={`sticky top-0 z-20 border-b border-zinc-700 bg-zinc-900 text-xs font-medium text-zinc-300 ${index === 0 ? 'sm:left-0 sm:z-30' : ''}`} style={{ minWidth: column.width }}><button type="button" onClick={() => setSort({ key: column.key, direction: currentSort === column.key && sort.direction === 'asc' ? 'desc' : 'asc' })} className={`flex min-h-12 w-full items-center justify-between gap-3 px-4 py-3 text-left hover:text-white ${focus}`}>{view === 'custom' ? column.label : column.label.replace(/ \((site|interno|interna)\)/, '')}{currentSort === column.key ? sort.direction === 'asc' ? <ArrowUp className="h-3.5 w-3.5 shrink-0" /> : <ArrowDown className="h-3.5 w-3.5 shrink-0" /> : <ArrowUpDown className="h-3.5 w-3.5 shrink-0 text-zinc-500" />}</button></th>)}<th scope="col" className="sticky sm:right-0 top-0 z-30 w-28 min-w-28 border-b border-zinc-700 bg-zinc-900 px-4 py-3 text-xs font-medium text-zinc-300">Ações</th></tr></thead><tbody>{filtered.map(row => <tr key={row.id} className="group">{columns.map((column, index) => <td key={column.key} className={`border-b border-zinc-800/70 bg-[#0A0A0B] px-4 py-3 text-zinc-300 group-hover:bg-zinc-900 ${index === 0 ? 'sm:sticky sm:left-0 sm:z-10 sm:border-r sm:border-r-zinc-800' : ''}`}>{cell(row, column.key)}</td>)}<td className="sm:sticky sm:right-0 z-10 border-b border-l border-zinc-800/70 bg-[#0A0A0B] px-2 py-2 group-hover:bg-zinc-900"><div className="flex items-center justify-end gap-1"><Link href={editUrl(row)} title={`Editar ${row.name}`} aria-label={`Editar ${row.name}`} className={`inline-flex h-11 w-11 items-center justify-center rounded-lg text-zinc-300 hover:bg-zinc-800 hover:text-white ${focus}`}><Edit3 className="h-4 w-4" /></Link><button type="button" title={`Excluir ${row.name}`} aria-label={`Excluir ${row.name}`} onClick={() => { setTarget(row); setError(''); }} className={`inline-flex h-11 w-11 items-center justify-center rounded-lg text-zinc-500 hover:bg-red-950 hover:text-red-300 ${focus}`}><Trash2 className="h-4 w-4" /></button></div></td></tr>)}</tbody></table>
      </div> : <div className="flex min-h-56 flex-col items-center justify-center px-6 py-12 text-center"><Search className="mb-3 h-6 w-6 text-zinc-500" /><h2 className="text-base font-medium text-zinc-100">{rows.length ? 'Nenhum integrante corresponde à busca' : 'Seu diretório ainda está vazio'}</h2><p className="mt-2 max-w-sm text-sm text-zinc-400">{rows.length ? 'Ajuste a busca, a área, a equipe ou o status para encontrar outras pessoas.' : 'Cadastre o primeiro integrante para organizar os dados da equipe.'}</p>{hasFilters && <button type="button" onClick={clearFilters} className={`mt-4 text-sm text-zinc-200 underline underline-offset-4 ${focus}`}>Limpar filtros</button>}</div>}
    </div>
    <Dialog open={Boolean(target)} onOpenChange={open => { if (!open && !deleting) setTarget(null); }}><DialogContent className="border-zinc-700 bg-zinc-950 text-zinc-100"><DialogHeader><DialogTitle>Excluir integrante?</DialogTitle></DialogHeader><DialogDescription className="text-sm leading-relaxed text-zinc-400">O cadastro de <strong className="font-medium text-zinc-200">{target?.name}</strong> será removido da gestão e do site. O histórico de presença será preservado. Para retirar apenas do site, edite o cadastro e desmarque “Exibir no site”.</DialogDescription>{error && <p role="alert" className="text-sm text-red-300">{error}</p>}<DialogFooter><button type="button" disabled={deleting} onClick={() => setTarget(null)} className={secondary}>Cancelar</button><button type="button" disabled={deleting} onClick={() => void remove()} className={`min-h-11 rounded-lg bg-red-900 px-4 text-sm font-medium text-red-100 hover:bg-red-800 disabled:opacity-50 ${focus}`}>{deleting ? 'Excluindo…' : 'Excluir cadastro'}</button></DialogFooter></DialogContent></Dialog>
  </section>;
}
