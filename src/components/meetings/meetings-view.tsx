'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import {
  CalendarCheck,
  Plus,
  Users,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Clock,
  ChevronRight,
  TrendingUp,
  Award,
  Trash2,
  Calendar,
  X,
  Edit2,
  Filter,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SafeUser } from '@/contexts/auth-context';

export interface AreaSummary {
  area: string;
  teamId: number | null;
  label: string;
  teamSlug: 'nautilus' | 'harpia' | 'autonomos';
  icon: string;
  coordinator: string;
  meetingsCount: number;
  membersCount: number;
  presences: number;
  absences: number;
  pct: number;
  status: { label: string; tone: 'green' | 'yellow' | 'red' | 'gray' };
}

export interface DetailedArea {
  def: {
    area: string;
    teamId: number | null;
    label: string;
    teamSlug: 'nautilus' | 'harpia' | 'autonomos';
    icon: string;
    coordinator?: string;
  };
  meetings: {
    id: string;
    title: string;
    date: string;
    description: string | null;
  }[];
  members: {
    id: string;
    name: string;
    avatar: string | null;
    attendances: Record<
      string,
      {
        status: 'PRESENT' | 'ABSENT' | 'JUSTIFIED' | 'LATE' | 'NO_MEETING';
        notes: string | null;
        attendanceId: string;
      }
    >;
    presences: number;
    absences: number;
    total: number;
    pct: number;
    status: { label: string; tone: 'green' | 'yellow' | 'red' | 'gray' };
  }[];
}

export interface MeetingsData {
  period: string;
  isAdmin: boolean;
  visibleAreas: {
    area: string;
    teamId: number | null;
    label: string;
    teamSlug: 'nautilus' | 'harpia' | 'autonomos';
    icon: string;
    coordinator?: string;
  }[];
  overview: {
    totalMembers: number;
    totalMeetings: number;
    totalPresences: number;
    totalAbsences: number;
    overallRate: number;
    overallStatus: { label: string; tone: 'green' | 'yellow' | 'red' | 'gray' };
    perfectCount: number;
    areaSummaries: AreaSummary[];
    lowFrequencyMembers: {
      id: string;
      name: string;
      avatar: string | null;
      area: string;
      teamId: number | null;
      presences: number;
      absences: number;
      meetings: number;
      pct: number;
    }[];
    perfectFrequencyMembers: {
      id: string;
      name: string;
      avatar: string | null;
      area: string;
      teamId: number | null;
      presences: number;
      absences: number;
      meetings: number;
      pct: number;
    }[];
  };
  detailedAreas: DetailedArea[];
}

const STATUS_CONFIG = {
  PRESENT: {
    code: 'P',
    label: 'Presente',
    desc: '1.0 ponto de presença',
    badge: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/25',
  },
  JUSTIFIED: {
    code: 'J',
    label: 'Justificada',
    desc: '1.0 ponto de presença',
    badge: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30 hover:bg-blue-500/25',
  },
  LATE: {
    code: 'A',
    label: 'Atraso',
    desc: '0.5 pres. / 0.5 falta',
    badge: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/25',
  },
  ABSENT: {
    code: 'F',
    label: 'Falta',
    desc: '1.0 ponto de falta',
    badge: 'bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30 hover:bg-red-500/25',
  },
  NO_MEETING: {
    code: 'S',
    label: 'Sem Reunião',
    desc: 'Desconsiderado',
    badge: 'bg-zinc-500/15 text-zinc-500 border-zinc-500/30 hover:bg-zinc-500/25',
  },
};

export function MeetingsView({
  initialData,
  user,
}: {
  initialData: MeetingsData;
  user: SafeUser;
}) {
  const [data, setData] = useState<MeetingsData>(initialData);
  const [activeTab, setActiveTab] = useState<string>('painel');
  const [isPending, startTransition] = useTransition();

  // Modal para Nova Reunião
  const [isNewMeetingModalOpen, setIsNewMeetingModalOpen] = useState(false);
  const [newMeetingArea, setNewMeetingArea] = useState<{ area: string; teamId: number | null } | null>(null);
  const [newMeetingTitle, setNewMeetingTitle] = useState('');
  const [newMeetingDate, setNewMeetingDate] = useState(new Date().toISOString().slice(0, 10));
  const [newMeetingDescription, setNewMeetingDescription] = useState('');
  const [savingMeeting, setSavingMeeting] = useState(false);

  // Modal de Confirmação para Alterar Presença (conforme diretriz do usuário)
  const [attendanceModal, setAttendanceModal] = useState<{
    isOpen: boolean;
    meetingId: string;
    meetingTitle: string;
    memberId: string;
    memberName: string;
    currentStatus: 'PRESENT' | 'ABSENT' | 'JUSTIFIED' | 'LATE' | 'NO_MEETING';
    newStatus: 'PRESENT' | 'ABSENT' | 'JUSTIFIED' | 'LATE' | 'NO_MEETING';
    notes: string;
  } | null>(null);

  const refreshData = async () => {
    try {
      const res = await fetch(`/api/reunioes?period=${data.period}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error('Erro ao recarregar:', err);
    }
  };

  const openNewMeetingModal = (area: string, teamId: number | null) => {
    setNewMeetingArea({ area, teamId });
    setNewMeetingTitle(`Reunião ${(data.detailedAreas.find(d => d.def.area === area && d.def.teamId === teamId)?.meetings.length || 0) + 1}`);
    setNewMeetingDate(new Date().toISOString().slice(0, 10));
    setNewMeetingDescription('');
    setIsNewMeetingModalOpen(true);
  };

  const handleCreateMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMeetingArea || !newMeetingTitle || !newMeetingDate) return;

    setSavingMeeting(true);
    try {
      const res = await fetch('/api/reunioes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newMeetingTitle,
          date: newMeetingDate,
          area: newMeetingArea.area,
          teamId: newMeetingArea.teamId,
          period: data.period,
          description: newMeetingDescription,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Erro ao criar reunião.');
      }

      toast.success('Reunião criada com sucesso!');
      setIsNewMeetingModalOpen(false);
      await refreshData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao salvar reunião';
      toast.error(msg);
    } finally {
      setSavingMeeting(false);
    }
  };

  const handleDeleteMeeting = async (meetingId: string, meetingTitle: string) => {
    if (!confirm(`Deseja realmente excluir a "${meetingTitle}" e todas as suas marcações de presença?`)) return;

    try {
      const res = await fetch(`/api/reunioes/${meetingId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Falha ao excluir reunião.');
      toast.success('Reunião excluída.');
      await refreshData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao excluir';
      toast.error(msg);
    }
  };

  const triggerChangeAttendance = (
    meetingId: string,
    meetingTitle: string,
    memberId: string,
    memberName: string,
    currentStatus: 'PRESENT' | 'ABSENT' | 'JUSTIFIED' | 'LATE' | 'NO_MEETING',
    newStatus: 'PRESENT' | 'ABSENT' | 'JUSTIFIED' | 'LATE' | 'NO_MEETING'
  ) => {
    if (!data.isAdmin) return;
    setAttendanceModal({
      isOpen: true,
      meetingId,
      meetingTitle,
      memberId,
      memberName,
      currentStatus,
      newStatus,
      notes: '',
    });
  };

  const confirmAttendanceChange = async () => {
    if (!attendanceModal) return;

    const { meetingId, memberId, newStatus, notes } = attendanceModal;
    setAttendanceModal(null);

    // Atualização otimista
    setData((prev) => {
      const next = structuredClone(prev);
      for (const da of next.detailedAreas) {
        for (const m of da.members) {
          if (m.id === memberId && m.attendances[meetingId]) {
            m.attendances[meetingId].status = newStatus;
          }
        }
      }
      return next;
    });

    try {
      const res = await fetch(`/api/reunioes/${meetingId}/presenca`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberId, status: newStatus, notes }),
      });

      if (!res.ok) throw new Error('Erro ao salvar presença');
      toast.success('Presença atualizada!');
      await refreshData();
    } catch {
      toast.error('Erro ao salvar. Revertendo alteração.');
      await refreshData();
    }
  };

  const activeDetailedArea = data.detailedAreas.find(
    (da) => `${da.def.area}-${da.def.teamId}` === activeTab
  );

  return (
    <div className="container max-w-7xl mx-auto px-4 py-8 space-y-8 animate-in fade-in duration-300">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20">
              <CalendarCheck className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
                Contabilidade de Reuniões & Presença
                <span className="text-xs font-mono font-medium px-2.5 py-0.5 rounded-full bg-accent border border-border text-foreground">
                  Período {data.period}
                </span>
              </h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                Consolidado operacional e gestão de frequência das áreas da UFRJ Autônomos.
              </p>
            </div>
          </div>
        </div>

        {/* Team Indicator */}
        <div className="flex items-center gap-2">
          {user.teamSlug === 'harpia' && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-purple-950/40 text-purple-200 border border-purple-500/30 text-xs">
              <span className="text-base">☁️</span>
              <span>Divisão Harpia</span>
            </div>
          )}
          {user.teamSlug === 'nautilus' && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-sky-950/40 text-sky-200 border border-sky-500/30 text-xs">
              <span className="text-base">🌊</span>
              <span>Divisão Nautilus</span>
            </div>
          )}
          {data.isAdmin && (
            <span className="text-xs font-mono font-semibold px-2.5 py-1 rounded-md bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
              Acesso ADMIN (Edição liberada)
            </span>
          )}
        </div>
      </div>

      {/* Navegação de Abas */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 border-b border-border/60 scrollbar-none">
        <button
          type="button"
          onClick={() => setActiveTab('painel')}
          className={cn(
            'flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap cursor-pointer',
            activeTab === 'painel'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted'
          )}
        >
          <span>📊</span>
          <span>Painel Executivo Geral</span>
        </button>

        <div className="h-4 w-px bg-border mx-1" />

        {data.detailedAreas.map((da) => {
          const tabKey = `${da.def.area}-${da.def.teamId}`;
          const isSelected = activeTab === tabKey;
          return (
            <button
              key={tabKey}
              type="button"
              onClick={() => setActiveTab(tabKey)}
              className={cn(
                'flex items-center gap-2 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap cursor-pointer border',
                isSelected
                  ? 'bg-accent text-foreground border-border shadow-xs'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50 border-transparent'
              )}
            >
              <span>{da.def.icon}</span>
              <span>{da.def.label}</span>
              <span className="text-xs opacity-75 font-mono">
                ({da.meetings.length})
              </span>
            </button>
          );
        })}
      </div>

      {/* ABA: PAINEL EXECUTIVO */}
      {activeTab === 'painel' && (
        <div className="space-y-8 animate-in fade-in duration-200">
          {/* 4 Cards de Métricas Gerais */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="p-5 rounded-xl border border-border bg-card shadow-xs space-y-2">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-medium uppercase tracking-wider">Total de Membros</span>
                <Users className="h-4 w-4" />
              </div>
              <div className="text-3xl font-bold tracking-tight text-foreground">
                {data.overview.totalMembers}
              </div>
              <p className="text-xs text-muted-foreground">
                Integrantes ativos no período {data.period}
              </p>
            </div>

            <div className="p-5 rounded-xl border border-border bg-card shadow-xs space-y-2">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-medium uppercase tracking-wider">Reuniões Realizadas</span>
                <Calendar className="h-4 w-4" />
              </div>
              <div className="text-3xl font-bold tracking-tight text-foreground">
                {data.overview.totalMeetings}
              </div>
              <p className="text-xs text-muted-foreground">
                Reuniões contabilizadas em todas as áreas
              </p>
            </div>

            <div className="p-5 rounded-xl border border-border bg-card shadow-xs space-y-2">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-medium uppercase tracking-wider">Taxa Geral de Presença</span>
                <TrendingUp className="h-4 w-4" />
              </div>
              <div className="flex items-baseline gap-2">
                <div className="text-3xl font-bold tracking-tight text-foreground">
                  {data.overview.overallRate}%
                </div>
                <span
                  className={cn(
                    'text-xs px-2 py-0.5 rounded-full font-medium',
                    data.overview.overallStatus.tone === 'green' && 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
                    data.overview.overallStatus.tone === 'yellow' && 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
                    data.overview.overallStatus.tone === 'red' && 'bg-red-500/15 text-red-600 dark:text-red-400'
                  )}
                >
                  {data.overview.overallStatus.label}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                {data.overview.totalPresences} presenças / {data.overview.totalAbsences} faltas totais
              </p>
            </div>

            <div className="p-5 rounded-xl border border-border bg-card shadow-xs space-y-2">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-medium uppercase tracking-wider">Frequência 100%</span>
                <Award className="h-4 w-4" />
              </div>
              <div className="text-3xl font-bold tracking-tight text-foreground">
                {data.overview.perfectCount}
              </div>
              <p className="text-xs text-muted-foreground">
                Integrantes com presença perfeita
              </p>
            </div>
          </div>

          {/* Tabela Consolidada das Áreas */}
          <div className="rounded-xl border border-border bg-card shadow-xs overflow-hidden">
            <div className="p-5 border-b border-border flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-foreground">
                  Consolidado das Áreas Operacionais
                </h2>
                <p className="text-xs text-muted-foreground">
                  Desempenho comparativo entre as coordenações e áreas da equipe.
                </p>
              </div>
              <span className="text-xs font-mono text-muted-foreground">
                Meta mínima: ≥ 75% | Meta excelência: ≥ 85%
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-muted/50 text-muted-foreground text-xs font-medium uppercase tracking-wider border-b border-border">
                  <tr>
                    <th className="px-5 py-3.5">Área Operacional</th>
                    <th className="px-4 py-3.5">Coordenação</th>
                    <th className="px-4 py-3.5 text-center">Reuniões</th>
                    <th className="px-4 py-3.5 text-center">Membros</th>
                    <th className="px-4 py-3.5 text-center">Presenças</th>
                    <th className="px-4 py-3.5 text-center">Faltas</th>
                    <th className="px-5 py-3.5">% Presença</th>
                    <th className="px-5 py-3.5">Status</th>
                    <th className="px-4 py-3.5 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {data.overview.areaSummaries.map((summary) => (
                    <tr
                      key={`${summary.area}-${summary.teamId}`}
                      className="hover:bg-muted/40 transition-colors"
                    >
                      <td className="px-5 py-4 font-medium text-foreground flex items-center gap-2.5">
                        <span className="text-lg">{summary.icon}</span>
                        <div>
                          <span>{summary.label}</span>
                          {summary.teamSlug === 'harpia' && (
                            <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-purple-900/30 text-purple-300 border border-purple-500/20">
                              Harpia
                            </span>
                          )}
                          {summary.teamSlug === 'nautilus' && (
                            <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-sky-900/30 text-sky-300 border border-sky-500/20">
                              Nautilus
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-muted-foreground">
                        {summary.coordinator}
                      </td>
                      <td className="px-4 py-4 text-center font-mono font-medium">
                        {summary.meetingsCount}
                      </td>
                      <td className="px-4 py-4 text-center font-mono text-muted-foreground">
                        {summary.membersCount}
                      </td>
                      <td className="px-4 py-4 text-center font-mono text-emerald-600 dark:text-emerald-400">
                        {summary.presences}
                      </td>
                      <td className="px-4 py-4 text-center font-mono text-red-600 dark:text-red-400">
                        {summary.absences}
                      </td>
                      <td className="px-5 py-4">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-xs font-mono font-semibold">
                            <span>{summary.pct}%</span>
                          </div>
                          <div className="h-1.5 w-28 bg-muted rounded-full overflow-hidden">
                            <div
                              className={cn(
                                'h-full rounded-full transition-all',
                                summary.pct >= 85 && 'bg-emerald-500',
                                summary.pct >= 75 && summary.pct < 85 && 'bg-amber-500',
                                summary.pct < 75 && 'bg-red-500'
                              )}
                              style={{ width: `${Math.min(100, summary.pct)}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={cn(
                            'inline-flex items-center text-xs px-2.5 py-1 rounded-full font-medium',
                            summary.status.tone === 'green' && 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
                            summary.status.tone === 'yellow' && 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
                            summary.status.tone === 'red' && 'bg-red-500/15 text-red-600 dark:text-red-400',
                            summary.status.tone === 'gray' && 'bg-muted text-muted-foreground'
                          )}
                        >
                          {summary.status.label}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-right">
                        {data.detailedAreas.some(
                          (d) => d.def.area === summary.area && d.def.teamId === summary.teamId
                        ) ? (
                          <button
                            type="button"
                            onClick={() => setActiveTab(`${summary.area}-${summary.teamId}`)}
                            className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline cursor-pointer"
                          >
                            <span>Ver planilha</span>
                            <ChevronRight className="h-3.5 w-3.5" />
                          </button>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">
                            Sem acesso
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Duas Colunas: Ranking Top 100% e Alertas de Frequência */}
          <div className="grid gap-6 md:grid-cols-2">
            {/* Membros com 100% de Presença */}
            <div className="rounded-xl border border-border bg-card p-5 space-y-4 shadow-xs">
              <div className="flex items-center gap-2">
                <span className="text-xl">⭐</span>
                <div>
                  <h3 className="text-base font-semibold text-foreground">
                    Frequência Perfeita (100% de Presença)
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Integrantes exemplares que compareceram a todas as reuniões.
                  </p>
                </div>
              </div>

              <div className="divide-y divide-border/60">
                {data.overview.perfectFrequencyMembers.map((member, idx) => (
                  <div
                    key={member.id}
                    className="py-2.5 flex items-center justify-between text-sm"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-5 text-center font-mono text-xs text-muted-foreground">
                        #{idx + 1}
                      </span>
                      <div>
                        <span className="font-medium text-foreground">{member.name}</span>
                        <span className="block text-xs text-muted-foreground">
                          {member.area}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                        {member.meetings} reuniões (100%)
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Acompanhamento Prioritário (Menor Frequência) */}
            <div className="rounded-xl border border-border bg-card p-5 space-y-4 shadow-xs">
              <div className="flex items-center gap-2">
                <span className="text-xl">⚠️</span>
                <div>
                  <h3 className="text-base font-semibold text-foreground">
                    Acompanhamento Prioritário (Menor Frequência)
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Integrantes com frequência abaixo de 75% no período.
                  </p>
                </div>
              </div>

              <div className="divide-y divide-border/60">
                {data.overview.lowFrequencyMembers.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">
                    Nenhum integrante com presença abaixo de 75%! Excelente trabalho.
                  </p>
                ) : (
                  data.overview.lowFrequencyMembers.map((member, idx) => (
                    <div
                      key={member.id}
                      className="py-2.5 flex items-center justify-between text-sm"
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-5 text-center font-mono text-xs text-red-500 font-semibold">
                          #{idx + 1}
                        </span>
                        <div>
                          <span className="font-medium text-foreground">{member.name}</span>
                          <span className="block text-xs text-muted-foreground">
                            {member.area}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-mono font-semibold text-red-600 dark:text-red-400">
                          {member.pct.toFixed(1)}% ({member.absences} faltas)
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Diretrizes do Período */}
          <div className="rounded-xl border border-border bg-accent/30 p-5 space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <HelpCircle className="h-4 w-4" />
              Diretrizes & Regras de Contabilidade (Período {data.period})
            </h4>
            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4 text-xs text-muted-foreground">
              <div className="p-3 rounded-lg bg-card border border-border">
                <span className="font-semibold text-foreground block mb-1">
                  [P] Presente & [J] Justificada
                </span>
                Somam 1.0 ponto de presença integral na contabilidade.
              </div>
              <div className="p-3 rounded-lg bg-card border border-border">
                <span className="font-semibold text-foreground block mb-1">
                  [A] Atraso
                </span>
                Contabiliza 0.5 de presença e 0.5 de falta no cálculo proporcional.
              </div>
              <div className="p-3 rounded-lg bg-card border border-border">
                <span className="font-semibold text-foreground block mb-1">
                  [F] Falta
                </span>
                Soma 1.0 ponto de falta. Requer atenção da coordenação.
              </div>
              <div className="p-3 rounded-lg bg-card border border-border">
                <span className="font-semibold text-foreground block mb-1">
                  [S] Sem Reunião
                </span>
                Reunião desmarcada ou não realizada (desconsiderada).
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ABA: ÁREA INDIVIDUAL (MATRIZ DE REUNIÕES) */}
      {activeDetailedArea && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Header da Área */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-xl border border-border bg-card">
            <div className="flex items-center gap-3.5">
              <div className="text-3xl p-2 rounded-xl bg-muted border border-border">
                {activeDetailedArea.def.icon}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold text-foreground">
                    Controle de Presença — {activeDetailedArea.def.label}
                  </h2>
                  {activeDetailedArea.def.teamSlug === 'harpia' && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-purple-900/30 text-purple-300 border border-purple-500/20">
                      ☁️ Harpia
                    </span>
                  )}
                  {activeDetailedArea.def.teamSlug === 'nautilus' && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-sky-900/30 text-sky-300 border border-sky-500/20">
                      🌊 Nautilus
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {activeDetailedArea.meetings.length} reuniões registradas •{' '}
                  {activeDetailedArea.members.length} integrantes listados
                </p>
              </div>
            </div>

            {/* Ação ADMIN: Adicionar Reunião */}
            {data.isAdmin && (
              <button
                type="button"
                onClick={() =>
                  openNewMeetingModal(activeDetailedArea.def.area, activeDetailedArea.def.teamId)
                }
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition shadow-xs cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                <span>Nova Reunião</span>
              </button>
            )}
          </div>

          {/* Legenda de Marcações */}
          <div className="flex flex-wrap items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border text-xs">
            <span className="font-semibold text-foreground">Legenda:</span>
            {Object.entries(STATUS_CONFIG).map(([key, config]) => (
              <div key={key} className="flex items-center gap-1.5">
                <span
                  className={cn(
                    'h-5 w-5 rounded flex items-center justify-center font-mono font-bold text-[11px] border',
                    config.badge
                  )}
                >
                  {config.code}
                </span>
                <span className="text-muted-foreground">{config.label}</span>
              </div>
            ))}
            {data.isAdmin && (
              <span className="ml-auto text-amber-600 dark:text-amber-400 font-medium">
                💡 Clique em uma célula para alterar a presença
              </span>
            )}
          </div>

          {/* Matriz de Presença */}
          <div className="rounded-xl border border-border bg-card shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead className="bg-muted/60 text-muted-foreground text-xs font-semibold uppercase tracking-wider border-b border-border">
                  <tr>
                    <th className="px-4 py-3.5 w-12 text-center border-r border-border">#</th>
                    <th className="px-4 py-3.5 min-w-[200px] border-r border-border">Nome do Integrante</th>

                    {/* Colunas das Reuniões */}
                    {activeDetailedArea.meetings.map((meeting, mIdx) => (
                      <th
                        key={meeting.id}
                        className="px-3 py-3 text-center border-r border-border min-w-[70px] relative group"
                        title={meeting.description || `Data: ${new Date(meeting.date).toLocaleDateString('pt-BR')}`}
                      >
                        <div className="flex flex-col items-center">
                          <span className="text-foreground">{mIdx + 1}</span>
                          <span className="text-[10px] text-muted-foreground font-normal">
                            {new Date(meeting.date).toLocaleDateString('pt-BR', {
                              day: '2-digit',
                              month: '2-digit',
                              timeZone: 'UTC',
                            })}
                          </span>
                        </div>
                        {data.isAdmin && (
                          <button
                            type="button"
                            onClick={() => handleDeleteMeeting(meeting.id, meeting.title)}
                            className="hidden group-hover:flex absolute top-1 right-1 h-4 w-4 rounded items-center justify-center text-red-500 hover:bg-red-500/20 cursor-pointer"
                            title="Excluir reunião"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        )}
                      </th>
                    ))}

                    <th className="px-3 py-3.5 text-center border-r border-border min-w-[70px]">Presenças</th>
                    <th className="px-3 py-3.5 text-center border-r border-border min-w-[70px]">Faltas</th>
                    <th className="px-4 py-3.5 text-center border-r border-border min-w-[90px]">% Presença</th>
                    <th className="px-4 py-3.5 text-center min-w-[120px]">Status</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-border/60">
                  {activeDetailedArea.members.length === 0 ? (
                    <tr>
                      <td
                        colSpan={activeDetailedArea.meetings.length + 6}
                        className="p-8 text-center text-muted-foreground"
                      >
                        Nenhum integrante cadastrado nesta área no momento.
                      </td>
                    </tr>
                  ) : (
                    activeDetailedArea.members.map((member, rowIdx) => (
                      <tr
                        key={member.id}
                        className="hover:bg-muted/30 transition-colors"
                      >
                        <td className="px-4 py-3 text-center font-mono text-xs text-muted-foreground border-r border-border">
                          {rowIdx + 1}
                        </td>
                        <td className="px-4 py-3 font-medium text-foreground border-r border-border flex items-center gap-2.5">
                          <div className="h-7 w-7 rounded-full bg-accent border border-border flex items-center justify-center text-xs font-semibold shrink-0">
                            {member.name.slice(0, 1)}
                          </div>
                          <span className="truncate">{member.name}</span>
                        </td>

                        {/* Células de Presença das Reuniões */}
                        {activeDetailedArea.meetings.map((meeting) => {
                          const att = member.attendances[meeting.id];
                          const status = att?.status || 'PRESENT';
                          const config = STATUS_CONFIG[status] || STATUS_CONFIG.PRESENT;

                          return (
                            <td
                              key={meeting.id}
                              className="px-2 py-2 text-center border-r border-border"
                            >
                              {data.isAdmin ? (
                                <div className="relative inline-block group">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      // Ciclo rápido ao clicar: P -> A -> F -> J -> S -> P
                                      const cycle: Record<string, 'PRESENT' | 'LATE' | 'ABSENT' | 'JUSTIFIED' | 'NO_MEETING'> = {
                                        PRESENT: 'LATE',
                                        LATE: 'ABSENT',
                                        ABSENT: 'JUSTIFIED',
                                        JUSTIFIED: 'NO_MEETING',
                                        NO_MEETING: 'PRESENT',
                                      };
                                      const next = cycle[status] || 'PRESENT';
                                      triggerChangeAttendance(
                                        meeting.id,
                                        meeting.title,
                                        member.id,
                                        member.name,
                                        status,
                                        next
                                      );
                                    }}
                                    className={cn(
                                      'h-7 w-7 rounded-md flex items-center justify-center font-mono font-bold text-xs border transition shadow-xs cursor-pointer',
                                      config.badge
                                    )}
                                    title={`Status: ${config.label}. Clique para alterar.`}
                                  >
                                    {config.code}
                                  </button>
                                </div>
                              ) : (
                                <div
                                  className={cn(
                                    'h-7 w-7 mx-auto rounded-md flex items-center justify-center font-mono font-bold text-xs border select-none',
                                    config.badge
                                  )}
                                  title={`Status: ${config.label}`}
                                >
                                  {config.code}
                                </div>
                              )}
                            </td>
                          );
                        })}

                        <td className="px-3 py-3 text-center font-mono font-semibold text-emerald-600 dark:text-emerald-400 border-r border-border">
                          {member.presences}
                        </td>
                        <td className="px-3 py-3 text-center font-mono font-semibold text-red-600 dark:text-red-400 border-r border-border">
                          {member.absences}
                        </td>
                        <td className="px-4 py-3 text-center font-mono font-bold text-foreground border-r border-border">
                          {member.pct.toFixed(1)}%
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span
                            className={cn(
                              'inline-flex items-center text-xs px-2.5 py-0.5 rounded-full font-medium',
                              member.status.tone === 'green' && 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
                              member.status.tone === 'yellow' && 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
                              member.status.tone === 'red' && 'bg-red-500/15 text-red-600 dark:text-red-400',
                              member.status.tone === 'gray' && 'bg-muted text-muted-foreground'
                            )}
                          >
                            {member.status.label}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: NOVA REUNIÃO (ADMIN ONLY) */}
      {isNewMeetingModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-card border border-border rounded-xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                <Plus className="h-5 w-5 text-primary" />
                Criar Nova Reunião
              </h3>
              <button
                type="button"
                onClick={() => setIsNewMeetingModalOpen(false)}
                className="text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateMeeting} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-muted-foreground mb-1">
                  Título da Reunião
                </label>
                <input
                  type="text"
                  required
                  value={newMeetingTitle}
                  onChange={(e) => setNewMeetingTitle(e.target.value)}
                  placeholder="Ex: Reunião 5 — Sprint Planning"
                  className="w-full px-3 py-2 rounded-lg bg-background border border-border text-foreground text-sm focus:outline-hidden focus:ring-2 focus:ring-ring"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-muted-foreground mb-1">
                  Data da Reunião
                </label>
                <input
                  type="date"
                  required
                  value={newMeetingDate}
                  onChange={(e) => setNewMeetingDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-background border border-border text-foreground text-sm focus:outline-hidden focus:ring-2 focus:ring-ring"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-muted-foreground mb-1">
                  Descrição ou Pauta (Opcional)
                </label>
                <textarea
                  rows={3}
                  value={newMeetingDescription}
                  onChange={(e) => setNewMeetingDescription(e.target.value)}
                  placeholder="Pauta da reunião, alinhamentos, links de atas..."
                  className="w-full px-3 py-2 rounded-lg bg-background border border-border text-foreground text-sm focus:outline-hidden focus:ring-2 focus:ring-ring"
                />
              </div>

              <div className="p-3 rounded-lg bg-muted text-xs text-muted-foreground">
                Ao criar a reunião, todos os membros da área serão adicionados automaticamente com o status <strong>[P] Presente</strong>. Você poderá ajustar faltas ou justificativas individualmente na planilha.
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsNewMeetingModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-border text-foreground text-sm font-medium hover:bg-muted cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingMeeting}
                  className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 cursor-pointer"
                >
                  {savingMeeting ? 'Salvando...' : 'Confirmar e Criar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* POP-UP / MODAL: CONFIRMAÇÃO DE MUDANÇA DE PRESENÇA */}
      {attendanceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-card border border-border rounded-xl max-w-sm w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-sm font-bold text-foreground">
                Alterar Presença
              </h3>
              <button
                type="button"
                onClick={() => setAttendanceModal(null)}
                className="text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="text-sm space-y-1">
              <p className="font-semibold text-foreground">{attendanceModal.memberName}</p>
              <p className="text-xs text-muted-foreground">{attendanceModal.meetingTitle}</p>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-semibold text-muted-foreground uppercase">
                Selecione o novo status:
              </label>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() =>
                      setAttendanceModal((prev) =>
                        prev ? { ...prev, newStatus: key as any } : null
                      )
                    }
                    className={cn(
                      'flex items-center gap-2 p-2 rounded-lg border text-xs font-medium transition cursor-pointer text-left',
                      attendanceModal.newStatus === key
                        ? 'ring-2 ring-primary border-primary bg-primary/10 text-foreground'
                        : 'border-border text-muted-foreground hover:bg-muted'
                    )}
                  >
                    <span
                      className={cn(
                        'h-5 w-5 rounded flex items-center justify-center font-mono font-bold text-[10px] border',
                        config.badge
                      )}
                    >
                      {config.code}
                    </span>
                    <span>{config.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setAttendanceModal(null)}
                className="px-3 py-1.5 rounded-lg border border-border text-xs font-medium text-foreground hover:bg-muted cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmAttendanceChange}
                className="px-3.5 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 cursor-pointer"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

