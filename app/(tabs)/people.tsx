import { useCallback, useState } from 'react';
import { Link, useFocusEffect } from 'expo-router';
import { ScrollView, View, Image, StyleSheet } from 'react-native';
import { Button, Card, Chip, Text, Surface } from 'react-native-paper';
import { contactsRepository } from '@/db/repositories/contactsRepository';
import { formatDueLabel } from '@/lib/dates';
import { useUiStore } from '@/store/ui';
import { orbitTheme } from '@/lib/theme';

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
              <View style={styles.row}>
                {contact.photoUri ? (
                  <Image source={{ uri: contact.photoUri }} style={styles.avatar} />
                ) : (
                  <Surface style={[styles.avatar, { backgroundColor: orbitTheme.colors.primary }]} elevation={1}>
                    <Text style={styles.avatarInitial}>{contact.name[0].toUpperCase()}</Text>
                  </Surface>
                )}
                <View style={{ flex: 1 }}>
                  <Text variant="titleMedium">{contact.name}</Text>
                  <Text variant="bodySmall">{formatDueLabel(contact.nextDueAt)}</Text>
                </View>
                <View style={{ flexDirection: 'row', gap: 4 }}>
                  <Chip compact>{contact.dueState}</Chip>
                  {contact.isPaused ? <Chip compact>paused</Chip> : null}
                  {contact.cadenceSnoozedUntil ? <Chip compact>snoozed</Chip> : null}
                </View>
              </View>
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

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  avatarInitial: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 44,
  },
});
