'use client';

import { useEffect, useMemo, useState } from 'react';
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
  Link2,
  Pencil,
  PlayCircle,
  Plus,
  Search,
  Send,
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
    label: 'Em revisão',
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
  tasksOnly = false,
}: {
  initialData: AreasWorkspaceDTO;
  currentUserId: string;
  initialTab?: ActiveTab;
  tasksOnly?: boolean;
}) {
  const [data, setData] = useState<AreasWorkspaceDTO>(initialData);
  const [loadingScope, setLoadingScope] = useState(false);
  const isMemberView = tasksOnly || initialData.workspaceMode === 'member';
  const [activeTab, setActiveTab] = useState<ActiveTab>(isMemberView ? 'tasks' : initialTab);
  const [taskView, setTaskView] = useState<'list' | 'board'>(isMemberView ? 'list' : 'board');
  const [taskFilter, setTaskFilter] = useState<'all' | 'mine' | 'overdue' | 'unassigned' | AreaTaskStatus>(isMemberView ? 'mine' : 'all');
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
  const openDialog = taskModal ? 'task' : handoffModal ? 'handoff' : courseModal ? 'course' : lessonModal ? 'lesson' : null;

  useEffect(() => {
    if (!openDialog) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    const dialog = document.querySelector<HTMLElement>('[role="dialog"]');
    if (!dialog) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const focusable = () => Array.from(dialog.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href]'));
    (dialog.querySelector<HTMLElement>('input, select, textarea') ?? focusable()[0])?.focus();
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setTaskModal(null); setHandoffModal(null); setCourseModal(null); setLessonModal(null);
      }
      if (event.key === 'Tab') {
        const elements = focusable();
        const first = elements[0]; const last = elements.at(-1);
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }
    }
    document.addEventListener('keydown', onKeyDown);
    return () => { document.removeEventListener('keydown', onKeyDown); document.body.style.overflow = previousOverflow; previousFocus?.focus(); };
  }, [openDialog]);

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
        taskFilter !== 'overdue' &&
        taskFilter !== 'unassigned' &&
        t.status !== taskFilter
      ) {
        return false;
      }
      if (taskFilter === 'overdue' && (t.status === 'DONE' || !t.dueDate || t.dueDate >= new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' }))) return false;
      if (taskFilter === 'unassigned' && (t.status === 'DONE' || t.assignments.length > 0)) return false;
      if (q) {
        const hay = `${t.title} ${t.description} ${t.handoffNotes} ${t.assignments.map((a) => a.memberName).join(' ')}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [data.tasks, taskFilter, search, currentUserId]);

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

  const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' });
  const overdueTasks = data.tasks.filter((task) => task.status !== 'DONE' && task.dueDate && task.dueDate < today);
  const unassignedTasks = data.tasks.filter((task) => task.status !== 'DONE' && task.assignments.length === 0);

  return (
    <div className="mx-auto w-full max-w-[1440px] min-w-0 px-4 py-8 sm:px-8 space-y-7">
      <header className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <h1 className="font-display text-2xl sm:text-3xl font-semibold tracking-tight">
              {isMemberView ? 'Tarefas' : data.workspaceMode === 'management' ? 'Áreas' : data.selectedScope.area}
            </h1>
            <p className="text-sm text-muted-foreground max-w-2xl">
              {isMemberView ? `Suas entregas, prazos e próximos passos.${data.userScopeKey ? ` ${data.selectedScope.label}.` : ''}` : `${data.selectedScope.label} · Acompanhe as entregas e organize o trabalho da equipe.`}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link href="/ensino" className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-border px-4 text-sm hover:bg-accent"><BookOpen className="h-4 w-4" />Ensino</Link>
            {!isMemberView && data.canManageSelectedArea && <button type="button" onClick={openNewTaskModal} className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90"><Plus className="h-4 w-4" />Nova tarefa</button>}
          </div>
        </div>
        {data.scopes.length > 1 && <div className="max-w-md space-y-2">
          <label htmlFor="workspace-scope" className="text-sm font-medium">{data.workspaceMode === 'management' && !isMemberView ? 'Área e divisão' : 'Divisão'}</label>
          <select id="workspace-scope" value={data.selectedScope.scopeKey} disabled={loadingScope} onChange={(event) => void reloadScope(event.target.value)} className="min-h-11 w-full rounded-lg border border-input bg-background px-3 text-sm">
            {data.scopes.map((scope) => <option key={scope.scopeKey} value={scope.scopeKey}>{scope.label}</option>)}
          </select>
          {loadingScope && <p role="status" className="text-sm text-muted-foreground">Carregando tarefas…</p>}
        </div>}
        {!isMemberView && <>
          <div className="flex flex-wrap gap-x-10 gap-y-4 border-y border-border py-5">
            {[[data.stats.totalMembers, 'integrantes'], [data.stats.inProgressCount, 'em andamento'], [data.stats.reviewCount, 'aguardando revisão'], [overdueTasks.length, 'com prazo vencido']].map(([count, label]) => <div key={label} className="flex items-baseline gap-2"><span className="text-2xl font-semibold tabular-nums">{count}</span><span className="text-sm text-muted-foreground">{label}</span></div>)}
          </div>
          {(overdueTasks.length > 0 || unassignedTasks.length > 0) && <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
            <span className="font-medium">Precisa de atenção</span>
            {overdueTasks.length > 0 && <button type="button" onClick={() => { setActiveTab('tasks'); setTaskFilter('overdue'); setSearch(''); }} className="min-h-11 text-amber-800 dark:text-amber-300 hover:underline underline-offset-4">{overdueTasks.length} tarefa(s) com prazo vencido <ArrowRight className="inline h-3.5 w-3.5" /></button>}
            {unassignedTasks.length > 0 && <button type="button" onClick={() => { setActiveTab('tasks'); setTaskFilter('unassigned'); setSearch(''); }} className="min-h-11 hover:underline underline-offset-4">{unassignedTasks.length} tarefa(s) sem responsável <ArrowRight className="inline h-3.5 w-3.5" /></button>}
          </div>}
          <nav aria-label="Conteúdo da área" className="flex gap-5 border-b border-border overflow-x-auto">
            {([['tasks', 'Tarefas', data.tasks.length], ['members', 'Equipe', data.members.length], ['courses', 'Formação', data.courses.length]] as const).map(([tab, label, count]) => <button key={tab} type="button" aria-current={activeTab === tab ? 'page' : undefined} onClick={() => setActiveTab(tab)} className={cn('min-h-11 shrink-0 border-b-2 px-1 text-sm transition-colors', activeTab === tab ? 'border-primary font-semibold text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground')}>{label} <span className="ml-1 tabular-nums text-muted-foreground">{count}</span></button>)}
          </nav>
        </>}
      </header>

      {!isMemberView && !data.userScopeKey && data.workspaceMode === 'coordinator' && <p className="rounded-lg bg-muted p-4 text-sm">Seu vínculo com uma área ainda não foi definido. <Link href="/perfil" className="underline underline-offset-4">Confira seu perfil</Link> ou fale com a gestão.</p>}
      {/* ABA 1: PASSAGEM DE TAREFAS */}
      {activeTab === 'tasks' && (
        <section aria-label="Tarefas" aria-busy={loadingScope} className="space-y-5">
          {/* Barra de filtros */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-4 shadow-xs">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                aria-label="Buscar tarefas"
                placeholder="Buscar tarefa ou responsável…"
                className="min-h-11 w-full rounded-lg border border-input bg-background pl-9 pr-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <div className="flex flex-wrap gap-1.5">
              {(
                [
                  ['all', 'Todas'],
                  ['mine', 'Minhas tarefas'],
                  ['TODO', 'A fazer'],
                  ['IN_PROGRESS', 'Em andamento'],
                  ['REVIEW', 'Em revisão'],
                  ['DONE', 'Concluídas'],
                  ...(taskFilter === 'overdue' ? [['overdue', 'Prazo vencido'] as const] : []),
                  ...(taskFilter === 'unassigned' ? [['unassigned', 'Sem responsável'] as const] : []),
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setTaskFilter(key)}
                  className={cn(
                    'min-h-10 rounded-lg border px-3 py-1.5 text-xs font-medium transition cursor-pointer',
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

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground" role="status">{filteredTasks.length} tarefa(s) {taskFilter === 'mine' ? 'atribuída(s) a você' : 'encontrada(s)'}</p>
            <div className="flex gap-1" aria-label="Visualização de tarefas">{(['list', 'board'] as const).map((view) => <button key={view} type="button" aria-pressed={taskView === view} onClick={() => setTaskView(view)} className={cn('min-h-11 rounded-lg px-3 text-sm', taskView === view ? 'bg-accent font-semibold' : 'text-muted-foreground hover:bg-accent')}>{view === 'list' ? 'Lista' : 'Quadro'}</button>)}</div>
          </div>
          {/* Quadro de Passagem */}
          {loadingScope ? <p role="status" className="py-12 text-center text-muted-foreground">Carregando tarefas…</p> : filteredTasks.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-card/40 p-10 text-center space-y-3">
              <ClipboardList className="h-8 w-8 mx-auto text-muted-foreground" />
              <div className="space-y-1">
                <p className="font-semibold text-foreground">
                  Nenhuma tarefa por aqui
                </p>
                <p className="text-xs sm:text-sm text-muted-foreground max-w-md mx-auto">
                  {data.canManageSelectedArea
                    ? 'Crie uma tarefa acima para passar demandas aos integrantes da área com prazo, prioridade e registro de entrega.'
                    : 'As tarefas atribuídas a você aparecerão aqui. Se quiser acompanhar a equipe, selecione Todas.'}
                </p>
              </div>
              {data.canManageSelectedArea && (
                <button
                  type="button"
                  onClick={openNewTaskModal}
                  className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 cursor-pointer"
                >
                  <Plus className="h-4 w-4" />
                  Criar primeira tarefa
                </button>
              )}
            </div>
          ) : taskView === 'list' ? (
            <div className="divide-y divide-border border-y border-border">
              {filteredTasks.map((task) => {
                const overdue = task.status !== 'DONE' && task.dueDate && task.dueDate < today;
                return <article key={task.id} className="grid gap-4 py-5 md:grid-cols-[minmax(0,1fr)_180px_160px] md:items-center">
                  <div className="min-w-0 space-y-2">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className={cn('rounded-md border px-2 py-1', STATUS_META[task.status].badge)}>{STATUS_META[task.status].label}</span>
                      {(task.priority === 'ALTA' || task.priority === 'URGENTE') && <span className={PRIORITY_META[task.priority].cls}>{PRIORITY_META[task.priority].label}</span>}
                    </div>
                    <h3 className="font-semibold text-sm">{task.title}</h3>
                    {task.description && <p className="max-w-prose line-clamp-2 text-sm leading-relaxed text-muted-foreground">{task.description}</p>}
                    <div className="flex flex-wrap gap-4 text-xs">
                      {task.referenceUrl && <a href={task.referenceUrl} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-8 items-center gap-1 hover:underline"><Link2 className="h-3.5 w-3.5" />Referência</a>}
                      {task.deliveryUrl && <a href={task.deliveryUrl} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-8 items-center gap-1 hover:underline"><ExternalLink className="h-3.5 w-3.5" />Ver entrega</a>}
                    </div>
                  </div>
                  <div className="space-y-1 text-xs text-muted-foreground">
                    <p className="text-foreground">{task.assignments.map((assignment) => assignment.memberName).join(', ') || 'Sem responsável definido'}</p>
                    <p className={cn(overdue && 'text-red-700 dark:text-red-300')}>{task.dueDate ? `${overdue ? 'Prazo vencido · ' : 'Prazo: '}${formatDateBr(task.dueDate)}` : 'Sem prazo definido'}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 md:justify-end">
                    {task.canEditTask && <button type="button" aria-label={`Editar tarefa ${task.title}`} onClick={() => openEditTaskModal(task)} className="min-h-11 min-w-11 rounded-lg border border-border p-3 hover:bg-accent"><Pencil className="h-4 w-4" /></button>}
                    {task.canUpdateProgress && <button type="button" disabled={busy} onClick={() => task.status === 'TODO' ? void quickMoveStatus(task, 'IN_PROGRESS') : setHandoffModal({ task, status: task.status, handoffNotes: task.handoffNotes, deliveryUrl: task.deliveryUrl ?? '' })} className="min-h-11 rounded-lg border border-border px-3 text-xs font-semibold hover:bg-accent disabled:opacity-50">{task.status === 'TODO' ? 'Iniciar tarefa' : 'Atualizar entrega'}</button>}
                  </div>
                </article>;
              })}
            </div>
          ) : (
            <div className="grid gap-4 items-start lg:grid-cols-2 xl:grid-cols-4">
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
                      {colTasks.length === 0 && <p className="py-5 text-center text-xs text-muted-foreground">Nenhuma tarefa nesta etapa.</p>}
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
                                    className="inline-flex min-h-9 items-center gap-1 rounded-md border border-amber-500/35 bg-amber-500/15 px-2.5 py-1 text-[11px] font-semibold text-amber-800 dark:text-amber-300 hover:bg-amber-500/25 cursor-pointer"
                                  >
                                    <Send className="h-3 w-3" />
                                    Enviar para revisão
                                  </button>
                                )}
                                {task.status !== 'DONE' && (
                                  <button
                                    type="button"
                                    disabled={busy}
                                    onClick={() => void quickMoveStatus(task, 'DONE')}
                                    className="inline-flex min-h-9 items-center gap-1 rounded-md border border-emerald-500/35 bg-emerald-500/15 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/25 cursor-pointer"
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
                                  className="ml-auto min-h-9 rounded-md border border-border bg-background px-2 py-1 text-[11px] font-medium text-muted-foreground hover:text-foreground hover:bg-accent cursor-pointer"
                                >
                                  Atualizar entrega
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
      {!isMemberView && activeTab === 'courses' && (
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
                  className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 cursor-pointer"
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
                            className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-primary px-3.5 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
                          >
                            <PlayCircle className="h-4 w-4" />
                            <span>{course.userProgressPct > 0 ? 'Continuar curso' : 'Abrir aulas'}</span>
                          </Link>
                        ) : course.externalUrl ? (
                          <a
                            href={course.externalUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-primary px-3.5 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
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
                            className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-2 text-xs font-medium text-foreground hover:bg-accent"
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
                      className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-primary/40 bg-primary/10 px-3 py-2 text-xs font-semibold text-primary hover:bg-primary/20 transition cursor-pointer"
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
                    className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition cursor-pointer"
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
      {!isMemberView && activeTab === 'members' && (
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
                    <p className="text-xs text-muted-foreground">tarefa(s) em aberto</p>
                    <button type="button" onClick={() => { setActiveTab('tasks'); setTaskFilter('all'); setSearch(m.name); }} className="min-h-11 text-xs font-medium hover:underline underline-offset-4">Ver tarefas <ArrowRight className="inline h-3 w-3" /></button>
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
          aria-labelledby="task-dialog-title"
        >
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 id="task-dialog-title" className="font-display text-lg font-semibold text-foreground">
                  {taskModal.mode === 'create'
                    ? `Nova tarefa · ${data.selectedScope.label}`
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
                <label htmlFor="area-field-2" className="text-xs font-semibold text-foreground">Título da tarefa *</label>
                <input id="area-field-2"
                  required
                  value={taskModal.title}
                  onChange={(e) => setTaskModal({ ...taskModal, title: e.target.value })}
                  placeholder="Ex.: Integrar nó de detecção de boias no ROS 2"
                  className="min-h-11 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="area-field-3" className="text-xs font-semibold text-foreground">
                  Descrição e critérios de entrega
                </label>
                <textarea id="area-field-3"
                  rows={3}
                  value={taskModal.description}
                  onChange={(e) => setTaskModal({ ...taskModal, description: e.target.value })}
                  placeholder="Contexto técnico, requisitos, branch ou pasta de trabalho..."
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label htmlFor="area-field-4" className="text-xs font-semibold text-foreground">Prioridade</label>
                  <select id="area-field-4"
                    value={taskModal.priority}
                    onChange={(e) =>
                      setTaskModal({ ...taskModal, priority: e.target.value as AreaTaskPriority })
                    }
                    className="min-h-11 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground"
                  >
                    <option value="BAIXA">Baixa</option>
                    <option value="MEDIA">Média</option>
                    <option value="ALTA">Alta</option>
                    <option value="URGENTE">Urgente</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="area-field-5" className="text-xs font-semibold text-foreground">Prazo (opcional)</label>
                  <input id="area-field-5"
                    type="date"
                    value={taskModal.dueDate}
                    onChange={(e) => setTaskModal({ ...taskModal, dueDate: e.target.value })}
                    className="min-h-11 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="area-field-6" className="text-xs font-semibold text-foreground">
                  Link de referência (GitHub, Drive, Figma...)
                </label>
                <input id="area-field-6"
                  type="url"
                  value={taskModal.referenceUrl}
                  onChange={(e) => setTaskModal({ ...taskModal, referenceUrl: e.target.value })}
                  placeholder="https://..."
                  className="min-h-11 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground"
                />
              </div>

              <div className="space-y-1.5">
                <p className="text-xs font-semibold text-foreground">
                  Atribuir a integrantes da área (opcional)
                </p>
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
                    className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-red-500/35 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-700 dark:text-red-300 hover:bg-red-500/20 cursor-pointer"
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
                    className="min-h-11 rounded-lg border border-border px-4 py-2 text-xs font-medium text-foreground hover:bg-accent cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={busy}
                    className="min-h-11 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 cursor-pointer"
                  >
                    {busy ? 'Salvando...' : taskModal.mode === 'create' ? 'Criar tarefa' : 'Salvar Alterações'}
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
          aria-labelledby="handoff-dialog-title"
        >
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 id="handoff-dialog-title" className="font-display text-lg font-semibold text-foreground">
                  Atualizar entrega
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
                <label htmlFor="area-field-7" className="text-xs font-semibold text-foreground">Status atual</label>
                <select id="area-field-7"
                  value={handoffModal.status}
                  onChange={(e) =>
                    setHandoffModal({
                      ...handoffModal,
                      status: e.target.value as AreaTaskStatus,
                    })
                  }
                  className="min-h-11 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground"
                >
                  <option value="TODO">A fazer</option>
                  <option value="IN_PROGRESS">Em andamento</option>
                  <option value="REVIEW">Revisão / Passagem para próximo responsável</option>
                  <option value="DONE">Concluída</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="area-field-8" className="text-xs font-semibold text-foreground">
                  Notas de passagem (o que foi feito, próximos passos, bloqueios)
                </label>
                <textarea id="area-field-8"
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
                <label htmlFor="area-field-9" className="text-xs font-semibold text-foreground">
                  Link da entrega (PR, pasta no Drive, Onshape, KiCad...)
                </label>
                <input id="area-field-9"
                  type="url"
                  value={handoffModal.deliveryUrl}
                  onChange={(e) =>
                    setHandoffModal({ ...handoffModal, deliveryUrl: e.target.value })
                  }
                  placeholder="https://..."
                  className="min-h-11 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setHandoffModal(null)}
                  className="min-h-11 rounded-lg border border-border px-4 py-2 text-xs font-medium text-foreground hover:bg-accent cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={busy}
                  className="min-h-11 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 cursor-pointer"
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
          aria-labelledby="course-dialog-title"
        >
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 id="course-dialog-title" className="font-display text-lg font-semibold text-foreground">
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
                <label htmlFor="area-field-10" className="text-xs font-semibold text-foreground">Título do curso *</label>
                <input id="area-field-10"
                  required
                  value={courseModal.title}
                  onChange={(e) => setCourseModal({ ...courseModal, title: e.target.value })}
                  placeholder="Ex.: Visão Computacional & SLAM com ROS 2"
                  className="min-h-11 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="area-field-11" className="text-xs font-semibold text-foreground">Subtítulo</label>
                <input id="area-field-11"
                  value={courseModal.subtitle}
                  onChange={(e) => setCourseModal({ ...courseModal, subtitle: e.target.value })}
                  placeholder="Resumo curto dos tópicos abordados"
                  className="min-h-11 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="area-field-12" className="text-xs font-semibold text-foreground">Descrição *</label>
                <textarea id="area-field-12"
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
                  <label htmlFor="area-field-13" className="text-xs font-semibold text-foreground">Nível</label>
                  <select id="area-field-13"
                    value={courseModal.level}
                    onChange={(e) => setCourseModal({ ...courseModal, level: e.target.value })}
                    className="min-h-11 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground"
                  >
                    <option value="Iniciante">Iniciante</option>
                    <option value="Intermediário">Intermediário</option>
                    <option value="Avançado">Avançado</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="area-field-14" className="text-xs font-semibold text-foreground">Duração est. (horas)</label>
                  <input id="area-field-14"
                    type="number"
                    min="1"
                    max="200"
                    value={courseModal.durationHours}
                    onChange={(e) => setCourseModal({ ...courseModal, durationHours: e.target.value })}
                    className="min-h-11 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground"
                  />
                </div>
              </div>

              {data.selectedScope.teamId !== null && (
                <div className="space-y-1.5">
                  <label htmlFor="area-field-15" className="text-xs font-semibold text-foreground">Abrangência</label>
                  <select id="area-field-15"
                    value={courseModal.scopeMode}
                    onChange={(e) =>
                      setCourseModal({
                        ...courseModal,
                        scopeMode: e.target.value as 'division' | 'macro',
                      })
                    }
                    className="min-h-11 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground"
                  >
                    <option value="division">Apenas {data.selectedScope.label}</option>
                    <option value="macro">
                      Toda a área de {data.selectedScope.area} (Harpia + Nautilus)
                    </option>
                  </select>
                </div>
              )}

              <div className="space-y-1.5">
                <label htmlFor="area-field-16" className="text-xs font-semibold text-foreground">
                  Nome do 1º módulo
                </label>
                <input id="area-field-16"
                  value={courseModal.initialModuleTitle}
                  onChange={(e) =>
                    setCourseModal({ ...courseModal, initialModuleTitle: e.target.value })
                  }
                  className="min-h-11 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="area-field-17" className="text-xs font-semibold text-foreground">
                  Link de material externo / playlist / Drive (opcional)
                </label>
                <input id="area-field-17"
                  type="url"
                  value={courseModal.externalUrl}
                  onChange={(e) => setCourseModal({ ...courseModal, externalUrl: e.target.value })}
                  placeholder="https://..."
                  className="min-h-11 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setCourseModal(null)}
                  className="min-h-11 rounded-lg border border-border px-4 py-2 text-xs font-medium text-foreground hover:bg-accent cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={busy}
                  className="min-h-11 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 cursor-pointer"
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
          aria-labelledby="lesson-dialog-title"
        >
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 id="lesson-dialog-title" className="font-display text-lg font-semibold text-foreground">
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
                <label htmlFor="area-field-18" className="text-xs font-semibold text-foreground">Módulo</label>
                <select id="area-field-18"
                  value={lessonModal.moduleId}
                  onChange={(e) => setLessonModal({ ...lessonModal, moduleId: e.target.value })}
                  className="min-h-11 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground"
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
                  <label htmlFor="area-field-19" className="text-xs font-semibold text-foreground">Nome do novo módulo *</label>
                  <input id="area-field-19"
                    required
                    value={lessonModal.newModuleTitle}
                    onChange={(e) =>
                      setLessonModal({ ...lessonModal, newModuleTitle: e.target.value })
                    }
                    placeholder="Ex.: Módulo 2 · Prática em Bancada"
                    className="min-h-11 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground"
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <label htmlFor="area-field-20" className="text-xs font-semibold text-foreground">Título da aula *</label>
                <input id="area-field-20"
                  required
                  value={lessonModal.title}
                  onChange={(e) => setLessonModal({ ...lessonModal, title: e.target.value })}
                  placeholder="Ex.: Regras de Roteamento de Alta Corrente"
                  className="min-h-11 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="area-field-21" className="text-xs font-semibold text-foreground">
                  Link ou ID do YouTube (opcional — se vazio, cria aula em texto)
                </label>
                <input id="area-field-21"
                  value={lessonModal.youtubeUrl}
                  onChange={(e) => setLessonModal({ ...lessonModal, youtubeUrl: e.target.value })}
                  placeholder="https://www.youtube.com/watch?v=... ou ID de 11 caracteres"
                  className="min-h-11 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="area-field-22" className="text-xs font-semibold text-foreground">Resumo curto</label>
                <input id="area-field-22"
                  value={lessonModal.summary}
                  onChange={(e) => setLessonModal({ ...lessonModal, summary: e.target.value })}
                  placeholder="Objetivo principal desta aula"
                  className="min-h-11 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="area-field-23" className="text-xs font-semibold text-foreground">
                  Conteúdo / Apostila em Markdown
                </label>
                <textarea id="area-field-23"
                  rows={4}
                  value={lessonModal.textContent}
                  onChange={(e) => setLessonModal({ ...lessonModal, textContent: e.target.value })}
                  placeholder="# Guia da aula&#10;&#10;Passos, comandos e observações importantes..."
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm font-mono text-foreground"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="area-field-24" className="text-xs font-semibold text-foreground">
                  Link de documentação / referência (opcional)
                </label>
                <input id="area-field-24"
                  type="url"
                  value={lessonModal.rosDocsUrl}
                  onChange={(e) => setLessonModal({ ...lessonModal, rosDocsUrl: e.target.value })}
                  placeholder="https://..."
                  className="min-h-11 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setLessonModal(null)}
                  className="min-h-11 rounded-lg border border-border px-4 py-2 text-xs font-medium text-foreground hover:bg-accent cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={busy}
                  className="min-h-11 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 cursor-pointer"
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
