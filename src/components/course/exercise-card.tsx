"use client";

import React, { useState, useEffect } from "react";
import {
  Code2,
  Terminal,
  CheckCircle2,
  Lightbulb,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronUp,
  Award,
  CircleCheck,
  AlertTriangle,
  Play,
} from "lucide-react";
import { CodeBlock } from "./code-block";
import { ExerciseData } from "./types";

export interface ExerciseCardProps {
  exercise: ExerciseData;
  onToggleComplete?: (exerciseId: string, completed: boolean) => void;
  className?: string;
}

export function ExerciseCard({
  exercise,
  onToggleComplete,
  className = "",
}: ExerciseCardProps) {
  const [isSolutionOpen, setIsSolutionOpen] = useState(false);
  const [isHintsOpen, setIsHintsOpen] = useState(false);
  const [isCompleted, setIsCompleted] = useState(exercise.isCompleted || false);

  useEffect(() => {
    setIsCompleted(Boolean(exercise.isCompleted));
  }, [exercise.isCompleted]);

  const {
    id,
    title,
    type = "CODE",
    prompt,
    instructions,
    starterCode,
    initialCode,
    solutionCode,
    hints,
    points = 10,
  } = exercise;

  const actualStarterCode = starterCode || initialCode;

  // Cálculo de dificuldade baseado na pontuação
  const getDifficulty = (pts: number) => {
    if (pts <= 15) {
      return {
        label: "Iniciante",
        badgeClass: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
      };
    }
    if (pts <= 20) {
      return {
        label: "Intermediário",
        badgeClass: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30",
      };
    }
    return {
      label: "Avançado / Capstone",
      badgeClass: "bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/30",
    };
  };

  const difficulty = getDifficulty(points);

  // Parse das Dicas (JSON string ou plaintext)
  const parseHints = (rawHints?: string | string[] | null): string[] => {
    if (!rawHints) return [];
    if (Array.isArray(rawHints)) return rawHints;
    try {
      const parsed = JSON.parse(rawHints);
      if (Array.isArray(parsed)) return parsed;
      return [String(parsed)];
    } catch {
      return rawHints
        .split("\n")
        .map((h) => h.trim())
        .filter(Boolean);
    }
  };

  const parsedHints = parseHints(hints);

  // Detecção de tipo de exercício
  const normalizedType = String(type).toUpperCase();
  const isCode = normalizedType === "CODE";
  const isTask = normalizedType === "TASK";

  // Detecção da linguagem do starter e solution
  const detectLanguage = (codeText?: string | null) => {
    if (!codeText) return "python";
    if (codeText.includes("#include") || codeText.includes("rclcpp::")) return "cpp";
    if (codeText.includes("import rclpy") || codeText.includes("class ")) return "python";
    if (codeText.includes("<launch>") || codeText.includes("<node")) return "xml";
    if (
      codeText.includes("ros2 run") ||
      codeText.includes("ros2 topic") ||
      codeText.includes("colcon")
    )
      return "bash";
    return "python";
  };

  const starterLang = detectLanguage(actualStarterCode);
  const solutionLang = detectLanguage(solutionCode);

  const handleToggleCompleted = () => {
    const nextState = !isCompleted;
    setIsCompleted(nextState);
    if (onToggleComplete) {
      onToggleComplete(id, nextState);
    }
  };

  return (
    <div
      className={`rounded-xl border border-border bg-card blueprint-corners overflow-hidden shadow-lg transition-all ${
        isCompleted ? "border-emerald-500/40 shadow-emerald-950/20" : ""
      } ${className}`}
    >
      {/* Header do Card de Exercício */}
      <div className="p-4 sm:p-5 border-b border-border bg-card flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1.5 flex-1 min-w-[240px]">
          <div className="flex flex-wrap items-center gap-2">
            {/* Badge de Tipo */}
            {isCode ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-mono font-medium bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">
                <Code2 size={12} />
                <span>Desafio em Código</span>
              </span>
            ) : isTask ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-mono font-medium bg-purple-500/10 text-purple-700 dark:text-purple-400 border border-purple-500/30">
                <Terminal size={12} />
                <span>Tarefa de Terminal / Grafo</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-mono font-medium bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/30">
                <CheckCircle2 size={12} />
                <span>Quiz Técnico</span>
              </span>
            )}

            {/* Badge de Dificuldade */}
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-medium border ${difficulty.badgeClass}`}
            >
              {difficulty.label}
            </span>

            {/* Pontuação */}
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-foreground/5 text-secondary-foreground border border-border">
              <Award size={12} className="text-amber-700 dark:text-amber-400" />
              <span className="tabular">+{points} pts</span>
            </span>
          </div>

          <h4 className="font-display font-bold text-base sm:text-lg text-foreground">
            {title}
          </h4>
        </div>

        {/* Botão Marcar como Concluído */}
        <button
          onClick={handleToggleCompleted}
          type="button"
          aria-label={isCompleted ? "Exercício concluído" : "Marcar exercício como concluído"}
          title={isCompleted ? "Exercício concluído (clique para desmarcar)" : "Marcar exercício como concluído"}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all duration-200 border cursor-pointer ${
            isCompleted
              ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30"
              : "bg-foreground/5 text-secondary-foreground border-border hover:bg-foreground/10 hover:text-foreground"
          }`}
        >
          {isCompleted ? (
            <>
              <CircleCheck size={14} className="text-emerald-700 dark:text-emerald-400" />
              <span>Exercício Concluído</span>
            </>
          ) : (
            <>
              <CheckCircle2 size={14} className="text-muted-foreground" />
              <span>Marcar Exercício como Concluído</span>
            </>
          )}
        </button>
      </div>

      {/* Corpo do Exercício */}
      <div className="p-4 sm:p-5 space-y-5 text-sm">
        {/* Enunciado do Desafio */}
        <div className="space-y-2">
          <div className="font-mono text-xs uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1.5">
            <Play size={12} className="text-purple-700 dark:text-purple-400" />
            <span>Objetivo do Exercício</span>
          </div>
          <div className="text-foreground leading-relaxed whitespace-pre-line bg-muted/60 p-3.5 rounded-lg border border-border">
            {prompt}
          </div>
        </div>

        {/* Instruções Detalhadas se houver */}
        {instructions && (
          <div className="space-y-1.5">
            <div className="font-mono text-xs uppercase tracking-wider text-muted-foreground font-semibold">
              Critérios de Aceite & Instruções
            </div>
            <div className="text-secondary-foreground leading-relaxed whitespace-pre-line text-xs sm:text-sm pl-2 border-l-2 border-purple-500/40">
              {instructions}
            </div>
          </div>
        )}

        {/* Código Inicial / Starter Template (se houver) */}
        {actualStarterCode && (
          <div className="space-y-2">
            <div className="font-mono text-xs uppercase tracking-wider text-muted-foreground font-semibold flex items-center justify-between">
              <span>Código Inicial / Boilerplate</span>
              <span className="text-[11px] text-muted-foreground font-normal">
                Copie e complete as seções marcadas com TODO
              </span>
            </div>
            <CodeBlock
              code={actualStarterCode}
              language={starterLang}
              fileName="starter_template"
              showLineNumbers={true}
            />
          </div>
        )}

        {/* Accordion de Dicas / Hints */}
        {parsedHints.length > 0 && (
          <div className="border border-border rounded-lg overflow-hidden bg-muted/60">
            <button
              onClick={() => setIsHintsOpen(!isHintsOpen)}
              type="button"
              className="w-full flex items-center justify-between p-3 text-left font-mono text-xs font-medium text-amber-700 dark:text-amber-300 hover:bg-foreground/5 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Lightbulb size={14} className="text-amber-700 dark:text-amber-400" />
                <span>Dicas de Apoio ({parsedHints.length})</span>
              </div>
              {isHintsOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>

            {isHintsOpen && (
              <div className="p-3.5 pt-1 space-y-2 border-t border-border text-xs">
                {parsedHints.map((hint, hIdx) => (
                  <div
                    key={hIdx}
                    className="flex items-start gap-2.5 p-2 rounded bg-amber-100 dark:bg-amber-950/20 border border-amber-500/20 text-amber-700 dark:text-amber-200/90 leading-relaxed"
                  >
                    <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-700 dark:text-amber-300 font-semibold shrink-0 mt-0.5">
                      #{hIdx + 1}
                    </span>
                    <span>{hint}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Toggle de Solução Sugerida */}
        {solutionCode && (
          <div className="pt-2 border-t border-border">
            <div className="flex items-center justify-between">
              <button
                onClick={() => setIsSolutionOpen(!isSolutionOpen)}
                type="button"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-mono text-xs font-semibold text-purple-700 dark:text-purple-300 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 transition-all cursor-pointer"
              >
                {isSolutionOpen ? (
                  <>
                    <EyeOff size={14} />
                    <span>Ocultar Solução Sugerida</span>
                  </>
                ) : (
                  <>
                    <Eye size={14} />
                    <span>Ver Solução Sugerida</span>
                  </>
                )}
              </button>
            </div>

            {isSolutionOpen && (
              <div className="mt-3.5 space-y-3 animate-in fade-in duration-200">
                {/* Aviso pedagógico */}
                <div className="flex items-start gap-2.5 p-3 rounded-lg bg-amber-100 dark:bg-amber-950/25 border border-amber-500/30 text-amber-700 dark:text-amber-200/90 text-xs leading-relaxed">
                  <AlertTriangle size={15} className="text-amber-700 dark:text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-amber-700 dark:text-amber-300 font-mono">
                      Recomendação Harpia:
                    </span>{" "}
                    Tente resolver o exercício no seu terminal antes de espiar o código final.
                    Depurar e errar faz parte do aprendizado prático de robótica!
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="font-mono text-xs text-muted-foreground uppercase tracking-wider font-semibold">
                    Solução Oficial Completa:
                  </div>
                  <CodeBlock
                    code={solutionCode}
                    language={solutionLang}
                    fileName="solution"
                    showLineNumbers={true}
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------------
// Componente de Lista de Exercícios de uma Lição
// ----------------------------------------------------------------------------

export interface ExerciseListProps {
  exercises: ExerciseData[];
  onToggleComplete?: (exerciseId: string, completed: boolean) => void;
  className?: string;
}

export function ExerciseList({
  exercises,
  onToggleComplete,
  className = "",
}: ExerciseListProps) {
  if (!exercises || exercises.length === 0) {
    return null;
  }

  const totalPoints = exercises.reduce((acc, ex) => acc + (ex.points || 0), 0);

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header da Seção de Exercícios */}
      <div className="flex items-center justify-between pb-3 border-b border-border">
        <div className="flex items-center gap-2.5">
          <Terminal className="w-5 h-5 text-emerald-700 dark:text-emerald-400" />
          <h3 className="font-display font-bold text-lg text-foreground">
            Atividades & Exercícios Práticos
          </h3>
          <span className="px-2 py-0.5 rounded-full text-xs font-mono font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">
            {exercises.length} {exercises.length === 1 ? "exercício" : "exercícios"}
          </span>
        </div>

        <div className="font-mono text-xs text-muted-foreground flex items-center gap-1.5">
          <span>Recompensa Total:</span>
          <span className="text-amber-700 dark:text-amber-400 font-semibold tabular">+{totalPoints} pts</span>
        </div>
      </div>

      {/* Cards de Exercícios */}
      <div className="space-y-4">
        {exercises.map((exercise) => (
          <ExerciseCard
            key={exercise.id}
            exercise={exercise}
            onToggleComplete={onToggleComplete}
          />
        ))}
      </div>
    </div>
  );
}
