'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  BookOpen,
  Calendar,
  CheckCircle2,
  ClipboardList,
  Clock3,
  ExternalLink,
  FileText,
  FolderPlus,
  GraduationCap,
  Layers,
  Link2,
  ListChecks,
  Pencil,
  PlayCircle,
  Plus,
  Search,
  Send,
  Sparkles,
  Trash2,
  Users,
  Video,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type {
  AreaCourseDTO,
  AreaCourseSlotDTO,
  AreasWorkspaceDTO,
  AreaTaskDTO,
  AreaTaskPriority,
  AreaTaskStatus,
} from '@/lib/areas/types';

type ActiveTab = 'tasks' | 'courses' | 'members';

const STATUS_META: Record<
  AreaTaskStatus,
  { label: string; badge: string; columnBorder: string }
> = {
  TODO: {
    label: 'A fazer',
    badge: 'bg-zinc-500/15 text-zinc-700 dark:text-zinc-300 border-zinc-500/30',
    columnBorder: 'border-border',
  },
  IN_PROGRESS: {
    label: 'Em andamento',
    badge: 'bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/35',
    columnBorder: 'border-sky-500/30',
  },
  REVIEW: {
    label: 'Revisão / Passagem',
    badge: 'bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/35',
    columnBorder: 'border-amber-500/30',
  },
  DONE: {
    label: 'Concluída',
    badge: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/35',
    columnBorder: 'border-emerald-500/30',
  },
};

const PRIORITY_META: Record<AreaTaskPriority, { label: string; cls: string }> = {
  BAIXA: {
    label: 'Baixa',
    cls: 'border-border bg-muted/60 text-muted-foreground',
  },
  MEDIA: {
    label: 'Média',
    cls: 'border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300',
  },
  ALTA: {
    label: 'Alta',
    cls: 'border-amber-500/35 bg-amber-500/15 text-amber-800 dark:text-amber-300',
  },
  URGENTE: {
    label: 'Urgente',
    cls: 'border-red-500/35 bg-red-500/15 text-red-700 dark:text-red-300',
  },
};

function formatDateBr(iso: string | null) {
  if (!iso) return null;
  try {
    return new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' }).format(
      new Date(iso.includes('T') ? iso : `${iso}T12:00:00Z`)
    );
  } catch {
    return iso;
  }
}

export function AreasWorkspaceClient({
  initialData,
  currentUserId,
  initialTab = 'tasks',
}: {
  initialData: AreasWorkspaceDTO;
  currentUserId: string;
  initialTab?: ActiveTab;
}) {
  const [data, setData] = useState<AreasWorkspaceDTO>(initialData);
  const [loadingScope, setLoadingScope] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>(initialTab);
  const [taskFilter, setTaskFilter] = useState<'all' | 'mine' | AreaTaskStatus>('all');
  const [search, setSearch] = useState('');

  // Modal: Create / Edit Task (Coordinator / ADMIN)
  const [taskModal, setTaskModal] = useState<{
    mode: 'create' | 'edit';
    taskId?: string;
    title: string;
    description: string;
    priority: AreaTaskPriority;
    dueDate: string;
    referenceUrl: string;
    assigneeIds: string[];
  } | null>(null);

  // Modal: Task Handoff / Status update (Area member / Assignee / Coordinator / ADMIN)
  const [handoffModal, setHandoffModal] = useState<{
    task: AreaTaskDTO;
    status: AreaTaskStatus;
    handoffNotes: string;
    deliveryUrl: string;
  } | null>(null);

  // Modal: Create Course (Coordinator / ADMIN)
  const [courseModal, setCourseModal] = useState<{
    title: string;
    subtitle: string;
    description: string;
    level: string;
    durationHours: string;
    scopeMode: 'division' | 'macro';
    externalUrl: string;
    initialModuleTitle: string;
  } | null>(null);

  // Modal: Add Lesson to Course (Coordinator / ADMIN)
  const [lessonModal, setLessonModal] = useState<{
    course: AreaCourseDTO;
    moduleId: string;
    newModuleTitle: string;
    title: string;
    summary: string;
    youtubeUrl: string;
    textContent: string;
    rosDocsUrl: string;
  } | null>(null);

  const [busy, setBusy] = useState(false);

  async function reloadScope(scopeKey: string) {
    setLoadingScope(true);
    try {
      const res = await fetch(`/api/areas?scope=${encodeURIComponent(scopeKey)}`, {
        cache: 'no-store',
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Erro ao carregar área.');
      setData(json as AreasWorkspaceDTO);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao trocar de área.');
    } finally {
      setLoadingScope(false);
    }
  }

  const filteredTasks = useMemo(() => {
    const q = search.trim().toLowerCase();
    return data.tasks.filter((t) => {
      if (taskFilter === 'mine' && !t.assignments.some((a) => a.memberId === currentUserId)) {
        return false;
      }
      if (
        taskFilter !== 'all' &&
        taskFilter !== 'mine' &&
        t.status !== taskFilter
      ) {
        return false;
      }
      if (q) {
        const hay = `${t.title} ${t.description} ${t.handoffNotes} ${t.assignments.map((a) => a.memberName).join(' ')}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [data.tasks, taskFilter, search, currentUserId]);

  const coordinators = useMemo(
    () => data.members.filter((m) => m.isCoordinator),
    [data.members]
  );

  function openNewTaskModal() {
    setTaskModal({
      mode: 'create',
      title: '',
      description: '',
      priority: 'MEDIA',
      dueDate: '',
      referenceUrl: '',
      assigneeIds: [],
    });
  }

  function openEditTaskModal(task: AreaTaskDTO) {
    setTaskModal({
      mode: 'edit',
      taskId: task.id,
      title: task.title,
      description: task.description,
      priority: task.priority,
      dueDate: task.dueDate ?? '',
      referenceUrl: task.referenceUrl ?? '',
      assigneeIds: task.assignments.map((a) => a.memberId),
    });
  }

  async function submitTaskModal(e: React.FormEvent) {
    e.preventDefault();
    if (!taskModal) return;
    setBusy(true);
    try {
      const endpoint =
        taskModal.mode === 'create'
          ? '/api/areas/tasks'
          : `/api/areas/tasks/${taskModal.taskId}`;
      const method = taskModal.mode === 'create' ? 'POST' : 'PATCH';
      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scopeKey: data.selectedScope.scopeKey,
          title: taskModal.title,
          description: taskModal.description,
          priority: taskModal.priority,
          dueDate: taskModal.dueDate || null,
          referenceUrl: taskModal.referenceUrl || null,
          assigneeIds: taskModal.assigneeIds,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Não foi possível salvar a tarefa.');
      toast.success(
        taskModal.mode === 'create' ? 'Tarefa criada e passada para a área!' : 'Tarefa atualizada!'
      );
      setTaskModal(null);
      await reloadScope(data.selectedScope.scopeKey);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar tarefa.');
    } finally {
      setBusy(false);
    }
  }

  async function quickMoveStatus(task: AreaTaskDTO, status: AreaTaskStatus) {
    setBusy(true);
    try {
      const res = await fetch(`/api/areas/tasks/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Não foi possível mover a tarefa.');
      toast.success(`Status alterado para ${STATUS_META[status].label}.`);
      await reloadScope(data.selectedScope.scopeKey);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao atualizar status.');
    } finally {
      setBusy(false);
    }
  }

  async function submitHandoffModal(e: React.FormEvent) {
    e.preventDefault();
    if (!handoffModal) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/areas/tasks/${handoffModal.task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: handoffModal.status,
          handoffNotes: handoffModal.handoffNotes,
          deliveryUrl: handoffModal.deliveryUrl || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Não foi possível registrar passagem.');
      toast.success('Passagem / entrega registrada com sucesso!');
      setHandoffModal(null);
      await reloadScope(data.selectedScope.scopeKey);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao registrar passagem.');
    } finally {
      setBusy(false);
    }
  }

  async function handleDeleteTask(taskId: string) {
    setBusy(true);
    try {
      const res = await fetch(`/api/areas/tasks/${taskId}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Erro ao excluir tarefa.');
      toast.success('Tarefa removida.');
      setTaskModal(null);
      await reloadScope(data.selectedScope.scopeKey);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao remover tarefa.');
    } finally {
      setBusy(false);
    }
  }

  function openNewCourseModal(slot?: AreaCourseSlotDTO) {
    setCourseModal({
      title: slot?.title ?? '',
      subtitle: slot?.subtitle ?? '',
      description: slot?.description ?? '',
      level: slot?.level ?? 'Iniciante',
      durationHours: String(slot?.durationHours ?? 8),
      scopeMode: 'division',
      externalUrl: '',
      initialModuleTitle: slot?.suggestedModules?.[0]
        ? `Módulo 1 · ${slot.suggestedModules[0]}`
        : 'Módulo 1 · Fundamentos',
    });
  }

  async function submitCourseModal(e: React.FormEvent) {
    e.preventDefault();
    if (!courseModal) return;
    setBusy(true);
    try {
      const res = await fetch('/api/areas/courses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scopeKey: data.selectedScope.scopeKey,
          scopeMode: courseModal.scopeMode,
          title: courseModal.title,
          subtitle: courseModal.subtitle,
          description: courseModal.description,
          level: courseModal.level,
          durationHours: Number(courseModal.durationHours || 6),
          externalUrl: courseModal.externalUrl || null,
          initialModuleTitle: courseModal.initialModuleTitle,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Não foi possível criar o curso.');
      toast.success('Novo curso criado na área e integrado ao Ensino!');
      setCourseModal(null);
      await reloadScope(data.selectedScope.scopeKey);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao criar curso.');
    } finally {
      setBusy(false);
    }
  }

  function openAddLessonModal(course: AreaCourseDTO) {
    setLessonModal({
      course,
      moduleId: course.modules[0]?.id ?? '__new__',
      newModuleTitle: '',
      title: '',
      summary: '',
      youtubeUrl: '',
      textContent: '',
      rosDocsUrl: '',
    });
  }

  async function submitLessonModal(e: React.FormEvent) {
    e.preventDefault();
    if (!lessonModal) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/areas/courses/${lessonModal.course.id}/lessons`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          moduleId: lessonModal.moduleId === '__new__' ? null : lessonModal.moduleId,
          newModuleTitle:
            lessonModal.moduleId === '__new__' ? lessonModal.newModuleTitle : null,
          title: lessonModal.title,
          summary: lessonModal.summary,
          youtubeUrl: lessonModal.youtubeUrl,
          textContent: lessonModal.textContent,
          rosDocsUrl: lessonModal.rosDocsUrl || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Erro ao adicionar aula.');
      toast.success('Aula adicionada ao curso!');
      setLessonModal(null);
      await reloadScope(data.selectedScope.scopeKey);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao criar aula.');
    } finally {
      setBusy(false);
    }
  }

  async function handleDeleteCourse(courseId: string, courseTitle: string) {
    setBusy(true);
    try {
      const res = await fetch(`/api/areas/courses/${courseId}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Erro ao remover curso.');
      toast.success(`Curso "${courseTitle}" removido.`);
      await reloadScope(data.selectedScope.scopeKey);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao excluir curso.');
    } finally {
      setBusy(false);
    }
  }

  const teamBadgeColor =
    data.selectedScope.teamSlug === 'harpia'
      ? 'border-purple-500/35 bg-purple-500/10 text-purple-700 dark:text-purple-300'
      : data.selectedScope.teamSlug === 'nautilus'
        ? 'border-sky-500/35 bg-sky-500/10 text-sky-700 dark:text-sky-300'
        : 'border-border bg-muted text-foreground';

  return (
    <div className="mx-auto w-full max-w-[1680px] min-w-0 px-3 sm:px-6 py-6 sm:py-8 space-y-6">
      {/* 1. CABEÇALHO & SELETOR DE ÁREAS DA EQUIPE */}
      <header className="space-y-4 border-b border-border pb-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1.5 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold',
                  teamBadgeColor
                )}
              >
                <Layers className="h-3.5 w-3.5" />
                {data.selectedScope.teamName}
              </span>
              {data.userScopeKey === data.selectedScope.scopeKey && (
                <span className="inline-flex items-center gap-1 rounded-full border border-primary/40 bg-primary/15 px-2.5 py-0.5 text-xs font-semibold text-primary">
                  <Sparkles className="h-3 w-3" />
                  Sua área na equipe
                </span>
              )}
              {data.canManageSelectedArea && (
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/35 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                  Permissão de coordenação ativa
                </span>
              )}
            </div>

            <h1 className="font-display text-2xl sm:text-3xl font-bold text-foreground">
              {data.selectedScope.area === 'Gestão'
                ? 'Gente e Gestão'
                : data.selectedScope.area}{' '}
              · Espaço da Área
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-3xl">
              Central da área para passagem e acompanhamento de tarefas, entregas da equipe e capacitação com cursos próprios da divisão.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {data.canManageSelectedArea && (
              <>
                <button
                  type="button"
                  onClick={openNewTaskModal}
                  className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-primary px-3.5 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition cursor-pointer"
                >
                  <Plus className="h-4 w-4" />
                  Nova Tarefa
                </button>
                <button
                  type="button"
                  onClick={() => openNewCourseModal()}
                  className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-border bg-card px-3.5 py-2 text-xs font-semibold text-foreground hover:bg-accent transition cursor-pointer"
                >
                  <FolderPlus className="h-4 w-4 text-purple-500" />
                  Novo Curso
                </button>
              </>
            )}
          </div>
        </div>

        {/* Seletor rápido entre áreas e divisões */}
        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Navegar entre áreas da equipe {loadingScope ? '(carregando...)' : ''}
          </p>
          <div className="grid gap-2 grid-cols-2 sm:grid-cols-4 xl:grid-cols-8">
            {data.scopes.map((s) => {
              const selected = s.scopeKey === data.selectedScope.scopeKey;
              return (
                <button
                  key={s.scopeKey}
                  type="button"
                  disabled={loadingScope}
                  onClick={() => void reloadScope(s.scopeKey)}
                  className={cn(
                    'flex flex-col justify-between rounded-xl border p-2.5 text-left transition cursor-pointer',
                    selected
                      ? 'border-primary bg-primary/10 ring-1 ring-primary/30'
                      : 'border-border bg-card hover:bg-accent/50'
                  )}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs font-semibold text-foreground truncate">
                      {s.area === 'Gestão' ? 'Gestão' : s.area}
                    </span>
                    {s.isUserArea && (
                      <span className="h-2 w-2 shrink-0 rounded-full bg-primary" title="Sua área" />
                    )}
                  </div>
                  <p className="text-[10px] text-muted-foreground truncate">
                    {s.teamSlug === 'harpia'
                      ? 'Harpia (UAV)'
                      : s.teamSlug === 'nautilus'
                        ? 'Nautilus (AUV)'
                        : 'Geral'}
                  </p>
                  <div className="mt-2 flex items-center justify-between text-[10px] font-mono text-muted-foreground">
                    <span>{s.openTasksCount} tar.</span>
                    <span>{s.coursesCount} cur.</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* KPIs da Área */}
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
          <div className="rounded-xl border border-border bg-card p-3.5 shadow-xs">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Integrantes</p>
            <p className="mt-1 font-display text-2xl font-bold tabular-nums text-foreground">
              {data.stats.totalMembers}
            </p>
            <p className="text-[11px] text-muted-foreground truncate">
              {coordinators.length > 0
                ? `Coord: ${coordinators.map((c) => c.name.split(' ')[0]).join(', ')}`
                : 'Sem coordenação vinculada'}
            </p>
          </div>

          <div className="rounded-xl border border-border bg-card p-3.5 shadow-xs">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">A Fazer</p>
            <p className="mt-1 font-display text-2xl font-bold tabular-nums text-foreground">
              {data.stats.todoCount}
            </p>
            <p className="text-[11px] text-muted-foreground">Na fila da área</p>
          </div>

          <div className="rounded-xl border border-sky-500/25 bg-sky-500/[0.04] p-3.5 shadow-xs">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Em Andamento</p>
            <p className="mt-1 font-display text-2xl font-bold tabular-nums text-sky-700 dark:text-sky-300">
              {data.stats.inProgressCount}
            </p>
            <p className="text-[11px] text-muted-foreground">Em execução</p>
          </div>

          <div className="rounded-xl border border-amber-500/25 bg-amber-500/[0.04] p-3.5 shadow-xs">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Em Passagem</p>
            <p className="mt-1 font-display text-2xl font-bold tabular-nums text-amber-700 dark:text-amber-300">
              {data.stats.reviewCount}
            </p>
            <p className="text-[11px] text-muted-foreground">Aguardando revisão</p>
          </div>

          <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/[0.04] p-3.5 shadow-xs">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Concluídas</p>
            <p className="mt-1 font-display text-2xl font-bold tabular-nums text-emerald-700 dark:text-emerald-300">
              {data.stats.doneCount}
            </p>
            <p className="text-[11px] text-muted-foreground">Entregues na área</p>
          </div>

          <div className="rounded-xl border border-border bg-card p-3.5 shadow-xs">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Cursos &amp; Nota</p>
            <p className="mt-1 font-display text-2xl font-bold tabular-nums text-foreground">
              {data.stats.coursesCount}
              {data.stats.latestScore && (
                <span className="ml-2 font-mono text-sm font-semibold text-amber-600 dark:text-amber-300">
                  · {data.stats.latestScore.score.toFixed(1).replace('.', ',')}/10
                </span>
              )}
            </p>
            <p className="text-[11px] text-muted-foreground">
              {data.stats.latestScore
                ? `Nota mensal (${data.stats.latestScore.periodCode})`
                : `${data.recommendedSlots.length} slot(s) de cursos livres`}
            </p>
          </div>
        </div>

        {/* Navegação de Abas */}
        <div className="flex flex-wrap gap-2 pt-1" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'tasks'}
            onClick={() => setActiveTab('tasks')}
            className={cn(
              'inline-flex min-h-10 items-center gap-2 rounded-lg border px-4 py-2 text-xs sm:text-sm font-medium transition cursor-pointer',
              activeTab === 'tasks'
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border bg-card text-muted-foreground hover:text-foreground hover:bg-accent'
            )}
          >
            <ListChecks className="h-4 w-4" />
            <span>Passagem de Tarefas</span>
            <span className="rounded-full bg-background/20 px-1.5 py-0.2 font-mono text-[11px]">
              {data.tasks.filter((t) => t.status !== 'DONE').length}
            </span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'courses'}
            onClick={() => setActiveTab('courses')}
            className={cn(
              'inline-flex min-h-10 items-center gap-2 rounded-lg border px-4 py-2 text-xs sm:text-sm font-medium transition cursor-pointer',
              activeTab === 'courses'
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border bg-card text-muted-foreground hover:text-foreground hover:bg-accent'
            )}
          >
            <GraduationCap className="h-4 w-4" />
            <span>Cursos &amp; Trilhas da Área</span>
            <span className="rounded-full bg-background/20 px-1.5 py-0.2 font-mono text-[11px]">
              {data.courses.length}
            </span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'members'}
            onClick={() => setActiveTab('members')}
            className={cn(
              'inline-flex min-h-10 items-center gap-2 rounded-lg border px-4 py-2 text-xs sm:text-sm font-medium transition cursor-pointer',
              activeTab === 'members'
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border bg-card text-muted-foreground hover:text-foreground hover:bg-accent'
            )}
          >
            <Users className="h-4 w-4" />
            <span>Membros da Área</span>
            <span className="rounded-full bg-background/20 px-1.5 py-0.2 font-mono text-[11px]">
              {data.members.length}
            </span>
          </button>
        </div>
      </header>

      {/* ABA 1: PASSAGEM DE TAREFAS */}
      {activeTab === 'tasks' && (
        <section aria-label="Passagem de tarefas da área" className="space-y-5">
          {/* Barra de filtros */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-4 shadow-xs">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar tarefa, responsável ou nota de passagem..."
                className="min-h-10 w-full rounded-lg border border-input bg-background pl-9 pr-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <div className="flex flex-wrap gap-1.5">
              {(
                [
                  ['all', 'Todas'],
                  ['mine', 'Minhas tarefas'],
                  ['TODO', 'A fazer'],
                  ['IN_PROGRESS', 'Em andamento'],
                  ['REVIEW', 'Em passagem'],
                  ['DONE', 'Concluídas'],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setTaskFilter(key)}
                  className={cn(
                    'rounded-lg border px-3 py-1.5 text-xs font-medium transition cursor-pointer',
                    taskFilter === key
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border bg-background text-muted-foreground hover:text-foreground'
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Quadro de Passagem */}
          {filteredTasks.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-card/40 p-10 text-center space-y-3">
              <ClipboardList className="h-8 w-8 mx-auto text-muted-foreground" />
              <div className="space-y-1">
                <p className="font-semibold text-foreground">
                  Nenhuma tarefa encontrada neste filtro
                </p>
                <p className="text-xs sm:text-sm text-muted-foreground max-w-md mx-auto">
                  {data.canManageSelectedArea
                    ? 'Crie uma tarefa acima para passar demandas aos integrantes da área com prazo, prioridade e registro de entrega.'
                    : 'Quando a coordenação da área atribuir tarefas ou registrar entregas aqui, elas aparecerão neste quadro.'}
                </p>
              </div>
              {data.canManageSelectedArea && (
                <button
                  type="button"
                  onClick={openNewTaskModal}
                  className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 cursor-pointer"
                >
                  <Plus className="h-4 w-4" />
                  Criar primeira tarefa
                </button>
              )}
            </div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-4 items-start">
              {(['TODO', 'IN_PROGRESS', 'REVIEW', 'DONE'] as AreaTaskStatus[]).map((colStatus) => {
                const colTasks = filteredTasks.filter((t) => t.status === colStatus);
                const meta = STATUS_META[colStatus];
                return (
                  <div
                    key={colStatus}
                    className={cn(
                      'rounded-xl border bg-muted/20 p-3.5 space-y-3 min-h-[220px]',
                      meta.columnBorder
                    )}
                  >
                    <div className="flex items-center justify-between gap-2 pb-1 border-b border-border/60">
                      <span
                        className={cn(
                          'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold',
                          meta.badge
                        )}
                      >
                        {meta.label}
                      </span>
                      <span className="font-mono text-xs font-bold text-muted-foreground">
                        {colTasks.length}
                      </span>
                    </div>

                    <div className="space-y-3">
                      {colTasks.map((task) => {
                        const pri = PRIORITY_META[task.priority];
                        const isMine = task.assignments.some((a) => a.memberId === currentUserId);
                        return (
                          <article
                            key={task.id}
                            className={cn(
                              'rounded-xl border bg-card p-3.5 shadow-xs space-y-3',
                              isMine ? 'border-primary/40 ring-1 ring-primary/15' : 'border-border'
                            )}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <span
                                className={cn(
                                  'inline-flex rounded border px-1.5 py-0.5 text-[10px] font-semibold uppercase',
                                  pri.cls
                                )}
                              >
                                {pri.label}
                              </span>
                              <div className="flex items-center gap-1">
                                {task.dueDate && (
                                  <span className="inline-flex items-center gap-1 text-[11px] font-mono text-muted-foreground">
                                    <Calendar className="h-3 w-3" />
                                    {formatDateBr(task.dueDate)}
                                  </span>
                                )}
                                {task.canEditTask && (
                                  <button
                                    type="button"
                                    onClick={() => openEditTaskModal(task)}
                                    aria-label={`Editar tarefa ${task.title}`}
                                    className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground cursor-pointer"
                                  >
                                    <Pencil className="h-3.5 w-3.5" />
                                  </button>
                                )}
                              </div>
                            </div>

                            <div className="space-y-1">
                              <h3 className="text-sm font-semibold text-foreground leading-snug">
                                {task.title}
                              </h3>
                              {task.description && (
                                <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
                                  {task.description}
                                </p>
                              )}
                            </div>

                            {/* Responsáveis */}
                            <div className="flex flex-wrap gap-1.5">
                              {task.assignments.length > 0 ? (
                                task.assignments.map((a) => (
                                  <span
                                    key={a.id}
                                    className={cn(
                                      'inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium',
                                      a.memberId === currentUserId
                                        ? 'border-primary/40 bg-primary/10 text-primary'
                                        : 'border-border bg-muted/50 text-foreground'
                                    )}
                                  >
                                    {a.memberName.split(' ')[0]}
                                  </span>
                                ))
                              ) : (
                                <span className="text-[11px] italic text-muted-foreground">
                                  Toda a área / Sem responsável fixo
                                </span>
                              )}
                            </div>

                            {/* Links & Nota de passagem */}
                            {(task.referenceUrl || task.handoffNotes || task.deliveryUrl) && (
                              <div className="rounded-lg border border-border/70 bg-muted/30 p-2.5 space-y-1.5 text-xs">
                                {task.handoffNotes && (
                                  <p className="text-foreground/90 whitespace-pre-line leading-relaxed">
                                    <strong className="text-[11px] uppercase tracking-wider text-muted-foreground block mb-0.5">
                                      Nota de passagem:
                                    </strong>
                                    {task.handoffNotes}
                                  </p>
                                )}
                                <div className="flex flex-wrap gap-2">
                                  {task.referenceUrl && (
                                    <a
                                      href={task.referenceUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline"
                                    >
                                      <Link2 className="h-3 w-3" />
                                      Referência
                                    </a>
                                  )}
                                  {task.deliveryUrl && (
                                    <a
                                      href={task.deliveryUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 dark:text-emerald-300 hover:underline"
                                    >
                                      <ExternalLink className="h-3 w-3" />
                                      Entrega / PR / Doc
                                    </a>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Ações de transição / passagem */}
                            {task.canUpdateProgress && (
                              <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-border/60">
                                {task.status === 'TODO' && (
                                  <button
                                    type="button"
                                    disabled={busy}
                                    onClick={() => void quickMoveStatus(task, 'IN_PROGRESS')}
                                    className="rounded-md border border-sky-500/35 bg-sky-500/10 px-2.5 py-1 text-[11px] font-semibold text-sky-700 dark:text-sky-300 hover:bg-sky-500/20 cursor-pointer"
                                  >
                                    Iniciar
                                  </button>
                                )}
                                {task.status === 'IN_PROGRESS' && (
                                  <button
                                    type="button"
                                    disabled={busy}
                                    onClick={() =>
                                      setHandoffModal({
                                        task,
                                        status: 'REVIEW',
                                        handoffNotes: task.handoffNotes,
                                        deliveryUrl: task.deliveryUrl ?? '',
                                      })
                                    }
                                    className="inline-flex items-center gap-1 rounded-md border border-amber-500/35 bg-amber-500/15 px-2.5 py-1 text-[11px] font-semibold text-amber-800 dark:text-amber-300 hover:bg-amber-500/25 cursor-pointer"
                                  >
                                    <Send className="h-3 w-3" />
                                    Passar / Revisão
                                  </button>
                                )}
                                {task.status !== 'DONE' && (
                                  <button
                                    type="button"
                                    disabled={busy}
                                    onClick={() => void quickMoveStatus(task, 'DONE')}
                                    className="inline-flex items-center gap-1 rounded-md border border-emerald-500/35 bg-emerald-500/15 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/25 cursor-pointer"
                                  >
                                    <CheckCircle2 className="h-3 w-3" />
                                    Concluir
                                  </button>
                                )}
                                <button
                                  type="button"
                                  disabled={busy}
                                  onClick={() =>
                                    setHandoffModal({
                                      task,
                                      status: task.status,
                                      handoffNotes: task.handoffNotes,
                                      deliveryUrl: task.deliveryUrl ?? '',
                                    })
                                  }
                                  className="ml-auto rounded-md border border-border bg-background px-2 py-1 text-[11px] font-medium text-muted-foreground hover:text-foreground hover:bg-accent cursor-pointer"
                                >
                                  Passagem / Obs.
                                </button>
                              </div>
                            )}
                          </article>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* ABA 2: CURSOS & LUGARES PARA NOVOS CURSOS */}
      {activeTab === 'courses' && (
        <section aria-label="Cursos e espaços para novos cursos da área" className="space-y-8">
          {/* Cursos Ativos */}
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-lg font-semibold text-foreground">
                  Cursos &amp; Trilhas Ativas ({data.selectedScope.label})
                </h2>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Trilhas de capacitação disponíveis para os integrantes da área. Cursos adicionados aqui ficam também integrados ao módulo de Ensino.
                </p>
              </div>
              {data.canManageSelectedArea && (
                <button
                  type="button"
                  onClick={() => openNewCourseModal()}
                  className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 cursor-pointer"
                >
                  <Plus className="h-4 w-4" />
                  Adicionar Curso na Área
                </button>
              )}
            </div>

            {data.courses.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border bg-card/40 p-8 text-center text-sm text-muted-foreground">
                Esta área ainda não possui cursos publicados. Utilize os espaços estruturados abaixo para adicionar o primeiro curso!
              </div>
            ) : (
              <div className="grid gap-5 lg:grid-cols-2">
                {data.courses.map((course) => (
                  <article
                    key={course.id}
                    className="rounded-2xl border border-border bg-card p-5 shadow-xs flex flex-col justify-between gap-4"
                  >
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="space-y-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            {course.badge && (
                              <span className="rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-[10px] font-semibold text-primary">
                                {course.badge}
                              </span>
                            )}
                            <span className="rounded-full border border-border bg-muted/50 px-2 py-0.5 text-[10px] font-mono text-muted-foreground">
                              {course.level} · {course.durationHours}h
                            </span>
                            <span className="rounded-full border border-border bg-muted/50 px-2 py-0.5 text-[10px] font-mono text-muted-foreground">
                              {course.totalLessons} aula(s)
                            </span>
                          </div>
                          <h3 className="font-display text-lg font-semibold text-foreground">
                            {course.title}
                          </h3>
                          {course.subtitle && (
                            <p className="text-xs font-medium text-muted-foreground">
                              {course.subtitle}
                            </p>
                          )}
                        </div>

                        <div className="text-right shrink-0">
                          <span className="font-mono text-sm font-bold text-foreground">
                            {course.userProgressPct}%
                          </span>
                          <p className="text-[10px] text-muted-foreground">seu progresso</p>
                        </div>
                      </div>

                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {course.description}
                      </p>

                      {/* Barra de progresso */}
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-emerald-500 transition-all"
                          style={{ width: `${course.userProgressPct}%` }}
                        />
                      </div>

                      {/* Módulos e Aulas */}
                      {course.modules.length > 0 && (
                        <div className="space-y-2 rounded-xl border border-border/70 bg-muted/20 p-3">
                          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                            Estrutura do Curso ({course.modules.length} módulo(s))
                          </p>
                          <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                            {course.modules.map((mod) => (
                              <div key={mod.id} className="space-y-1">
                                <p className="text-xs font-semibold text-foreground">
                                  {mod.title}
                                </p>
                                {mod.lessons.length > 0 ? (
                                  <ul className="space-y-1 pl-2 border-l border-border">
                                    {mod.lessons.slice(0, 6).map((l) => (
                                      <li key={l.id}>
                                        <Link
                                          href={`/curso/${l.slug}`}
                                          className="flex items-center justify-between gap-2 text-xs text-muted-foreground hover:text-foreground py-0.5"
                                        >
                                          <span className="flex items-center gap-1.5 min-w-0 truncate">
                                            {l.youtubeVideoId ? (
                                              <Video className="h-3.5 w-3.5 text-purple-500 shrink-0" />
                                            ) : (
                                              <FileText className="h-3.5 w-3.5 text-sky-500 shrink-0" />
                                            )}
                                            <span className="truncate">{l.title}</span>
                                          </span>
                                          <ArrowRight className="h-3 w-3 shrink-0 opacity-60" />
                                        </Link>
                                      </li>
                                    ))}
                                    {mod.lessons.length > 6 && (
                                      <li className="text-[11px] italic text-muted-foreground pl-1">
                                        + {mod.lessons.length - 6} aula(s) neste módulo
                                      </li>
                                    )}
                                  </ul>
                                ) : (
                                  <p className="text-[11px] italic text-muted-foreground pl-2">
                                    Módulo aguardando primeiras aulas.
                                  </p>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border/60">
                      <div className="flex flex-wrap items-center gap-2">
                        {course.firstLessonSlug ? (
                          <Link
                            href={`/curso/${course.firstLessonSlug}`}
                            className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-primary px-3.5 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
                          >
                            <PlayCircle className="h-4 w-4" />
                            <span>{course.userProgressPct > 0 ? 'Continuar curso' : 'Abrir aulas'}</span>
                          </Link>
                        ) : course.externalUrl ? (
                          <a
                            href={course.externalUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-primary px-3.5 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
                          >
                            <ExternalLink className="h-4 w-4" />
                            <span>Abrir material externo</span>
                          </a>
                        ) : (
                          <span className="text-xs italic text-muted-foreground">
                            Adicione a primeira aula para liberar o player.
                          </span>
                        )}

                        {course.externalUrl && course.firstLessonSlug && (
                          <a
                            href={course.externalUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-2 text-xs font-medium text-foreground hover:bg-accent"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                            Material extra
                          </a>
                        )}
                      </div>

                      {course.canManageCourse && (
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => openAddLessonModal(course)}
                            className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-accent cursor-pointer"
                          >
                            <Plus className="h-3.5 w-3.5" />
                            Nova Aula
                          </button>
                          {course.slug !== 'ros2-jazzy' && (
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => void handleDeleteCourse(course.id, course.title)}
                              aria-label={`Excluir curso ${course.title}`}
                              className="inline-flex min-h-9 items-center justify-center rounded-lg border border-red-500/30 bg-red-500/10 px-2.5 py-1.5 text-xs font-medium text-red-700 dark:text-red-300 hover:bg-red-500/20 cursor-pointer"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>

          {/* Lugares para Novos Cursos (Slots Estruturados) */}
          <div className="space-y-4 pt-4 border-t border-border">
            <div>
              <h2 className="font-display text-lg font-semibold text-foreground flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-purple-500" />
                Lugares para Novos Cursos · Roadmap de {data.selectedScope.area}
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Espaços estruturados para futuras capacitações da área. Coordenadores e administradores podem preencher qualquer espaço abaixo ou criar um curso personalizado.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {data.recommendedSlots.map((slot) => (
                <article
                  key={slot.slotKey}
                  className="rounded-2xl border-2 border-dashed border-border bg-card/50 p-5 flex flex-col justify-between gap-4 hover:border-primary/40 transition-colors"
                >
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="rounded-full border border-purple-500/30 bg-purple-500/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-purple-700 dark:text-purple-300">
                        Espaço p/ Novo Curso
                      </span>
                      <span className="text-[11px] font-mono text-muted-foreground">
                        {slot.level} · {slot.durationHours}h
                      </span>
                    </div>
                    <h3 className="font-display text-base font-semibold text-foreground">
                      {slot.title}
                    </h3>
                    <p className="text-xs font-medium text-muted-foreground">{slot.subtitle}</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {slot.description}
                    </p>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {slot.suggestedModules.map((modName) => (
                        <span
                          key={modName}
                          className="rounded border border-border bg-muted/60 px-2 py-0.5 text-[10px] text-muted-foreground"
                        >
                          {modName}
                        </span>
                      ))}
                    </div>
                  </div>

                  {data.canManageSelectedArea ? (
                    <button
                      type="button"
                      onClick={() => openNewCourseModal(slot)}
                      className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-lg border border-primary/40 bg-primary/10 px-3 py-2 text-xs font-semibold text-primary hover:bg-primary/20 transition cursor-pointer"
                    >
                      <FolderPlus className="h-4 w-4" />
                      Estruturar Curso neste Espaço
                    </button>
                  ) : (
                    <p className="text-[11px] italic text-muted-foreground pt-1 border-t border-border/50">
                      Trilha planejada pela área · aguardando publicação da coordenação.
                    </p>
                  )}
                </article>
              ))}

              {/* Card genérico para sempre permitir adicionar novos cursos extras */}
              <article className="rounded-2xl border-2 border-dashed border-border bg-muted/15 p-5 flex flex-col justify-between gap-4">
                <div className="space-y-2">
                  <span className="inline-flex rounded-full border border-border bg-card px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Novo Espaço Livre
                  </span>
                  <h3 className="font-display text-base font-semibold text-foreground">
                    Outro Curso / Workshop da Área
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Crie uma trilha sob medida com módulos de vídeo (YouTube), apostilas em Markdown ou materiais externos específicos para a equipe.
                  </p>
                </div>

                {data.canManageSelectedArea ? (
                  <button
                    type="button"
                    onClick={() => openNewCourseModal()}
                    className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition cursor-pointer"
                  >
                    <Plus className="h-4 w-4" />
                    Criar Novo Curso
                  </button>
                ) : (
                  <p className="text-[11px] italic text-muted-foreground">
                    Apenas coordenadores da área e Administradores criam novos cursos.
                  </p>
                )}
              </article>
            </div>
          </div>
        </section>
      )}

      {/* ABA 3: MEMBROS DA ÁREA */}
      {activeTab === 'members' && (
        <section aria-label="Integrantes da área" className="space-y-4">
          {data.members.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-card/50 p-10 text-center text-sm text-muted-foreground">
              Nenhum integrante ativo encontrado nesta área/divisão.
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {data.members.map((m) => (
                <article
                  key={m.id}
                  className="rounded-xl border border-border bg-card p-4 shadow-xs flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-accent text-sm font-semibold text-foreground">
                      {m.avatar ? (
                        <img
                          src={m.avatar}
                          alt={m.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        m.name.slice(0, 2).toUpperCase()
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <h3 className="text-sm font-semibold text-foreground truncate">
                          {m.name}
                        </h3>
                        {m.isCoordinator && (
                          <span className="rounded-full border border-amber-500/35 bg-amber-500/15 px-2 py-0.2 text-[10px] font-semibold text-amber-800 dark:text-amber-300">
                            Coordenação
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{m.cargoLabel}</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="font-mono text-sm font-bold text-foreground">
                      {m.openTasksCount}
                    </span>
                    <p className="text-[10px] text-muted-foreground">tarefa(s)</p>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      )}

      {/* MODAL: CRIAR / EDITAR TAREFA */}
      {taskModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-display text-lg font-semibold text-foreground">
                  {taskModal.mode === 'create'
                    ? `Passar Nova Tarefa · ${data.selectedScope.label}`
                    : 'Editar Tarefa da Área'}
                </h2>
                <p className="text-xs text-muted-foreground">
                  Defina a demanda, prioridade, prazo e atribua aos responsáveis da área.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setTaskModal(null)}
                aria-label="Fechar modal"
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={submitTaskModal} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Título da tarefa *</label>
                <input
                  required
                  value={taskModal.title}
                  onChange={(e) => setTaskModal({ ...taskModal, title: e.target.value })}
                  placeholder="Ex.: Integrar nó de detecção de boias no ROS 2"
                  className="min-h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Descrição e critérios de entrega
                </label>
                <textarea
                  rows={3}
                  value={taskModal.description}
                  onChange={(e) => setTaskModal({ ...taskModal, description: e.target.value })}
                  placeholder="Contexto técnico, requisitos, branch ou pasta de trabalho..."
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Prioridade</label>
                  <select
                    value={taskModal.priority}
                    onChange={(e) =>
                      setTaskModal({ ...taskModal, priority: e.target.value as AreaTaskPriority })
                    }
                    className="min-h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground"
                  >
                    <option value="BAIXA">Baixa</option>
                    <option value="MEDIA">Média</option>
                    <option value="ALTA">Alta</option>
                    <option value="URGENTE">Urgente</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Prazo (opcional)</label>
                  <input
                    type="date"
                    value={taskModal.dueDate}
                    onChange={(e) => setTaskModal({ ...taskModal, dueDate: e.target.value })}
                    className="min-h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Link de referência (GitHub, Drive, Figma...)
                </label>
                <input
                  type="url"
                  value={taskModal.referenceUrl}
                  onChange={(e) => setTaskModal({ ...taskModal, referenceUrl: e.target.value })}
                  placeholder="https://..."
                  className="min-h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Atribuir a integrantes da área (opcional)
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-40 overflow-y-auto rounded-lg border border-border bg-muted/20 p-2.5">
                  {data.members.map((m) => {
                    const checked = taskModal.assigneeIds.includes(m.id);
                    return (
                      <label
                        key={m.id}
                        className={cn(
                          'flex items-center gap-2 rounded-md border p-2 text-xs cursor-pointer',
                          checked
                            ? 'border-primary/50 bg-primary/10 text-primary font-medium'
                            : 'border-border/60 bg-background text-foreground'
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            const next = e.target.checked
                              ? [...taskModal.assigneeIds, m.id]
                              : taskModal.assigneeIds.filter((id) => id !== m.id);
                            setTaskModal({ ...taskModal, assigneeIds: next });
                          }}
                          className="h-3.5 w-3.5 rounded accent-primary"
                        />
                        <span className="truncate">{m.name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-between gap-2 pt-2 border-t border-border">
                {taskModal.mode === 'edit' && taskModal.taskId ? (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void handleDeleteTask(taskModal.taskId!)}
                    className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-red-500/35 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-700 dark:text-red-300 hover:bg-red-500/20 cursor-pointer"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Excluir
                  </button>
                ) : (
                  <span />
                )}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setTaskModal(null)}
                    className="min-h-10 rounded-lg border border-border px-4 py-2 text-xs font-medium text-foreground hover:bg-accent cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={busy}
                    className="min-h-10 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 cursor-pointer"
                  >
                    {busy ? 'Salvando...' : taskModal.mode === 'create' ? 'Passar Tarefa' : 'Salvar Alterações'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: PASSAGEM DE TAREFA / REGISTRO DE ENTREGA */}
      {handoffModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-display text-lg font-semibold text-foreground">
                  Passagem &amp; Atualização da Tarefa
                </h2>
                <p className="text-xs text-muted-foreground">{handoffModal.task.title}</p>
              </div>
              <button
                type="button"
                onClick={() => setHandoffModal(null)}
                aria-label="Fechar modal"
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={submitHandoffModal} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Status atual</label>
                <select
                  value={handoffModal.status}
                  onChange={(e) =>
                    setHandoffModal({
                      ...handoffModal,
                      status: e.target.value as AreaTaskStatus,
                    })
                  }
                  className="min-h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground"
                >
                  <option value="TODO">A fazer</option>
                  <option value="IN_PROGRESS">Em andamento</option>
                  <option value="REVIEW">Revisão / Passagem para próximo responsável</option>
                  <option value="DONE">Concluída</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Notas de passagem (o que foi feito, próximos passos, bloqueios)
                </label>
                <textarea
                  rows={4}
                  value={handoffModal.handoffNotes}
                  onChange={(e) =>
                    setHandoffModal({ ...handoffModal, handoffNotes: e.target.value })
                  }
                  placeholder="Explique o andamento ou instruções para quem for assumir/revisar em seguida..."
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Link da entrega (PR, pasta no Drive, Onshape, KiCad...)
                </label>
                <input
                  type="url"
                  value={handoffModal.deliveryUrl}
                  onChange={(e) =>
                    setHandoffModal({ ...handoffModal, deliveryUrl: e.target.value })
                  }
                  placeholder="https://..."
                  className="min-h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setHandoffModal(null)}
                  className="min-h-10 rounded-lg border border-border px-4 py-2 text-xs font-medium text-foreground hover:bg-accent cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={busy}
                  className="min-h-10 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 cursor-pointer"
                >
                  {busy ? 'Salvando...' : 'Salvar Passagem'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CRIAR NOVO CURSO NA ÁREA */}
      {courseModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-display text-lg font-semibold text-foreground">
                  Novo Curso · {data.selectedScope.area}
                </h2>
                <p className="text-xs text-muted-foreground">
                  Crie um curso próprio da área para publicar vídeos, textos e links de capacitação.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCourseModal(null)}
                aria-label="Fechar modal"
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={submitCourseModal} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Título do curso *</label>
                <input
                  required
                  value={courseModal.title}
                  onChange={(e) => setCourseModal({ ...courseModal, title: e.target.value })}
                  placeholder="Ex.: Visão Computacional & SLAM com ROS 2"
                  className="min-h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Subtítulo</label>
                <input
                  value={courseModal.subtitle}
                  onChange={(e) => setCourseModal({ ...courseModal, subtitle: e.target.value })}
                  placeholder="Resumo curto dos tópicos abordados"
                  className="min-h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Descrição *</label>
                <textarea
                  required
                  rows={3}
                  value={courseModal.description}
                  onChange={(e) => setCourseModal({ ...courseModal, description: e.target.value })}
                  placeholder="O que o integrante vai aprender nesta trilha..."
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Nível</label>
                  <select
                    value={courseModal.level}
                    onChange={(e) => setCourseModal({ ...courseModal, level: e.target.value })}
                    className="min-h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground"
                  >
                    <option value="Iniciante">Iniciante</option>
                    <option value="Intermediário">Intermediário</option>
                    <option value="Avançado">Avançado</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Duração est. (horas)</label>
                  <input
                    type="number"
                    min="1"
                    max="200"
                    value={courseModal.durationHours}
                    onChange={(e) => setCourseModal({ ...courseModal, durationHours: e.target.value })}
                    className="min-h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground"
                  />
                </div>
              </div>

              {data.selectedScope.teamId !== null && (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Abrangência</label>
                  <select
                    value={courseModal.scopeMode}
                    onChange={(e) =>
                      setCourseModal({
                        ...courseModal,
                        scopeMode: e.target.value as 'division' | 'macro',
                      })
                    }
                    className="min-h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground"
                  >
                    <option value="division">Apenas {data.selectedScope.label}</option>
                    <option value="macro">
                      Toda a área de {data.selectedScope.area} (Harpia + Nautilus)
                    </option>
                  </select>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Nome do 1º módulo
                </label>
                <input
                  value={courseModal.initialModuleTitle}
                  onChange={(e) =>
                    setCourseModal({ ...courseModal, initialModuleTitle: e.target.value })
                  }
                  className="min-h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Link de material externo / playlist / Drive (opcional)
                </label>
                <input
                  type="url"
                  value={courseModal.externalUrl}
                  onChange={(e) => setCourseModal({ ...courseModal, externalUrl: e.target.value })}
                  placeholder="https://..."
                  className="min-h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setCourseModal(null)}
                  className="min-h-10 rounded-lg border border-border px-4 py-2 text-xs font-medium text-foreground hover:bg-accent cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={busy}
                  className="min-h-10 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 cursor-pointer"
                >
                  {busy ? 'Criando...' : 'Criar Curso'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADICIONAR AULA AO CURSO */}
      {lessonModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-display text-lg font-semibold text-foreground">
                  Adicionar Aula · {lessonModal.course.title}
                </h2>
                <p className="text-xs text-muted-foreground">
                  Adicione vídeos do YouTube, textos em Markdown e links de documentação.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setLessonModal(null)}
                aria-label="Fechar modal"
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={submitLessonModal} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Módulo</label>
                <select
                  value={lessonModal.moduleId}
                  onChange={(e) => setLessonModal({ ...lessonModal, moduleId: e.target.value })}
                  className="min-h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground"
                >
                  {lessonModal.course.modules.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.orderIndex}. {m.title}
                    </option>
                  ))}
                  <option value="__new__">+ Criar novo módulo</option>
                </select>
              </div>

              {lessonModal.moduleId === '__new__' && (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Nome do novo módulo *</label>
                  <input
                    required
                    value={lessonModal.newModuleTitle}
                    onChange={(e) =>
                      setLessonModal({ ...lessonModal, newModuleTitle: e.target.value })
                    }
                    placeholder="Ex.: Módulo 2 · Prática em Bancada"
                    className="min-h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground"
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Título da aula *</label>
                <input
                  required
                  value={lessonModal.title}
                  onChange={(e) => setLessonModal({ ...lessonModal, title: e.target.value })}
                  placeholder="Ex.: Regras de Roteamento de Alta Corrente"
                  className="min-h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Link ou ID do YouTube (opcional — se vazio, cria aula em texto)
                </label>
                <input
                  value={lessonModal.youtubeUrl}
                  onChange={(e) => setLessonModal({ ...lessonModal, youtubeUrl: e.target.value })}
                  placeholder="https://www.youtube.com/watch?v=... ou ID de 11 caracteres"
                  className="min-h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Resumo curto</label>
                <input
                  value={lessonModal.summary}
                  onChange={(e) => setLessonModal({ ...lessonModal, summary: e.target.value })}
                  placeholder="Objetivo principal desta aula"
                  className="min-h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Conteúdo / Apostila em Markdown
                </label>
                <textarea
                  rows={4}
                  value={lessonModal.textContent}
                  onChange={(e) => setLessonModal({ ...lessonModal, textContent: e.target.value })}
                  placeholder="# Guia da aula&#10;&#10;Passos, comandos e observações importantes..."
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm font-mono text-foreground"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Link de documentação / referência (opcional)
                </label>
                <input
                  type="url"
                  value={lessonModal.rosDocsUrl}
                  onChange={(e) => setLessonModal({ ...lessonModal, rosDocsUrl: e.target.value })}
                  placeholder="https://..."
                  className="min-h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setLessonModal(null)}
                  className="min-h-10 rounded-lg border border-border px-4 py-2 text-xs font-medium text-foreground hover:bg-accent cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={busy}
                  className="min-h-10 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 cursor-pointer"
                >
                  {busy ? 'Salvando...' : 'Adicionar Aula'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
