import { useState, useCallback, useEffect } from 'react';
import { ScrollView, View, StyleSheet, Alert, Linking } from 'react-native';
import { Button, Card, Chip, Divider, Text, TextInput, IconButton, ActivityIndicator, Switch, useTheme } from 'react-native-paper';
import { settingsService } from '@/features/settings/settingsService';
import { reminderService, type ReminderSyncResult } from '@/features/reminders/reminderService';
import { CADENCE_OPTIONS_DAYS } from '@/lib/constants';
import { useUiStore, type ThemeMode } from '@/store/ui';
import { feedbackRepository, Feedback, FeedbackType } from '@/db/repositories/feedbackRepository';
import {
  createBackup,
  listBackups,
  restoreBackup,
  isConfigured,
  getServiceKey,
  setServiceKey,
  clearServiceKey,
  testConnection,
} from '@/lib/secureBackup';

const CADENCE_LABELS: Record<number, string> = {
  7: '1 week',
  14: '2 weeks',
  30: '1 month',
  60: '2 months',
  90: '3 months',
};

const FEEDBACK_TYPES: { value: FeedbackType; label: string }[] = [
  { value: 'feature', label: '✨ Feature' },
  { value: 'bug', label: '🐛 Bug' },
  { value: 'other', label: '💬 Other' },
];

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default function SettingsScreen() {
  const [defaultCadence, setDefaultCadence] = useState(settingsService.getDefaultCadence());
  const [notificationsEnabled, setNotificationsEnabled] = useState(settingsService.getNotificationsEnabled());
  const [notificationStatus, setNotificationStatus] = useState<ReminderSyncResult | null>(null);
  const [isSyncingNotifications, setIsSyncingNotifications] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const themeMode = useUiStore((s) => s.themeMode);
  const setThemeMode = useUiStore((s) => s.setThemeMode);
  const { colors: themeColors } = useTheme();

  // Backup state
  const [backupList, setBackupList] = useState<{ name: string; created_at: string }[]>([]);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [showBackupList, setShowBackupList] = useState(false);
  const [backupConfigured, setBackupConfigured] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [isSavingKey, setIsSavingKey] = useState(false);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'ok' | 'error'>('idle');
  const backupConnectionReady = connectionStatus === 'ok';
  const backupActionInFlight = isBackingUp || isRestoring || isTestingConnection;

  // Feedback state
  const [feedbackType, setFeedbackType] = useState<FeedbackType>('feature');
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedbackList, setFeedbackList] = useState<Feedback[]>(() => feedbackRepository.getAll());

  function refreshFeedback() {
    setFeedbackList(feedbackRepository.getAll());
  }

  function handleCadenceChange(days: number) {
    setDefaultCadence(days);
    settingsService.setDefaultCadence(days);
  }

  async function handleNotificationsToggle(enabled: boolean) {
    setIsSyncingNotifications(true);
    try {
      const result = await reminderService.setNotificationsEnabled(enabled);
      setNotificationsEnabled(result.notificationsEnabled);
      setNotificationStatus(result);

      if (enabled && !result.permissionGranted) {
        Alert.alert(
          'Notifications not enabled',
          'Orbit could not get notification permission. After enabling notifications in system settings, return here and turn reminders on again.',
        );
      }
    } catch (e: unknown) {
      Alert.alert('Notification setup failed', e instanceof Error ? e.message : 'Could not update reminders.');
    } finally {
      setIsSyncingNotifications(false);
    }
  }

  function handleResetData() {
    Alert.alert(
      'Reset all data?',
      'This will permanently delete all your contacts, interactions, and settings. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset everything',
          style: 'destructive',
          onPress: async () => {
            setIsResetting(true);
            try {
              settingsService.resetAllData();
              setDefaultCadence(30);
              setNotificationsEnabled(false);
              try {
                const reminderStatus = await reminderService.setNotificationsEnabled(false);
                setNotificationStatus(reminderStatus);
                Alert.alert('Done', 'All data has been cleared and reminders have been turned off.');
              } catch (reminderError) {
                setNotificationStatus({ scheduled: 0, permissionGranted: false, notificationsEnabled: false });
                Alert.alert(
                  'Data cleared',
                  `All data has been cleared. Orbit could not confirm scheduled reminders were canceled: ${
                    reminderError instanceof Error ? reminderError.message : 'Unknown error'
                  }`,
                );
              }
            } catch (e: unknown) {
              Alert.alert('Reset failed', e instanceof Error ? e.message : 'Could not clear all data.');
            } finally {
              setIsResetting(false);
            }
          },
        },
      ],
    );
  }

  function handleSubmitFeedback() {
    const msg = feedbackMessage.trim();
    if (!msg) {
      Alert.alert('Oops', 'Please write something before submitting.');
      return;
    }
    setIsSubmitting(true);
    try {
      feedbackRepository.submit(feedbackType, msg);
      setFeedbackMessage('');
      refreshFeedback();
      Alert.alert('Thanks!', 'Your feedback has been saved locally.');
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleDeleteFeedback(id: string) {
    Alert.alert('Delete this feedback?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          feedbackRepository.delete(id);
          refreshFeedback();
        },
      },
    ]);
  }

  function handleEmailFeedback() {
    const body = encodeURIComponent(feedbackMessage.trim());
    const subject = encodeURIComponent('[Orbit Feedback]');
    Linking.openURL(`mailto:edison@idiotic.solutions?subject=${subject}&body=${body}`);
  }

  async function handleBackup() {
    setIsBackingUp(true);
    try {
      const filename = await createBackup();
      Alert.alert('Backup saved', `Uploaded as ${filename}`);
      await loadBackupList();
    } catch (e: unknown) {
      Alert.alert('Backup failed', e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setIsBackingUp(false);
    }
  }

  async function loadBackupList() {
    try {
      const list = await listBackups();
      setBackupList(list);
    } catch (e: unknown) {
      // silently fail — will be empty
    }
  }

  function handleShowBackups() {
    if (!showBackupList) {
      loadBackupList();
    }
    setShowBackupList(!showBackupList);
  }

  async function handleRestore(filename: string) {
    Alert.alert(
      'Restore backup?',
      'This will replace local contacts, interactions, imported-contact markers, feedback, and the default check-in cadence. This cannot be undone unless you made a fresh backup first.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Restore',
          style: 'destructive',
          onPress: async () => {
            setIsRestoring(true);
            try {
              await restoreBackup(filename);
              setDefaultCadence(settingsService.getDefaultCadence());
              try {
                const reminderStatus = await reminderService.syncNotifications();
                setNotificationStatus(reminderStatus);
                setNotificationsEnabled(reminderStatus.notificationsEnabled);
                Alert.alert(
                  'Done',
                  reminderStatus.notificationsEnabled && !reminderStatus.permissionGranted
                    ? 'Your data has been restored. This device has reminders turned on, but Orbit needs notification permission before reminders can be scheduled.'
                    : 'Your data has been restored.',
                );
              } catch (reminderError) {
                Alert.alert(
                  'Data restored',
                  `Your data has been restored, but Orbit could not refresh reminders: ${
                    reminderError instanceof Error ? reminderError.message : 'Unknown error'
                  }`,
                );
              }
              setShowBackupList(false);
            } catch (e: unknown) {
              Alert.alert('Restore failed', e instanceof Error ? e.message : 'Unknown error');
            } finally {
              setIsRestoring(false);
            }
          },
        },
      ],
    );
  }

  async function handleSaveApiKey() {
    const trimmed = apiKeyInput.trim();
    if (!trimmed.startsWith('eyJ')) {
      Alert.alert('Invalid key', 'The Supabase service role key should start with "eyJ..."');
      return;
    }
    setIsSavingKey(true);
    try {
      await setServiceKey(trimmed);
      setBackupConfigured(true);
      setApiKeyInput('');
      setConnectionStatus('idle');
      const result = await testConnection();
      setConnectionStatus(result.ok ? 'ok' : 'error');
      Alert.alert('Saved', 'Your Supabase key has been saved securely on this device.');
    } catch (e: unknown) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed to save key');
    } finally {
      setIsSavingKey(false);
    }
  }

  async function handleTestConnection() {
    setIsTestingConnection(true);
    setConnectionStatus('idle');
    try {
      const result = await testConnection();
      setConnectionStatus(result.ok ? 'ok' : 'error');
      if (result.ok) {
        Alert.alert('Connected', 'Successfully verified access to the orbit-backups bucket.');
      } else {
        Alert.alert('Connection failed', result.error ?? 'Could not connect.');
      }
    } finally {
      setIsTestingConnection(false);
    }
  }

  async function handleClearApiKey() {
    Alert.alert('Remove API key?', 'You will need to re-enter it to use cloud backup.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          await clearServiceKey();
          setBackupConfigured(false);
          setConnectionStatus('idle');
          setBackupList([]);
          setShowBackupList(false);
        },
      },
    ]);
  }

  // Load configured state on mount
  useEffect(() => {
    (async () => {
      const configured = await isConfigured();
      setBackupConfigured(configured);
      if (configured) {
        const result = await testConnection();
        setConnectionStatus(result.ok ? 'ok' : 'error');
      }
      try {
        const reminderStatus = await reminderService.syncNotifications();
        setNotificationStatus(reminderStatus);
        setNotificationsEnabled(reminderStatus.notificationsEnabled);
      } catch {
        // Leave reminder status empty; the toggle can retry explicitly.
      }
    })();
  }, []);

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
      {/* Default cadence */}
      <Card>
        <Card.Content style={{ gap: 12 }}>
          <Text variant="titleMedium">Default check-in cadence</Text>
          <Text variant="bodySmall" style={{ color: themeColors.onSurfaceVariant, marginTop: -6 }}>
            Used as the starting value when adding a new person.
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {CADENCE_OPTIONS_DAYS.map((days) => (
              <Chip
                key={days}
                selected={defaultCadence === days}
                accessibilityState={{ selected: defaultCadence === days }}
                accessibilityLabel={`Set default check-in cadence to ${CADENCE_LABELS[days] ?? `${days} days`}`}
                onPress={() => handleCadenceChange(days)}
                style={defaultCadence === days ? { backgroundColor: themeColors.primaryContainer } : {}}
                textStyle={defaultCadence === days ? { color: themeColors.onPrimaryContainer } : {}}
              >
                {CADENCE_LABELS[days] ?? `${days} days`}
              </Chip>
            ))}
          </View>
        </Card.Content>
      </Card>

      {/* Reminders */}
      <Card>
        <Card.Content style={{ gap: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Text variant="titleMedium">Check-in reminders</Text>
              <Text variant="bodySmall" style={{ color: themeColors.onSurfaceVariant, marginTop: 2 }}>
                Schedule private local notifications when someone is due. Orbit only shows names — never notes.
              </Text>
            </View>
            <Switch
              value={notificationsEnabled}
              disabled={isSyncingNotifications}
              onValueChange={handleNotificationsToggle}
              accessibilityLabel={notificationsEnabled ? 'Turn off check-in reminders' : 'Turn on check-in reminders'}
            />
          </View>
          {isSyncingNotifications ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <ActivityIndicator size="small" />
              <Text variant="bodySmall" style={{ color: themeColors.onSurfaceVariant }}>
                Updating reminder schedule…
              </Text>
            </View>
          ) : notificationStatus ? (
            <Text variant="bodySmall" style={{ color: themeColors.onSurfaceVariant }}>
              {notificationStatus.notificationsEnabled && notificationStatus.permissionGranted
                ? `${notificationStatus.scheduled} reminder${notificationStatus.scheduled === 1 ? '' : 's'} scheduled.`
                : notificationsEnabled
                  ? 'Notifications need permission before reminders can be scheduled.'
                  : 'Reminders are off.'}
            </Text>
          ) : (
            <Text variant="bodySmall" style={{ color: themeColors.onSurfaceVariant }}>
              {notificationsEnabled ? 'Reminders will stay synced as you add people, snooze, pause, archive, or log interactions.' : 'Reminders are off — turn them on when you want Orbit to nudge you.'}
            </Text>
          )}
        </Card.Content>
      </Card>

      {/* Appearance */}
      <Card>
        <Card.Content style={{ gap: 12 }}>
          <Text variant="titleMedium">Appearance</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {(['system', 'light', 'dark'] as ThemeMode[]).map((mode) => (
              <Chip
                key={mode}
                selected={themeMode === mode}
                accessibilityState={{ selected: themeMode === mode }}
                accessibilityLabel={`Use ${mode} appearance`}
                onPress={() => setThemeMode(mode)}
                style={themeMode === mode ? { backgroundColor: themeColors.primaryContainer } : {}}
                textStyle={themeMode === mode ? { color: themeColors.onPrimaryContainer } : {}}
                icon={mode === 'system' ? 'theme-light-dark' : mode === 'light' ? 'white-balance-sunny' : 'moon-waning-crescent'}
              >
                {mode.charAt(0).toUpperCase() + mode.slice(1)}
              </Chip>
            ))}
          </View>
        </Card.Content>
      </Card>

      {/* Feedback */}
      <Card>
        <Card.Content style={{ gap: 12 }}>
          <Text variant="titleMedium">Feedback &amp; Features</Text>
          <Text variant="bodySmall" style={{ color: themeColors.onSurfaceVariant, marginTop: -6 }}>
            Found a bug or want something new? Let us know below.
          </Text>

          {/* Type selector */}
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {FEEDBACK_TYPES.map((t) => (
              <Chip
                key={t.value}
                selected={feedbackType === t.value}
                accessibilityState={{ selected: feedbackType === t.value }}
                accessibilityLabel={`Set feedback type to ${t.label}`}
                onPress={() => setFeedbackType(t.value)}
                style={feedbackType === t.value ? { backgroundColor: themeColors.primaryContainer } : {}}
                textStyle={feedbackType === t.value ? { color: themeColors.onPrimaryContainer } : {}}
              >
                {t.label}
              </Chip>
            ))}
          </View>

          {/* Message input */}
          <TextInput
            mode="outlined"
            placeholder={
              feedbackType === 'feature'
                ? "Describe the feature you'd like to see..."
                : feedbackType === 'bug'
                ? "Describe what went wrong and how it happened..."
                : 'Share your thoughts...'
            }
            value={feedbackMessage}
            onChangeText={setFeedbackMessage}
            accessibilityLabel="Feedback message"
            multiline
            numberOfLines={3}
            style={{ minHeight: 80 }}
          />

          {/* Submit buttons */}
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Button
              mode="contained"
              onPress={handleSubmitFeedback}
              loading={isSubmitting}
              disabled={isSubmitting}
              accessibilityLabel="Save feedback locally"
              style={{ flex: 1 }}
            >
              Save locally
            </Button>
            <Button
              mode="outlined"
              onPress={handleEmailFeedback}
              disabled={!feedbackMessage.trim()}
              accessibilityLabel="Email feedback"
            >
              Email
            </Button>
          </View>
        </Card.Content>
      </Card>

      {/* Feedback history */}
      {feedbackList.length > 0 && (
        <Card>
          <Card.Content style={{ gap: 8 }}>
            <Text variant="titleMedium">Your submissions</Text>
            {feedbackList.map((item) => (
              <View
                key={item.id}
                style={{
                  flexDirection: 'row',
                  alignItems: 'flex-start',
                  gap: 8,
                  paddingVertical: 8,
                  borderBottomWidth: StyleSheet.hairlineWidth,
                  borderBottomColor: themeColors.outlineVariant,
                }}
              >
                <View style={{ flex: 1, gap: 2 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text variant="labelSmall" style={{ color: themeColors.outline, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                      {item.type}
                    </Text>
                    <Text variant="bodySmall" style={{ color: themeColors.outline }}>
                      {timeAgo(item.created_at)}
                    </Text>
                  </View>
                  <Text variant="bodyMedium" style={{ lineHeight: 20 }}>{item.message}</Text>
                </View>
                <IconButton
                  icon="close"
                  size={16}
                  accessibilityLabel={`Delete ${item.type} feedback from ${timeAgo(item.created_at)}`}
                  onPress={() => handleDeleteFeedback(item.id)}
                  style={{ margin: 0 }}
                />
              </View>
            ))}
          </Card.Content>
        </Card>
      )}

      {/* Cloud Backup */}
      <Card>
        <Card.Content style={{ gap: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Text variant="titleMedium">☁️ Cloud Backup</Text>
              <Text variant="bodySmall" style={{ color: themeColors.onSurfaceVariant, marginTop: 2 }}>
                Back up contacts, tags, interaction history, feedback, and import markers to Orbit’s configured Supabase bucket.
              </Text>
            </View>
            <Chip compact icon={backupConfigured ? (connectionStatus === 'ok' ? 'cloud-check' : 'cloud-alert') : 'cloud-off-outline'}>
              {backupConfigured ? (connectionStatus === 'ok' ? 'connected' : 'needs check') : 'off'}
            </Chip>
          </View>

          <View style={{ backgroundColor: themeColors.surfaceVariant, borderRadius: 12, padding: 12, gap: 4 }}>
            <Text variant="labelMedium">Restore safety</Text>
            <Text variant="bodySmall" style={{ color: themeColors.onSurfaceVariant }}>
              Restoring replaces the local database, then re-syncs this device’s reminder schedule. Notification consent stays device-local and is not imported from backups.
            </Text>
          </View>

          {!backupConfigured ? (
            <>
              <Text variant="bodySmall" style={{ color: themeColors.onSurfaceVariant }}>
                Paste the Supabase service role key for Orbit’s configured backup project. Orbit stores the key in SecureStore on this device only.
              </Text>
              <TextInput
                mode="outlined"
                placeholder="eyJhbG...VCJ9..."
                value={apiKeyInput}
                onChangeText={setApiKeyInput}
                autoCapitalize="none"
                autoCorrect={false}
                secureTextEntry
                accessibilityLabel="Supabase service role key"
              />
              <Button
                mode="contained"
                onPress={handleSaveApiKey}
                loading={isSavingKey}
                disabled={isSavingKey || !apiKeyInput.trim()}
                accessibilityLabel="Save Supabase service role key for cloud backup"
              >
                Save service role key
              </Button>
              <Text variant="labelSmall" style={{ color: themeColors.outline }}>
                Service role keys can grant broad access in the Supabase project. Use a dedicated backup project when possible, and never share this key.
              </Text>
            </>
          ) : (
            <>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text variant="labelMedium" style={{ color: connectionStatus === 'ok' ? themeColors.primary : themeColors.error, fontWeight: '600' }}>
                  {connectionStatus === 'ok' ? 'Backup connection verified' : 'Backup connection needs attention'}
                </Text>
                <View style={{ flex: 1 }} />
                <Button mode="text" compact onPress={handleTestConnection} loading={isTestingConnection} disabled={backupActionInFlight} accessibilityLabel="Test cloud backup connection">
                  {isTestingConnection ? 'Testing…' : 'Test'}
                </Button>
                <Button mode="text" compact textColor={themeColors.error} onPress={handleClearApiKey} disabled={backupActionInFlight} accessibilityLabel="Remove cloud backup API key">
                  Remove
                </Button>
              </View>

              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Button
                  mode="contained"
                  onPress={handleBackup}
                  loading={isBackingUp}
                  disabled={backupActionInFlight || !backupConnectionReady}
                  style={{ flex: 1 }}
                  icon="cloud-upload"
                  accessibilityLabel="Back up Orbit data now"
                >
                  {isBackingUp ? 'Uploading…' : 'Backup now'}
                </Button>
                <Button
                  mode="outlined"
                  onPress={handleShowBackups}
                  disabled={backupActionInFlight || !backupConnectionReady}
                  accessibilityLabel={showBackupList ? 'Hide cloud backup list' : 'Show cloud backups to restore'}
                >
                  {showBackupList ? 'Hide restores' : 'Choose restore'}
                </Button>
              </View>

              {showBackupList && (
                <View style={{ gap: 8, marginTop: 4 }}>
                  <Text variant="bodySmall" style={{ color: themeColors.onSurfaceVariant }}>
                    Make a fresh backup before restoring if you might want to undo today’s local changes.
                  </Text>
                  {backupList.length === 0 ? (
                    <Text variant="bodySmall" style={{ color: themeColors.outline }}>
                      No backups found — tap "Backup now" to create one.
                    </Text>
                  ) : (
                    backupList.map((b) => (
                      <View key={b.name} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <View style={{ flex: 1 }}>
                          <Text variant="bodySmall">
                            {b.name.replace('orbit_backup_', '').replace('.json', '')}
                          </Text>
                          <Text variant="labelSmall" style={{ color: themeColors.outline }}>
                            {b.created_at ? `${new Date(b.created_at).toLocaleDateString()} · ${new Date(b.created_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}` : 'Date unavailable'}
                          </Text>
                        </View>
                        <Button
                          mode="text"
                          compact
                          loading={isRestoring}
                          onPress={() => handleRestore(b.name)}
                          disabled={backupActionInFlight || !backupConnectionReady}
                          accessibilityLabel={`Restore backup ${b.name}`}
                        >
                          Restore
                        </Button>
                      </View>
                    ))
                  )}
                </View>
              )}
            </>
          )}
        </Card.Content>
      </Card>

      {/* Data */}
      <Card>
        <Card.Content style={{ gap: 12 }}>
          <Text variant="titleMedium">Data</Text>
          <Text variant="bodySmall" style={{ color: themeColors.onSurfaceVariant }}>
            All your data lives on this device. Resetting clears everything — contacts, interaction history, and settings.
          </Text>
          <Button
            mode="outlined"
            icon="delete-outline"
            textColor={themeColors.error}
            style={{ borderColor: themeColors.error }}
            onPress={handleResetData}
            loading={isResetting}
            accessibilityLabel="Reset all Orbit data"
          >
            Reset all data
          </Button>
        </Card.Content>
      </Card>

      {/* About */}
      <Card>
        <Card.Content style={{ gap: 8 }}>
          <Text variant="titleMedium">About Orbit</Text>
          <Text variant="bodySmall" style={{ color: themeColors.onSurfaceVariant }}>
            Version 1.0.0{'\n'}
            Your data is stored locally on this device. Use Cloud Backup in Settings to export to Supabase.
          </Text>
        </Card.Content>
      </Card>
    </ScrollView>
  );
}
