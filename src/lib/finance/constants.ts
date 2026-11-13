export const FINANCE_CATEGORIES = [
  'Logística',
  'Eletrônica',
  'Mecânica',
  'Software',
  'Marketing',
  'Inscrições',
  'Manutenção',
  'Administrativo',
] as const;

export const FINANCE_FUNDS = ['Dinheiro Livre', 'Conta Coppetec'] as const;

export const FINANCE_TEAMS = ['Geral', 'Harpia', 'Nautilus'] as const;

export const PIX_KEY_TYPES = ['CPF', 'E-mail', 'Telefone', 'Chave Aleatória'] as const;

export type FinancialEntryTypeValue = 'ENTRADA' | 'SAIDA';
export type FinancialEntryStatusValue =
  | 'PENDENTE'
  | 'APROVADO'
  | 'AGUARDANDO_REEMBOLSO'
  | 'AGUARDANDO_NF'
  | 'PAGO'
  | 'RECUSADO';

export interface FinancialAttachmentDTO {
  id: string;
  entryId: string;
  name: string;
  url: string;
  driveFileId: string | null;
  mimeType: string | null;
  kind: string;
  createdAt: string;
}

export interface FinancialEntryDTO {
  id: string;
  code: string;
  type: FinancialEntryTypeValue;
  isReimbursement: boolean;
  title: string;
  description: string | null;
  category: string;
  fundSource: string;
  team: string;
  amountCents: number;
  occurredAt: string | null; // YYYY-MM-DD
  status: FinancialEntryStatusValue;
  requesterId: string | null;
  requesterName: string;
  requesterAvatar: string | null;
  requesterArea: string | null;
  requesterSavedPixKey: string | null;
  requesterSavedPixKeyType: string | null;
  pixKey: string | null;
  pixKeyType: string | null;
  driveFolderId: string | null;
  driveFolderUrl: string | null;
  reviewNotes: string | null;
  reviewedById: string | null;
  reviewedByName: string | null;
  reviewedAt: string | null;
  paidAt: string | null;
  attachments: FinancialAttachmentDTO[];
  createdAt: string;
  updatedAt: string;
}

export interface CategoryExpenseSummary {
  category: string;
  paidCents: number;
  pendingCents: number;
  totalCents: number;
  count: number;
}

export interface MonthlyCashflowPoint {
  month: string; // YYYY-MM
  label: string;
  incomeCents: number;
  expenseCents: number;
}

export interface FinancialSummary {
  freeCashBalanceCents: number;
  freeCashIncomeCents: number;
  freeCashExpenseCents: number;
  coppetecBalanceCents: number;
  coppetecIncomeCents: number;
  coppetecExpenseCents: number;
  coppetecPendingCents: number;
  totalIncomeCents: number;
  totalExpensePaidCents: number;
  awaitingReimbursementCents: number;
  awaitingReimbursementCount: number;
  approvedToPayCents: number;
  approvedToPayCount: number;
  awaitingNfCount: number;
  reimbursementPaidCents: number;
  reimbursementPaidCount: number;
  expensesByCategory: CategoryExpenseSummary[];
  monthlyCashflow: MonthlyCashflowPoint[];
}

export interface FinancialStatementDTO {
  id: string;
  title: string;
  fundSource: string;
  referenceDate: string; // YYYY-MM-DD
  fileName: string;
  fileUrl: string;
  mimeType: string | null;
  notes: string | null;
  uploadedById: string | null;
  uploadedByName: string | null;
  createdAt: string;
}

export interface FinancialDashboardData {
  entries: FinancialEntryDTO[];
  statements: FinancialStatementDTO[];
  summary: FinancialSummary;
  members: Array<{
    id: string;
    name: string;
    email: string | null;
    area: string;
    teamId: number | null;
    avatar: string | null;
    pixKey: string | null;
    pixKeyType: string | null;
    active: boolean;
  }>;
}

export interface MemberReimbursementsData {
  member: {
    id: string;
    name: string;
    email: string | null;
    area: string;
    teamId: number | null;
    avatar: string | null;
    pixKey: string | null;
    pixKeyType: string | null;
  };
  entries: FinancialEntryDTO[];
  summary: {
    awaitingCents: number;
    awaitingCount: number;
    approvedCents: number;
    approvedCount: number;
    paidCents: number;
    paidCount: number;
  };
}

export const FINANCIAL_STATUS_META: Record<
  FinancialEntryStatusValue,
  { label: string; shortLabel: string; cls: string }
> = {
  AGUARDANDO_REEMBOLSO: {
    label: 'Aguardando Reembolso',
    shortLabel: 'Aguardando',
    cls: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30',
  },
  PENDENTE: {
    label: 'Pendente',
    shortLabel: 'Pendente',
    cls: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30',
  },
  AGUARDANDO_NF: {
    label: 'Aguardando NF / Comp.',
    shortLabel: 'Aguardando NF',
    cls: 'bg-orange-500/15 text-orange-700 dark:text-orange-300 border-orange-500/30',
  },
  APROVADO: {
    label: 'Aprovado (A pagar)',
    shortLabel: 'Aprovado',
    cls: 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30',
  },
  PAGO: {
    label: 'Pago / Efetivado',
    shortLabel: 'Pago',
    cls: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
  },
  RECUSADO: {
    label: 'Recusado',
    shortLabel: 'Recusado',
    cls: 'bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/30',
  },
};

export function formatBRL(cents: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(cents / 100);
}

export function formatFinanceDate(isoDate: string | null | undefined): string {
  if (!isoDate) return 'Sem data';
  const normalized = isoDate.slice(0, 10);
  const parts = normalized.split('-');
  if (parts.length !== 3) return isoDate;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}
