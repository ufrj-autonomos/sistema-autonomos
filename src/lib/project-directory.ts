export const PROJECT_STATUSES = [{ value: 'operacao', label: 'Operação' }, { value: 'desenvolvimento', label: 'Desenvolvimento' }, { value: 'conceitual', label: 'Conceitual' }, { value: 'planejamento', label: 'Planejamento' }, { value: 'pausado', label: 'Pausado' }, { value: 'descontinuado', label: 'Descontinuado' }] as const;
export const PROJECT_COLUMNS = [
  { key: 'name', label: 'Nome' }, { key: 'coverImage', label: 'Imagem de capa' }, { key: 'teamName', label: 'Equipe' }, { key: 'status', label: 'Status' }, { key: 'year', label: 'Ano' }, { key: 'importance', label: 'Prioridade no site' }, { key: 'showOnSite', label: 'Exibição no site' }, { key: 'codename', label: 'Codinome' }, { key: 'slug', label: 'Slug' }, { key: 'tagline', label: 'Resumo' }, { key: 'description', label: 'Descrição' }, { key: 'tags', label: 'Tags' }, { key: 'notes', label: 'Observações internas' },
] as const;
export type ProjectColumn = typeof PROJECT_COLUMNS[number]['key'];
export type ProjectView = 'site' | 'internal' | 'custom';
export type ProjectRow = { id: number; name: string; coverImage: string | null; teamName: string; teamSlug: string; status: string; year: number; importance: number; showOnSite: boolean; codename: string | null; slug: string; tagline: string; description: string; tags: string; notes: string | null };
export const PROJECT_SITE_COLUMNS: ProjectColumn[] = ['name', 'coverImage', 'teamName', 'status', 'year', 'importance', 'showOnSite'];
export const PROJECT_INTERNAL_COLUMNS: ProjectColumn[] = ['name', 'codename', 'teamName', 'status', 'year', 'tags', 'notes'];
export function projectPreferences(input: unknown): { view: ProjectView; columns: ProjectColumn[] } {
  const object = input && typeof input === 'object' ? input as Record<string, unknown> : {};
  const keys = new Set(PROJECT_COLUMNS.map(column => column.key));
  const columns = Array.isArray(object.columns) ? [...new Set(object.columns)].filter((key): key is ProjectColumn => typeof key === 'string' && keys.has(key as ProjectColumn)) : [];
  return { view: ['site', 'internal', 'custom'].includes(String(object.view)) ? object.view as ProjectView : 'site', columns: columns.length ? columns : [...PROJECT_SITE_COLUMNS] };
}
export function projectStatus(value: string) { return PROJECT_STATUSES.find(item => item.value === value)?.label || value; }
function normalized(value: unknown) { return String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR'); }
export function filterProjects(rows: ProjectRow[], columns: ProjectColumn[], query: string, filters: { team: string; status: string; year: string; visibility: string }) {
  const search = normalized(query.trim());
  return rows.filter(row => (filters.team === 'all' || row.teamSlug === filters.team) && (filters.status === 'all' || row.status === filters.status) && (filters.year === 'all' || String(row.year) === filters.year) && (filters.visibility === 'all' || row.showOnSite === (filters.visibility === 'visible')) && (!search || columns.some(key => normalized(key === 'status' ? projectStatus(row.status) : key === 'showOnSite' ? row.showOnSite ? 'Visível no site' : 'Somente gestão oculto' : row[key]).includes(search))));
}
