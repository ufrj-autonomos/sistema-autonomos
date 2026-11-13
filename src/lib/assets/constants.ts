export { formatBRL, formatFinanceDate } from '@/lib/finance/constants';

export const ASSET_CATEGORIES = [
  'Eletrônica & Embarcados',
  'Mecânica & Estrutura',
  'Ferramentas',
  'Baterias & Energia',
  'Sensores & Câmeras',
  'Propulsão',
  'Computação & Rede',
  'Consumíveis & Insumos',
  'Mobiliário & Lab',
  'Competição & Transporte',
  'Outros',
] as const;

export const ASSET_TEAMS = ['Geral', 'Harpia', 'Nautilus'] as const;

export const ASSET_AREAS = [
  'Geral',
  'Eletrônica',
  'Mecânica',
  'Software',
  'Gestão',
  'Marketing',
] as const;

export const ASSET_UNITS = ['un', 'kit', 'par', 'm', 'kg', 'caixa', 'rolo'] as const;

export const ASSET_ACQUISITION_SOURCES = [
  'Dinheiro Livre',
  'Conta Coppetec',
  'Reembolso',
  'Patrocínio',
  'Doação',
  'Empréstimo Externo',
  'Outro',
] as const;

export type AssetAcquisitionStatusValue =
  | 'PLANEJADO'
  | 'EM_COTACAO'
  | 'COMPRADO_AGUARDANDO'
  | 'ADQUIRIDO'
  | 'EMPRESTADO'
  | 'MANUTENCAO'
  | 'BAIXADO';

export type AssetConditionValue =
  | 'NOVO'
  | 'BOM'
  | 'DESGASTADO'
  | 'DEFEITO_PARCIAL'
  | 'ESTRAGADO';

export const ASSET_STATUS_META: Record<
  AssetAcquisitionStatusValue,
  { label: string; shortLabel: string; tone: 'slate' | 'sky' | 'amber' | 'emerald' | 'violet' | 'rose'; isFuture: boolean }
> = {
  PLANEJADO: {
    label: 'Planejado (será adquirido)',
    shortLabel: 'Planejado',
    tone: 'slate',
    isFuture: true,
  },
  EM_COTACAO: {
    label: 'Em cotação / orçamento',
    shortLabel: 'Em cotação',
    tone: 'sky',
    isFuture: true,
  },
  COMPRADO_AGUARDANDO: {
    label: 'Comprado (aguardando entrega)',
    shortLabel: 'Aguard. entrega',
    tone: 'amber',
    isFuture: true,
  },
  ADQUIRIDO: {
    label: 'Adquirido (no laboratório)',
    shortLabel: 'Adquirido',
    tone: 'emerald',
    isFuture: false,
  },
  EMPRESTADO: {
    label: 'Emprestado / com membro',
    shortLabel: 'Emprestado',
    tone: 'violet',
    isFuture: false,
  },
  MANUTENCAO: {
    label: 'Em manutenção / reparo',
    shortLabel: 'Manutenção',
    tone: 'amber',
    isFuture: false,
  },
  BAIXADO: {
    label: 'Baixado / descartado',
    shortLabel: 'Baixado',
    tone: 'rose',
    isFuture: false,
  },
};

export const ASSET_CONDITION_META: Record<
  AssetConditionValue,
  { label: string; shortLabel: string; tone: 'emerald' | 'sky' | 'amber' | 'rose'; isDamaged: boolean }
> = {
  NOVO: {
    label: 'Novo / Lacrado',
    shortLabel: 'Novo',
    tone: 'emerald',
    isDamaged: false,
  },
  BOM: {
    label: 'Bom estado',
    shortLabel: 'Bom',
    tone: 'sky',
    isDamaged: false,
  },
  DESGASTADO: {
    label: 'Com desgaste de uso',
    shortLabel: 'Desgastado',
    tone: 'amber',
    isDamaged: false,
  },
  DEFEITO_PARCIAL: {
    label: 'Com defeito parcial',
    shortLabel: 'Defeito parcial',
    tone: 'amber',
    isDamaged: true,
  },
  ESTRAGADO: {
    label: 'Estragado / Inutilizável',
    shortLabel: 'Estragado',
    tone: 'rose',
    isDamaged: true,
  },
};

export interface InventoryAssetEventDTO {
  id: string;
  assetId: string;
  eventType: string;
  title: string;
  notes: string | null;
  actorId: string | null;
  actorName: string | null;
  createdAt: string;
}

export interface InventoryAssetDTO {
  id: string;
  assetTag: string;
  name: string;
  description: string | null;
  category: string;
  team: string;
  area: string;
  quantity: number;
  unit: string;
  unitPriceCents: number;
  totalPriceCents: number;
  acquisitionStatus: AssetAcquisitionStatusValue;
  condition: AssetConditionValue;
  damageNotes: string | null;
  acquiredAt: string | null;
  expectedAcquisitionDate: string | null;
  warrantyUntil: string | null;
  acquisitionSource: string | null;
  supplier: string | null;
  purchaseUrl: string | null;
  serialNumber: string | null;
  location: string | null;
  custodianId: string | null;
  custodianName: string | null;
  financialEntryId: string | null;
  financialEntryCode: string | null;
  financialEntryTitle: string | null;
  photoUrl: string | null;
  invoiceUrl: string | null;
  invoiceName: string | null;
  createdById: string | null;
  createdByName: string | null;
  events: InventoryAssetEventDTO[];
  createdAt: string;
  updatedAt: string;
}

export interface InventorySummary {
  totalRegisteredItems: number;
  totalUnitsAcquired: number;
  acquiredValueCents: number;
  acquiredItemCount: number;
  plannedValueCents: number;
  plannedItemCount: number;
  damagedItemCount: number;
  damagedValueCents: number;
  loanedItemCount: number;
  valueByCategory: { category: string; acquiredCents: number; plannedCents: number; count: number }[];
  valueByTeam: { team: string; acquiredCents: number; plannedCents: number; count: number }[];
}

export interface InventoryDashboardData {
  assets: InventoryAssetDTO[];
  summary: InventorySummary;
  members: { id: string; name: string; area: string; teamId: number | null; active: boolean }[];
  financialEntries: { id: string; code: string; title: string; amountCents: number; occurredAt: string | null }[];
}
