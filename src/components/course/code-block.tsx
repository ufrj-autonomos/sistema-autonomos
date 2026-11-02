"use client";

import React, { useState } from "react";
import { Copy, Check, Terminal, FileCode, Code2 } from "lucide-react";

export interface CodeBlockProps {
  code: string;
  language?: string;
  fileName?: string;
  showLineNumbers?: boolean;
  className?: string;
}

export function CodeBlock({
  code,
  language = "bash",
  fileName,
  showLineNumbers = true,
  className = "",
}: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const cleanCode = code ? code.trim() : "";

  const handleCopy = async () => {
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(cleanCode);
      } else if (typeof document !== "undefined") {
        const textArea = document.createElement("textarea");
        textArea.value = cleanCode;
        textArea.style.position = "fixed";
        textArea.style.opacity = "0";
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Falha ao copiar código:", err);
    }
  };

  const normalizedLang = (language || "bash").toLowerCase().replace(/^language-/, "");

  const getLanguageLabel = (lang: string) => {
    switch (lang) {
      case "cpp":
      case "c++":
      case "c":
        return "C++ (rclcpp)";
      case "python":
      case "py":
        return "Python 3 (rclpy)";
      case "bash":
      case "sh":
      case "shell":
      case "zsh":
        return "Bash / Terminal";
      case "xml":
      case "launch":
        return "ROS 2 Launch XML";
      case "yaml":
      case "yml":
        return "ROS 2 Parameters (YAML)";
      case "json":
        return "JSON";
      default:
        return lang.toUpperCase();
    }
  };

  const getLanguageIcon = (lang: string) => {
    switch (lang) {
      case "bash":
      case "sh":
      case "shell":
        return <Terminal size={13} className="text-purple-400" />;
      case "python":
      case "py":
      case "cpp":
      case "c++":
        return <Code2 size={13} className="text-emerald-400" />;
      default:
        return <FileCode size={13} className="text-blue-400" />;
    }
  };

  // Tokenizador de sintaxe de alta precisão para robótica e ROS 2
  const highlightCode = (rawText: string, lang: string): React.ReactNode => {
    const lines = rawText.split("\n");

    return lines.map((line, lineIndex) => {
      if (!line.length) {
        return (
          <div key={lineIndex} className="table-row leading-6 min-h-[1.5rem]">
            {showLineNumbers && (
              <span className="table-cell pr-4 text-right select-none text-zinc-600 font-mono text-xs w-8">
                {lineIndex + 1}
              </span>
            )}
            <span className="table-cell font-mono">&nbsp;</span>
          </div>
        );
      }

      // Linhas de comentário completas
      if (
        (lang.includes("python") || lang.includes("bash") || lang.includes("yaml")) &&
        line.trim().startsWith("#")
      ) {
        return (
          <div key={lineIndex} className="table-row leading-6">
            {showLineNumbers && (
              <span className="table-cell pr-4 text-right select-none text-zinc-600 font-mono text-xs w-8">
                {lineIndex + 1}
              </span>
            )}
            <span className="table-cell text-zinc-500 italic font-mono">{line}</span>
          </div>
        );
      }

      if (lang.includes("cpp") && line.trim().startsWith("//")) {
        return (
          <div key={lineIndex} className="table-row leading-6">
            {showLineNumbers && (
              <span className="table-cell pr-4 text-right select-none text-zinc-600 font-mono text-xs w-8">
                {lineIndex + 1}
              </span>
            )}
            <span className="table-cell text-zinc-500 italic font-mono">{line}</span>
          </div>
        );
      }

      // Tokenização de elementos na linha
      const tokens = line.split(
        /(".*?"|'.*?'|\b[\w_]+(?:::[\w_]+)?\b|[<>/=!&|;:,\.\(\)\[\]\{\}]+|\s+)/g
      );

      const highlightedTokens = tokens.map((token, tokIdx) => {
        if (!token) return null;

        // Strings
        if (
          (token.startsWith('"') && token.endsWith('"')) ||
          (token.startsWith("'") && token.endsWith("'"))
        ) {
          return (
            <span key={tokIdx} className="text-emerald-400">
              {token}
            </span>
          );
        }

        // Keywords Python
        if (lang.includes("python") || lang.includes("py")) {
          if (
            [
              "def",
              "class",
              "import",
              "from",
              "as",
              "return",
              "if",
              "elif",
              "else",
              "while",
              "for",
              "in",
              "try",
              "except",
              "super",
              "pass",
              "raise",
              "with",
            ].includes(token)
          ) {
            return (
              <span key={tokIdx} className="text-purple-400 font-medium">
                {token}
              </span>
            );
          }
          if (["self", "None", "True", "False"].includes(token)) {
            return (
              <span key={tokIdx} className="text-amber-400">
                {token}
              </span>
            );
          }
          if (
            [
              "rclpy",
              "Node",
              "create_publisher",
              "create_subscription",
              "create_timer",
              "create_service",
              "create_client",
              "spin",
              "init",
              "shutdown",
              "get_logger",
              "info",
              "warn",
              "error",
            ].includes(token)
          ) {
            return (
              <span key={tokIdx} className="text-cyan-400 font-semibold">
                {token}
              </span>
            );
          }
        }

        // Keywords C++
        if (lang.includes("cpp") || lang.includes("c++")) {
          if (
            [
              "#include",
              "#define",
              "class",
              "public",
              "private",
              "protected",
              "virtual",
              "override",
              "return",
              "if",
              "else",
              "while",
              "for",
              "int",
              "void",
              "char",
              "double",
              "float",
              "auto",
              "const",
              "using",
              "namespace",
            ].includes(token)
          ) {
            return (
              <span key={tokIdx} className="text-purple-400 font-medium">
                {token}
              </span>
            );
          }
          if (
            token.startsWith("std::") ||
            token.startsWith("rclcpp::") ||
            [
              "rclcpp",
              "Node",
              "RCLCPP_INFO",
              "RCLCPP_WARN",
              "RCLCPP_ERROR",
              "make_shared",
              "SharedPtr",
            ].includes(token)
          ) {
            return (
              <span key={tokIdx} className="text-cyan-400 font-semibold">
                {token}
              </span>
            );
          }
        }

        // Keywords Bash & ROS 2 CLI
        if (lang.includes("bash") || lang.includes("sh") || lang.includes("shell")) {
          if (
            [
              "sudo",
              "apt",
              "install",
              "update",
              "source",
              "export",
              "echo",
              "cd",
              "mkdir",
              "colcon",
              "build",
              "grep",
              "cat",
            ].includes(token)
          ) {
            return (
              <span key={tokIdx} className="text-purple-400 font-medium">
                {token}
              </span>
            );
          }
          if (
            [
              "ros2",
              "run",
              "node",
              "topic",
              "service",
              "param",
              "launch",
              "pkg",
              "bag",
              "action",
              "interface",
              "turtlesim",
            ].includes(token)
          ) {
            return (
              <span key={tokIdx} className="text-pink-400 font-semibold">
                {token}
              </span>
            );
          }
          if (token.startsWith("--") || token.startsWith("-r") || token.startsWith("__")) {
            return (
              <span key={tokIdx} className="text-amber-400">
                {token}
              </span>
            );
          }
        }

        // Keywords XML / Launch
        if (lang.includes("xml") || lang.includes("launch")) {
          if (["launch", "node", "param", "arg", "group", "include"].includes(token)) {
            return (
              <span key={tokIdx} className="text-rose-400 font-semibold">
                {token}
              </span>
            );
          }
          if (["pkg", "exec", "name", "output", "from", "value"].includes(token)) {
            return (
              <span key={tokIdx} className="text-amber-400">
                {token}
              </span>
            );
          }
        }

        // Números
        if (/^\d+(\.\d+)?$/.test(token)) {
          return (
            <span key={tokIdx} className="text-amber-300">
              {token}
            </span>
          );
        }

        return <span key={tokIdx}>{token}</span>;
      });

      return (
        <div key={lineIndex} className="table-row leading-6">
          {showLineNumbers && (
            <span className="table-cell pr-4 text-right select-none text-zinc-600 font-mono text-xs w-8">
              {lineIndex + 1}
            </span>
          )}
          <span className="table-cell font-mono text-zinc-200">{highlightedTokens}</span>
        </div>
      );
    });
  };

  return (
    <div
      className={`my-4 rounded-xl border border-white/10 bg-[#0B0B0D] overflow-hidden shadow-lg blueprint-corners ${className}`}
    >
      {/* Top Bar / Header */}
      <div className="flex items-center justify-between px-3.5 py-2 bg-[#121215] border-b border-white/5 select-none">
        <div className="flex items-center gap-2">
          {/* Terminal Dots */}
          <div className="flex items-center gap-1.5 mr-1">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500/40 border border-red-500/60 inline-block" />
            <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/40 border border-yellow-500/60 inline-block" />
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/40 border border-emerald-500/60 inline-block" />
          </div>

          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-white/5 border border-white/10">
            {getLanguageIcon(normalizedLang)}
            <span className="font-mono text-[11px] font-medium text-zinc-300 uppercase tracking-wider">
              {getLanguageLabel(normalizedLang)}
              {fileName ? ` • ${fileName}` : ""}
            </span>
          </div>
        </div>

        {/* Botão Copiar */}
        <button
          onClick={handleCopy}
          type="button"
          aria-label="Copiar código"
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono font-medium transition-all duration-200 border border-white/10 bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white cursor-pointer"
        >
          {copied ? (
            <>
              <Check size={13} className="text-emerald-400" />
              <span className="text-emerald-400 font-semibold">Copiado!</span>
            </>
          ) : (
            <>
              <Copy size={13} className="text-zinc-400" />
              <span>Copiar</span>
            </>
          )}
        </button>
      </div>

      {/* Code Container */}
      <div className="p-3.5 overflow-x-auto text-xs sm:text-sm font-mono leading-relaxed bg-[#0A0A0B]">
        <div className="table min-w-full">
          {highlightCode(cleanCode, normalizedLang)}
        </div>
      </div>
    </div>
  );
}
