export const ACTIVITY_KINDS = ['PAGE_VIEW', 'UI_CLICK', 'FORM_SUBMIT', 'CONTROL_CHANGE', 'API_REQUEST', 'SERVER_ACTION', 'AUTH'] as const;
export const KIND_LABELS: Record<string, string> = { PAGE_VIEW: 'Página visitada', UI_CLICK: 'Clique', FORM_SUBMIT: 'Formulário enviado', CONTROL_CHANGE: 'Controle alterado', API_REQUEST: 'Requisição ao servidor', SERVER_ACTION: 'Ação de gestão', AUTH: 'Autenticação' };
export const OUTCOME_LABELS: Record<string, string> = { SUCCESS: 'Concluído', FAILURE: 'Falhou', OBSERVED: 'Interação registrada' };
export const CLIENT_ACTIONS = ['PAGE_VIEW', 'BUTTON_CLICK', 'LINK_CLICK', 'FORM_SUBMIT', 'CONTROL_CHANGE', 'THEME_CHANGE'] as const;
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
