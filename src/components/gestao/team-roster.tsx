"use client";

import { useState, useMemo } from "react";
import { Search, Users, Github, Linkedin, Filter } from "lucide-react";
import type { MemberRecord } from "./types";

interface TeamRosterProps {
  initialMembers: MemberRecord[];
}

/**
 * Normalizes a string by decomposing Unicode diacritics, stripping combining
 * marks, converting to lower case, and trimming surrounding whitespace.
 * Returns empty string for null, undefined, or empty values.
 */
export function normalizeText(text: string | null | undefined): string {
  if (!text) return "";
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

/**
 * Pure, deterministic filter function for team roster members.
 * Supports case-insensitive, diacritic-insensitive, and whitespace-trimmed
 * searches across name, role, course, and bio, as well as division and area filters.
 */
export function filterMembers(
  initialMembers: MemberRecord[],
  search: string,
  selectedDivision: "all" | "harpia" | "nautilus" | "geral",
  selectedArea: string
): MemberRecord[] {
  const normSearch = normalizeText(search);
  const normArea = normalizeText(selectedArea);
  const isAllArea = normArea === "all" || normArea === "";

  return initialMembers.filter((member) => {
    // 1. Check division first (cheap string comparison, short-circuits early)
    const matchDivision =
      selectedDivision === "all" || member.division === selectedDivision;
    if (!matchDivision) return false;

    // 2. Check area second
    const matchArea =
      isAllArea || normalizeText(member.area) === normArea;
    if (!matchArea) return false;

    // 3. If search query is empty, pass immediately without normalizing text
    if (normSearch === "") return true;

    // 4. Lazy evaluation of search query against member fields
    if (normalizeText(member.name).includes(normSearch)) return true;
    if (normalizeText(member.role).includes(normSearch)) return true;
    if (member.course && normalizeText(member.course).includes(normSearch)) return true;
    if (member.bio && normalizeText(member.bio).includes(normSearch)) return true;

    return false;
  });
}

export function TeamRoster({ initialMembers }: TeamRosterProps) {
  const [search, setSearch] = useState("");
  const [selectedDivision, setSelectedDivision] = useState<"all" | "harpia" | "nautilus" | "geral">("all");
  const [selectedArea, setSelectedArea] = useState<string>("all");

  const filteredMembers = useMemo(() => {
    return filterMembers(initialMembers, search, selectedDivision, selectedArea);
  }, [initialMembers, search, selectedDivision, selectedArea]);

  return (
    <section id="membros" className="space-y-4">
      {/* Header e Controles */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 font-mono text-xs uppercase tracking-wider text-muted-foreground">
            <Users className="h-3.5 w-3.5 text-muted-foreground" />
            <span>DIRETÓRIO & ROSTER DE ENGENHARIA</span>
          </div>
          <h2 className="font-display text-xl sm:text-2xl font-bold text-foreground mt-1">
            Quadro de Integrantes
          </h2>
        </div>

        {/* Campo de Busca */}
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome, papel ou curso..."
            className="w-full rounded-lg border border-input bg-card pl-9 pr-3 py-2 font-mono text-xs text-foreground placeholder-zinc-500 focus:border-input focus:outline-none transition-colors"
          />
        </div>
      </div>

      {/* Filtros em Abas */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-y border-border py-3">
        {/* Abas de Divisão */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setSelectedDivision("all")}
            className={`rounded-lg px-3 py-1.5 font-mono text-xs transition-colors cursor-pointer ${
              selectedDivision === "all"
                ? "bg-primary text-primary-foreground font-semibold"
                : "bg-card text-muted-foreground hover:text-foreground"
            }`}
          >
            Todos ({initialMembers.length})
          </button>
          <button
            type="button"
            onClick={() => setSelectedDivision("harpia")}
            className={`rounded-lg px-3 py-1.5 font-mono text-xs transition-colors cursor-pointer ${
              selectedDivision === "harpia"
                ? "bg-purple-600 text-white font-semibold"
                : "bg-card text-muted-foreground hover:text-purple-300"
            }`}
          >
            Harpia (UAV)
          </button>
          <button
            type="button"
            onClick={() => setSelectedDivision("nautilus")}
            className={`rounded-lg px-3 py-1.5 font-mono text-xs transition-colors cursor-pointer ${
              selectedDivision === "nautilus"
                ? "bg-blue-600 text-white font-semibold"
                : "bg-card text-muted-foreground hover:text-blue-300"
            }`}
          >
            Nautilus (AUV)
          </button>
          <button
            type="button"
            onClick={() => setSelectedDivision("geral")}
            className={`rounded-lg px-3 py-1.5 font-mono text-xs transition-colors cursor-pointer ${
              selectedDivision === "geral"
                ? "bg-accent text-foreground font-semibold"
                : "bg-card text-muted-foreground hover:text-foreground"
            }`}
          >
            Geral / Gestão
          </button>
        </div>

        {/* Filtro de Área Técnica */}
        <div className="flex items-center gap-2 font-mono text-xs">
          <Filter className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-muted-foreground">Área:</span>
          <select
            value={selectedArea}
            onChange={(e) => setSelectedArea(e.target.value)}
            className="rounded-lg border border-input bg-card px-2.5 py-1 text-xs text-foreground focus:outline-none"
          >
            <option value="all">Todas as Áreas</option>
            <option value="software">Software</option>
            <option value="mecanica">Mecânica</option>
            <option value="eletronica">Eletrônica</option>
            <option value="gestao">Gestão</option>
          </select>
        </div>
      </div>

      {/* Tabela Responsiva (Desktop) */}
      <div className="hidden md:block rounded-xl border border-border bg-card overflow-x-auto">
        <table className="w-full min-w-[800px] text-left font-mono text-xs">
          <thead className="border-b border-border bg-muted/60 text-muted-foreground">
            <tr>
              <th className="py-3.5 pl-4 pr-3 font-semibold uppercase">Integrante</th>
              <th className="px-3 py-3.5 font-semibold uppercase">Papel / Função</th>
              <th className="px-3 py-3.5 font-semibold uppercase">Divisão</th>
              <th className="px-3 py-3.5 font-semibold uppercase">Área</th>
              <th className="px-3 py-3.5 font-semibold uppercase">Curso UFRJ</th>
              <th className="py-3.5 pl-3 pr-4 text-right font-semibold uppercase">Links</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filteredMembers.length > 0 ? (
              filteredMembers.map((m) => (
                <tr key={m.id} className="hover:bg-foreground/[0.02] transition-colors">
                  <td className="py-3 pl-4 pr-3">
                    <div className="font-sans font-medium text-foreground text-sm">
                      {m.name}
                    </div>
                    {m.bio && (
                      <div className="text-[11px] text-muted-foreground line-clamp-1 max-w-xs font-mono">
                        {m.bio}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-3 text-foreground">
                    <span className="font-semibold text-foreground">{m.role}</span>
                  </td>
                  <td className="px-3 py-3">
                    <span
                      className={`inline-flex items-center rounded px-2 py-0.5 text-[10px] font-semibold ${
                        m.division === "harpia"
                          ? "bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 border border-purple-500/30"
                          : m.division === "nautilus"
                          ? "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border border-blue-500/30"
                          : "bg-accent text-secondary-foreground border border-border"
                      }`}
                    >
                      {m.divisionLabel}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-muted-foreground">{m.area}</td>
                  <td className="px-3 py-3 text-muted-foreground">{m.course || "—"}</td>
                  <td className="py-3 pl-3 pr-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {m.linkedin && (
                        <a
                          href={m.linkedin}
                          target="_blank"
                          rel="noreferrer"
                          className="text-muted-foreground hover:text-blue-400 transition-colors"
                          aria-label="LinkedIn"
                        >
                          <Linkedin className="h-4 w-4" />
                        </a>
                      )}
                      {m.github && (
                        <a
                          href={m.github}
                          target="_blank"
                          rel="noreferrer"
                          className="text-muted-foreground hover:text-foreground transition-colors"
                          aria-label="GitHub"
                        >
                          <Github className="h-4 w-4" />
                        </a>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="py-8 text-center text-muted-foreground">
                  Nenhum integrante encontrado com os filtros selecionados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Grid de Cards (Mobile) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:hidden">
        {filteredMembers.map((m) => (
          <div
            key={m.id}
            className="rounded-xl border border-border bg-card p-4 space-y-2.5"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <h4 className="font-sans font-bold text-foreground text-sm">{m.name}</h4>
                <p className="font-mono text-xs text-secondary-foreground">{m.role}</p>
              </div>
              <span
                className={`rounded px-2 py-0.5 font-mono text-[10px] font-semibold ${
                  m.division === "harpia"
                    ? "bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 border border-purple-500/30"
                    : m.division === "nautilus"
                    ? "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border border-blue-500/30"
                    : "bg-accent text-secondary-foreground border border-border"
                }`}
              >
                {m.divisionLabel}
              </span>
            </div>

            {m.bio && <p className="text-xs text-muted-foreground line-clamp-2">{m.bio}</p>}

            <div className="flex items-center justify-between pt-2 border-t border-border font-mono text-[11px] text-muted-foreground">
              <span>{m.area} • {m.course || "UFRJ"}</span>
              <div className="flex items-center gap-2">
                {m.linkedin && (
                  <a href={m.linkedin} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-blue-400">
                    <Linkedin className="h-3.5 w-3.5" />
                  </a>
                )}
                {m.github && (
                  <a href={m.github} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-foreground">
                    <Github className="h-3.5 w-3.5" />
                  </a>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
