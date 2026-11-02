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

  if (!data) {
    return <div className="mx-auto w-full max-w-7xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="font-display text-3xl font-semibold">Gestão</h1>
      <p role="alert" className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-amber-200">Não foi possível consultar os indicadores. Atualize a página para tentar novamente.</p>
      <UserManagement />
    </div>;
  }
  const { kpis, divisions, members, projects, system, operationalLogs: logs } = data;

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
