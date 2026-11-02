"use client";

import React, { useState, useEffect } from "react";
import { Loader2, AlertTriangle, RefreshCw, ExternalLink, Subtitles, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { VideoPlaceholder } from "./video-placeholder";

export interface VideoPlayerProps {
  /**
   * Identificador do vídeo no canal oficial do YouTube (ex: "6eLTFFXoqyw").
   * Quando null/undefined ou vazio, chaveia automaticamente para o placeholder.
   */
  youtubeVideoId?: string | null;

  /**
   * Título da aula para display, atributos de acessibilidade (iframe title) e SEO.
   */
  title?: string;

  /**
   * Duração da aula em segundos.
   */
  duration?: number | null;

  /**
   * Título ou identificador do módulo para contexto técnico.
   */
  moduleTitle?: string | null;

  /**
   * Status do vídeo no banco de dados ('available' | 'pending' | 'text_only' ou maiúsculas).
   */
  videoStatus?: "available" | "pending" | "text_only" | "AVAILABLE" | "PENDING" | "TEXT_ONLY" | string | null;

  /**
   * Se verdadeiro, força a exibição do placeholder mesmo havendo videoId.
   */
  forcePlaceholder?: boolean;

  /**
   * Classes CSS adicionais aplicadas ao wrapper externo.
   */
  className?: string;

  /**
   * Callback opcional disparado quando o iframe conclui o carregamento.
   */
  onReady?: () => void;
}

/**
 * Constrói a URL de embed em conformidade estrita com os requisitos R4 e privacidade:
 * - Domínio sem cookies: youtube-nocookie.com
 * - Legendas em português ativadas por padrão: cc_lang_pref=pt & cc_load_policy=1
 * - Idioma da interface: hl=pt-BR
 * - Não expor vídeos não-relacionados ao final: rel=0
 */
export function buildPrivacyEnhancedEmbedUrl(videoId: string): string {
  const sanitizedId = encodeURIComponent(videoId.trim());
  const params = new URLSearchParams({
    cc_lang_pref: "pt",
    cc_load_policy: "1",
    hl: "pt-BR",
    rel: "0",
    modestbranding: "1",
    playsinline: "1",
    enablejsapi: "1",
  });
  return `https://www.youtube-nocookie.com/embed/${sanitizedId}?${params.toString()}`;
}

export function VideoPlayer({
  youtubeVideoId,
  title,
  duration,
  moduleTitle,
  videoStatus,
  forcePlaceholder = false,
  className,
  onReady,
}: VideoPlayerProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [retryKey, setRetryKey] = useState(0);

  // Normalização do status
  const normalizedStatus = (videoStatus || "").toLowerCase();

  // Reset de estados sempre que o vídeo ou retry mudar
  useEffect(() => {
    setIsLoading(true);
    setHasError(false);
  }, [youtubeVideoId, retryKey]);

  // 1. CASO DE TRANSIÇÃO TRANSPARENTE: VÍDEO PENDENTE OU SEM ID DE VÍDEO
  // Quando o vídeo ainda não foi subido ou status é pendente, chaveia automaticamente
  // para o VideoPlaceholder sem necessidade de alterar o código da página consumidora.
  const shouldRenderPlaceholder =
    forcePlaceholder ||
    normalizedStatus === "pending" ||
    (!youtubeVideoId && normalizedStatus !== "text_only");

  if (shouldRenderPlaceholder) {
    return (
      <VideoPlaceholder
        title={title}
        moduleTitle={moduleTitle}
        duration={duration}
        className={className}
      />
    );
  }

  // 2. CASO ESPECIAL: AULA PURAMENTE TEÓRICA / TEXT-ONLY
  // Quando a aula foi concebida exclusivamente em formato de texto/leitura técnica.
  if (normalizedStatus === "text_only" && !youtubeVideoId) {
    return (
      <div
        className={cn(
          "relative w-full aspect-video rounded-xl overflow-hidden",
          "bg-[#0A0A0B] border border-white/[0.08] shadow-2xl",
          "blueprint-corners bg-grid-sm card-inner-fade",
          "flex flex-col items-center justify-center p-6 sm:p-10 text-center select-none",
          className
        )}
      >
        <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-zinc-900/90 border border-zinc-800 text-cyan-400 mb-4 shadow-inner">
          <BookOpen className="w-7 h-7" />
        </div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono font-medium bg-cyan-950/60 text-cyan-300 border border-cyan-800/80 mb-3">
          <span>AULA TEÓRICA & DOCUMENTAÇÃO TÉCNICA</span>
        </div>
        <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-100 font-display mb-2">
          {title || "Conteúdo Didático Estruturado"}
        </h3>
        <p className="text-sm text-zinc-400 max-w-md leading-relaxed font-sans">
          Esta aula é fundamentada em documentação técnica aprofundada, sínteses conceituais e guias passo a passo. Siga o roteiro de estudos detalhado logo abaixo.
        </p>
      </div>
    );
  }

  // 3. CASO DE ERRO DE ID OU FALHA IRRECUPERÁVEL
  if (!youtubeVideoId || hasError) {
    return (
      <div
        className={cn(
          "relative w-full aspect-video rounded-xl overflow-hidden",
          "bg-[#0A0A0B] border border-red-900/40 shadow-2xl",
          "blueprint-corners bg-grid-sm",
          "flex flex-col items-center justify-center p-6 sm:p-10 text-center select-none",
          className
        )}
      >
        <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-red-950/40 border border-red-800/50 text-red-400 mb-4 shadow-inner">
          <AlertTriangle className="w-7 h-7" />
        </div>
        <h3 className="text-lg sm:text-xl font-bold text-zinc-100 font-display mb-2">
          Não foi possível inicializar o reprodutor de vídeo
        </h3>
        <p className="text-xs sm:text-sm text-zinc-400 max-w-md mb-6 font-sans">
          Ocorreu uma instabilidade ao conectar com o serviço do YouTube ou o identificador da aula está indisponível temporariamente.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => {
              setHasError(false);
              setIsLoading(true);
              setRetryKey((k) => k + 1);
            }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-mono transition cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Tentar Novamente</span>
          </button>
          {youtubeVideoId && (
            <a
              href={`https://www.youtube.com/watch?v=${encodeURIComponent(youtubeVideoId)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-red-950/70 hover:bg-red-900/80 border border-red-800 text-red-200 text-xs font-mono transition"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Assistir no YouTube</span>
            </a>
          )}
        </div>
      </div>
    );
  }

  // 4. REPRODUTOR RESPONSIVO 16:9 ATIVO COM IFRAME DO YOUTUBE
  const embedUrl = buildPrivacyEnhancedEmbedUrl(youtubeVideoId);

  return (
    <div
      className={cn(
        "relative w-full aspect-video rounded-xl overflow-hidden",
        "bg-[#0A0A0B] border border-white/[0.08] shadow-2xl",
        className
      )}
    >
      {/* SKELETON / LOADING STATE ENQUANTO O IFRAME INICIALIZA */}
      {isLoading && (
        <div
          className={cn(
            "absolute inset-0 z-10 flex flex-col items-center justify-center",
            "bg-[#111113] bg-grid-sm blueprint-corners transition-opacity duration-500",
            "p-6 text-center select-none"
          )}
        >
          {/* Indicador de carregamento e rotor */}
          <div className="relative flex items-center justify-center w-14 h-14 rounded-2xl bg-zinc-900 border border-white/[0.1] mb-4 shadow-lg">
            <Loader2 className="w-7 h-7 text-zinc-400 animate-spin" />
          </div>

          <div className="space-y-1 mb-3">
            <p className="label-mono text-zinc-400 text-xs">
              SISTEMA AUTÔNOMOS • STREAM DE VÍDEO
            </p>
            <h4 className="text-base sm:text-lg font-semibold text-zinc-200 font-display">
              {title || "Carregando aula..."}
            </h4>
          </div>

          {/* Badge de Legenda PT-BR ativa */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-mono bg-emerald-950/60 text-emerald-400 border border-emerald-800/60">
            <Subtitles className="w-3.5 h-3.5" />
            <span>LEGENDAS EM PORTUGUÊS (PT-BR) ATIVADAS</span>
          </div>

          {/* Barra de shimmer técnica no rodapé do skeleton */}
          <div className="absolute bottom-0 inset-x-0 h-1 bg-zinc-800 overflow-hidden">
            <div className="h-full w-1/3 bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent animate-pulse" />
          </div>
        </div>
      )}

      {/* IFRAME PRIVACY-ENHANCED COM PARÂMETROS R4 */}
      <iframe
        key={`${youtubeVideoId}-${retryKey}`}
        src={embedUrl}
        title={title ? `Vídeo da aula: ${title}` : "Reprodutor de Vídeo ROS 2 - UFRJ Autônomos"}
        className={cn(
          "absolute inset-0 w-full h-full border-0 transition-opacity duration-500",
          isLoading ? "opacity-0" : "opacity-100"
        )}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
        loading="lazy"
        onLoad={() => {
          setIsLoading(false);
          if (onReady) onReady();
        }}
        onError={() => {
          setIsLoading(false);
          setHasError(true);
        }}
      />
    </div>
  );
}
