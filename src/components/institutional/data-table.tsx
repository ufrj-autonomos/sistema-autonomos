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
} from "lucide-react";
import type { AdminModel } from "@/lib/institutional/admin-config";
import { deleteRecord } from "@/app/(gestao)/gestao/site/actions";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/institutional/ui/dialog";
import { useInstitutionalAsset } from "./site-context";
import { directoryPath } from "@/lib/institutional/routes";
import { cn } from "@/lib/utils";

export function DataTable({
  config,
  data,
  tableSlug,
}: {
  config: AdminModel;
  data: any[];
  tableSlug: string;
}) {
  const assetUrl = useInstitutionalAsset();
  const [search, setSearch] = useState("");
  const [teamFilter, setTeamFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [areaFilter, setAreaFilter] = useState<string>("all");
  const [isDeleting, setIsDeleting] = useState<number | null>(null);
  const [deleteConfirmTarget, setDeleteConfirmTarget] = useState<any | null>(null);
  const [previewImage, setPreviewImage] = useState<{ url: string; title: string } | null>(null);

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
      }
    } catch (err: any) {
      alert("Erro ao excluir. Verifique se o registro está associado a outras tabelas.");
    } finally {
      setIsDeleting(null);
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

  return (
    <div className="w-full">
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
              className="w-full rounded-md border border-border bg-background pl-9 pr-8 py-2 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
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
        <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
          {hasTeamField && (
            <div className="flex items-center gap-1 bg-background/50 border border-border rounded-md p-1">
              <span className="px-2 font-mono text-[10px] uppercase text-muted-foreground">Equipe:</span>
              {[
                { label: "Todas", value: "all" },
                { label: "Geral", value: "geral" },
                { label: "Nautilus", value: "nautilus" },
                { label: "Harpia", value: "harpia" },
              ].map((pill) => (
                <button
                  key={pill.value}
                  onClick={() => setTeamFilter(pill.value)}
                  className={cn(
                    "rounded px-2 py-0.5 text-xs transition-colors cursor-pointer",
                    teamFilter === pill.value
                      ? "bg-primary text-primary-foreground font-medium"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {pill.label}
                </button>
              ))}
            </div>
          )}

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
      </div>

      {/* Main Table View */}
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
                      let color = "bg-amber-500/10 text-amber-400 border-amber-500/30";

                      if (tId === 1 || row.team?.slug === "nautilus" || row.teamSlug === "nautilus") {
                        label = "Nautilus";
                        color = "bg-cyan-500/10 text-cyan-400 border-cyan-500/30";
                      } else if (tId === 2 || row.team?.slug === "harpia" || row.teamSlug === "harpia") {
                        label = "Harpia";
                        color = "bg-purple-500/10 text-purple-400 border-purple-500/30";
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
                          <span
                            className={cn(
                              "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-mono border",
                              isF
                                ? "bg-rose-500/10 text-rose-400 border-rose-500/30"
                                : "bg-muted/50 text-muted-foreground border-hairline"
                            )}
                          >
                            <span
                              className={cn(
                                "h-1.5 w-1.5 rounded-full",
                                isF ? "bg-rose-400" : "bg-muted-foreground/60"
                              )}
                            />
                            {isF ? "Feminino" : "Masculino"}
                          </span>
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
                        gestão: "bg-amber-500/10 text-amber-400 border-amber-500/30",
                        gestao: "bg-amber-500/10 text-amber-400 border-amber-500/30",
                        marketing: "bg-rose-500/10 text-rose-400 border-rose-500/30",
                        software: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
                        eletrônica: "bg-amber-500/10 text-amber-300 border-amber-500/30",
                        eletronica: "bg-amber-500/10 text-amber-300 border-amber-500/30",
                        mecânica: "bg-orange-500/10 text-orange-400 border-orange-500/30",
                        mecanica: "bg-orange-500/10 text-orange-400 border-orange-500/30",
                        orientação: "bg-orange-600/10 text-orange-400 border-orange-600/30",
                        orientacao: "bg-orange-600/10 text-orange-400 border-orange-600/30",
                      };
                      const colorClass =
                        areaColors[String(rawVal).toLowerCase()] ||
                        "bg-muted/60 text-muted-foreground border-border";

                      return (
                        <td key={fieldKey} className="px-5 py-3">
                          <span
                            className={cn(
                              "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-mono border",
                              colorClass
                            )}
                          >
                            {rawVal}
                          </span>
                        </td>
                      );
                    }

                    // 4. Active status
                    if (fieldKey === "active" || typeof rawVal === "boolean") {
                      const isActive = Boolean(rawVal);
                      return (
                        <td key={fieldKey} className="px-5 py-3">
                          <span
                            className={cn(
                              "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-mono border",
                              isActive
                                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                                : "bg-muted text-muted-foreground border-hairline"
                            )}
                          >
                            <span
                              className={cn(
                                "h-1.5 w-1.5 rounded-full",
                                isActive ? "bg-emerald-400" : "bg-muted-foreground"
                              )}
                            />
                            {fieldKey === "showOnSite" ? (isActive ? "Visível no site" : "Somente na gestão") : (isActive ? "Ativo" : "Inativo")}
                          </span>
                        </td>
                      );
                    }

                    // 4. Category (timeline)
                    if (fieldKey === "category") {
                      const cat = String(rawVal).toLowerCase();
                      const catColors: Record<string, string> = {
                        marco: "bg-zinc-500/10 text-zinc-300 border-zinc-500/30",
                        projeto: "bg-blue-500/10 text-blue-400 border-blue-500/30",
                        premio: "bg-rose-500/10 text-rose-400 border-rose-500/30",
                        competicao: "bg-amber-500/10 text-amber-400 border-amber-500/30",
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
                      if (opt) displayVal = opt.label;
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
                        className="inline-flex items-center justify-center rounded-md border border-red-500/20 bg-red-500/5 p-1 text-red-400 hover:bg-red-500/20 hover:text-red-300 transition-colors disabled:opacity-50 cursor-pointer"
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
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-500/10 text-red-400 border border-red-500/30">
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
            <p className="text-red-400/90 bg-red-500/10 border border-red-500/20 p-2.5 rounded-md">
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
              className="rounded-md bg-red-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-red-500 transition-colors disabled:opacity-50"
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
            <div className="mt-2 relative aspect-video w-full rounded-md overflow-hidden border border-border bg-black/40 flex items-center justify-center">
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
    </div>
  );
}
