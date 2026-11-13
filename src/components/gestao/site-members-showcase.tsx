'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Edit3,
  Eye,
  EyeOff,
  Github,
  Globe,
  GraduationCap,
  Instagram,
  LayoutGrid,
  Linkedin,
  List,
  Loader2,
  Search,
  Sparkles,
  User,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';
import { updateMemberQuickField } from '@/app/(gestao)/gestao/directory-actions';
import { ProfileChangeReview } from './profile-change-review';
import { useInstitutionalAsset } from '@/components/institutional/site-context';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/institutional/ui/dialog';
import { SITE_PROFILE_FIELDS } from '@/lib/site-profile-changes';
import type { PendingProfileChangeDto } from '@/lib/member-directory';

export type SiteMemberShowcaseRow = {
  id: number;
  name: string;
  role: string;
  roleEn: string | null;
  roleFr: string | null;
  area: string;
  teamId: number | null;
  teamName: string;
  active: boolean;
  showOnSite: boolean;
  isFemale: boolean;
  photo: string | null;
  bio: string | null;
  bioEn: string | null;
  bioFr: string | null;
  course: string | null;
  courseEn: string | null;
  courseFr: string | null;
  linkedin: string | null;
  github: string | null;
  instagram: string | null;
  joinedYear: string | null;
  leftYear: string | null;
  projectNames: string;
  pendingChange?: PendingProfileChangeDto | null;
  missingSiteFields: string[];
  missingInternalFields: string[];
};

function displayRole(role: string, isFemale: boolean) {
  if (!isFemale) return role;
  const map: Record<string, string> = {
    'Capitão': 'Capitã',
    'Vice-Capitão': 'Vice-Capitã',
    'Diretor de Gente e Gestão': 'Diretora de Gente e Gestão',
    'Diretor de Operações': 'Diretora de Operações',
    'Coordenador': 'Coordenadora',
    'Vice-Coordenador': 'Vice-Coordenadora',
    'Coordenador de Marketing': 'Coordenadora de Marketing',
    'Professor Orientador': 'Professora Orientadora',
  };
  return map[role] || role;
}

function teamTheme(teamId: number | null, teamName: string) {
  if (teamId === 2 || teamName.toLowerCase().includes('harpia')) {
    return {
      label: 'Harpia',
      badge: 'bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30',
      accent: 'from-purple-500/20 via-purple-500/5 to-transparent',
    };
  }
  if (teamId === 1 || teamName.toLowerCase().includes('nautilus')) {
    return {
      label: 'Nautilus',
      badge: 'bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30',
      accent: 'from-sky-500/20 via-sky-500/5 to-transparent',
    };
  }
  return {
    label: 'UFRJ Autônomos',
    badge: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
    accent: 'from-emerald-500/15 via-emerald-500/5 to-transparent',
  };
}

export function SiteMembersShowcase({
  rows,
  initialTab = 'active',
}: {
  rows: SiteMemberShowcaseRow[];
  initialTab?: 'active' | 'alumni' | 'all';
}) {
  const asset = useInstitutionalAsset();
  const router = useRouter();
  const [tab, setTab] = useState<'active' | 'alumni' | 'all'>(initialTab);
  const [teamFilter, setTeamFilter] = useState<'all' | 'geral' | 'harpia' | 'nautilus'>('all');
  const [visibilityFilter, setVisibilityFilter] = useState<'all' | 'visible' | 'hidden'>('all');
  const [completenessFilter, setCompletenessFilter] = useState<'all' | 'incomplete' | 'complete'>('all');
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'cards' | 'list'>('cards');
  const [togglingId, setTogglingId] = useState<number | null>(null);
  const [previewMember, setPreviewMember] = useState<SiteMemberShowcaseRow | null>(null);
  const [previewLang, setPreviewLang] = useState<'pt' | 'en' | 'fr'>('pt');

  const pendingRows = useMemo(() => rows.filter(r => Boolean(r.pendingChange)), [rows]);

  const stats = useMemo(() => {
    const activeVisible = rows.filter(r => r.active && r.showOnSite).length;
    const activeTotal = rows.filter(r => r.active).length;
    const alumniVisible = rows.filter(r => !r.active && r.showOnSite).length;
    const alumniTotal = rows.filter(r => !r.active).length;
    const incompleteCount = rows.filter(
      r => r.missingSiteFields.length > 0 || r.missingInternalFields.length > 0
    ).length;
    return {
      activeVisible,
      activeTotal,
      alumniVisible,
      alumniTotal,
      incompleteCount,
      totalVisible: activeVisible + alumniVisible,
      totalHidden: rows.length - (activeVisible + alumniVisible),
    };
  }, [rows]);

  const filtered = useMemo(() => {
    const q = search.trim().toLocaleLowerCase('pt-BR');
    return rows.filter(row => {
      if (tab === 'active' && !row.active) return false;
      if (tab === 'alumni' && row.active) return false;

      if (teamFilter === 'geral' && row.teamId !== null) return false;
      if (teamFilter === 'harpia' && row.teamId !== 2) return false;
      if (teamFilter === 'nautilus' && row.teamId !== 1) return false;

      if (visibilityFilter === 'visible' && !row.showOnSite) return false;
      if (visibilityFilter === 'hidden' && row.showOnSite) return false;

      const hasMissing =
        row.missingSiteFields.length > 0 || row.missingInternalFields.length > 0;
      if (completenessFilter === 'incomplete' && !hasMissing) return false;
      if (completenessFilter === 'complete' && hasMissing) return false;

      if (q) {
        const hay = `${row.name} ${row.role} ${row.area} ${row.course ?? ''} ${row.teamName}`.toLocaleLowerCase('pt-BR');
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [rows, tab, teamFilter, visibilityFilter, completenessFilter, search]);

  async function toggleVisibility(row: SiteMemberShowcaseRow) {
    setTogglingId(row.id);
    try {
      const next = !row.showOnSite;
      const res = await updateMemberQuickField(row.id, 'showOnSite', next);
      if (!res.success) {
        toast.error(res.error || 'Não foi possível alterar a exibição no site.');
      } else {
        toast.success(
          next
            ? `${row.name} agora está visível no site institucional.`
            : `${row.name} foi ocultado(a) do site institucional.`
        );
        if (previewMember?.id === row.id) {
          setPreviewMember({ ...previewMember, showOnSite: next });
        }
        router.refresh();
      }
    } catch {
      toast.error('Erro de conexão ao atualizar visibilidade.');
    } finally {
      setTogglingId(null);
    }
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-0.5 text-xs font-medium text-primary mb-2">
            <Globe className="h-3.5 w-3.5" />
            Vitrine do Site Público
          </div>
          <h1 className="font-display text-3xl font-semibold text-foreground">
            Exibição de Membros &amp; Alumni
          </h1>
          <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground leading-relaxed">
            Escolha quem aparece no site institucional (incluindo ex-membros), visualize como os cards ficam ao vivo para o público e aprove alterações de perfil enviadas pela equipe.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/gestao/integrantes"
            className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-border px-3.5 text-xs font-medium text-foreground hover:bg-accent transition-colors"
          >
            <Users className="h-4 w-4" />
            Ir para Integrantes
          </Link>
          <Link
            href="/gestao/ex-membros"
            className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-border px-3.5 text-xs font-medium text-foreground hover:bg-accent transition-colors"
          >
            <GraduationCap className="h-4 w-4" />
            Ir para Ex-membros
          </Link>
        </div>
      </header>

      {/* Fila de Aprovações de Alteração de Perfil */}
      {pendingRows.length > 0 && (
        <section
          id="alteracoes-do-site"
          className="scroll-mt-24 rounded-xl border border-amber-500/35 bg-amber-500/10 dark:bg-amber-950/25 p-4 sm:p-5 space-y-3"
        >
          <div className="flex items-center gap-2 text-amber-800 dark:text-amber-200 font-semibold text-sm">
            <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <span>
              {pendingRows.length}{' '}
              {pendingRows.length === 1
                ? 'solicitação de alteração de perfil aguardando aprovação'
                : 'solicitações de alteração de perfil aguardando aprovação'}
            </span>
          </div>
          <div className="divide-y divide-amber-500/20">
            {pendingRows.map(row => {
              const pc = row.pendingChange!;
              const changedFields = Object.keys(pc.changes);
              return (
                <div key={pc.id} className="py-3 flex flex-wrap items-center justify-between gap-3 text-sm">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Link href={`/gestao/integrantes/${row.id}?view=site`} className="font-semibold text-foreground hover:underline">
                        {row.name}
                      </Link>
                      {!row.active && (
                        <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                          Alumni
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Campos alterados:{' '}
                      <strong className="text-amber-800 dark:text-amber-200">
                        {changedFields.map(key => SITE_PROFILE_FIELDS.find(field => field.key === key)?.label || key).join(', ')}
                      </strong>
                    </p>
                  </div>
                  <ProfileChangeReview
                    name={row.name}
                    current={Object.fromEntries(SITE_PROFILE_FIELDS.map(field => [field.key, row[field.key as keyof SiteMemberShowcaseRow]]))}
                    change={pc}
                  />
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Métricas de Visibilidade */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Publicados no Site</p>
          <p className="mt-2 font-display text-2xl font-bold tabular-nums text-foreground">{stats.totalVisible}</p>
          <p className="mt-1 text-xs text-muted-foreground">de {rows.length} cadastros totais</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Membros Ativos Visíveis</p>
          <p className="mt-2 font-display text-2xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
            {stats.activeVisible}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">de {stats.activeTotal} ativos na equipe</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Alumni Visíveis</p>
          <p className="mt-2 font-display text-2xl font-bold tabular-nums text-purple-600 dark:text-purple-400">
            {stats.alumniVisible}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">de {stats.alumniTotal} ex-membros</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Ocultos do Público</p>
          <p className="mt-2 font-display text-2xl font-bold tabular-nums text-muted-foreground">{stats.totalHidden}</p>
          <p className="mt-1 text-xs text-muted-foreground">visíveis apenas na gestão</p>
        </div>
      </div>

      {/* Controles de Filtro, Abas e Modo de Exibição */}
      <div className="rounded-xl border border-border bg-card p-4 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Abas Ativos / Ex-membros / Todos */}
          <div className="inline-flex flex-wrap gap-1 rounded-lg bg-muted p-1">
            {[
              { id: 'active', label: `Membros Ativos (${stats.activeTotal})` },
              { id: 'alumni', label: `Ex-Membros / Alumni (${stats.alumniTotal})` },
              { id: 'all', label: `Todos (${rows.length})` },
            ].map(item => (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id as 'active' | 'alumni' | 'all')}
                className={`min-h-9 rounded-md px-3 text-xs font-medium transition-colors cursor-pointer ${
                  tab === item.id ? 'bg-primary text-primary-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          {/* Toggle Cards / Lista */}
          <div className="inline-flex rounded-lg bg-muted p-1">
            <button
              type="button"
              onClick={() => setViewMode('cards')}
              className={`inline-flex min-h-9 items-center gap-1.5 rounded-md px-3 text-xs font-medium cursor-pointer ${
                viewMode === 'cards' ? 'bg-background text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              Preview Cards
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`inline-flex min-h-9 items-center gap-1.5 rounded-md px-3 text-xs font-medium cursor-pointer ${
                viewMode === 'list' ? 'bg-background text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <List className="h-3.5 w-3.5" />
              Lista Rápida
            </button>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(14rem,1fr)_auto_auto_auto]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <input
              type="search"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por nome, cargo, área ou curso…"
              className="min-h-10 w-full rounded-lg border border-input bg-background pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground"
            />
          </div>

          <div className="flex flex-wrap items-center gap-1 rounded-lg border border-border bg-background/60 p-1 text-xs">
            {[
              { value: 'all', label: 'Todas equipes' },
              { value: 'geral', label: 'Autônomos' },
              { value: 'harpia', label: '☁️ Harpia' },
              { value: 'nautilus', label: '🌊 Nautilus' },
            ].map(t => (
              <button
                key={t.value}
                type="button"
                onClick={() => setTeamFilter(t.value as typeof teamFilter)}
                className={`rounded-md px-2.5 py-1.5 transition-colors cursor-pointer ${
                  teamFilter === t.value ? 'bg-accent font-semibold text-foreground' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-1 rounded-lg border border-border bg-background/60 p-1 text-xs">
            {[
              { value: 'all', label: 'Todos' },
              { value: 'visible', label: 'Visíveis' },
              { value: 'hidden', label: 'Ocultos' },
            ].map(v => (
              <button
                key={v.value}
                type="button"
                onClick={() => setVisibilityFilter(v.value as typeof visibilityFilter)}
                className={`rounded-md px-2.5 py-1.5 transition-colors cursor-pointer ${
                  visibilityFilter === v.value ? 'bg-accent font-semibold text-foreground' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {v.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-1 rounded-lg border border-border bg-background/60 p-1 text-xs">
            {[
              { value: 'all', label: 'Perfis: Todos' },
              { value: 'incomplete', label: `Com pendências (${stats.incompleteCount})` },
              { value: 'complete', label: 'Completos' },
            ].map(c => (
              <button
                key={c.value}
                type="button"
                onClick={() => setCompletenessFilter(c.value as typeof completenessFilter)}
                className={`rounded-md px-2.5 py-1.5 transition-colors cursor-pointer ${
                  completenessFilter === c.value ? 'bg-accent font-semibold text-foreground' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Grid de Preview dos Cards ou Lista */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-12 text-center">
          <Users className="mx-auto h-8 w-8 text-muted-foreground mb-3" />
          <p className="text-sm font-medium text-foreground">Nenhum registro encontrado com esses filtros</p>
          <p className="mt-1 text-xs text-muted-foreground">Ajuste a aba, a equipe ou a visibilidade para visualizar outros integrantes ou alumni.</p>
        </div>
      ) : viewMode === 'cards' ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map(row => {
            const theme = teamTheme(row.teamId, row.teamName);
            const photoUrl = row.photo ? asset(row.photo) : null;
            const roleLabel = displayRole(row.role, row.isFemale);
            const busy = togglingId === row.id;

            return (
              <article
                key={row.id}
                className={`group relative flex flex-col overflow-hidden rounded-2xl border transition-all ${
                  row.showOnSite
                    ? 'border-border bg-card shadow-xs hover:border-primary/40'
                    : 'border-border/60 bg-muted/25 opacity-80 hover:opacity-100'
                }`}
              >
                {/* Faixa superior do card estilo Site Institucional */}
                <div className={`h-16 bg-gradient-to-br ${theme.accent} border-b border-border/50 px-4 pt-3 flex items-start justify-between`}>
                  <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-mono font-medium ${theme.badge}`}>
                    {theme.label}
                  </span>
                  <div className="flex items-center gap-1">
                    {!row.active && (
                      <span className="inline-flex items-center rounded-full border border-border bg-background/80 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                        Alumni
                      </span>
                    )}
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium border ${
                        row.showOnSite
                          ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                          : 'bg-background/80 text-muted-foreground border-border'
                      }`}
                    >
                      {row.showOnSite ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                      {row.showOnSite ? 'No site' : 'Oculto'}
                    </span>
                  </div>
                </div>

                {/* Avatar sobreposto */}
                <div className="px-4 -mt-8 flex items-end justify-between">
                  <div className="h-16 w-16 rounded-2xl border-2 border-card bg-muted overflow-hidden shadow-sm flex items-center justify-center">
                    {photoUrl ? (
                      <img src={photoUrl} alt={row.name} className="h-full w-full object-cover" loading="lazy" />
                    ) : (
                      <User className="h-7 w-7 text-muted-foreground" />
                    )}
                  </div>
                  {(row.joinedYear || row.leftYear) && (
                    <span className="font-mono text-[11px] text-muted-foreground pb-1">
                      {row.joinedYear || '?'} {row.leftYear ? `– ${row.leftYear}` : !row.active ? '– Alumni' : '– Atual'}
                    </span>
                  )}
                </div>

                {/* Conteúdo do Card */}
                <div className="flex-1 p-4 pt-3 space-y-2.5">
                  <div>
                    <h2 className="font-display text-base font-semibold text-foreground leading-snug line-clamp-1" title={row.name}>
                      {row.name}
                    </h2>
                    <p className="text-xs font-medium text-primary mt-0.5">
                      {roleLabel} {row.area ? `· ${row.area}` : ''}
                    </p>
                    {row.course && (
                      <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1" title={row.course}>
                        {row.course}
                      </p>
                    )}
                  </div>

                  {row.bio ? (
                    <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">{row.bio}</p>
                  ) : (
                    <p className="text-xs italic text-muted-foreground/60">Sem biografia cadastrada para o site.</p>
                  )}

                  {row.projectNames && (
                    <p className="text-[11px] text-secondary-foreground line-clamp-1">
                      <span className="text-muted-foreground">Projetos:</span> {row.projectNames}
                    </p>
                  )}

                  {/* Redes Sociais */}
                  <div className="flex items-center gap-2 pt-1 text-muted-foreground">
                    {row.linkedin && (
                      <a href={row.linkedin} target="_blank" rel="noopener noreferrer" className="hover:text-foreground" title="LinkedIn">
                        <Linkedin className="h-3.5 w-3.5" />
                      </a>
                    )}
                    {row.github && (
                      <a href={row.github} target="_blank" rel="noopener noreferrer" className="hover:text-foreground" title="GitHub">
                        <Github className="h-3.5 w-3.5" />
                      </a>
                    )}
                    {row.instagram && (
                      <a href={row.instagram} target="_blank" rel="noopener noreferrer" className="hover:text-foreground" title="Instagram">
                        <Instagram className="h-3.5 w-3.5" />
                      </a>
                    )}
                    {!row.linkedin && !row.github && !row.instagram && (
                      <span className="text-[10px] text-muted-foreground/60">Sem redes sociais</span>
                    )}
                  </div>

                  {/* Pendências explícitas do perfil */}
                  {(row.missingSiteFields.length > 0 || row.missingInternalFields.length > 0) && (
                    <div className="mt-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-2.5 space-y-1 text-[11px]">
                      <p className="inline-flex items-center gap-1 font-semibold text-amber-800 dark:text-amber-300">
                        <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                        O que falta no perfil:
                      </p>
                      {row.missingSiteFields.length > 0 && (
                        <p className="text-amber-900/90 dark:text-amber-200/90 leading-snug">
                          <span className="font-medium">Site:</span> {row.missingSiteFields.join(', ')}
                        </p>
                      )}
                      {row.missingInternalFields.length > 0 && (
                        <p className="text-amber-900/80 dark:text-amber-200/80 leading-snug">
                          <span className="font-medium">Cadastro:</span> {row.missingInternalFields.join(', ')}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Rodapé de Ações */}
                <div className="border-t border-border/70 bg-muted/30 p-3 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void toggleVisibility(row)}
                    className={`flex-1 inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50 ${
                      row.showOnSite
                        ? 'border border-border bg-background text-foreground hover:bg-accent'
                        : 'bg-emerald-600 text-white hover:bg-emerald-700'
                    }`}
                  >
                    {busy ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : row.showOnSite ? (
                      <>
                        <EyeOff className="h-3.5 w-3.5" />
                        Ocultar
                      </>
                    ) : (
                      <>
                        <Eye className="h-3.5 w-3.5" />
                        Exibir no site
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPreviewLang('pt');
                      setPreviewMember(row);
                    }}
                    className="inline-flex min-h-9 items-center justify-center rounded-lg border border-border bg-background px-2.5 text-xs font-medium text-foreground hover:bg-accent cursor-pointer"
                    title="Abrir preview completo do card"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                  </button>
                  <Link
                    href={`/gestao/integrantes/${row.id}?view=site`}
                    className="inline-flex min-h-9 items-center justify-center rounded-lg border border-border bg-background px-2.5 text-xs font-medium text-foreground hover:bg-accent"
                    title="Editar informações do site"
                  >
                    <Edit3 className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border bg-muted/50 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Integrante</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Equipe &amp; Área</th>
                  <th className="px-4 py-3 font-medium">Cargo no Site</th>
                  <th className="px-4 py-3 font-medium">Faltando no Perfil</th>
                  <th className="px-4 py-3 font-medium">Exibição</th>
                  <th className="px-4 py-3 font-medium text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map(row => {
                  const busy = togglingId === row.id;
                  return (
                    <tr key={row.id} className="hover:bg-muted/25">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 shrink-0 overflow-hidden rounded-full border border-border bg-muted flex items-center justify-center">
                            {row.photo ? (
                              <img src={asset(row.photo)} alt={row.name} className="h-full w-full object-cover" />
                            ) : (
                              <User className="h-4 w-4 text-muted-foreground" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-foreground">{row.name}</p>
                            <p className="text-xs text-muted-foreground">{row.course || 'Sem curso'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {row.active ? (
                          <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                            Ativo
                          </span>
                        ) : (
                          <span className="rounded-full bg-muted px-2 py-0.5 text-muted-foreground border border-border">
                            Alumni {row.leftYear ? `(${row.leftYear})` : ''}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {row.teamName} · {row.area || '—'}
                      </td>
                      <td className="px-4 py-3 text-xs font-medium text-foreground">
                        {displayRole(row.role, row.isFemale)}
                      </td>
                      <td className="px-4 py-3 text-xs max-w-[260px]">
                        {row.missingSiteFields.length === 0 && row.missingInternalFields.length === 0 ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                            <CheckCircle2 className="h-3 w-3" /> Completo
                          </span>
                        ) : (
                          <div className="space-y-0.5 text-[11px] text-amber-800 dark:text-amber-300">
                            {row.missingSiteFields.length > 0 && (
                              <p className="leading-snug">
                                <span className="font-semibold">Site:</span> {row.missingSiteFields.join(', ')}
                              </p>
                            )}
                            {row.missingInternalFields.length > 0 && (
                              <p className="leading-snug text-amber-700/90 dark:text-amber-200/80">
                                <span className="font-semibold">Cadastro:</span> {row.missingInternalFields.join(', ')}
                              </p>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void toggleVisibility(row)}
                          className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium border cursor-pointer disabled:opacity-50 ${
                            row.showOnSite
                              ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                              : 'bg-muted text-muted-foreground border-border'
                          }`}
                        >
                          {row.showOnSite ? <CheckCircle2 className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                          {row.showOnSite ? 'Visível no site' : 'Oculto'}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setPreviewLang('pt');
                              setPreviewMember(row);
                            }}
                            className="inline-flex h-8 items-center gap-1 rounded-md border border-border px-2.5 text-xs hover:bg-accent cursor-pointer"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            Preview
                          </button>
                          <Link
                            href={`/gestao/integrantes/${row.id}?view=site`}
                            className="inline-flex h-8 items-center gap-1 rounded-md border border-border px-2.5 text-xs hover:bg-accent"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                            Editar
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Dialog de Preview Realista do Card no Site */}
      <Dialog open={Boolean(previewMember)} onOpenChange={open => !open && setPreviewMember(null)}>
        <DialogContent className="sm:max-w-lg border-border bg-card text-foreground">
          <DialogHeader>
            <div className="flex items-center justify-between gap-3">
              <DialogTitle className="font-display text-lg font-semibold">
                Pré-visualização do Card no Site
              </DialogTitle>
              <div className="inline-flex rounded-md bg-muted p-0.5 text-xs">
                {(['pt', 'en', 'fr'] as const).map(lang => (
                  <button
                    key={lang}
                    type="button"
                    onClick={() => setPreviewLang(lang)}
                    className={`rounded px-2 py-1 uppercase font-mono cursor-pointer ${
                      previewLang === lang ? 'bg-background font-semibold text-foreground shadow-2xs' : 'text-muted-foreground'
                    }`}
                  >
                    {lang}
                  </button>
                ))}
              </div>
            </div>
            <DialogDescription className="text-xs text-muted-foreground">
              Simulação de como este card é renderizado nas páginas públicas de Membros / Alumni.
            </DialogDescription>
          </DialogHeader>

          {previewMember && (
            <div className="rounded-2xl border border-border bg-background overflow-hidden shadow-md">
              <div className={`h-24 bg-gradient-to-br ${teamTheme(previewMember.teamId, previewMember.teamName).accent} p-4 flex justify-between items-start`}>
                <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-mono ${teamTheme(previewMember.teamId, previewMember.teamName).badge}`}>
                  {teamTheme(previewMember.teamId, previewMember.teamName).label}
                </span>
                {!previewMember.active && (
                  <span className="rounded-full border border-border bg-background/80 px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                    Alumni {previewMember.joinedYear && previewMember.leftYear ? `(${previewMember.joinedYear}–${previewMember.leftYear})` : ''}
                  </span>
                )}
              </div>
              <div className="px-6 pb-6 -mt-12 space-y-4">
                <div className="flex items-end gap-4">
                  <div className="h-24 w-24 shrink-0 rounded-2xl border-4 border-background bg-muted overflow-hidden shadow-md flex items-center justify-center">
                    {previewMember.photo ? (
                      <img src={asset(previewMember.photo)} alt={previewMember.name} className="h-full w-full object-cover" />
                    ) : (
                      <User className="h-10 w-10 text-muted-foreground" />
                    )}
                  </div>
                  <div className="pb-1">
                    <h3 className="font-display text-xl font-bold text-foreground">{previewMember.name}</h3>
                    <p className="text-sm font-medium text-primary">
                      {previewLang === 'en'
                        ? previewMember.roleEn || displayRole(previewMember.role, previewMember.isFemale)
                        : previewLang === 'fr'
                        ? previewMember.roleFr || displayRole(previewMember.role, previewMember.isFemale)
                        : displayRole(previewMember.role, previewMember.isFemale)}
                      {previewMember.area ? ` · ${previewMember.area}` : ''}
                    </p>
                  </div>
                </div>

                <div className="space-y-1 text-xs text-muted-foreground">
                  <p>
                    <strong className="text-foreground">Curso:</strong>{' '}
                    {previewLang === 'en'
                      ? previewMember.courseEn || previewMember.course || '—'
                      : previewLang === 'fr'
                      ? previewMember.courseFr || previewMember.course || '—'
                      : previewMember.course || '—'}
                  </p>
                  {(previewMember.joinedYear || previewMember.leftYear) && (
                    <p>
                      <strong className="text-foreground">Período na equipe:</strong>{' '}
                      {previewMember.joinedYear || '?'} {previewMember.leftYear ? `até ${previewMember.leftYear}` : !previewMember.active ? '(Alumni)' : 'até o momento'}
                    </p>
                  )}
                  {previewMember.projectNames && (
                    <p>
                      <strong className="text-foreground">Projetos:</strong> {previewMember.projectNames}
                    </p>
                  )}
                </div>

                <p className="text-sm text-secondary-foreground leading-relaxed bg-muted/40 rounded-lg p-3 border border-border/60">
                  {previewLang === 'en'
                    ? previewMember.bioEn || previewMember.bio || 'Sem biografia em inglês cadastrada.'
                    : previewLang === 'fr'
                    ? previewMember.bioFr || previewMember.bio || 'Sem biografia em francês cadastrada.'
                    : previewMember.bio || 'Sem biografia cadastrada.'}
                </p>

                <div className="flex flex-wrap items-center gap-3 text-xs">
                  {previewMember.linkedin && (
                    <a href={previewMember.linkedin} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-primary hover:underline">
                      <Linkedin className="h-4 w-4" /> LinkedIn
                    </a>
                  )}
                  {previewMember.github && (
                    <a href={previewMember.github} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-primary hover:underline">
                      <Github className="h-4 w-4" /> GitHub
                    </a>
                  )}
                  {previewMember.instagram && (
                    <a href={previewMember.instagram} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-primary hover:underline">
                      <Instagram className="h-4 w-4" /> Instagram
                    </a>
                  )}
                </div>

                {(previewMember.missingSiteFields.length > 0 || previewMember.missingInternalFields.length > 0) && (
                  <div className="rounded-xl border border-amber-500/35 bg-amber-500/10 p-3 text-xs space-y-1">
                    <p className="inline-flex items-center gap-1.5 font-semibold text-amber-800 dark:text-amber-300">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      Pendências identificadas neste perfil
                    </p>
                    {previewMember.missingSiteFields.length > 0 && (
                      <p className="text-amber-900/90 dark:text-amber-200/90">
                        <strong>Para o card no site:</strong> {previewMember.missingSiteFields.join(', ')}
                      </p>
                    )}
                    {previewMember.missingInternalFields.length > 0 && (
                      <p className="text-amber-900/80 dark:text-amber-200/80">
                        <strong>Cadastro interno:</strong> {previewMember.missingInternalFields.join(', ')}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          <DialogFooter className="flex-wrap justify-between gap-2 pt-2">
            {previewMember && (
              <button
                type="button"
                disabled={togglingId === previewMember.id}
                onClick={() => void toggleVisibility(previewMember)}
                className={`inline-flex min-h-10 items-center gap-2 rounded-lg px-4 text-xs font-semibold cursor-pointer ${
                  previewMember.showOnSite
                    ? 'border border-border bg-background text-foreground hover:bg-accent'
                    : 'bg-emerald-600 text-white hover:bg-emerald-700'
                }`}
              >
                {previewMember.showOnSite ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                {previewMember.showOnSite ? 'Ocultar do site' : 'Exibir no site'}
              </button>
            )}
            <div className="flex items-center gap-2">
              {previewMember && (
                <Link
                  href={`/gestao/integrantes/${previewMember.id}?view=site`}
                  className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-border px-3.5 text-xs font-medium hover:bg-accent"
                >
                  <Edit3 className="h-3.5 w-3.5" />
                  Editar cadastro
                </Link>
              )}
              <button
                type="button"
                onClick={() => setPreviewMember(null)}
                className="inline-flex min-h-10 items-center rounded-lg bg-foreground px-4 text-xs font-medium text-background hover:bg-foreground/90 cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
