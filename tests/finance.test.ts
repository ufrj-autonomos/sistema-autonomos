import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeFinancialSummary,
  getFinancialDashboardData,
} from '../src/lib/finance/service';
import type { FinancialEntryDTO } from '../src/lib/finance/constants';

type EntryInput = Pick<
  FinancialEntryDTO,
  'type' | 'isReimbursement' | 'category' | 'fundSource' | 'amountCents' | 'occurredAt' | 'status'
>;

test('computeFinancialSummary calcula exatamente os saldos da planilha oficial (R$ 2.433,18 livre)', () => {
  const entries: EntryInput[] = [
    // 12 Entradas (11 efetivadas Dinheiro Livre + 1 pendente Conta Coppetec)
    { type: 'ENTRADA', isReimbursement: false, category: 'Administrativo', fundSource: 'Dinheiro Livre', amountCents: 30532, occurredAt: '2026-05-09', status: 'PAGO' },
    { type: 'ENTRADA', isReimbursement: false, category: 'Inscrições', fundSource: 'Dinheiro Livre', amountCents: 192500, occurredAt: '2026-05-11', status: 'PAGO' },
    { type: 'ENTRADA', isReimbursement: false, category: 'Inscrições', fundSource: 'Dinheiro Livre', amountCents: 200000, occurredAt: '2026-05-11', status: 'PAGO' },
    { type: 'ENTRADA', isReimbursement: false, category: 'Inscrições', fundSource: 'Dinheiro Livre', amountCents: 25000, occurredAt: '2026-05-12', status: 'PAGO' },
    { type: 'ENTRADA', isReimbursement: false, category: 'Inscrições', fundSource: 'Dinheiro Livre', amountCents: 40000, occurredAt: '2026-05-13', status: 'PAGO' },
    { type: 'ENTRADA', isReimbursement: false, category: 'Inscrições', fundSource: 'Dinheiro Livre', amountCents: 20000, occurredAt: '2026-05-13', status: 'PAGO' },
    { type: 'ENTRADA', isReimbursement: false, category: 'Inscrições', fundSource: 'Dinheiro Livre', amountCents: 40000, occurredAt: '2026-05-21', status: 'PAGO' },
    { type: 'ENTRADA', isReimbursement: false, category: 'Administrativo', fundSource: 'Dinheiro Livre', amountCents: 182, occurredAt: '2026-05-22', status: 'PAGO' },
    { type: 'ENTRADA', isReimbursement: false, category: 'Inscrições', fundSource: 'Dinheiro Livre', amountCents: 20000, occurredAt: '2026-06-04', status: 'PAGO' },
    { type: 'ENTRADA', isReimbursement: false, category: 'Administrativo', fundSource: 'Dinheiro Livre', amountCents: 375000, occurredAt: '2026-06-18', status: 'PAGO' },
    { type: 'ENTRADA', isReimbursement: false, category: 'Marketing', fundSource: 'Dinheiro Livre', amountCents: 200, occurredAt: '2026-07-31', status: 'PAGO' },
    { type: 'ENTRADA', isReimbursement: false, category: 'Administrativo', fundSource: 'Conta Coppetec', amountCents: 300000, occurredAt: null, status: 'PENDENTE' },

    // 18 Saídas / Reembolsos (12 pagos + 6 aguardando reembolso)
    { type: 'SAIDA', isReimbursement: true, category: 'Logística', fundSource: 'Dinheiro Livre', amountCents: 206606, occurredAt: '2026-05-12', status: 'PAGO' },
    { type: 'SAIDA', isReimbursement: true, category: 'Logística', fundSource: 'Dinheiro Livre', amountCents: 18535, occurredAt: '2026-05-12', status: 'PAGO' },
    { type: 'SAIDA', isReimbursement: true, category: 'Logística', fundSource: 'Dinheiro Livre', amountCents: 16379, occurredAt: '2026-05-12', status: 'PAGO' },
    { type: 'SAIDA', isReimbursement: true, category: 'Mecânica', fundSource: 'Dinheiro Livre', amountCents: 4000, occurredAt: '2026-05-15', status: 'PAGO' },
    { type: 'SAIDA', isReimbursement: true, category: 'Logística', fundSource: 'Dinheiro Livre', amountCents: 69081, occurredAt: '2026-05-17', status: 'PAGO' },
    { type: 'SAIDA', isReimbursement: true, category: 'Logística', fundSource: 'Dinheiro Livre', amountCents: 8820, occurredAt: '2026-05-17', status: 'PAGO' },
    { type: 'SAIDA', isReimbursement: true, category: 'Logística', fundSource: 'Dinheiro Livre', amountCents: 50335, occurredAt: '2026-05-17', status: 'PAGO' },
    { type: 'SAIDA', isReimbursement: true, category: 'Eletrônica', fundSource: 'Dinheiro Livre', amountCents: 3100, occurredAt: '2026-07-14', status: 'AGUARDANDO_REEMBOLSO' },
    { type: 'SAIDA', isReimbursement: true, category: 'Administrativo', fundSource: 'Dinheiro Livre', amountCents: 167500, occurredAt: '2026-07-21', status: 'PAGO' },
    { type: 'SAIDA', isReimbursement: true, category: 'Administrativo', fundSource: 'Dinheiro Livre', amountCents: 160000, occurredAt: null, status: 'AGUARDANDO_REEMBOLSO' },
    { type: 'SAIDA', isReimbursement: true, category: 'Logística', fundSource: 'Dinheiro Livre', amountCents: 0, occurredAt: null, status: 'AGUARDANDO_REEMBOLSO' },
    { type: 'SAIDA', isReimbursement: true, category: 'Logística', fundSource: 'Dinheiro Livre', amountCents: 10000, occurredAt: null, status: 'AGUARDANDO_REEMBOLSO' },
    { type: 'SAIDA', isReimbursement: true, category: 'Eletrônica', fundSource: 'Dinheiro Livre', amountCents: 50000, occurredAt: null, status: 'AGUARDANDO_REEMBOLSO' },
    { type: 'SAIDA', isReimbursement: true, category: 'Eletrônica', fundSource: 'Dinheiro Livre', amountCents: 5500, occurredAt: null, status: 'AGUARDANDO_REEMBOLSO' },
    { type: 'SAIDA', isReimbursement: true, category: 'Marketing', fundSource: 'Dinheiro Livre', amountCents: 5870, occurredAt: '2026-08-05', status: 'PAGO' },
    { type: 'SAIDA', isReimbursement: true, category: 'Administrativo', fundSource: 'Dinheiro Livre', amountCents: 18990, occurredAt: '2026-09-10', status: 'PAGO' },
    { type: 'SAIDA', isReimbursement: true, category: 'Manutenção', fundSource: 'Dinheiro Livre', amountCents: 3990, occurredAt: '2026-09-16', status: 'PAGO' },
    { type: 'SAIDA', isReimbursement: true, category: 'Eletrônica', fundSource: 'Dinheiro Livre', amountCents: 129990, occurredAt: '2026-10-30', status: 'PAGO' },
  ];

  const summary = computeFinancialSummary(entries);
  assert.equal(summary.freeCashIncomeCents, 943414);
  assert.equal(summary.freeCashExpenseCents, 700096);
  assert.equal(summary.freeCashBalanceCents, 243318);
  assert.equal(summary.coppetecBalanceCents, 0);
  assert.equal(summary.coppetecPendingCents, 300000);
  assert.equal(summary.awaitingReimbursementCents, 228600);
  assert.equal(summary.awaitingReimbursementCount, 6);
  assert.ok(summary.expensesByCategory.some(c => c.category === 'Logística'));
  assert.ok(summary.monthlyCashflow.length >= 5);
});

test(
  'Banco de dados financeiro importado corresponde à planilha',
  { skip: process.env.TEST_IMPORTED_SPREADSHEETS !== '1' },
  async () => {
    const dashboard = await getFinancialDashboardData();
    assert.ok(dashboard.entries.length >= 30);
    assert.ok(dashboard.statements.length >= 1);
    assert.ok(
      dashboard.statements.some(
        s => s.fundSource === 'Dinheiro Livre' && s.referenceDate === '2026-01-31'
      )
    );
    assert.equal(
      dashboard.summary.freeCashBalanceCents,
      dashboard.summary.freeCashIncomeCents - dashboard.summary.freeCashExpenseCents
    );
    assert.ok(dashboard.summary.awaitingReimbursementCents >= 0);
  }
);
