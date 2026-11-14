import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeFeedbackSummary,
  getFeedbackCardBorderClasses,
  inferDefaultTargetTeam,
} from '../src/lib/feedback/service';
import type { FeedbackItemDTO } from '../src/lib/feedback/constants';

type FeedbackSummaryInput = Pick<
  FeedbackItemDTO,
  'scope' | 'category' | 'status' | 'validity'
> & { targetTeam?: FeedbackItemDTO['targetTeam'] };

test('computeFeedbackSummary contabiliza corretamente triagem, bugs abertos, ideias válidas, alvos e times responsáveis', () => {
  const items: FeedbackSummaryInput[] = [
    { scope: 'SISTEMA', category: 'BUG', status: 'RECEBIDA', validity: 'PENDENTE', targetTeam: 'TECH' },
    { scope: 'SITE', category: 'BUG', status: 'EM_ANDAMENTO', validity: 'VALIDA', targetTeam: 'TECH' },
    { scope: 'LABORATORIO', category: 'IDEIA', status: 'APROVADA', validity: 'VALIDA', targetTeam: 'MANAGEMENT' },
    { scope: 'EQUIPE', category: 'MELHORIA', status: 'APLICADA', validity: 'VALIDA', targetTeam: 'MANAGEMENT' },
    { scope: 'SISTEMA', category: 'IDEIA', status: 'ARQUIVADA', validity: 'INVALIDA_OU_DUPLICADA', targetTeam: 'TECH' },
  ];

  const summary = computeFeedbackSummary(items);
  assert.equal(summary.totalCount, 5);
  assert.equal(summary.pendingTriageCount, 1);
  assert.equal(summary.openBugsCount, 2);
  assert.equal(summary.validAcceptedCount, 2);
  assert.equal(summary.appliedCount, 1);
  assert.equal(summary.byScope.find(s => s.scope === 'SISTEMA')?.count, 2);
  assert.equal(summary.byScope.find(s => s.scope === 'EQUIPE')?.appliedCount, 1);
  assert.equal(summary.byTargetTeam?.find(t => t.targetTeam === 'TECH')?.openCount, 2);
  assert.equal(summary.byTargetTeam?.find(t => t.targetTeam === 'MANAGEMENT')?.openCount, 1);
});

test('inferDefaultTargetTeam direciona Sistema/Site para Tecnologia e Lab/Equipe para Gestão', () => {
  assert.equal(inferDefaultTargetTeam('SISTEMA'), 'TECH');
  assert.equal(inferDefaultTargetTeam('SITE'), 'TECH');
  assert.equal(inferDefaultTargetTeam('LABORATORIO'), 'MANAGEMENT');
  assert.equal(inferDefaultTargetTeam('EQUIPE'), 'MANAGEMENT');
});

test('getFeedbackCardBorderClasses destaca cards válidos por categoria e prioridade', () => {
  const critBug = getFeedbackCardBorderClasses({
    validity: 'VALIDA',
    category: 'BUG',
    priority: 'CRITICA',
  });
  assert.match(critBug, /border-rose-500/);
  assert.match(critBug, /border-l-red-600/);

  const highIdea = getFeedbackCardBorderClasses({
    validity: 'VALIDA',
    category: 'IDEIA',
    priority: 'ALTA',
  });
  assert.match(highIdea, /border-violet-500/);
  assert.match(highIdea, /border-l-orange-500/);

  const pendingItem = getFeedbackCardBorderClasses({
    validity: 'PENDENTE',
    category: 'BUG',
    priority: 'CRITICA',
  });
  assert.equal(pendingItem, 'border border-border');
});
