import { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import * as ExpoContacts from 'expo-contacts';
import { Button, Card, Checkbox, Searchbar, Text, useTheme } from 'react-native-paper';
import { getDb } from '@/db/client';
import { contactsRepository } from '@/db/repositories/contactsRepository';
import { createContact } from '@/features/contacts/contactService';
import { reminderService } from '@/features/reminders/reminderService';
import { settingsService } from '@/features/settings/settingsService';
import { DEFAULT_RELATIONSHIP_TYPE } from '@/lib/constants';

type ImportableContact = {
  id: string;
  sourceId?: string;
  name: string;
  phones: string[];
  emails: string[];
  birthday?: string | null;
};

function formatBirthday(contact: ExpoContacts.Contact) {
  const birthday = contact.birthday;
  if (!birthday?.month || !birthday?.day) return null;
  const month = String(birthday.month).padStart(2, '0');
  const day = String(birthday.day).padStart(2, '0');
  if (birthday.year) return `${birthday.year}-${month}-${day}`;
  return `${month}-${day}`;
}

function toImportable(contact: ExpoContacts.Contact): ImportableContact | null {
  const name = contact.name || [contact.firstName, contact.lastName].filter(Boolean).join(' ').trim();
  if (!name) return null;

  const sourceId = (contact as ExpoContacts.Contact & { id?: string }).id;

  const phones = contact.phoneNumbers?.map((phone) => phone.number?.trim()).filter((phone): phone is string => Boolean(phone)) ?? [];
  const emails = contact.emails?.map((email) => email.email?.trim()).filter((email): email is string => Boolean(email)) ?? [];

  return {
    id: sourceId ?? `${name}-${phones[0] ?? emails[0] ?? Math.random()}`,
    sourceId,
    name,
    phones,
    emails,
    birthday: formatBirthday(contact),
  };
}

function isLikelyDuplicate(contact: ImportableContact) {
  if (!contact.sourceId) return false;
  const existingSource = getDb().getFirstSync<{ source_id: string }>(
    'SELECT source_id FROM imported_contact_sources WHERE source_id = ?;',
    [contact.sourceId],
  );
  return Boolean(existingSource);
}

function normalize(value: string | null | undefined) {
  return value?.trim().toLowerCase() ?? '';
}

function normalizePhone(value: string | null | undefined) {
  return value?.replace(/\D/g, '') ?? '';
}

function findPossibleExistingMatches(selected: ImportableContact[]) {
  const existing = contactsRepository.listAll();
  return selected.filter((contact) => {
    const name = normalize(contact.name);
    const emails = new Set(contact.emails.map(normalize).filter(Boolean));
    const phones = new Set(contact.phones.map(normalizePhone).filter(Boolean));
    if (!name || (emails.size === 0 && phones.size === 0)) return false;

    return existing.some((row) => {
      if (normalize(row.name) !== name) return false;
      const rowEmail = normalize(row.email);
      const rowPhone = normalizePhone(row.phone);
      return Boolean((rowEmail && emails.has(rowEmail)) || (rowPhone && phones.has(rowPhone)));
    });
  });
}

function confirmPossibleDuplicates(matches: ImportableContact[]) {
  if (matches.length === 0) return Promise.resolve(true);
  const names = matches.slice(0, 3).map((contact) => contact.name).join(', ');
  const more = matches.length > 3 ? ` and ${matches.length - 3} more` : '';
  return new Promise<boolean>((resolve) => {
    Alert.alert(
      'Possible duplicates',
      `${names}${more} may already be in Orbit. Import them anyway?`,
      [
        { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
        { text: 'Import anyway', style: 'default', onPress: () => resolve(true) },
      ],
    );
  });
}

export default function ImportContactsScreen() {
  const { colors } = useTheme();
  const [contacts, setContacts] = useState<ImportableContact[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);

  const filteredContacts = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return contacts;
    return contacts.filter((contact) =>
      [contact.name, ...contact.phones, ...contact.emails].some((value) => value.toLowerCase().includes(q)),
    );
  }, [contacts, query]);

  async function loadContacts() {
    setIsLoading(true);
    setPermissionDenied(false);
    try {
      const permission = await ExpoContacts.requestPermissionsAsync();
      if (permission.status !== 'granted') {
        setPermissionDenied(true);
        setContacts([]);
        setSelectedIds(new Set());
        return;
      }

      const fields = [
        ExpoContacts.Fields.Name,
        ExpoContacts.Fields.FirstName,
        ExpoContacts.Fields.LastName,
        ExpoContacts.Fields.PhoneNumbers,
        ExpoContacts.Fields.Emails,
        ExpoContacts.Fields.Birthday,
      ];
      const pageSize = 500;
      let pageOffset = 0;
      let hasNextPage = true;
      const data: ExpoContacts.Contact[] = [];

      while (hasNextPage) {
        const result = await ExpoContacts.getContactsAsync({
          fields,
          sort: ExpoContacts.SortTypes.FirstName,
          pageSize,
          pageOffset,
        });
        data.push(...result.data);
        hasNextPage = Boolean(result.hasNextPage) && result.data.length > 0;
        pageOffset += result.data.length;
      }

      const rows = data
        .map(toImportable)
        .filter((contact): contact is ImportableContact => Boolean(contact))
        .sort((a, b) => a.name.localeCompare(b.name));
      setContacts(rows);
      setSelectedIds(new Set());
    } catch (error) {
      Alert.alert('Import failed', error instanceof Error ? error.message : 'Could not read contacts.');
    } finally {
      setIsLoading(false);
    }
  }

  function toggle(id: string) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleImport() {
    const selected = contacts.filter((contact) => selectedIds.has(contact.id));
    if (selected.length === 0) {
      Alert.alert('Select contacts', 'Choose at least one person to import.');
      return;
    }

    const possibleMatches = findPossibleExistingMatches(selected);
    const shouldContinue = await confirmPossibleDuplicates(possibleMatches);
    if (!shouldContinue) return;

    setIsImporting(true);
    try {
      const cadence = settingsService.getDefaultCadence();
      let createdCount = 0;
      let skippedCount = 0;
      const failedNames: string[] = [];
      const importedSourceIds = new Set<string>();

      for (const contact of selected) {
        if ((contact.sourceId && importedSourceIds.has(contact.sourceId)) || isLikelyDuplicate(contact)) {
          skippedCount += 1;
          continue;
        }

        try {
          await createContact({
            name: contact.name,
            nickname: null,
            photoUri: null,
            relationshipType: DEFAULT_RELATIONSHIP_TYPE,
            cadence,
            notes: null,
            birthday: contact.birthday ?? null,
            phone: contact.phones[0] ?? null,
            email: contact.emails[0] ?? null,
            socialJson: null,
          }, { syncReminders: false, importedSourceId: contact.sourceId });
          if (contact.sourceId) importedSourceIds.add(contact.sourceId);
          createdCount += 1;
        } catch {
          failedNames.push(contact.name);
        }
      }

      let reminderWarning: string | null = null;
      if (createdCount > 0) {
        try {
          await reminderService.syncNotifications();
        } catch (error) {
          reminderWarning = error instanceof Error ? error.message : 'Could not refresh reminders.';
        }
      }

      const details = [
        `Added ${createdCount} ${createdCount === 1 ? 'person' : 'people'} to Orbit.`,
        skippedCount > 0 ? `Skipped ${skippedCount} already-imported ${skippedCount === 1 ? 'contact' : 'contacts'}.` : null,
        failedNames.length > 0 ? `Could not import: ${failedNames.slice(0, 3).join(', ')}${failedNames.length > 3 ? '…' : ''}` : null,
        reminderWarning ? `Imported contacts were saved, but reminders could not be refreshed: ${reminderWarning}` : null,
      ].filter(Boolean).join('\n');

      Alert.alert(createdCount > 0 ? 'Import complete' : 'Nothing imported', details, [
        { text: 'Done', onPress: () => router.replace('/(tabs)/people') },
      ]);
    } catch (error) {
      Alert.alert('Import failed', error instanceof Error ? error.message : 'Could not import selected contacts.');
    } finally {
      setIsImporting(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
      <Text variant="headlineSmall">Import from Contacts</Text>
      <Text variant="bodyMedium" style={{ color: colors.onSurfaceVariant }}>
        Orbit reads your device contacts so you can choose which people to save. Only selected contacts are added, using the first phone and email on each device contact.
      </Text>

      <Button mode="contained" icon="contacts" loading={isLoading} disabled={isLoading || isImporting} onPress={loadContacts}>
        {contacts.length > 0 ? 'Reload device contacts' : 'Choose device contacts'}
      </Button>

      {permissionDenied ? (
        <Card>
          <Card.Content style={{ gap: 8 }}>
            <Text variant="titleMedium">Permission needed</Text>
            <Text variant="bodyMedium" style={{ color: colors.onSurfaceVariant }}>
              Enable Contacts access in system settings to import people into Orbit.
            </Text>
          </Card.Content>
        </Card>
      ) : null}

      {contacts.length > 0 ? (
        <>
          <Searchbar placeholder="Search contacts…" value={query} onChangeText={setQuery} />
          <View style={{ gap: 8 }}>
            {filteredContacts.map((contact) => {
              const selected = selectedIds.has(contact.id);
              return (
                <Pressable
                  key={contact.id}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: selected }}
                  accessibilityLabel={`Select ${contact.name}`}
                  onPress={() => toggle(contact.id)}
                  style={({ pressed }) => [
                    styles.row,
                    { backgroundColor: colors.surface, borderColor: selected ? colors.primary : colors.outlineVariant },
                    pressed && { opacity: 0.7 },
                  ]}
                >
                  <Checkbox status={selected ? 'checked' : 'unchecked'} />
                  <View style={{ flex: 1 }}>
                    <Text variant="bodyLarge" numberOfLines={1}>{contact.name}</Text>
                    <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }} numberOfLines={1}>
                      {[contact.phones[0], contact.emails[0], contact.birthday].filter(Boolean).join(' · ') || 'No extra details'}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
          <Button
            mode="contained"
            icon="account-plus"
            loading={isImporting}
            disabled={isImporting || selectedIds.size === 0}
            onPress={handleImport}
          >
            Import {selectedIds.size} selected
          </Button>
        </>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 58,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 14,
    paddingRight: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
});
