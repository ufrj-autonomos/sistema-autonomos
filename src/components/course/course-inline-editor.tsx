'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/institutional/ui/dialog';

export interface EditableCourseInfo {
  id: string;
  title: string;
  subtitle: string | null;
  description: string;
  level: string;
  durationHours: number;
  published: boolean;
  externalUrl: string | null;
}

export interface EditableLessonInfo {
  id: string;
  title: string;
  lessonType: 'VIDEO' | 'TEXT' | string;
  youtubeVideoId: string | null;
  summary: string | null;
  textContent: string | null;
  rosDocsUrl?: string | null;
}

export interface EditableModuleOption {
  id: string;
  title: string;
}

const inputCls =
  'mt-1.5 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-2 focus-visible:outline-ring';
const btnSecondary =
  'inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition-colors cursor-pointer disabled:opacity-50';
const btnPrimary =
  'inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-primary px-3.5 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors cursor-pointer disabled:opacity-50';

export function LessonEditButton({
  lesson,
  compact = false,
}: {
  lesson: EditableLessonInfo;
  compact?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(lesson.title);
  const [lessonType, setLessonType] = useState<'VIDEO' | 'TEXT'>(
    lesson.lessonType === 'TEXT' || lesson.lessonType === 'text' ? 'TEXT' : 'VIDEO'
  );
  const [youtubeUrl, setYoutubeUrl] = useState(lesson.youtubeVideoId || '');
  const [summary, setSummary] = useState(lesson.summary || '');
  const [textContent, setTextContent] = useState(lesson.textContent || '');
  const [rosDocsUrl, setRosDocsUrl] = useState(lesson.rosDocsUrl || '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  function openDialog() {
    setTitle(lesson.title);
    setLessonType(lesson.lessonType === 'TEXT' || lesson.lessonType === 'text' ? 'TEXT' : 'VIDEO');
    setYoutubeUrl(lesson.youtubeVideoId || '');
    setSummary(lesson.summary || '');
    setTextContent(lesson.textContent || '');
    setRosDocsUrl(lesson.rosDocsUrl || '');
    setError('');
    setOpen(true);
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      const res = await fetch(`/api/lessons/${encodeURIComponent(lesson.id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          lessonType,
          youtubeUrl,
          summary,
          textContent,
          rosDocsUrl,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || 'Erro ao salvar aula.');
      setOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar aula.');
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (busy) return;
    if (!window.confirm(`Remover a aula "${lesson.title}"?`)) return;
    setBusy(true);
    setError('');
    try {
      const res = await fetch(`/api/lessons/${encodeURIComponent(lesson.id)}`, {
        method: 'DELETE',
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || 'Erro ao remover aula.');
      setOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao remover aula.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={openDialog}
        className={btnSecondary}
        title="Editar aula"
      >
        <Pencil className="h-3.5 w-3.5" />
        {!compact && <span>Editar aula</span>}
      </button>

      <Dialog open={open} onOpenChange={(v) => !busy && setOpen(v)}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-xl">
          <form onSubmit={handleSave} className="space-y-4">
            <DialogHeader>
              <DialogTitle>Editar aula</DialogTitle>
              <DialogDescription>
                Atualize título, vídeo do YouTube, resumo ou conteúdo em Markdown desta aula.
              </DialogDescription>
            </DialogHeader>

            <label className="block text-sm font-medium">
              Título da aula
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className={inputCls}
              />
            </label>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm font-medium">
                Tipo
                <select
                  value={lessonType}
                  onChange={(e) => setLessonType(e.target.value === 'TEXT' ? 'TEXT' : 'VIDEO')}
                  className={inputCls}
                >
                  <option value="VIDEO">Vídeo (YouTube)</option>
                  <option value="TEXT">Texto / Leitura</option>
                </select>
              </label>

              {lessonType === 'VIDEO' && (
                <label className="block text-sm font-medium">
                  Link ou ID do YouTube
                  <input
                    type="text"
                    value={youtubeUrl}
                    onChange={(e) => setYoutubeUrl(e.target.value)}
                    placeholder="https://youtu.be/... ou ID"
                    className={inputCls}
                  />
                </label>
              )}
            </div>

            <label className="block text-sm font-medium">
              Resumo curto
              <input
                type="text"
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                className={inputCls}
              />
            </label>

            <label className="block text-sm font-medium">
              Link de documentação / referência (opcional)
              <input
                type="url"
                value={rosDocsUrl}
                onChange={(e) => setRosDocsUrl(e.target.value)}
                placeholder="https://docs.ros.org/..."
                className={inputCls}
              />
            </label>

            <label className="block text-sm font-medium">
              Conteúdo / Notas da aula (Markdown)
              <textarea
                rows={6}
                value={textContent}
                onChange={(e) => setTextContent(e.target.value)}
                className={`${inputCls} font-mono text-xs`}
              />
            </label>

            {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

            <DialogFooter className="flex-wrap justify-between gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={handleDelete}
                className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-red-500/40 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-500/10 dark:text-red-400 cursor-pointer"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Excluir aula
              </button>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setOpen(false)}
                  className={btnSecondary}
                >
                  Cancelar
                </button>
                <button type="submit" disabled={busy} className={btnPrimary}>
                  {busy ? 'Salvando…' : 'Salvar alterações'}
                </button>
              </div>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function CourseEditorToolbar({
  course,
  modules,
}: {
  course: EditableCourseInfo;
  modules: EditableModuleOption[];
}) {
  const router = useRouter();
  const [editCourseOpen, setEditCourseOpen] = useState(false);
  const [addLessonOpen, setAddLessonOpen] = useState(false);

  const [title, setTitle] = useState(course.title);
  const [subtitle, setSubtitle] = useState(course.subtitle || '');
  const [description, setDescription] = useState(course.description);
  const [level, setLevel] = useState(course.level);
  const [durationHours, setDurationHours] = useState(String(course.durationHours));
  const [externalUrl, setExternalUrl] = useState(course.externalUrl || '');
  const [published, setPublished] = useState(course.published);

  const [moduleId, setModuleId] = useState(modules[0]?.id || '');
  const [newModuleTitle, setNewModuleTitle] = useState('');
  const [lessonTitle, setLessonTitle] = useState('');
  const [lessonType, setLessonType] = useState<'VIDEO' | 'TEXT'>('VIDEO');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [lessonSummary, setLessonSummary] = useState('');
  const [lessonContent, setLessonContent] = useState('');

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function saveCourse(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      const res = await fetch(`/api/courses/${encodeURIComponent(course.id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          subtitle,
          description,
          level,
          durationHours: Number(durationHours) || 0,
          externalUrl,
          published,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || 'Erro ao atualizar curso.');
      setEditCourseOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao atualizar curso.');
    } finally {
      setBusy(false);
    }
  }

  async function addLesson(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      const res = await fetch(`/api/courses/${encodeURIComponent(course.id)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          moduleId: newModuleTitle.trim() ? '' : moduleId,
          newModuleTitle,
          title: lessonTitle,
          lessonType,
          youtubeUrl,
          summary: lessonSummary,
          textContent: lessonContent,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || 'Erro ao adicionar aula.');
      setAddLessonOpen(false);
      setLessonTitle('');
      setYoutubeUrl('');
      setLessonSummary('');
      setLessonContent('');
      setNewModuleTitle('');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao adicionar aula.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-primary/25 bg-primary/5 px-4 py-3">
        <span className="text-xs font-semibold text-primary mr-auto">
          Modo de edição do curso (Coordenação / Gestão / Admin)
        </span>
        <button
          type="button"
          onClick={() => {
            setError('');
            setEditCourseOpen(true);
          }}
          className={btnSecondary}
        >
          <Pencil className="h-3.5 w-3.5" />
          Editar curso
        </button>
        <button
          type="button"
          onClick={() => {
            setError('');
            setAddLessonOpen(true);
          }}
          className={btnPrimary}
        >
          <Plus className="h-3.5 w-3.5" />
          Adicionar aula
        </button>
      </div>

      <Dialog open={editCourseOpen} onOpenChange={(v) => !busy && setEditCourseOpen(v)}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-xl">
          <form onSubmit={saveCourse} className="space-y-4">
            <DialogHeader>
              <DialogTitle>Editar informações do curso</DialogTitle>
            </DialogHeader>
            <label className="block text-sm font-medium">
              Título
              <input type="text" required value={title} onChange={(e) => setTitle(e.target.value)} className={inputCls} />
            </label>
            <label className="block text-sm font-medium">
              Subtítulo
              <input type="text" value={subtitle} onChange={(e) => setSubtitle(e.target.value)} className={inputCls} />
            </label>
            <label className="block text-sm font-medium">
              Descrição
              <textarea rows={3} required value={description} onChange={(e) => setDescription(e.target.value)} className={inputCls} />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm font-medium">
                Nível
                <input type="text" value={level} onChange={(e) => setLevel(e.target.value)} className={inputCls} />
              </label>
              <label className="block text-sm font-medium">
                Carga horária (h)
                <input type="number" step="0.5" value={durationHours} onChange={(e) => setDurationHours(e.target.value)} className={inputCls} />
              </label>
            </div>
            <label className="block text-sm font-medium">
              Link externo (opcional)
              <input type="url" value={externalUrl} onChange={(e) => setExternalUrl(e.target.value)} className={inputCls} />
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={published} onChange={(e) => setPublished(e.target.checked)} />
              Publicado no catálogo
            </label>
            {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
            <DialogFooter>
              <button type="button" disabled={busy} onClick={() => setEditCourseOpen(false)} className={btnSecondary}>Cancelar</button>
              <button type="submit" disabled={busy} className={btnPrimary}>{busy ? 'Salvando…' : 'Salvar curso'}</button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={addLessonOpen} onOpenChange={(v) => !busy && setAddLessonOpen(v)}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-xl">
          <form onSubmit={addLesson} className="space-y-4">
            <DialogHeader>
              <DialogTitle>Adicionar aula ao curso</DialogTitle>
            </DialogHeader>
            {modules.length > 0 && (
              <label className="block text-sm font-medium">
                Módulo existente
                <select value={moduleId} onChange={(e) => setModuleId(e.target.value)} disabled={Boolean(newModuleTitle.trim())} className={inputCls}>
                  {modules.map((m) => (
                    <option key={m.id} value={m.id}>{m.title}</option>
                  ))}
                </select>
              </label>
            )}
            <label className="block text-sm font-medium">
              Ou criar novo módulo (opcional)
              <input type="text" value={newModuleTitle} onChange={(e) => setNewModuleTitle(e.target.value)} placeholder="Ex.: 12. Tópicos Avançados" className={inputCls} />
            </label>
            <label className="block text-sm font-medium">
              Título da aula
              <input type="text" required value={lessonTitle} onChange={(e) => setLessonTitle(e.target.value)} className={inputCls} />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm font-medium">
                Tipo
                <select value={lessonType} onChange={(e) => setLessonType(e.target.value === 'TEXT' ? 'TEXT' : 'VIDEO')} className={inputCls}>
                  <option value="VIDEO">Vídeo (YouTube)</option>
                  <option value="TEXT">Texto / Leitura</option>
                </select>
              </label>
              {lessonType === 'VIDEO' && (
                <label className="block text-sm font-medium">
                  Link ou ID do YouTube
                  <input type="text" value={youtubeUrl} onChange={(e) => setYoutubeUrl(e.target.value)} placeholder="https://youtu.be/..." className={inputCls} />
                </label>
              )}
            </div>
            <label className="block text-sm font-medium">
              Resumo
              <input type="text" value={lessonSummary} onChange={(e) => setLessonSummary(e.target.value)} className={inputCls} />
            </label>
            <label className="block text-sm font-medium">
              Conteúdo (Markdown)
              <textarea rows={4} value={lessonContent} onChange={(e) => setLessonContent(e.target.value)} className={`${inputCls} font-mono text-xs`} />
            </label>
            {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
            <DialogFooter>
              <button type="button" disabled={busy} onClick={() => setAddLessonOpen(false)} className={btnSecondary}>Cancelar</button>
              <button type="submit" disabled={busy} className={btnPrimary}>{busy ? 'Adicionando…' : 'Adicionar aula'}</button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
