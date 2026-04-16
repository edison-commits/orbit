import { useCallback, useMemo, useState } from 'react';
import { Link, useFocusEffect } from 'expo-router';
import { FlatList, View, Image, StyleSheet, RefreshControl } from 'react-native';
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
  const [refreshing, setRefreshing] = useState(false);
  const { colors } = useTheme();

  const reloadContacts = useCallback(() => {
    setContacts(contactsRepository.listByUrgency());
  }, []);

  useFocusEffect(
    useCallback(() => {
      reloadContacts();
    }, [reloadContacts]),
  );

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    reloadContacts();
    setRefreshing(false);
  }, [reloadContacts]);

  const filtered = useMemo(
    () =>
      contacts.filter(
        (c) =>
          (dueFilter === 'all' || c.dueState === dueFilter) &&
          (search.trim() === '' || c.name.toLowerCase().includes(search.toLowerCase().trim())),
      ),
    [contacts, dueFilter, search],
  );

  const listData = useMemo(() => {
    const items: Array<{ type: 'contact'; contact: (typeof filtered)[0] } | { type: 'footer' }> =
      filtered.map((contact) => ({ type: 'contact' as const, contact }));
    if (contacts.length > 0) {
      items.push({ type: 'footer' });
    }
    return items;
  }, [filtered, contacts]);

  const renderItem = useCallback(
    ({ item }: { item: (typeof listData)[0] }) => {
      if (item.type === 'footer') {
        return (
          <View style={{ paddingHorizontal: 16, paddingBottom: 16 }}>
            <Link href="/interaction/new" asChild>
              <Button mode="outlined">Quick log interaction</Button>
            </Link>
          </View>
        );
      }

      const contact = item.contact;
      return (
        <View style={{ paddingHorizontal: 16, marginBottom: 10 }}>
          <Link href={`/contact/${contact.id}`} asChild>
            <Card style={{ overflow: 'hidden' }}>
              <Card.Content style={styles.cardContent}>
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
                {contact.photoUri ? (
                  <Image source={{ uri: contact.photoUri }} style={styles.avatar} />
                ) : (
                  <Surface style={[styles.avatar, { backgroundColor: colors.primary }]} elevation={1}>
                    <Text style={[styles.avatarInitial, { color: colors.onPrimary }]}>
                      {contact.name[0].toUpperCase()}
                    </Text>
                  </Surface>
                )}
                <View style={styles.info}>
                  <Text variant="titleMedium" numberOfLines={1}>
                    {contact.name}
                  </Text>
                  <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>
                    {formatDueLabel(contact.nextDueAt)}
                    {contact.lastInteractionAt ? ` · ${formatDaysAgo(contact.lastInteractionAt)}` : ''}
                  </Text>
                </View>
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
        </View>
      );
    },
    [colors],
  );

  const ListHeader = (
    <View style={{ paddingHorizontal: 16, gap: 12 }}>
      <Searchbar
        placeholder="Search by name…"
        value={search}
        onChangeText={setSearch}
        style={styles.searchbar}
        inputStyle={{ fontSize: 15 }}
      />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {(['all', 'overdue', 'due', 'upcoming'] as const).map((filter) => (
          <Chip
            key={filter}
            selected={dueFilter === filter}
            onPress={() => setDueFilter(filter)}
            style={
              dueFilter === filter
                ? { backgroundColor: getDueColor(filter === 'all' ? 'upcoming' : filter) + '22' }
                : {}
            }
            textStyle={
              dueFilter === filter
                ? { color: getDueColor(filter === 'all' ? 'upcoming' : filter) }
                : {}
            }
          >
            {filter === 'all' ? 'All' : filter[0].toUpperCase() + filter.slice(1)}
          </Chip>
        ))}
      </View>
    </View>
  );

  const ListEmpty = (
    <View style={{ paddingHorizontal: 16 }}>
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
              <Button mode="contained" icon="plus">
                Add your first person
              </Button>
            </Link>
          )}
        </Card.Content>
      </Card>
    </View>
  );

  return (
    <FlatList
      data={filtered.length === 0 ? [] : listData}
      renderItem={renderItem}
      keyExtractor={(item, index) => (item.type === 'footer' ? 'footer' : item.contact.id)}
      ListHeaderComponent={ListHeader}
      ListEmptyComponent={ListEmpty}
      contentContainerStyle={{ paddingTop: 16, paddingBottom: 24 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />}
      keyboardShouldPersistTaps="handled"
      removeClippedSubviews={true}
      maxToRenderPerBatch={10}
      windowSize={5}
    />
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
