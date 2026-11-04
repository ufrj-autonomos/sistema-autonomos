import { hasManagementAccess } from './access-policy';
import { MANAGEMENT_SECTIONS, INSTITUTIONAL_LINKS } from './management-navigation';

export function defaultWorkspacePath(role?: string | null) {
  return hasManagementAccess(role) ? '/gestao' : '/';
}

export function loginDestination(role: string | undefined, redirect?: string | null, firstLogin = false) {
  if (firstLogin) return '/perfil?welcome=1';
  if (redirect && redirect.startsWith('/') && !redirect.startsWith('//') && !/[\\\r\n]/.test(redirect) && !['/login', '/register', '/forgot-password', '/reset-password'].includes(redirect.split('?')[0])) {
    return redirect === '/' ? defaultWorkspacePath(role) : redirect;
  }
  return defaultWorkspacePath(role);
}

export const PERSONAL_LINKS = [
  { href: '/', label: 'Meu início', icon: 'home', description: 'Sua presença e seu aprendizado.' },
  { href: '/presenca', label: 'Minha presença', icon: 'attendance', description: 'Registrar e consultar suas horas no laboratório.' },
  { href: '/ensino', label: 'Cursos', icon: 'courses', description: 'Continuar suas aulas e exercícios.' },
  { href: '/perfil', label: 'Meu perfil', icon: 'profile', description: 'Atualizar seu cadastro e suas informações.' },
] as const;

export function workspaceLinks(management: boolean, staff: boolean) {
  return management ? MANAGEMENT_SECTIONS.map(item => ({ ...item })) : PERSONAL_LINKS.map(item => ({ ...item, href: item.href === '/' && staff ? '/meu-espaco' : item.href }));
}
export function jumpLinks(management: boolean, staff: boolean) {
  const links = [...workspaceLinks(management, staff)];
  if (management) {
    return [...links, ...INSTITUTIONAL_LINKS.filter(([, path]) => path).map(([label, path]) => ({ href: `/gestao/site${path}`, label, description: 'Site institucional', icon: 'institutional' })), { href: '/gestao/presenca/qr', label: 'QR do laboratório', description: 'Cartaz de presença para impressão', icon: 'attendance' }, { href: '/meu-espaco', label: 'Meu espaço', description: 'Perfil, presença pessoal e cursos', icon: 'home' }, { href: '/ensino', label: 'Cursos', description: 'Plataforma de ensino', icon: 'courses' }];
  }
  return staff ? [...links, { href: '/gestao', label: 'Abrir gestão', description: 'Pendências e operação da equipe', icon: 'overview' }] : links;
}
