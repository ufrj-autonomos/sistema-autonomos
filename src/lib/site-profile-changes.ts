import { normalizeMemberArea } from './member-fields';
export const SITE_PROFILE_FIELDS = [
  { key: 'name', label: 'Nome', limit: 200 },
  { key: 'area', label: 'Área', limit: 100 },
  { key: 'bio', label: 'Biografia', limit: 2000 },
  { key: 'photo', label: 'Foto', limit: 500 },
  { key: 'course', label: 'Curso', limit: 200 },
  { key: 'linkedin', label: 'LinkedIn', limit: 300 },
  { key: 'github', label: 'GitHub', limit: 300 },
  { key: 'instagram', label: 'Instagram', limit: 300 },
  { key: 'isFemale', label: 'Adaptação de cargo no feminino', limit: 0 },
] as const;
export type SiteProfileKey = typeof SITE_PROFILE_FIELDS[number]['key'];
export type SiteProfileChanges = Partial<Record<SiteProfileKey, string | boolean | null>>;
export function siteAssetUrl(value: unknown, origin: string) {
  if (typeof value !== 'string' || !value || /[\\\u0000-\u001f\u007f]/.test(value) || value.startsWith('//')) return null;
  if (!/^https?:\/\//i.test(value) && !value.startsWith('/')) return null;
  try { const url = new URL(value, origin); return ['http:', 'https:'].includes(url.protocol) ? url.href : null; } catch { return null; }
}
export function validateSiteProfileChanges(input: unknown): SiteProfileChanges {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Alterações do site inválidas.');
  if (Object.keys(input).some(key => !SITE_PROFILE_FIELDS.some(field => field.key === key))) throw new Error('Campo não permitido na alteração do site.');
  const data = input as Record<string, unknown>;
  const result: SiteProfileChanges = {};
  for (const { key, label, limit } of SITE_PROFILE_FIELDS) {
    if (!(key in data)) continue;
    const value = data[key];
    if (key === 'isFemale') {
      if (typeof value !== 'boolean') throw new Error(`Confira ${label}.`);
      result[key] = value; continue;
    }
    if (value !== null && (typeof value !== 'string' || value.length > limit || value.includes('\0'))) throw new Error(`Confira o campo ${label}.`);
    const text = typeof value === 'string' ? value.trim() : null;
    if (key === 'name' && !text) throw new Error('Informe o nome de exibição.');
    if (key === 'area') {
      const area = normalizeMemberArea(text);
      if (!area) throw new Error('Selecione a área na equipe.');
      result[key] = area; continue;
    }
    if (['photo', 'linkedin', 'github', 'instagram'].includes(key) && text && !siteAssetUrl(text, 'https://ufrjautonomos.com')) throw new Error(`Informe um link válido em ${label}.`);
    result[key] = text || null;
  }
  return result;
}
export function profileChangeDiff(proposed: SiteProfileChanges, current: Record<string, unknown> | null) {
  return Object.fromEntries(Object.entries(proposed).filter(([key, value]) => current ? value !== current[key] && !(value === null && (current[key] === '' || current[key] == null)) : value !== null && value !== '')) as SiteProfileChanges;
}
