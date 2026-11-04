'use client';
import { cropGeometry } from '@/lib/image-crop';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Loader2, Minus, Plus, RotateCcw } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
export function ImageCropDialog({ file, profile = false, onCancel, onConfirm }: { file: File; profile?: boolean; onCancel: () => void; onConfirm: (file: File) => void | Promise<void> }) {
  const image = useRef<HTMLImageElement>(null);
  const drag = useRef<{ x: number; y: number; initialX: number; initialY: number } | null>(null);
  const [src, setSrc] = useState(''); const [natural, setNatural] = useState({ width: 0, height: 0 }); const [width, setWidth] = useState(0);
  const [zoom, setZoom] = useState(1); const [position, setPosition] = useState({ x: 0, y: 0 }); const [ratio, setRatio] = useState(profile ? '1' : 'original');
  const [saving, setSaving] = useState(false); const [error, setError] = useState('');
  useEffect(() => { const url = URL.createObjectURL(file); setSrc(url); return () => URL.revokeObjectURL(url); }, [file]);
  const measureViewport = useCallback((node: HTMLDivElement | null) => {
    if (!node) return;
    setWidth(node.getBoundingClientRect().width);
    const observer = new ResizeObserver(entries => setWidth(entries[0].contentRect.width));
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  const aspect = profile ? 1 : ratio === 'original' ? natural.width && natural.height ? natural.width / natural.height : 16 / 9 : Number(ratio);
  const geometry = natural.width && natural.height && width ? cropGeometry({ naturalWidth: natural.width, naturalHeight: natural.height, viewportWidth: width, aspect, zoom, x: position.x, y: position.y, profile }) : null;
  const { displayedWidth = 0, displayedHeight = 0, maxX = 0, maxY = 0 } = geometry || {};
  const clamp = (value: number) => Math.min(1, Math.max(-1, value));
  function reset() { setZoom(1); setPosition({ x: 0, y: 0 }); }
  async function confirm() {
    if (!image.current || !natural.width || !width) return;
    setSaving(true); setError('');
    try {
      if (!geometry) throw Error('A imagem ainda não está pronta.');
      const { sourceWidth, sourceHeight, sourceX, sourceY } = geometry;
      const canvas = document.createElement('canvas'); canvas.width = geometry.outputWidth; canvas.height = geometry.outputHeight;
      const context = canvas.getContext('2d'); if (!context) throw Error('O editor não está disponível neste navegador.');
      context.imageSmoothingEnabled = true; context.imageSmoothingQuality = 'high';
      context.drawImage(image.current, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, canvas.width, canvas.height);
      let blob: Blob | null = null;
      for (const quality of [0.9, 0.8, 0.7]) { blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/webp', quality)); if (blob && blob.size <= 4 * 1024 * 1024) break; }
      if (!blob || blob.size > 4 * 1024 * 1024) throw Error('Não foi possível preparar esta imagem. Tente um recorte menor.');
      await onConfirm(new File([blob], `${file.name.replace(/\.[^.]+$/, '')}-recorte.webp`, { type: blob.type || 'image/webp' }));
    } catch (error) { setError(error instanceof Error ? error.message : 'Não foi possível recortar a imagem.'); }
    finally { setSaving(false); }
  }
  return <Dialog open onOpenChange={open => { if (!open && !saving) onCancel(); }}><DialogContent className="max-h-[95dvh] overflow-y-auto sm:max-w-xl" showCloseButton={!saving}><DialogHeader><DialogTitle>{profile ? 'Ajustar foto de perfil' : 'Recortar imagem'}</DialogTitle><DialogDescription>Arraste a imagem e ajuste o zoom.{profile ? ' A área clara dentro do círculo indica o que aparecerá no avatar.' : ' Escolha a proporção e enquadre a parte que deseja mostrar.'}</DialogDescription></DialogHeader>
    {!profile && <label className="flex flex-wrap items-center justify-between gap-3 text-sm">Proporção<select value={ratio} disabled={saving} onChange={event => { setRatio(event.target.value); reset(); }} className="min-h-11 rounded-lg border border-input bg-background px-3"><option value="original">Original</option><option value={16 / 9}>Paisagem · 16:9</option><option value={4 / 3}>Paisagem · 4:3</option><option value="1">Quadrada · 1:1</option><option value={3 / 4}>Retrato · 3:4</option></select></label>}
    <div className="mx-auto w-full" style={{ maxWidth: profile ? 360 : Math.min(480, 330 * aspect) }}><div ref={measureViewport} className="relative isolate w-full touch-none select-none overflow-hidden rounded-lg bg-zinc-900" style={{ aspectRatio: aspect, cursor: drag.current ? 'grabbing' : 'grab' }} onPointerDown={event => { if (saving) return; event.currentTarget.setPointerCapture(event.pointerId); drag.current = { x: event.clientX, y: event.clientY, initialX: position.x, initialY: position.y }; }} onPointerMove={event => { if (!drag.current) return; setPosition({ x: maxX ? clamp(drag.current.initialX + (event.clientX - drag.current.x) / maxX) : 0, y: maxY ? clamp(drag.current.initialY + (event.clientY - drag.current.y) / maxY) : 0 }); }} onPointerUp={() => { drag.current = null; }} onPointerCancel={() => { drag.current = null; }}>
      {src && <img ref={image} src={src} alt="Prévia do recorte" draggable={false} onLoad={event => setNatural({ width: event.currentTarget.naturalWidth, height: event.currentTarget.naturalHeight })} onError={() => setError('O navegador não conseguiu abrir a imagem. Tente JPG, PNG ou WebP.')} className="pointer-events-none absolute left-1/2 top-1/2 max-w-none" style={{ width: displayedWidth || '100%', height: displayedHeight || '100%', transform: `translate(-50%, -50%) translate(${position.x * maxX}px, ${position.y * maxY}px)` }} />}
      {profile ? <div aria-hidden="true" className="pointer-events-none absolute inset-0 rounded-full border-2 border-white/90" style={{ boxShadow: '0 0 0 1000px rgba(0,0,0,.6)' }} /> : <div aria-hidden="true" className="pointer-events-none absolute inset-0 border border-white/60"><span className="absolute inset-y-0 left-1/3 border-l border-white/30" /><span className="absolute inset-y-0 right-1/3 border-l border-white/30" /><span className="absolute inset-x-0 top-1/3 border-t border-white/30" /><span className="absolute inset-x-0 bottom-1/3 border-t border-white/30" /></div>}
    </div></div>
    <div className="space-y-3"><label className="block text-sm">Zoom<span className="mt-2 flex items-center gap-3"><Minus size={16} aria-hidden="true" /><input type="range" min="1" max="4" step="0.01" value={zoom} onChange={event => setZoom(Number(event.target.value))} disabled={saving} className="h-8 flex-1 accent-foreground" /><Plus size={16} aria-hidden="true" /></span></label><div className="grid gap-3 sm:grid-cols-2"><label className="text-xs text-muted-foreground">Posição horizontal<input type="range" min="-1" max="1" step="0.01" value={position.x} onChange={event => setPosition(value => ({ ...value, x: Number(event.target.value) }))} disabled={saving || maxX === 0} className="mt-1 h-8 w-full accent-foreground" /></label><label className="text-xs text-muted-foreground">Posição vertical<input type="range" min="-1" max="1" step="0.01" value={position.y} onChange={event => setPosition(value => ({ ...value, y: Number(event.target.value) }))} disabled={saving || maxY === 0} className="mt-1 h-8 w-full accent-foreground" /></label></div></div>
    {error && <p role="alert" className="text-sm text-red-700 dark:text-red-300">{error}</p>}<DialogFooter><button type="button" disabled={saving} onClick={reset} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-border px-3 text-sm"><RotateCcw size={15} />Centralizar</button><button type="button" disabled={saving} onClick={onCancel} className="min-h-11 rounded-lg border border-border px-4 text-sm">Cancelar</button><button type="button" disabled={saving || !natural.width || !width} onClick={() => void confirm()} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-50">{saving && <Loader2 size={15} className="animate-spin" />}{saving ? 'Preparando…' : 'Usar recorte'}</button></DialogFooter>
  </DialogContent></Dialog>;
}
