'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, BookOpen, Search, ExternalLink, PlayCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface CatalogCourse {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  description: string;
  area: string;
  level: string;
  durationHours: number;
  totalLessons: number;
  totalModules: number;
  coverImage: string | null;
  progress: number;
  started: boolean;
  completed: boolean;
  resumeHref: string | null;
  resumeTitle: string | null;
  detailsHref: string;
  external: boolean;
}

export function CourseCatalog({ courses }: { courses: CatalogCourse[] }) {
  const [search, setSearch] = useState('');
  const [area, setArea] = useState('all');
  const [status, setStatus] = useState('all');
  const areas = [...new Set(courses.map((course) => course.area))].sort();
  const continuing = courses.filter((course) => course.started && !course.completed && course.resumeHref);
  const filtered = useMemo(() => {
    const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    const query = normalize(search.trim());
    return courses.filter((course) => (area === 'all' || course.area === area)
      && (status === 'all' || (status === 'started' ? course.started && !course.completed : course.completed))
      && normalize(`${course.title} ${course.subtitle ?? ''} ${course.description} ${course.area}`).includes(query));
  }, [courses, search, area, status]);

  function clearFilters() { setSearch(''); setArea('all'); setStatus('all'); }

  return <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-8 sm:py-10 space-y-9">
    <header className="space-y-2">
      <h1 className="font-display text-3xl font-semibold tracking-tight">Ensino</h1>
      <p className="max-w-2xl text-sm sm:text-base text-muted-foreground">Conhecimento para construir o próximo projeto. Explore os cursos da equipe e avance no seu ritmo.</p>
    </header>

    {continuing.length > 0 && <section aria-labelledby="continue-heading" className="space-y-4">
      <h2 id="continue-heading" className="font-display text-xl font-semibold">Continue aprendendo</h2>
      <div className="divide-y divide-border rounded-xl border border-border bg-card px-5">
        {continuing.map((course) => <div key={course.id} className="flex flex-col gap-4 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 space-y-2 sm:max-w-lg">
            <h3 className="font-semibold">{course.title}</h3>
            <p className="text-sm text-muted-foreground">{course.resumeTitle ? `Retomar: ${course.resumeTitle}` : 'Continue no site do curso'}</p>
            <div className="flex items-center gap-3"><div role="progressbar" aria-valuenow={course.progress} aria-valuemin={0} aria-valuemax={100} aria-label={`Progresso em ${course.title}`} className="h-1.5 w-40 max-w-full overflow-hidden rounded-full bg-muted"><div className="h-full bg-primary" style={{ width: `${course.progress}%` }} /></div><span className="text-xs tabular-nums text-muted-foreground">{course.progress}%</span></div>
          </div>
          <a href={course.resumeHref!} target={course.external ? '_blank' : undefined} rel={course.external ? 'noopener noreferrer' : undefined} className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 self-start rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 sm:self-auto"><PlayCircle className="h-4 w-4" />Continuar{course.external && <ExternalLink className="h-3.5 w-3.5" />}</a>
        </div>)}
      </div>
    </section>}

    <section aria-labelledby="catalog-heading" className="space-y-5">
      <div className="flex items-baseline justify-between gap-4"><h2 id="catalog-heading" className="font-display text-xl font-semibold">Explore os cursos</h2><span className="text-sm text-muted-foreground" role="status">{filtered.length} curso(s)</span></div>
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_180px_180px]">
        <div className="relative"><Search aria-hidden="true" className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" /><input aria-label="Buscar cursos" type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="O que você quer aprender?" className="min-h-11 w-full rounded-lg border border-input bg-background pl-10 pr-3 text-sm focus-visible:outline-2 focus-visible:outline-ring" /></div>
        <select aria-label="Filtrar por área" value={area} onChange={(event) => setArea(event.target.value)} className="min-h-11 rounded-lg border border-input bg-background px-3 text-sm"><option value="all">Todas as áreas</option>{areas.map((name) => <option key={name} value={name}>{name}</option>)}</select>
        <select aria-label="Filtrar por progresso" value={status} onChange={(event) => setStatus(event.target.value)} className="min-h-11 rounded-lg border border-input bg-background px-3 text-sm"><option value="all">Todos os cursos</option><option value="started">Em andamento</option><option value="completed">Concluídos</option></select>
      </div>
      {filtered.length === 0 ? <div className="rounded-xl border border-dashed border-border py-14 text-center space-y-3">
        <BookOpen className="mx-auto h-7 w-7 text-muted-foreground" />
        <h3 className="font-semibold">{courses.length === 0 ? 'Os cursos estão chegando' : 'Nenhum curso encontrado'}</h3>
        <p className="text-sm text-muted-foreground">{courses.length === 0 ? 'Os cursos publicados pela equipe aparecerão aqui.' : 'Tente outro tema ou remova os filtros para explorar o catálogo.'}</p>
        {courses.length > 0 && <button type="button" onClick={clearFilters} className="min-h-11 rounded-lg border border-border px-4 text-sm hover:bg-accent">Limpar filtros</button>}
      </div> : <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((course) => <article key={course.id} className="flex min-w-0 flex-col overflow-hidden rounded-xl border border-border bg-card">
          {course.coverImage && <img src={course.coverImage} alt="" className="aspect-[2/1] w-full object-cover" />}
          <div className="flex flex-1 flex-col p-5 sm:p-6">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground"><span>{course.area} · {course.level}</span><span className={cn(course.completed && 'text-emerald-700 dark:text-emerald-300')}>{course.completed ? 'Concluído' : course.started ? `${course.progress}% concluído` : course.external ? 'Curso externo' : `${course.totalLessons} aulas`}</span></div>
            <h3 className="font-display text-xl font-semibold leading-snug"><Link href={course.detailsHref} className="hover:underline underline-offset-4">{course.title}</Link></h3>
            <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-muted-foreground">{course.subtitle || course.description}</p>
            <div className="mt-5 flex flex-wrap gap-4 text-xs text-muted-foreground">{course.durationHours > 0 && <span>{course.durationHours}h de conteúdo</span>}{course.totalModules > 0 && <span>{course.totalModules} módulo(s)</span>}</div>
            <div className="mt-auto pt-6 flex flex-wrap items-center justify-between gap-3">
              <Link href={course.detailsHref} className="inline-flex min-h-10 items-center gap-2 text-sm font-semibold hover:underline underline-offset-4">Conhecer curso<ArrowRight className="h-4 w-4" /></Link>
              {course.resumeHref && <a href={course.resumeHref} target={course.external ? '_blank' : undefined} rel={course.external ? 'noopener noreferrer' : undefined} className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-accent px-3 text-sm font-medium hover:bg-foreground/10">{course.external ? 'Acessar' : course.completed ? 'Revisitar' : course.started ? 'Continuar' : 'Começar'}{course.external && <ExternalLink className="h-3.5 w-3.5" />}</a>}
              {!course.resumeHref && <span className="text-xs text-muted-foreground">Conteúdo em preparação</span>}
            </div>
          </div>
        </article>)}
      </div>}
    </section>
  </div>;
}
