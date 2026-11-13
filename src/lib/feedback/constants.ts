export type FeedbackScopeValue = 'SISTEMA' | 'SITE' | 'LABORATORIO' | 'EQUIPE';
export type FeedbackCategoryValue = 'BUG' | 'MELHORIA' | 'IDEIA' | 'PROBLEMA_LAB' | 'PROCESSO';
export type FeedbackStatusValue =
  | 'RECEBIDA'
  | 'EM_ANALISE'
  | 'APROVADA'
  | 'EM_ANDAMENTO'
  | 'APLICADA'
  | 'ARQUIVADA';
export type FeedbackValidityValue =
  | 'PENDENTE'
  | 'VALIDA'
  | 'PARCIALMENTE_VALIDA'
  | 'INVALIDA_OU_DUPLICADA';
export type FeedbackPriorityValue = 'BAIXA' | 'MEDIA' | 'ALTA' | 'CRITICA';

export const FEEDBACK_SCOPE_META: Record<
  FeedbackScopeValue,
  {
    label: string;
    shortLabel: string;
    description: string;
    locationPlaceholder: string;
    tone: 'indigo' | 'sky' | 'amber' | 'emerald';
  }
> = {
  SISTEMA: {
    label: 'Sistema Interno (este portal)',
    shortLabel: 'Sistema',
    description: 'Telas de presença, reuniões, financeiro, patrimônio, ensino ou login.',
    locationPlaceholder: 'Ex: /presenca, /gestao/integrantes, tela de reembolso...',
    tone: 'indigo',
  },
  SITE: {
    label: 'Site Institucional',
    shortLabel: 'Site',
    description: 'Página pública da equipe, cards de membros, projetos, galeria ou traduções.',
    locationPlaceholder: 'Ex: Página inicial, /membros, /projetos/harpia...',
    tone: 'sky',
  },
  LABORATORIO: {
    label: 'Laboratório & Infraestrutura',
    shortLabel: 'Laboratório',
    description: 'Bancadas, ferramentas, equipamentos, organização, limpeza, energia ou segurança.',
    locationPlaceholder: 'Ex: Bancada da Harpia, Armário A, impressora 3D, solda...',
    tone: 'amber',
  },
  EQUIPE: {
    label: 'Equipe, Cultura & Processos',
    shortLabel: 'Equipe',
    description: 'Dinâmica das reuniões, onboarding de trainees, comunicação, competições ou regras.',
    locationPlaceholder: 'Ex: Reunião geral, processo seletivo, escala do lab...',
    tone: 'emerald',
  },
};

export const FEEDBACK_CATEGORY_META: Record<
  FeedbackCategoryValue,
  { label: string; shortLabel: string; tone: 'rose' | 'sky' | 'violet' | 'amber' | 'emerald' }
> = {
  BUG: { label: 'Report de Bug / Erro', shortLabel: 'Bug', tone: 'rose' },
  MELHORIA: { label: 'Melhoria Proposta', shortLabel: 'Melhoria', tone: 'sky' },
  IDEIA: { label: 'Nova Ideia / Sugestão', shortLabel: 'Ideia', tone: 'violet' },
  PROBLEMA_LAB: { label: 'Problema no Laboratório', shortLabel: 'Problema Lab', tone: 'amber' },
  PROCESSO: { label: 'Processo / Organização', shortLabel: 'Processo', tone: 'emerald' },
};

export const FEEDBACK_STATUS_META: Record<
  FeedbackStatusValue,
  { label: string; shortLabel: string; tone: 'slate' | 'sky' | 'emerald' | 'indigo' | 'rose' }
> = {
  RECEBIDA: { label: 'Recebida (aguardando triagem)', shortLabel: 'Recebida', tone: 'slate' },
  EM_ANALISE: { label: 'Em análise pela gestão', shortLabel: 'Em análise', tone: 'sky' },
  APROVADA: { label: 'Aceita / Planejada', shortLabel: 'Aceita', tone: 'indigo' },
  EM_ANDAMENTO: { label: 'Em execução / desenvolvimento', shortLabel: 'Em andamento', tone: 'sky' },
  APLICADA: { label: 'Aplicada / Implementada', shortLabel: 'Aplicada', tone: 'emerald' },
  ARQUIVADA: { label: 'Arquivada / Não aplicável', shortLabel: 'Arquivada', tone: 'rose' },
};

export const FEEDBACK_VALIDITY_META: Record<
  FeedbackValidityValue,
  { label: string; shortLabel: string; tone: 'slate' | 'emerald' | 'amber' | 'rose' }
> = {
  PENDENTE: { label: 'Não avaliada ainda', shortLabel: 'Sem avaliação', tone: 'slate' },
  VALIDA: { label: 'Válida (procede / faz sentido)', shortLabel: 'Válida', tone: 'emerald' },
  PARCIALMENTE_VALIDA: {
    label: 'Parcialmente válida (requer adaptação)',
    shortLabel: 'Parcialmente válida',
    tone: 'amber',
  },
  INVALIDA_OU_DUPLICADA: {
    label: 'Não procede / Duplicada / Fora de escopo',
    shortLabel: 'Inválida / Duplicada',
    tone: 'rose',
  },
};

export const FEEDBACK_PRIORITY_META: Record<
  FeedbackPriorityValue,
  { label: string; shortLabel: string; rank: number; tone: 'slate' | 'sky' | 'amber' | 'rose' }
> = {
  BAIXA: { label: 'Baixa', shortLabel: 'Baixa', rank: 1, tone: 'slate' },
  MEDIA: { label: 'Média', shortLabel: 'Média', rank: 2, tone: 'sky' },
  ALTA: { label: 'Alta', shortLabel: 'Alta', rank: 3, tone: 'amber' },
  CRITICA: { label: 'Crítica / Urgente', shortLabel: 'Crítica', rank: 4, tone: 'rose' },
};

export const FEEDBACK_ASSIGNED_AREAS = [
  'Sistema / Dev',
  'Site Institucional',
  'Operações / Laboratório',
  'Gestão / Diretoria',
  'Marketing',
  'Software',
  'Eletrônica',
  'Mecânica',
  'Financeiro',
] as const;

export interface FeedbackItemDTO {
  id: string;
  code: string;
  scope: FeedbackScopeValue;
  category: FeedbackCategoryValue;
  title: string;
  description: string;
  pageOrLocation: string | null;
  stepsToReproduce: string | null;
  expectedOutcome: string | null;
  attachmentUrl: string | null;
  attachmentName: string | null;
  isAnonymous: boolean;
  isMine: boolean;
  authorDisplayName: string;
  status: FeedbackStatusValue;
  validity: FeedbackValidityValue;
  priority: FeedbackPriorityValue;
  assignedArea: string | null;
  assignedToId: string | null;
  assignedToName: string | null;
  responseNotes: string | null;
  appliedAt: string | null;
  reviewedByName: string | null;
  reviewedAt: string | null;
  voteCount: number;
  viewerHasVoted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface FeedbackSummary {
  totalCount: number;
  pendingTriageCount: number;
  openBugsCount: number;
  validAcceptedCount: number;
  appliedCount: number;
  byScope: { scope: FeedbackScopeValue; label: string; count: number; appliedCount: number }[];
}

export interface FeedbackDashboardData {
  items: FeedbackItemDTO[];
  summary: FeedbackSummary;
  members?: { id: string; name: string; area: string }[];
}
