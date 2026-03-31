import { contactsRepository, type ContactsListItem } from '@/db/repositories/contactsRepository';
import { formatDueLabel, getDaysUntilBirthday } from '@/lib/dates';
import type { DueState } from '@/types/models';

export interface HomeAggregate {
  dueState: DueState;
  title: string;
  count: number;
  summary: string;
  contacts: ContactsListItem[];
}

export interface BirthdayAggregate {
  count: number;
  contacts: Array<ContactsListItem & { birthdayDays: number }>;
}

function buildSummary(dueState: DueState, count: number, contacts: ContactsListItem[]) {
  if (count === 0) {
    if (dueState === 'overdue') return 'Nobody is slipping right now.';
    if (dueState === 'due') return 'Nothing needs a touchpoint today.';
    return 'No one is coming up soon.';
  }

  const [first, second, third] = contacts;
  const preview = [first?.name, second?.name, third?.name].filter(Boolean).join(', ');

  if (count === 1 && first) {
    return `${first.name} is ${formatDueLabel(first.nextDueAt).toLowerCase()}.`;
  }

  if (count <= 3) {
    return preview;
  }

  return `${preview} +${count - 3} more`;
}

export function getHomeAggregates(): HomeAggregate[] {
  const contacts = contactsRepository.listByUrgency().filter((contact) => !contact.isPaused);
  const counts = contactsRepository.getSummaryCounts();

  // Birthday section: contacts with birthdays in the next 30 days
  // Identify them first so we can exclude from regular sections (no duplicate entries)
  const birthdayContacts = contacts
    .filter((c) => {
      if (!c.birthday) return false;
      const days = getDaysUntilBirthday(c.birthday);
      return days !== null && days >= 0 && days <= 30;
    })
    .map((c) => ({ ...c, birthdayDays: getDaysUntilBirthday(c.birthday)! }))
    .sort((a, b) => a.birthdayDays - b.birthdayDays)
    .slice(0, 5);

  const birthdayContactIds = new Set(birthdayContacts.map((c) => c.id));

  // Regular (non-birthday) contacts for the main sections
  const regularContacts = contacts.filter((c) => !birthdayContactIds.has(c.id));

  // Adjust counts: subtract birthday contacts from their respective due-state buckets
  const birthdayByState = contacts
    .filter((c) => birthdayContactIds.has(c.id))
    .reduce((acc, c) => {
      acc[c.dueState] = (acc[c.dueState] ?? 0) + 1;
      return acc;
    }, {} as Record<string, number>);

  const sections: HomeAggregate[] = (['overdue', 'due', 'upcoming'] as const).map((dueState) => {
    const grouped = regularContacts.filter((contact) => contact.dueState === dueState);
    const adjustedCount = Math.max(0, (counts[dueState] ?? 0) - (birthdayByState[dueState] ?? 0));

    return {
      dueState,
      title: dueState === 'due' ? 'Due today' : dueState[0].toUpperCase() + dueState.slice(1),
      count: adjustedCount,
      summary: buildSummary(dueState, adjustedCount, grouped),
      contacts: grouped.slice(0, 3),
    };
  });

  if (birthdayContacts.length > 0) {
    const names = birthdayContacts.map((c) => c.name).join(', ');
    sections.push({
      dueState: 'birthday' as DueState | 'birthday',
      title: '🎂 Birthdays soon',
      count: birthdayContacts.length,
      summary:
        birthdayContacts.length === 1
          ? `${birthdayContacts[0].name}'s birthday is ${
              birthdayContacts[0].birthdayDays === 0
                ? 'today!'
                : birthdayContacts[0].birthdayDays === 1
                  ? 'tomorrow'
                  : `in ${birthdayContacts[0].birthdayDays} days`
            }`
          : names,
      contacts: birthdayContacts as ContactsListItem[],
    });
  }

  return sections;
}
