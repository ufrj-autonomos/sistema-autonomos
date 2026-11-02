"use client";

import { useState, useRef } from "react";
import {
  Bold,
  Italic,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Link as LinkIcon,
  Code,
  Eye,
  Edit3,
  Sparkles,
} from "lucide-react";
import { MarkdownView } from "@/components/institutional/ui/markdown-view";
import { cn } from "@/lib/utils";

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  className?: string;
}

export function MarkdownEditor({
  value,
  onChange,
  placeholder = "Escreva em Markdown (.md)...",
  rows = 6,
  className,
}: MarkdownEditorProps) {
  const [tab, setTab] = useState<"write" | "preview">("write");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const insertText = (before: string, after: string = "", defaultText: string = "") => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end) || defaultText;
    const replacement = `${before}${selectedText}${after}`;

    const newValue = value.substring(0, start) + replacement + value.substring(end);
    onChange(newValue);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(
        start + before.length,
        start + before.length + selectedText.length
      );
    }, 10);
  };

  return (
    <div className={cn("rounded-lg border border-border bg-background overflow-hidden", className)}>
      {/* Editor Header Toolbar */}
      <div className="flex flex-wrap items-center justify-between border-b border-border bg-muted/40 px-3 py-2 gap-2">
        {/* Formatting actions */}
        <div className="flex flex-wrap items-center gap-1">
          <button
            type="button"
            onClick={() => insertText("**", "**", "texto")}
            className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            title="Negrito (**texto**)"
          >
            <Bold className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => insertText("*", "*", "texto")}
            className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            title="Itálico (*texto*)"
          >
            <Italic className="h-3.5 w-3.5" />
          </button>
          <div className="h-4 w-px bg-border mx-1" />

          <button
            type="button"
            onClick={() => insertText("## ", "", "Subtítulo")}
            className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            title="Título 2 (## Subtítulo)"
          >
            <Heading2 className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => insertText("### ", "", "Título de Seção")}
            className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            title="Título 3 (### Seção)"
          >
            <Heading3 className="h-3.5 w-3.5" />
          </button>
          <div className="h-4 w-px bg-border mx-1" />

          <button
            type="button"
            onClick={() => insertText("- ", "", "Item de lista")}
            className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            title="Lista com marcadores (- item)"
          >
            <List className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => insertText("1. ", "", "Item numerado")}
            className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            title="Lista numerada (1. item)"
          >
            <ListOrdered className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => insertText("> ", "", "Citação de destaque")}
            className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            title="Citação (> destaque)"
          >
            <Quote className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => insertText("[", "](https://exemplo.com)", "Link")}
            className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            title="Link ([texto](url))"
          >
            <LinkIcon className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => insertText("`", "`", "código")}
            className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            title="Código (`código`)"
          >
            <Code className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Tab Switcher: Write vs Preview */}
        <div className="flex items-center rounded-md border border-border bg-background/80 p-0.5 text-xs font-mono">
          <button
            type="button"
            onClick={() => setTab("write")}
            className={cn(
              "flex items-center gap-1.5 rounded px-2.5 py-1 transition-colors cursor-pointer",
              tab === "write"
                ? "bg-primary text-primary-foreground font-semibold"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Edit3 className="h-3 w-3" />
            <span>Editar (.md)</span>
          </button>
          <button
            type="button"
            onClick={() => setTab("preview")}
            className={cn(
              "flex items-center gap-1.5 rounded px-2.5 py-1 transition-colors cursor-pointer",
              tab === "preview"
                ? "bg-primary text-primary-foreground font-semibold"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Eye className="h-3 w-3" />
            <span>Pré-visualizar</span>
          </button>
        </div>
      </div>

      {/* Editor Body */}
      {tab === "write" ? (
        <div className="relative">
          <textarea
            ref={textareaRef}
            rows={rows}
            value={value || ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="w-full resize-y bg-background px-4 py-3 font-mono text-xs leading-relaxed text-foreground placeholder:text-muted-foreground/60 focus-visible:outline-none focus-visible:ring-0"
          />
          <div className="flex items-center justify-between border-t border-border/50 bg-muted/20 px-3 py-1.5 font-mono text-[10px] text-muted-foreground">
            <span>Formato Markdown (.md) ativado</span>
            <span>{value ? `${value.length} caracteres` : "0 caracteres"}</span>
          </div>
        </div>
      ) : (
        <div className="min-h-[160px] max-h-[360px] overflow-y-auto bg-card/40 p-4">
          {value && value.trim() ? (
            <MarkdownView content={value} />
          ) : (
            <div className="py-8 text-center text-xs italic text-muted-foreground/60">
              Nada para pré-visualizar. Digite algo na aba "Editar (.md)" acima.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
