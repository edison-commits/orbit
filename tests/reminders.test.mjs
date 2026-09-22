import test from 'node:test';
import assert from 'node:assert/strict';

import { createSnoozedUntil, getEffectiveDueAt, getReminderTriggerAt } from '../lib/reminders.ts';

const NOW = new Date('2026-09-18T12:00:00.000Z');

test('getEffectiveDueAt returns the later due or snooze boundary', () => {
  assert.equal(getEffectiveDueAt(null, null), null);
  assert.equal(getEffectiveDueAt('2026-09-19T09:00:00.000Z', null), '2026-09-19T09:00:00.000Z');
  assert.equal(getEffectiveDueAt(null, '2026-09-20T09:00:00.000Z'), '2026-09-20T09:00:00.000Z');
  assert.equal(
    getEffectiveDueAt('2026-09-19T09:00:00.000Z', '2026-09-20T09:00:00.000Z'),
    '2026-09-20T09:00:00.000Z',
  );
});

test('createSnoozedUntil adds whole calendar days', () => {
  assert.equal(createSnoozedUntil(3, NOW), '2026-09-21T12:00:00.000Z');
});

test('getReminderTriggerAt schedules future due dates at 9am', () => {
  assert.equal(getReminderTriggerAt(null, NOW), null);
  assert.equal(
    getReminderTriggerAt('2026-09-19T18:45:00.000Z', NOW)?.toISOString(),
    '2026-09-19T09:00:00.000Z',
  );
});

test('getReminderTriggerAt moves elapsed due mornings one minute ahead', () => {
  assert.equal(
    getReminderTriggerAt('2026-09-18T18:45:00.000Z', NOW)?.toISOString(),
    '2026-09-18T12:01:00.000Z',
  );
});
