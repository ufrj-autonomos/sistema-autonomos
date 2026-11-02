"use client";

import { useMemo } from "react";
import sanitizeHtml from "sanitize-html";
import { marked } from "marked";
import { cn } from "@/lib/utils";

interface MarkdownViewProps {
  content?: string | null;
  className?: string;
}

export function MarkdownView({ content, className }: MarkdownViewProps) {
  const html = useMemo(() => {
    if (!content || typeof content !== "string" || !content.trim()) {
      return "";
    }

    try {
      // Configure marked for GitHub Flavored Markdown and line breaks
      return sanitizeHtml(marked.parse(content, {
        gfm: true,
        breaks: true,
      }) as string);
    } catch (e) {
      console.error("Error parsing markdown:", e);
      return sanitizeHtml(content);
    }
  }, [content]);

  if (!html) return null;

  return (
    <div
      className={cn(
        "markdown-content prose prose-sm dark:prose-invert max-w-none text-muted-foreground leading-relaxed",
        // Typography & layout enhancements
        "[&_h1]:text-foreground [&_h1]:font-display [&_h1]:text-xl [&_h1]:font-semibold [&_h1]:mt-4 [&_h1]:mb-2",
        "[&_h2]:text-foreground [&_h2]:font-display [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:mt-3.5 [&_h2]:mb-2",
        "[&_h3]:text-foreground [&_h3]:font-display [&_h3]:text-base [&_h3]:font-semibold [&_h3]:mt-3 [&_h3]:mb-1.5",
        "[&_p]:my-2 [&_p]:leading-relaxed",
        "[&_strong]:text-foreground [&_strong]:font-semibold",
        "[&_em]:italic",
        "[&_ul]:list-disc [&_ul]:pl-5 [&_ul]:my-2.5 [&_ul]:space-y-1",
        "[&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:my-2.5 [&_ol]:space-y-1",
        "[&_li]:text-muted-foreground",
        "[&_blockquote]:border-l-2 [&_blockquote]:border-primary/40 [&_blockquote]:pl-4 [&_blockquote]:my-3 [&_blockquote]:italic [&_blockquote]:text-foreground/80",
        "[&_code]:font-mono [&_code]:text-xs [&_code]:bg-muted/80 [&_code]:text-foreground [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded",
        "[&_pre]:bg-muted/40 [&_pre]:border [&_pre]:border-hairline [&_pre]:p-3 [&_pre]:rounded-md [&_pre]:overflow-x-auto [&_pre]:my-3",
        "[&_a]:text-primary [&_a]:underline [&_a]:underline-offset-4 [&_a]:hover:opacity-80 [&_a]:transition-opacity",
        "[&_hr]:my-4 [&_hr]:border-hairline",
        className
      )}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
