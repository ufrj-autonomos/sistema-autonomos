import { isManagementPath } from './access-policy';

// Add a system here to include it in the sidebar, overview and breadcrumbs.
export const MANAGEMENT_SECTIONS = [
  { href: '/gestao', label: 'Visão geral', group: 'Principal', icon: 'overview', description: 'Resumo da equipe e tarefas que precisam de atenção.' },
  { href: '/gestao/dashboard', label: 'Dashboard', group: 'Principal', icon: 'analytics', description: 'Distribuição, qualidade do cadastro e evolução da presença.' },
  { href: '/gestao/contas', label: 'Contas e permissões', group: 'Pessoas', icon: 'accounts', description: 'Aprovar cadastros e administrar o acesso à plataforma.' },
  { href: '/gestao/integrantes', label: 'Integrantes', group: 'Pessoas', icon: 'members', description: 'Administrar dados públicos, dados internos e vínculos com contas.' },
  { href: '/gestao/advertencias', label: 'Gestão disciplinar', group: 'Pessoas', icon: 'disciplinary', description: 'Registro de avisos e advertências dos integrantes.' },
  { href: '/gestao/presenca', label: 'Presença no laboratório', group: 'Operação', icon: 'attendance', description: 'Acompanhar horas semanais, pendências e registros.' },
  { href: '/gestao/projetos', label: 'Projetos', group: 'Operação', icon: 'divisions', description: 'Administrar projetos, informações internas e exibição no site.' },
  { href: '/gestao/divisoes', label: 'Divisões', group: 'Operação', icon: 'divisions', description: 'Consultar Harpia, Nautilus e seus projetos cadastrados.' },
  { href: '/gestao/site', label: 'Site institucional', group: 'Plataforma', icon: 'institutional', description: 'Administrar o conteúdo público, as imagens e as configurações do site.' },
  { href: '/gestao/logs', label: 'Logs de atividade', group: 'Plataforma', icon: 'logs', adminOnly: true, description: 'Histórico das interações e ações no servidor. Exclusivo de Admin.' },
  { href: '/gestao/sistema', label: 'Sistema', group: 'Plataforma', icon: 'system', description: 'Verificar a infraestrutura e o catálogo de ensino.' },
] as const;
export type ManagementSection = typeof MANAGEMENT_SECTIONS[number];
export function getManagementSection(pathname: string): ManagementSection | undefined {
  return [...MANAGEMENT_SECTIONS].reverse().find(section => pathname === section.href || (section.href !== '/gestao' && pathname.startsWith(`${section.href}/`)));
}
export function isManagementPage(pathname: string) { return isManagementPath(pathname) && !pathname.startsWith('/api/'); }

export const INSTITUTIONAL_LINKS = [
  ['Visão geral', ''], ['Equipes', '/team'], ['Competições', '/competition'], ['Timeline (História)', '/timelineevent'], ['Patrocinadores', '/sponsor'], ['Galeria de Fotos', '/galleryimage'], ['Modelos 3D', '/model3d'], ['Mensagens', '/mensagens'], ['Configurações Globais', '/settings'],
] as const;

export function managementSectionsForRole(role: unknown) { return MANAGEMENT_SECTIONS.filter(item => !('adminOnly' in item && item.adminOnly) || role === 'ADMIN'); }
