import { getDb } from '@/db/client';
import { createId } from '@/lib/id';

export type FeedbackType = 'bug' | 'feature' | 'other';

export interface Feedback {
  id: string;
  type: FeedbackType;
  message: string;
  created_at: string;
}

export const feedbackRepository = {
  submit(type: FeedbackType, message: string): Feedback {
    const db = getDb();
    const id = createId('fb');
    const created_at = new Date().toISOString();
    db.runSync(
      'INSERT INTO feedback (id, type, message, created_at) VALUES (?, ?, ?, ?);',
      [id, type, message, created_at],
    );
    return { id, type, message, created_at };
  },

  getAll(): Feedback[] {
    const db = getDb();
    return db.getAllSync<Feedback>(
      'SELECT * FROM feedback ORDER BY created_at DESC;',
    );
  },

  delete(id: string): void {
    const db = getDb();
    db.runSync('DELETE FROM feedback WHERE id = ?;', [id]);
  },
};
