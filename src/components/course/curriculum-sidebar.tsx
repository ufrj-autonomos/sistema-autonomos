"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  ChevronDown,
  ChevronRight,
  PlayCircle,
  Clock,
  FileText,
  Terminal,
  CheckCircle2,
  Circle,
  Layers,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ModuleData, LessonData } from "./types";

export interface CurriculumSidebarProps {
  modules: ModuleData[];
  activeLessonId: string;
  completedLessonIds?: string[];
  onToggleComplete?: (lessonId: string, completed: boolean) => void;
  onSelectLesson?: () => void;
  className?: string;
}

export function CurriculumSidebar({
  modules,
  activeLessonId,
  completedLessonIds = [],
  onToggleComplete,
  onSelectLesson,
  className = "",
}: CurriculumSidebarProps) {
  // Encontrar o módulo que contém a aula ativa
  const activeModule = modules.find((m) =>
    m.lessons.some((l) => l.id === activeLessonId || l.slug === activeLessonId)
  );

  // Conjunto de IDs de módulos expandidos (inicializa com o módulo da aula ativa)
  const [expandedModules, setExpandedModules] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    if (activeModule) {
      initial.add(activeModule.id);
    } else if (modules.length > 0) {
      initial.add(modules[0].id);
    }
    return initial;
  });

  const activeLessonRef = useRef<HTMLDivElement | null>(null);

  // Auto-expande o módulo da aula ativa quando a rota/aula mudar
  useEffect(() => {
    if (activeModule) {
      setExpandedModules((prev) => {
        const next = new Set(prev);
        next.add(activeModule.id);
        return next;
      });
    }
  }, [activeLessonId, activeModule]);

  // Auto-scroll para a aula ativa
  useEffect(() => {
    if (activeLessonRef.current) {
      activeLessonRef.current.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }
  }, [activeLessonId]);

  const toggleModule = (moduleId: string) => {
    setExpandedModules((prev) => {
      const next = new Set(prev);
      if (next.has(moduleId)) {
        next.delete(moduleId);
      } else {
        next.add(moduleId);
      }
      return next;
    });
  };

  const expandAll = () => {
    setExpandedModules(new Set(modules.map((m) => m.id)));
  };

  const collapseAll = () => {
    setExpandedModules(new Set());
  };

  // Contagem de aulas totais e concluídas
  const allLessons = modules.flatMap((m) => m.lessons);
  const totalLessons = allLessons.length;
  const completedCount = completedLessonIds.length;
  const progressPercent =
    totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;

  // Formatador de duração
  const formatDuration = (seconds?: number | null) => {
    if (!seconds || seconds <= 0) return null;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${String(secs).padStart(2, "0")}`;
  };

  // Ícone por status de vídeo e tipo de aula
  const getLessonIcon = (lesson: LessonData) => {
    const status = (lesson.videoStatus || "").toLowerCase();
    const type = (lesson.lessonType || lesson.type || "").toLowerCase();

    if (type === "project" || (lesson.exercises && lesson.exercises.length > 0)) {
      return <Terminal className="w-3.5 h-3.5 text-purple-700 dark:text-purple-400 shrink-0" />;
    }
    if (type === "text" || status === "text_only") {
      return <FileText className="w-3.5 h-3.5 text-blue-700 dark:text-blue-400 shrink-0" />;
    }
    if (status === "available" || status === "video") {
      return <PlayCircle className="w-3.5 h-3.5 text-cyan-700 dark:text-cyan-400 shrink-0" />;
    }
    if (status === "pending") {
      return <Clock className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400 shrink-0" />;
    }
    return <FileText className="w-3.5 h-3.5 text-blue-700 dark:text-blue-400 shrink-0" />;
  };

  return (
    <aside
      className={cn(
        "flex flex-col h-full bg-background border-l border-border select-none",
        className
      )}
    >
      {/* Header da Sidebar: Progresso e Controles */}
      <div className="p-4 border-b border-border bg-card space-y-3 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-cyan-700 dark:text-cyan-400" />
            <h2 className="font-display font-bold text-sm tracking-wide text-foreground">
              Grade Curricular
            </h2>
          </div>
          <div className="flex items-center gap-2 text-[11px] font-mono">
            <button
              onClick={expandAll}
              type="button"
              className="text-muted-foreground hover:text-foreground transition cursor-pointer"
            >
              Expandir
            </button>
            <span className="text-muted-foreground">•</span>
            <button
              onClick={collapseAll}
              type="button"
              className="text-muted-foreground hover:text-foreground transition cursor-pointer"
            >
              Recolher
            </button>
          </div>
        </div>

        {/* Barra de Progresso do Curso */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-muted-foreground">Progresso Geral</span>
            <span className="text-emerald-700 dark:text-emerald-400 font-semibold tabular">
              {completedCount} de {totalLessons} aulas concluídas ({progressPercent}%)
            </span>
          </div>
          <div className="w-full h-1.5 bg-accent rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-cyan-400 transition-all duration-300 rounded-full"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Lista de Módulos (Scrollable) */}
      <div className="flex-1 overflow-y-auto divide-y divide-border scrollbar-thin scrollbar-thumb-zinc-800">
        {modules.map((module) => {
          const isExpanded = expandedModules.has(module.id);
          const moduleLessons = module.lessons;
          const moduleCompleted = moduleLessons.filter((l) =>
            completedLessonIds.includes(l.id)
          ).length;

          return (
            <div key={module.id} className="bg-transparent">
              {/* Botão do Módulo (Accordion Header) */}
              <button
                type="button"
                onClick={() => toggleModule(module.id)}
                className={cn(
                  "w-full flex items-center justify-between p-3.5 text-left transition-colors cursor-pointer",
                  isExpanded ? "bg-foreground/[0.04]" : "hover:bg-foreground/[0.02]"
                )}
              >
                <div className="space-y-0.5 pr-2 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] uppercase tracking-wider text-cyan-700 dark:text-cyan-400 font-semibold">
                      Módulo {String(module.orderIndex).padStart(2, "0")}
                    </span>
                    <span className="text-[10px] font-mono text-muted-foreground">
                      ({moduleCompleted}/{moduleLessons.length})
                    </span>
                  </div>
                  <h3 className="font-display text-xs font-semibold text-foreground truncate">
                    {module.title}
                  </h3>
                </div>

                <div className="text-muted-foreground shrink-0">
                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )}
                </div>
              </button>

              {/* Lista de Aulas do Módulo */}
              {isExpanded && (
                <div className="bg-background divide-y divide-border">
                  {moduleLessons.map((lesson) => {
                    const isActive =
                      lesson.id === activeLessonId || lesson.slug === activeLessonId;
                    const isCompleted = completedLessonIds.includes(lesson.id);
                    const durationStr = formatDuration(
                      lesson.videoDurationSeconds || lesson.durationSeconds
                    );

                    return (
                      <div
                        key={lesson.id}
                        ref={isActive ? activeLessonRef : null}
                        className={cn(
                          "group relative flex items-center justify-between px-3.5 py-2.5 text-xs transition-colors",
                          isActive
                            ? "bg-cyan-100 dark:bg-cyan-950/40 text-foreground border-l-2 border-cyan-400 shadow-sm"
                            : isCompleted
                            ? "text-muted-foreground hover:bg-foreground/[0.02] hover:text-secondary-foreground"
                            : "text-secondary-foreground hover:bg-foreground/[0.03] hover:text-foreground"
                        )}
                      >
                        {/* Checkbox de Conclusão (M4 ready) */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (onToggleComplete) {
                              onToggleComplete(lesson.id, !isCompleted);
                            }
                          }}
                          aria-label={
                            isCompleted ? "Marcar como pendente" : "Marcar como concluída"
                          }
                          className="mr-2.5 shrink-0 text-muted-foreground hover:text-emerald-400 transition cursor-pointer"
                        >
                          {isCompleted ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
                          ) : (
                            <Circle className="w-4 h-4 text-muted-foreground hover:text-muted-foreground" />
                          )}
                        </button>

                        {/* Link da Aula */}
                        <Link
                          href={`/curso/${lesson.slug}`}
                          onClick={() => {
                            if (onSelectLesson) onSelectLesson();
                          }}
                          className="flex-1 flex items-center gap-2 min-w-0 pr-2"
                        >
                          {getLessonIcon(lesson)}
                          <span className="font-mono text-[11px] text-muted-foreground shrink-0">
                            #{String(lesson.orderIndex).padStart(3, "0")}
                          </span>
                          <span
                            className={cn(
                              "truncate",
                              isActive
                                ? "font-semibold text-foreground"
                                : isCompleted
                                ? "font-normal text-muted-foreground group-hover:text-foreground"
                                : "font-normal"
                            )}
                          >
                            {lesson.title}
                          </span>
                          {isCompleted && !isActive && (
                            <span className="hidden sm:inline-block ml-1 px-1.5 py-0.2 rounded text-[9px] font-mono bg-emerald-500/10 text-emerald-700 dark:text-emerald-400/90 border border-emerald-500/20 shrink-0">
                              feita
                            </span>
                          )}
                        </Link>

                        {/* Metadados: Duração */}
                        {durationStr && (
                          <span className="font-mono text-[10px] text-muted-foreground tabular shrink-0">
                            {durationStr}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </aside>
  );
}
