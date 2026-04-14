import { useCallback, useState } from 'react';
import { Link, useFocusEffect } from 'expo-router';
import { ScrollView, View, Image, StyleSheet } from 'react-native';
import { Button, Card, Chip, Searchbar, Text, Surface, useTheme } from 'react-native-paper';
import { contactsRepository } from '@/db/repositories/contactsRepository';
import { formatDueLabel, formatDaysAgo } from '@/lib/dates';
import { useUiStore } from '@/store/ui';
import { DUE_COLORS } from '@/lib/theme';
import { getDueColor } from '@/lib/dates';

export default function PeopleScreen() {
  const dueFilter = useUiStore((state) => state.dueFilter);
  const setDueFilter = useUiStore((state) => state.setDueFilter);
  const [contacts, setContacts] = useState(() => contactsRepository.listByUrgency());
  const [search, setSearch] = useState('');
  const { colors } = useTheme();

  useFocusEffect(
    useCallback(() => {
      setContacts(contactsRepository.listByUrgency());
    }, []),
  );

  const filtered = contacts.filter(
    (c) =>
      (dueFilter === 'all' || c.dueState === dueFilter) &&
      (search.trim() === '' || c.name.toLowerCase().includes(search.toLowerCase().trim())),
  );

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
      {/* Search */}
      <Searchbar
        placeholder="Search by name…"
        value={search}
        onChangeText={setSearch}
        style={styles.searchbar}
        inputStyle={{ fontSize: 15 }}
      />

      {/* Filters */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {(['all', 'overdue', 'due', 'upcoming'] as const).map((filter) => (
          <Chip
            key={filter}
            selected={dueFilter === filter}
            onPress={() => setDueFilter(filter)}
            style={dueFilter === filter ? { backgroundColor: getDueColor(filter === 'all' ? 'upcoming' : filter) + '22' } : {}}
            textStyle={dueFilter === filter ? { color: getDueColor(filter === 'all' ? 'upcoming' : filter) } : {}}
          >
            {filter === 'all' ? 'All' : filter[0].toUpperCase() + filter.slice(1)}
          </Chip>
        ))}
      </View>

      {/* Contact list */}
      {filtered.length === 0 ? (
        <Card>
          <Card.Content style={{ gap: 8 }}>
            <Text variant="titleMedium">{search ? 'No matches' : 'No people yet'}</Text>
            <Text variant="bodyMedium" style={{ color: colors.onSurfaceVariant }}>
              {search
                ? `Nobody named "${search}" in your orbit.`
                : 'Add the people you want to stay connected with.'}
            </Text>
            {!search && (
              <Link href="/contact/new" asChild style={{ marginTop: 4 }}>
                <Button mode="contained" icon="plus">Add your first person</Button>
              </Link>
            )}
          </Card.Content>
        </Card>
      ) : (
        filtered.map((contact) => (
          <Link key={contact.id} href={`/contact/${contact.id}`} asChild>
            <Card style={{ overflow: 'hidden' }}>
              <Card.Content style={styles.cardContent}>
                {/* Color urgency bar */}
                <View
                  style={[
                    styles.urgencyBar,
                    {
                      backgroundColor: contact.isPaused
                        ? DUE_COLORS.paused
                        : contact.cadenceSnoozedUntil
                        ? DUE_COLORS.snoozed
                        : getDueColor(contact.dueState),
                    },
                  ]}
                />
                {/* Photo */}
                {contact.photoUri ? (
                  <Image source={{ uri: contact.photoUri }} style={styles.avatar} />
                ) : (
                  <Surface style={[styles.avatar, { backgroundColor: colors.primary }]} elevation={1}>
                    <Text style={[styles.avatarInitial, { color: colors.onPrimary }]}>{contact.name[0].toUpperCase()}</Text>
                  </Surface>
                )}
                {/* Info */}
                <View style={styles.info}>
                  <Text variant="titleMedium" numberOfLines={1}>
                    {contact.name}
                  </Text>
                  <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>
                    {formatDueLabel(contact.nextDueAt)}
                    {contact.lastInteractionAt ? ` · ${formatDaysAgo(contact.lastInteractionAt)}` : ''}
                  </Text>
                </View>
                {/* Right side */}
                <View style={styles.right}>
                  {contact.isPaused ? (
                    <Chip compact icon="pause-circle-outline" style={styles.stateChip}>
                      paused
                    </Chip>
                  ) : contact.cadenceSnoozedUntil ? (
                    <Chip compact icon="clock-outline" style={styles.stateChip}>
                      snoozed
                    </Chip>
                  ) : null}
                  <Chip compact>{contact.relationshipType}</Chip>
                </View>
              </Card.Content>
            </Card>
          </Link>
        ))
      )}

      {contacts.length > 0 && (
        <Link href="/interaction/new" asChild>
          <Button mode="outlined">Quick log interaction</Button>
        </Link>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  searchbar: {
    elevation: 0,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingLeft: 0,
  },
  urgencyBar: {
    width: 4,
    alignSelf: 'stretch',
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12,
    marginRight: 0,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    flexShrink: 0,
  },
  avatarInitial: {
    color: undefined, // set dynamically via colors.onPrimary
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 44,
  },
  info: {
    flex: 1,
    minWidth: 0,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexShrink: 0,
  },
  stateChip: {
  },
});
