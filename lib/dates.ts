import { addDays, differenceInCalendarDays, format, isBefore, parse, startOfDay } from 'date-fns';
import { getEffectiveDueAt } from '@/lib/reminders';
import { DUE_COLORS } from '@/lib/theme';
import type { DueState } from '@/types/models';

export function getDueColor(dueState: DueState | string): string {
  return DUE_COLORS[dueState as keyof typeof DUE_COLORS] ?? DUE_COLORS.upcoming;
}

export function toIsoNow() {
  return new Date().toISOString();
}

export function calculateNextDueAt(lastInteractionAt: string | null, cadenceDays: number) {
  const anchor = lastInteractionAt ? new Date(lastInteractionAt) : new Date();
  return addDays(anchor, cadenceDays).toISOString();
}

export function deriveDueState(nextDueAt: string | null, now = new Date()): DueState {
  if (!nextDueAt) return 'upcoming';
  const dueDate = startOfDay(new Date(nextDueAt));
  const today = startOfDay(now);
  if (isBefore(dueDate, today)) return 'overdue';
  if (differenceInCalendarDays(dueDate, today) === 0) return 'due';
  return 'upcoming';
}

export function deriveContactDueState(
  nextDueAt: string | null | undefined,
  cadenceSnoozedUntil: string | null | undefined,
  isPaused: boolean,
  isArchived: boolean,
  now = new Date(),
): DueState {
  if (isPaused || isArchived) return 'upcoming';
  return deriveDueState(getEffectiveDueAt(nextDueAt, cadenceSnoozedUntil), now);
}

export function formatOrbitDate(value: string | null | undefined) {
  if (!value) return '—';
  return format(new Date(value), 'MMM d, yyyy');
}

export function formatOrbitDateTime(value: string | null | undefined) {
  if (!value) return '—';
  return format(new Date(value), 'MMM d, yyyy h:mm a');
}

export function getDaysSinceDate(value: string | null | undefined, now = new Date()) {
  if (!value) return null;
  return differenceInCalendarDays(startOfDay(now), startOfDay(new Date(value)));
}

export function getDaysUntilDate(value: string | null | undefined, now = new Date()) {
  if (!value) return null;
  return differenceInCalendarDays(startOfDay(new Date(value)), startOfDay(now));
}

export function formatDaysSinceContact(value: string | null | undefined, now = new Date()) {
  const daysSince = getDaysSinceDate(value, now);
  if (daysSince === null) return 'No interactions yet';
  if (daysSince === 0) return 'Contacted today';
  if (daysSince === 1) return 'Last contacted 1 day ago';
  return `Last contacted ${daysSince} days ago`;
}

export function formatDueLabel(nextDueAt: string | null | undefined, now = new Date()) {
  const daysUntil = getDaysUntilDate(nextDueAt, now);
  if (daysUntil === null) return 'No due date';
  if (daysUntil < 0) {
    const overdueDays = Math.abs(daysUntil);
    return overdueDays === 1 ? '1 day overdue' : `${overdueDays} days overdue`;
  }
  if (daysUntil === 0) return 'Due today';
  if (daysUntil === 1) return 'Due tomorrow';
  return `Due in ${daysUntil} days`;
}

/** Format birthday string (e.g. "March 26" or "March 26 · 32 years old") */
export function formatBirthday(value: string | null | undefined): string {
  if (!value) return '—';
  // Accept MM-DD, MM/DD, or YYYY-MM-DD formats
  let parsed: Date;
  try {
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      parsed = new Date(value + 'T00:00:00');
    } else if (/^\d{1,2}[-/]\d{1,2}$/.test(value)) {
      // MM-DD or MM/DD — use current year
      const [m, d] = value.split(/[-/]/).map(Number);
      parsed = new Date(new Date().getFullYear(), m - 1, d);
    } else {
      return value;
    }
  } catch {
    return value;
  }
  const monthDay = format(parsed, 'MMMM d');
  // Compute age if a full YYYY-MM-DD was provided
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const today = new Date();
    const birthDate = new Date(value + 'T00:00:00');
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
    if (age > 0) return `${monthDay} · ${age} years old`;
  }
  return monthDay;
}

/** Returns days until the next occurrence of a birthday, or null if unparseable. */
export function getDaysUntilBirthday(value: string | null | undefined): number | null {
  if (!value) return null;
  try {
    const today = new Date();
    let month: number, day: number;
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const parts = value.split('-').map(Number);
      month = parts[1] - 1;
      day = parts[2];
    } else if (/^\d{1,2}[-/]\d{1,2}$/.test(value)) {
      const parts = value.split(/[-/]/).map(Number);
      month = parts[0] - 1;
      day = parts[1];
    } else {
      return null;
    }
    const thisYear = new Date(today.getFullYear(), month, day);
    const nextOccurrence = thisYear >= today ? thisYear : new Date(today.getFullYear() + 1, month, day);
    return differenceInCalendarDays(startOfDay(nextOccurrence), startOfDay(today));
  } catch {
    return null;
  }
}

/** Short relative label for how long since last contact, for card use */
export function formatDaysAgo(value: string | null | undefined): string {
  const days = getDaysSinceDate(value);
  if (days === null) return '';
  if (days === 0) return 'today';
  if (days === 1) return '1d ago';
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
}
