"use client";

import React from "react";
import { BookOpen, ExternalLink, Clock, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { CodeBlock } from "./code-block";
import { Callout, CalloutType } from "./callout";

export interface LessonContentProps {
  content?: string;
  summary?: string | null;
  rosDocsUrl?: string | null;
  durationSeconds?: number | null;
  lessonTitle?: string;
  className?: string;
  isText?: boolean;
}

export function LessonContent({
  content = "",
  summary,
  rosDocsUrl,
  durationSeconds,
  lessonTitle,
  className = "",
  isText = false,
}: LessonContentProps) {
  // Estimativa de tempo de leitura caso não haja vídeo
  const readingTimeMin = Math.max(1, Math.ceil((content?.length || 500) / 1000) * 2);

  // Parser robusto que converte Markdown + HTML em blocos estruturados
  const renderFormattedContent = (rawText: string) => {
    if (!rawText || !rawText.trim()) {
      return (
        <div className="p-6 text-center text-zinc-500 font-mono text-sm border border-dashed border-white/10 rounded-xl">
          Nenhuma documentação teórica escrita disponível para esta aula.
        </div>
      );
    }

    // Dividimos o texto em blocos: CodeBlocks, Callouts, Parágrafos/Headings
    // 1. Regex de blocos de código Markdown: ```lang ... ```
    // 2. Regex de blocos <pre> HTML: <pre ...><code>...</code></pre>
    const codeBlockRegex =
      /(?:```([a-zA-Z0-9_-]*)\n([\s\S]*?)```|<pre(?:\s+class="([^"]*)")?>\s*(?:<code(?:\s+class="([^"]*)")?>)?([\s\S]*?)(?:<\/code>)?\s*<\/pre>)/gi;

    const sections: React.ReactNode[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;
    let segmentKey = 0;

    // Processa o texto segmentando entre blocos de código e texto corrido
    while ((match = codeBlockRegex.exec(rawText)) !== null) {
      const matchIndex = match.index;

      // Texto antes do bloco de código
      if (matchIndex > lastIndex) {
        const textChunk = rawText.substring(lastIndex, matchIndex);
        sections.push(
          <TextAndCalloutParser key={`chunk-${segmentKey++}`} content={textChunk} />
        );
      }

      // Bloco de código capturado (Markdown ou HTML)
      const isMarkdownCode = Boolean(match[2] !== undefined);
      const language = isMarkdownCode
        ? match[1] || "bash"
        : detectHtmlCodeLang(match[3] || match[4] || "", match[5] || "");
      const codeContent = isMarkdownCode ? match[2] : unescapeHtml(match[5] || "");

      sections.push(
        <CodeBlock
          key={`code-${segmentKey++}`}
          code={codeContent}
          language={language}
          showLineNumbers={true}
        />
      );

      lastIndex = matchIndex + match[0].length;
    }

    // Texto remanescente após o último bloco de código
    if (lastIndex < rawText.length) {
      const remainingText = rawText.substring(lastIndex);
      sections.push(
        <TextAndCalloutParser key={`chunk-${segmentKey++}`} content={remainingText} />
      );
    }

    return sections;
  };

  return (
    <div id="lesson-content" className={`space-y-6 text-zinc-200 ${className}`}>
      {/* Header Informativo da Lição */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className={cn(
            "w-9 h-9 rounded-xl flex items-center justify-center border",
            isText
              ? "bg-blue-950/40 border-blue-500/30 text-blue-400"
              : "bg-white/5 border-white/10 text-purple-400"
          )}>
            {isText ? <BookOpen className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-display font-semibold text-lg text-white">
                {lessonTitle || "Guia Técnico & Documentação ROS 2"}
              </h3>
              {isText && (
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-blue-500/10 text-blue-300 border border-blue-500/20">
                  Aula Teórica
                </span>
              )}
            </div>
            <p className="text-xs font-mono text-zinc-400">
              {isText
                ? "Conteúdo didático e guia passo a passo traduzido e estruturado"
                : "Sintetizado para a distribuição ROS 2 Jazzy Jalisco"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isText ? (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-950/30 border border-blue-800/40 text-xs font-mono text-blue-300">
              <BookOpen size={12} className="text-blue-400" />
              <span>~{readingTimeMin} min leitura</span>
            </div>
          ) : durationSeconds ? (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/5 border border-white/10 text-xs font-mono text-zinc-300">
              <Clock size={12} className="text-amber-400" />
              <span>{Math.floor(durationSeconds / 60)} min aula</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/5 border border-white/10 text-xs font-mono text-zinc-300">
              <Clock size={12} className="text-blue-400" />
              <span>~{readingTimeMin} min leitura</span>
            </div>
          )}
        </div>
      </div>

      {/* Card de Link com a Documentação Oficial ROS 2 Jazzy */}
      {rosDocsUrl && (
        <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#111113] border border-purple-500/30 shadow-sm hover:border-purple-500/50 transition-colors">
          <div className="flex items-center gap-3">
            <BookOpen className="w-5 h-5 text-purple-400 shrink-0" />
            <div>
              <div className="font-mono text-xs font-semibold text-purple-300 uppercase tracking-wider">
                Documentação Oficial ROS 2
              </div>
              <div className="text-xs text-zinc-400">
                Consulte o repositório oficial de documentação da Open Robotics
              </div>
            </div>
          </div>
          <a
            href={rosDocsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/30 text-xs font-mono font-medium transition-colors"
          >
            <span>docs.ros.org</span>
            <ExternalLink size={12} />
          </a>
        </div>
      )}

      {/* Sumário Executivo */}
      {summary && (
        <div className="p-4 rounded-xl bg-white/5 border border-white/10 blueprint-corners">
          <div className="font-mono text-xs uppercase tracking-wider text-zinc-400 font-semibold mb-1">
            Sumário da Lição
          </div>
          <p className="text-sm text-zinc-300 leading-relaxed">
            <InlineMarkdownRenderer text={summary} />
          </p>
        </div>
      )}

      {/* Conteúdo Formatado com Code Blocks e Callouts */}
      <div className="lesson-body text-zinc-300 leading-relaxed space-y-4">
        {renderFormattedContent(content)}
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------------
// Subcomponentes e Funções Auxiliares de Parsing
// ----------------------------------------------------------------------------

function TextAndCalloutParser({ content }: { content: string }) {
  // Detecta shortcodes de Callouts: [Note]...[/Note], [Tip]...[/Tip], etc.
  // Também detecta sintaxe de citação Markdown: > [!TIP]
  const calloutRegex =
    /(?:<strong>\s*\[(Note|Tip|Warning|Terminal|Dica|Atenção|Atençao|Comando)\]\s*<\/strong>([\s\S]*?)<strong>\s*\[\/\1\]\s*<\/strong>|\[(Note|Tip|Warning|Terminal|Dica|Atenção|Atençao|Comando)\]([\s\S]*?)\[\/\3\]|> \[!(TIP|WARNING|NOTE|INFO|TERMINAL|DICA|ATENÇÃO|ATENCAO|COMANDO)\]([\s\S]*?)(?=(?:\n\s*\n|$)))/gi;

  const elements: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let idx = 0;

  while ((match = calloutRegex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      const normalText = content.substring(lastIndex, match.index);
      elements.push(<StandardTextRenderer key={`norm-${idx++}`} text={normalText} />);
    }

    const typeTag = (match[1] || match[3] || match[5] || "info").toLowerCase();
    const bodyText = (match[2] || match[4] || match[6] || "").trim();

    let calloutType: CalloutType = "info";
    if (typeTag === "tip" || typeTag === "dica") calloutType = "tip";
    else if (
      typeTag === "warning" ||
      typeTag === "atenção" ||
      typeTag === "atencao"
    )
      calloutType = "warning";
    else if (typeTag === "terminal" || typeTag === "comando") calloutType = "terminal";

    elements.push(
      <Callout key={`callout-${idx++}`} type={calloutType}>
        <StandardTextRenderer text={bodyText} />
      </Callout>
    );

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < content.length) {
    elements.push(
      <StandardTextRenderer key={`norm-${idx++}`} text={content.substring(lastIndex)} />
    );
  }

  return <>{elements}</>;
}

function StandardTextRenderer({ text }: { text: string }) {
  // Markdown headings end at the line break, even without an empty line after them.
  const paragraphs = text
    .replace(/^(#{1,4} .+)$/gm, '\n\n$1\n\n')
    .split(/\n\s*\n/);

  return (
    <>
      {paragraphs.map((p, pIdx) => {
        const trimmed = p.trim();
        if (!trimmed) return null;

        // Headings Markdown
        if (trimmed.startsWith("#### ")) {
          return (
            <h5
              key={pIdx}
              className="font-display font-semibold text-base text-zinc-100 mt-6 mb-2"
            >
              <InlineMarkdownRenderer text={trimmed.replace("#### ", "")} />
            </h5>
          );
        }
        if (trimmed.startsWith("### ")) {
          return (
            <h4
              key={pIdx}
              className="font-display font-bold text-lg text-white mt-7 mb-2 border-b border-white/5 pb-1"
            >
              <InlineMarkdownRenderer text={trimmed.replace("### ", "")} />
            </h4>
          );
        }
        if (trimmed.startsWith("## ")) {
          return (
            <h3
              key={pIdx}
              className="font-display font-bold text-xl text-white mt-8 mb-3"
            >
              <InlineMarkdownRenderer text={trimmed.replace("## ", "")} />
            </h3>
          );
        }
        if (trimmed.startsWith("# ")) {
          return (
            <h2
              key={pIdx}
              className="font-display font-bold text-2xl text-white mt-8 mb-3"
            >
              <InlineMarkdownRenderer text={trimmed.replace("# ", "")} />
            </h2>
          );
        }

        // Listas não-ordenadas
        if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
          const items = trimmed
            .split(/\n[*-] /)
            .map((i) => i.replace(/^[*-] /, "").trim());
          return (
            <ul
              key={pIdx}
              className="list-disc list-inside space-y-1.5 my-3 pl-2 text-zinc-300"
            >
              {items.map((item, itemIdx) => (
                <li key={itemIdx} className="leading-relaxed">
                  <InlineMarkdownRenderer text={item} />
                </li>
              ))}
            </ul>
          );
        }

        // Listas numeradas
        if (/^\d+\.\s/.test(trimmed)) {
          const items = trimmed
            .split(/\n\d+\.\s/)
            .map((i) => i.replace(/^\d+\.\s/, "").trim());
          return (
            <ol
              key={pIdx}
              className="list-decimal list-inside space-y-1.5 my-3 pl-2 text-zinc-300"
            >
              {items.map((item, itemIdx) => (
                <li key={itemIdx} className="leading-relaxed">
                  <InlineMarkdownRenderer text={item} />
                </li>
              ))}
            </ol>
          );
        }

        // Tratamento de Imagens / Figures do HTML
        if (trimmed.includes("<img") || trimmed.includes("<figure")) {
          const imgMatch = /<img[^>]+src="([^">]+)"/i.exec(trimmed);
          if (imgMatch) {
            return (
              <figure
                key={pIdx}
                className="my-6 rounded-xl overflow-hidden border border-white/10 bg-black/40 p-2"
              >
                <img
                  src={imgMatch[1]}
                  alt="Ilustração da Lição"
                  className="rounded max-h-96 w-auto mx-auto object-contain"
                  loading="lazy"
                />
              </figure>
            );
          }
        }

        // Parágrafo Padrão
        return (
          <p key={pIdx} className="leading-relaxed text-zinc-300 my-2">
            <InlineMarkdownRenderer text={trimmed} />
          </p>
        );
      })}
    </>
  );
}

function InlineMarkdownRenderer({ text }: { text: string }) {
  // Converte inline code `code`, negrito **bold**, e links [label](url)
  const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\))/g);

  return (
    <>
      {parts.map((part, i) => {
        if (!part) return null;

        // Inline Code `...`
        if (part.startsWith("`") && part.endsWith("`")) {
          return (
            <code
              key={i}
              className="px-1.5 py-0.5 mx-0.5 rounded bg-zinc-800 text-purple-300 font-mono text-xs border border-white/10"
            >
              {part.slice(1, -1)}
            </code>
          );
        }

        // Bold **...**
        if (part.startsWith("**") && part.endsWith("**")) {
          return (
            <strong key={i} className="font-semibold text-white">
              {part.slice(2, -2)}
            </strong>
          );
        }

        // Links [label](url)
        if (part.startsWith("[") && part.includes("](") && part.endsWith(")")) {
          const match = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(part);
          if (match) {
            return (
              <a
                key={i}
                href={match[2]}
                target="_blank"
                rel="noopener noreferrer"
                className="text-purple-400 hover:text-purple-300 underline underline-offset-2 transition-colors font-medium"
              >
                {match[1]}
              </a>
            );
          }
        }

        return <span key={i}>{part}</span>;
      })}
    </>
  );
}

function detectHtmlCodeLang(classes: string, code: string): string {
  const c = classes.toLowerCase();
  if (
    c.includes("python") ||
    c.includes("py") ||
    code.includes("import rclpy") ||
    code.includes("def main")
  ) {
    return "python";
  }
  if (
    c.includes("cpp") ||
    c.includes("c++") ||
    code.includes('#include "rclcpp') ||
    code.includes("int main(")
  ) {
    return "cpp";
  }
  if (
    c.includes("xml") ||
    c.includes("launch") ||
    code.includes("<launch") ||
    code.includes("<node")
  ) {
    return "xml";
  }
  if (c.includes("yaml") || code.includes("ros__parameters:")) {
    return "yaml";
  }
  return "bash";
}

function unescapeHtml(html: string): string {
  return html
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'");
}
