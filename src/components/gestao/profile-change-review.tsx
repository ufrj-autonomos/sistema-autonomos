'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, ImageOff, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/institutional/ui/dialog';
import { useInstitutionalAsset } from '@/components/institutional/site-context';
import { SITE_PROFILE_FIELDS, siteAssetUrl } from '@/lib/site-profile-changes';

type Change = { id: string; createdAt: string; updatedAt?: string; changes: Record<string, unknown> };
const focus = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring';

function Photo({ url, label }: { url: string | null; label: string }) {
  const [failed, setFailed] = useState(false);
  return <div className="space-y-2">{url && !failed ? <img src={url} alt={label} onError={() => setFailed(true)} className="h-56 w-full rounded-lg bg-muted object-contain" /> : <div className="flex h-40 flex-col items-center justify-center gap-2 rounded-lg bg-muted text-sm text-muted-foreground"><ImageOff className="h-6 w-6" />{url ? 'Não foi possível carregar a foto.' : 'Sem foto'}</div>}{url && <a href={url} target="_blank" rel="noopener noreferrer" className={`inline-flex min-h-10 items-center rounded text-sm text-secondary-foreground underline underline-offset-4 ${focus}`}>Abrir foto em outra aba</a>}</div>;
}

export function ProfileChangeReview({ name, current, change }: { name: string; current: Record<string, unknown>; change: Change }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<'APPROVE' | 'REJECT' | null>(null);
  const [error, setError] = useState('');
  const router = useRouter();
  const asset = useInstitutionalAsset();
  const fields = SITE_PROFILE_FIELDS.filter(field => field.key in change.changes);
  async function review(action: 'APPROVE' | 'REJECT') {
    setBusy(action); setError('');
    try {
      const response = await fetch('/api/admin/profile-changes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ changeId: change.id, action, expectedUpdatedAt: change.updatedAt }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Não foi possível revisar a solicitação.');
      toast.success(result.message);
      if (result.warning) toast.warning(result.warning);
      setOpen(false); router.refresh();
    } catch (error) { setError(error instanceof Error ? error.message : 'Confira a conexão e tente novamente.'); }
    finally { setBusy(null); }
  }
  function value(field: string, content: unknown, proposed: boolean) {
    if (field === 'photo') return <Photo key={String(content)} url={siteAssetUrl(content, asset('/'))} label={`${proposed ? 'Foto proposta' : 'Foto atual'} de ${name}`} />;
    if (content === null || content === undefined || content === '') return <span className="text-muted-foreground">{proposed ? 'Remover informação' : 'Não informado'}</span>;
    if (typeof content === 'boolean') return content ? 'Sim' : 'Não';
    const url = ['linkedin', 'github', 'instagram'].includes(field) ? siteAssetUrl(content, asset('/')) : null;
    return url ? <a href={url} target="_blank" rel="noopener noreferrer" className={`break-all underline underline-offset-4 ${focus}`}>{String(content)}</a> : <span className="whitespace-pre-wrap break-words leading-relaxed">{String(content)}</span>;
  }
  const buttons = <>
    <button type="button" disabled={Boolean(busy)} onClick={() => void review('REJECT')} className={`min-h-11 rounded-lg border border-red-800 px-3 text-sm font-medium text-red-700 dark:text-red-200 hover:bg-red-100 dark:hover:bg-red-950 disabled:opacity-50 ${focus}`}>{busy === 'REJECT' ? 'Recusando…' : 'Recusar'}</button>
    <button type="button" disabled={Boolean(busy) || !fields.length} onClick={() => void review('APPROVE')} className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-emerald-700 px-4 text-sm font-medium text-white hover:bg-emerald-800 disabled:opacity-50 ${focus}`}>{busy === 'APPROVE' && <Loader2 className="h-4 w-4 animate-spin" />}{busy === 'APPROVE' ? 'Publicando e traduzindo…' : 'Aprovar e publicar no site'}</button>
  </>;
  return <div className="space-y-2">
    <div className="flex flex-wrap items-center gap-2"><button type="button" onClick={() => { setError(''); setOpen(true); }} className={`inline-flex min-h-11 items-center gap-2 rounded-lg border border-border px-3 text-sm font-medium text-foreground hover:bg-accent ${focus}`}><Eye className="h-4 w-4" />Ver alterações</button>{buttons}</div>
    {error && !open && <p role="alert" className="max-w-prose text-sm text-red-700 dark:text-red-300">{error}</p>}
    <Dialog open={open} onOpenChange={next => { if (!busy) setOpen(next); }}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto border-border bg-background text-foreground sm:max-w-3xl">
        <DialogHeader><DialogTitle>Alterações de {name}</DialogTitle><DialogDescription className="max-w-prose text-sm leading-relaxed text-muted-foreground">Confira cada valor atual e o que será publicado após a aprovação. Enviado em {new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Sao_Paulo' }).format(new Date(change.createdAt))}.</DialogDescription></DialogHeader>
        <dl className="divide-y divide-border">{fields.map(field => <div key={field.key} className="py-5 first:pt-1"><dt className="mb-3 text-base font-semibold text-foreground">{field.label}</dt><dd className="grid min-w-0 gap-4 sm:grid-cols-2"><div className="min-w-0"><p className="mb-2 text-xs font-medium text-muted-foreground">Atual no site</p><div className="text-sm text-secondary-foreground">{value(field.key, current[field.key], false)}</div></div><div className="min-w-0"><p className="mb-2 text-xs font-medium text-emerald-700 dark:text-emerald-300">Proposto pelo integrante</p><div className="text-sm text-foreground">{value(field.key, change.changes[field.key], true)}</div></div></dd></div>)}</dl>
        {!fields.length && <p className="text-sm text-muted-foreground">Não há campos válidos para publicar nesta solicitação.</p>}
        {error && <p role="alert" className="text-sm text-red-700 dark:text-red-300">{error}</p>}
        <DialogFooter className="flex-wrap gap-2 border-t border-border pt-4"><button type="button" disabled={Boolean(busy)} onClick={() => setOpen(false)} className={`min-h-11 rounded-lg px-3 text-sm text-secondary-foreground hover:bg-accent ${focus}`}>Fechar prévia</button>{buttons}</DialogFooter>
      </DialogContent>
    </Dialog>
  </div>;
}
