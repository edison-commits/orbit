import test from 'node:test';
import assert from 'node:assert/strict';

import {
  parseBackupEnvelope,
  serializeBackupEnvelope,
} from '../features/backup/backupEnvelope.ts';
import { restoreBackupSnapshot } from '../features/backup/restoreBackup.ts';

function createRecordingDb() {
  const calls = [];
  let transactions = 0;
  let commits = 0;

  return {
    calls,
    get transactions() {
      return transactions;
    },
    get commits() {
      return commits;
    },
    withTransactionSync(fn) {
      transactions += 1;
      const checkpoint = calls.length;
      try {
        fn();
        commits += 1;
      } catch (error) {
        calls.splice(checkpoint);
        throw error;
      }
    },
    execSync(sql) {
      calls.push({ kind: 'exec', sql });
    },
    runSync(sql, params) {
      calls.push({ kind: 'run', sql, params });
    },
  };
}

const currentBackup = {
  version: 1,
  exported_at: '2026-09-18T12:00:00.000Z',
  contacts: [
    {
      id: 'contact-1',
      name: 'Ada',
      nickname: null,
      photoUri: 'file://ada.jpg',
      relationshipType: 'friend',
      howWeMet: 'School',
      birthday: '12-10',
      location: 'London',
      phone: '+44 20',
      email: 'ada@example.test',
      socialJson: '{"instagram":"ada"}',
      notes: 'Notes',
      tagsJson: '["friend"]',
      cadence: 14,
      cadenceSnoozedUntil: null,
      isPaused: true,
      isArchived: false,
      lastInteractionAt: '2026-09-01T09:00:00.000Z',
      nextDueAt: '2026-09-15T09:00:00.000Z',
      dueState: 'overdue',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-09-01T09:00:00.000Z',
    },
  ],
  interactions: [
    {
      id: 'interaction-1',
      occurredAt: '2026-09-01T09:00:00.000Z',
      type: 'call',
      note: 'Caught up',
      createdAt: '2026-09-01T09:05:00.000Z',
    },
  ],
  interactionContacts: [{ interactionId: 'interaction-1', contactId: 'contact-1' }],
  importedContactSources: [
    { sourceId: 'device-1', contactId: 'contact-1', createdAt: '2026-01-01T00:00:00.000Z' },
  ],
  feedback: [
    { id: 'feedback-1', type: 'idea', message: 'More colors', created_at: '2026-09-02T00:00:00.000Z' },
  ],
  meta: [{ defaultCadence: 14 }],
};

test('backup envelope preserves the existing pretty-printed JSON format', () => {
  const serialized = serializeBackupEnvelope(currentBackup);

  assert.equal(serialized, JSON.stringify(currentBackup, null, 2));
  assert.deepEqual(parseBackupEnvelope(serialized), currentBackup);
});

test('backup envelope keeps the existing shallow validity checks', () => {
  assert.throws(() => parseBackupEnvelope('{"version":1}'), {
    message: 'Invalid backup file',
  });
  assert.throws(() => parseBackupEnvelope('{bad json'), SyntaxError);
});

test('restore maps current camelCase records in one transaction and preserves device notification consent', () => {
  const db = createRecordingDb();

  restoreBackupSnapshot(currentBackup, db, true);

  assert.equal(db.transactions, 1);
  assert.deepEqual(
    db.calls.filter(({ kind }) => kind === 'exec').map(({ sql }) => sql),
    [
      'DELETE FROM interaction_contacts;',
      'DELETE FROM interactions;',
      'DELETE FROM imported_contact_sources;',
      'DELETE FROM feedback;',
      'DELETE FROM contacts;',
      'DELETE FROM app_meta;',
    ],
  );
  assert.deepEqual(db.calls.find(({ sql }) => sql.includes('INSERT INTO contacts'))?.params, [
    'contact-1',
    'Ada',
    null,
    'file://ada.jpg',
    'friend',
    'School',
    '12-10',
    'London',
    '+44 20',
    'ada@example.test',
    '{"instagram":"ada"}',
    'Notes',
    '["friend"]',
    14,
    null,
    1,
    0,
    '2026-09-01T09:00:00.000Z',
    '2026-09-15T09:00:00.000Z',
    'overdue',
    '2026-01-01T00:00:00.000Z',
    '2026-09-01T09:00:00.000Z',
  ]);
  assert.deepEqual(db.calls.at(-1)?.params, ['true']);
  assert.equal(db.commits, 1);
});

test('restore preserves explicit notification opt-out and commits the transaction', () => {
  const db = createRecordingDb();

  restoreBackupSnapshot(currentBackup, db, false);

  const notificationWrite = db.calls.find(({ sql }) =>
    sql.includes("'notifications_enabled'"),
  );
  assert.deepEqual(notificationWrite?.params, ['false']);
  assert.equal(db.transactions, 1);
  assert.equal(db.commits, 1);
});

test('restore accepts legacy snake_case records and defaults optional arrays and cadence', () => {
  const db = createRecordingDb();
  const legacyBackup = {
    version: 1,
    exported_at: '2025-01-01T00:00:00.000Z',
    contacts: [
      {
        id: 'legacy-contact',
        name: 'Grace',
        photo_uri: null,
        relationship_type: 'family',
        how_we_met: null,
        social_json: null,
        tags_json: null,
        cadence: 'not-a-number',
        cadence_snoozed_until: null,
        is_paused: '1',
        is_archived: 1,
        last_interaction_at: null,
        next_due_at: null,
        due_state: 'upcoming',
        created_at: '2025-01-01T00:00:00.000Z',
        updated_at: '2025-01-01T00:00:00.000Z',
      },
    ],
    interactions: [],
    feedback: [],
    meta: [],
  };

  restoreBackupSnapshot(legacyBackup, db, null);

  const contactParams = db.calls.find(({ sql }) => sql.includes('INSERT INTO contacts'))?.params;
  assert.equal(contactParams?.[3], null);
  assert.equal(contactParams?.[4], 'family');
  assert.equal(contactParams?.[13], 30);
  assert.equal(contactParams?.[15], 1);
  assert.equal(contactParams?.[16], 1);
  assert.deepEqual(db.calls.at(-1)?.params, ['30']);
  assert.equal(db.calls.some(({ sql }) => sql.includes("'notifications_enabled'")), false);
});

test('restore rolls back when a required imported field is absent', () => {
  const db = createRecordingDb();
  const invalidBackup = {
    ...currentBackup,
    contacts: [{ ...currentBackup.contacts[0], dueState: undefined }],
  };

  assert.throws(
    () => restoreBackupSnapshot(invalidBackup, db, false),
    { message: 'Invalid backup file: missing dueState' },
  );
  assert.equal(db.transactions, 1);
  assert.equal(db.commits, 0);
  assert.deepEqual(db.calls, []);
});
