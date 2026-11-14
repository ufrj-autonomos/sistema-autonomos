export type NotificationCategoryKey =
  | 'FEEDBACK_REPLY'
  | 'FEEDBACK_TRIAGE'
  | 'FEEDBACK_NEW'
  | 'DISCIPLINARY'
  | 'ATTENDANCE_ALERT'
  | 'ATTENDANCE_JUSTIFICATION'
  | 'REIMBURSEMENT'
  | 'PROFILE_OR_EMAIL_CHANGE'
  | 'SYSTEM_ANNOUNCEMENT';

export interface NotificationCategoryMeta {
  key: NotificationCategoryKey;
  label: string;
  description: string;
  defaultEnabled: boolean;
  defaultSendToManagement: boolean;
  supportsManagementToggle: boolean;
  tone: 'sky' | 'violet' | 'emerald' | 'amber' | 'rose' | 'slate';
}

export const NOTIFICATION_CATEGORIES: Record<
  NotificationCategoryKey,
  NotificationCategoryMeta
> = {
  FEEDBACK_REPLY: {
    key: 'FEEDBACK_REPLY',
    label: 'Resposta em Ideia/Bug',
    description:
      'Notifica o autor no app quando a gestão ou tecnologia envia uma resposta direta ou pede ajustes.',
    defaultEnabled: true,
    defaultSendToManagement: false,
    supportsManagementToggle: false,
    tone: 'sky',
  },
  FEEDBACK_TRIAGE: {
    key: 'FEEDBACK_TRIAGE',
    label: 'Avaliação em Ideia/Bug',
    description:
      'Notifica o autor quando o reporte é avaliado (validade, prioridade, status ou equipe responsável).',
    defaultEnabled: true,
    defaultSendToManagement: false,
    supportsManagementToggle: false,
    tone: 'violet',
  },
  FEEDBACK_NEW: {
    key: 'FEEDBACK_NEW',
    label: 'Novo Bug ou Ideia registrado',
    description:
      'Notifica a gestão e administração quando um membro envia um novo bug, ideia ou melhoria.',
    defaultEnabled: true,
    defaultSendToManagement: true,
    supportsManagementToggle: true,
    tone: 'amber',
  },
  DISCIPLINARY: {
    key: 'DISCIPLINARY',
    label: 'Ocorrência Disciplinar',
    description:
      'Notifica o membro no app quando um aviso ou advertência é registrado em seu histórico.',
    defaultEnabled: true,
    defaultSendToManagement: false,
    supportsManagementToggle: false,
    tone: 'rose',
  },
  ATTENDANCE_ALERT: {
    key: 'ATTENDANCE_ALERT',
    label: 'Meta de Horas no Lab',
    description:
      'Notifica o membro no app quando um alerta semanal ou mensal de horas do laboratório é disparado.',
    defaultEnabled: true,
    defaultSendToManagement: false,
    supportsManagementToggle: false,
    tone: 'amber',
  },
  ATTENDANCE_JUSTIFICATION: {
    key: 'ATTENDANCE_JUSTIFICATION',
    label: 'Justificativa de Presença',
    description:
      'Notifica o membro quando sua justificativa de ausência/meta é aprovada ou recusada.',
    defaultEnabled: true,
    defaultSendToManagement: false,
    supportsManagementToggle: false,
    tone: 'emerald',
  },
  REIMBURSEMENT: {
    key: 'REIMBURSEMENT',
    label: 'Reembolsos e Financeiro',
    description:
      'Notifica o solicitante sobre abertura ou atualização de status de pedidos de reembolso.',
    defaultEnabled: true,
    defaultSendToManagement: false,
    supportsManagementToggle: false,
    tone: 'emerald',
  },
  PROFILE_OR_EMAIL_CHANGE: {
    key: 'PROFILE_OR_EMAIL_CHANGE',
    label: 'Perfil e Alteração de E-mail',
    description:
      'Notifica o membro quando uma solicitação de alteração de perfil ou e-mail é aprovada ou recusada.',
    defaultEnabled: true,
    defaultSendToManagement: false,
    supportsManagementToggle: false,
    tone: 'sky',
  },
  SYSTEM_ANNOUNCEMENT: {
    key: 'SYSTEM_ANNOUNCEMENT',
    label: 'Comunicado do Sistema',
    description:
      'Mensagens e alertas manuais disparados pela administração através do painel de Sistema.',
    defaultEnabled: true,
    defaultSendToManagement: false,
    supportsManagementToggle: false,
    tone: 'slate',
  },
};

export interface NotificationItemDTO {
  id: string;
  category: NotificationCategoryKey;
  categoryLabel: string;
  tone: NotificationCategoryMeta['tone'];
  title: string;
  message: string;
  link: string | null;
  readAt: string | null;
  actorName: string | null;
  createdAt: string;
}

export interface NotificationFeedDTO {
  unreadCount: number;
  items: NotificationItemDTO[];
}

export interface NotificationRuleDTO {
  category: NotificationCategoryKey;
  label: string;
  description: string;
  tone: NotificationCategoryMeta['tone'];
  enabled: boolean;
  sendToManagement: boolean;
  supportsManagementToggle: boolean;
  sentCount: number;
  unreadCount: number;
  updatedAt: string | null;
}

export interface NotificationAdminLogDTO {
  id: string;
  category: NotificationCategoryKey;
  categoryLabel: string;
  recipientId: string;
  recipientName: string;
  recipientArea: string;
  title: string;
  message: string;
  link: string | null;
  readAt: string | null;
  actorName: string | null;
  createdAt: string;
}

export interface NotificationsAdminDashboardDTO {
  stats: {
    totalNotifications: number;
    unreadNotifications: number;
    last24hCount: number;
    activeRulesCount: number;
  };
  rules: NotificationRuleDTO[];
  recentLogs: NotificationAdminLogDTO[];
  members: { id: string; name: string; area: string; role: string }[];
  areas: string[];
}
