'use client';
import { ImageCropDialog } from './image-crop-dialog';
import { useRef, useState } from 'react';
import { ImageIcon, Loader2, Trash2, Upload } from 'lucide-react';
import { useInstitutionalAsset } from './site-context';
export function ImageUploadField({ name, label, value, required, description, kind, onChange, onBusy }: { name: string; label: string; value: string; required?: boolean; description?: string; kind: string; onChange: (url: string) => void; onBusy: (busy: boolean) => void }) {
  const asset = useInstitutionalAsset();
  const input = useRef<HTMLInputElement>(null);
  const [cropFile, setCropFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  async function upload(file: File | undefined) {
    if (!file) return;
    setError('');
    if (!file.type.startsWith('image/') || file.size < 1 || file.size > 4 * 1024 * 1024) { setError('Escolha uma imagem de até 4 MB.'); if (input.current) input.current.value = ''; return; }
    setBusy(true); onBusy(true);
    try {
      const data = new FormData(); data.append('file', file); data.append('kind', kind);
      const response = await fetch('/api/admin/images', { method: 'POST', body: data });
      const result = await response.json().catch(() => null);
      if (!response.ok || !result?.url) throw new Error(result?.error || (response.status === 413 ? 'A imagem excedeu o limite de envio. Use um arquivo de até 4 MB.' : 'Não foi possível enviar a imagem. Tente novamente.'));
      onChange(result.url); setCropFile(null);
    } catch (error) { setError(error instanceof Error ? error.message : 'Não foi possível enviar a imagem.'); throw error; }
    finally { setBusy(false); onBusy(false); if (input.current) input.current.value = ''; }
  }
  return <div className="space-y-3 md:col-span-2">{cropFile && <ImageCropDialog file={cropFile} profile={kind === 'member'} onCancel={() => setCropFile(null)} onConfirm={file => upload(file)} />}<label htmlFor={`image-url-${name}`} className="block text-sm font-medium">{label}{required && ' *'}</label>{description && <p className="text-xs leading-relaxed text-muted-foreground">{description}</p>}<div className="flex flex-col gap-4 rounded-lg border border-border bg-card p-4 sm:flex-row"><div className="flex h-28 w-40 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-muted">{value ? <img src={asset(value)} alt={`Prévia de ${label}`} className="h-full w-full object-contain" /> : <ImageIcon size={24} className="text-muted-foreground" aria-hidden="true" />}</div><div className="min-w-0 flex-1 space-y-3"><div className="flex gap-2"><input id={`image-url-${name}`} type="text" inputMode="url" value={value} onChange={event => onChange(event.target.value)} disabled={busy} required={required} placeholder="URL pública da imagem" className="min-h-11 w-full rounded-lg border border-input bg-background px-3 text-sm" />{value && <button type="button" onClick={() => onChange('')} disabled={busy} aria-label={`Remover ${label}`} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-border hover:bg-accent"><Trash2 size={16} /></button>}</div><input ref={input} id={`image-file-${name}`} type="file" accept="image/*" disabled={busy} onChange={event => { const file = event.target.files?.[0]; if (file) { if (!file.type.startsWith('image/')) setError('Escolha um arquivo de imagem.'); else if (file.size > 25 * 1024 * 1024) setError('Escolha uma imagem de até 25 MB para recortar.'); else setCropFile(file); } event.target.value = ''; }} className="sr-only" /><button type="button" disabled={busy} onClick={() => input.current?.click()} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-border px-4 text-sm font-medium hover:bg-accent disabled:opacity-50">{busy ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}{busy ? 'Enviando imagem…' : value ? 'Trocar imagem' : 'Enviar imagem'}</button><p className="text-xs text-muted-foreground">Imagem original até 25 MB; envio até 4 MB após o recorte. Ajuste o recorte antes de enviar. Salve o cadastro para publicar a alteração.</p></div></div>{error && <p role="alert" className="text-sm text-red-700 dark:text-red-300">{error}</p>}</div>;
}
