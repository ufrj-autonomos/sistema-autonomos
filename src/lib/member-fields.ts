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

export const ROLE_PRIORITY_LIST = ['ADMIN', 'COORDINATOR', 'MANAGEMENT', 'MEMBER', 'TRAINEE'] as const;
export type DerivedSystemRole = (typeof ROLE_PRIORITY_LIST)[number];

export function rolesFromCargo(
  cargo: string | string[] | null | undefined,
  area?: string | null
): DerivedSystemRole[] {
  const parts = splitMemberRoles(cargo);
  const found = new Set<DerivedSystemRole>();

  if (parts.length === 0) {
    found.add(isGestaoArea(area) ? 'MANAGEMENT' : 'MEMBER');
  } else {
    for (const c of parts) {
      if (['Capitão', 'Vice-Capitão', 'Diretor de Gente e Gestão', 'Diretor de Operações'].includes(c)) {
        found.add('ADMIN');
      } else if (['Coordenador', 'Vice-Coordenador', 'Coordenador de Marketing'].includes(c)) {
        found.add('COORDINATOR');
      } else if (c === 'Trainee') {
        found.add('TRAINEE');
      } else {
        found.add('MEMBER');
      }
    }
    if (isGestaoArea(area)) {
      found.add('MANAGEMENT');
    }
  }

  return ROLE_PRIORITY_LIST.filter((r) => found.has(r));
}

export function roleFromCargo(
  cargo: string | null | undefined,
  area?: string | null
): DerivedSystemRole {
  return rolesFromCargo(cargo, area)[0] ?? (isGestaoArea(area) ? 'MANAGEMENT' : 'MEMBER');
}
const normalizedKey = (value: string) => value.trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

export function isProfessorAdvisor(
  input: { role?: string | null; area?: string | null; course?: string | null } | null | undefined
): boolean {
  if (!input) return false;
  const roleKey = input.role ? normalizedKey(input.role) : '';
  const areaKey = input.area ? normalizedKey(input.area) : '';
  const combined = `${roleKey} ${areaKey}`.trim();
  if (!combined) return false;
  return ['orientador', 'orientacao', 'professor', 'docente'].some((token) =>
    combined.includes(token)
  );
}

export function isAlumniOrInactive(
  input: { active?: boolean | null; role?: string | null; status?: string | null } | null | undefined
): boolean {
  if (!input) return false;
  if (input.active === false) return true;
  if (input.status === 'SUSPENDED' || input.status === 'REJECTED') return true;
  const roleKey = input.role ? normalizedKey(input.role) : '';
  return roleKey === 'alumni' || roleKey.includes('ex-membro') || roleKey.includes('ex membro');
}

export function isOperationalActiveMember(
  member:
    | { active?: boolean | null; role?: string | null; area?: string | null; status?: string | null }
    | null
    | undefined,
  inst?: { active?: boolean | null; role?: string | null; area?: string | null } | null
): boolean {
  if (!member) return false;
  if (isProfessorAdvisor(member) || isAlumniOrInactive(member)) return false;
  if (inst && (isProfessorAdvisor(inst) || isAlumniOrInactive(inst))) return false;
  return true;
}
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
export function normalizeSingleMemberRole(value: string) {
  const aliases: Record<string, string> = {
    integrante: 'Membro', membro: 'Membro', capita: 'Capitão', 'vice-capita': 'Vice-Capitão',
    coordenadora: 'Coordenador', 'vice-coordenadora': 'Vice-Coordenador',
    'coordenadora de marketing': 'Coordenador de Marketing', 'diretora de gente e gestao': 'Diretor de Gente e Gestão',
    'diretora de operacoes': 'Diretor de Operações',
  };
  return aliases[normalizedKey(value)] || MEMBER_ROLES.find(role => normalizedKey(role.value) === normalizedKey(value))?.value || value.trim();
}

export function splitMemberRoles(value: unknown): string[] {
  if (Array.isArray(value)) {
    const out: string[] = [];
    for (const item of value) {
      if (typeof item !== 'string') continue;
      for (const part of item.split(/\s*(?:\/|,|;|\||\+)\s*/)) {
        const clean = normalizeSingleMemberRole(part);
        if (clean && !out.includes(clean)) out.push(clean);
      }
    }
    return out;
  }
  if (typeof value !== 'string') return [];
  const trimmed = value.trim();
  if (!trimmed) return [];
  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) return splitMemberRoles(parsed);
    } catch {
      // Fallback para texto simples
    }
  }
  const out: string[] = [];
  for (const part of trimmed.split(/\s*(?:\/|,|;|\||\+)\s*/)) {
    const clean = normalizeSingleMemberRole(part);
    if (clean && !out.includes(clean)) out.push(clean);
  }
  return out;
}

export function formatMemberRoles(value: string[] | string): string {
  return splitMemberRoles(value).join(' / ');
}

export function normalizeMemberRole(value: string) {
  const parts = splitMemberRoles(value);
  if (parts.length === 0) return value.trim();
  if (parts.length === 1) return parts[0];
  return parts.join(' / ');
}

const SINGLE_ROLE_TRANSLATIONS: Record<string, { roleEn: string; roleFr: string }> = {
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
};

export function memberRoleTranslations(role: string) {
  const parts = splitMemberRoles(role);
  if (parts.length <= 1) {
    return SINGLE_ROLE_TRANSLATIONS[normalizeMemberRole(role)];
  }
  const translated = parts
    .map((p) => SINGLE_ROLE_TRANSLATIONS[p])
    .filter((t): t is { roleEn: string; roleFr: string } => Boolean(t));
  if (translated.length === 0) return undefined;
  return {
    roleEn: translated.map((t) => t.roleEn).join(' / '),
    roleFr: translated.map((t) => t.roleFr).join(' / '),
  };
}

export function computeMissingProfileFields(input: {
  hasInternalAccount: boolean;
  area?: string | null;
  course?: string | null;
  academicPeriod?: string | null;
  phone?: string | null;
  cpf?: string | null;
  dre?: string | null;
  birthDate?: Date | string | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  profileCompletedAt?: Date | string | null;
}): string[] {
  const missing: string[] = [];
  if (!input.hasInternalAccount) {
    missing.push('Conta vinculada / Cadastro operacional');
  } else {
    if (!input.phone?.trim()) missing.push('WhatsApp');
    if (!input.course?.trim()) missing.push('Curso');
    if (!input.dre?.trim()) missing.push('DRE');
    if (!input.academicPeriod?.trim()) missing.push('Período acadêmico');
    if (!normalizeMemberArea(input.area)) missing.push('Área na equipe');
    if (!input.cpf?.trim()) missing.push('CPF');
    if (!input.birthDate) missing.push('Data de nascimento');
    if (!input.emergencyContactName?.trim()) missing.push('Contato de emergência (nome)');
    if (!input.emergencyContactPhone?.trim()) missing.push('Contato de emergência (telefone)');
    if (!input.profileCompletedAt && missing.length === 0) {
      missing.push('Confirmação inicial do perfil');
    }
  }
  return missing;
}
