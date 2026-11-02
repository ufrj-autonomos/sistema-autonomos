import { Plane, Waves, Cpu, Radio, Award } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import type { DivisionData, ProjectRecord } from "./types";

interface DivisionsSectionProps {
  divisions: DivisionData[];
  projects: ProjectRecord[];
}

export function DivisionsSection({ divisions, projects }: DivisionsSectionProps) {
  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="inline-flex items-center gap-1.5 font-mono text-xs uppercase tracking-wider text-zinc-400">
            <Radio className="h-3.5 w-3.5 text-zinc-400" />
            <span>ENGENHARIA E OPERAÇÕES DE CAMPO</span>
          </div>
          <h2 className="font-display text-xl sm:text-2xl font-bold text-white mt-1">
            Divisões de Robótica Autônoma
          </h2>
        </div>
        <span className="font-mono text-xs text-zinc-500 hidden sm:inline-block">
          UAV (Aéreo) • AUV (Subaquático)
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {divisions.map((div) => {
          const isHarpia = div.slug === "harpia";
          const divProjects = projects.filter((p) => p.division === div.slug);

          return (
            <div
              key={div.slug}
              id={div.slug}
              className={`relative overflow-hidden rounded-2xl border blueprint-corners ${
                isHarpia
                  ? "border-purple-500/30 bg-[#100318]/90"
                  : "border-blue-500/30 bg-[#021829]/90"
              } p-6 sm:p-7 flex flex-col justify-between transition-all duration-200 hover:border-white/30`}
            >
              {/* Grid de fundo */}
              <div className="absolute inset-0 bg-grid opacity-20 pointer-events-none" />

              <div>
                {/* Header da Divisão */}
                <div className="flex items-start justify-between gap-4 pb-5 border-b border-white/10">
                  <div className="flex items-center gap-3.5">
                    <div
                      className={`flex h-12 w-12 items-center justify-center rounded-xl border p-1 ${
                        isHarpia
                          ? "border-purple-500/40 bg-purple-900/30"
                          : "border-blue-500/40 bg-blue-900/30"
                      }`}
                    >
                      <Logo division={div.slug} variant="badge" size="sm" />
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-display text-lg sm:text-xl font-bold text-white">
                          {div.name}
                        </h3>
                        <span className="font-mono text-[11px] text-zinc-400">
                          (desde {div.founded})
                        </span>
                      </div>
                      <p className="font-mono text-xs text-zinc-400">
                        {div.fullName}
                      </p>
                    </div>
                  </div>

                  {/* Status Beacon */}
                  <div
                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-mono text-xs font-semibold ${
                      div.statusType === "operational"
                        ? "border border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
                        : "border border-blue-400/40 bg-blue-500/10 text-blue-300"
                    }`}
                  >
                    <span className="relative flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-current opacity-75"></span>
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-current"></span>
                    </span>
                    <span>{div.status}</span>
                  </div>
                </div>

                {/* Resumo */}
                <p className="mt-4 text-xs sm:text-sm text-zinc-300 leading-relaxed">
                  {div.summary}
                </p>

                {/* Especificações de Hardware & Sensores */}
                <div className="mt-5 space-y-2.5 rounded-xl border border-white/10 bg-black/40 p-4">
                  <div className="flex items-center gap-2 font-mono text-xs text-zinc-400">
                    <Cpu className="h-3.5 w-3.5 text-zinc-300" />
                    <span className="uppercase font-semibold tracking-wider text-zinc-200">
                      Arquitetura de Engenharia & Sensores:
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 font-mono text-xs">
                    <div>
                      <span className="text-zinc-500">Computação:</span>{" "}
                      <span className="text-zinc-200">{div.specs.computing}</span>
                    </div>
                    <div>
                      <span className="text-zinc-500">Autopiloto:</span>{" "}
                      <span className="text-zinc-200">{div.specs.autopilot}</span>
                    </div>
                    <div className="sm:col-span-2">
                      <span className="text-zinc-500">Estrutura:</span>{" "}
                      <span className="text-zinc-200">{div.specs.frame}</span>
                    </div>
                    <div className="sm:col-span-2">
                      <span className="text-zinc-500">Sensores:</span>{" "}
                      <span className="text-zinc-200">{div.specs.sensors.join(" • ")}</span>
                    </div>
                  </div>

                  {/* Software Stack Chips */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-white/5">
                    {div.specs.softwareStack.map((tech, i) => (
                      <span
                        key={i}
                        className={`rounded px-2 py-0.5 font-mono text-[10px] ${
                          isHarpia
                            ? "bg-purple-950/60 text-purple-200 border border-purple-500/30"
                            : "bg-blue-950/60 text-blue-200 border border-blue-500/30"
                        }`}
                      >
                        {tech}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Projetos em Andamento */}
                <div className="mt-5">
                  <h4 className="font-mono text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2.5">
                    Projetos Ativos da Divisão:
                  </h4>
                  <div className="space-y-2">
                    {divProjects.map((proj) => (
                      <div
                        key={proj.id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-lg border border-white/10 bg-black/20 hover:border-white/20 transition-colors"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-xs sm:text-sm text-white">
                              {proj.name}
                            </span>
                            <span className="font-mono text-[10px] text-zinc-400">
                              ({proj.year})
                            </span>
                          </div>
                          <p className="text-xs text-zinc-400 mt-0.5 line-clamp-1">
                            {proj.tagline}
                          </p>
                        </div>
                        <span
                          className={`font-mono text-[10px] uppercase font-medium px-2 py-0.5 rounded shrink-0 self-start sm:self-auto ${
                            proj.status.includes("Operacional")
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                              : proj.status.includes("tanque")
                              ? "bg-blue-500/10 text-blue-300 border border-blue-500/20"
                              : "bg-zinc-800 text-zinc-300 border border-zinc-700"
                          }`}
                        >
                          {proj.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Rodapé da Divisão: Métricas e Competições */}
              <div className="mt-6 pt-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-4 font-mono text-xs text-zinc-400">
                <div className="flex items-center gap-4">
                  <span>
                    <strong className="text-white">{div.stats.membersCount}</strong> Integrantes
                  </span>
                  <span>•</span>
                  <span>
                    <strong className="text-white">{div.stats.projectsCount}</strong> Veículos
                  </span>
                </div>

                <div className="flex items-center gap-1.5 text-zinc-300">
                  <Award className="h-3.5 w-3.5 text-amber-400" />
                  <span>{div.competitions.join(" • ")}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
