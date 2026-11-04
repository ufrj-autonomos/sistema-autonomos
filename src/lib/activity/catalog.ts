export const ACTIVITY_KINDS = ['AUTH', 'SERVER_ACTION', 'API_REQUEST', 'PAGE_VIEW', 'CONTROL_CHANGE'] as const;
export const KIND_LABELS: Record<string, string> = { PAGE_VIEW: 'Página visitada', UI_CLICK: 'Clique', FORM_SUBMIT: 'Formulário enviado', CONTROL_CHANGE: 'Controle alterado', API_REQUEST: 'Ações do sistema', SERVER_ACTION: 'Gestão e publicações', AUTH: 'Autenticação' };
export const OUTCOME_LABELS: Record<string, string> = { SUCCESS: 'Concluído', FAILURE: 'Falhou', OBSERVED: 'Interação registrada' };
export const CLIENT_ACTIONS = ['PAGE_VIEW', 'THEME_CHANGE'] as const;
export const ACTION_LABELS: Record<string, string> = {
  PAGE_VIEW: 'Visitou uma página', BUTTON_CLICK: 'Acionou um botão', LINK_CLICK: 'Acionou um link', FORM_SUBMIT: 'Enviou um formulário', CONTROL_CHANGE: 'Alterou um controle', THEME_CHANGE: 'Alternou o tema',
  createRecord: 'Criou conteúdo institucional', updateRecord: 'Editou conteúdo institucional', deleteRecord: 'Removeu conteúdo institucional', uploadImageToSupabase: 'Enviou imagem institucional', updateSiteSettings: 'Alterou configurações do site', updateMemberQuickField: 'Editou um campo de integrante', saveDirectoryDetails: 'Salvou dados internos', saveMemberPreferences: 'Salvou visualização de integrantes',
};
/** Queries/fragments can contain QR codes, reset tokens, emails or search terms. */
export function activityPath(input: unknown): string | null {
  if (typeof input !== 'string' || input.length > 2048 || !input.startsWith('/') || input.startsWith('//') || /[\\\u0000-\u001f\u007f]/.test(input)) return null;
  const path = input.split(/[?#]/)[0];
  if (path.length > 300 || /%(?:0[0-9a-f]|1[0-9a-f]|7f|5c)/i.test(path)) return null;
  return path || '/';
}
export function controlName(input: unknown) { return typeof input === 'string' && /^[a-z][a-z0-9_.:-]{0,59}$/i.test(input) ? input : null; }

export const API_ACTIVITY: Record<string, string> = {
  'POST /api/auth/login': 'AUTH_LOGIN', 'POST /api/auth/logout': 'AUTH_LOGOUT', 'POST /api/auth/register': 'ACCOUNT_REQUESTED',
  'POST /api/auth/forgot-password': 'PASSWORD_RECOVERY', 'POST /api/auth/reset-password': 'PASSWORD_RESET',
  'PUT /api/profile': 'PROFILE_UPDATED', 'POST /api/profile/photo': 'PROFILE_PHOTO_UPLOADED', 'POST /api/admin/images': 'IMAGE_UPLOADED',
  'PATCH /api/admin/users/[id]': 'ACCOUNT_UPDATED', 'POST /api/admin/profile-changes': 'SITE_REQUEST_REVIEWED',
  'POST /api/attendance/justifications': 'ATTENDANCE_JUSTIFICATION_SUBMITTED', 'PATCH /api/admin/attendance/justifications': 'ATTENDANCE_JUSTIFICATION_REVIEWED',
  'POST /api/attendance/scan': 'ATTENDANCE_REGISTERED', 'POST /api/admin/attendance/visits': 'ATTENDANCE_ADJUSTED',
  'POST /api/admin/translations/sync': 'TRANSLATIONS_SYNCED', 'POST /api/progress/lesson': 'LESSON_PROGRESS', 'POST /api/progress/exercise': 'EXERCISE_PROGRESS', 'POST /api/institutional/contact': 'CONTACT_SENT',
};
Object.assign(ACTION_LABELS, { ATTENDANCE_JUSTIFICATION_SUBMITTED: 'Solicitou justificativa de presença', ATTENDANCE_JUSTIFICATION_REVIEWED: 'Analisou justificativa de presença', ATTENDANCE_JUSTIFICATION_APPROVED: 'Aprovou justificativa de presença', ATTENDANCE_JUSTIFICATION_REJECTED: 'Negou justificativa de presença', AUTH_LOGIN: 'Entrou no sistema', AUTH_LOGOUT: 'Saiu do sistema', ACCOUNT_REQUESTED: 'Solicitou cadastro', PASSWORD_RECOVERY: 'Solicitou recuperação de acesso', PASSWORD_RESET: 'Redefiniu a senha', PROFILE_UPDATED: 'Atualizou o próprio cadastro', PROFILE_PHOTO_UPLOADED: 'Enviou foto de perfil', IMAGE_UPLOADED: 'Enviou imagem', ACCOUNT_UPDATED: 'Alterou uma conta ou permissão', SITE_REQUEST_REVIEWED: 'Revisou solicitação para o site', ATTENDANCE_REGISTERED: 'Registrou presença no laboratório', ATTENDANCE_IN: 'Registrou entrada no laboratório', ATTENDANCE_OUT: 'Registrou saída do laboratório', ATTENDANCE_ADJUSTED: 'Ajustou um registro de presença', TRANSLATIONS_SYNCED: 'Sincronizou traduções do site', LESSON_PROGRESS: 'Atualizou progresso de uma aula', EXERCISE_PROGRESS: 'Atualizou progresso de um exercício', CONTACT_SENT: 'Enviou uma mensagem de contato' });
export function activityTitle(event: { action: string; targetPath?: string | null; control?: string | null; outcome?: string }) {
  event = { ...event, action: API_ACTIVITY[event.action] || event.action };
  if (event.action === 'AUTH_LOGIN' && event.outcome === 'FAILURE') return 'Tentou entrar no sistema';
  if (event.action === 'IMAGE_UPLOADED' && event.targetPath?.startsWith('/gestao/projetos')) return 'Enviou imagem de projeto';
  const entity = event.targetPath?.startsWith('/gestao/projetos') ? 'projeto' : event.targetPath?.startsWith('/gestao/integrantes') ? 'integrante' : null;
  if (entity && ['createRecord', 'updateRecord', 'deleteRecord', 'updateMemberQuickField'].includes(event.action)) {
    const verb = event.action === 'createRecord' ? 'Criou' : event.action === 'deleteRecord' ? 'Removeu' : 'Atualizou';
    return `${verb} ${entity}${event.control === 'status' ? ' · status' : event.control === 'showOnSite' ? ' · visibilidade no site' : event.control === 'importance' ? ' · prioridade no site' : ''}`;
  }
  return ACTION_LABELS[event.action] || 'Ação registrada';
}
export function activityLocation(path: string) {
  if (path.startsWith('/gestao/projetos')) return 'Projetos';
  if (path.startsWith('/gestao/integrantes')) return 'Integrantes';
  if (path.startsWith('/gestao/contas') || path.startsWith('/api/admin/users')) return 'Contas e permissões';
  if (path.includes('attendance') || path.includes('presenca')) return 'Presença';
  if (path.startsWith('/gestao/site') || path.includes('translations') || path.includes('profile-changes')) return 'Site institucional';
  if (path.includes('progress') || path.includes('curso') || path.startsWith('/ensino')) return 'Ensino';
  if (path.startsWith('/api/auth')) return 'Acesso ao sistema';
  if (path.includes('/profile') || path === '/perfil') return 'Perfil do integrante';
  return path === '/' ? 'Início' : path.startsWith('/gestao') ? 'Gestão' : 'Sistema';
}
