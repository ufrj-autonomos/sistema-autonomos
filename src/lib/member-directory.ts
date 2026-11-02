export const OPERATIONAL_FIELDS = [
  { key: 'name', label: 'Nome', type: 'text', maxLength: 200 },
  { key: 'area', label: 'Área', type: 'text', maxLength: 100 },
  { key: 'email', label: 'Email', type: 'email', maxLength: 254 },
  { key: 'phone', label: 'Contato / WhatsApp', type: 'tel', maxLength: 30 },
  { key: 'dre', label: 'DRE', type: 'text', maxLength: 25 },
  { key: 'cpf', label: 'CPF', type: 'text', maxLength: 14 },
  { key: 'birthDate', label: 'Data de nascimento', type: 'date', maxLength: 10 },
  { key: 'course', label: 'Curso', type: 'text', maxLength: 200 },
  { key: 'academicPeriod', label: 'Período acadêmico', type: 'text', maxLength: 50 },
  { key: 'emergencyContactName', label: 'Nome do contato de emergência', type: 'text', maxLength: 200 },
  { key: 'emergencyContactPhone', label: 'Telefone de emergência', type: 'tel', maxLength: 30 },
] as const;
export type OperationalKey = typeof OPERATIONAL_FIELDS[number]['key'];
export type MemberDirectoryRow = {
  id: number; name: string; role: string; area: string; age: number | null;
  teamId: number | null; teamName: string; active: boolean; showOnSite: boolean;
  photo: string | null; bio: string | null; course: string | null;
  linkedin: string | null; github: string | null; instagram: string | null;
  joinedYear: string | null; leftYear: string | null; projectNames: string; isFemale: boolean;
  roleEn: string | null; roleFr: string | null; bioEn: string | null; bioFr: string | null;
  courseEn: string | null; courseFr: string | null;
  internal: Record<OperationalKey, string | null> & { notes: string | null; missedWeeks: number | null };
};
export const MEMBER_COLUMNS = [
  { key: 'name', label: 'Nome (site)', group: 'Site', width: 240 },
  { key: 'role', label: 'Cargo', group: 'Site', width: 180 },
  { key: 'area', label: 'Área (site)', group: 'Site', width: 150 },
  { key: 'age', label: 'Idade', group: 'Site', width: 90 },
  { key: 'teamName', label: 'Equipe', group: 'Site', width: 150 },
  { key: 'active', label: 'Status', group: 'Site', width: 110 },
  { key: 'showOnSite', label: 'Exibição no site', group: 'Site', width: 160 },
  { key: 'photo', label: 'Foto', group: 'Site', width: 90 },
  { key: 'bio', label: 'Biografia', group: 'Site', width: 300 },
  { key: 'course', label: 'Curso (site)', group: 'Site', width: 240 },
  { key: 'linkedin', label: 'LinkedIn', group: 'Site', width: 220 },
  { key: 'github', label: 'GitHub', group: 'Site', width: 220 },
  { key: 'instagram', label: 'Instagram', group: 'Site', width: 220 },
  { key: 'joinedYear', label: 'Ano de entrada', group: 'Site', width: 140 },
  { key: 'leftYear', label: 'Ano de saída', group: 'Site', width: 130 },
  { key: 'projectNames', label: 'Projetos', group: 'Site', width: 240 },
  { key: 'isFemale', label: 'Adaptação de cargo no feminino', group: 'Site', width: 200 },
  { key: 'roleEn', label: 'Cargo (EN)', group: 'Site', width: 180 },
  { key: 'roleFr', label: 'Cargo (FR)', group: 'Site', width: 180 },
  { key: 'bioEn', label: 'Biografia (EN)', group: 'Site', width: 300 },
  { key: 'bioFr', label: 'Biografia (FR)', group: 'Site', width: 300 },
  { key: 'courseEn', label: 'Curso (EN)', group: 'Site', width: 240 },
  { key: 'courseFr', label: 'Curso (FR)', group: 'Site', width: 240 },
  { key: 'internalName', label: 'Nome (interno)', group: 'Interno', width: 240 },
  { key: 'internalArea', label: 'Área (interna)', group: 'Interno', width: 150 },
  { key: 'email', label: 'Email', group: 'Interno', width: 260 },
  { key: 'phone', label: 'Contato / WhatsApp', group: 'Interno', width: 180 },
  { key: 'dre', label: 'DRE', group: 'Interno', width: 150 },
  { key: 'cpf', label: 'CPF', group: 'Interno', width: 170 },
  { key: 'birthDate', label: 'Data de nascimento', group: 'Interno', width: 180 },
  { key: 'internalCourse', label: 'Curso (interno)', group: 'Interno', width: 260 },
  { key: 'academicPeriod', label: 'Período', group: 'Interno', width: 140 },
  { key: 'emergencyContact', label: 'Contato de emergência', group: 'Interno', width: 260 },
  { key: 'notes', label: 'Observações internas', group: 'Interno', width: 300 },
  { key: 'missedWeeks', label: 'Semanas abaixo da meta', group: 'Presença', width: 220 },
] as const;
export type MemberColumnKey = typeof MEMBER_COLUMNS[number]['key'];
export type MemberView = 'site' | 'internal' | 'custom';
export type MemberPreferences = { view: MemberView; columns: MemberColumnKey[] };
export const SITE_COLUMNS: MemberColumnKey[] = ['name', 'role', 'area', 'age', 'teamName', 'active', 'showOnSite'];
export const INTERNAL_COLUMNS: MemberColumnKey[] = ['internalName', 'internalArea', 'email', 'phone', 'dre', 'cpf', 'birthDate', 'internalCourse', 'academicPeriod', 'emergencyContact'];
export function memberPreferences(input: unknown): MemberPreferences {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Visualização inválida.');
  const data = input as Record<string, unknown>;
  if (Object.keys(data).some(key => !['view', 'columns'].includes(key)) || !['site', 'internal', 'custom'].includes(String(data.view))) throw new Error('Visualização inválida.');
  if (!Array.isArray(data.columns) || data.columns.length < 1 || data.columns.length > MEMBER_COLUMNS.length || new Set(data.columns).size !== data.columns.length || data.columns.some(key => !MEMBER_COLUMNS.some(column => column.key === key))) throw new Error('Selecione pelo menos uma coluna válida, sem repetições.');
  return { view: data.view as MemberView, columns: data.columns as MemberColumnKey[] };
}
export function initialMemberPreferences(input: unknown): MemberPreferences {
  try { return memberPreferences(input); } catch { return { view: 'site', columns: [...INTERNAL_COLUMNS] }; }
}
export function memberValue(row: MemberDirectoryRow, key: MemberColumnKey): string | number | boolean | null {
  switch (key) {
    case 'internalName': return row.internal.name || row.name;
    case 'internalArea': return row.internal.area || row.area;
    case 'internalCourse': return row.internal.course || row.course;
    case 'emergencyContact': return [row.internal.emergencyContactName, row.internal.emergencyContactPhone].filter(Boolean).join('\n') || null;
    case 'email': case 'phone': case 'dre': case 'cpf': case 'birthDate': case 'academicPeriod': case 'notes': case 'missedWeeks': return row.internal[key];
    default: return row[key];
  }
}
export function normalizeMemberSearch(value: string) { return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR'); }
export function filterMembers(rows: MemberDirectoryRow[], columns: MemberColumnKey[], filters: { search: string; team: string; area: string; status: string }, view: MemberView) {
  const query = normalizeMemberSearch(filters.search.trim());
  const digits = filters.search.replace(/\D/g, '');
  return rows.filter(row => {
    if (filters.team !== 'all' && String(row.teamId ?? 'general') !== filters.team) return false;
    if (filters.area !== 'all' && String(memberValue(row, view === 'site' ? 'area' : 'internalArea')) !== filters.area) return false;
    if (filters.status !== 'all' && row.active !== (filters.status === 'active')) return false;
    // Search only displayed fields, avoiding matches against invisible private data.
    return !query || columns.some(key => {
      const value = String(memberValue(row, key) ?? '');
      return normalizeMemberSearch(value).includes(query) || (digits.length >= 3 && ['cpf', 'phone', 'dre', 'emergencyContact'].includes(key) && value.replace(/\D/g, '').includes(digits));
    });
  });
}
