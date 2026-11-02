"use client";

import React from "react";
import { Video, Sparkles, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { HarpiaMark } from "@/components/brand/logo";

export interface VideoPlaceholderProps {
  /**
   * Título da aula atual.
   */
  title?: string;

  /**
   * Título ou número do módulo ao qual a aula pertence.
   */
  moduleTitle?: string | null;

  /**
   * Duração estimada da aula ou vídeo em segundos.
   */
  duration?: number | null;

  /**
   * Mensagem descritiva e tranquilizadora para o aluno.
   */
  message?: string;

  /**
   * Rótulo do badge da equipe responsável pela gravação.
   */
  badgeText?: string;

  /**
   * Classes CSS adicionais para o container externo.
   */
  className?: string;

  /**
   * Se verdadeiro, renderiza link suave para o conteúdo textual abaixo.
   */
  showScrollPrompt?: boolean;
}

export function VideoPlaceholder({
  title,
  moduleTitle,
  duration,
  message = "Esta aula está com a gravação de vídeo em andamento pelo time UFRJ Harpia. Você pode estudar o conteúdo escrito completo e os exercícios práticos abaixo sem interrupções.",
  badgeText = "Vídeo em Gravação / Edição pelo Time Harpia",
  className,
  showScrollPrompt = true,
}: VideoPlaceholderProps) {
  const durationMins = duration && duration > 0 ? Math.round(duration / 60) : null;

  const scrollToContent = () => {
    if (typeof document !== "undefined") {
      const target =
        document.getElementById("lesson-content") ||
        document.getElementById("conteudo-aula") ||
        document.querySelector("article");
      if (target) {
        target.scrollIntoView({ behavior: "smooth" });
      } else {
        window.scrollBy({ top: 400, behavior: "smooth" });
      }
    }
  };

  return (
    <div
      tabIndex={0}
      aria-label={`Vídeo em gravação: ${title || "Aula de ROS 2"}`}
      className={cn(
        "relative w-full aspect-video rounded-xl overflow-hidden",
        "bg-[#0A0A0B] border border-white/[0.08] shadow-2xl",
        "blueprint-corners bg-grid-sm card-inner-fade",
        "flex flex-col justify-between p-5 sm:p-8 md:p-10 select-none",
        "transition-all duration-300",
        className
      )}
    >
      {/* Camada sutil de vinheta e brilho com a cor Harpia (#8530B0 / #702191) */}
      <div
        className="pointer-events-none absolute -top-24 -right-24 w-80 h-80 rounded-full blur-3xl opacity-20 bg-[#8530B0]"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -bottom-24 -left-24 w-80 h-80 rounded-full blur-3xl opacity-15 bg-[#702191]"
        aria-hidden="true"
      />

      {/* Marca d'água técnica de engenharia (Harpia Mark) em baixa opacidade */}
      <div
        className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-[0.035] overflow-hidden"
        aria-hidden="true"
      >
        <HarpiaMark size={320} symbolType="eagle" />
      </div>

      {/* CABEÇALHO TÉCNICO (Top Bar) */}
      <div className="relative z-10 flex items-center justify-between gap-4">
        {/* Badge Harpia com pulso de gravação (Recording Dot) */}
        <div className="inline-flex items-center gap-2.5 px-3 py-1.5 rounded-full text-xs font-mono font-medium bg-[#1D062B]/90 text-[#C49ED9] border border-[#702191]/60 shadow-[0_0_16px_rgba(133,48,176,0.25)]">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-500 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500" />
          </span>
          <span className="tracking-wide">{badgeText}</span>
        </div>

        {/* Coordenadas e Especificação Técnica (Engineering Studio) */}
        <div className="hidden sm:flex items-center gap-3 text-[11px] font-mono text-zinc-500 tracking-wider uppercase">
          <span className="inline-flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500/70" />
            <span>FHD 1080p60</span>
          </span>
          <span className="text-zinc-700">•</span>
          <span>LEGENDAS PT-BR</span>
          <span className="text-zinc-700">•</span>
          <span>DDS JAZZY</span>
        </div>
      </div>

      {/* CONTEÚDO CENTRAL (Ilustração técnica + Mensagem de tranquilização) */}
      <div className="relative z-10 flex flex-col items-center justify-center text-center my-auto px-4 max-w-2xl mx-auto space-y-3 sm:space-y-4">
        {/* Ícone de Câmera Técnica de Estúdio */}
        <div className="relative flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-[#111113] border border-white/[0.12] shadow-inner">
          <Video className="w-7 h-7 sm:w-8 sm:h-8 text-[#C49ED9] animate-pulse" />
          <div className="absolute -top-1.5 -right-1.5 flex items-center justify-center w-5 h-5 rounded-full bg-[#702191] text-[10px] text-white font-mono shadow-md">
            <Sparkles className="w-3 h-3 text-amber-300" />
          </div>
        </div>

        {/* Títulos e Contexto */}
        <div className="space-y-1">
          {moduleTitle && (
            <p className="label-mono text-zinc-400 text-[10px] sm:text-xs">
              {moduleTitle}
            </p>
          )}
          <h3 className="text-lg sm:text-xl md:text-2xl font-bold tracking-tight text-zinc-100 font-display">
            {title || "Aula em Produção de Vídeo"}
          </h3>
        </div>

        {/* Mensagem Reassuring Obrigatória */}
        <p className="text-xs sm:text-sm text-zinc-300/90 leading-relaxed font-sans max-w-lg">
          {message}
        </p>
      </div>

      {/* RODAPÉ TÉCNICO (Metadados + CTA de rolagem) */}
      <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-white/[0.06] text-xs font-mono text-zinc-400">
        <div className="flex flex-wrap items-center gap-2 sm:gap-4">
          <span className="inline-flex items-center gap-1.5 text-zinc-400">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            <span>ESTÚDIO: UFRJ HARPIA</span>
          </span>
          {durationMins && (
            <span className="tabular text-zinc-400">
              ~{durationMins} MIN PREVISTOS
            </span>
          )}
        </div>

        {showScrollPrompt && (
          <button
            type="button"
            onClick={scrollToContent}
            className="group inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white transition-all cursor-pointer text-[11px]"
          >
            <span>Ver conteúdo e exercícios abaixo</span>
            <ChevronDown className="w-3.5 h-3.5 text-zinc-400 group-hover:translate-y-0.5 transition-transform" />
          </button>
        )}
      </div>
    </div>
  );
}
