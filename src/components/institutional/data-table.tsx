"use client";

import Link from "next/link";
import { useState, useMemo } from "react";
import {
  Edit,
  Trash2,
  Search,
  ExternalLink,
  Eye,
  Check,
  X,
  AlertTriangle,
  Image as ImageIcon,
  FileText,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  Layers,
  LayoutGrid,
  Table2,
  Trophy,
  MapPin,
  Home,
  Calendar,
} from "lucide-react";
import type { AdminModel } from "@/lib/institutional/admin-config";
import { deleteRecord, updateRecord } from "@/app/(gestao)/gestao/site/actions";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/institutional/ui/dialog";
import { useInstitutionalAsset } from "./site-context";
import { directoryPath } from "@/lib/institutional/routes";
import { cn } from "@/lib/utils";

const VISUAL_TABLES = new Set(["timelineevent", "galleryimage", "competition", "sponsor"]);

function getRowTeamKey(row: any): "geral" | "harpia" | "nautilus" {
  if (row.teamId === 1 || row.team?.slug === "nautilus" || row.teamSlug === "nautilus") return "nautilus";
  if (row.teamId === 2 || row.team?.slug === "harpia" || row.teamSlug === "harpia") return "harpia";
  return "geral";
}

function teamPillProps(teamKey: "geral" | "harpia" | "nautilus") {
  if (teamKey === "harpia") {
    return { label: "☁️ Harpia", cls: "bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/30" };
  }
  if (teamKey === "nautilus") {
    return { label: "🌊 Nautilus", cls: "bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/30" };
  }
  return { label: "🤖 UFRJ Autônomos (Geral)", cls: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30" };
}

export function DataTable({
  config,
  data,
  tableSlug,
  initialTeamFilter = "all",
}: {
  config: AdminModel;
  data: any[];
  tableSlug: string;
  initialTeamFilter?: "all" | "geral" | "harpia" | "nautilus";
}) {
  const assetUrl = useInstitutionalAsset();
  const router = useRouter();
  const supportsVisual = VISUAL_TABLES.has(tableSlug);
  const [displayMode, setDisplayMode] = useState<"visual" | "table">(supportsVisual ? "visual" : "table");
  const [search, setSearch] = useState("");
  const [teamFilter, setTeamFilter] = useState<string>(initialTeamFilter);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [areaFilter, setAreaFilter] = useState<string>("all");
  const [isDeleting, setIsDeleting] = useState<number | null>(null);
  const [deleteConfirmTarget, setDeleteConfirmTarget] = useState<any | null>(null);
  const [previewImage, setPreviewImage] = useState<{ url: string; title: string } | null>(null);

  // Quick inline update confirmation
  const [quickConfirm, setQuickConfirm] = useState<{
    row: any;
    field: string;
    fieldLabel: string;
    currentValLabel: string;
    newVal: any;
    newValLabel: string;
  } | null>(null);
  const [isUpdatingField, setIsUpdatingField] = useState(false);
  const [selectModal, setSelectModal] = useState<{
    row: any;
    field: string;
    fieldConfig: any;
  } | null>(null);

  // Filter records based on search query and filter pills
  const filteredData = useMemo(() => {
    return data.filter((row) => {
      // 1. Team filter
      if (teamFilter !== "all") {
        if (teamFilter === "geral") {
          if (row.teamId !== null && row.teamId !== undefined && row.teamId !== "") return false;
        } else if (teamFilter === "harpia") {
          const isHarpia = row.teamId === 2 || row.team?.slug === "harpia" || row.teamSlug === "harpia";
          if (!isHarpia) return false;
        } else if (teamFilter === "nautilus") {
          const isNautilus = row.teamId === 1 || row.team?.slug === "nautilus" || row.teamSlug === "nautilus";
          if (!isNautilus) return false;
        }
      }

      // 2. Active status filter
      if (statusFilter !== "all" && "active" in row) {
        if (statusFilter === "active" && !row.active) return false;
        if (statusFilter === "inactive" && row.active) return false;
      }

      // 3. Category filter
      if (categoryFilter !== "all" && "category" in row) {
        if (row.category !== categoryFilter) return false;
      }

      // 4. Area filter
      if (areaFilter !== "all" && "area" in row) {
        if (row.area !== areaFilter) return false;
      }

      // 5. Search query
      if (!search.trim()) return true;
      const q = search.toLowerCase();

      // Check ID
      if (String(row.id).includes(q)) return true;

      // Check all fields
      return Object.entries(row).some(([key, val]) => {
        if (val === null || val === undefined) return false;
        if (typeof val === "string" || typeof val === "number") {
          return String(val).toLowerCase().includes(q);
        }
        if (typeof val === "object" && val !== null && !Array.isArray(val)) {
          return Object.values(val).some(
            (v) => typeof v === "string" && v.toLowerCase().includes(q)
          );
        }
        return false;
      });
    });
  }, [data, search, teamFilter, statusFilter, categoryFilter, areaFilter]);

  async function handleConfirmDelete() {
    if (!deleteConfirmTarget) return;
    const targetId = deleteConfirmTarget.id;
    setIsDeleting(targetId);

    try {
      const result = await deleteRecord(config.table, targetId);
      if (!result?.success) {
        alert(`Erro ao excluir: ${result?.error || "Desconhecido"}`);
      } else {
        setDeleteConfirmTarget(null);
        router.refresh();
      }
    } catch (err: any) {
      alert("Erro ao excluir. Verifique se o registro está associado a outras tabelas.");
    } finally {
      setIsDeleting(null);
    }
  }

  async function handleConfirmQuickUpdate() {
    if (!quickConfirm) return;
    setIsUpdatingField(true);
    try {
      const res = await updateRecord(config.table, quickConfirm.row.id, {
        [quickConfirm.field]: quickConfirm.newVal,
      });
      if (!res.success) {
        alert(`Erro ao atualizar: ${res.error || "Desconhecido"}`);
      } else {
        setQuickConfirm(null);
        router.refresh();
      }
    } catch {
      alert("Erro ao atualizar campo.");
    } finally {
      setIsUpdatingField(false);
    }
  }

  // Detect available filters for the current table
  const hasTeamField = config.fields.some((f) => f.name === "teamId");
  const hasActiveField = config.fields.some((f) => f.name === "active");
  const hasCategoryField = config.fields.some((f) => f.name === "category");
  const hasAreaField = config.fields.some((f) => f.name === "area");

  // Extract unique areas from data in logical team order
  const uniqueAreas = useMemo(() => {
    if (!hasAreaField) return [];
    const areas = new Set<string>();
    data.forEach((row) => {
      if (row.area && typeof row.area === "string" && row.area.trim()) {
        areas.add(row.area.trim());
      }
    });
    const standardOrder = ["Gestão", "Marketing", "Software", "Eletrônica", "Mecânica", "Orientação"];
    return Array.from(areas).sort((a, b) => {
      const idxA = standardOrder.indexOf(a);
      const idxB = standardOrder.indexOf(b);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return a.localeCompare(b, "pt-BR");
    });
  }, [data, hasAreaField]);

  const teamCounts = useMemo(() => {
    const counts = { all: data.length, geral: 0, harpia: 0, nautilus: 0 };
    for (const row of data) {
      counts[getRowTeamKey(row)] += 1;
    }
    return counts;
  }, [data]);

  return (
    <div className="w-full">
      {/* Division / Team Prominent Tabs */}
      {hasTeamField && (
        <div className="border-b border-border bg-muted/35 px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5" role="tablist" aria-label="Filtrar por divisão/equipe">
            {[
              { value: "all", label: "Todas as Equipes", count: teamCounts.all },
              { value: "geral", label: "🤖 UFRJ Autônomos (Geral)", count: teamCounts.geral },
              { value: "harpia", label: "☁️ Divisão Harpia", count: teamCounts.harpia },
              { value: "nautilus", label: "🌊 Divisão Nautilus", count: teamCounts.nautilus },
            ].map((tab) => (
              <button
                key={tab.value}
                type="button"
                role="tab"
                aria-selected={teamFilter === tab.value}
                onClick={() => setTeamFilter(tab.value)}
                className={cn(
                  "inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium transition-all cursor-pointer border",
                  teamFilter === tab.value
                    ? "bg-primary text-primary-foreground border-primary shadow-2xs"
                    : "bg-background/70 text-muted-foreground border-border hover:bg-accent hover:text-foreground"
                )}
              >
                <span>{tab.label}</span>
                <span
                  className={cn(
                    "rounded-full px-1.5 py-0.2 font-mono text-[10px]",
                    teamFilter === tab.value ? "bg-primary-foreground/20 text-primary-foreground" : "bg-muted text-muted-foreground"
                  )}
                >
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {supportsVisual && (
            <div className="inline-flex rounded-lg bg-muted p-1 border border-border/60">
              <button
                type="button"
                onClick={() => setDisplayMode("visual")}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium cursor-pointer transition-colors",
                  displayMode === "visual" ? "bg-background text-foreground shadow-2xs" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                Visual
              </button>
              <button
                type="button"
                onClick={() => setDisplayMode("table")}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium cursor-pointer transition-colors",
                  displayMode === "table" ? "bg-background text-foreground shadow-2xs" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Table2 className="h-3.5 w-3.5" />
                Tabela
              </button>
            </div>
          )}
        </div>
      )}

      {/* Top Filter & Search Bar */}
      <div className="border-b border-border bg-muted/20 p-4 space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder={`Buscar em ${config.name.toLowerCase()} (nome, cargo, ano, categoria)...`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-md border border-input bg-background pl-9 pr-8 py-2 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Records Counter */}
          <div className="flex items-center gap-2 font-mono text-xs text-muted-foreground self-end sm:self-center">
            <span>
              Exibindo <strong className="text-foreground">{filteredData.length}</strong> de{" "}
              {data.length}
            </span>
            {(search || teamFilter !== "all" || statusFilter !== "all" || categoryFilter !== "all" || areaFilter !== "all") && (
              <button
                onClick={() => {
                  setSearch("");
                  setTeamFilter("all");
                  setStatusFilter("all");
                  setCategoryFilter("all");
                  setAreaFilter("all");
                }}
                className="text-[11px] text-primary hover:underline ml-2"
              >
                Limpar filtros
              </button>
            )}
          </div>
        </div>

        {/* Quick Filter Pills */}
        {(hasAreaField && uniqueAreas.length > 0) || hasActiveField || hasCategoryField ? (
          <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">

          {hasAreaField && uniqueAreas.length > 0 && (
            <div className="flex flex-wrap items-center gap-1 bg-background/50 border border-border rounded-md p-1">
              <span className="px-2 font-mono text-[10px] uppercase text-muted-foreground">Área:</span>
              <button
                onClick={() => setAreaFilter("all")}
                className={cn(
                  "rounded px-2 py-0.5 text-xs transition-colors cursor-pointer",
                  areaFilter === "all"
                    ? "bg-primary text-primary-foreground font-medium"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Todas
              </button>
              {uniqueAreas.map((areaName) => (
                <button
                  key={areaName}
                  onClick={() => setAreaFilter(areaName)}
                  className={cn(
                    "rounded px-2 py-0.5 text-xs transition-colors cursor-pointer",
                    areaFilter === areaName
                      ? "bg-primary text-primary-foreground font-medium"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {areaName}
                </button>
              ))}
            </div>
          )}

          {hasActiveField && (
            <div className="flex items-center gap-1 bg-background/50 border border-border rounded-md p-1">
              <span className="px-2 font-mono text-[10px] uppercase text-muted-foreground">Status:</span>
              {[
                { label: "Todos", value: "all" },
                { label: "Ativos", value: "active" },
                { label: "Inativos", value: "inactive" },
              ].map((pill) => (
                <button
                  key={pill.value}
                  onClick={() => setStatusFilter(pill.value)}
                  className={cn(
                    "rounded px-2 py-0.5 text-xs transition-colors cursor-pointer",
                    statusFilter === pill.value
                      ? "bg-primary text-primary-foreground font-medium"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {pill.label}
                </button>
              ))}
            </div>
          )}

          {hasCategoryField && (
            <div className="flex items-center gap-1 bg-background/50 border border-border rounded-md p-1">
              <span className="px-2 font-mono text-[10px] uppercase text-muted-foreground">Cat:</span>
              {[
                { label: "Todas", value: "all" },
                { label: "Marco", value: "marco" },
                { label: "Competição", value: "competicao" },
                { label: "Projeto", value: "projeto" },
                { label: "Prêmio", value: "premio" },
              ].map((pill) => (
                <button
                  key={pill.value}
                  onClick={() => setCategoryFilter(pill.value)}
                  className={cn(
                    "rounded px-2 py-0.5 text-xs transition-colors cursor-pointer",
                    categoryFilter === pill.value
                      ? "bg-primary text-primary-foreground font-medium"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {pill.label}
                </button>
              ))}
            </div>
          )}
        </div>
        ) : null}
      </div>

      {/* Main Visual or Table View */}
      {filteredData.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted/60 text-muted-foreground mb-3">
            <Filter className="h-6 w-6" />
          </div>
          <h3 className="font-display text-base font-semibold text-foreground">
            Nenhum registro encontrado
          </h3>
          <p className="mt-1 text-xs text-muted-foreground max-w-sm">
            {search || teamFilter !== "all" || statusFilter !== "all" || categoryFilter !== "all" || areaFilter !== "all"
              ? "Tente ajustar ou limpar seus filtros de pesquisa para visualizar outros dados."
              : "Não há dados cadastrados nesta tabela ainda. Crie um novo registro acima."}
          </p>
        </div>
      ) : displayMode === "visual" && tableSlug === "timelineevent" ? (
        <div className="p-4 sm:p-6">
          <div className="relative pl-6 border-l-2 border-border space-y-5">
            {filteredData.map((row) => {
              const tPill = teamPillProps(getRowTeamKey(row));
              const cat = String(row.category || "marco").toLowerCase();
              const catColors: Record<string, string> = {
                marco: "bg-muted text-secondary-foreground border-border",
                projeto: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30",
                premio: "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/30",
                competicao: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30",
              };
              return (
                <article
                  key={row.id}
                  className="relative rounded-xl border border-border bg-background/70 p-4 sm:p-5 shadow-2xs hover:border-primary/40 transition-colors"
                >
                  <span className="absolute -left-[31px] top-5 h-3.5 w-3.5 rounded-full border-2 border-background bg-primary" />
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1.5 min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 font-mono text-xs font-semibold text-foreground">
                          <Calendar className="h-3 w-3 text-muted-foreground" />
                          {row.date}
                        </span>
                        <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase", catColors[cat] || catColors.marco)}>
                          {row.category}
                        </span>
                        <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 font-mono text-[10px]", tPill.cls)}>
                          {tPill.label}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            setQuickConfirm({
                              row,
                              field: "showOnHome",
                              fieldLabel: "Exibir na Home",
                              currentValLabel: row.showOnHome ? "Sim" : "Não",
                              newVal: !row.showOnHome,
                              newValLabel: !row.showOnHome ? "Sim" : "Não",
                            })
                          }
                          className={cn(
                            "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium cursor-pointer transition-colors",
                            row.showOnHome
                              ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
                              : "bg-muted/60 text-muted-foreground border-border"
                          )}
                          title="Alternar destaque na Home"
                        >
                          <Home className="h-2.5 w-2.5" />
                          {row.showOnHome ? "Na Home" : "Oculto na Home"}
                        </button>
                      </div>
                      <h3 className="font-display text-base font-semibold text-foreground">{row.title}</h3>
                      {row.description && (
                        <p className="text-xs text-muted-foreground leading-relaxed">{row.description}</p>
                      )}
                      {row.details && (
                        <p className="text-[11px] text-secondary-foreground/80 bg-muted/40 rounded-md p-2.5 border border-border/60 line-clamp-3 whitespace-pre-line">
                          {row.details}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Link
                        href={`${directoryPath(tableSlug)}/${row.id}`}
                        className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-muted"
                      >
                        <Edit className="h-3.5 w-3.5" />
                        Editar
                      </Link>
                      <button
                        type="button"
                        onClick={() => setDeleteConfirmTarget(row)}
                        disabled={isDeleting === row.id}
                        className="inline-flex items-center justify-center rounded-md border border-red-500/20 bg-red-500/5 p-1.5 text-red-700 dark:text-red-400 hover:bg-red-800/20 cursor-pointer"
                        title="Excluir marco"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      ) : displayMode === "visual" && tableSlug === "galleryimage" ? (
        <div className="p-4 sm:p-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredData.map((row) => {
            const tPill = teamPillProps(getRowTeamKey(row));
            const linkedLabel = row.project?.name || row.competition?.name || row.timelineEvent?.title || null;
            return (
              <article key={row.id} className="group/card flex flex-col overflow-hidden rounded-xl border border-border bg-background/70 shadow-2xs hover:border-primary/40 transition-all">
                <button
                  type="button"
                  onClick={() =>
                    setPreviewImage({
                      url: row.url,
                      title: row.caption || `Foto #${row.id}`,
                    })
                  }
                  className="relative aspect-[4/3] w-full overflow-hidden bg-muted cursor-pointer"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={assetUrl(row.url)}
                    alt={row.caption || "Foto da galeria"}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover/card:scale-105"
                    loading="lazy"
                  />
                  <span className={cn("absolute left-2.5 top-2.5 inline-flex items-center rounded-full border backdrop-blur-md bg-background/85 px-2 py-0.5 font-mono text-[10px]", tPill.cls)}>
                    {tPill.label}
                  </span>
                  {(row.year || row.month) && (
                    <span className="absolute right-2.5 top-2.5 rounded-md bg-black/65 px-2 py-0.5 font-mono text-[10px] text-white">
                      {row.month ? `${String(row.month).padStart(2, "0")}/` : ""}{row.year || ""}
                    </span>
                  )}
                </button>
                <div className="flex-1 p-3.5 space-y-2">
                  <p className="text-xs font-medium text-foreground line-clamp-2 leading-snug" title={row.caption}>
                    {row.caption || "Sem legenda"}
                  </p>
                  {linkedLabel && (
                    <p className="text-[11px] text-muted-foreground truncate">
                      Vinculado a: <strong className="text-foreground">{linkedLabel}</strong>
                    </p>
                  )}
                </div>
                <div className="border-t border-border/60 px-3.5 py-2.5 flex items-center justify-between gap-2 bg-muted/20">
                  <span className="font-mono text-[10px] text-muted-foreground">#{row.id}</span>
                  <div className="flex items-center gap-1.5">
                    <Link
                      href={`${directoryPath(tableSlug)}/${row.id}`}
                      className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-2.5 py-1 text-xs text-foreground hover:bg-muted"
                    >
                      <Edit className="h-3 w-3" /> Editar
                    </Link>
                    <button
                      type="button"
                      onClick={() => setDeleteConfirmTarget(row)}
                      className="inline-flex items-center justify-center rounded-md border border-red-500/20 bg-red-500/5 p-1 text-red-700 dark:text-red-400 hover:bg-red-800/20 cursor-pointer"
                      title="Excluir foto"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      ) : displayMode === "visual" && tableSlug === "competition" ? (
        <div className="p-4 sm:p-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredData.map((row) => {
            const tPill = teamPillProps(getRowTeamKey(row));
            return (
              <article key={row.id} className="flex flex-col justify-between rounded-xl border border-border bg-background/70 p-4 shadow-2xs hover:border-primary/40 transition-colors space-y-3">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 font-mono text-[10px]", tPill.cls)}>
                      {tPill.label}
                    </span>
                    <span className="font-mono text-xs font-bold text-foreground bg-muted px-2 py-0.5 rounded">
                      {row.year}
                    </span>
                  </div>
                  <h3 className="font-display text-base font-semibold text-foreground">{row.name}</h3>
                  {row.result && (
                    <div className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 px-2.5 py-1 text-xs font-medium text-amber-700 dark:text-amber-300">
                      <Trophy className="h-3.5 w-3.5 shrink-0" />
                      <span>{row.result}</span>
                    </div>
                  )}
                  <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5 shrink-0" />
                    <span>{row.location}{row.country ? `, ${row.country}` : ""}</span>
                  </p>
                  {row.details && (
                    <p className="text-xs text-muted-foreground line-clamp-2">{row.details}</p>
                  )}
                </div>
                <div className="border-t border-border/60 pt-3 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setQuickConfirm({
                        row,
                        field: "showOnHome",
                        fieldLabel: "Exibir na Home",
                        currentValLabel: row.showOnHome ? "Sim" : "Não",
                        newVal: !row.showOnHome,
                        newValLabel: !row.showOnHome ? "Sim" : "Não",
                      })
                    }
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium cursor-pointer",
                      row.showOnHome
                        ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
                        : "bg-muted text-muted-foreground border-border"
                    )}
                  >
                    <Home className="h-2.5 w-2.5" />
                    {row.showOnHome ? "Na Home" : "Oculto na Home"}
                  </button>
                  <div className="flex items-center gap-1.5">
                    <Link
                      href={`${directoryPath(tableSlug)}/${row.id}`}
                      className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-2.5 py-1 text-xs text-foreground hover:bg-muted"
                    >
                      <Edit className="h-3.5 w-3.5" /> Editar
                    </Link>
                    <button
                      type="button"
                      onClick={() => setDeleteConfirmTarget(row)}
                      className="inline-flex items-center justify-center rounded-md border border-red-500/20 bg-red-500/5 p-1 text-red-700 dark:text-red-400 hover:bg-red-800/20 cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      ) : displayMode === "visual" && tableSlug === "sponsor" ? (
        <div className="p-4 sm:p-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredData.map((row) => {
            const tPill = teamPillProps(getRowTeamKey(row));
            const tierColors: Record<string, string> = {
              ouro: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/40",
              prata: "bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-500/40",
              bronze: "bg-orange-500/15 text-orange-700 dark:text-orange-300 border-orange-500/40",
              apoio: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/40",
            };
            return (
              <article key={row.id} className="flex flex-col justify-between rounded-xl border border-border bg-background/70 p-4 shadow-2xs space-y-3">
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className={cn("inline-flex rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase font-semibold", tierColors[String(row.tier || "").toLowerCase()] || "bg-muted text-foreground border-border")}>
                      {row.tier}
                    </span>
                    <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 font-mono text-[10px]", tPill.cls)}>
                      {tPill.label}
                    </span>
                  </div>
                  <div className="h-24 rounded-lg border border-border bg-muted/40 flex items-center justify-center p-3 overflow-hidden">
                    {row.logo ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img src={assetUrl(row.logo)} alt={row.name} className="max-h-full max-w-full object-contain" />
                    ) : (
                      <span className="font-display text-sm font-semibold text-muted-foreground">{row.name}</span>
                    )}
                  </div>
                  <div>
                    <h3 className="font-display text-sm font-semibold text-foreground">{row.name}</h3>
                    {row.benefit && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{row.benefit}</p>}
                  </div>
                </div>
                <div className="border-t border-border/60 pt-2.5 flex items-center justify-between gap-2">
                  {row.website ? (
                    <a href={row.website} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline truncate max-w-28">
                      <ExternalLink className="h-3 w-3 shrink-0" /> Site
                    </a>
                  ) : <span />}
                  <div className="flex items-center gap-1.5">
                    <Link
                      href={`${directoryPath(tableSlug)}/${row.id}`}
                      className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-2.5 py-1 text-xs text-foreground hover:bg-muted"
                    >
                      <Edit className="h-3.5 w-3.5" /> Editar
                    </Link>
                    <button
                      type="button"
                      onClick={() => setDeleteConfirmTarget(row)}
                      className="inline-flex items-center justify-center rounded-md border border-red-500/20 bg-red-500/5 p-1 text-red-700 dark:text-red-400 hover:bg-red-800/20 cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-muted/40 uppercase font-mono text-[11px] text-muted-foreground border-b border-border">
              <tr>
                <th className="px-5 py-3.5 font-semibold w-16">ID</th>
                {config.listFields.map((fieldKey) => {
                  const field = config.fields.find((f) => f.name === fieldKey);
                  return (
                    <th key={fieldKey} className="px-5 py-3.5 font-semibold">
                      {field?.label || fieldKey}
                    </th>
                  );
                })}
                <th className="px-5 py-3.5 font-semibold text-right w-28">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredData.map((row) => (
                <tr key={row.id} className="hover:bg-muted/20 transition-colors group">
                  {/* ID */}
                  <td className="px-5 py-3 font-mono text-muted-foreground font-medium">
                    #{row.id}
                  </td>

                  {/* Fields */}
                  {config.listFields.map((fieldKey) => {
                    const field = config.fields.find((f) => f.name === fieldKey);
                    const rawVal = row[fieldKey];

                    // 1. Image fields
                    const isImageField =
                      field?.type === "image" ||
                      ["photo", "coverImage", "logo", "url", "image", "avatar"].includes(fieldKey) ||
                      (typeof rawVal === "string" &&
                        (rawVal.startsWith("http://") ||
                          rawVal.startsWith("https://") ||
                          rawVal.startsWith("/")) &&
                        /\.(jpg|jpeg|png|webp|svg|gif)(\?.*)?$/i.test(rawVal));

                    if (isImageField && rawVal && typeof rawVal === "string") {
                      return (
                        <td key={fieldKey} className="px-5 py-3">
                          <button
                            type="button"
                            onClick={() =>
                              setPreviewImage({
                                url: rawVal,
                                title: row.name || row.title || row.caption || `Imagem #${row.id}`,
                              })
                            }
                            className="group/img relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-muted transition-transform hover:scale-105 cursor-pointer"
                            title="Clique para ampliar pré-visualização"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={assetUrl(rawVal)}
                              alt={field?.label || fieldKey}
                              className="h-full w-full object-cover"
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center text-white">
                              <Eye className="h-3.5 w-3.5" />
                            </div>
                          </button>
                        </td>
                      );
                    }

                    // 2. Team field
                    if (fieldKey === "teamId" || fieldKey === "team") {
                      const tId = row.teamId;
                      let label = "Geral (Autônomos)";
                      let color = "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30";

                      if (tId === 1 || row.team?.slug === "nautilus" || row.teamSlug === "nautilus") {
                        label = "Nautilus";
                        color = "bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border-cyan-500/30";
                      } else if (tId === 2 || row.team?.slug === "harpia" || row.teamSlug === "harpia") {
                        label = "Harpia";
                        color = "bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/30";
                      }

                      return (
                        <td key={fieldKey} className="px-5 py-3">
                          <span
                            className={cn(
                              "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-mono border",
                              color
                            )}
                          >
                            <span className="h-1.5 w-1.5 rounded-full bg-current" />
                            {label}
                          </span>
                        </td>
                      );
                    }

                    // 3. Gender / isFemale
                    if (fieldKey === "isFemale") {
                      const isF = Boolean(rawVal);
                      return (
                        <td key={fieldKey} className="px-5 py-3">
                          <button
                            type="button"
                            onClick={() =>
                              setQuickConfirm({
                                row,
                                field: fieldKey,
                                fieldLabel: field?.label || "Gênero",
                                currentValLabel: isF ? "Feminino" : "Masculino",
                                newVal: !isF,
                                newValLabel: !isF ? "Feminino" : "Masculino",
                              })
                            }
                            className={cn(
                              "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-mono border cursor-pointer transition-all hover:scale-105",
                              isF
                                ? "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/30 hover:bg-rose-500/20"
                                : "bg-muted/50 text-muted-foreground border-hairline hover:bg-muted"
                            )}
                            title="Clique para alternar gênero"
                          >
                            <span
                              className={cn(
                                "h-1.5 w-1.5 rounded-full",
                                isF ? "bg-rose-400" : "bg-muted-foreground/60"
                              )}
                            />
                            {isF ? "Feminino" : "Masculino"}
                          </button>
                        </td>
                      );
                    }

                    // 4. Age field
                    if (fieldKey === "age") {
                      if (rawVal === null || rawVal === undefined || rawVal === "") {
                        return (
                          <td key={fieldKey} className="px-5 py-3 text-muted-foreground/40 font-mono">
                            —
                          </td>
                        );
                      }
                      return (
                        <td key={fieldKey} className="px-5 py-3 font-mono text-muted-foreground">
                          <span className="text-foreground font-semibold">{rawVal}</span> anos
                        </td>
                      );
                    }

                    // 5. Area field badge
                    if (fieldKey === "area" && rawVal) {
                      const areaColors: Record<string, string> = {
                        gestão: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30",
                        gestao: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30",
                        marketing: "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/30",
                        software: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
                        eletrônica: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30",
                        eletronica: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30",
                        mecânica: "bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/30",
                        mecanica: "bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/30",
                        orientação: "bg-orange-600/10 text-orange-700 dark:text-orange-400 border-orange-600/30",
                        orientacao: "bg-orange-600/10 text-orange-700 dark:text-orange-400 border-orange-600/30",
                      };
                      const colorClass =
                        areaColors[String(rawVal).toLowerCase()] ||
                        "bg-muted/60 text-muted-foreground border-border";

                      return (
                        <td key={fieldKey} className="px-5 py-3">
                          <button
                            type="button"
                            onClick={() =>
                              field?.options
                                ? setSelectModal({ row, field: fieldKey, fieldConfig: field })
                                : null
                            }
                            className={cn(
                              "inline-flex items-center gap-1 rounded-md px-2.5 py-0.5 text-[11px] font-mono border transition-all",
                              field?.options ? "cursor-pointer hover:ring-1 hover:ring-foreground/30" : "",
                              colorClass
                            )}
                            title={field?.options ? "Clique para alterar área" : undefined}
                          >
                            <span>{rawVal}</span>
                            {field?.options && <span className="text-[9px] opacity-60">▾</span>}
                          </button>
                        </td>
                      );
                    }

                    // 4. Active status & booleans
                    if (fieldKey === "active" || typeof rawVal === "boolean") {
                      const isActive = Boolean(rawVal);
                      const isShowOnSite = fieldKey === "showOnSite";
                      const currentLabel = isShowOnSite
                        ? isActive ? "Visível no site" : "Somente na gestão"
                        : isActive ? "Ativo" : "Inativo";
                      const nextLabel = isShowOnSite
                        ? !isActive ? "Visível no site" : "Somente na gestão"
                        : !isActive ? "Ativo" : "Inativo";

                      return (
                        <td key={fieldKey} className="px-5 py-3">
                          <button
                            type="button"
                            onClick={() =>
                              setQuickConfirm({
                                row,
                                field: fieldKey,
                                fieldLabel: field?.label || (isShowOnSite ? "Exibição no site" : "Status"),
                                currentValLabel: currentLabel,
                                newVal: !isActive,
                                newValLabel: nextLabel,
                              })
                            }
                            className={cn(
                              "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-mono border cursor-pointer transition-all hover:scale-105",
                              isActive
                                ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-800/20"
                                : "bg-muted text-muted-foreground border-hairline hover:bg-muted/80"
                            )}
                            title="Clique para alternar"
                          >
                            <span
                              className={cn(
                                "h-1.5 w-1.5 rounded-full",
                                isActive ? "bg-emerald-400" : "bg-muted-foreground"
                              )}
                            />
                            {currentLabel}
                          </button>
                        </td>
                      );
                    }

                    // 4. Category (timeline)
                    if (fieldKey === "category") {
                      const cat = String(rawVal).toLowerCase();
                      const catColors: Record<string, string> = {
                        marco: "bg-muted-foreground/10 text-secondary-foreground border-border",
                        projeto: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30",
                        premio: "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/30",
                        competicao: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30",
                      };
                      return (
                        <td key={fieldKey} className="px-5 py-3">
                          <span
                            className={cn(
                              "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] uppercase font-mono tracking-wider border",
                              catColors[cat] || "bg-muted text-muted-foreground border-hairline"
                            )}
                          >
                            {rawVal}
                          </span>
                        </td>
                      );
                    }

                    // 5. Relations
                    let displayVal = rawVal;
                    if (field?.type === "relation") {
                      const relModelName = fieldKey.replace(/Id$/, "");
                      const relObj = row[relModelName];
                      if (relObj) {
                        displayVal = relObj.name || relObj.title || relObj.caption || `ID: ${relObj.id}`;
                      }
                    }

                    // 6. Select options
                    if (field?.type === "select" && field.options) {
                      const opt = field.options.find((o) => String(o.value) === String(rawVal));
                      displayVal = opt ? opt.label : rawVal;

                      if (displayVal !== null && displayVal !== undefined && displayVal !== "") {
                        return (
                          <td key={fieldKey} className="px-5 py-3">
                            <button
                              type="button"
                              onClick={() => setSelectModal({ row, field: fieldKey, fieldConfig: field })}
                              className="inline-flex items-center gap-1 rounded-md border border-border bg-card/60 px-2 py-0.5 text-xs text-foreground/90 hover:bg-muted cursor-pointer transition-colors"
                              title={`Clique para alterar ${field.label}`}
                            >
                              <span>{String(displayVal)}</span>
                              <span className="text-[9px] opacity-60">▾</span>
                            </button>
                          </td>
                        );
                      }
                    }

                    // 7. General formatting
                    if (displayVal === null || displayVal === undefined || displayVal === "") {
                      return (
                        <td key={fieldKey} className="px-5 py-3 text-muted-foreground/40 font-mono">
                          —
                        </td>
                      );
                    }

                    // Truncate long texts
                    const str = String(displayVal);
                    const isLong = str.length > 55;

                    return (
                      <td key={fieldKey} className="px-5 py-3 text-foreground/90 max-w-xs truncate" title={str}>
                        {isLong ? `${str.substring(0, 55)}...` : str}
                      </td>
                    );
                  })}

                  {/* Actions */}
                  <td className="px-5 py-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <Link
                        href={`${directoryPath(tableSlug)}/${row.id}`}
                        className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-2.5 py-1 text-xs text-foreground hover:bg-muted transition-colors"
                        title="Editar registro"
                      >
                        <Edit className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">Editar</span>
                      </Link>

                      <button
                        onClick={() => setDeleteConfirmTarget(row)}
                        disabled={isDeleting === row.id}
                        className="inline-flex items-center justify-center rounded-md border border-red-500/20 bg-red-500/5 p-1 text-red-700 dark:text-red-400 hover:bg-red-800/20 hover:text-red-300 transition-colors disabled:opacity-50 cursor-pointer"
                        title="Excluir registro"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Delete Confirmation Modal (In-App, No Clunky Browser Alert) */}
      <Dialog open={!!deleteConfirmTarget} onOpenChange={(open) => !open && setDeleteConfirmTarget(null)}>
        <DialogContent className="sm:max-w-md bg-card border-border">
          <DialogHeader className="space-y-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-500/10 text-red-700 dark:text-red-400 border border-red-500/30">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <DialogTitle className="font-display text-lg font-semibold text-foreground">
              Confirmar Exclusão
            </DialogTitle>
          </DialogHeader>

          <div className="text-xs text-muted-foreground space-y-2 py-2">
            <p>
              Tem certeza que deseja excluir o registro{" "}
              <strong className="text-foreground">
                #{deleteConfirmTarget?.id} (
                {deleteConfirmTarget?.name ||
                  deleteConfirmTarget?.title ||
                  deleteConfirmTarget?.caption ||
                  config.name}
                )
              </strong>
              ?
            </p>
            <p className="text-red-700 dark:text-red-400/90 bg-red-500/10 border border-red-500/20 p-2.5 rounded-md">
              Atenção: Esta ação é definitiva e removerá os dados imediatamente do banco.
            </p>
          </div>

          <DialogFooter className="flex items-center justify-end gap-2 pt-3 border-t border-border">
            <button
              type="button"
              onClick={() => setDeleteConfirmTarget(null)}
              className="rounded-md border border-border px-3.5 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleConfirmDelete}
              disabled={isDeleting !== null}
              className="rounded-md bg-red-700 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-red-800 transition-colors disabled:opacity-50"
            >
              {isDeleting !== null ? "Excluindo..." : "Sim, Excluir"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Image Preview Lightbox Dialog */}
      <Dialog open={!!previewImage} onOpenChange={(open) => !open && setPreviewImage(null)}>
        <DialogContent className="sm:max-w-xl bg-card border-border p-4">
          <DialogHeader>
            <DialogTitle className="font-display text-sm font-semibold truncate">
              {previewImage?.title}
            </DialogTitle>
          </DialogHeader>
          {previewImage && (
            <div className="mt-2 relative aspect-video w-full rounded-md overflow-hidden border border-border bg-muted/60 flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={assetUrl(previewImage.url)}
                alt={previewImage.title}
                className="max-h-full max-w-full object-contain"
              />
            </div>
          )}
          <DialogFooter className="mt-3 flex items-center justify-between">
            <a
              href={previewImage ? assetUrl(previewImage.url) : undefined}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 font-mono text-xs text-primary hover:underline"
            >
              <ExternalLink className="h-3 w-3" />
              <span>Abrir URL original</span>
            </a>
            <button
              onClick={() => setPreviewImage(null)}
              className="rounded-md bg-foreground px-3 py-1 text-xs font-medium text-background hover:bg-foreground/90"
            >
              Fechar
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Select Option Modal */}
      <Dialog open={!!selectModal} onOpenChange={(open) => !open && setSelectModal(null)}>
        <DialogContent className="sm:max-w-sm bg-card border-border">
          <DialogHeader>
            <DialogTitle className="font-display text-sm font-semibold">
              Alterar {selectModal?.fieldConfig?.label || selectModal?.field}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Selecione uma das opções abaixo. Você precisará confirmar antes de salvar.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2 space-y-1 max-h-64 overflow-y-auto">
            {selectModal?.fieldConfig?.options?.map((opt: any) => {
              const currentVal = selectModal.row[selectModal.field];
              const isSelected = String(currentVal) === String(opt.value);
              return (
                <button
                  key={String(opt.value)}
                  type="button"
                  onClick={() => {
                    const chosen = opt.value;
                    const chosenLabel = opt.label;
                    const curLabel =
                      selectModal.fieldConfig.options.find((o: any) => String(o.value) === String(currentVal))?.label ||
                      String(currentVal || "—");
                    const targetRow = selectModal.row;
                    const targetField = selectModal.field;
                    const targetFieldLabel = selectModal.fieldConfig.label;
                    setSelectModal(null);
                    setQuickConfirm({
                      row: targetRow,
                      field: targetField,
                      fieldLabel: targetFieldLabel,
                      currentValLabel: curLabel,
                      newVal: chosen,
                      newValLabel: chosenLabel,
                    });
                  }}
                  className={cn(
                    "w-full text-left px-3 py-2 text-xs rounded-md transition-colors flex items-center justify-between",
                    isSelected
                      ? "bg-muted font-semibold text-foreground border border-border"
                      : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                  )}
                >
                  <span>{opt.label}</span>
                  {isSelected && <span className="text-[10px] text-muted-foreground">Atual</span>}
                </button>
              );
            })}
          </div>
          <DialogFooter>
            <button
              type="button"
              onClick={() => setSelectModal(null)}
              className="rounded-md border border-border px-3.5 py-1.5 text-xs font-medium text-foreground hover:bg-muted"
            >
              Cancelar
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Quick Confirmation Popup for booleans & enums */}
      <Dialog open={!!quickConfirm} onOpenChange={(open) => !open && !isUpdatingField && setQuickConfirm(null)}>
        <DialogContent className="sm:max-w-md bg-card border-border">
          <DialogHeader>
            <DialogTitle className="font-display text-base font-semibold text-foreground">
              Confirmar Alteração
            </DialogTitle>
          </DialogHeader>
          <DialogDescription className="text-xs text-muted-foreground leading-relaxed pt-1">
            Deseja alterar o campo <strong className="text-foreground">{quickConfirm?.fieldLabel}</strong> do registro{" "}
            <strong className="text-foreground">
              #{quickConfirm?.row?.id} ({quickConfirm?.row?.name || quickConfirm?.row?.title || config.name})
            </strong>{" "}
            de <strong className="text-amber-700 dark:text-amber-400">{quickConfirm?.currentValLabel}</strong> para{" "}
            <strong className="text-emerald-700 dark:text-emerald-400">{quickConfirm?.newValLabel}</strong>?
          </DialogDescription>
          <div className="bg-muted/40 border border-border/60 rounded-md p-2.5 text-xs text-muted-foreground">
            A alteração será aplicada imediatamente ao banco de dados e refletida na listagem.
          </div>
          <DialogFooter className="flex items-center justify-end gap-2 pt-2 border-t border-border">
            <button
              type="button"
              disabled={isUpdatingField}
              onClick={() => setQuickConfirm(null)}
              className="rounded-md border border-border px-3.5 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={isUpdatingField}
              onClick={handleConfirmQuickUpdate}
              className="rounded-md bg-emerald-700 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-800 transition-colors disabled:opacity-50"
            >
              {isUpdatingField ? "Salvando..." : "Confirmar alteração"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
