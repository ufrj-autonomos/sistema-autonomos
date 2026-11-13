'use client';

import React, { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Filter,
  Plus,
  Search,
  ShieldAlert,
  Trash2,
  User,
  X,
  FileText,
  Clock,
  Info,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { ExportGoogleSheetsButton } from '@/components/export/export-google-sheets-button';
import type {
  DisciplinaryDashboardData,
  DisciplinaryRecord,
  MemberDisciplinarySummary,
} from '@/lib/disciplinary/service';

export function DisciplinaryManagement({
  initialData,
  currentUserId,
}: {
  initialData: DisciplinaryDashboardData;
  currentUserId: string;
}) {
  const [data, setData] = useState<DisciplinaryDashboardData>(initialData);
  const [activeTab, setActiveTab] = useState<'quadro' | 'ocorrencias'>('quadro');
  const [search, setSearch] = useState('');
  const [areaFilter, setAreaFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modal de Criação de Ocorrência
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [targetMemberId, setTargetMemberId] = useState('');
  const [memberSearchQuery, setMemberSearchQuery] = useState('');
  const [warningType, setWarningType] = useState<'AVISO' | 'ADVERTENCIA_DIRETA' | 'EXPULSAO_DIRETA'>('AVISO');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Modal / Drawer de Detalhes do Membro
  const [selectedMember, setSelectedMember] = useState<MemberDisciplinarySummary | null>(null);

  // Modal de Exclusão
  const [deletingRecord, setDeletingRecord] = useState<DisciplinaryRecord | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const refreshData = async () => {
    try {
      const res = await fetch('/api/gestao/advertencias');
      if (res.ok) {
        const updated = await res.json();
        setData(updated);
        if (selectedMember) {
          const freshMember = updated.members.find((m: MemberDisciplinarySummary) => m.memberId === selectedMember.memberId);
          setSelectedMember(freshMember || null);
        }
      }
    } catch (err) {
      console.error('Erro ao recarregar dados:', err);
    }
  };

  const handleCreateOccurrence = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetMemberId || !reason.trim()) {
      toast.error('Preencha o integrante e o motivo da ocorrência.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/gestao/advertencias', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          memberId: targetMemberId,
          type: warningType,
          reason: reason.trim(),
          notes: notes.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Falha ao registrar ocorrência.');
      }

      toast.success(
        warningType === 'AVISO'
          ? 'Aviso registrado com sucesso!'
          : warningType === 'ADVERTENCIA_DIRETA'
          ? 'Advertência direta registrada com sucesso!'
          : 'Integrante expulso com sucesso! Cadastro transferido para a tabela de Ex-Membros.'
      );
      setIsModalOpen(false);
      setTargetMemberId('');
      setReason('');
      setNotes('');
      await refreshData();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao registrar ocorrência.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteOccurrence = async () => {
    if (!deletingRecord) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/gestao/advertencias/${deletingRecord.id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Erro ao remover ocorrência.');
      }
      toast.success('Ocorrência removida com sucesso.');
      setDeletingRecord(null);
      await refreshData();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Falha ao excluir ocorrência.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Áreas únicas para filtro
  const uniqueAreas = Array.from(new Set(data.members.map((m) => m.area))).sort();

  // Filtragem dos membros no quadro
  const filteredMembers = data.members.filter((m) => {
    const matchSearch =
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      (m.email && m.email.toLowerCase().includes(search.toLowerCase())) ||
      m.area.toLowerCase().includes(search.toLowerCase());
    const matchArea = areaFilter === 'ALL' || m.area === areaFilter;
    const matchStatus = statusFilter === 'ALL' || m.status === statusFilter;
    return matchSearch && matchArea && matchStatus;
  });

  const selectedTargetMember = data.members.find((m) => m.memberId === targetMemberId);
  const modalFilteredMembers = data.members.filter((m) => {
    if (!memberSearchQuery.trim()) return true;
    const q = memberSearchQuery.toLowerCase();
    return (
      m.name.toLowerCase().includes(q) ||
      m.area.toLowerCase().includes(q) ||
      (m.email && m.email.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6">
      {/* Cabeçalho Principal */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-500/10 text-red-600 dark:text-red-400">
              <ShieldAlert className="h-5 w-5" />
            </span>
            <h1 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Gestão Disciplinar
            </h1>
          </div>
          <p className="mt-2 text-sm text-muted-foreground max-w-3xl">
            Acompanhamento de avisos, advertências diretas e consolidadas.
            <span className="ml-1 inline-block font-semibold text-foreground">
              Regra: 2 Avisos = 1 Advertência | 2 Advertências = Risco de expulsão | 3ª Advertência = Expulsão automática
            </span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <ExportGoogleSheetsButton
            type="disciplinary"
            label="Exportar para Google Sheets"
          />
          {data.canManage && (
            <button
              type="button"
              onClick={() => {
                setTargetMemberId('');
                setMemberSearchQuery('');
                setWarningType('AVISO');
                setReason('');
                setNotes('');
                setIsModalOpen(true);
              }}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-red-600 px-4 text-sm font-semibold text-white shadow-xs hover:bg-red-700 transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>Nova Ocorrência</span>
            </button>
          )}
        </div>
      </div>

      {/* Cartões Executivos de Resumo */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-5 shadow-xs">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Total de Membros
          </p>
          <p className="mt-2 text-3xl font-bold text-foreground">
            {data.overview.totalMembers}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">Integrantes ativos monitorados</p>
        </div>

        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
              Regulares
            </p>
            <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <p className="mt-2 text-3xl font-bold text-emerald-700 dark:text-emerald-300">
            {data.overview.regularesCount}
          </p>
          <p className="mt-1 text-xs text-emerald-600/80 dark:text-emerald-400/70">
            0 advertências e 0 avisos
          </p>
        </div>

        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400">
              Em Atenção
            </p>
            <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          </div>
          <p className="mt-2 text-3xl font-bold text-amber-700 dark:text-amber-300">
            {data.overview.atencaoAlertaCount}
          </p>
          <p className="mt-1 text-xs text-amber-600/80 dark:text-amber-400/70">
            Possuem 1 aviso ou 1 advertência
          </p>
        </div>

        <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-red-700 dark:text-red-400">
              Risco de Expulsão
            </p>
            <ShieldAlert className="h-4 w-4 text-red-600 dark:text-red-400" />
          </div>
          <p className="mt-2 text-3xl font-bold text-red-700 dark:text-red-400">
            {data.overview.expulsosCount}
          </p>
          <p className="mt-1 text-xs text-red-600/80 dark:text-red-400/70">
            2 advertências acumuladas (3ª expulsa automaticamente)
          </p>
        </div>
      </div>

      {/* Navegação de Abas */}
      <div className="flex items-center gap-2 border-b border-border">
        <button
          type="button"
          onClick={() => setActiveTab('quadro')}
          className={cn(
            'flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition cursor-pointer',
            activeTab === 'quadro'
              ? 'border-red-600 text-red-600 dark:text-red-400'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          )}
        >
          <span>Quadro Geral Disciplinar</span>
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-mono">
            {data.members.length}
          </span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('ocorrencias')}
          className={cn(
            'flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition cursor-pointer',
            activeTab === 'ocorrencias'
              ? 'border-red-600 text-red-600 dark:text-red-400'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          )}
        >
          <span>Histórico de Ocorrências</span>
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-mono">
            {data.recentOccurrences.length}
          </span>
        </button>
      </div>

      {/* ABA 1: QUADRO GERAL (TABELA CONSOLIDADA) */}
      {activeTab === 'quadro' && (
        <div className="space-y-4">
          {/* Barra de Filtros */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="relative min-w-64 flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por nome, email ou área..."
                className="w-full pl-9 pr-3 py-2 rounded-lg bg-background border border-border text-sm text-foreground focus:outline-hidden focus:ring-2 focus:ring-ring"
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <select
                value={areaFilter}
                onChange={(e) => setAreaFilter(e.target.value)}
                className="px-3 py-2 rounded-lg bg-background border border-border text-xs text-foreground focus:outline-hidden focus:ring-2 focus:ring-ring"
              >
                <option value="ALL">Todas as áreas</option>
                {uniqueAreas.map((area) => (
                  <option key={area} value={area}>
                    {area}
                  </option>
                ))}
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 rounded-lg bg-background border border-border text-xs text-foreground focus:outline-hidden focus:ring-2 focus:ring-ring"
              >
                <option value="ALL">Todos os status</option>
                <option value="REGULAR">🟢 Regular</option>
                <option value="ATENCAO">🟡 Atenção</option>
                <option value="ALERTA">🟠 Risco de expulsão</option>
                <option value="EXPULSAO">🔴 Expulsa</option>
              </select>
            </div>
          </div>

          {/* Tabela de Membros */}
          <div className="rounded-xl border border-border bg-card shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead className="bg-muted/60 text-muted-foreground text-xs font-semibold uppercase tracking-wider border-b border-border">
                  <tr>
                    <th className="px-4 py-3.5">Membro</th>
                    <th className="px-4 py-3.5">Área / Divisão</th>
                    <th className="px-3 py-3.5 text-center">Avisos</th>
                    <th className="px-3 py-3.5 text-center">Adv. Diretas</th>
                    <th className="px-3 py-3.5 text-center">Adv. por Avisos</th>
                    <th className="px-3 py-3.5 text-center font-bold text-foreground">
                      Total Advertências
                    </th>
                    <th className="px-4 py-3.5 text-center">Status Disciplinar</th>
                    <th className="px-4 py-3.5 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredMembers.length > 0 ? (
                    filteredMembers.map((member) => (
                      <tr
                        key={member.memberId}
                        className={cn(
                          'hover:bg-muted/40 transition',
                          member.totalWarnings >= 3 && 'bg-red-500/5',
                          member.totalWarnings === 2 && 'bg-amber-500/5'
                        )}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            {member.avatar ? (
                              <img
                                src={member.avatar}
                                alt={member.name}
                                className="h-8 w-8 rounded-full object-cover border border-border"
                              />
                            ) : (
                              <div className="h-8 w-8 rounded-full bg-muted border border-border flex items-center justify-center text-xs font-semibold text-foreground">
                                {member.name.charAt(0)}
                              </div>
                            )}
                            <div>
                              <p className="font-medium text-foreground">{member.name}</p>
                              {member.email && (
                                <p className="text-xs text-muted-foreground">{member.email}</p>
                              )}
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-medium text-foreground">{member.area}</span>
                            {member.teamSlug === 'harpia' && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300">
                                Harpia
                              </span>
                            )}
                            {member.teamSlug === 'nautilus' && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-300">
                                Nautilus
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="px-3 py-3 text-center font-mono font-medium">
                          {member.avisosCount > 0 ? (
                            <span className="text-amber-600 dark:text-amber-400 font-bold">
                              {member.avisosCount}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">0</span>
                          )}
                        </td>

                        <td className="px-3 py-3 text-center font-mono font-medium">
                          {member.directWarningsCount > 0 ? (
                            <span className="text-red-600 dark:text-red-400 font-bold">
                              {member.directWarningsCount}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">0</span>
                          )}
                        </td>

                        <td className="px-3 py-3 text-center font-mono text-muted-foreground">
                          {member.warningFromAvisos > 0 ? (
                            <span className="font-bold text-foreground">
                              {member.warningFromAvisos}
                            </span>
                          ) : (
                            '0'
                          )}
                        </td>

                        <td className="px-3 py-3 text-center font-mono font-bold">
                          {member.totalWarnings > 0 ? (
                            <span
                              className={cn(
                                'inline-flex items-center justify-center px-2 py-0.5 rounded-md text-sm',
                                member.totalWarnings >= 3
                                  ? 'bg-red-500/20 text-red-700 dark:text-red-400'
                                  : member.totalWarnings === 2
                                  ? 'bg-orange-500/20 text-orange-700 dark:text-orange-400'
                                  : 'bg-amber-500/20 text-amber-700 dark:text-amber-400'
                              )}
                            >
                              {member.totalWarnings}
                            </span>
                          ) : (
                            <span className="text-muted-foreground font-normal">0</span>
                          )}
                        </td>

                        <td className="px-4 py-3 text-center">
                          <span
                            className={cn(
                              'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold',
                              member.statusColor === 'green' &&
                                'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300',
                              member.statusColor === 'yellow' &&
                                'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300',
                              member.statusColor === 'orange' &&
                                'bg-orange-100 text-orange-800 dark:bg-orange-950/40 dark:text-orange-300',
                              member.statusColor === 'red' &&
                                'bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300'
                            )}
                          >
                            {member.statusColor === 'green' && '🟢'}
                            {member.statusColor === 'yellow' && '🟡'}
                            {member.statusColor === 'orange' && '🟠'}
                            {member.statusColor === 'red' && '🔴'}
                            {member.statusLabel}
                          </span>
                        </td>

                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => setSelectedMember(member)}
                              className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-foreground hover:bg-muted border border-border transition cursor-pointer"
                              title="Ver histórico de ocorrências do integrante"
                            >
                              Histórico ({member.warnings.length})
                            </button>
                            {data.canManage && (
                              <button
                                type="button"
                                onClick={() => {
                                  setTargetMemberId(member.memberId);
                                  setMemberSearchQuery('');
                                  setWarningType('AVISO');
                                  setReason('');
                                  setNotes('');
                                  setIsModalOpen(true);
                                }}
                                className="p-1.5 rounded-lg text-muted-foreground hover:text-red-600 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition cursor-pointer"
                                title="Aplicar aviso ou advertência"
                              >
                                <Plus className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">
                        Nenhum integrante encontrado com os filtros atuais.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ABA 2: HISTÓRICO DE OCORRÊNCIAS */}
      {activeTab === 'ocorrencias' && (
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-card shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead className="bg-muted/60 text-muted-foreground text-xs font-semibold uppercase tracking-wider border-b border-border">
                  <tr>
                    <th className="px-4 py-3.5">Data</th>
                    <th className="px-4 py-3.5">Membro</th>
                    <th className="px-3 py-3.5">Tipo</th>
                    <th className="px-4 py-3.5 min-w-[300px]">Motivo / Infração</th>
                    <th className="px-4 py-3.5">Registrado por</th>
                    <th className="px-4 py-3.5 min-w-[200px]">Observações / Providências</th>
                    {data.canManage && <th className="px-4 py-3.5 text-right">Ações</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {data.recentOccurrences.length > 0 ? (
                    data.recentOccurrences.map((occ) => (
                      <tr key={occ.id} className="hover:bg-muted/40 transition">
                        <td className="px-4 py-3 whitespace-nowrap text-xs text-muted-foreground">
                          {new Date(occ.createdAt).toLocaleDateString('pt-BR', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                          })}
                        </td>

                        <td className="px-4 py-3">
                          <p className="font-medium text-foreground">{occ.memberName}</p>
                          <p className="text-xs text-muted-foreground">{occ.memberArea}</p>
                        </td>

                        <td className="px-3 py-3 whitespace-nowrap">
                          {occ.type === 'AVISO' ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                              Aviso
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300">
                              Advertência Direta
                            </span>
                          )}
                        </td>

                        <td className="px-4 py-3">
                          <p className="text-sm text-foreground leading-relaxed">{occ.reason}</p>
                        </td>

                        <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                          {occ.issuedByName || 'Liderança'}
                        </td>

                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {occ.notes || '—'}
                        </td>

                        {data.canManage && (
                          <td className="px-4 py-3 text-right">
                            <button
                              type="button"
                              onClick={() => setDeletingRecord(occ)}
                              className="p-1.5 rounded-lg text-muted-foreground hover:text-red-600 hover:bg-red-500/10 transition cursor-pointer"
                              title="Remover ocorrência"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </td>
                        )}
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                        Nenhuma ocorrência registrada até o momento.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: NOVA OCORRÊNCIA */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-lg rounded-2xl bg-card border border-border p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-500/10 text-red-600 dark:text-red-400">
                  <ShieldAlert className="h-4 w-4" />
                </span>
                <h3 className="font-display text-lg font-bold text-foreground">
                  Registrar Ocorrência Disciplinar
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateOccurrence} className="space-y-4">
              {/* Seleção de Integrante */}
              <div>
                <label className="block text-xs font-semibold uppercase text-muted-foreground mb-1.5">
                  Integrante
                </label>
                {selectedTargetMember ? (
                  <div className="flex items-center justify-between p-3 rounded-xl border border-border bg-muted/40">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-9 w-9 rounded-full bg-accent border border-border flex items-center justify-center text-sm font-semibold text-foreground shrink-0">
                        {selectedTargetMember.name.slice(0, 1)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">{selectedTargetMember.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {selectedTargetMember.area} ·{' '}
                          <span className={selectedTargetMember.totalWarnings > 0 ? 'text-red-600 dark:text-red-400 font-medium' : ''}>
                            {selectedTargetMember.totalWarnings} advertência{selectedTargetMember.totalWarnings === 1 ? '' : 's'}
                          </span>{' '}
                          ({selectedTargetMember.avisosCount} avisos)
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setTargetMemberId('');
                        setMemberSearchQuery('');
                      }}
                      className="px-2.5 py-1 text-xs font-medium rounded-md text-muted-foreground hover:text-foreground hover:bg-muted border border-border transition cursor-pointer shrink-0 ml-2"
                    >
                      Alterar
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                      <input
                        type="text"
                        autoFocus
                        placeholder="Pesquisar integrante por nome ou área..."
                        value={memberSearchQuery}
                        onChange={(e) => setMemberSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-8 py-2 rounded-lg bg-background border border-border text-foreground text-sm focus:outline-hidden focus:ring-2 focus:ring-ring placeholder:text-muted-foreground"
                      />
                      {memberSearchQuery && (
                        <button
                          type="button"
                          onClick={() => setMemberSearchQuery('')}
                          className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground cursor-pointer"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>

                    <div className="max-h-48 overflow-y-auto rounded-lg border border-border bg-background divide-y divide-border shadow-xs">
                      {modalFilteredMembers.length > 0 ? (
                        modalFilteredMembers.map((m) => (
                          <button
                            key={m.memberId}
                            type="button"
                            onClick={() => {
                              setTargetMemberId(m.memberId);
                              setMemberSearchQuery('');
                            }}
                            className="w-full flex items-center justify-between p-2.5 text-left text-sm hover:bg-muted/70 transition cursor-pointer group"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="h-7 w-7 rounded-full bg-accent border border-border flex items-center justify-center text-xs font-semibold shrink-0">
                                {m.name.slice(0, 1)}
                              </div>
                              <div className="truncate">
                                <span className="font-medium text-foreground group-hover:text-primary transition">{m.name}</span>
                                <span className="ml-2 text-xs text-muted-foreground">({m.area})</span>
                              </div>
                            </div>
                            <span className="text-xs text-muted-foreground font-mono shrink-0 ml-2">
                              {m.totalWarnings > 0 || m.avisosCount > 0 ? (
                                <span className="text-amber-600 dark:text-amber-400 font-semibold">
                                  {m.totalWarnings} adv, {m.avisosCount} av
                                </span>
                              ) : (
                                <span className="text-emerald-600 dark:text-emerald-400">Regular</span>
                              )}
                            </span>
                          </button>
                        ))
                      ) : (
                        <p className="p-4 text-center text-xs text-muted-foreground">
                          Nenhum integrante encontrado com &ldquo;{memberSearchQuery}&rdquo;.
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Tipo de Ocorrência */}
              <div>
                <label className="block text-xs font-semibold uppercase text-muted-foreground mb-1.5">
                  Tipo de Ocorrência
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <label
                    className={cn(
                      'flex items-center gap-2 p-3 rounded-xl border text-xs sm:text-sm font-medium cursor-pointer transition',
                      warningType === 'AVISO'
                        ? 'border-amber-500 bg-amber-500/10 text-amber-700 dark:text-amber-300 ring-1 ring-amber-500'
                        : 'border-border text-muted-foreground hover:bg-muted/50'
                    )}
                  >
                    <input
                      type="radio"
                      name="warningType"
                      value="AVISO"
                      checked={warningType === 'AVISO'}
                      onChange={() => setWarningType('AVISO')}
                      className="sr-only"
                    />
                    <span>🟡 Aviso</span>
                  </label>

                  <label
                    className={cn(
                      'flex items-center gap-2 p-3 rounded-xl border text-xs sm:text-sm font-medium cursor-pointer transition',
                      warningType === 'ADVERTENCIA_DIRETA'
                        ? 'border-red-500 bg-red-500/10 text-red-700 dark:text-red-300 ring-1 ring-red-500'
                        : 'border-border text-muted-foreground hover:bg-muted/50'
                    )}
                  >
                    <input
                      type="radio"
                      name="warningType"
                      value="ADVERTENCIA_DIRETA"
                      checked={warningType === 'ADVERTENCIA_DIRETA'}
                      onChange={() => setWarningType('ADVERTENCIA_DIRETA')}
                      className="sr-only"
                    />
                    <span>🔴 Advertência</span>
                  </label>

                  <label
                    className={cn(
                      'flex items-center gap-2 p-3 rounded-xl border text-xs sm:text-sm font-semibold cursor-pointer transition',
                      warningType === 'EXPULSAO_DIRETA'
                        ? 'border-red-600 bg-red-600/15 text-red-700 dark:text-red-300 ring-2 ring-red-600'
                        : 'border-border text-muted-foreground hover:bg-muted/50'
                    )}
                  >
                    <input
                      type="radio"
                      name="warningType"
                      value="EXPULSAO_DIRETA"
                      checked={warningType === 'EXPULSAO_DIRETA'}
                      onChange={() => setWarningType('EXPULSAO_DIRETA')}
                      className="sr-only"
                    />
                    <span>⛔ Expulsão Direta</span>
                  </label>
                </div>
                {warningType === 'EXPULSAO_DIRETA' ? (
                  <div className="mt-2.5 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs leading-relaxed text-red-700 dark:text-red-300">
                    ⚠️ <strong>Atenção:</strong> Esta ação desligará imediatamente o integrante da equipe, movendo seu cadastro para a tabela de <strong>Ex-Membros</strong> com o motivo registrado de <em>Expulsão</em> e desativando seus acessos operacionais.
                  </div>
                ) : (
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    {warningType === 'AVISO'
                      ? '2 Avisos se convertem automaticamente em 1 Advertência consolidada.'
                      : 'Conta imediatamente como 1 Advertência no histórico disciplinar.'}
                  </p>
                )}
              </div>

              {/* Motivo / Infração */}
              <div>
                <label className="block text-xs font-semibold uppercase text-muted-foreground mb-1.5">
                  Anotação do Motivo / Infração
                </label>
                <textarea
                  required
                  rows={3}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Descreva de forma clara e objetiva o fato ocorrido..."
                  className="w-full px-3 py-2 rounded-lg bg-background border border-border text-foreground text-sm focus:outline-hidden focus:ring-2 focus:ring-ring"
                />
              </div>

              {/* Observações / Providências */}
              <div>
                <label className="block text-xs font-semibold uppercase text-muted-foreground mb-1.5">
                  Observações / Providências (Opcional)
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ex: Alinhamento verbal realizado, prazo de reavaliação..."
                  className="w-full px-3 py-2 rounded-lg bg-background border border-border text-foreground text-sm focus:outline-hidden focus:ring-2 focus:ring-ring"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-muted cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={cn(
                    'px-4 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-50 transition cursor-pointer',
                    warningType === 'EXPULSAO_DIRETA'
                      ? 'bg-red-700 hover:bg-red-800'
                      : 'bg-red-600 hover:bg-red-700'
                  )}
                >
                  {isSubmitting
                    ? 'Processando...'
                    : warningType === 'EXPULSAO_DIRETA'
                    ? 'Confirmar Expulsão Direta'
                    : 'Registrar Ocorrência'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: HISTÓRICO DO MEMBRO */}
      {selectedMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-2xl rounded-2xl bg-card border border-border p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200 max-h-[85vh] flex flex-col">
            <div className="flex items-start justify-between border-b border-border pb-4">
              <div className="flex items-center gap-3">
                {selectedMember.avatar ? (
                  <img
                    src={selectedMember.avatar}
                    alt={selectedMember.name}
                    className="h-12 w-12 rounded-full object-cover border border-border"
                  />
                ) : (
                  <div className="h-12 w-12 rounded-full bg-muted border border-border flex items-center justify-center font-bold text-foreground">
                    {selectedMember.name.charAt(0)}
                  </div>
                )}
                <div>
                  <h3 className="font-display text-lg font-bold text-foreground">
                    {selectedMember.name}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Área: {selectedMember.area} • Status: {selectedMember.statusLabel}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedMember(null)}
                className="text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Resumo Numérico do Membro */}
            <div className="grid grid-cols-4 gap-2 text-center p-3 rounded-xl bg-muted/40 border border-border">
              <div>
                <p className="text-[10px] uppercase font-semibold text-muted-foreground">Avisos</p>
                <p className="text-xl font-bold text-foreground">{selectedMember.avisosCount}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase font-semibold text-muted-foreground">Adv. Diretas</p>
                <p className="text-xl font-bold text-foreground">{selectedMember.directWarningsCount}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase font-semibold text-muted-foreground">Por Avisos</p>
                <p className="text-xl font-bold text-foreground">{selectedMember.warningFromAvisos}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase font-semibold text-muted-foreground">Total Adv.</p>
                <p
                  className={cn(
                    'text-xl font-bold',
                    selectedMember.totalWarnings >= 3
                      ? 'text-red-600 dark:text-red-400'
                      : selectedMember.totalWarnings > 0
                      ? 'text-amber-600 dark:text-amber-400'
                      : 'text-emerald-600 dark:text-emerald-400'
                  )}
                >
                  {selectedMember.totalWarnings}
                </p>
              </div>
            </div>

            {/* Lista de Ocorrências do Membro */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              <h4 className="text-xs font-semibold uppercase text-muted-foreground">
                Ocorrências Registradas ({selectedMember.warnings.length})
              </h4>
              {selectedMember.warnings.length > 0 ? (
                selectedMember.warnings.map((w) => (
                  <div
                    key={w.id}
                    className="p-3.5 rounded-xl border border-border bg-background space-y-2 relative"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        {w.type === 'AVISO' ? (
                          <span className="px-2 py-0.5 rounded-full font-medium bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                            Aviso
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full font-medium bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300">
                            Advertência Direta
                          </span>
                        )}
                        <span className="text-muted-foreground">
                          {new Date(w.createdAt).toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                      <span className="text-muted-foreground">Por: {w.issuedByName || 'Liderança'}</span>
                    </div>

                    <p className="text-sm text-foreground leading-relaxed font-medium">{w.reason}</p>

                    {w.notes && (
                      <p className="text-xs text-muted-foreground border-l-2 border-border pl-2 mt-1 italic">
                        {w.notes}
                      </p>
                    )}
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-sm text-muted-foreground border border-dashed border-border rounded-xl">
                  Nenhuma ocorrência registrada para este integrante. Situação regular!
                </div>
              )}
            </div>

            <div className="flex justify-end pt-3 border-t border-border">
              <button
                type="button"
                onClick={() => setSelectedMember(null)}
                className="px-4 py-2 rounded-lg bg-muted text-sm font-medium text-foreground hover:bg-muted/80 cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CONFIRMAR EXCLUSÃO */}
      {deletingRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-2xl bg-card border border-border p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200">
            <h3 className="font-display text-lg font-bold text-foreground">
              Excluir Ocorrência?
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Deseja realmente remover esta ocorrência de{' '}
              <strong className="text-foreground">{deletingRecord.memberName}</strong>? O cálculo de
              advertências será recalculado imediatamente.
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeletingRecord(null)}
                className="px-4 py-2 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-muted cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleDeleteOccurrence}
                className="px-4 py-2 rounded-lg bg-red-600 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50 transition cursor-pointer"
              >
                {isDeleting ? 'Removendo...' : 'Sim, Excluir'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

