import { Terminal, Database, ShieldCheck, BookOpen, Clock } from "lucide-react";
import type { SystemStatusData, OperationalLog } from "./types";

interface SystemStatusProps {
  system: SystemStatusData;
  logs: OperationalLog[];
}

export function SystemStatus({ system, logs }: SystemStatusProps) {
  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="inline-flex items-center gap-1.5 font-mono text-xs uppercase tracking-wider text-muted-foreground">
            <Terminal className="h-3.5 w-3.5 text-muted-foreground" />
            <span>CONSOLE TÉCNICO & INFRAESTRUTURA</span>
          </div>
          <h2 className="font-display text-xl sm:text-2xl font-bold text-foreground mt-1">
            Status dos Serviços & Logs de Operação
          </h2>
        </div>
        <span className="font-mono text-xs text-muted-foreground hidden sm:inline-block">
          PostgreSQL • Sessões JWT • Catálogo de ensino
        </span>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Painel Esquerdo: Cards de Status dos Serviços (1 Coluna) */}
        <div className="space-y-3">
          {/* Card 1: Supabase Database */}
          <div className="rounded-xl border border-border bg-card p-4.5 blueprint-corners">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2.5">
                <Database className="h-4 w-4 text-emerald-700 dark:text-emerald-400" />
                <span className="font-mono text-xs font-semibold text-foreground">
                  Banco de Dados PostgreSQL
                </span>
              </div>
              <span className="inline-flex items-center gap-1 font-mono text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                ONLINE
              </span>
            </div>
            <div className="mt-3 space-y-1 font-mono text-[11px] text-muted-foreground">
              <div className="flex justify-between">
                <span>Instância:</span>
                <span className="text-foreground">{system.database.provider} (Porta {system.database.port})</span>
              </div>
              <div className="flex justify-between">
                <span>Latência:</span>
                <span className="text-emerald-700 dark:text-emerald-400 font-bold">{system.database.latencyMs}ms</span>
              </div>
              <div className="flex justify-between">
                <span>Pool de Conexão:</span>
                <span className="text-foreground">{system.database.pooled ? "Pooler configurado" : "Conexão direta"}</span>
              </div>
            </div>
          </div>

          {/* Card 2: Auth Engine */}
          <div className="rounded-xl border border-border bg-card p-4.5 blueprint-corners">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="h-4 w-4 text-blue-700 dark:text-blue-400" />
                <span className="font-mono text-xs font-semibold text-foreground">
                  Motor de Autenticação JWT
                </span>
              </div>
              <span className="inline-flex items-center gap-1 font-mono text-[10px] font-semibold text-blue-700 dark:text-blue-300 bg-blue-500/10 px-2 py-0.5 rounded">
                ATIVO
              </span>
            </div>
            <div className="mt-3 space-y-1 font-mono text-[11px] text-muted-foreground">
              <div className="flex justify-between">
                <span>Algoritmo:</span>
                <span className="text-foreground">{system.auth.algorithm} (jose)</span>
              </div>
              <div className="flex justify-between">
                <span>Cookie de Sessão:</span>
                <span className="text-foreground">{system.auth.cookieName}</span>
              </div>
              <div className="flex justify-between">
                <span>Criptografia Senha:</span>
                <span className="text-foreground">Bcrypt ({system.auth.saltRounds} rounds)</span>
              </div>
            </div>
          </div>

          {/* Card 3: Ensino Catalog */}
          <div className="rounded-xl border border-border bg-card p-4.5 blueprint-corners">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2.5">
                <BookOpen className="h-4 w-4 text-purple-700 dark:text-purple-400" />
                <span className="font-mono text-xs font-semibold text-foreground">
                  Catálogo de Ensino
                </span>
              </div>
              <span className="inline-flex items-center gap-1 font-mono text-[10px] font-semibold text-purple-700 dark:text-purple-300 bg-purple-500/10 px-2 py-0.5 rounded">
                {system.courses.status === "online" ? "CONSULTADO" : "SEM CURSO"}
              </span>
            </div>
            <div className="mt-3 space-y-1 font-mono text-[11px] text-muted-foreground">
              <div className="flex justify-between">
                <span>Curso Ativo:</span>
                <span className="text-foreground">{system.courses.courseTitle}</span>
              </div>
              <div className="flex justify-between">
                <span>Módulos & Lições:</span>
                <span className="text-foreground">
                  {system.courses.modulesCount} Módulos • {system.courses.lessonsCount} Lições
                </span>
              </div>
              <div className="flex justify-between">
                <span>Exercícios Práticos:</span>
                <span className="text-foreground">{system.courses.exercisesCount} Desafios</span>
              </div>
            </div>
          </div>
        </div>

        {/* Painel Direito: Stream de Logs do Terminal (2 Colunas) */}
        <div className="lg:col-span-2 rounded-xl border border-border bg-black/90 p-5 font-mono text-xs flex flex-col justify-between blueprint-corners">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-border text-muted-foreground">
              <div className="flex items-center gap-2">
                <div className="flex gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-red-500/80" />
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-500/80" />
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/80" />
                </div>
                <span className="text-secondary-foreground text-xs font-semibold pl-2">
                  terminal-logs@sistema-autonomos:~#
                </span>
              </div>
              <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Consulta atual
              </span>
            </div>

            <div className="mt-4 space-y-2.5 overflow-x-auto max-h-72">
              {logs.map((log) => (
                <div key={log.id} className="flex items-start gap-2 text-[11px] leading-relaxed">
                  <span className="text-muted-foreground shrink-0">
                    [{new Date(log.timestamp).toLocaleTimeString("pt-BR")}]
                  </span>
                  <span
                    className={`font-semibold shrink-0 ${
                      log.level === "SUCCESS"
                        ? "text-emerald-700 dark:text-emerald-400"
                        : log.level === "WARN"
                        ? "text-amber-700 dark:text-amber-400"
                        : "text-blue-700 dark:text-blue-400"
                    }`}
                  >
                    [{log.source}]
                  </span>
                  <span className="text-secondary-foreground break-all">{log.message}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-[11px] text-muted-foreground">
            <span>Resultados da consulta ao banco de dados</span>
            <span className="text-emerald-700 dark:text-emerald-400 font-bold">Telemetria não integrada</span>
          </div>
        </div>
      </div>
    </section>
  );
}

export { SystemStatus as SystemStatusLogs };
