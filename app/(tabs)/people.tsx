import { useCallback, useState } from 'react';
import { Link, useFocusEffect } from 'expo-router';
import { ScrollView, View } from 'react-native';
import { Button, Card, Chip, Text } from 'react-native-paper';
import { contactsRepository } from '@/db/repositories/contactsRepository';
import { formatDaysSinceContact, formatDueLabel, formatOrbitDate } from '@/lib/dates';
import { useUiStore } from '@/store/ui';

export default function PeopleScreen() {
  const dueFilter = useUiStore((state) => state.dueFilter);
  const setDueFilter = useUiStore((state) => state.setDueFilter);
  const [contacts, setContacts] = useState(() => contactsRepository.listByUrgency());

  useFocusEffect(
    useCallback(() => {
      setContacts(contactsRepository.listByUrgency());
    }, []),
  );

  const visibleContacts = contacts.filter((contact) => dueFilter === 'all' || contact.dueState === dueFilter);

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
      <Text variant="headlineSmall">People</Text>
      <Text variant="bodyMedium">Sorted by urgency so the next person to reach out to stays obvious.</Text>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {(['all', 'overdue', 'due', 'upcoming'] as const).map((filter) => (
          <Chip key={filter} selected={dueFilter === filter} onPress={() => setDueFilter(filter)}>
            {filter}
          </Chip>
        ))}
      </View>

      {visibleContacts.map((contact) => (
        <Link key={contact.id} href={`/contact/${contact.id}`} asChild>
          <Card>
            <Card.Content style={{ gap: 8 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                <Text variant="titleMedium">{contact.name}</Text>
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  <Chip compact>{contact.dueState}</Chip>
                  {contact.isPaused ? <Chip compact>paused</Chip> : null}
                  {contact.cadenceSnoozedUntil ? <Chip compact>snoozed</Chip> : null}
                </View>
              </View>
              <Text variant="bodyMedium">{formatDueLabel(contact.nextDueAt)}</Text>
              <Text variant="bodySmall">{formatDaysSinceContact(contact.lastInteractionAt)}</Text>
              <Text variant="bodySmall">Next due: {formatOrbitDate(contact.nextDueAt)}</Text>
              {contact.cadenceSnoozedUntil ? (
                <Text variant="bodySmall">Snoozed until: {formatOrbitDate(contact.cadenceSnoozedUntil)}</Text>
              ) : null}
              <Text variant="bodySmall">Cadence: every {contact.cadence} days</Text>
            </Card.Content>
          </Card>
        </Link>
      ))}

      {visibleContacts.length === 0 ? (
        <Card>
          <Card.Content style={{ gap: 8 }}>
            <Text variant="titleMedium">No people in this filter</Text>
            <Text variant="bodyMedium">Add someone new or switch the due-state filter.</Text>
          </Card.Content>
        </Card>
      ) : null}

      <Link href="/interaction/new" asChild>
        <Button mode="outlined">Quick log interaction</Button>
      </Link>
    </ScrollView>
  );
}
