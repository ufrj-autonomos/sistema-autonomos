import test from 'node:test';
import assert from 'node:assert/strict';
import { computeInventorySummary } from '../src/lib/assets/service';
import type { InventoryAssetDTO } from '../src/lib/assets/constants';

type SummaryInput = Pick<
  InventoryAssetDTO,
  'acquisitionStatus' | 'condition' | 'quantity' | 'totalPriceCents' | 'category' | 'team'
>;

test('computeInventorySummary agrupa corretamente patrimônio adquirido, planejado, avariado e emprestado', () => {
  const sample: SummaryInput[] = [
    {
      acquisitionStatus: 'ADQUIRIDO',
      condition: 'BOM',
      quantity: 2,
      totalPriceCents: 200000,
      category: 'Eletrônica & Embarcados',
      team: 'Harpia',
    },
    {
      acquisitionStatus: 'EMPRESTADO',
      condition: 'DESGASTADO',
      quantity: 1,
      totalPriceCents: 50000,
      category: 'Ferramentas',
      team: 'Geral',
    },
    {
      acquisitionStatus: 'MANUTENCAO',
      condition: 'DEFEITO_PARCIAL',
      quantity: 1,
      totalPriceCents: 30000,
      category: 'Sensores & Câmeras',
      team: 'Nautilus',
    },
    {
      acquisitionStatus: 'ADQUIRIDO',
      condition: 'ESTRAGADO',
      quantity: 3,
      totalPriceCents: 45000,
      category: 'Baterias & Energia',
      team: 'Harpia',
    },
    {
      acquisitionStatus: 'PLANEJADO',
      condition: 'NOVO',
      quantity: 4,
      totalPriceCents: 120000,
      category: 'Propulsão',
      team: 'Nautilus',
    },
    {
      acquisitionStatus: 'COMPRADO_AGUARDANDO',
      condition: 'NOVO',
      quantity: 1,
      totalPriceCents: 80000,
      category: 'Propulsão',
      team: 'Harpia',
    },
    {
      acquisitionStatus: 'BAIXADO',
      condition: 'ESTRAGADO',
      quantity: 1,
      totalPriceCents: 99999,
      category: 'Outros',
      team: 'Geral',
    },
  ];

  const summary = computeInventorySummary(sample);
  assert.equal(summary.totalRegisteredItems, 7);
  // Adquiridos (não futuros, não baixados): 200000 + 50000 + 30000 + 45000 = 325000; qtd 2+1+1+3 = 7
  assert.equal(summary.acquiredItemCount, 4);
  assert.equal(summary.totalUnitsAcquired, 7);
  assert.equal(summary.acquiredValueCents, 325000);
  // Planejados (PLANEJADO + COMPRADO_AGUARDANDO): 120000 + 80000 = 200000
  assert.equal(summary.plannedItemCount, 2);
  assert.equal(summary.plannedValueCents, 200000);
  // Avariados/Manutenção (exclui BAIXADO): MANUTENCAO/DEFEITO_PARCIAL + ADQUIRIDO/ESTRAGADO
  assert.equal(summary.damagedItemCount, 2);
  assert.equal(summary.damagedValueCents, 75000);
  // Emprestados
  assert.equal(summary.loanedItemCount, 1);
  assert.ok(summary.valueByTeam.some(t => t.team === 'Harpia'));
  assert.ok(summary.valueByCategory.some(c => c.category === 'Propulsão'));
});
