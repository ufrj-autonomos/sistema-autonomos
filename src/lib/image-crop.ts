/** Shared geometry for the browser preview and the exported crop. */
export function cropGeometry(input: { naturalWidth: number; naturalHeight: number; viewportWidth: number; aspect: number; zoom: number; x: number; y: number; profile: boolean }) {
  const { naturalWidth: iw, naturalHeight: ih, viewportWidth: width, aspect } = input;
  if (![iw, ih, width, aspect].every(value => Number.isFinite(value) && value > 0)) throw Error('A imagem ainda não está pronta para o recorte.');
  const height = width / aspect;
  const zoom = Math.min(4, Math.max(1, input.zoom));
  const scale = Math.max(width / iw, height / ih) * zoom;
  const displayedWidth = iw * scale, displayedHeight = ih * scale;
  const maxX = Math.max(0, (displayedWidth - width) / 2), maxY = Math.max(0, (displayedHeight - height) / 2);
  const sourceWidth = width / scale, sourceHeight = height / scale;
  const sourceX = Math.min(iw - sourceWidth, Math.max(0, (iw - sourceWidth) / 2 - Math.min(1, Math.max(-1, input.x)) * maxX / scale));
  const sourceY = Math.min(ih - sourceHeight, Math.max(0, (ih - sourceHeight) / 2 - Math.min(1, Math.max(-1, input.y)) * maxY / scale));
  const factor = Math.min(1, (input.profile ? 1024 : 2560) / Math.max(sourceWidth, sourceHeight));
  return { displayedWidth, displayedHeight, maxX, maxY, sourceWidth, sourceHeight, sourceX, sourceY, outputWidth: Math.max(1, Math.round(sourceWidth * factor)), outputHeight: Math.max(1, Math.round(sourceHeight * factor)) };
}
