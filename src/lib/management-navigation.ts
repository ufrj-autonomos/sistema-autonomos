import { isManagementPath } from './access-policy';

// Add a system here to include it in the sidebar, overview and breadcrumbs.
export const MANAGEMENT_SECTIONS = [
  { href: '/gestao', label: 'Visão geral', group: 'Principal', icon: 'overview', description: 'Resumo da equipe e tarefas que precisam de atenção.' },
  { href: '/gestao/contas', label: 'Contas e permissões', group: 'Pessoas', icon: 'accounts', description: 'Aprovar cadastros e administrar o acesso à plataforma.' },
  { href: '/gestao/integrantes', label: 'Integrantes', group: 'Pessoas', icon: 'members', description: 'Consultar o diretório, as áreas e as divisões da equipe.' },
  { href: '/gestao/presenca', label: 'Presença no laboratório', group: 'Operação', icon: 'attendance', description: 'Acompanhar horas semanais, pendências e registros.' },
  { href: '/gestao/divisoes', label: 'Divisões e projetos', group: 'Operação', icon: 'divisions', description: 'Consultar Harpia, Nautilus e seus projetos cadastrados.' },
  { href: '/gestao/sistema', label: 'Sistema', group: 'Plataforma', icon: 'system', description: 'Verificar a infraestrutura e o catálogo de ensino.' },
] as const;
export type ManagementSection = typeof MANAGEMENT_SECTIONS[number];
export function getManagementSection(pathname: string): ManagementSection | undefined {
  return [...MANAGEMENT_SECTIONS].reverse().find(section => pathname === section.href || (section.href !== '/gestao' && pathname.startsWith(`${section.href}/`)));
}
export function isManagementPage(pathname: string) { return isManagementPath(pathname) && !pathname.startsWith('/api/'); }
