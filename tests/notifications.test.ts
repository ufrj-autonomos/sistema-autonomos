import test from 'node:test';
import assert from 'node:assert/strict';
import { NOTIFICATION_CATEGORIES } from '../src/lib/notifications-meta';

test('NOTIFICATION_CATEGORIES defines all expected automatic triggers cleanly', () => {
  const keys = Object.keys(NOTIFICATION_CATEGORIES);
  assert.ok(keys.includes('FEEDBACK_REPLY'));
  assert.ok(keys.includes('FEEDBACK_TRIAGE'));
  assert.ok(keys.includes('FEEDBACK_NEW'));
  assert.ok(keys.includes('DISCIPLINARY'));
  assert.ok(keys.includes('ATTENDANCE_ALERT'));
  assert.ok(keys.includes('ATTENDANCE_JUSTIFICATION'));
  assert.ok(keys.includes('REIMBURSEMENT'));
  assert.ok(keys.includes('PROFILE_OR_EMAIL_CHANGE'));
  assert.ok(keys.includes('SYSTEM_ANNOUNCEMENT'));

  for (const key of keys) {
    const meta = NOTIFICATION_CATEGORIES[key as keyof typeof NOTIFICATION_CATEGORIES];
    assert.equal(meta.key, key);
    assert.ok(meta.label.length > 3);
    assert.ok(meta.description.length > 10);
  }
});
