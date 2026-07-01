import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useFocusEffect, useLocalSearchParams, router } from 'expo-router';
import { FlatList, View, Image, Pressable, StyleSheet, RefreshControl } from 'react-native';
import { Button, Card, Chip, IconButton, Searchbar, Text, Surface, useTheme } from 'react-native-paper';
import { contactsRepository } from '@/db/repositories/contactsRepository';
import { formatDueLabel, formatDaysAgo } from '@/lib/dates';
import { useUiStore } from '@/store/ui';
import { DUE_COLORS } from '@/lib/theme';
import { getDueColor } from '@/lib/dates';
import { parseTags } from '@/lib/tags';

function isActiveSnooze(value: string | null | undefined) {
  return Boolean(value && new Date(value) > new Date());
}

export default function PeopleScreen() {
  const params = useLocalSearchParams<{ due?: string }>();
  const dueFilter = useUiStore((state) => state.dueFilter);
  const setDueFilter = useUiStore((state) => state.setDueFilter);
  const [contacts, setContacts] = useState(() => contactsRepository.listByUrgency());
  const [search, setSearch] = useState('');
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const { colors } = useTheme();
  const routeDueFilter =
    params.due === 'overdue' || params.due === 'due' || params.due === 'upcoming' ? params.due : null;
  const activeDueFilter = routeDueFilter ?? dueFilter;
  const activeSearch = routeDueFilter ? '' : search;
  const activeTagFilter = routeDueFilter ? null : tagFilter;
  const dueFilterOptions = routeDueFilter
    ? (['overdue', 'due', 'upcoming'] as const)
    : (['all', 'overdue', 'due', 'upcoming'] as const);

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
    // Use requestAnimationFrame so the refresh spinner renders before synchronous DB work blocks the thread
    requestAnimationFrame(() => {
      reloadContacts();
      setRefreshing(false);
    });
  }, [reloadContacts]);

  const handleDueFilter = useCallback(
    (filter: 'all' | 'overdue' | 'due' | 'upcoming') => {
      if (!routeDueFilter) {
        setDueFilter(filter);
        return;
      }

      if (filter === 'all') {
        router.replace('/people');
        return;
      }

      router.setParams({ due: filter });
    },
    [routeDueFilter, setDueFilter],
  );

  const availableTags = useMemo(() => {
    const tags = new Set<string>();
    contacts.forEach((contact) => parseTags(contact.tagsJson).forEach((tag) => tags.add(tag)));
    return Array.from(tags).sort((a, b) => a.localeCompare(b));
  }, [contacts]);

  const filtered = useMemo(
    () =>
      contacts.filter((c) => {
        const tags = parseTags(c.tagsJson);
        const q = activeSearch.toLowerCase().trim();
        const matchesReviewScope = !routeDueFilter || !c.isPaused;
        const matchesDue = activeDueFilter === 'all' || c.dueState === activeDueFilter;
        const matchesTag = !activeTagFilter || tags.includes(activeTagFilter);
        const matchesSearch =
          q === '' ||
          c.name.toLowerCase().includes(q) ||
          tags.some((tag) => tag.toLowerCase().includes(q));
        return matchesReviewScope && matchesDue && matchesTag && matchesSearch;
      }),
    [contacts, activeDueFilter, activeSearch, activeTagFilter, routeDueFilter],
  );

  useEffect(() => {
    if (routeDueFilter) return;
    if (tagFilter && !availableTags.includes(tagFilter)) {
      setTagFilter(null);
    }
  }, [availableTags, routeDueFilter, tagFilter]);

  const listData = useMemo(() => {
    const items: Array<{ type: 'contact'; contact: (typeof filtered)[0] } | { type: 'footer' }> =
      filtered.map((contact) => ({ type: 'contact' as const, contact }));
    if (contacts.length > 0 && !routeDueFilter) {
      items.push({ type: 'footer' });
    }
    return items;
  }, [filtered, contacts, routeDueFilter]);

  const renderItem = useCallback(
    ({ item }: { item: (typeof listData)[0] }) => {
      if (item.type === 'footer') {
        return (
          <View style={{ paddingHorizontal: 16, paddingBottom: 16 }}>
            <Link href="/interaction/new" asChild>
              <Button mode="outlined" accessibilityLabel="Quick log an interaction">
                Quick log interaction
              </Button>
            </Link>
          </View>
        );
      }

      const contact = item.contact;
      const hasActiveSnooze = isActiveSnooze(contact.cadenceSnoozedUntil);
      return (
        <View style={{ paddingHorizontal: 16, marginBottom: 10 }}>
          <Card style={{ overflow: 'hidden' }}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Open ${contact.name}'s contact details`}
              onPress={() => router.push(`/contact/${contact.id}`)}
              style={{}}
            >
              <Card.Content style={styles.cardContent}>
                <View
                  style={[
                    styles.urgencyBar,
                    {
                      backgroundColor: contact.isPaused
                        ? DUE_COLORS.paused
                        : hasActiveSnooze
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
                    {formatDueLabel(contactsRepository.getEffectiveDueAt(contact))}
                    {contact.lastInteractionAt ? ` · ${formatDaysAgo(contact.lastInteractionAt)}` : ''}
                  </Text>
                  {parseTags(contact.tagsJson).length > 0 ? (
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
                      {parseTags(contact.tagsJson).slice(0, 3).map((tag) => (
                        <Chip key={tag} compact style={styles.tagChip} textStyle={styles.tagText}>
                          {tag}
                        </Chip>
                      ))}
                    </View>
                  ) : null}
                </View>
                <View style={styles.right}>
                  {contact.isPaused ? (
                    <Chip compact icon="pause-circle-outline" style={styles.stateChip}>
                      paused
                    </Chip>
                  ) : hasActiveSnooze ? (
                    <Chip compact icon="clock-outline" style={styles.stateChip}>
                      snoozed
                    </Chip>
                  ) : null}
                  <Chip compact>{contact.relationshipType}</Chip>
                </View>
              </Card.Content>
            </Pressable>
            {/* Quick-log button — separate from card press to avoid double-navigation */}
            <Link href={{ pathname: '/interaction/new', params: { contactId: contact.id } }} asChild>
              <IconButton
                icon="plus-circle-outline"
                accessibilityLabel={`Log an interaction with ${contact.name}`}
                size={22}
                iconColor={colors.primary}
                style={styles.quickLog}
              />
            </Link>
          </Card>
        </View>
      );
    },
    [colors],
  );

  const dueCounts = useMemo(() => {
    const reviewScopedContacts = routeDueFilter ? contacts.filter((contact) => !contact.isPaused) : contacts;
    const counts = { all: reviewScopedContacts.length, overdue: 0, due: 0, upcoming: 0 };
    for (const c of reviewScopedContacts) {
      if (c.dueState === 'overdue') counts.overdue++;
      else if (c.dueState === 'due') counts.due++;
      else counts.upcoming++;
    }
    return counts;
  }, [contacts, routeDueFilter]);

  const ListHeader = (
    <View style={{ paddingHorizontal: 16, gap: 12 }}>
      {routeDueFilter ? (
        <View style={{ gap: 8 }}>
          <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>
            Opened from Review. Search and tag filters are temporarily cleared, then restored when you leave this review filter.
          </Text>
          <Button mode="text" compact onPress={() => handleDueFilter('all')}>
            Back to saved People filter
          </Button>
        </View>
      ) : (
        <Searchbar
          placeholder="Search by name or tag…"
          accessibilityLabel="Search people by name or tag"
          value={search}
          onChangeText={setSearch}
          style={styles.searchbar}
          inputStyle={{ fontSize: 15 }}
        />
      )}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {dueFilterOptions.map((filter) => (
          <Chip
            key={filter}
            selected={activeDueFilter === filter}
            onPress={() => handleDueFilter(filter)}
            style={
              activeDueFilter === filter
                ? { backgroundColor: getDueColor(filter === 'all' ? 'upcoming' : filter) + '22' }
                : {}
            }
            textStyle={
              activeDueFilter === filter
                ? { color: getDueColor(filter === 'all' ? 'upcoming' : filter) }
                : {}
            }
          >
            {filter === 'all' ? 'All' : filter[0].toUpperCase() + filter.slice(1)} ({dueCounts[filter]})
          </Chip>
        ))}
      </View>
      {!routeDueFilter && availableTags.length > 0 ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {availableTags.map((tag) => (
            <Chip
              key={tag}
              compact
              icon="tag-outline"
              selected={activeTagFilter === tag}
              onPress={() => setTagFilter(tagFilter === tag ? null : tag)}
            >
              {tag}
            </Chip>
          ))}
        </View>
      ) : null}
    </View>
  );

  const ListEmpty = (
    <View style={{ paddingHorizontal: 16 }}>
      <Card>
        <Card.Content style={{ gap: 8 }}>
          <Text variant="titleMedium">{activeSearch || activeTagFilter || activeDueFilter !== 'all' ? 'No matches' : 'No people yet'}</Text>
          <Text variant="bodyMedium" style={{ color: colors.onSurfaceVariant }}>
            {activeSearch || activeTagFilter || activeDueFilter !== 'all'
              ? `No people match the current filters${activeSearch ? ` for "${activeSearch}"` : ''}.`
              : 'Add the people you want to stay connected with.'}
          </Text>
          {!activeSearch && !activeTagFilter && activeDueFilter === 'all' && (
            <Link href="/contact/new" asChild style={{ marginTop: 4 }}>
              <Button mode="contained" icon="plus" accessibilityLabel="Add your first person">
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
  tagChip: {
    height: 24,
  },
  tagText: {
    fontSize: 11,
  },
  quickLog: {
    position: 'absolute',
    top: 4,
    right: 4,
    margin: 0,
  },
});
