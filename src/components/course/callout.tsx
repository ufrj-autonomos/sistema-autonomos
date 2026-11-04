import React from "react";
import { Lightbulb, AlertTriangle, Info, Terminal } from "lucide-react";

export type CalloutType =
  | "tip"
  | "warning"
  | "info"
  | "terminal"
  | "dica"
  | "atencao"
  | "atenção"
  | "conceito"
  | "comando";

export interface CalloutProps {
  type?: CalloutType;
  title?: string;
  children?: React.ReactNode;
  className?: string;
}

export function Callout({
  type = "info",
  title,
  children,
  className = "",
}: CalloutProps) {
  const normalizedType = type.toLowerCase();

  const isTip = normalizedType === "tip" || normalizedType === "dica";
  const isWarning =
    normalizedType === "warning" ||
    normalizedType === "atencao" ||
    normalizedType === "atenção";
  const isTerminal = normalizedType === "terminal" || normalizedType === "comando";

  const config = isTip
    ? {
        borderClass:
          "border-l-4 border-l-emerald-500 border-emerald-500/30 bg-emerald-950/25",
        titleColor: "text-emerald-300",
        textColor: "text-emerald-100/90",
        defaultTitle: "Dica Prática / Boas Práticas",
        icon: <Lightbulb className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />,
      }
    : isWarning
    ? {
        borderClass:
          "border-l-4 border-l-amber-500 border-amber-500/30 bg-amber-950/25",
        titleColor: "text-amber-300",
        textColor: "text-amber-100/90",
        defaultTitle: "Atenção / Ponto Crítico",
        icon: <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />,
      }
    : isTerminal
    ? {
        borderClass:
          "border-l-4 border-l-purple-500 border-purple-500/30 bg-purple-950/25",
        titleColor: "text-purple-300",
        textColor: "text-purple-100/90",
        defaultTitle: "Execução no Terminal / Shell",
        icon: <Terminal className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" />,
      }
    : {
        borderClass:
          "border-l-4 border-l-blue-500 border-blue-500/30 bg-blue-950/25",
        titleColor: "text-blue-300",
        textColor: "text-blue-100/90",
        defaultTitle: "Conceito Chave / ROS 2 Jalisco",
        icon: <Info className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />,
      };

  return (
    <div
      role="note"
      className={`my-4 p-4 rounded-r-xl border ${config.borderClass} ${className}`}
    >
      <div className="flex items-start gap-3">
        {config.icon}
        <div className="flex-1 min-w-0">
          <h5
            className={`font-mono text-xs uppercase tracking-wider font-semibold mb-1.5 ${config.titleColor}`}
          >
            {title || config.defaultTitle}
          </h5>
          <div className={`text-sm leading-relaxed ${config.textColor}`}>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
