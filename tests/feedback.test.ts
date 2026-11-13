import test from 'node:test';
import assert from 'node:assert/strict';
import { computeFeedbackSummary } from '../src/lib/feedback/service';
import type { FeedbackItemDTO } from '../src/lib/feedback/constants';

type FeedbackSummaryInput = Pick<
  FeedbackItemDTO,
  'scope' | 'category' | 'status' | 'validity'
>;

test('computeFeedbackSummary contabiliza corretamente triagem, bugs abertos, ideias válidas e aplicadas por alvo', () => {
  const items: FeedbackSummaryInput[] = [
    { scope: 'SISTEMA', category: 'BUG', status: 'RECEBIDA', validity: 'PENDENTE' },
    { scope: 'SITE', category: 'BUG', status: 'EM_ANDAMENTO', validity: 'VALIDA' },
    { scope: 'LABORATORIO', category: 'IDEIA', status: 'APROVADA', validity: 'VALIDA' },
    { scope: 'EQUIPE', category: 'MELHORIA', status: 'APLICADA', validity: 'VALIDA' },
    { scope: 'SISTEMA', category: 'IDEIA', status: 'ARQUIVADA', validity: 'INVALIDA_OU_DUPLICADA' },
  ];

  const summary = computeFeedbackSummary(items);
  assert.equal(summary.totalCount, 5);
  assert.equal(summary.pendingTriageCount, 1);
  assert.equal(summary.openBugsCount, 2);
  assert.equal(summary.validAcceptedCount, 2);
  assert.equal(summary.appliedCount, 1);
  assert.equal(summary.byScope.find(s => s.scope === 'SISTEMA')?.count, 2);
  assert.equal(summary.byScope.find(s => s.scope === 'EQUIPE')?.appliedCount, 1);
});
