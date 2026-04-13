import { useCallback, useState } from 'react';
import { useLocalSearchParams, Link, useFocusEffect } from 'expo-router';
import { ScrollView, View, StyleSheet, Linking, Pressable, Image } from 'react-native';
import { Button, Chip, Divider, HelperText, Text, Surface, Icon, useTheme } from 'react-native-paper';
import { contactsRepository } from '@/db/repositories/contactsRepository';
import { interactionsRepository } from '@/db/repositories/interactionsRepository';
import {
  clearContactSnooze,
  setContactArchived,
  setContactPaused,
  snoozeContact,
} from '@/features/contacts/contactService';
import {
  formatDaysSinceContact,
  formatDueLabel,
  formatOrbitDate,
  formatOrbitDateTime,
  getDaysUntilDate,
  getDueColor,
  formatBirthday,
  getDaysUntilBirthday,
} from '@/lib/dates';
import { SNOOZE_OPTIONS } from '@/lib/reminders';
import type { InteractionTimelineItem } from '@/types/models';

const INTERACTION_ICONS: Record<string, string> = {
  call: 'phone',
  text: 'message',
  hangout: 'coffee',
  coffee: 'coffee',
  birthday: 'cake',
  note: 'note-text',
};

function getDueIcon(dueState: string): string {
  if (dueState === 'overdue') return 'alert-circle';
  if (dueState === 'due') return 'clock-outline';
  return 'check-circle';
}

export default function ContactDetailScreen() {
  const { colors } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [contact, setContact] = useState(() => contactsRepository.getById(id));
  const [recentInteractions, setRecentInteractions] = useState<InteractionTimelineItem[]>(() =>
    interactionsRepository.listForContact(id),
  );
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useFocusEffect(
    useCallback(() => {
      setContact(contactsRepository.getById(id));
      setRecentInteractions(interactionsRepository.listForContact(id));
    }, [id]),
  );

  async function handlePauseToggle() {
    if (!contact) return;
    try {
      setIsSaving(true);
      setError(null);
      const updated = await setContactPaused(contact.id, !contact.isPaused);
      setContact(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update contact');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleArchiveToggle() {
    if (!contact) return;
    try {
      setIsSaving(true);
      setError(null);
      const updated = await setContactArchived(contact.id, !contact.isArchived);
      setContact(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update contact');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSnooze(days: number) {
    if (!contact) return;
    try {
      setIsSaving(true);
      setError(null);
      const updated = await snoozeContact(contact.id, days);
      setContact(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not snooze contact');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleClearSnooze() {
    if (!contact) return;
    try {
      setIsSaving(true);
      setError(null);
      const updated = await clearContactSnooze(contact.id);
      setContact(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not clear snooze');
    } finally {
      setIsSaving(false);
    }
  }

  if (!contact) {
    return <Text style={{ padding: 16 }}>Contact not found.</Text>;
  }


  const dueColor = getDueColor(contact.dueState);
  const dueDays = getDaysUntilDate(contact.nextDueAt);
  const birthdayDays = getDaysUntilBirthday(contact.birthday);

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }}>
      {/* Person header */}
      <View style={{ gap: 6 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          {contact.photoUri ? (
            <Image source={{ uri: contact.photoUri }} style={styles.avatarPhoto} />
          ) : (
            <Surface style={[styles.avatar, { backgroundColor: colors.primary }]} elevation={1}>
              <Text style={styles.avatarInitial}>{contact.name[0].toUpperCase()}</Text>
            </Surface>
          )}
          <View style={{ flex: 1 }}>
            <Text variant="headlineMedium" style={{ fontWeight: '700' }}>
              {contact.name}
            </Text>
            {contact.nickname ? (
              <Text variant="bodyMedium" style={{ color: colors.onSurfaceVariant }}>
                {contact.nickname}
              </Text>
            ) : null}
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: 6, marginTop: 2 }}>
          <Chip compact style={{ backgroundColor: colors.surfaceVariant }}>
            {contact.relationshipType}
          </Chip>
          {contact.cadenceSnoozedUntil ? (
            <Chip compact icon="clock-outline" style={{ backgroundColor: colors.tertiaryContainer }}>
              snoozed
            </Chip>
          ) : null}
          {contact.isPaused ? (
            <Chip compact icon="pause-circle-outline" style={{ backgroundColor: colors.surfaceVariant }}>
              paused
            </Chip>
          ) : null}
          {contact.isArchived ? (
            <Chip compact icon="archive-outline" style={{ backgroundColor: colors.surfaceVariant }}>
              archived
            </Chip>
          ) : null}
        </View>
      </View>

      {/* Due status banner */}
      {!contact.isPaused && !contact.isArchived ? (
        <Surface
          style={[styles.dueBanner, { backgroundColor: dueColor + '18', borderColor: dueColor }]}
          elevation={0}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Icon source={getDueIcon(contact.dueState)} size={28} color={dueColor} />
            <View>
              <Text variant="titleMedium" style={{ color: dueColor, fontWeight: '600' }}>
                {formatDueLabel(contact.nextDueAt)}
              </Text>
              <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>
                {contact.dueState === 'overdue'
                  ? `Next check-in was ${Math.abs(dueDays ?? 0)} days ago`
                  : contact.dueState === 'due'
                  ? "Time for a check-in — they'd love to hear from you"
                  : `${dueDays} days until your next check-in`}
              </Text>
            </View>
          </View>
        </Surface>
      ) : null}

      {/* Last contacted */}
      <Surface style={[styles.infoCard, { backgroundColor: colors.surfaceVariant }]} elevation={0}>
        <View style={styles.infoRow}>
          <Icon source="history" size={18} color={colors.onSurfaceVariant} />
          <Text variant="bodyMedium">{formatDaysSinceContact(contact.lastInteractionAt)}</Text>
        </View>
        <Divider style={{ marginVertical: 6 }} />
        <View style={styles.infoRow}>
          <Icon source="calendar-repeat" size={18} color={colors.onSurfaceVariant} />
          <Text variant="bodyMedium">Reaching out every {contact.cadence} days</Text>
        </View>
      </Surface>

      {/* Contact info */}
      {(contact.phone || contact.email || contact.birthday) ? (
        <Surface style={[styles.infoCard, { backgroundColor: colors.surfaceVariant }]} elevation={0}>
          {contact.phone ? (
            <View style={styles.infoRow}>
              <Icon source="phone" size={18} color={colors.onSurfaceVariant} />
              <Text variant="bodyMedium" style={{ flex: 1 }}>{contact.phone}</Text>
              <Pressable onPress={() => Linking.openURL(`tel:${contact.phone}`)} style={({ pressed }) => [{ padding: 4 }, pressed && { opacity: 0.5 }]}>
                <Icon source="phone-outgoing" size={18} color={colors.primary} />
              </Pressable>
              <Pressable onPress={() => Linking.openURL(`sms:${contact.phone}`)} style={({ pressed }) => [{ padding: 4 }, pressed && { opacity: 0.5 }]}>
                <Icon source="message-text" size={18} color={colors.primary} />
              </Pressable>
            </View>
          ) : null}
          {contact.email ? (
            <Pressable
              onPress={() => Linking.openURL(`mailto:${contact.email}`)}
              style={({ pressed }) => [styles.infoRow, pressed && { opacity: 0.6 }]}
            >
              <Icon source="email" size={18} color={colors.onSurfaceVariant} />
              <Text variant="bodyMedium" style={{ color: colors.primary, flex: 1 }}>{contact.email}</Text>
              <Icon source="open-in-new" size={14} color={colors.outline} />
            </Pressable>
          ) : null}
          {contact.birthday ? (
            <View style={styles.infoRow}>
              <Icon source="cake-variant" size={18} color={colors.onSurfaceVariant} />
              <Text variant="bodyMedium" style={{ flex: 1 }}>
                {formatBirthday(contact.birthday)}
                {birthdayDays !== null && birthdayDays <= 14
                  ? birthdayDays === 0
                    ? ' · today!'
                    : birthdayDays === 1
                    ? ' · tomorrow'
                    : ` · in ${birthdayDays} days`
                  : ''}
              </Text>
            </View>
          ) : null}
        </Surface>
      ) : null}

      {/* Social */}
      {(() => {
        try {
          const social = contact.socialJson ? (JSON.parse(contact.socialJson) as Record<string, string>) : {};
          const entries = Object.entries(social).filter(([, v]) => v);
          if (entries.length === 0) return null;

          const openSocial = (platform: string, handle: string) => {
            const clean = handle.replace('@', '').trim();
            const deepUrls: Record<string, string> = {
              instagram: `instagram://user?username=${clean}`,
              twitter: `https://x.com/${clean}`,
              linkedin: `https://linkedin.com/in/${clean}`,
            };
            const webUrl = `https://${platform}.com/${clean}`;
            const preferred = deepUrls[platform] ?? webUrl;
            Linking.openURL(preferred).catch(() => {
              Linking.openURL(webUrl);
            });
          };

          const platformIcon: Record<string, string> = {
            instagram: 'instagram',
            twitter: 'twitter',
            linkedin: 'linkedin',
          };

          return (
            <Surface style={[styles.socialCard, { backgroundColor: colors.surfaceVariant }]} elevation={0}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                <Icon source="at" size={16} color={colors.onSurfaceVariant} />
                <Text variant="labelMedium" style={{ color: colors.onSurfaceVariant }}>Social</Text>
              </View>
              <View style={{ gap: 8 }}>
                {entries.map(([platform, handle]) => (
                  <Pressable
                    key={platform}
                    onPress={() => openSocial(platform, handle)}
                    style={({ pressed }) => [
                      styles.socialRow,
                      pressed && { opacity: 0.6 },
                    ]}
                  >
                    <Icon source={platformIcon[platform] ?? 'link'} size={18} color={colors.primary} />
                    <Text variant="bodyMedium" style={{ color: colors.primary, flex: 1 }}>
                      @{handle.replace('@', '')}
                    </Text>
                    <Icon source="open-in-new" size={14} color={colors.outline} />
                  </Pressable>
                ))}
              </View>
            </Surface>
          );
        } catch {
          return null;
        }
      })()}

      {/* Notes */}
      {contact.notes ? (
        <Surface style={[styles.notesCard, { backgroundColor: colors.surfaceVariant }]} elevation={0}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
            <Icon source="note-text" size={16} color={colors.onSurfaceVariant} />
            <Text variant="labelMedium" style={{ color: colors.onSurfaceVariant }}>
              Notes
            </Text>
          </View>
          <Text variant="bodyMedium" style={{ lineHeight: 22 }}>
            {contact.notes}
          </Text>
        </Surface>
      ) : null}

      {/* Snooze */}
      {!contact.isPaused && !contact.isArchived ? (
        <Surface style={[styles.snoozeCard, { backgroundColor: colors.surfaceVariant }]} elevation={0}>
          <Text variant="titleSmall" style={{ fontWeight: '600', marginBottom: 4 }}>
            Snooze reminders
          </Text>
          <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant, marginBottom: 12 }}>
            Give yourself breathing room without pausing the relationship.
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {SNOOZE_OPTIONS.map((option) => (
              <Button
                key={option.key}
                mode="outlined"
                compact
                onPress={() => handleSnooze(option.days)}
                disabled={isSaving}
              >
                {option.label}
              </Button>
            ))}
            {contact.cadenceSnoozedUntil ? (
              <Button mode="text" compact onPress={handleClearSnooze} disabled={isSaving}>
                Clear
              </Button>
            ) : null}
          </View>
        </Surface>
      ) : null}

      {/* Recent activity */}
      <Surface style={[styles.activityCard, { backgroundColor: colors.surfaceVariant }]} elevation={0}>
        <Text variant="titleSmall" style={{ fontWeight: '600', marginBottom: 10 }}>
          Recent activity
        </Text>
        {recentInteractions.length === 0 ? (
          <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>
            No interactions logged yet.
          </Text>
        ) : (
          <View style={{ gap: 14 }}>
            {recentInteractions.slice(0, 5).map((interaction) => (
              <View key={interaction.id} style={{ gap: 4 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  {interaction.type ? (
                    <Chip
                      compact
                      icon={INTERACTION_ICONS[interaction.type] ? INTERACTION_ICONS[interaction.type] : 'circle'}
                      style={{ backgroundColor: colors.surfaceVariant }}
                    >
                      {interaction.type}
                    </Chip>
                  ) : null}
                  <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>
                    {formatOrbitDateTime(interaction.occurredAt)}
                  </Text>
                </View>
                {interaction.otherContacts.length > 0 ? (
                  <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant, marginLeft: 4 }}>
                    with {interaction.otherContacts.map((c) => c.name).join(', ')}
                  </Text>
                ) : null}
                {interaction.note ? (
                  <Text variant="bodyMedium" style={{ marginLeft: 4, lineHeight: 20 }}>
                    {interaction.note}
                  </Text>
                ) : null}
              </View>
            ))}
          </View>
        )}
      </Surface>

      {/* Actions */}
      <View style={{ gap: 8, marginTop: 4 }}>
        <Link href={{ pathname: '/interaction/new', params: { contactId: contact.id } }} asChild>
          <Button mode="contained" disabled={contact.isArchived} icon="plus">
            Log interaction
          </Button>
        </Link>
        <Link href={`/contact/edit/${contact.id}`} asChild>
          <Button mode="outlined" icon="pencil">
            Edit person
          </Button>
        </Link>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Button
            mode="outlined"
            icon={contact.isPaused ? 'play' : 'pause'}
            onPress={handlePauseToggle}
            disabled={isSaving}
            style={{ flex: 1 }}
          >
            {contact.isPaused ? 'Resume' : 'Pause'}
          </Button>
          <Button
            mode="outlined"
            icon={contact.isArchived ? 'archive-arrow-up' : 'archive-outline'}
            onPress={handleArchiveToggle}
            disabled={isSaving}
            style={{ flex: 1 }}
          >
            {contact.isArchived ? 'Restore' : 'Archive'}
          </Button>
        </View>
      </View>

      <HelperText type="error" visible={Boolean(error)}>
        {error ?? ''}
      </HelperText>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarPhoto: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  avatarInitial: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '700',
  },
  dueBanner: {
    padding: 14,
    borderRadius: 16,
    borderWidth: 1.5,
  },
  infoCard: {
    padding: 14,
    borderRadius: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  notesCard: {
    padding: 14,
    borderRadius: 16,
  },
  snoozeCard: {
    padding: 14,
    borderRadius: 16,
  },
  socialCard: {
    padding: 14,
    borderRadius: 16,
  },
  socialRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  activityCard: {
    padding: 14,
    borderRadius: 16,
  },
});
