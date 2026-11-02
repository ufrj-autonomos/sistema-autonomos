"use client";

import React from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Menu,
  PanelRightClose,
  PanelRightOpen,
  Maximize2,
  Minimize2,
  BookOpen,
  CheckCircle2,
  Circle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { LessonData, SurroundingLesson } from "./types";

export interface CourseHeaderProps {
  courseTitle?: string;
  activeLesson: LessonData;
  previousLesson?: SurroundingLesson | null;
  nextLesson?: SurroundingLesson | null;
  isCompleted?: boolean;
  onToggleComplete?: () => void;
  isSidebarOpen: boolean;
  onToggleSidebar: () => void;
  onToggleMobileDrawer: () => void;
  isTheaterMode?: boolean;
  onToggleTheaterMode?: () => void;
  className?: string;
}

export function CourseHeader({
  courseTitle = "ROS 2 Jazzy para Iniciantes",
  activeLesson,
  previousLesson,
  nextLesson,
  isCompleted = false,
  onToggleComplete,
  isSidebarOpen,
  onToggleSidebar,
  onToggleMobileDrawer,
  isTheaterMode = false,
  onToggleTheaterMode,
  className = "",
}: CourseHeaderProps) {
  const moduleTitle = activeLesson.module?.title || "Módulo Geral";
  const moduleOrder = activeLesson.module?.orderIndex;

  return (
    <header
      className={cn(
        "h-14 bg-[#111114] border-b border-white/10 px-3 sm:px-4 flex items-center justify-between select-none z-30 shrink-0",
        className
      )}
    >
      {/* Lado Esquerdo: Botão Voltar ao Catálogo e Breadcrumbs */}
      <div className="flex items-center gap-3 min-w-0">
        <Link
          href="/ensino"
          className="flex items-center gap-1.5 p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white border border-white/10 text-xs font-mono transition shrink-0"
          title="Voltar ao Catálogo de Cursos"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Catálogo</span>
        </Link>

        <div className="h-5 w-px bg-white/10 shrink-0 hidden sm:block" />

        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-1.5 text-[10px] font-mono text-zinc-400 truncate">
            <span className="text-cyan-400 font-semibold">{courseTitle}</span>
            {moduleOrder && (
              <>
                <span className="text-zinc-600">•</span>
                <span className="truncate">Mod {moduleOrder}: {moduleTitle}</span>
              </>
            )}
          </div>
          <h1 className="text-xs sm:text-sm font-display font-semibold text-zinc-100 truncate">
            #{String(activeLesson.orderIndex).padStart(3, "0")}: {activeLesson.title}
          </h1>
        </div>
      </div>

      {/* Lado Direito: Controles Anterior/Próximo e Alternadores de Layout */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        {/* Botão Aula Anterior */}
        {previousLesson ? (
          <Link
            href={`/curso/${previousLesson.slug}`}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white border border-white/10 text-xs font-mono transition"
            title={`Aula Anterior: ${previousLesson.title}`}
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Anterior</span>
          </Link>
        ) : (
          <span
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/[0.02] text-zinc-600 border border-white/[0.04] text-xs font-mono cursor-not-allowed"
            title="Primeira aula do curso"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Anterior</span>
          </span>
        )}

        {/* Botão Próxima Aula */}
        {nextLesson ? (
          <Link
            href={`/curso/${nextLesson.slug}`}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-zinc-100 hover:bg-white text-zinc-950 font-semibold text-xs font-mono transition shadow-sm"
            title={`Próxima Aula: ${nextLesson.title}`}
          >
            <span className="hidden md:inline">Próxima</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        ) : (
          <span
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white/[0.05] text-zinc-500 border border-white/10 text-xs font-mono cursor-not-allowed"
            title="Última aula do curso"
          >
            <span className="hidden md:inline">Concluído</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </span>
        )}

        {/* Botão de Conclusão da Aula Ativa */}
        {onToggleComplete && (
          <button
            type="button"
            onClick={onToggleComplete}
            aria-label={
              isCompleted
                ? "Marcar aula como incompleta"
                : "Marcar aula como concluída"
            }
            title={
              isCompleted
                ? "Aula concluída (clique para desmarcar)"
                : "Marcar aula como concluída"
            }
            className={cn(
              "flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all duration-200 border cursor-pointer",
              isCompleted
                ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30 shadow-sm shadow-emerald-950/20"
                : "bg-white/5 text-zinc-300 border-white/10 hover:bg-white/10 hover:text-white"
            )}
          >
            {isCompleted ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span className="hidden sm:inline">Concluída</span>
              </>
            ) : (
              <>
                <Circle className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                <span className="hidden sm:inline">Concluir</span>
              </>
            )}
          </button>
        )}

        {/* Divisor */}
        <div className="h-5 w-px bg-white/10 shrink-0 mx-1 hidden sm:block" />

        {/* Modo Teatro Toggle (Desktop) */}
        {onToggleTheaterMode && (
          <button
            type="button"
            onClick={onToggleTheaterMode}
            className="hidden lg:flex items-center justify-center p-2 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white border border-white/10 transition cursor-pointer"
            title={isTheaterMode ? "Sair do Modo Teatro" : "Modo Teatro"}
            aria-label={isTheaterMode ? "Sair do Modo Teatro" : "Modo Teatro"}
          >
            {isTheaterMode ? (
              <Minimize2 className="w-4 h-4" />
            ) : (
              <Maximize2 className="w-4 h-4" />
            )}
          </button>
        )}

        {/* Sidebar Toggle (Desktop) */}
        <button
          type="button"
          onClick={onToggleSidebar}
          className="hidden lg:flex items-center justify-center p-2 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white border border-white/10 transition cursor-pointer"
          title={isSidebarOpen ? "Recolher Grade Curricular" : "Expandir Grade Curricular"}
          aria-label={isSidebarOpen ? "Recolher Grade Curricular" : "Expandir Grade Curricular"}
        >
          {isSidebarOpen ? (
            <PanelRightClose className="w-4 h-4 text-cyan-400" />
          ) : (
            <PanelRightOpen className="w-4 h-4" />
          )}
        </button>

        {/* Hamburger Drawer Toggle (Mobile / Tablet < lg) */}
        <button
          type="button"
          onClick={onToggleMobileDrawer}
          className="lg:hidden flex items-center justify-center p-2 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white border border-white/10 transition cursor-pointer"
          aria-label="Abrir grade curricular"
        >
          <Menu className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}
