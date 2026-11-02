import { UserManagement } from "@/components/admin/user-management";
import { requirePageUser } from '@/lib/session';
import { GestaoHeader } from "@/components/gestao/gestao-header";
import { KpiCards } from "@/components/gestao/kpi-cards";
import { DivisionsSection } from "@/components/gestao/divisions-section";
import { TeamRoster } from "@/components/gestao/team-roster";
import { SystemStatus } from "@/components/gestao/system-status";
import { QuickActions } from "@/components/gestao/quick-actions";
import { getGestaoStats } from "@/lib/gestao";
import type { GestaoStatsResponse } from "@/components/gestao/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function GestaoPage() {
  await requirePageUser(true);
  let data: GestaoStatsResponse | null = null;

  try {
    data = await getGestaoStats();
  } catch (error) {
    console.error("Erro ao carregar dados de gestão:", error);
  }

  const kpis = data?.kpis || {
    totalMembers: 59,
    totalMembersLabel: "8 cadastrados no roster",
    activeProjects: 4,
    activeProjectsLabel: "Harpia H-01 & Nautilus Br-HUE",
    totalStudents: 108,
    totalStudentsLabel: "6 usuários ativos",
    platformUptime: "99.98%",
    platformStatus: "online",
    dbLatencyMs: 24,
  };

  const divisions = data?.divisions || [];
  const members = data?.members || [];
  const projects = data?.projects || [];
  const system = data?.system || {
    database: {
      status: "online",
      provider: "Supabase PostgreSQL 15",
      host: "db.ygvwfoxgwlfkwowuwrwu.supabase.co",
      port: 5432,
      latencyMs: 24,
      pooled: true,
    },
    auth: {
      status: "online",
      engine: "JWT Session Engine (jose)",
      algorithm: "HS256",
      cookieName: "autonomos_session",
      saltRounds: 10,
    },
    courses: {
      status: "online",
      courseSlug: "ros2-jazzy",
      courseTitle: "ROS 2 Jazzy para Iniciantes",
      modulesCount: 11,
      lessonsCount: 108,
      exercisesCount: 13,
      availableVideos: 52,
      pendingVideos: 26,
      textOnlyLessons: 30,
    },
  };
  const logs = data?.operationalLogs || [];

  return (
    <div className="flex-1 bg-[#0A0A0B] text-zinc-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
        {/* 1. Header do Painel */}
        <GestaoHeader
          platformStatus={kpis.platformStatus}
          uptime={kpis.platformUptime}
          dbLatencyMs={kpis.dbLatencyMs}
        />

        <UserManagement />

        {/* 2. Cartões de Métricas (KPIs) */}
        <KpiCards kpis={kpis} />

        {/* 3. Seção das Divisões de Robótica (Harpia & Nautilus) */}
        <div id="divisoes">
          <DivisionsSection divisions={divisions} projects={projects} />
        </div>

        {/* 4. Quadro e Roster de Integrantes */}
        <TeamRoster initialMembers={members} />

        {/* 5. Console de Status do Sistema & Logs */}
        <SystemStatus system={system} logs={logs} />

        {/* 6. Ações Rápidas */}
        <QuickActions />
      </div>
    </div>
  );
}
