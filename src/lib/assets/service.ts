import { prisma } from '@/lib/prisma';
import { hasManagementAccess } from '@/lib/access-policy';
import type { SafeUser } from '@/lib/session';
import {
  ASSET_CONDITION_META,
  ASSET_STATUS_META,
  type AssetAcquisitionStatusValue,
  type AssetConditionValue,
  type InventoryAssetDTO,
  type InventoryAssetEventDTO,
  type InventoryDashboardData,
  type InventorySummary,
} from './constants';

export * from './constants';

export class AssetServiceError extends Error {
  constructor(
    message: string,
    public status: number = 400
  ) {
    super(message);
  }
}

function serializeEvent(ev: {
  id: string;
  assetId: string;
  eventType: string;
  title: string;
  notes: string | null;
  actorId: string | null;
  actorName: string | null;
  actor: { name: string } | null;
  createdAt: Date;
}): InventoryAssetEventDTO {
  return {
    id: ev.id,
    assetId: ev.assetId,
    eventType: ev.eventType,
    title: ev.title,
    notes: ev.notes,
    actorId: ev.actorId,
    actorName: ev.actor?.name || ev.actorName,
    createdAt: ev.createdAt.toISOString(),
  };
}

function serializeAsset(row: {
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
  acquisitionStatus: string;
  condition: string;
  damageNotes: string | null;
  acquiredAt: Date | null;
  expectedAcquisitionDate: Date | null;
  warrantyUntil: Date | null;
  acquisitionSource: string | null;
  supplier: string | null;
  purchaseUrl: string | null;
  serialNumber: string | null;
  location: string | null;
  custodianId: string | null;
  custodian: { name: string } | null;
  custodianName: string | null;
  financialEntryId: string | null;
  financialEntry: { code: string; title: string } | null;
  photoUrl: string | null;
  invoiceUrl: string | null;
  invoiceName: string | null;
  createdById: string | null;
  createdBy: { name: string } | null;
  events: Array<{
    id: string;
    assetId: string;
    eventType: string;
    title: string;
    notes: string | null;
    actorId: string | null;
    actorName: string | null;
    actor: { name: string } | null;
    createdAt: Date;
  }>;
  createdAt: Date;
  updatedAt: Date;
}): InventoryAssetDTO {
  return {
    id: row.id,
    assetTag: row.assetTag,
    name: row.name,
    description: row.description,
    category: row.category,
    team: row.team,
    area: row.area,
    quantity: row.quantity,
    unit: row.unit,
    unitPriceCents: row.unitPriceCents,
    totalPriceCents: row.totalPriceCents,
    acquisitionStatus: row.acquisitionStatus as AssetAcquisitionStatusValue,
    condition: row.condition as AssetConditionValue,
    damageNotes: row.damageNotes,
    acquiredAt: row.acquiredAt ? row.acquiredAt.toISOString().slice(0, 10) : null,
    expectedAcquisitionDate: row.expectedAcquisitionDate
      ? row.expectedAcquisitionDate.toISOString().slice(0, 10)
      : null,
    warrantyUntil: row.warrantyUntil ? row.warrantyUntil.toISOString().slice(0, 10) : null,
    acquisitionSource: row.acquisitionSource,
    supplier: row.supplier,
    purchaseUrl: row.purchaseUrl,
    serialNumber: row.serialNumber,
    location: row.location,
    custodianId: row.custodianId,
    custodianName: row.custodian?.name || row.custodianName,
    financialEntryId: row.financialEntryId,
    financialEntryCode: row.financialEntry?.code || null,
    financialEntryTitle: row.financialEntry?.title || null,
    photoUrl: row.photoUrl,
    invoiceUrl: row.invoiceUrl,
    invoiceName: row.invoiceName,
    createdById: row.createdById,
    createdByName: row.createdBy?.name || null,
    events: row.events.map(serializeEvent),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function computeInventorySummary(
  assets: Array<
    Pick<
      InventoryAssetDTO,
      'acquisitionStatus' | 'condition' | 'quantity' | 'totalPriceCents' | 'category' | 'team'
    >
  >
): InventorySummary {
  let totalUnitsAcquired = 0;
  let acquiredValueCents = 0;
  let acquiredItemCount = 0;
  let plannedValueCents = 0;
  let plannedItemCount = 0;
  let damagedItemCount = 0;
  let damagedValueCents = 0;
  let loanedItemCount = 0;

  const categoryMap = new Map<string, { acquiredCents: number; plannedCents: number; count: number }>();
  const teamMap = new Map<string, { acquiredCents: number; plannedCents: number; count: number }>();

  for (const item of assets) {
    const statusMeta = ASSET_STATUS_META[item.acquisitionStatus];
    const condMeta = ASSET_CONDITION_META[item.condition];
    const isFuture = statusMeta ? statusMeta.isFuture : false;

    const catBucket = categoryMap.get(item.category) || { acquiredCents: 0, plannedCents: 0, count: 0 };
    catBucket.count += 1;

    const teamBucket = teamMap.get(item.team) || { acquiredCents: 0, plannedCents: 0, count: 0 };
    teamBucket.count += 1;

    if (isFuture) {
      plannedItemCount += 1;
      plannedValueCents += item.totalPriceCents;
      catBucket.plannedCents += item.totalPriceCents;
      teamBucket.plannedCents += item.totalPriceCents;
    } else if (item.acquisitionStatus !== 'BAIXADO') {
      acquiredItemCount += 1;
      totalUnitsAcquired += item.quantity;
      acquiredValueCents += item.totalPriceCents;
      catBucket.acquiredCents += item.totalPriceCents;
      teamBucket.acquiredCents += item.totalPriceCents;
    }

    if (item.acquisitionStatus === 'EMPRESTADO') {
      loanedItemCount += 1;
    }

    if (
      item.acquisitionStatus !== 'BAIXADO' &&
      ((condMeta && condMeta.isDamaged) || item.acquisitionStatus === 'MANUTENCAO')
    ) {
      damagedItemCount += 1;
      damagedValueCents += item.totalPriceCents;
    }

    categoryMap.set(item.category, catBucket);
    teamMap.set(item.team, teamBucket);
  }

  const valueByCategory = Array.from(categoryMap.entries())
    .map(([category, vals]) => ({ category, ...vals }))
    .sort((a, b) => b.acquiredCents + b.plannedCents - (a.acquiredCents + a.plannedCents));

  const valueByTeam = Array.from(teamMap.entries())
    .map(([team, vals]) => ({ team, ...vals }))
    .sort((a, b) => b.acquiredCents + b.plannedCents - (a.acquiredCents + a.plannedCents));

  return {
    totalRegisteredItems: assets.length,
    totalUnitsAcquired,
    acquiredValueCents,
    acquiredItemCount,
    plannedValueCents,
    plannedItemCount,
    damagedItemCount,
    damagedValueCents,
    loanedItemCount,
    valueByCategory,
    valueByTeam,
  };
}

function parseOptionalDate(value: unknown, fieldLabel: string): Date | null {
  if (value === null || value === undefined || String(value).trim() === '') return null;
  const raw = String(value).trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    throw new AssetServiceError(`${fieldLabel} deve estar no formato AAAA-MM-DD.`);
  }
  const date = new Date(`${raw}T12:00:00.000Z`);
  if (Number.isNaN(date.getTime())) {
    throw new AssetServiceError(`${fieldLabel} inválida.`);
  }
  return date;
}

function parseNonNegativeCents(value: unknown, fieldLabel: string): number {
  if (value === null || value === undefined || value === '') return 0;
  if (typeof value === 'number' && Number.isFinite(value)) {
    if (value < 0) throw new AssetServiceError(`${fieldLabel} não pode ser negativo.`);
    return Math.round(value);
  }
  const cleaned = String(value)
    .replace(/R\$\s?/gi, '')
    .trim();
  const normalized =
    cleaned.includes(',') && cleaned.includes('.')
      ? cleaned.replace(/\./g, '').replace(',', '.')
      : cleaned.replace(',', '.');
  const num = Number(normalized);
  if (!Number.isFinite(num) || num < 0) {
    throw new AssetServiceError(`${fieldLabel} inválido.`);
  }
  return Math.round(num * 100);
}

function parsePositiveInt(value: unknown, fallback = 1): number {
  if (value === null || value === undefined || value === '') return fallback;
  const num = Number(value);
  if (!Number.isInteger(num) || num < 1 || num > 100000) {
    throw new AssetServiceError('Quantidade deve ser um número inteiro positivo.');
  }
  return num;
}

function requireManagement(actor: SafeUser) {
  if (!hasManagementAccess(actor.role)) {
    throw new AssetServiceError('Acesso restrito à gestão/coordenação.', 403);
  }
}

async function generateNextAssetTag(): Promise<string> {
  const existing = await prisma.inventoryAsset.findMany({
    select: { assetTag: true },
  });
  let maxNum = 0;
  for (const row of existing) {
    const match = row.assetTag.match(/^PAT-(\d+)$/i);
    if (match) {
      const n = Number(match[1]);
      if (Number.isFinite(n) && n > maxNum) maxNum = n;
    }
  }
  return `PAT-${String(maxNum + 1).padStart(3, '0')}`;
}

export async function getInventoryDashboardData(): Promise<InventoryDashboardData> {
  const [rows, members, financialEntries] = await Promise.all([
    prisma.inventoryAsset.findMany({
      include: {
        custodian: { select: { name: true } },
        financialEntry: { select: { code: true, title: true } },
        createdBy: { select: { name: true } },
        events: {
          include: { actor: { select: { name: true } } },
          orderBy: { createdAt: 'desc' },
          take: 25,
        },
      },
      orderBy: [{ createdAt: 'desc' }],
    }),
    prisma.member.findMany({
      where: { status: 'APPROVED' },
      select: { id: true, name: true, area: true, teamId: true, active: true },
      orderBy: [{ active: 'desc' }, { name: 'asc' }],
    }),
    prisma.financialEntry.findMany({
      where: { type: 'SAIDA' },
      select: { id: true, code: true, title: true, amountCents: true, occurredAt: true },
      orderBy: [{ occurredAt: 'desc' }, { createdAt: 'desc' }],
      take: 100,
    }),
  ]);

  const assets = rows.map(serializeAsset);
  return {
    assets,
    summary: computeInventorySummary(assets),
    members,
    financialEntries: financialEntries.map(f => ({
      id: f.id,
      code: f.code,
      title: f.title,
      amountCents: f.amountCents,
      occurredAt: f.occurredAt ? f.occurredAt.toISOString().slice(0, 10) : null,
    })),
  };
}

export interface AssetCreateInput {
  name?: string;
  description?: string | null;
  category?: string;
  team?: string;
  area?: string;
  quantity?: number;
  unit?: string;
  unitPriceCents?: number;
  unitPriceBrl?: string | number;
  totalPriceCents?: number;
  acquisitionStatus?: AssetAcquisitionStatusValue;
  condition?: AssetConditionValue;
  damageNotes?: string | null;
  acquiredAt?: string | null;
  expectedAcquisitionDate?: string | null;
  warrantyUntil?: string | null;
  acquisitionSource?: string | null;
  supplier?: string | null;
  purchaseUrl?: string | null;
  serialNumber?: string | null;
  location?: string | null;
  custodianId?: string | null;
  custodianName?: string | null;
  financialEntryId?: string | null;
  photoUrl?: string | null;
  invoiceUrl?: string | null;
  invoiceName?: string | null;
}

export async function createInventoryAsset(actor: SafeUser, input: AssetCreateInput) {
  requireManagement(actor);

  const name = (input.name || '').trim();
  if (!name) {
    throw new AssetServiceError('Informe o nome do material ou equipamento.');
  }

  const acquisitionStatus = (input.acquisitionStatus || 'ADQUIRIDO') as AssetAcquisitionStatusValue;
  if (!(acquisitionStatus in ASSET_STATUS_META)) {
    throw new AssetServiceError('Status de aquisição inválido.');
  }

  const condition = (input.condition || 'BOM') as AssetConditionValue;
  if (!(condition in ASSET_CONDITION_META)) {
    throw new AssetServiceError('Condição física inválida.');
  }

  const quantity = parsePositiveInt(input.quantity, 1);
  const unitPriceCents =
    typeof input.unitPriceCents === 'number'
      ? parseNonNegativeCents(input.unitPriceCents, 'Preço unitário')
      : parseNonNegativeCents(input.unitPriceBrl, 'Preço unitário');
  const totalPriceCents =
    typeof input.totalPriceCents === 'number' && input.totalPriceCents >= 0
      ? Math.round(input.totalPriceCents)
      : unitPriceCents * quantity;

  const acquiredAt = parseOptionalDate(input.acquiredAt, 'Data de aquisição');
  const expectedAcquisitionDate = parseOptionalDate(
    input.expectedAcquisitionDate,
    'Previsão de aquisição'
  );
  const warrantyUntil = parseOptionalDate(input.warrantyUntil, 'Garantia');

  let custodianId: string | null = input.custodianId?.trim() || null;
  let custodianName: string | null = input.custodianName?.trim() || null;
  if (custodianId) {
    const m = await prisma.member.findUnique({
      where: { id: custodianId },
      select: { id: true, name: true },
    });
    if (!m) {
      custodianId = null;
    } else if (!custodianName) {
      custodianName = m.name;
    }
  }

  const assetTag = await generateNextAssetTag();
  const statusLabel = ASSET_STATUS_META[acquisitionStatus].shortLabel;
  const conditionLabel = ASSET_CONDITION_META[condition].shortLabel;

  const created = await prisma.inventoryAsset.create({
    data: {
      assetTag,
      name,
      description: input.description?.trim() || null,
      category: input.category?.trim() || 'Eletrônica & Embarcados',
      team: input.team?.trim() || 'Geral',
      area: input.area?.trim() || 'Geral',
      quantity,
      unit: input.unit?.trim() || 'un',
      unitPriceCents,
      totalPriceCents,
      acquisitionStatus,
      condition,
      damageNotes: input.damageNotes?.trim() || null,
      acquiredAt,
      expectedAcquisitionDate,
      warrantyUntil,
      acquisitionSource: input.acquisitionSource?.trim() || 'Dinheiro Livre',
      supplier: input.supplier?.trim() || null,
      purchaseUrl: input.purchaseUrl?.trim() || null,
      serialNumber: input.serialNumber?.trim() || null,
      location: input.location?.trim() || null,
      custodianId,
      custodianName,
      financialEntryId: input.financialEntryId?.trim() || null,
      photoUrl: input.photoUrl?.trim() || null,
      invoiceUrl: input.invoiceUrl?.trim() || null,
      invoiceName: input.invoiceName?.trim() || null,
      createdById: actor.id,
      updatedById: actor.id,
      events: {
        create: {
          eventType: 'CRIADO',
          title: `Cadastrado no patrimônio (${statusLabel} · ${conditionLabel})`,
          notes: input.damageNotes?.trim() || input.description?.trim() || null,
          actorId: actor.id,
          actorName: actor.name,
        },
      },
    },
    include: {
      custodian: { select: { name: true } },
      financialEntry: { select: { code: true, title: true } },
      createdBy: { select: { name: true } },
      events: {
        include: { actor: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  return serializeAsset(created);
}

export async function updateInventoryAsset(
  actor: SafeUser,
  id: string,
  input: AssetCreateInput & { eventNote?: string | null }
) {
  requireManagement(actor);

  const existing = await prisma.inventoryAsset.findUnique({ where: { id } });
  if (!existing) {
    throw new AssetServiceError('Item de patrimônio não encontrado.', 404);
  }

  const nextStatus = (input.acquisitionStatus || existing.acquisitionStatus) as AssetAcquisitionStatusValue;
  if (!(nextStatus in ASSET_STATUS_META)) {
    throw new AssetServiceError('Status de aquisição inválido.');
  }

  const nextCondition = (input.condition || existing.condition) as AssetConditionValue;
  if (!(nextCondition in ASSET_CONDITION_META)) {
    throw new AssetServiceError('Condição física inválida.');
  }

  const nextQty =
    input.quantity !== undefined ? parsePositiveInt(input.quantity, existing.quantity) : existing.quantity;
  const nextUnitPrice =
    input.unitPriceCents !== undefined
      ? parseNonNegativeCents(input.unitPriceCents, 'Preço unitário')
      : input.unitPriceBrl !== undefined
        ? parseNonNegativeCents(input.unitPriceBrl, 'Preço unitário')
        : existing.unitPriceCents;
  const nextTotalPrice =
    input.totalPriceCents !== undefined
      ? parseNonNegativeCents(input.totalPriceCents, 'Valor total')
      : nextUnitPrice * nextQty;

  const acquiredAt =
    input.acquiredAt !== undefined
      ? parseOptionalDate(input.acquiredAt, 'Data de aquisição')
      : existing.acquiredAt;
  const expectedAcquisitionDate =
    input.expectedAcquisitionDate !== undefined
      ? parseOptionalDate(input.expectedAcquisitionDate, 'Previsão de aquisição')
      : existing.expectedAcquisitionDate;
  const warrantyUntil =
    input.warrantyUntil !== undefined
      ? parseOptionalDate(input.warrantyUntil, 'Garantia')
      : existing.warrantyUntil;

  let nextCustodianId =
    input.custodianId !== undefined ? input.custodianId?.trim() || null : existing.custodianId;
  let nextCustodianName =
    input.custodianName !== undefined ? input.custodianName?.trim() || null : existing.custodianName;

  if (nextCustodianId && nextCustodianId !== existing.custodianId) {
    const member = await prisma.member.findUnique({
      where: { id: nextCustodianId },
      select: { id: true, name: true },
    });
    if (!member) {
      nextCustodianId = null;
    } else if (!input.custodianName?.trim()) {
      nextCustodianName = member.name;
    }
  } else if (input.custodianId === '' || input.custodianId === null) {
    nextCustodianId = null;
    if (!input.custodianName?.trim()) nextCustodianName = null;
  }

  const eventsToCreate: Array<{
    eventType: string;
    title: string;
    notes: string | null;
    actorId: string;
    actorName: string;
  }> = [];

  if (nextStatus !== existing.acquisitionStatus) {
    eventsToCreate.push({
      eventType: 'STATUS_ALTERADO',
      title: `Status alterado: ${ASSET_STATUS_META[existing.acquisitionStatus as AssetAcquisitionStatusValue]?.shortLabel || existing.acquisitionStatus} → ${ASSET_STATUS_META[nextStatus].shortLabel}`,
      notes: input.eventNote?.trim() || null,
      actorId: actor.id,
      actorName: actor.name,
    });
  }

  if (nextCondition !== existing.condition) {
    eventsToCreate.push({
      eventType: 'CONDICAO_ALTERADA',
      title: `Condição alterada: ${ASSET_CONDITION_META[existing.condition as AssetConditionValue]?.shortLabel || existing.condition} → ${ASSET_CONDITION_META[nextCondition].shortLabel}`,
      notes: input.damageNotes?.trim() || input.eventNote?.trim() || null,
      actorId: actor.id,
      actorName: actor.name,
    });
  }

  if (nextCustodianId !== existing.custodianId || nextCustodianName !== existing.custodianName) {
    eventsToCreate.push({
      eventType: 'EMPRESTIMO',
      title: nextCustodianName
        ? `Responsável definido: ${nextCustodianName}`
        : 'Responsável/empréstimo removido (retornou ao lab)',
      notes: input.location?.trim() || input.eventNote?.trim() || null,
      actorId: actor.id,
      actorName: actor.name,
    });
  }

  if (eventsToCreate.length === 0) {
    eventsToCreate.push({
      eventType: 'EDICAO',
      title: 'Dados do patrimônio atualizados',
      notes: input.eventNote?.trim() || null,
      actorId: actor.id,
      actorName: actor.name,
    });
  }

  const updated = await prisma.inventoryAsset.update({
    where: { id },
    data: {
      name: input.name !== undefined ? input.name.trim() || existing.name : existing.name,
      description:
        input.description !== undefined ? input.description?.trim() || null : existing.description,
      category: input.category !== undefined ? input.category.trim() : existing.category,
      team: input.team !== undefined ? input.team.trim() : existing.team,
      area: input.area !== undefined ? input.area.trim() : existing.area,
      quantity: nextQty,
      unit: input.unit !== undefined ? input.unit.trim() || 'un' : existing.unit,
      unitPriceCents: nextUnitPrice,
      totalPriceCents: nextTotalPrice,
      acquisitionStatus: nextStatus,
      condition: nextCondition,
      damageNotes:
        input.damageNotes !== undefined ? input.damageNotes?.trim() || null : existing.damageNotes,
      acquiredAt,
      expectedAcquisitionDate,
      warrantyUntil,
      acquisitionSource:
        input.acquisitionSource !== undefined
          ? input.acquisitionSource?.trim() || null
          : existing.acquisitionSource,
      supplier: input.supplier !== undefined ? input.supplier?.trim() || null : existing.supplier,
      purchaseUrl:
        input.purchaseUrl !== undefined ? input.purchaseUrl?.trim() || null : existing.purchaseUrl,
      serialNumber:
        input.serialNumber !== undefined ? input.serialNumber?.trim() || null : existing.serialNumber,
      location: input.location !== undefined ? input.location?.trim() || null : existing.location,
      custodianId: nextCustodianId,
      custodianName: nextCustodianName,
      financialEntryId:
        input.financialEntryId !== undefined
          ? input.financialEntryId?.trim() || null
          : existing.financialEntryId,
      photoUrl: input.photoUrl !== undefined ? input.photoUrl?.trim() || null : existing.photoUrl,
      invoiceUrl:
        input.invoiceUrl !== undefined ? input.invoiceUrl?.trim() || null : existing.invoiceUrl,
      invoiceName:
        input.invoiceName !== undefined ? input.invoiceName?.trim() || null : existing.invoiceName,
      updatedById: actor.id,
      events: {
        create: eventsToCreate,
      },
    },
    include: {
      custodian: { select: { name: true } },
      financialEntry: { select: { code: true, title: true } },
      createdBy: { select: { name: true } },
      events: {
        include: { actor: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
        take: 25,
      },
    },
  });

  return serializeAsset(updated);
}

export async function deleteInventoryAsset(actor: SafeUser, id: string) {
  requireManagement(actor);
  const existing = await prisma.inventoryAsset.findUnique({ where: { id } });
  if (!existing) {
    throw new AssetServiceError('Item de patrimônio não encontrado.', 404);
  }
  await prisma.inventoryAsset.delete({ where: { id } });
  return { id, assetTag: existing.assetTag };
}
