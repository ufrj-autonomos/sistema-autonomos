'use client';

import React, { useState, useContext } from 'react';
import { toast } from 'sonner';
import { FileSpreadsheet, Download, ExternalLink, Copy, Check, X, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { hasManagementAccess } from '@/lib/access-policy';
import { AuthContext } from '@/contexts/auth-context';

interface ExportGoogleSheetsButtonProps {
  type: 'meetings' | 'members' | 'disciplinary' | 'attendance';
  period?: string;
  areaKey?: string;
  label?: string;
  userRole?: string | null;
  size?: 'sm' | 'md';
  className?: string;
}

export function ExportGoogleSheetsButton({
  type,
  period,
  areaKey,
  label = 'Exportar para Google Sheets',
  userRole,
  size = 'sm',
  className,
}: ExportGoogleSheetsButtonProps) {
  const auth = useContext(AuthContext);
  const effectiveRole = userRole !== undefined ? userRole : auth?.user?.role;

  // Controle de acesso: Visível SOMENTE para Coordenadores, Gestão e Admin
  if (!hasManagementAccess(effectiveRole)) {
    return null;
  }

  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const getQueryUrl = (format: 'json' | 'csv') => {
    const params = new URLSearchParams({ type, format });
    if (period) params.set('period', period);
    if (areaKey) params.set('areaKey', areaKey);
    return `/api/export/sheets?${params.toString()}`;
  };

  const handleCopyAndOpenSheets = async () => {
    setLoading(true);
    try {
      const res = await fetch(getQueryUrl('json'));
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Falha ao buscar dados para exportação.');
      }

      const data = await res.json();
      await navigator.clipboard.writeText(data.tsv);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);

      // Abrir nova planilha no Google Sheets em nova aba
      window.open('https://sheets.new', '_blank', 'noopener,noreferrer');

      toast.success(
        'Tabela copiada com sucesso! Pressione Ctrl+V (ou Cmd+V) na primeira célula da planilha que se abriu no Google Sheets.',
        { duration: 7000 }
      );
      setIsOpen(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao copiar dados.';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleDirectDownload = () => {
    const downloadUrl = getQueryUrl('csv');
    window.location.href = downloadUrl;
    toast.success('Download da planilha iniciado.');
    setIsOpen(false);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={cn(
          'inline-flex items-center gap-1.5 rounded-lg border font-medium transition shadow-xs cursor-pointer',
          'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border-emerald-500/30',
          size === 'sm' ? 'px-2.5 py-1.5 text-xs' : 'px-3.5 py-2 text-sm',
          className
        )}
        title="Exportar esta tabela para o Google Sheets (Acesso Coordenadores / Gestão / Admin)"
      >
        <FileSpreadsheet className={size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4'} />
        <span>{label}</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-card border border-border rounded-xl max-w-md w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                  <FileSpreadsheet className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground">
                    Exportar para o Google Sheets
                  </h3>
                  <p className="text-[11px] text-muted-foreground">
                    Acesso exclusivo para Coordenação, Gestão e Administração.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-muted-foreground hover:text-foreground cursor-pointer p-1 rounded-md"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3 py-1">
              {/* Opção 1: Copiar e Abrir no Google Sheets (1 Clique) */}
              <button
                type="button"
                disabled={loading}
                onClick={handleCopyAndOpenSheets}
                className="w-full text-left p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-500/5 hover:bg-emerald-500/15 transition cursor-pointer group flex items-start gap-3"
              >
                <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5">
                  {copied ? <Check className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-xs text-foreground">
                      Copiar e Abrir no Google Sheets
                    </span>
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-700 dark:text-emerald-300">
                      Recomendado
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                    Copia os dados tabulados e abre uma nova planilha vazia no Google Sheets. Basta pressionar <strong>Ctrl+V</strong> na primeira célula para colar tudo perfeitamente formatado.
                  </p>
                </div>
                <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-foreground shrink-0 mt-1" />
              </button>

              {/* Opção 2: Download direto de arquivo CSV para Google Sheets */}
              <button
                type="button"
                onClick={handleDirectDownload}
                className="w-full text-left p-3.5 rounded-xl border border-border bg-muted/30 hover:bg-muted/60 transition cursor-pointer group flex items-start gap-3"
              >
                <div className="p-2 rounded-lg bg-accent text-foreground shrink-0 mt-0.5">
                  <Download className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="font-semibold text-xs text-foreground block">
                    Baixar Arquivo CSV (.csv)
                  </span>
                  <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                    Arquivo compatível com acentuação UTF-8 com BOM, delimitado para importação direta no Google Sheets (Menu: <em>Arquivo &gt; Importar</em>).
                  </p>
                </div>
              </button>

              {/* Link Adicional para a Planilha Histórica Oficial de Advertências se for o caso */}
              {type === 'disciplinary' && (
                <a
                  href="https://docs.google.com/spreadsheets/d/1hM-ArMquWM6R04BqtbQ03UGTiiSR4_-H-1sctali1WI/edit?usp=sharing"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full text-left p-3 rounded-xl border border-border/80 bg-accent/30 hover:bg-accent/60 transition cursor-pointer flex items-center justify-between text-xs text-foreground"
                >
                  <span className="flex items-center gap-2 truncate">
                    <span>📑</span>
                    <span className="font-medium truncate">Abrir Planilha Histórica de Advertências (Google Drive)</span>
                  </span>
                  <ExternalLink className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                </a>
              )}
            </div>

            <div className="flex items-center justify-end pt-2 border-t border-border/60">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="px-3 py-1.5 rounded-lg border border-border text-xs font-medium text-foreground hover:bg-muted cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
