"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Circle,
  X,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  CourseData,
  LessonData,
  SurroundingLesson,
} from "./types";
import { CourseHeader } from "./course-header";
import { CurriculumSidebar } from "./curriculum-sidebar";
import { VideoPlayer } from "./video-player";
import { VideoPlaceholder } from "./video-placeholder";
import { LessonContent } from "./lesson-content";
import { ExerciseList } from "./exercise-card";

export interface CoursePlayerShellProps {
  course: CourseData;
  activeLesson: LessonData;
  previousLesson?: SurroundingLesson | null;
  nextLesson?: SurroundingLesson | null;
  initialCompletedLessonIds?: string[];
  initialCompletedExerciseIds?: string[];
}

export function CoursePlayerShell({
  course,
  activeLesson,
  previousLesson,
  nextLesson,
  initialCompletedLessonIds = [],
  initialCompletedExerciseIds = [],
}: CoursePlayerShellProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const [isTheaterMode, setIsTheaterMode] = useState(false);
  const [completedLessonIds, setCompletedLessonIds] = useState<string[]>(
    initialCompletedLessonIds
  );
  const [completedExerciseIds, setCompletedExerciseIds] = useState<string[]>(
    initialCompletedExerciseIds
  );

  const isCurrentLessonCompleted = completedLessonIds.includes(activeLesson.id);

  const handleToggleComplete = (lessonId: string, completed: boolean) => {
    setCompletedLessonIds((prev) => {
      if (completed) {
        return prev.includes(lessonId) ? prev : [...prev, lessonId];
      } else {
        return prev.filter((id) => id !== lessonId);
      }
    });

    // Enviar mutação assíncrona se logado (M4 ready)
    fetch("/api/progress/lesson", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lessonId, completed }),
    })
      .then((res) => {
        if (!res.ok) throw new Error("Erro ao salvar progresso");
        return res.json();
      })
      .then((data) => {
        if (data.completedLessonIds) {
          setCompletedLessonIds(data.completedLessonIds);
        }
      })
      .catch(() => {
        // Reverte se falhar
        setCompletedLessonIds((prev) =>
          !completed
            ? prev.includes(lessonId) ? prev : [...prev, lessonId]
            : prev.filter((id) => id !== lessonId)
        );
      });
  };

  const handleToggleExercise = (exerciseId: string, completed: boolean) => {
    setCompletedExerciseIds((prev) =>
      completed
        ? prev.includes(exerciseId) ? prev : [...prev, exerciseId]
        : prev.filter((id) => id !== exerciseId)
    );

    fetch("/api/progress/exercise", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ exerciseId, completed }),
    })
      .then((res) => {
        if (!res.ok) throw new Error("Erro ao salvar progresso do exercício");
        return res.json();
      })
      .then((data) => {
        if (data.completedExerciseIds) {
          setCompletedExerciseIds(data.completedExerciseIds);
        }
      })
      .catch(() => {
        setCompletedExerciseIds((prev) =>
          !completed
            ? prev.includes(exerciseId) ? prev : [...prev, exerciseId]
            : prev.filter((id) => id !== exerciseId)
        );
      });
  };

  // Determinar se a lição é exclusivamente textual/teórica
  const isTextLesson =
    activeLesson.lessonType === "TEXT" ||
    activeLesson.videoStatus === "TEXT_ONLY" ||
    (activeLesson as any).type === "text" ||
    (activeLesson.videoStatus || "").toLowerCase() === "text_only";

  // Determinar se o vídeo está disponível ou se deve exibir placeholder de vídeo pendente
  const isVideoAvailable =
    !isTextLesson &&
    (activeLesson.videoStatus === "AVAILABLE" ||
      activeLesson.videoStatus === "available") &&
    Boolean(activeLesson.youtubeVideoId);

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-[#0A0A0B] text-zinc-100">
      {/* 1. Header do Player */}
      <CourseHeader
        courseTitle={course.title}
        activeLesson={activeLesson}
        previousLesson={previousLesson}
        nextLesson={nextLesson}
        isCompleted={isCurrentLessonCompleted}
        onToggleComplete={() =>
          handleToggleComplete(activeLesson.id, !isCurrentLessonCompleted)
        }
        isSidebarOpen={isSidebarOpen}
        onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
        onToggleMobileDrawer={() => setIsMobileDrawerOpen((prev) => !prev)}
        isTheaterMode={isTheaterMode}
        onToggleTheaterMode={() => {
          setIsTheaterMode((prev) => {
            const next = !prev;
            if (next) setIsSidebarOpen(false);
            return next;
          });
        }}
      />

      {/* 2. Área Central de 2 Colunas (Palco Principal + Sidebar) */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Palco Principal (Scrollable) */}
        <main
          className={cn(
            "flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 transition-all duration-300",
            isSidebarOpen && !isTheaterMode ? "lg:mr-0" : ""
          )}
        >
          <div
            className={cn(
              "mx-auto space-y-8 pb-16 transition-all duration-300",
              isTheaterMode ? "max-w-6xl" : "max-w-4xl"
            )}
          >
            {/* Bloco 1: Estágio de Vídeo ou Placeholder 16:9 (somente para aulas com vídeo previsto) */}
            {!isTextLesson && (
              <div className="w-full">
                {isVideoAvailable ? (
                  <VideoPlayer
                    youtubeVideoId={activeLesson.youtubeVideoId}
                    title={activeLesson.title}
                    duration={
                      activeLesson.videoDurationSeconds ||
                      activeLesson.durationSeconds
                    }
                    moduleTitle={activeLesson.module?.title}
                    videoStatus={activeLesson.videoStatus}
                  />
                ) : (
                  <VideoPlaceholder
                    title={activeLesson.title}
                    moduleTitle={activeLesson.module?.title}
                    duration={
                      activeLesson.videoDurationSeconds ||
                      activeLesson.durationSeconds
                    }
                  />
                )}
              </div>
            )}

            {/* Bloco 2: Conteúdo Técnico Escrito da Lição */}
            <LessonContent
              content={activeLesson.content || activeLesson.textContent || ""}
              summary={activeLesson.summary}
              rosDocsUrl={activeLesson.rosDocsUrl}
              durationSeconds={
                activeLesson.videoDurationSeconds ||
                activeLesson.durationSeconds
              }
              lessonTitle={activeLesson.title}
              isText={isTextLesson}
            />

            {/* Bloco 3: Exercícios Práticos da Lição (se houver) */}
            {activeLesson.exercises && activeLesson.exercises.length > 0 && (
              <ExerciseList
                exercises={activeLesson.exercises.map((ex) => ({
                  ...ex,
                  isCompleted: completedExerciseIds.includes(ex.id),
                }))}
                onToggleComplete={handleToggleExercise}
              />
            )}

            {/* Bloco 4: Barra de Navegação Inferior (Bottom Bar) */}
            <div className="pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
              {/* Botão Aula Anterior */}
              {previousLesson ? (
                <Link
                  href={`/curso/${previousLesson.slug}`}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white border border-white/10 text-xs font-mono transition"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <div className="text-left">
                    <div className="text-[10px] text-zinc-500 uppercase">Anterior</div>
                    <div className="font-semibold truncate max-w-[180px]">
                      {previousLesson.title}
                    </div>
                  </div>
                </Link>
              ) : (
                <div className="hidden sm:block" />
              )}

              {/* Botão Central: Marcar como Concluída */}
              <button
                type="button"
                onClick={() =>
                  handleToggleComplete(
                    activeLesson.id,
                    !isCurrentLessonCompleted
                  )
                }
                className={cn(
                  "w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-mono font-semibold transition-all cursor-pointer border",
                  isCurrentLessonCompleted
                    ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30"
                    : "bg-white/10 hover:bg-white/15 text-white border-white/10"
                )}
              >
                {isCurrentLessonCompleted ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Aula Concluída</span>
                  </>
                ) : (
                  <>
                    <Circle className="w-4 h-4 text-zinc-400" />
                    <span>Marcar Aula como Concluída</span>
                  </>
                )}
              </button>

              {/* Botão Próxima Aula */}
              {nextLesson ? (
                <Link
                  href={`/curso/${nextLesson.slug}`}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-zinc-100 hover:bg-white text-zinc-950 text-xs font-mono font-semibold transition shadow-md"
                >
                  <div className="text-right">
                    <div className="text-[10px] text-zinc-600 uppercase">Próxima</div>
                    <div className="truncate max-w-[180px]">{nextLesson.title}</div>
                  </div>
                  <ChevronRight className="w-4 h-4" />
                </Link>
              ) : (
                <span className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 text-zinc-500 border border-white/10 text-xs font-mono">
                  <span>Última Aula</span>
                </span>
              )}
            </div>
          </div>
        </main>

        {/* Sidebar Desktop (Colapsável) */}
        {isSidebarOpen && !isTheaterMode && (
          <div className="hidden lg:block w-80 xl:w-96 shrink-0 h-full">
            <CurriculumSidebar
              modules={course.modules}
              activeLessonId={activeLesson.id}
              completedLessonIds={completedLessonIds}
              onToggleComplete={handleToggleComplete}
            />
          </div>
        )}

        {/* Drawer Mobile / Tablet (< lg) com Backdrop */}
        {isMobileDrawerOpen && (
          <div className="lg:hidden fixed inset-0 z-50 flex">
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
              onClick={() => setIsMobileDrawerOpen(false)}
            />

            {/* Painel Lateral */}
            <div className="relative ml-auto w-full max-w-sm sm:max-w-md h-full bg-[#0D0D10] shadow-2xl flex flex-col z-10 animate-in slide-in-from-right duration-200">
              <div className="flex items-center justify-between p-3.5 border-b border-white/10 bg-[#121215]">
                <h3 className="font-display font-semibold text-sm text-zinc-100">
                  Grade Curricular
                </h3>
                <button
                  type="button"
                  onClick={() => setIsMobileDrawerOpen(false)}
                  className="p-1.5 rounded-lg bg-white/5 text-zinc-400 hover:text-white transition cursor-pointer"
                  aria-label="Fechar grade curricular"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 overflow-hidden">
                <CurriculumSidebar
                  modules={course.modules}
                  activeLessonId={activeLesson.id}
                  completedLessonIds={completedLessonIds}
                  onToggleComplete={handleToggleComplete}
                  onSelectLesson={() => setIsMobileDrawerOpen(false)}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
