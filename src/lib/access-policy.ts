export const ROLES = ['TRAINEE', 'MEMBER', 'MANAGEMENT', 'ADMIN'] as const;
export const ACCOUNT_STATUSES = ['PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED'] as const;
export const ROLE_LABELS = { TRAINEE: 'Trainee', MEMBER: 'Membro', MANAGEMENT: 'Gestão', ADMIN: 'Admin' };
export const STATUS_LABELS = { PENDING: 'Aguardando aprovação', APPROVED: 'Aprovada', REJECTED: 'Rejeitada', SUSPENDED: 'Suspensa' };

export function isManagementPath(pathname: string) {
  return ['/gestao', '/api/gestao', '/api/admin'].some(path => pathname === path || pathname.startsWith(`${path}/`));
}

export function isPublicPath(pathname: string) {
  return ['/login', '/register', '/api/auth/login', '/api/auth/register', '/api/auth/me', '/api/auth/logout', '/api/health', '/api/institutional/contact', '/api/cron/maintenance'].includes(pathname);
}

export function hasManagementAccess(role: unknown) { return role === 'ADMIN' || role === 'MANAGEMENT'; }
