'use client';

import { MEMBER_AREAS, MEMBER_ROLES, normalizeMemberRole } from '@/lib/member-fields';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertTriangle, ArrowDown, ArrowUp, ArrowUpDown, Check, ChevronDown, Columns3, Download, Edit3, Loader2, LockKeyhole, Pencil, Search, SlidersHorizontal, Trash2, User, UserCheck, X } from 'lucide-react';
import { toast } from 'sonner';
import { saveMemberPreferences, updateMemberQuickField, inactivateMember } from '@/app/(gestao)/gestao/directory-actions';
import { deleteRecord } from '@/app/(gestao)/gestao/site/actions';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/institutional/ui/dialog';
import { useInstitutionalAsset } from '@/components/institutional/site-context';
import { ALUMNI_COLUMNS, filterMembers, INTERNAL_COLUMNS, MEMBER_COLUMNS, memberValue, SITE_COLUMNS, type MemberColumnKey, type MemberDirectoryRow, type MemberPreferences, type MemberView } from '@/lib/member-directory';
import { ExportGoogleSheetsButton } from '@/components/export/export-google-sheets-button';

const focus = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring';
const secondary = `inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-border px-3 text-sm text-secondary-foreground hover:bg-accent hover:text-foreground disabled:opacity-50 ${focus}`;
const views = [{ key: 'site', label: 'Perfil', icon: UserCheck }, { key: 'internal', label: 'Dados', icon: LockKeyhole }, { key: 'custom', label: 'Personalizada', icon: Columns3 }] as const;

export function MemberDirectory({ rows, initialPreferences, mode = 'active' }: { rows: MemberDirectoryRow[]; initialPreferences: MemberPreferences; mode?: 'active' | 'alumni' }) {
  const isAlumniMode = mode === 'alumni';
  const [view, setView] = useState<MemberView>(initialPreferences.view);
  const [custom, setCustom] = useState<MemberColumnKey[]>(initialPreferences.columns.filter(k => k !== 'showOnSite'));
  const [draft, setDraft] = useState<MemberColumnKey[]>(initialPreferences.columns.filter(k => k !== 'showOnSite'));
  const [configuring, setConfiguring] = useState(false);
  const [search, setSearch] = useState('');
  const [team, setTeam] = useState('all');
  const [area, setArea] = useState('all');
  const [onlyIncomplete, setOnlyIncomplete] = useState(false);
  const [showIncompleteDetails, setShowIncompleteDetails] = useState(false);
  const [sort, setSort] = useState<{ key: MemberColumnKey; direction: 'asc' | 'desc' }>({ key: 'name', direction: 'asc' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [target, setTarget] = useState<MemberDirectoryRow | null>(null);
  const [confirmModal, setConfirmModal] = useState<{
    member: MemberDirectoryRow;
    field: string;
    fieldLabel: string;
    currentValueLabel: string;
    newValue: unknown;
    newValueLabel: string;
  } | null>(null);
  const [updatingField, setUpdatingField] = useState(false);
  const [selectedEnumMember, setSelectedEnumMember] = useState<{
    member: MemberDirectoryRow;
    field: 'role' | 'area' | 'teamId';
  } | null>(null);
  const [textEditModal, setTextEditModal] = useState<{
    member: MemberDirectoryRow;
    field: 'course' | 'joinedYear' | 'leftYear';
    fieldLabel: string;
    value: string;
  } | null>(null);
  const [savingTextField, setSavingTextField] = useState(false);
  const [inactivationModal, setInactivationModal] = useState<{
    member: MemberDirectoryRow;
    date: string;
    reasonOption: string;
    customReason: string;
  } | null>(null);
  const [inactivating, setInactivating] = useState(false);
  const router = useRouter();

  async function handleConfirmInactivation() {
    if (!inactivationModal) return;
    const finalReason =
      inactivationModal.reasonOption === 'Outro'
        ? inactivationModal.customReason.trim()
        : inactivationModal.customReason.trim()
        ? `${inactivationModal.reasonOption} - ${inactivationModal.customReason.trim()}`
        : inactivationModal.reasonOption;

    if (!finalReason) {
      toast.error('Informe o motivo do desligamento.');
      return;
    }

    setInactivating(true);
    try {
      const res = await inactivateMember(inactivationModal.member.id, {
        inactivatedAt: inactivationModal.date,
        inactivationReason: finalReason,
      });

      if (!res.success) {
        toast.error(res.error || 'Não foi possível inativar o integrante.');
      } else {
        toast.success(`${inactivationModal.member.name} foi inativado(a) e movido(a) para Ex-Membros.`);
        setInactivationModal(null);
        router.refresh();
      }
    } catch {
      toast.error('Erro ao inativar integrante.');
    } finally {
      setInactivating(false);
    }
  }

  async function handleConfirmFieldUpdate() {
    if (!confirmModal) return;
    setUpdatingField(true);
    setError('');
    setMessage('');
    try {
      const res = await updateMemberQuickField(
        confirmModal.member.id,
        confirmModal.field,
        confirmModal.newValue
      );
      if (!res.success) {
        setError(res.error || 'Não foi possível alterar o campo.');
      } else {
        setMessage(`Campo "${confirmModal.fieldLabel}" de ${confirmModal.member.name} alterado com sucesso!`);
        if (res.warning) setError(res.warning);
        setConfirmModal(null);
        router.refresh();
      }
    } catch {
      setError('Erro ao atualizar campo. Tente novamente.');
    } finally {
      setUpdatingField(false);
    }
  }

  function requestBooleanChange(row: MemberDirectoryRow, field: 'active' | 'showOnSite' | 'isFemale') {
    const cur = row[field];
    const nxt = !cur;

    // Se estiver desativando um membro ativo, abrir modal especializado de inativação
    if (field === 'active' && cur === true) {
      setInactivationModal({
        member: row,
        date: new Date().toISOString().slice(0, 10),
        reasonOption: 'Desistência voluntária',
        customReason: '',
      });
      return;
    }

    const labels = {
      active: {
        label: 'Status',
        cur: cur ? 'Ativo' : 'Inativo (Ex-membro)',
        nxt: nxt ? 'Ativo' : 'Inativo (Ex-membro)',
      },
      showOnSite: {
        label: 'Exibição no site',
        cur: cur ? 'Visível' : 'Oculto',
        nxt: nxt ? 'Visível' : 'Oculto',
      },
      isFemale: {
        label: 'Adaptação feminino',
        cur: cur ? 'Sim' : 'Não',
        nxt: nxt ? 'Sim' : 'Não',
      },
    };
    setConfirmModal({
      member: row,
      field,
      fieldLabel: labels[field].label,
      currentValueLabel: labels[field].cur,
      newValue: nxt,
      newValueLabel: labels[field].nxt,
    });
  }

  function requestEnumChange(row: MemberDirectoryRow, field: 'role' | 'area' | 'teamId', newValue: unknown) {
    if (field === 'teamId') {
      const curTeamId = row.teamId;
      const nxtTeamId = newValue === '' || newValue === null || newValue === undefined ? null : Number(newValue);
      if (curTeamId === nxtTeamId) {
        setSelectedEnumMember(null);
        return;
      }
      const teamLabels: Record<string, string> = {
        '1': 'Nautilus',
        '2': 'Harpia',
        'null': 'UFRJ Autônomos',
      };
      setSelectedEnumMember(null);
      setConfirmModal({
        member: row,
        field: 'teamId',
        fieldLabel: 'Equipe',
        currentValueLabel: row.teamName || 'UFRJ Autônomos',
        newValue: nxtTeamId,
        newValueLabel: teamLabels[String(nxtTeamId)] || 'UFRJ Autônomos',
      });
      return;
    }
    const cur = row[field];
    if (cur === newValue) return;
    const fieldLabel = field === 'role' ? 'Cargo' : 'Área';
    setSelectedEnumMember(null);
    setConfirmModal({
      member: row,
      field,
      fieldLabel,
      currentValueLabel: cur || 'Não informada',
      newValue: newValue as string,
      newValueLabel: newValue as string,
    });
  }
  const asset = useInstitutionalAsset();
  const [downloadingPhotoId, setDownloadingPhotoId] = useState<number | null>(null);

  async function handleDownloadPhoto(row: MemberDirectoryRow) {
    if (!row.photo) {
      toast.error('Este integrante não possui foto cadastrada.');
      return;
    }
    const fullUrl = asset(String(row.photo));
    setDownloadingPhotoId(row.id);
    const cleanName = row.name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '_');
    const ext = String(row.photo).split('.').pop()?.split('?')[0] || 'webp';
    const fileName = `foto_${cleanName}.${ext}`;

    try {
      const res = await fetch(fullUrl, { mode: 'cors' });
      if (!res.ok) throw new Error('Falha na resposta do servidor.');
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(objectUrl);
      toast.success(`Foto de ${row.name} baixada!`);
    } catch {
      // Fallback para abrir a foto em nova aba se download direto for restrito
      const link = document.createElement('a');
      link.href = fullUrl;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } finally {
      setDownloadingPhotoId(null);
    }
  }

  async function handleSaveTextField() {
    if (!textEditModal) return;
    setSavingTextField(true);
    setError('');
    setMessage('');
    try {
      const cleaned = textEditModal.value.trim() || null;
      const res = await updateMemberQuickField(textEditModal.member.id, textEditModal.field, cleaned);
      if (!res.success) {
        setError(res.error || 'Não foi possível atualizar o campo.');
      } else {
        toast.success(`${textEditModal.fieldLabel} de ${textEditModal.member.name} atualizado!`);
        setTextEditModal(null);
        router.refresh();
      }
    } catch {
      setError('Erro ao salvar campo.');
    } finally {
      setSavingTextField(false);
    }
  }

  const keys = view === 'site' ? (isAlumniMode ? ALUMNI_COLUMNS : SITE_COLUMNS) : view === 'internal' ? INTERNAL_COLUMNS : custom.length ? custom : SITE_COLUMNS;
  const columns = keys.map(key => MEMBER_COLUMNS.find(column => column.key === key)!);
  const teams = useMemo(() => [...new Map(rows.map(row => [String(row.teamId ?? 'general'), row.teamName])).entries()].sort((a, b) => a[1].localeCompare(b[1], 'pt-BR')), [rows]);
  const areas = useMemo(() => [...new Set(rows.map(row => String(memberValue(row, view === 'site' ? 'area' : 'internalArea') || '')).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt-BR')), [rows, view]);
  const incompleteMembers = useMemo(
    () => (isAlumniMode ? [] : rows.filter(row => (row.missingProfileFields?.length ?? 0) > 0)),
    [rows, isAlumniMode]
  );
  const filtered = useMemo(() => {
    const baseFiltered = filterMembers(rows, keys, { search, team, area, status: 'all' }, view);
    const result = onlyIncomplete && !isAlumniMode
      ? baseFiltered.filter(row => (row.missingProfileFields?.length ?? 0) > 0)
      : baseFiltered;
    // Sorting uses displayed values too; changing views cannot sort by a hidden field.
    const key = keys.includes(sort.key) ? sort.key : keys[0];
    return result.sort((a, b) => {
      const av = memberValue(a, key); const bv = memberValue(b, key);
      if (av === null || av === '') return bv === null || bv === '' ? a.id - b.id : 1;
      if (bv === null || bv === '') return -1;
      const comparison = typeof av === 'number' && typeof bv === 'number' ? av - bv : String(av).localeCompare(String(bv), 'pt-BR', { numeric: true, sensitivity: 'base' });
      return comparison * (sort.direction === 'asc' ? 1 : -1) || a.id - b.id;
    });
  }, [rows, keys, search, team, area, onlyIncomplete, isAlumniMode, sort, view]);
  const hasFilters = Boolean(search || team !== 'all' || area !== 'all' || onlyIncomplete);
  function clearFilters() { setSearch(''); setTeam('all'); setArea('all'); setOnlyIncomplete(false); }
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
  function cell(row: MemberDirectoryRow, key: MemberColumnKey) {
    const value = memberValue(row, key);

    if (key === 'active') {
      const boolVal = Boolean(value);
      return (
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => requestBooleanChange(row, 'active')}
            className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer border ${
              boolVal
                ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-200 border-emerald-800/60 hover:bg-emerald-100 dark:hover:bg-emerald-900'
                : 'bg-accent text-secondary-foreground border-border hover:bg-accent'
            } ${focus}`}
            title={boolVal ? 'Clique para mover para Ex-membros (Alumni)' : 'Clique para reativar membro'}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${boolVal ? 'bg-emerald-400' : 'bg-muted-foreground'}`} />
            {boolVal ? 'Ativo' : 'Ex-membro'}
          </button>
        </div>
      );
    }

    if (key === 'isFemale') {
      const boolVal = Boolean(value);
      return (
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => requestBooleanChange(row, 'isFemale')}
            className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer border ${
              boolVal
                ? 'bg-rose-950/80 text-rose-700 dark:text-rose-200 border-rose-800/60 hover:bg-rose-900'
                : 'bg-accent text-secondary-foreground border-border hover:bg-accent'
            } ${focus}`}
            title="Clique para alternar adaptação de cargo feminino"
          >
            {boolVal ? 'Sim' : 'Não'}
          </button>
        </div>
      );
    }

    if (key === 'teamName') {
      const teamColors: Record<string, string> = {
        Harpia: 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-950/40 dark:text-purple-200 dark:border-purple-500/30',
        Nautilus: 'bg-sky-100 text-sky-800 border-sky-200 dark:bg-sky-950/40 dark:text-sky-200 dark:border-sky-500/30',
        'UFRJ Autônomos': 'bg-zinc-100 text-zinc-800 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700',
      };
      const color = teamColors[String(value)] || 'bg-accent text-foreground border-border';
      return (
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setSelectedEnumMember({ member: row, field: 'teamId' })}
            className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium border cursor-pointer hover:ring-1 hover:ring-ring transition-all ${color} ${focus}`}
            title="Clique para alterar a equipe"
          >
            <span>{value ? String(value) : 'UFRJ Autônomos'}</span>
            <ChevronDown className="h-3 w-3 opacity-60" />
          </button>
        </div>
      );
    }

    if (key === 'role' || (key === 'area' && view === 'site')) {
      const isRole = key === 'role';
      const roleColors: Record<string, string> = {
        'Capitão': 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30',
        'Vice-Capitão': 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30',
        'Coordenador': 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30',
        'Vice-Coordenador': 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30',
        'Diretor de Gente e Gestão': 'bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/30',
        'Diretor de Operações': 'bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/30',
        'Coordenador de Marketing': 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30',
        'Membro': 'bg-accent text-foreground border-border',
        'Trainee': 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/30',
        'Professor Orientador': 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
      };
      const areaColors: Record<string, string> = {
        'Gestão': 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30',
        'Marketing': 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30',
        'Software': 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
        'Eletrônica': 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border-cyan-500/30',
        'Mecânica': 'bg-orange-500/10 text-orange-700 dark:text-orange-300 border-orange-500/30',
        'Orientação': 'bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/30',
      };
      const color = isRole
        ? (roleColors[String(value)] || 'bg-accent text-foreground border-border')
        : (areaColors[String(value)] || 'bg-accent text-foreground border-border');

      return (
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setSelectedEnumMember({ member: row, field: isRole ? 'role' : 'area' })}
            className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium border cursor-pointer hover:ring-1 hover:ring-ring transition-all ${color} ${focus}`}
            title={`Clique para alterar ${isRole ? 'cargo' : 'área'}`}
          >
            <span>{value ? String(value) : 'Área não informada'}</span>
            <ChevronDown className="h-3 w-3 opacity-60" />
          </button>
        </div>
      );
    }

    if (key === 'course' || key === 'joinedYear' || key === 'leftYear') {
      const fieldLabels = {
        course: 'Curso',
        joinedYear: 'Data de entrada',
        leftYear: 'Ano de saída',
      };
      return (
        <button
          type="button"
          onClick={() => setTextEditModal({ member: row, field: key, fieldLabel: fieldLabels[key], value: value ? String(value) : '' })}
          className={`group/cell inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-left text-xs transition-colors hover:bg-accent cursor-pointer ${value ? 'text-foreground' : 'text-muted-foreground'} ${focus}`}
          title={`Clique para editar ${fieldLabels[key].toLowerCase()} diretamente`}
        >
          <span className={key === 'course' ? 'max-w-52 truncate' : 'tabular-nums font-mono'}>
            {value ? String(value) : 'Adicionar…'}
          </span>
          <Pencil className="h-3 w-3 opacity-0 group-hover/cell:opacity-70 transition-opacity shrink-0" />
        </button>
      );
    }

    if (key === 'inactivationReason') {
      if (value === null || value === '') return <span className="text-muted-foreground" aria-label="Não informado">—</span>;
      const isExpulsion = String(value).toLowerCase().includes('expuls');
      return (
        <span
          className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium border max-w-72 truncate ${
            isExpulsion
              ? 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30 font-semibold'
              : 'bg-muted/60 text-secondary-foreground border-border'
          }`}
          title={String(value)}
        >
          {isExpulsion && <span className="h-1.5 w-1.5 rounded-full bg-red-600 animate-pulse shrink-0" />}
          <span className="truncate">{String(value)}</span>
        </span>
      );
    }

    if (key === 'inactivatedAt') {
      if (value === null || value === '') return <span className="text-muted-foreground" aria-label="Não informado">—</span>;
      const strVal = String(value);
      const isDate = /^\d{4}-\d{2}-\d{2}$/.test(strVal);
      const formatted = isDate
        ? new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' }).format(new Date(`${strVal}T00:00:00Z`))
        : strVal;
      return <span className="tabular-nums font-mono text-xs text-secondary-foreground">{formatted}</span>;
    }

    if (value === null || value === '') return <span className="text-muted-foreground" aria-label="Não informado">—</span>;
    if (key === 'birthDate') return new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' }).format(new Date(`${value}T00:00:00Z`));
    if (key === 'cpf') return String(value).replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4');
    if (key === 'photo') return <div className="flex items-center gap-1.5"><img src={asset(String(value))} alt={`Foto de ${row.name}`} className="h-10 w-10 rounded-full object-cover" width={40} height={40} loading="lazy" /></div>;
    if (key === 'email') return <a href={`mailto:${value}`} className={`rounded-sm text-foreground underline-offset-4 hover:underline ${focus}`}>{String(value)}</a>;
    if (key === 'phone') return <a href={`tel:${String(value).replace(/[^+\d]/g, '')}`} className={`rounded-sm underline-offset-4 hover:underline ${focus}`}>{String(value)}</a>;
    if (['linkedin', 'github', 'instagram'].includes(key) && /^https?:\/\//i.test(String(value))) return <div className="flex items-center gap-1.5"><a href={String(value)} target="_blank" rel="noopener noreferrer" className={`block max-w-64 truncate underline underline-offset-4 ${focus}`} title={String(value)}>{String(value).replace(/^https?:\/\/(www\.)?/, '')}</a></div>;
    if (key === 'name' || key === 'internalName') {
      const photoUrl = row.photo ? asset(String(row.photo)) : null;
      const initials = String(value)
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map(w => w[0]?.toUpperCase())
        .join('');
      const hasIncompleteProfile = !isAlumniMode && (row.missingProfileFields?.length ?? 0) > 0;

      return (
        <div className="flex items-center gap-2.5 min-w-44">
          <div className="relative h-8 w-8 shrink-0 rounded-full overflow-hidden border border-border bg-muted flex items-center justify-center">
            {photoUrl ? (
              <img
                src={photoUrl}
                alt={`Foto de ${row.name}`}
                className="h-full w-full object-cover"
                width={32}
                height={32}
                loading="lazy"
              />
            ) : (
              <span className="text-[11px] font-semibold text-muted-foreground select-none">
                {initials || <User className="h-3.5 w-3.5" />}
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <Link
              href={editUrl(row)}
              className={`block max-w-64 whitespace-normal rounded-sm font-medium leading-relaxed text-foreground underline-offset-4 hover:underline ${focus}`}
            >
              {String(value)}
            </Link>
            {hasIncompleteProfile && (
              <span
                className="inline-flex items-center gap-1 rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-300 border border-amber-500/30"
                title={`Faltando: ${row.missingProfileFields!.join(', ')}`}
              >
                Incompleto
              </span>
            )}
          </div>
        </div>
      );
    }
    return <span className={`block max-w-80 whitespace-pre-line break-words leading-relaxed ${['bio', 'bioEn', 'bioFr', 'notes', 'projectNames'].includes(key) ? 'line-clamp-3' : ''}`} title={String(value)}>{String(value)}</span>;
  }
  const currentSort = keys.includes(sort.key) ? sort.key : keys[0];
  return <section className="min-w-0 space-y-4" aria-label={isAlumniMode ? 'Diretório de ex-membros' : 'Diretório de integrantes'}>
    {!isAlumniMode && incompleteMembers.length > 0 && (
      <div className="rounded-xl border border-amber-500/35 bg-amber-500/10 dark:bg-amber-950/25 p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-start gap-2.5 text-amber-800 dark:text-amber-200">
            <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold">
                {incompleteMembers.length} {incompleteMembers.length === 1 ? 'integrante ativo ainda não preencheu' : 'integrantes ativos ainda não preencheram'} o perfil completo
              </p>
              <p className="text-xs text-amber-800/85 dark:text-amber-200/80 mt-0.5">
                Verificamos foto, biografia, curso, telefone/WhatsApp, CPF, DRE e data de nascimento nos cadastros ativos.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setOnlyIncomplete(prev => !prev)}
              className={`inline-flex min-h-9 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold transition-colors cursor-pointer ${
                onlyIncomplete
                  ? 'bg-amber-600 text-white hover:bg-amber-700'
                  : 'border border-amber-600/40 bg-background/80 text-amber-900 dark:text-amber-200 hover:bg-amber-500/15'
              } ${focus}`}
            >
              {onlyIncomplete ? 'Mostrando apenas incompletos (Limpar)' : `Filtrar ${incompleteMembers.length} na tabela`}
            </button>
            <button
              type="button"
              onClick={() => setShowIncompleteDetails(prev => !prev)}
              className={`inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-amber-600/30 bg-background/60 px-3 text-xs font-medium text-amber-900 dark:text-amber-200 hover:bg-amber-500/10 cursor-pointer ${focus}`}
            >
              {showIncompleteDetails ? 'Ocultar lista' : 'Ver pendências por membro'}
              <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showIncompleteDetails ? 'rotate-180' : ''}`} />
            </button>
          </div>
        </div>
        {showIncompleteDetails && (
          <div className="grid gap-2 pt-2 border-t border-amber-500/20 sm:grid-cols-2 lg:grid-cols-3 max-h-64 overflow-y-auto pr-1">
            {incompleteMembers.map(member => (
              <Link
                key={member.id}
                href={editUrl(member)}
                className="flex flex-col justify-between rounded-lg border border-amber-500/20 bg-background/80 p-2.5 text-xs hover:border-amber-500/50 transition-colors"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-foreground truncate">{member.name}</span>
                  <span className="text-[10px] font-mono text-muted-foreground shrink-0">{member.area || member.teamName}</span>
                </div>
                <p className="mt-1 text-[11px] text-amber-700 dark:text-amber-300 line-clamp-2">
                  Falta: {member.missingProfileFields?.join(', ')}
                </p>
              </Link>
            ))}
          </div>
        )}
      </div>
    )}

    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
      <div className="inline-flex max-w-full flex-wrap gap-1 rounded-lg bg-muted p-1" role="group" aria-label="Visualização da tabela">
        {views.map(({ key, label, icon: Icon }) => <button key={key} type="button" aria-pressed={view === key} disabled={saving} onClick={() => void persist(key)} className={`inline-flex min-h-10 items-center gap-2 rounded-md px-3 text-sm font-medium transition-colors disabled:opacity-60 ${focus} ${view === key ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}><Icon className="h-4 w-4" aria-hidden="true" />{label}</button>)}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <ExportGoogleSheetsButton type="members" label="Exportar para Google Sheets" />
        <button type="button" disabled={saving} onClick={() => { setDraft([...custom]); setConfiguring(!configuring); setError(''); setMessage(''); }} className={secondary} aria-expanded={configuring} aria-controls="member-column-settings"><SlidersHorizontal className="h-4 w-4" />Escolher colunas<ChevronDown className={`h-4 w-4 transition-transform ${configuring ? 'rotate-180' : ''}`} /></button>
      </div>
    </div>

    {configuring && <div id="member-column-settings" className="space-y-6 rounded-xl border border-border bg-muted/50 p-4 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-base font-semibold text-foreground">Sua visualização personalizada</h2><p className="mt-1 max-w-prose text-sm text-muted-foreground">Escolha as colunas e ajuste a ordem. Essa configuração fica salva apenas na sua conta.</p></div><button type="button" aria-label="Fechar configuração de colunas" onClick={() => setConfiguring(false)} className={`flex h-11 w-11 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent ${focus}`}><X className="h-4 w-4" /></button></div>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{['Interno', 'Site', 'Presença'].map(group => <fieldset key={group} className="min-w-0"><legend className="mb-2 text-sm font-medium text-foreground">{group === 'Site' ? 'Perfil' : group === 'Interno' ? 'Dados' : group}</legend><div className="space-y-0.5">{MEMBER_COLUMNS.filter(column => column.group === group && column.key !== 'showOnSite').map(column => <label key={column.key} className="flex min-h-10 cursor-pointer items-center gap-3 rounded-md px-2 text-sm text-secondary-foreground hover:bg-accent"><input type="checkbox" checked={draft.includes(column.key)} onChange={event => setDraft(event.target.checked ? [...draft, column.key] : draft.filter(key => key !== column.key))} className={`h-4 w-4 shrink-0 accent-zinc-100 ${focus}`} />{column.label}</label>)}</div></fieldset>)}</div>
        <div className="min-w-0"><h3 className="text-sm font-medium text-foreground">Ordem das colunas <span className="text-muted-foreground">({draft.length})</span></h3><ol className="mt-3 max-h-96 space-y-1 overflow-y-auto pr-1">{draft.map((key, index) => <li key={key} className="flex min-h-10 items-center gap-2 rounded-md bg-background px-3"><span className="min-w-0 flex-1 text-sm text-secondary-foreground">{MEMBER_COLUMNS.find(column => column.key === key)!.label}</span>{[-1, 1].map(delta => <button key={delta} type="button" disabled={index + delta < 0 || index + delta >= draft.length} onClick={() => moveColumn(index, delta)} aria-label={`${delta < 0 ? 'Mover para a esquerda' : 'Mover para a direita'}: ${MEMBER_COLUMNS.find(column => column.key === key)!.label}`} className={`flex h-10 w-8 shrink-0 items-center justify-center rounded text-muted-foreground hover:text-foreground disabled:opacity-25 ${focus}`}>{delta < 0 ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />}</button>)}</li>)}</ol>{!draft.length && <p className="mt-3 text-sm text-amber-700 dark:text-amber-200">Selecione pelo menos uma coluna.</p>}</div>
      </div>
      <div className="flex flex-wrap items-center gap-3 border-t border-border pt-4"><button type="button" disabled={saving || !draft.length} onClick={() => void persist('custom', draft)} className={`inline-flex min-h-11 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 ${focus}`}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}Salvar visualização</button><button type="button" disabled={saving} onClick={() => setDraft([...INTERNAL_COLUMNS])} className={secondary}>Usar campos de Dados</button><button type="button" disabled={saving} onClick={() => setDraft([...(isAlumniMode ? ALUMNI_COLUMNS : SITE_COLUMNS)])} className={secondary}>Usar campos de Perfil</button></div>
    </div>}

    <p className="max-w-prose text-sm text-muted-foreground">{view === 'site' ? (isAlumniMode ? 'Perfil de ex-membros. Clique em curso, anos de entrada/saída, cargo ou área para ajustar rapidamente. Para exibir no site, acesse Site → Exibição de membros.' : 'Visão Perfil: edite cargo, área, equipe, curso ou ano de entrada clicando direto na célula. Para exibir no site e aprovar alterações de perfil, acesse Site → Exibição de membros.') : view === 'internal' ? 'Visão Dados (privado): contatos, documentos, emergência e informações acadêmicas confidenciais da gestão.' : 'Sua seleção personalizada de colunas de Perfil, Dados e Presença.'}</p>
    <div className="grid items-end gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(14rem,1fr)_12rem_13rem]">
      <div><label htmlFor="member-search" className="mb-1.5 block text-xs font-medium text-muted-foreground">Buscar nas colunas visíveis</label><div className="relative"><Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" /><input id="member-search" type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Nome, curso, área ou outra informação…" className={`min-h-11 w-full rounded-lg border border-input bg-background pl-10 pr-3 text-sm text-foreground placeholder:text-muted-foreground ${focus}`} /></div></div>
      <label className="block text-xs font-medium text-muted-foreground" htmlFor="member-area">Área<select id="member-area" value={area} onChange={event => setArea(event.target.value)} className={`mt-1.5 min-h-11 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground ${focus}`}><option value="all">Todas as áreas</option>{areas.map(value => <option key={value} value={value}>{value}</option>)}</select></label>
      <label className="block text-xs font-medium text-muted-foreground" htmlFor="member-team">Equipe<select id="member-team" value={team} onChange={event => setTeam(event.target.value)} className={`mt-1.5 min-h-11 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground ${focus}`}><option value="all">Todas as equipes</option>{teams.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
    </div>
    {error && <p role="alert" className="text-sm text-red-700 dark:text-red-300">{error}</p>}
    {message && <p role="status" className="text-sm text-emerald-700 dark:text-emerald-300">{message}</p>}
    <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground"><p role="status" aria-live="polite"><span className="font-medium tabular-nums text-foreground">{filtered.length}</span> de {rows.length} integrantes · {columns.length} colunas{saving ? ' · Salvando visualização…' : ''}</p>{hasFilters ? <button type="button" onClick={clearFilters} className={`inline-flex min-h-10 items-center gap-1.5 rounded px-2 text-secondary-foreground hover:text-foreground ${focus}`}><X className="h-3.5 w-3.5" />Limpar filtros</button> : <span>Role para o lado para ver todas as informações</span>}</div>
    <div className="overflow-hidden rounded-xl border border-border">
      {filtered.length ? <div tabIndex={0} role="region" aria-label={`Tabela de integrantes, visão ${views.find(item => item.key === view)!.label}`} className={`max-h-[70vh] overflow-auto overscroll-x-contain ${focus}`}>
        <table className="w-full border-separate border-spacing-0 text-left text-sm"><caption className="sr-only">Integrantes — visão {views.find(item => item.key === view)!.label}. Cabeçalhos permitem ordenar os dados.</caption><thead><tr><th scope="col" className="sticky sm:left-0 top-0 z-30 w-12 min-w-12 border-b border-border bg-muted px-2 py-3 text-center text-xs font-medium text-secondary-foreground" title="Baixar foto do integrante"><Download className="h-4 w-4 mx-auto text-muted-foreground" /><span className="sr-only">Baixar foto</span></th>{columns.map((column, index) => <th key={column.key} scope="col" aria-sort={currentSort === column.key ? sort.direction === 'asc' ? 'ascending' : 'descending' : 'none'} className="sticky top-0 z-20 border-b border-border bg-muted text-xs font-medium text-secondary-foreground" style={{ minWidth: column.width }}><button type="button" onClick={() => setSort({ key: column.key, direction: currentSort === column.key && sort.direction === 'asc' ? 'desc' : 'asc' })} className={`flex min-h-12 w-full items-center justify-between gap-3 px-4 py-3 text-left hover:text-foreground ${focus}`}>{view === 'custom' ? column.label : column.label.replace(/ \((site|interno|interna)\)/, '')}{currentSort === column.key ? sort.direction === 'asc' ? <ArrowUp className="h-3.5 w-3.5 shrink-0" /> : <ArrowDown className="h-3.5 w-3.5 shrink-0" /> : <ArrowUpDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />}</button></th>)}<th scope="col" className="sticky sm:right-0 top-0 z-30 w-28 min-w-28 border-b border-border bg-muted px-4 py-3 text-xs font-medium text-secondary-foreground">Ações</th></tr></thead><tbody>{filtered.map(row => <tr key={row.id} className="group"><td className="sticky sm:left-0 z-10 border-b border-r border-border bg-background px-2 py-2 text-center group-hover:bg-muted">{row.photo ? (<button type="button" onClick={() => handleDownloadPhoto(row)} disabled={downloadingPhotoId === row.id} title={`Baixar foto de ${row.name}`} className={`inline-flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-colors cursor-pointer disabled:opacity-50 ${focus}`}><Download className={`h-4 w-4 ${downloadingPhotoId === row.id ? 'animate-bounce text-primary' : ''}`} /></button>) : (<span title="Integrante sem foto cadastrada" className="inline-flex h-9 w-9 items-center justify-center text-muted-foreground/30 cursor-not-allowed"><Download className="h-4 w-4" /></span>)}</td>{columns.map((column, index) => <td key={column.key} className="border-b border-border bg-background px-4 py-3 text-secondary-foreground group-hover:bg-muted">{cell(row, column.key)}</td>)}<td className="sm:sticky sm:right-0 z-10 border-b border-l border-border bg-background px-2 py-2 group-hover:bg-muted"><div className="flex items-center justify-end gap-1"><Link href={editUrl(row)} title={`Editar ${row.name}`} aria-label={`Editar ${row.name}`} className={`inline-flex h-11 w-11 items-center justify-center rounded-lg text-secondary-foreground hover:bg-accent hover:text-foreground ${focus}`}><Edit3 className="h-4 w-4" /></Link><button type="button" title={`Excluir ${row.name}`} aria-label={`Excluir ${row.name}`} onClick={() => { setTarget(row); setError(''); }} className={`inline-flex h-11 w-11 items-center justify-center rounded-lg text-muted-foreground hover:bg-red-950 hover:text-red-300 ${focus}`}><Trash2 className="h-4 w-4" /></button></div></td></tr>)}</tbody></table>
      </div> : <div className="flex min-h-56 flex-col items-center justify-center px-6 py-12 text-center"><Search className="mb-3 h-6 w-6 text-muted-foreground" /><h2 className="text-base font-medium text-foreground">{rows.length ? 'Nenhum integrante corresponde à busca' : 'Seu diretório ainda está vazio'}</h2><p className="mt-2 max-w-sm text-sm text-muted-foreground">{rows.length ? 'Ajuste a busca, a área, a equipe ou o status para encontrar outras pessoas.' : 'Cadastre o primeiro integrante para organizar os dados da equipe.'}</p>{hasFilters && <button type="button" onClick={clearFilters} className={`mt-4 text-sm text-foreground underline underline-offset-4 ${focus}`}>Limpar filtros</button>}</div>}
    </div>
    <Dialog open={Boolean(target)} onOpenChange={open => { if (!open && !deleting) setTarget(null); }}><DialogContent className="border-border bg-background text-foreground"><DialogHeader><DialogTitle>Excluir integrante?</DialogTitle></DialogHeader><DialogDescription className="text-sm leading-relaxed text-muted-foreground">O cadastro de <strong className="font-medium text-foreground">{target?.name}</strong> será removido da gestão e do site. O histórico de presença será preservado. Para retirar apenas do site, edite o cadastro e desmarque “Exibir no site”.</DialogDescription>{error && <p role="alert" className="text-sm text-red-700 dark:text-red-300">{error}</p>}<DialogFooter><button type="button" disabled={deleting} onClick={() => setTarget(null)} className={secondary}>Cancelar</button><button type="button" disabled={deleting} onClick={() => void remove()} className={`min-h-11 rounded-lg bg-red-900 px-4 text-sm font-medium text-white hover:bg-red-800 disabled:opacity-50 ${focus}`}>{deleting ? 'Excluindo…' : 'Excluir cadastro'}</button></DialogFooter></DialogContent></Dialog>

    {/* Modal de seleção para Enum (Cargo, Equipe ou Área) */}
    <Dialog open={Boolean(selectedEnumMember)} onOpenChange={open => { if (!open) setSelectedEnumMember(null); }}>
      <DialogContent className="border-border bg-background text-foreground max-w-sm">
        <DialogHeader>
          <DialogTitle>
            Alterar {selectedEnumMember?.field === 'role' ? 'Cargo' : selectedEnumMember?.field === 'teamId' ? 'Equipe' : 'Área'} de {selectedEnumMember?.member.name}
          </DialogTitle>
        </DialogHeader>
        <DialogDescription className="text-xs text-muted-foreground">
          Selecione o novo valor para {selectedEnumMember?.field === 'role' ? 'o cargo' : selectedEnumMember?.field === 'teamId' ? 'a equipe' : 'a área'}. Você precisará confirmar antes de salvar.
        </DialogDescription>
        <div className="py-2 space-y-1.5 max-h-64 overflow-y-auto">
          {selectedEnumMember?.field === 'teamId' ? (
            [
              { label: '🌊 Nautilus (Veículos Subaquáticos)', value: 1 },
              { label: '☁️ Harpia (Aeronaves Autônomas)', value: 2 },
              { label: '🤖 UFRJ Autônomos (Geral)', value: null },
            ].map(option => (
              <button
                key={String(option.value)}
                type="button"
                onClick={() => selectedEnumMember && requestEnumChange(selectedEnumMember.member, 'teamId', option.value)}
                className={`flex min-h-11 w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm ${selectedEnumMember?.member.teamId === option.value ? 'bg-accent text-foreground' : 'text-secondary-foreground hover:bg-muted'} ${focus}`}
              >
                <span>{option.label}</span>
                {selectedEnumMember?.member.teamId === option.value && <span className="ml-2 text-xs text-muted-foreground">Atual</span>}
              </button>
            ))
          ) : selectedEnumMember?.field === 'role' ? (
            [...new Set(MEMBER_ROLES.map(option => option.group))].map(group => (
              <div key={group} className="space-y-1 py-2">
                <h3 className="px-3 text-xs font-medium text-muted-foreground">{group}</h3>
                {MEMBER_ROLES.filter(option => option.group === group).map(option => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => requestEnumChange(selectedEnumMember.member, 'role', option.value)}
                    className={`flex min-h-11 w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm ${normalizeMemberRole(selectedEnumMember.member.role) === option.value ? 'bg-accent text-foreground' : 'text-secondary-foreground hover:bg-muted'} ${focus}`}
                  >
                    <span>{option.label}</span>
                    {normalizeMemberRole(selectedEnumMember.member.role) === option.value && <span className="ml-2 text-xs text-muted-foreground">Atual</span>}
                  </button>
                ))}
              </div>
            ))
          ) : (
            MEMBER_AREAS.map(option => (
              <button
                key={option}
                type="button"
                onClick={() => selectedEnumMember && requestEnumChange(selectedEnumMember.member, 'area', option)}
                className={`flex min-h-11 w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm ${selectedEnumMember?.member.area === option ? 'bg-accent text-foreground' : 'text-secondary-foreground hover:bg-muted'} ${focus}`}
              >
                <span>{option}</span>
                {selectedEnumMember?.member.area === option && <span className="text-xs text-muted-foreground">Atual</span>}
              </button>
            ))
          )}
        </div>
        <DialogFooter>
          <button type="button" onClick={() => setSelectedEnumMember(null)} className={secondary}>
            Cancelar
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {/* Pop-up de edição rápida de texto (Curso, Data de entrada, Ano de saída) */}
    <Dialog open={Boolean(textEditModal)} onOpenChange={open => { if (!open && !savingTextField) setTextEditModal(null); }}>
      <DialogContent className="border-border bg-background text-foreground max-w-md">
        <DialogHeader>
          <DialogTitle>Editar {textEditModal?.fieldLabel}</DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Atualize rapidamente {textEditModal?.fieldLabel.toLowerCase()} de <strong className="text-foreground">{textEditModal?.member.name}</strong>.
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={e => {
            e.preventDefault();
            void handleSaveTextField();
          }}
          className="space-y-4 pt-1"
        >
          <div>
            <label htmlFor="quick-text-input" className="mb-1.5 block text-xs font-medium text-muted-foreground">
              {textEditModal?.fieldLabel}
            </label>
            <input
              id="quick-text-input"
              type="text"
              autoFocus
              value={textEditModal?.value ?? ''}
              onChange={e => textEditModal && setTextEditModal({ ...textEditModal, value: e.target.value })}
              placeholder={
                textEditModal?.field === 'course'
                  ? 'Ex: Engenharia Eletrônica e de Computação'
                  : textEditModal?.field === 'joinedYear'
                  ? 'Ex: 11/2026'
                  : 'Ex: 2024'
              }
              className={`min-h-11 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground ${focus}`}
            />
          </div>
          <DialogFooter className="flex items-center justify-end gap-2">
            <button
              type="button"
              disabled={savingTextField}
              onClick={() => setTextEditModal(null)}
              className={secondary}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={savingTextField}
              className={`min-h-11 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 ${focus}`}
            >
              {savingTextField ? 'Salvando...' : 'Salvar alteração'}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>

    {/* Pop-up de confirmação de alteração rápida */}
    <Dialog open={Boolean(confirmModal)} onOpenChange={open => { if (!open && !updatingField) setConfirmModal(null); }}>
      <DialogContent className="border-border bg-background text-foreground max-w-md">
        <DialogHeader>
          <DialogTitle>Confirmar alteração</DialogTitle>
        </DialogHeader>
        <DialogDescription className="text-sm leading-relaxed text-secondary-foreground">
          Deseja alterar <strong className="text-foreground">{confirmModal?.fieldLabel}</strong> de{' '}
          <strong className="text-amber-700 dark:text-amber-300">{confirmModal?.currentValueLabel}</strong> para{' '}
          <strong className="text-emerald-700 dark:text-emerald-400">{confirmModal?.newValueLabel}</strong> para o integrante{' '}
          <strong className="text-foreground">{confirmModal?.member.name}</strong>?
        </DialogDescription>
        <div className="rounded-lg bg-muted/60 border border-border p-3 text-xs text-muted-foreground">
          Esta alteração será salva imediatamente no cadastro e refletida na plataforma.
        </div>
        <DialogFooter className="flex items-center justify-end gap-2 pt-2">
          <button
            type="button"
            disabled={updatingField}
            onClick={() => setConfirmModal(null)}
            className={secondary}
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={updatingField}
            onClick={() => void handleConfirmFieldUpdate()}
            className={`min-h-11 rounded-lg bg-emerald-700 px-4 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50 ${focus}`}
          >
            {updatingField ? 'Salvando...' : 'Confirmar alteração'}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {/* Pop-up especializado de Inativação / Desligamento de Integrante */}
    <Dialog open={Boolean(inactivationModal)} onOpenChange={open => { if (!open && !inactivating) setInactivationModal(null); }}>
      <DialogContent className="border-border bg-background text-foreground max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <UserCheck className="h-4 w-4" />
            </span>
            <span>Desligar Integrante (Mover para Ex-Membros)</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Defina a data de saída e o motivo do desligamento de <strong className="text-foreground">{inactivationModal?.member.name}</strong>. Ele(a) será transferido(a) automaticamente para a tabela de Ex-Membros.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={e => { e.preventDefault(); void handleConfirmInactivation(); }} className="space-y-4 pt-1">
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase text-muted-foreground">
              Data de Desligamento / Saída
            </label>
            <input
              type="date"
              required
              value={inactivationModal?.date || ''}
              onChange={e => inactivationModal && setInactivationModal({ ...inactivationModal, date: e.target.value })}
              className={`min-h-11 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground ${focus}`}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase text-muted-foreground">
              Motivo do Desligamento
            </label>
            <select
              value={inactivationModal?.reasonOption || 'Desistência voluntária'}
              onChange={e => inactivationModal && setInactivationModal({ ...inactivationModal, reasonOption: e.target.value })}
              className={`min-h-11 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground ${focus}`}
            >
              <option value="Desistência voluntária">Desistência voluntária</option>
              <option value="Formatura / Conclusão de curso">Formatura / Conclusão de curso</option>
              <option value="Incompatibilidade de horários">Incompatibilidade de horários</option>
              <option value="Fim de estágio / Intercâmbio">Fim de estágio / Intercâmbio</option>
              <option value="Expulsão disciplinar">Expulsão disciplinar</option>
              <option value="Outro">Outro (especificar abaixo)</option>
            </select>
          </div>

          {inactivationModal?.reasonOption === 'Expulsão disciplinar' && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs leading-relaxed text-red-700 dark:text-red-300">
              ⚠️ <strong>Atenção:</strong> A saída será registrada como expulsão e aparecerá em destaque vermelho na tabela de Ex-Membros.
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase text-muted-foreground">
              Detalhamento / Observações {inactivationModal?.reasonOption === 'Outro' && <span className="text-red-500">*</span>}
            </label>
            <textarea
              rows={2}
              required={inactivationModal?.reasonOption === 'Outro'}
              placeholder={inactivationModal?.reasonOption === 'Outro' ? 'Descreva o motivo da saída...' : 'Observações adicionais (opcional)...'}
              value={inactivationModal?.customReason || ''}
              onChange={e => inactivationModal && setInactivationModal({ ...inactivationModal, customReason: e.target.value })}
              className={`w-full rounded-lg border border-input bg-background p-3 text-sm text-foreground placeholder:text-muted-foreground ${focus}`}
            />
          </div>

          <DialogFooter className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              disabled={inactivating}
              onClick={() => setInactivationModal(null)}
              className={secondary}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={inactivating}
              className={`min-h-11 rounded-lg bg-amber-600 px-4 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-50 ${focus}`}
            >
              {inactivating ? 'Inativando...' : 'Confirmar Desligamento'}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  </section>;
}
