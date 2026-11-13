'use client';

import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Boxes,
  Calendar,
  Check,
  CheckCircle2,
  Clock3,
  Download,
  ExternalLink,
  FileText,
  History,
  Image as ImageIcon,
  MapPin,
  PackagePlus,
  Search,
  ShoppingCart,
  Trash2,
  Upload,
  UserCheck,
  Wrench,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/institutional/ui/dialog';
import {
  ASSET_ACQUISITION_SOURCES,
  ASSET_AREAS,
  ASSET_CATEGORIES,
  ASSET_CONDITION_META,
  ASSET_STATUS_META,
  ASSET_TEAMS,
  ASSET_UNITS,
  formatBRL,
  formatFinanceDate,
  type AssetAcquisitionStatusValue,
  type AssetConditionValue,
  type InventoryAssetDTO,
  type InventoryDashboardData,
} from '@/lib/assets/constants';
import { cn } from '@/lib/utils';

type QuickViewTab = 'ALL' | 'ACQUIRED' | 'PLANNED' | 'DAMAGED' | 'LOANED';

const STATUS_TONE_CLASSES: Record<string, string> = {
  slate: 'border-border bg-muted/60 text-muted-foreground',
  sky: 'border-sky-500/30 bg-sky-500/10 text-sky-600 dark:text-sky-400',
  amber: 'border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400',
  emerald: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  violet: 'border-violet-500/30 bg-violet-500/10 text-violet-600 dark:text-violet-400',
  rose: 'border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400',
};

function parseBrlInputToCents(raw: string): number {
  const cleaned = raw.replace(/R\$\s?/gi, '').trim();
  if (!cleaned) return 0;
  const normalized =
    cleaned.includes(',') && cleaned.includes('.')
      ? cleaned.replace(/\./g, '').replace(',', '.')
      : cleaned.replace(',', '.');
  const num = Number(normalized);
  return Number.isFinite(num) && num >= 0 ? Math.round(num * 100) : 0;
}

function formatCentsInput(cents: number): string {
  return (cents / 100).toFixed(2).replace('.', ',');
}

export function AssetsClient({ initialData }: { initialData: InventoryDashboardData }) {
  const [data, setData] = useState<InventoryDashboardData>(initialData);
  const [viewTab, setViewTab] = useState<QuickViewTab>('ALL');
  const [teamFilter, setTeamFilter] = useState<string>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [conditionFilter, setConditionFilter] = useState<'ALL' | AssetConditionValue>('ALL');
  const [search, setSearch] = useState('');

  // Modal Create / Edit state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<InventoryAssetDTO | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadingInvoice, setUploadingInvoice] = useState(false);

  // Form fields
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<string>(ASSET_CATEGORIES[0]);
  const [team, setTeam] = useState<string>('Geral');
  const [area, setArea] = useState<string>('Geral');
  const [quantity, setQuantity] = useState<string>('1');
  const [unit, setUnit] = useState<string>('un');
  const [unitPriceBrl, setUnitPriceBrl] = useState<string>('0,00');
  const [totalOverrideBrl, setTotalOverrideBrl] = useState<string>('');
  const [acquisitionStatus, setAcquisitionStatus] =
    useState<AssetAcquisitionStatusValue>('ADQUIRIDO');
  const [condition, setCondition] = useState<AssetConditionValue>('BOM');
  const [damageNotes, setDamageNotes] = useState('');
  const [acquiredAt, setAcquiredAt] = useState('');
  const [expectedAcquisitionDate, setExpectedAcquisitionDate] = useState('');
  const [warrantyUntil, setWarrantyUntil] = useState('');
  const [acquisitionSource, setAcquisitionSource] = useState<string>('Dinheiro Livre');
  const [supplier, setSupplier] = useState('');
  const [purchaseUrl, setPurchaseUrl] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [location, setLocation] = useState('');
  const [custodianId, setCustodianId] = useState('');
  const [custodianName, setCustodianName] = useState('');
  const [financialEntryId, setFinancialEntryId] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [invoiceUrl, setInvoiceUrl] = useState('');
  const [invoiceName, setInvoiceName] = useState('');
  const [eventNote, setEventNote] = useState('');

  const computedTotalCents = useMemo(() => {
    if (totalOverrideBrl.trim()) return parseBrlInputToCents(totalOverrideBrl);
    const qty = Math.max(1, Number.parseInt(quantity || '1', 10) || 1);
    return parseBrlInputToCents(unitPriceBrl) * qty;
  }, [quantity, unitPriceBrl, totalOverrideBrl]);

  async function refreshInventory() {
    const res = await fetch('/api/patrimonio', { cache: 'no-store' });
    if (!res.ok) return;
    const json = (await res.json()) as InventoryDashboardData;
    setData(json);
    if (editingAsset) {
      const updated = json.assets.find(a => a.id === editingAsset.id) || null;
      setEditingAsset(updated);
    }
  }

  function openCreateModal(presetFuture = false) {
    setEditingAsset(null);
    setName('');
    setDescription('');
    setCategory(ASSET_CATEGORIES[0]);
    setTeam('Geral');
    setArea('Geral');
    setQuantity('1');
    setUnit('un');
    setUnitPriceBrl('0,00');
    setTotalOverrideBrl('');
    setAcquisitionStatus(presetFuture ? 'PLANEJADO' : 'ADQUIRIDO');
    setCondition(presetFuture ? 'NOVO' : 'BOM');
    setDamageNotes('');
    setAcquiredAt(presetFuture ? '' : new Date().toISOString().slice(0, 10));
    setExpectedAcquisitionDate('');
    setWarrantyUntil('');
    setAcquisitionSource('Dinheiro Livre');
    setSupplier('');
    setPurchaseUrl('');
    setSerialNumber('');
    setLocation('');
    setCustodianId('');
    setCustodianName('');
    setFinancialEntryId('');
    setPhotoUrl('');
    setInvoiceUrl('');
    setInvoiceName('');
    setEventNote('');
    setModalOpen(true);
  }

  function openEditModal(asset: InventoryAssetDTO) {
    setEditingAsset(asset);
    setName(asset.name);
    setDescription(asset.description || '');
    setCategory(asset.category);
    setTeam(asset.team);
    setArea(asset.area);
    setQuantity(String(asset.quantity));
    setUnit(asset.unit);
    setUnitPriceBrl(formatCentsInput(asset.unitPriceCents));
    const exactTotal = asset.unitPriceCents * asset.quantity;
    setTotalOverrideBrl(
      asset.totalPriceCents !== exactTotal ? formatCentsInput(asset.totalPriceCents) : ''
    );
    setAcquisitionStatus(asset.acquisitionStatus);
    setCondition(asset.condition);
    setDamageNotes(asset.damageNotes || '');
    setAcquiredAt(asset.acquiredAt || '');
    setExpectedAcquisitionDate(asset.expectedAcquisitionDate || '');
    setWarrantyUntil(asset.warrantyUntil || '');
    setAcquisitionSource(asset.acquisitionSource || 'Dinheiro Livre');
    setSupplier(asset.supplier || '');
    setPurchaseUrl(asset.purchaseUrl || '');
    setSerialNumber(asset.serialNumber || '');
    setLocation(asset.location || '');
    setCustodianId(asset.custodianId || '');
    setCustodianName(asset.custodianName || '');
    setFinancialEntryId(asset.financialEntryId || '');
    setPhotoUrl(asset.photoUrl || '');
    setInvoiceUrl(asset.invoiceUrl || '');
    setInvoiceName(asset.invoiceName || '');
    setEventNote('');
    setModalOpen(true);
  }

  async function uploadFile(file: File, kind: 'photo' | 'invoice') {
    if (kind === 'photo') setUploadingPhoto(true);
    else setUploadingInvoice(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/financeiro/upload', { method: 'POST', body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Erro ao enviar arquivo.');
      if (kind === 'photo') {
        setPhotoUrl(json.url);
        toast.success('Foto do material anexada!');
      } else {
        setInvoiceUrl(json.url);
        setInvoiceName(json.name || file.name);
        toast.success('Documento / Nota Fiscal anexado!');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Falha no upload.');
    } finally {
      if (kind === 'photo') setUploadingPhoto(false);
      else setUploadingInvoice(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Informe o nome do material.');
      return;
    }
    setSaving(true);
    try {
      const qty = Math.max(1, Number.parseInt(quantity || '1', 10) || 1);
      const unitCents = parseBrlInputToCents(unitPriceBrl);
      const totalCents = totalOverrideBrl.trim()
        ? parseBrlInputToCents(totalOverrideBrl)
        : unitCents * qty;

      const payload = {
        name: name.trim(),
        description: description.trim() || null,
        category,
        team,
        area,
        quantity: qty,
        unit,
        unitPriceCents: unitCents,
        totalPriceCents: totalCents,
        acquisitionStatus,
        condition,
        damageNotes: damageNotes.trim() || null,
        acquiredAt: acquiredAt || null,
        expectedAcquisitionDate: expectedAcquisitionDate || null,
        warrantyUntil: warrantyUntil || null,
        acquisitionSource,
        supplier: supplier.trim() || null,
        purchaseUrl: purchaseUrl.trim() || null,
        serialNumber: serialNumber.trim() || null,
        location: location.trim() || null,
        custodianId: custodianId || null,
        custodianName: custodianName.trim() || null,
        financialEntryId: financialEntryId || null,
        photoUrl: photoUrl.trim() || null,
        invoiceUrl: invoiceUrl.trim() || null,
        invoiceName: invoiceName.trim() || null,
        eventNote: eventNote.trim() || null,
      };

      const res = await fetch(
        editingAsset ? `/api/patrimonio/${editingAsset.id}` : '/api/patrimonio',
        {
          method: editingAsset ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Erro ao salvar material.');

      toast.success(
        editingAsset
          ? `${json.asset.assetTag} atualizado com sucesso.`
          : `${json.asset.assetTag} cadastrado no patrimônio.`
      );
      setModalOpen(false);
      await refreshInventory();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar item.');
    } finally {
      setSaving(false);
    }
  }

  async function handleQuickMarkAcquired(asset: InventoryAssetDTO) {
    try {
      const res = await fetch(`/api/patrimonio/${asset.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          acquisitionStatus: 'ADQUIRIDO',
          acquiredAt: asset.acquiredAt || new Date().toISOString().slice(0, 10),
          eventNote: 'Marcado como adquirido em posse da equipe',
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Erro ao atualizar status.');
      toast.success(`${asset.assetTag} marcado como adquirido!`);
      await refreshInventory();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao atualizar status.');
    }
  }

  async function handleDelete(asset: InventoryAssetDTO) {
    if (
      !window.confirm(
        `Remover "${asset.assetTag} — ${asset.name}" do patrimônio? Esta ação não pode ser desfeita.`
      )
    ) {
      return;
    }
    try {
      const res = await fetch(`/api/patrimonio/${asset.id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Erro ao remover item.');
      toast.success(`${asset.assetTag} removido do patrimônio.`);
      setModalOpen(false);
      await refreshInventory();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao remover item.');
    }
  }

  function exportCsv() {
    const headers = [
      'Codigo',
      'Nome',
      'Categoria',
      'Equipe',
      'Area',
      'Qtd',
      'Unidade',
      'Preco Unitario (R$)',
      'Valor Total (R$)',
      'Status Aquisicao',
      'Estado Fisico',
      'Data Aquisicao',
      'Previsao Aquisicao',
      'Localizacao',
      'Responsavel',
      'Fornecedor',
      'Numero de Serie',
      'Observacoes de Defeito',
    ];
    const escapeCell = (val: unknown) =>
      `"${String(val ?? '').replace(/"/g, '""').replace(/\r?\n/g, ' ')}"`;
    const rows = filteredAssets.map(a =>
      [
        a.assetTag,
        a.name,
        a.category,
        a.team,
        a.area,
        a.quantity,
        a.unit,
        (a.unitPriceCents / 100).toFixed(2).replace('.', ','),
        (a.totalPriceCents / 100).toFixed(2).replace('.', ','),
        ASSET_STATUS_META[a.acquisitionStatus].label,
        ASSET_CONDITION_META[a.condition].label,
        a.acquiredAt ? formatFinanceDate(a.acquiredAt) : '',
        a.expectedAcquisitionDate ? formatFinanceDate(a.expectedAcquisitionDate) : '',
        a.location || '',
        a.custodianName || '',
        a.supplier || '',
        a.serialNumber || '',
        a.damageNotes || '',
      ]
        .map(escapeCell)
        .join(';')
    );
    const csv = '\uFEFF' + [headers.map(escapeCell).join(';'), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `patrimonio-autonomos-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  const filteredAssets = useMemo(() => {
    const q = search.trim().toLocaleLowerCase('pt-BR');
    return data.assets.filter(item => {
      const statusMeta = ASSET_STATUS_META[item.acquisitionStatus];
      const condMeta = ASSET_CONDITION_META[item.condition];

      if (viewTab === 'ACQUIRED' && (statusMeta.isFuture || item.acquisitionStatus === 'BAIXADO')) {
        return false;
      }
      if (viewTab === 'PLANNED' && !statusMeta.isFuture) return false;
      if (
        viewTab === 'DAMAGED' &&
        (item.acquisitionStatus === 'BAIXADO' ||
          (!condMeta.isDamaged && item.acquisitionStatus !== 'MANUTENCAO'))
      ) {
        return false;
      }
      if (viewTab === 'LOANED' && item.acquisitionStatus !== 'EMPRESTADO') return false;

      if (teamFilter !== 'ALL' && item.team !== teamFilter) return false;
      if (categoryFilter !== 'ALL' && item.category !== categoryFilter) return false;
      if (conditionFilter !== 'ALL' && item.condition !== conditionFilter) return false;

      if (q) {
        const hay = [
          item.assetTag,
          item.name,
          item.description,
          item.category,
          item.team,
          item.area,
          item.location,
          item.custodianName,
          item.supplier,
          item.serialNumber,
          item.damageNotes,
        ]
          .filter(Boolean)
          .join(' ')
          .toLocaleLowerCase('pt-BR');
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [data.assets, viewTab, teamFilter, categoryFilter, conditionFilter, search]);

  const { summary } = data;
  const isFutureFormStatus = ASSET_STATUS_META[acquisitionStatus]?.isFuture;
  const isDamagedOrRepairStatus =
    ASSET_CONDITION_META[condition]?.isDamaged || acquisitionStatus === 'MANUTENCAO';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-primary">
            <Boxes className="h-3 w-3" />
            Gestão de Inventário & Equipamentos
          </span>
          <h1 className="mt-1.5 font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Patrimônio da Equipe
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Controle completo de materiais adquiridos, compras planejadas, valores pagos, estado físico, custódia e localização no laboratório.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={exportCsv}
            className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-border bg-background px-3.5 text-xs font-semibold text-foreground hover:bg-accent cursor-pointer"
          >
            <Download className="h-4 w-4 text-muted-foreground" />
            Exportar CSV
          </button>
          <button
            type="button"
            onClick={() => openCreateModal(true)}
            className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-sky-500/30 bg-sky-500/10 px-3.5 text-xs font-semibold text-sky-700 hover:bg-sky-500/15 dark:text-sky-300 cursor-pointer"
          >
            <ShoppingCart className="h-4 w-4" />
            Planejar Compra
          </button>
          <button
            type="button"
            onClick={() => openCreateModal(false)}
            className="inline-flex min-h-10 items-center gap-1.5 rounded-lg bg-primary px-4 text-xs font-semibold text-primary-foreground shadow-xs hover:bg-primary/90 cursor-pointer"
          >
            <PackagePlus className="h-4 w-4" />
            Cadastrar Material
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">Patrimônio Adquirido</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </div>
          <p className="mt-2 font-mono text-2xl font-bold text-foreground tabular-nums">
            {formatBRL(summary.acquiredValueCents)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {summary.acquiredItemCount} cadastros · {summary.totalUnitsAcquired} unidades em posse
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">Aquisições Futuras</span>
            <ShoppingCart className="h-4 w-4 text-sky-500" />
          </div>
          <p className="mt-2 font-mono text-2xl font-bold text-foreground tabular-nums">
            {formatBRL(summary.plannedValueCents)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {summary.plannedItemCount} {summary.plannedItemCount === 1 ? 'item planejado' : 'itens planejados / em cotação'}
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">Avarias & Manutenção</span>
            <AlertTriangle className="h-4 w-4 text-rose-500" />
          </div>
          <p
            className={cn(
              'mt-2 font-mono text-2xl font-bold tabular-nums',
              summary.damagedItemCount > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-foreground'
            )}
          >
            {summary.damagedItemCount} {summary.damagedItemCount === 1 ? 'item' : 'itens'}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {summary.damagedItemCount > 0
              ? `${formatBRL(summary.damagedValueCents)} em equipamentos afetados`
              : 'Nenhum equipamento estragado registrado'}
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">Sob Custódia / Emprestado</span>
            <UserCheck className="h-4 w-4 text-violet-500" />
          </div>
          <p className="mt-2 font-mono text-2xl font-bold text-foreground tabular-nums">
            {summary.loanedItemCount} {summary.loanedItemCount === 1 ? 'item' : 'itens'}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {summary.totalRegisteredItems} materiais catalogados no total
          </p>
        </div>
      </div>

      {/* Resumo por Equipe e Top Categorias */}
      {data.assets.length > 0 && (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Patrimônio por Equipe / Divisão
            </h2>
            <div className="mt-3 grid gap-2.5 sm:grid-cols-3">
              {summary.valueByTeam.map(row => (
                <div
                  key={row.team}
                  className="rounded-lg border border-border bg-muted/30 p-3 space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-foreground">{row.team}</span>
                    <span className="text-[11px] text-muted-foreground">{row.count} itens</span>
                  </div>
                  <p className="font-mono text-sm font-bold text-foreground tabular-nums">
                    {formatBRL(row.acquiredCents)}
                  </p>
                  {row.plannedCents > 0 && (
                    <p className="font-mono text-[11px] text-sky-600 dark:text-sky-400">
                      + {formatBRL(row.plannedCents)} previsto
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Principais Categorias
            </h2>
            <div className="mt-3 space-y-2">
              {summary.valueByCategory.slice(0, 4).map(cat => {
                const maxTotal = Math.max(
                  1,
                  ...summary.valueByCategory.map(c => c.acquiredCents + c.plannedCents)
                );
                const pct = Math.min(
                  100,
                  Math.round(((cat.acquiredCents + cat.plannedCents) / maxTotal) * 100)
                );
                return (
                  <div key={cat.category} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-foreground truncate">{cat.category}</span>
                      <span className="font-mono text-muted-foreground tabular-nums shrink-0 ml-2">
                        {formatBRL(cat.acquiredCents)}
                        {cat.plannedCents > 0 ? ` (+${formatBRL(cat.plannedCents)})` : ''}
                      </span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${Math.max(4, pct)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Barra de Abas + Filtros + Tabela */}
      <div className="rounded-xl border border-border bg-card overflow-hidden shadow-xs">
        <div className="border-b border-border bg-muted/35 px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5">
            {(
              [
                { id: 'ALL', label: `Todos (${data.assets.length})` },
                { id: 'ACQUIRED', label: `Adquiridos (${summary.acquiredItemCount})` },
                { id: 'PLANNED', label: `A adquirir (${summary.plannedItemCount})` },
                { id: 'DAMAGED', label: `Estragados / Manut. (${summary.damagedItemCount})` },
                { id: 'LOANED', label: `Emprestados (${summary.loanedItemCount})` },
              ] as const
            ).map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setViewTab(tab.id)}
                className={cn(
                  'min-h-9 rounded-lg px-3 text-xs font-medium transition-colors cursor-pointer',
                  viewTab === tab.id
                    ? 'bg-primary text-primary-foreground shadow-xs'
                    : 'bg-background text-muted-foreground hover:text-foreground border border-border'
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <span className="text-xs text-muted-foreground">
            Exibindo <strong className="text-foreground">{filteredAssets.length}</strong> itens
          </span>
        </div>

        <div className="border-b border-border px-4 py-3 flex flex-wrap items-center gap-2.5">
          <div className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por código PAT-, nome, local, responsável, fornecedor…"
              className="min-h-10 w-full rounded-lg border border-input bg-background pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          <select
            value={teamFilter}
            onChange={e => setTeamFilter(e.target.value)}
            className="min-h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground"
          >
            <option value="ALL">Todas as equipes</option>
            {ASSET_TEAMS.map(t => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>

          <select
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
            className="min-h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground"
          >
            <option value="ALL">Todas as categorias</option>
            {ASSET_CATEGORIES.map(c => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <select
            value={conditionFilter}
            onChange={e => setConditionFilter(e.target.value as typeof conditionFilter)}
            className="min-h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground"
          >
            <option value="ALL">Todos os estados</option>
            {(Object.keys(ASSET_CONDITION_META) as AssetConditionValue[]).map(cond => (
              <option key={cond} value={cond}>
                {ASSET_CONDITION_META[cond].label}
              </option>
            ))}
          </select>
        </div>

        {filteredAssets.length === 0 ? (
          <div className="px-6 py-12 text-center space-y-3">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <Boxes className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">
                {data.assets.length === 0
                  ? 'Nenhum material cadastrado no patrimônio ainda.'
                  : 'Nenhum material encontrado com os filtros selecionados.'}
              </p>
              <p className="text-xs text-muted-foreground">
                Cadastre equipamentos já comprados, itens que ainda serão adquiridos, valores, localização e condição física.
              </p>
            </div>
            <div className="flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => openCreateModal(false)}
                className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-primary px-3.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 cursor-pointer"
              >
                <PackagePlus className="h-3.5 w-3.5" />
                Cadastrar primeiro material
              </button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border bg-muted/40 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Item / Código</th>
                  <th className="px-4 py-3 font-medium">Categoria & Local</th>
                  <th className="px-4 py-3 font-medium">Aquisição & Data</th>
                  <th className="px-4 py-3 font-medium">Estado Físico</th>
                  <th className="px-4 py-3 font-medium text-right">Qtd & Valor</th>
                  <th className="px-4 py-3 font-medium text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredAssets.map(asset => {
                  const statusMeta = ASSET_STATUS_META[asset.acquisitionStatus];
                  const condMeta = ASSET_CONDITION_META[asset.condition];
                  const showMarkAcquired = statusMeta.isFuture;

                  return (
                    <tr
                      key={asset.id}
                      onClick={() => openEditModal(asset)}
                      className={cn(
                        'cursor-pointer transition-colors hover:bg-muted/30',
                        asset.condition === 'ESTRAGADO' && 'bg-rose-500/[0.03]'
                      )}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {asset.photoUrl ? (
                            <img
                              src={asset.photoUrl}
                              alt={asset.name}
                              className="h-10 w-10 rounded-lg border border-border object-cover shrink-0 bg-muted"
                            />
                          ) : (
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-muted/50 text-[10px] font-mono font-bold text-muted-foreground shrink-0">
                              {asset.assetTag}
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono text-[11px] font-semibold text-primary">
                                {asset.assetTag}
                              </span>
                              <span className="font-medium text-foreground truncate max-w-[240px]">
                                {asset.name}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground truncate max-w-[280px]">
                              {asset.supplier ? `${asset.supplier} · ` : ''}
                              {asset.serialNumber ? `S/N: ${asset.serialNumber} · ` : ''}
                              {asset.description || 'Sem descrição adicional'}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3 text-xs">
                        <div className="font-medium text-foreground">{asset.category}</div>
                        <div className="text-muted-foreground flex flex-wrap items-center gap-1 mt-0.5">
                          <span>{asset.team}</span>
                          {asset.location && (
                            <>
                              <span>·</span>
                              <span className="inline-flex items-center gap-0.5">
                                <MapPin className="h-3 w-3" />
                                {asset.location}
                              </span>
                            </>
                          )}
                        </div>
                      </td>

                      <td className="px-4 py-3 text-xs">
                        <span
                          className={cn(
                            'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium',
                            STATUS_TONE_CLASSES[statusMeta.tone]
                          )}
                        >
                          {statusMeta.isFuture ? (
                            <Clock3 className="h-3 w-3" />
                          ) : (
                            <CheckCircle2 className="h-3 w-3" />
                          )}
                          {statusMeta.shortLabel}
                        </span>
                        <div className="mt-1 text-muted-foreground flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {statusMeta.isFuture ? (
                            <span>
                              Prev.:{' '}
                              {asset.expectedAcquisitionDate
                                ? formatFinanceDate(asset.expectedAcquisitionDate)
                                : 'Sem data'}
                            </span>
                          ) : (
                            <span>
                              {asset.acquiredAt
                                ? formatFinanceDate(asset.acquiredAt)
                                : 'Data não informada'}
                            </span>
                          )}
                        </div>
                        {asset.custodianName && (
                          <div className="mt-0.5 text-[11px] text-violet-600 dark:text-violet-400 truncate max-w-[180px]">
                            Com: {asset.custodianName}
                          </div>
                        )}
                      </td>

                      <td className="px-4 py-3 text-xs">
                        <span
                          className={cn(
                            'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium',
                            STATUS_TONE_CLASSES[condMeta.tone]
                          )}
                        >
                          {condMeta.isDamaged && <AlertTriangle className="h-3 w-3" />}
                          {condMeta.shortLabel}
                        </span>
                        {asset.damageNotes && (
                          <p className="mt-1 text-[11px] text-rose-600 dark:text-rose-400 truncate max-w-[180px]">
                            {asset.damageNotes}
                          </p>
                        )}
                      </td>

                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <div className="font-mono font-semibold text-foreground tabular-nums">
                          {formatBRL(asset.totalPriceCents)}
                        </div>
                        <div className="text-[11px] font-mono text-muted-foreground tabular-nums">
                          {asset.quantity} {asset.unit} × {formatBRL(asset.unitPriceCents)}
                        </div>
                      </td>

                      <td
                        className="px-4 py-3 text-right whitespace-nowrap"
                        onClick={e => e.stopPropagation()}
                      >
                        <div className="inline-flex items-center gap-1.5">
                          {showMarkAcquired && (
                            <button
                              type="button"
                              onClick={() => handleQuickMarkAcquired(asset)}
                              className="inline-flex min-h-8 items-center gap-1 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2.5 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-500/20 dark:text-emerald-300 cursor-pointer"
                              title="Marcar como já adquirido hoje"
                            >
                              <Check className="h-3 w-3" />
                              Adquirido
                            </button>
                          )}
                          {asset.invoiceUrl && (
                            <a
                              href={asset.invoiceUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-accent hover:text-foreground"
                              title="Abrir Nota Fiscal / Documento"
                            >
                              <FileText className="h-3.5 w-3.5" />
                            </a>
                          )}
                          <button
                            type="button"
                            onClick={() => openEditModal(asset)}
                            className="inline-flex min-h-8 items-center rounded-lg border border-border px-2.5 text-xs font-medium text-foreground hover:bg-accent cursor-pointer"
                          >
                            Editar
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Completo de Cadastro / Edição & Histórico */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-3xl max-h-[92vh] overflow-y-auto border-border bg-card text-foreground">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2">
              {editingAsset ? (
                <>
                  <span className="font-mono text-sm text-primary">{editingAsset.assetTag}</span>
                  <span>— {editingAsset.name}</span>
                </>
              ) : (
                <span>Cadastrar Material no Patrimônio</span>
              )}
            </DialogTitle>
            <DialogDescription>
              Registre especificações técnicas, quantidade, preço pago ou estimado, status de compra, estado físico, custódia e documentos.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Seção 1: Identificação */}
            <div className="space-y-3 rounded-xl border border-border bg-muted/20 p-3.5">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                1. Identificação & Quantidade
              </h3>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">
                    Nome do material / equipamento *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Ex: Pixhawk 6X, Motor T-Motor U8 II, Osciloscópio Rigol..."
                    className="min-h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">
                    Categoria
                  </label>
                  <select
                    value={category}
                    onChange={e => setCategory(e.target.value)}
                    className="min-h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground"
                  >
                    {ASSET_CATEGORIES.map(c => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-4">
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">
                    Equipe / Divisão
                  </label>
                  <select
                    value={team}
                    onChange={e => setTeam(e.target.value)}
                    className="min-h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground"
                  >
                    {ASSET_TEAMS.map(t => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">
                    Área Técnica
                  </label>
                  <select
                    value={area}
                    onChange={e => setArea(e.target.value)}
                    className="min-h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground"
                  >
                    {ASSET_AREAS.map(a => (
                      <option key={a} value={a}>
                        {a}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">
                    Quantidade
                  </label>
                  <div className="flex gap-1.5">
                    <input
                      type="number"
                      min={1}
                      max={100000}
                      value={quantity}
                      onChange={e => setQuantity(e.target.value)}
                      className="min-h-10 w-20 rounded-lg border border-input bg-background px-2.5 text-sm font-mono text-foreground"
                    />
                    <select
                      value={unit}
                      onChange={e => setUnit(e.target.value)}
                      className="min-h-10 flex-1 rounded-lg border border-input bg-background px-2 text-sm text-foreground"
                    >
                      {ASSET_UNITS.map(u => (
                        <option key={u} value={u}>
                          {u}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">
                    Preço unitário (R$)
                  </label>
                  <input
                    type="text"
                    value={unitPriceBrl}
                    onChange={e => setUnitPriceBrl(e.target.value)}
                    placeholder="0,00"
                    className="min-h-10 w-full rounded-lg border border-input bg-background px-3 text-sm font-mono text-foreground"
                  />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3 items-end">
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">
                    Descrição / Especificações técnicas
                  </label>
                  <input
                    type="text"
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    placeholder="Modelo, voltagem, especificações, acessórios incluídos..."
                    className="min-h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">
                    Valor total ({formatBRL(computedTotalCents)})
                  </label>
                  <input
                    type="text"
                    value={totalOverrideBrl}
                    onChange={e => setTotalOverrideBrl(e.target.value)}
                    placeholder={`Auto: ${formatCentsInput(computedTotalCents)}`}
                    className="min-h-10 w-full rounded-lg border border-input bg-background px-3 text-sm font-mono text-foreground"
                  />
                </div>
              </div>
            </div>

            {/* Seção 2: Aquisição & Vínculo Financeiro */}
            <div className="space-y-3 rounded-xl border border-border bg-muted/20 p-3.5">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                2. Situação de Compra, Datas & Origem Financeira
              </h3>

              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">
                    Status de aquisição
                  </label>
                  <select
                    value={acquisitionStatus}
                    onChange={e =>
                      setAcquisitionStatus(e.target.value as AssetAcquisitionStatusValue)
                    }
                    className="min-h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground"
                  >
                    {(Object.keys(ASSET_STATUS_META) as AssetAcquisitionStatusValue[]).map(st => (
                      <option key={st} value={st}>
                        {ASSET_STATUS_META[st].label}
                      </option>
                    ))}
                  </select>
                </div>

                {!isFutureFormStatus ? (
                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">
                      Data da aquisição
                    </label>
                    <input
                      type="date"
                      value={acquiredAt}
                      onChange={e => setAcquiredAt(e.target.value)}
                      className="min-h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">
                      Previsão de compra / chegada
                    </label>
                    <input
                      type="date"
                      value={expectedAcquisitionDate}
                      onChange={e => setExpectedAcquisitionDate(e.target.value)}
                      className="min-h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground"
                    />
                  </div>
                )}

                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">
                    Origem da verba
                  </label>
                  <select
                    value={acquisitionSource}
                    onChange={e => setAcquisitionSource(e.target.value)}
                    className="min-h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground"
                  >
                    {ASSET_ACQUISITION_SOURCES.map(src => (
                      <option key={src} value={src}>
                        {src}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">
                    Fornecedor / Loja
                  </label>
                  <input
                    type="text"
                    value={supplier}
                    onChange={e => setSupplier(e.target.value)}
                    placeholder="Ex: Robocore, Mercado Livre, Mouser"
                    className="min-h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">
                    Link de compra / cotação
                  </label>
                  <input
                    type="url"
                    value={purchaseUrl}
                    onChange={e => setPurchaseUrl(e.target.value)}
                    placeholder="https://..."
                    className="min-h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">
                    Garantia válida até
                  </label>
                  <input
                    type="date"
                    value={warrantyUntil}
                    onChange={e => setWarrantyUntil(e.target.value)}
                    className="min-h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  Vincular a lançamento do Livro Caixa (opcional)
                </label>
                <select
                  value={financialEntryId}
                  onChange={e => setFinancialEntryId(e.target.value)}
                  className="min-h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground"
                >
                  <option value="">Nenhum lançamento vinculado</option>
                  {data.financialEntries.map(fe => (
                    <option key={fe.id} value={fe.id}>
                      {fe.code} — {fe.title} ({formatBRL(fe.amountCents)})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Seção 3: Condição Física, Avarias & Custódia */}
            <div className="space-y-3 rounded-xl border border-border bg-muted/20 p-3.5">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                3. Estado Físico, Localização & Responsável
              </h3>

              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">
                    Estado físico atual
                  </label>
                  <select
                    value={condition}
                    onChange={e => setCondition(e.target.value as AssetConditionValue)}
                    className="min-h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground"
                  >
                    {(Object.keys(ASSET_CONDITION_META) as AssetConditionValue[]).map(c => (
                      <option key={c} value={c}>
                        {ASSET_CONDITION_META[c].label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">
                    Localização no laboratório
                  </label>
                  <input
                    type="text"
                    value={location}
                    onChange={e => setLocation(e.target.value)}
                    placeholder="Ex: Armário A · Prateleira 2, Bancada Harpia"
                    className="min-h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">
                    Nº de série / Tombamento UFRJ
                  </label>
                  <input
                    type="text"
                    value={serialNumber}
                    onChange={e => setSerialNumber(e.target.value)}
                    placeholder="Opcional"
                    className="min-h-10 w-full rounded-lg border border-input bg-background px-3 text-sm font-mono text-foreground"
                  />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">
                    Membro responsável / Emprestado para
                  </label>
                  <select
                    value={custodianId}
                    onChange={e => {
                      const id = e.target.value;
                      setCustodianId(id);
                      const m = data.members.find(item => item.id === id);
                      if (m) setCustodianName(m.name);
                    }}
                    className="min-h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground"
                  >
                    <option value="">Sem responsável individual (no laboratório)</option>
                    {data.members.map(m => (
                      <option key={m.id} value={m.id}>
                        {m.name} ({m.area}){!m.active ? ' [Ex-membro]' : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">
                    Nome do responsável (caso externo ou livre)
                  </label>
                  <input
                    type="text"
                    value={custodianName}
                    onChange={e => setCustodianName(e.target.value)}
                    placeholder="Ex: Prof. Orientador ou laboratório parceiro"
                    className="min-h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground"
                  />
                </div>
              </div>

              <div
                className={cn(
                  'rounded-lg p-3 border',
                  isDamagedOrRepairStatus
                    ? 'border-rose-500/40 bg-rose-500/5'
                    : 'border-border bg-background/60'
                )}
              >
                <label className="mb-1 flex items-center gap-1.5 text-xs font-medium text-foreground">
                  <Wrench className="h-3.5 w-3.5 text-rose-500" />
                  Diagnóstico de defeito / estrago ou plano de manutenção
                </label>
                <textarea
                  rows={2}
                  value={damageNotes}
                  onChange={e => setDamageNotes(e.target.value)}
                  placeholder="Descreva se queimou, quebrou pino, precisa de peça de reposição ou se já foi consertado..."
                  className="w-full rounded-lg border border-input bg-background p-2.5 text-sm text-foreground"
                />
              </div>
            </div>

            {/* Seção 4: Foto & Nota Fiscal */}
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-border bg-muted/20 p-3.5 space-y-2">
                <span className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                  <ImageIcon className="h-3.5 w-3.5 text-primary" />
                  Foto do material
                </span>
                {photoUrl && (
                  <div className="flex items-center gap-2">
                    <img
                      src={photoUrl}
                      alt="Foto do item"
                      className="h-14 w-14 rounded-lg border border-border object-cover"
                    />
                    <a
                      href={photoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                    >
                      Abrir <ExternalLink className="h-3 w-3" />
                    </a>
                    <button
                      type="button"
                      onClick={() => setPhotoUrl('')}
                      className="ml-auto text-xs text-destructive hover:underline cursor-pointer"
                    >
                      Remover
                    </button>
                  </div>
                )}
                <label className="flex min-h-10 cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-dashed border-border bg-background px-3 text-xs font-medium text-muted-foreground hover:text-foreground">
                  <Upload className="h-3.5 w-3.5" />
                  {uploadingPhoto ? 'Enviando foto…' : photoUrl ? 'Trocar foto' : 'Enviar foto'}
                  <input
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    disabled={uploadingPhoto}
                    onChange={e => {
                      const f = e.target.files?.[0];
                      if (f) void uploadFile(f, 'photo');
                      e.target.value = '';
                    }}
                  />
                </label>
              </div>

              <div className="rounded-xl border border-border bg-muted/20 p-3.5 space-y-2">
                <span className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                  <FileText className="h-3.5 w-3.5 text-primary" />
                  Nota Fiscal / Orçamento (PDF ou imagem)
                </span>
                {invoiceUrl && (
                  <div className="flex items-center justify-between gap-2 rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs">
                    <a
                      href={invoiceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 truncate text-primary hover:underline"
                    >
                      <ExternalLink className="h-3 w-3 shrink-0" />
                      <span className="truncate">{invoiceName || 'Documento anexado'}</span>
                    </a>
                    <button
                      type="button"
                      onClick={() => {
                        setInvoiceUrl('');
                        setInvoiceName('');
                      }}
                      className="text-destructive hover:underline shrink-0 cursor-pointer"
                    >
                      Remover
                    </button>
                  </div>
                )}
                <label className="flex min-h-10 cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-dashed border-border bg-background px-3 text-xs font-medium text-muted-foreground hover:text-foreground">
                  <Upload className="h-3.5 w-3.5" />
                  {uploadingInvoice
                    ? 'Enviando documento…'
                    : invoiceUrl
                      ? 'Trocar documento'
                      : 'Enviar Nota Fiscal / Cotação'}
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    className="sr-only"
                    disabled={uploadingInvoice}
                    onChange={e => {
                      const f = e.target.files?.[0];
                      if (f) void uploadFile(f, 'invoice');
                      e.target.value = '';
                    }}
                  />
                </label>
              </div>
            </div>

            {editingAsset && (
              <>
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">
                    Nota para o histórico desta alteração (opcional)
                  </label>
                  <input
                    type="text"
                    value={eventNote}
                    onChange={e => setEventNote(e.target.value)}
                    placeholder="Ex: Levado para teste de voo na Ilha do Fundão / Enviado para assistência"
                    className="min-h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground"
                  />
                </div>

                {editingAsset.events.length > 0 && (
                  <div className="rounded-xl border border-border bg-muted/20 p-3.5 space-y-2">
                    <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      <History className="h-3.5 w-3.5" />
                      Histórico do Material ({editingAsset.events.length})
                    </div>
                    <div className="max-h-40 overflow-y-auto space-y-2 pr-1">
                      {editingAsset.events.map(ev => (
                        <div
                          key={ev.id}
                          className="rounded-lg border border-border bg-background/80 px-3 py-2 text-xs"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-medium text-foreground">{ev.title}</span>
                            <span className="text-[11px] font-mono text-muted-foreground shrink-0">
                              {new Date(ev.createdAt).toLocaleDateString('pt-BR')}
                            </span>
                          </div>
                          {ev.notes && <p className="mt-0.5 text-muted-foreground">{ev.notes}</p>}
                          {ev.actorName && (
                            <p className="mt-0.5 text-[11px] text-muted-foreground">
                              Por {ev.actorName}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            <DialogFooter className="flex-wrap items-center justify-between gap-2 pt-2">
              <div>
                {editingAsset && (
                  <button
                    type="button"
                    onClick={() => handleDelete(editingAsset)}
                    className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-destructive/30 px-3 text-xs font-semibold text-destructive hover:bg-destructive/10 cursor-pointer"
                  >
                    <Trash2 className="h-4 w-4" />
                    Excluir item
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="min-h-10 rounded-lg border border-border px-4 text-xs font-medium text-muted-foreground hover:bg-accent cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving || uploadingPhoto || uploadingInvoice}
                  className="inline-flex min-h-10 items-center gap-1.5 rounded-lg bg-primary px-4 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60 cursor-pointer"
                >
                  <Check className="h-4 w-4" />
                  {saving
                    ? 'Salvando…'
                    : editingAsset
                      ? 'Salvar alterações'
                      : 'Cadastrar material'}
                </button>
              </div>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
