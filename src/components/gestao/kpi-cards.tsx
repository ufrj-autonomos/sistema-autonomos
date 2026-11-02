import { Users, Bot, GraduationCap, Server, ArrowUpRight } from "lucide-react";
import type { KpiMetrics } from "./types";

interface KpiCardsProps {
  kpis: KpiMetrics;
}

export function KpiCards({ kpis }: KpiCardsProps) {
  const cards = [
    {
      title: "Total de Integrantes",
      value: kpis.totalMembers,
      sublabel: kpis.totalMembersLabel,
      icon: Users,
      badge: "Ativos",
      gradient: "from-zinc-500/10 to-transparent",
      borderColor: "border-white/10",
      iconColor: "text-zinc-300",
    },
    {
      title: "Projetos de Robótica",
      value: kpis.activeProjects,
      sublabel: kpis.activeProjectsLabel,
      icon: Bot,
      badge: "Harpia & Nautilus",
      gradient: "from-purple-500/10 to-blue-500/10",
      borderColor: "border-purple-500/20",
      iconColor: "text-purple-400",
    },
    {
      title: "Alunos no Ensino",
      value: kpis.totalStudents,
      sublabel: kpis.totalStudentsLabel,
      icon: GraduationCap,
      badge: "ROS 2 Jazzy",
      gradient: "from-emerald-500/10 to-transparent",
      borderColor: "border-emerald-500/20",
      iconColor: "text-emerald-400",
    },
    {
      title: "Uptime da Plataforma",
      value: kpis.platformUptime,
      sublabel: `PostgreSQL (${kpis.dbLatencyMs}ms)`,
      icon: Server,
      badge: kpis.platformStatus === "online" ? "Sistemas OK" : "Degradado",
      gradient: "from-blue-500/10 to-transparent",
      borderColor: "border-blue-500/20",
      iconColor: "text-blue-400",
    },
  ];

  return (
    <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
      {cards.map((card, idx) => {
        const Icon = card.icon;
        return (
          <div
            key={idx}
            className={`relative overflow-hidden rounded-xl border ${card.borderColor} bg-[#111113] p-5 transition-all duration-200 hover:border-white/20 hover:-translate-y-0.5 blueprint-corners`}
          >
            {/* Blueprint Grid Overlay */}
            <div className="absolute inset-0 bg-grid opacity-20 pointer-events-none" />

            {/* Header do Card */}
            <div className="relative flex items-center justify-between">
              <span className="font-mono text-xs uppercase tracking-wider text-zinc-400">
                {card.title}
              </span>
              <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-[#18181B]">
                <Icon className={`h-4 w-4 ${card.iconColor}`} />
              </div>
            </div>

            {/* Valor Principal */}
            <div className="relative mt-3">
              <div className="font-display text-3xl font-extrabold tracking-tight text-white tabular">
                {card.value}
              </div>
              <p className="mt-1 font-mono text-xs text-zinc-400">
                {card.sublabel}
              </p>
            </div>

            {/* Badge de Rodapé */}
            <div className="relative mt-4 flex items-center justify-between border-t border-white/5 pt-3">
              <span className="inline-flex items-center rounded-md bg-white/5 px-2 py-0.5 font-mono text-[10px] text-zinc-300">
                {card.badge}
              </span>
              <span className="font-mono text-[10px] text-zinc-500 flex items-center gap-0.5">
                Tempo Real
                <ArrowUpRight className="h-3 w-3" />
              </span>
            </div>
          </div>
        );
      })}
    </section>
  );
}

// Export alias for consistency
export { KpiCards as KpiMetricCards };
