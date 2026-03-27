import { getDb } from '@/db/client';
import { calculateNextDueAt, deriveDueState, toIsoNow } from '@/lib/dates';

export function seedDevData() {
  const db = getDb();
  const count = db.getFirstSync<{ count: number }>('SELECT COUNT(*) as count FROM contacts;');
  if ((count?.count ?? 0) > 0) return;

  const now = toIsoNow();
  const samples = [
    { id: 'c1', name: 'Maya Chen', relationshipType: 'friend', cadence: 30, lastInteractionAt: '2026-02-05T18:00:00.000Z' },
    { id: 'c2', name: 'Jordan Alvarez', relationshipType: 'family', cadence: 14, lastInteractionAt: '2026-03-10T18:00:00.000Z' },
    { id: 'c3', name: 'Priya Raman', relationshipType: 'mentor', cadence: 60, lastInteractionAt: null },
  ];

  db.withTransactionSync(() => {
    for (const sample of samples) {
      const nextDueAt = calculateNextDueAt(sample.lastInteractionAt, sample.cadence);
      const dueState = deriveDueState(nextDueAt);
      db.runSync(
        `INSERT INTO contacts (
          id, name, relationship_type, cadence, last_interaction_at, next_due_at, due_state, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        [sample.id, sample.name, sample.relationshipType, sample.cadence, sample.lastInteractionAt, nextDueAt, dueState, now, now],
      );
    }
  });
}
