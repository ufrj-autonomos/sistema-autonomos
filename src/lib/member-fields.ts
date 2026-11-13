export type MemberOption = { value: string; label: string; group?: string };
export const MEMBER_ROLES: MemberOption[] = [
  { value: 'Capitão', label: 'Capitão / Capitã', group: 'Liderança' },
  { value: 'Vice-Capitão', label: 'Vice-capitão / Vice-capitã', group: 'Liderança' },
  { value: 'Diretor de Gente e Gestão', label: 'Diretor(a) de Gente e Gestão', group: 'Liderança' },
  { value: 'Diretor de Operações', label: 'Diretor(a) de Operações', group: 'Liderança' },
  { value: 'Coordenador', label: 'Coordenador(a)', group: 'Coordenação' },
  { value: 'Vice-Coordenador', label: 'Vice-coordenador(a)', group: 'Coordenação' },
  { value: 'Coordenador de Marketing', label: 'Coordenador(a) de Marketing', group: 'Coordenação' },
  { value: 'Membro', label: 'Membro / Integrante', group: 'Integrantes' },
  { value: 'Trainee', label: 'Trainee', group: 'Integrantes' },
];
export const MEMBER_AREAS = ['Gestão', 'Marketing', 'Mecânica', 'Eletrônica', 'Software'] as const;

export function isGestaoArea(area: string | null | undefined): boolean {
  const norm = normalizeMemberArea(area);
  return norm !== null && normalizedKey(norm) === 'gestao';
}

export function roleFromCargo(
  cargo: string | null | undefined,
  area?: string | null
): 'ADMIN' | 'COORDINATOR' | 'MANAGEMENT' | 'TRAINEE' | 'MEMBER' {
  if (!cargo) return isGestaoArea(area) ? 'MANAGEMENT' : 'MEMBER';
  const c = normalizeMemberRole(cargo);
  // Diretoria e capitania (e vices) são ADMIN
  if (['Capitão', 'Vice-Capitão', 'Diretor de Gente e Gestão', 'Diretor de Operações'].includes(c)) {
    return 'ADMIN';
  }
  // Coordenador e vice-coordenador têm os mesmos acessos de coordenador
  if (['Coordenador', 'Vice-Coordenador', 'Coordenador de Marketing'].includes(c)) {
    return 'COORDINATOR';
  }
  if (c === 'Trainee') {
    return 'TRAINEE';
  }
  if (isGestaoArea(area)) {
    return 'MANAGEMENT';
  }
  return 'MEMBER';
}
const normalizedKey = (value: string) => value.trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
export function normalizeMemberArea(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const key = normalizedKey(value);
  if (!key || ['nao informada', 'nao informado', 'nao selecionada', 'nao selecionado', 'selecione uma opcao', '-','—'].includes(key)) return null;
  return MEMBER_AREAS.find(area => normalizedKey(area) === key) || value.trim();
}
export function resolveMemberAreas(siteArea: unknown, internalArea: unknown) {
  const site = normalizeMemberArea(siteArea);
  const internal = normalizeMemberArea(internalArea);
  return { site: site || internal, internal: internal || site };
}
export function planMemberAreaRepairs(site: { id: number; area: string }[], internal: { id: string; institutionalMemberId: number | null; area: string }[]) {
  const byId = new Map(site.map(member => [member.id, member]));
  const siteUpdates: { id: number; from: string; to: string }[] = [];
  const internalUpdates: { id: string; from: string; to: string }[] = [];
  for (const member of internal) {
    const published = member.institutionalMemberId ? byId.get(member.institutionalMemberId) : undefined;
    if (!published) continue;
    const siteArea = normalizeMemberArea(published.area);
    const internalArea = normalizeMemberArea(member.area);
    if (!siteArea && internalArea) siteUpdates.push({ id: published.id, from: published.area, to: internalArea });
    if (!internalArea && siteArea) internalUpdates.push({ id: member.id, from: member.area, to: siteArea });
  }
  return { siteUpdates, internalUpdates };
}
export function normalizeMemberRole(value: string) {
  const aliases: Record<string, string> = {
    integrante: 'Membro', membro: 'Membro', capita: 'Capitão', 'vice-capita': 'Vice-Capitão',
    coordenadora: 'Coordenador', 'vice-coordenadora': 'Vice-Coordenador',
    'coordenadora de marketing': 'Coordenador de Marketing', 'diretora de gente e gestao': 'Diretor de Gente e Gestão',
    'diretora de operacoes': 'Diretor de Operações',
  };
  return aliases[normalizedKey(value)] || MEMBER_ROLES.find(role => normalizedKey(role.value) === normalizedKey(value))?.value || value.trim();
}
export function memberRoleTranslations(role: string) {
  return ({
    'Capitão': { roleEn: 'Captain', roleFr: 'Capitaine' },
    'Vice-Capitão': { roleEn: 'Vice-Captain', roleFr: 'Vice-Capitaine' },
    'Diretor de Gente e Gestão': { roleEn: 'Director of People & Management', roleFr: 'Directeur des Ressources Humaines' },
    'Diretor de Operações': { roleEn: 'Operations Director', roleFr: 'Directeur des Opérations' },
    'Coordenador': { roleEn: 'Coordinator', roleFr: 'Coordinateur' },
    'Vice-Coordenador': { roleEn: 'Vice-Coordinator', roleFr: 'Vice-Coordinateur' },
    'Coordenador de Marketing': { roleEn: 'Marketing Coordinator', roleFr: 'Coordinateur Marketing' },
    'Membro': { roleEn: 'Member', roleFr: 'Membre' },
    'Trainee': { roleEn: 'Trainee', roleFr: 'Stagiaire' },
    'Alumni': { roleEn: 'Alumni', roleFr: 'Ancien élève' },
  } as Record<string, { roleEn: string; roleFr: string }>)[normalizeMemberRole(role)];
}
