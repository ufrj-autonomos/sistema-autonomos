import { isManagementPath } from './access-policy';

// Add a system here to include it in the sidebar, overview and breadcrumbs.
export const MANAGEMENT_SECTIONS = [
  { href: '/gestao', label: 'Visão geral', group: 'Principal', icon: 'overview', description: 'Resumo da equipe e tarefas que precisam de atenção.' },
  { href: '/gestao/dashboard', label: 'Dashboard', group: 'Principal', icon: 'analytics', description: 'Distribuição, qualidade do cadastro e evolução da presença.' },
  { href: '/gestao/divisoes', label: 'Divisões', group: 'Principal', icon: 'divisions', description: 'Consultar Harpia, Nautilus e seus projetos cadastrados.' },
  { href: '/gestao/integrantes', label: 'Integrantes', group: 'Pessoas', icon: 'members', description: 'Membros ativos, perfil na equipe, dados internos e completude cadastral.' },
  { href: '/gestao/ex-membros', label: 'Ex-membros', group: 'Pessoas', icon: 'alumni', description: 'Diretório exclusivo de ex-integrantes (alumni) e período na equipe.' },
  { href: '/gestao/presenca', label: 'Presença no laboratório', group: 'Pessoas', icon: 'attendance', description: 'Acompanhar horas semanais, pendências e registros.' },
  { href: '/gestao/advertencias', label: 'Gestão disciplinar', group: 'Pessoas', icon: 'disciplinary', description: 'Registro de avisos e advertências dos integrantes.' },
  { href: '/gestao/contas', label: 'Contas e permissões', group: 'Pessoas', icon: 'accounts', description: 'Aprovar cadastros e administrar o acesso à plataforma.' },
  { href: '/gestao/financeiro/caixa', label: 'Livro Caixa', group: 'Financeiro', icon: 'finance', description: 'Saldo Dinheiro Livre e Coppetec, entradas, saídas, gráficos e comprovantes.' },
  { href: '/gestao/financeiro/reembolsos', label: 'Reembolsos', group: 'Financeiro', icon: 'finance', description: 'Solicitações de reembolso, chaves PIX, notas fiscais e fluxo de aprovação.' },
  { href: '/gestao/financeiro/patrimonio', label: 'Patrimônio', group: 'Financeiro', icon: 'assets', description: 'Inventário de materiais, valores de aquisição, planejamento de compras, estado e custódia.' },
  { href: '/gestao/site', label: 'Conteúdo do site', group: 'Site', icon: 'institutional', description: 'História, galeria de fotos, competições, patrocinadores e configurações.' },
  { href: '/gestao/site/membros', label: 'Exibição de membros', group: 'Site', icon: 'siteMembers', description: 'Visibilidade pública, preview dos cards e aprovações de perfil do site.' },
  { href: '/gestao/projetos', label: 'Projetos', group: 'Site', icon: 'projects', description: 'Administrar projetos, informações internas e exibição no site.' },
  { href: '/gestao/melhorias', label: 'Ideias & Bugs', group: 'Sistema', icon: 'feedback', description: 'Recepção de bugs, melhorias propostas e ideias da equipe, lab, sistema e site.' },
  { href: '/gestao/logs', label: 'Logs de atividade', group: 'Sistema', icon: 'logs', adminOnly: true, description: 'Histórico das interações e ações no servidor. Exclusivo de Admin.' },
  { href: '/gestao/sistema', label: 'Sistema', group: 'Sistema', icon: 'system', description: 'Verificar a infraestrutura e o catálogo de ensino.' },
] as const;
export type ManagementSection = typeof MANAGEMENT_SECTIONS[number];
export function getManagementSection(pathname: string): ManagementSection | undefined {
  return [...MANAGEMENT_SECTIONS]
    .sort((a, b) => b.href.length - a.href.length)
    .find(section => pathname === section.href || (section.href !== '/gestao' && pathname.startsWith(`${section.href}/`)));
}
export function isManagementPage(pathname: string) { return isManagementPath(pathname) && !pathname.startsWith('/api/'); }

export const INSTITUTIONAL_LINKS = [
  ['Painel do site', ''],
  ['História (Timeline)', '/timelineevent'],
  ['Galeria de Fotos', '/galleryimage'],
  ['Competições', '/competition'],
  ['Patrocinadores', '/sponsor'],
  ['Equipes', '/team'],
  ['Modelos 3D', '/model3d'],
  ['Mensagens', '/mensagens'],
  ['Configurações Globais', '/settings'],
] as const;

export function managementSectionsForRole(role: unknown) { return MANAGEMENT_SECTIONS.filter(item => !('adminOnly' in item && item.adminOnly) || role === 'ADMIN'); }
