export const ROLES = ['TRAINEE', 'MEMBER', 'COORDINATOR', 'MANAGEMENT', 'ADMIN'] as const;
export type SystemRole = (typeof ROLES)[number];
export const ROLE_PRIORITY: Record<SystemRole, number> = {
  TRAINEE: 1,
  MEMBER: 2,
  MANAGEMENT: 3,
  COORDINATOR: 4,
  ADMIN: 5,
};
export const ACCOUNT_STATUSES = ['PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED'] as const;
export const ROLE_LABELS: Record<SystemRole, string> = {
  TRAINEE: 'Trainee',
  MEMBER: 'Membro',
  COORDINATOR: 'Coordenador',
  MANAGEMENT: 'Gestão',
  ADMIN: 'Admin',
};
export const STATUS_LABELS = { PENDING: 'Aguardando aprovação', APPROVED: 'Aprovada', REJECTED: 'Rejeitada', SUSPENDED: 'Suspensa' };

function isSystemRole(value: unknown): value is SystemRole {
  return typeof value === 'string' && (ROLES as readonly string[]).includes(value);
}

/**
 * Resolve todos os cargos efetivos do usuário (permitindo soma de permissões quando possui múltiplos cargos).
 * Mantém fallback seguro caso apenas `role` tenha sido atualizado em ambiente isolado de teste.
 */
export function extractEffectiveRoles(input: unknown): SystemRole[] {
  if (!input) return [];
  if (isSystemRole(input)) return [input];
  if (Array.isArray(input)) {
    const unique = [...new Set(input.filter(isSystemRole))];
    return unique.sort((a, b) => ROLE_PRIORITY[b] - ROLE_PRIORITY[a]);
  }
  if (typeof input === 'object') {
    const obj = input as { role?: unknown; roles?: unknown };
    const primary = isSystemRole(obj.role) ? obj.role : null;
    const rawList = Array.isArray(obj.roles) ? obj.roles.filter(isSystemRole) : [];

    // Se `roles` existe e não contém `primary` (e há um `primary`), significa que `role` foi sobrescrito isoladamente.
    if (primary && rawList.length > 0 && !rawList.includes(primary)) {
      return [primary];
    }

    const combined = new Set<SystemRole>();
    if (primary) combined.add(primary);
    for (const r of rawList) combined.add(r);
    return [...combined].sort((a, b) => ROLE_PRIORITY[b] - ROLE_PRIORITY[a]);
  }
  return [];
}

export function hasEffectiveRole(
  input: unknown,
  target: SystemRole | readonly SystemRole[]
): boolean {
  const targets = Array.isArray(target) ? target : [target];
  return extractEffectiveRoles(input).some((r) => targets.includes(r));
}

export function isManagementPath(pathname: string) {
  return ['/gestao', '/api/gestao', '/api/admin'].some(path => pathname === path || pathname.startsWith(`${path}/`));
}

export function isPublicPath(pathname: string) {
  return [
    '/login',
    '/register',
    '/forgot-password',
    '/reset-password',
    '/api/auth/login',
    '/api/auth/register',
    '/api/auth/register/send-code',
    '/api/auth/forgot-password',
    '/api/auth/reset-password',
    '/api/auth/me',
    '/api/auth/logout',
    '/api/health',
    '/api/institutional/contact',
    '/api/cron/maintenance',
    '/api/cron/attendance-alerts',
  ].includes(pathname);
}

export function hasManagementAccess(roleOrUser: unknown) {
  return hasEffectiveRole(roleOrUser, ['ADMIN', 'MANAGEMENT', 'COORDINATOR']);
}
