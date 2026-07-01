import { useCallback, useState } from 'react';
import { Link, router, useFocusEffect } from 'expo-router';
import { Pressable, RefreshControl, ScrollView, View, StyleSheet } from 'react-native';
import { Button, Card, Chip, Icon, ProgressBar, Text, useTheme } from 'react-native-paper';
import { getWeeklyReviewSummary, type ReviewPriority } from '@/features/review/weeklyReviewService';
import { getDueColor, getDaysSinceDate, getDaysUntilBirthday } from '@/lib/dates';

const PRIORITY_ICON_COLOR: Record<ReviewPriority, string> = {
  high: getDueColor('overdue'),
  medium: getDueColor('due'),
  low: getDueColor('upcoming'),
};

function priorityLabel(priority: ReviewPriority) {
  if (priority === 'high') return 'High leverage';
  if (priority === 'medium') return 'Worth planning';
  return 'Low pressure';
}

export default function ReviewScreen() {
  const { colors } = useTheme();
  const [reviewNow, setReviewNow] = useState(() => new Date());
  const [summary, setSummary] = useState(() => getWeeklyReviewSummary(reviewNow));
  const [refreshing, setRefreshing] = useState(false);

  const reload = useCallback(() => {
    const now = new Date();
    setReviewNow(now);
    setSummary(getWeeklyReviewSummary(now));
  }, []);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload]),
  );

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    requestAnimationFrame(() => {
      reload();
      setRefreshing(false);
    });
  }, [reload]);


  const weeklyCoverage = summary.activeCount > 0 ? Math.min(1, summary.contactedThisWeekCount / summary.activeCount) : 0;

  if (summary.activeCount === 0) {
    const hasPausedRoster = summary.pausedCount > 0;
    const hasArchivedRoster = summary.archivedCount > 0;
    return (
      <ScrollView
        contentContainerStyle={{ padding: 16, gap: 16 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />}
      >
        <Card>
          <Card.Content style={{ gap: 12, alignItems: 'center', paddingVertical: 28 }}>
            <Icon source="chart-timeline-variant" size={36} color={colors.primary} />
            <Text variant="headlineSmall" style={{ textAlign: 'center' }}>
              {hasPausedRoster ? 'Review is paused' : hasArchivedRoster ? 'Review is archived' : 'No review yet'}
            </Text>
            <Text variant="bodyMedium" style={{ textAlign: 'center', color: colors.onSurfaceVariant, maxWidth: 300 }}>
              {hasPausedRoster
                ? 'All non-archived people are paused, so Orbit is keeping the weekly review quiet.'
                : hasArchivedRoster
                ? 'Your people are archived, so Orbit is keeping the weekly review quiet until someone active is added.'
                : 'Add a few active people and log interactions. Orbit will turn them into a weekly relationship review.'}
            </Text>
            <Link href={hasPausedRoster ? '/people' : '/contact/new'} asChild>
              <Button mode="contained" icon={hasPausedRoster ? 'account-group' : 'plus'}>
                {hasPausedRoster ? 'Review people' : 'Add a person'}
              </Button>
            </Link>
          </Card.Content>
        </Card>
      </ScrollView>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={{ padding: 16, gap: 16 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />}
    >
      <Card style={{ backgroundColor: colors.primaryContainer }}>
        <Card.Content style={{ gap: 10 }}>
          <View style={styles.titleRow}>
            <Icon source="chart-timeline-variant" size={24} color={colors.onPrimaryContainer} />
            <Text variant="headlineSmall" style={{ color: colors.onPrimaryContainer, fontWeight: '700' }}>
              Weekly review
            </Text>
          </View>
          <Text variant="bodyMedium" style={{ color: colors.onPrimaryContainer }}>
            A bounded, explainable read on who needs attention — built from due state, birthdays, and recent touchpoints.
          </Text>
        </Card.Content>
      </Card>

      <Card>
        <Card.Content style={{ gap: 12 }}>
          <View style={styles.titleRow}>
            <Icon source="pulse" size={20} color={colors.primary} />
            <Text variant="titleMedium">Relationship pulse</Text>
          </View>
          <View style={styles.metricGrid}>
            <View style={[styles.metric, { backgroundColor: colors.surfaceVariant }]}>
              <Text variant="headlineSmall" style={{ fontWeight: '700' }}>{summary.activeCount}</Text>
              <Text variant="labelSmall" style={{ color: colors.onSurfaceVariant }}>Active</Text>
            </View>
            <View style={[styles.metric, { backgroundColor: getDueColor('overdue') + '18' }]}>
              <Text variant="headlineSmall" style={{ color: getDueColor('overdue'), fontWeight: '700' }}>{summary.overdueCount}</Text>
              <Text variant="labelSmall" style={{ color: getDueColor('overdue') }}>Overdue</Text>
            </View>
            <View style={[styles.metric, { backgroundColor: getDueColor('due') + '18' }]}>
              <Text variant="headlineSmall" style={{ color: getDueColor('due'), fontWeight: '700' }}>{summary.dueTodayCount}</Text>
              <Text variant="labelSmall" style={{ color: getDueColor('due') }}>Due today</Text>
            </View>
          </View>
          <View style={{ gap: 6 }}>
            <View style={styles.betweenRow}>
              <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>Weekly coverage</Text>
              <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>
                {summary.contactedThisWeekCount}/{summary.activeCount} people
              </Text>
            </View>
            <ProgressBar progress={weeklyCoverage} color={colors.primary} />
            <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>
              {summary.contactedThisWeekCount} active people touched in the last 7 days.
            </Text>
          </View>
        </Card.Content>
      </Card>

      <Card>
        <Card.Content style={{ gap: 12 }}>
          <View style={styles.titleRow}>
            <Icon source="lightbulb-on-outline" size={20} color={colors.primary} />
            <Text variant="titleMedium">Recommended focus</Text>
          </View>
          {summary.actions.map((action) => {
            const color = PRIORITY_ICON_COLOR[action.priority];
            const content = (
              <Card key={action.key} mode="outlined">
                <Card.Content style={{ gap: 8 }}>
                  <View style={styles.betweenRow}>
                    <View style={[styles.actionIcon, { backgroundColor: color + '18' }]}>
                      <Icon source={action.icon} size={18} color={color} />
                    </View>
                    <Chip compact style={{ backgroundColor: color + '18' }} textStyle={{ color }}>
                      {priorityLabel(action.priority)}
                    </Chip>
                  </View>
                  <Text variant="titleSmall">{action.title}</Text>
                  <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>
                    {action.subtitle}
                  </Text>
                  {action.route ? (
                    <Button
                      mode="text"
                      compact
                      icon="arrow-right"
                      contentStyle={{ flexDirection: 'row-reverse' }}
                      onPress={() => action.route && router.navigate(action.route)}
                    >
                      Open
                    </Button>
                  ) : null}
                </Card.Content>
              </Card>
            );
            return content;
          })}
        </Card.Content>
      </Card>

      {summary.birthdaysNext14Days.length > 0 ? (
        <Card>
          <Card.Content style={{ gap: 10 }}>
            <View style={styles.titleRow}>
              <Icon source="cake-variant" size={20} color={colors.tertiary} />
              <Text variant="titleMedium">Birthdays in 14 days</Text>
            </View>
            {summary.birthdaysNext14Days.slice(0, 5).map((contact) => {
              const days = getDaysUntilBirthday(contact.birthday, reviewNow);
              return (
                <Pressable key={contact.id} accessibilityRole="button" onPress={() => router.push(`/contact/${contact.id}`)}>
                  <Card mode="outlined">
                    <Card.Content style={styles.betweenRow}>
                      <Text variant="bodyMedium" style={{ flex: 1 }} numberOfLines={1}>{contact.name}</Text>
                      <Chip compact>{days === 0 ? 'today' : days === 1 ? 'tomorrow' : `in ${days}d`}</Chip>
                    </Card.Content>
                  </Card>
                </Pressable>
              );
            })}
          </Card.Content>
        </Card>
      ) : null}

      {summary.neglectedContacts.length > 0 ? (
        <Card>
          <Card.Content style={{ gap: 10 }}>
            <View style={styles.titleRow}>
              <Icon source="radar" size={20} color={colors.primary} />
              <Text variant="titleMedium">Quiet connections</Text>
            </View>
            <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>
              People quiet for at least twice their cadence, with a 60-day minimum. This respects paused and archived status.
            </Text>
            {summary.neglectedContacts.slice(0, 5).map((contact) => {
              const days = getDaysSinceDate(contact.lastInteractionAt ?? contact.createdAt, reviewNow);
              return (
                <Pressable key={contact.id} accessibilityRole="button" onPress={() => router.push(`/contact/${contact.id}`)}>
                  <Card mode="outlined">
                    <Card.Content style={styles.betweenRow}>
                      <Text variant="bodyMedium" style={{ flex: 1 }} numberOfLines={1}>{contact.name}</Text>
                      <Chip compact>{contact.lastInteractionAt ? `${days ?? 0}d ago` : `created ${days ?? 0}d ago`}</Chip>
                    </Card.Content>
                  </Card>
                </Pressable>
              );
            })}
          </Card.Content>
        </Card>
      ) : null}

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  betweenRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  metricGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  metric: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 2,
  },
  actionIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
