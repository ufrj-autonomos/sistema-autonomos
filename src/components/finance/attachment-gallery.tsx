'use client';

import { useState } from 'react';
import { ExternalLink, FileText, Image as ImageIcon, Loader2, Trash2, Upload, Eye } from 'lucide-react';
import { toast } from 'sonner';
import type { FinancialAttachmentDTO } from '@/lib/finance/constants';

export interface UploadedAttachmentDraft {
  name: string;
  url: string;
  mimeType: string | null;
  kind: 'RECEIPT' | 'PAYMENT_PROOF' | 'STATEMENT';
}

function isImageAttachment(att: { mimeType?: string | null; name: string }) {
  const lower = att.name.toLowerCase();
  if (lower.endsWith('.heic') || lower.endsWith('.heif')) return false; // Browsers generally cannot render HEIC in <img>
  if (att.mimeType?.startsWith('image/')) return true;
  return /\.(jpg|jpeg|png|webp|gif)$/i.test(lower);
}

const KIND_BADGE: Record<string, { label: string; cls: string }> = {
  RECEIPT: { label: 'Nota / Recibo', cls: 'bg-muted text-muted-foreground' },
  PAYMENT_PROOF: { label: 'Comprovante PIX', cls: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300' },
  STATEMENT: { label: 'Extrato', cls: 'bg-blue-500/15 text-blue-700 dark:text-blue-300' },
};

export function AttachmentGallery({
  attachments,
  driveFolderUrl,
  canDelete,
  onDelete,
}: {
  attachments: FinancialAttachmentDTO[];
  driveFolderUrl?: string | null;
  canDelete?: boolean;
  onDelete?: (attachmentId: string) => void;
}) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  return (
    <div className="space-y-3">
      {attachments.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-muted/20 px-4 py-4 text-center text-xs text-muted-foreground">
          Nenhum comprovante anexado ainda.
        </div>
      ) : (
        <div className="grid gap-2.5 sm:grid-cols-2">
          {attachments.map(att => {
            const isImg = isImageAttachment(att);
            const badge = KIND_BADGE[att.kind] || KIND_BADGE.RECEIPT;
            const driveViewUrl = att.driveFileId
              ? `https://drive.google.com/file/d/${att.driveFileId}/view`
              : null;

            return (
              <div
                key={att.id}
                className="group relative flex flex-col justify-between overflow-hidden rounded-xl border border-border bg-background/70 p-2.5 gap-2"
              >
                {isImg ? (
                  <button
                    type="button"
                    onClick={() => setPreviewUrl(att.url)}
                    className="relative aspect-16/10 w-full overflow-hidden rounded-lg border border-border/60 bg-muted cursor-pointer"
                  >
                    <img
                      src={att.url}
                      alt={att.name}
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
                    />
                    <span className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-md bg-black/70 px-2 py-0.5 text-[10px] font-medium text-white">
                      <Eye className="h-3 w-3" /> Ampliar
                    </span>
                  </button>
                ) : (
                  <div className="flex items-center gap-2.5 rounded-lg border border-border/60 bg-muted/40 p-3">
                    <FileText className="h-6 w-6 shrink-0 text-primary" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium text-foreground">{att.name}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {att.mimeType === 'application/pdf' ? 'Documento PDF' : 'Arquivo / HEIC'}
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[11px] font-medium text-foreground" title={att.name}>
                      {att.name}
                    </p>
                    <span className={`inline-block mt-0.5 rounded px-1.5 py-0.5 text-[10px] font-medium ${badge.cls}`}>
                      {badge.label}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <a
                      href={att.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex h-7 items-center gap-1 rounded-md border border-border px-2 text-[11px] font-medium text-foreground hover:bg-accent"
                      title="Abrir arquivo"
                    >
                      <ExternalLink className="h-3 w-3" /> Abrir
                    </a>
                    {driveViewUrl && driveViewUrl !== att.url && (
                      <a
                        href={driveViewUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex h-7 items-center rounded-md border border-border px-2 text-[10px] font-mono text-muted-foreground hover:text-foreground hover:bg-accent"
                        title="Abrir original no Google Drive"
                      >
                        Drive
                      </a>
                    )}
                    {canDelete && onDelete && (
                      <button
                        type="button"
                        onClick={() => onDelete(att.id)}
                        className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-red-500/20 text-red-600 dark:text-red-400 hover:bg-red-500/10 cursor-pointer"
                        title="Remover anexo"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {driveFolderUrl && (
        <a
          href={driveFolderUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          Abrir pasta original do comprovante no Google Drive
        </a>
      )}

      {previewUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4"
          onClick={() => setPreviewUrl(null)}
        >
          <div className="relative max-h-[90vh] max-w-4xl overflow-auto rounded-xl border border-border bg-card p-2">
            <img src={previewUrl} alt="Prévia do comprovante" className="max-h-[82vh] w-auto rounded-lg object-contain" />
            <div className="mt-2 flex justify-end gap-2 px-1 pb-1">
              <a
                href={previewUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={e => e.stopPropagation()}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-background px-3 text-xs font-medium text-foreground hover:bg-accent"
              >
                <ExternalLink className="h-3.5 w-3.5" /> Abrir original
              </a>
              <button
                type="button"
                onClick={() => setPreviewUrl(null)}
                className="inline-flex h-8 items-center rounded-lg bg-primary px-3 text-xs font-medium text-primary-foreground cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function ReceiptUploader({
  drafts,
  onAdd,
  onRemove,
  kind = 'RECEIPT',
  label = 'Comprovante / Nota Fiscal (PDF ou Imagem)',
}: {
  drafts: UploadedAttachmentDraft[];
  onAdd: (item: UploadedAttachmentDraft) => void;
  onRemove: (index: number) => void;
  kind?: 'RECEIPT' | 'PAYMENT_PROOF' | 'STATEMENT';
  label?: string;
}) {
  const [uploading, setUploading] = useState(false);

  async function handleFileSelect(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const fd = new FormData();
        fd.append('file', file);
        const res = await fetch('/api/financeiro/upload', { method: 'POST', body: fd });
        const data = await res.json();
        if (!res.ok) {
          toast.error(data.error || `Falha ao enviar ${file.name}.`);
          continue;
        }
        onAdd({
          name: data.name || file.name,
          url: data.url,
          mimeType: data.mimeType || file.type || null,
          kind,
        });
        toast.success(`Arquivo "${file.name}" anexado!`);
      }
    } catch {
      toast.error('Erro de conexão ao enviar arquivo.');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-2">
      <label className="block text-xs font-medium text-muted-foreground">{label}</label>
      <label className="flex cursor-pointer items-center justify-between gap-2 rounded-lg border border-dashed border-border bg-muted/30 px-3 py-2.5 text-xs text-muted-foreground hover:bg-muted/60 transition-colors">
        <span className="flex items-center gap-2 truncate">
          {uploading ? (
            <Loader2 className="h-4 w-4 animate-spin text-primary shrink-0" />
          ) : (
            <Upload className="h-4 w-4 text-primary shrink-0" />
          )}
          {uploading ? 'Enviando comprovante para o servidor…' : 'Clique para anexar imagem ou PDF (até 10 MB)'}
        </span>
        <span className="font-mono text-[10px] text-primary shrink-0">Selecionar</span>
        <input
          type="file"
          multiple
          accept="image/*,.pdf,.heic,.heif"
          disabled={uploading}
          className="sr-only"
          onChange={e => {
            handleFileSelect(e.target.files);
            e.target.value = '';
          }}
        />
      </label>

      {drafts.length > 0 && (
        <ul className="space-y-1.5">
          {drafts.map((d, idx) => (
            <li
              key={`${d.url}-${idx}`}
              className="flex items-center justify-between gap-2 rounded-lg border border-border bg-background/80 px-2.5 py-1.5 text-xs"
            >
              <span className="flex items-center gap-2 min-w-0 truncate text-foreground">
                {d.mimeType?.startsWith('image/') ? (
                  <ImageIcon className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                ) : (
                  <FileText className="h-3.5 w-3.5 text-primary shrink-0" />
                )}
                <span className="truncate">{d.name}</span>
              </span>
              <button
                type="button"
                onClick={() => onRemove(idx)}
                className="text-red-600 dark:text-red-400 hover:underline text-[11px] shrink-0 cursor-pointer"
              >
                Remover
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
