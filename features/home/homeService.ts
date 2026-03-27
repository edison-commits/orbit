import { contactsRepository, type ContactsListItem } from '@/db/repositories/contactsRepository';
import { formatDueLabel } from '@/lib/dates';
import type { DueState } from '@/types/models';

export interface HomeAggregate {
  dueState: DueState;
  title: string;
  count: number;
  summary: string;
  contacts: ContactsListItem[];
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

  return (['overdue', 'due', 'upcoming'] as const).map((dueState) => {
    const grouped = contacts.filter((contact) => contact.dueState === dueState);

    return {
      dueState,
      title: dueState === 'due' ? 'Due today' : dueState[0].toUpperCase() + dueState.slice(1),
      count: counts[dueState],
      summary: buildSummary(dueState, counts[dueState], grouped),
      contacts: grouped.slice(0, 3),
    };
  });
}
