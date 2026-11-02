"use client";

import Link from "next/link";
import { ArrowLeft, Activity, BookOpen } from "lucide-react";

interface GestaoHeaderProps {
  platformStatus: "online" | "degraded" | "offline";
  uptime: string;
  dbLatencyMs: number;
}

export function GestaoHeader({ platformStatus, dbLatencyMs }: GestaoHeaderProps) {
  return (
    <header className="relative border-b border-white/10 bg-[#0A0A0B]/80 backdrop-blur-md pb-6 pt-2">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Lado Esquerdo: Identidade do Subsistema */}
        <div className="flex items-start gap-4">
          <Link
            href="/"
            aria-label="Voltar à página inicial"
            className="mt-1 flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-[#111113] text-zinc-400 hover:border-white/20 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 font-mono text-[11px] font-medium text-emerald-400">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
                </span>
                <span>SUBSISTEMA DE GESTÃO & OPERAÇÕES</span>
              </span>

              <span className="font-mono text-xs text-zinc-500">•</span>
              <span className="font-mono text-xs text-zinc-400">UFRJ AUTÔNOMOS</span>
            </div>

            <h1 className="mt-1.5 font-display text-2xl sm:text-3xl font-bold tracking-tight text-white">
              Painel Executivo & Operações
            </h1>
            <p className="mt-1 text-sm text-zinc-400 max-w-2xl">
              Monitoramento centralizado de divisões robóticas (Harpia & Nautilus), integrantes, projetos de engenharia e integridade da infraestrutura.
            </p>
          </div>
        </div>

        {/* Lado Direito: Telemetria Rápida e Ações */}
        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-[#111113] px-3.5 py-2 font-mono text-xs text-zinc-300">
            <Activity className="h-4 w-4 text-emerald-400" />
            <span>Banco: <strong className="text-white">{platformStatus === "online" ? "Online" : platformStatus === "degraded" ? "Degradado" : "Offline"}</strong></span>
            <span className="text-zinc-600">|</span>
            <span>Ping: <strong className="text-emerald-400">{dbLatencyMs}ms</strong></span>
          </div>

          <Link
            href="/ensino"
            className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-xs font-semibold text-black hover:bg-zinc-200 transition-colors shadow-sm"
          >
            <BookOpen className="h-4 w-4" />
            <span>Plataforma de Ensino</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
