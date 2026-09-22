import test from 'node:test';
import assert from 'node:assert/strict';

import {
  calculateNextDueAt,
  deriveContactDueState,
  deriveDueState,
  formatDueLabel,
  formatDaysSinceContact,
  getDaysUntilBirthday,
} from '../lib/dates.ts';

const NOW = new Date('2026-09-18T12:00:00.000Z');

test('calculateNextDueAt anchors cadence to the last interaction', () => {
  assert.equal(calculateNextDueAt('2026-09-01T08:30:00.000Z', 14), '2026-09-15T08:30:00.000Z');
});

test('deriveDueState classifies calendar-day boundaries', () => {
  assert.equal(deriveDueState(null, NOW), 'upcoming');
  assert.equal(deriveDueState('2026-09-17T23:59:59.000Z', NOW), 'overdue');
  assert.equal(deriveDueState('2026-09-18T00:00:00.000Z', NOW), 'due');
  assert.equal(deriveDueState('2026-09-19T00:00:00.000Z', NOW), 'upcoming');
});

test('deriveContactDueState suppresses paused and archived contacts and honors later snoozes', () => {
  assert.equal(deriveContactDueState('2026-09-17T09:00:00.000Z', null, true, false, NOW), 'upcoming');
  assert.equal(deriveContactDueState('2026-09-17T09:00:00.000Z', null, false, true, NOW), 'upcoming');
  assert.equal(
    deriveContactDueState('2026-09-17T09:00:00.000Z', '2026-09-20T09:00:00.000Z', false, false, NOW),
    'upcoming',
  );
});

test('date labels preserve null, today, future, and overdue wording', () => {
  assert.equal(formatDueLabel(null, NOW), 'No due date');
  assert.equal(formatDueLabel('2026-09-17T12:00:00.000Z', NOW), '1 day overdue');
  assert.equal(formatDueLabel('2026-09-18T12:00:00.000Z', NOW), 'Due today');
  assert.equal(formatDueLabel('2026-09-19T12:00:00.000Z', NOW), 'Due tomorrow');
  assert.equal(formatDaysSinceContact(null, NOW), 'No interactions yet');
  assert.equal(formatDaysSinceContact('2026-09-18T01:00:00.000Z', NOW), 'Contacted today');
});

test('birthday countdown accepts yearless values and rejects invalid dates', () => {
  assert.equal(getDaysUntilBirthday('9/18', NOW), 0);
  assert.equal(getDaysUntilBirthday('September 19', NOW), 1);
  assert.equal(getDaysUntilBirthday('2026-02-30', NOW), null);
});
