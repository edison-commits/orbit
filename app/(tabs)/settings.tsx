import { useState, useCallback } from 'react';
import { ScrollView, View, StyleSheet, Alert, Linking } from 'react-native';
import { Button, Card, Chip, Divider, Text, TextInput, IconButton } from 'react-native-paper';
import { settingsService } from '@/features/settings/settingsService';
import { CADENCE_OPTIONS_DAYS } from '@/lib/constants';
import { orbitTheme } from '@/lib/theme';
import { feedbackRepository, Feedback, FeedbackType } from '@/db/repositories/feedbackRepository';

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
  const [isResetting, setIsResetting] = useState(false);

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

  function handleResetData() {
    Alert.alert(
      'Reset all data?',
      'This will permanently delete all your contacts, interactions, and settings. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset everything',
          style: 'destructive',
          onPress: () => {
            setIsResetting(true);
            settingsService.resetAllData();
            setDefaultCadence(30);
            setIsResetting(false);
            Alert.alert('Done', 'All data has been cleared.');
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

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
      {/* Default cadence */}
      <Card>
        <Card.Content style={{ gap: 12 }}>
          <Text variant="titleMedium">Default check-in cadence</Text>
          <Text variant="bodySmall" style={{ color: '#666', marginTop: -6 }}>
            Used as the starting value when adding a new person.
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {CADENCE_OPTIONS_DAYS.map((days) => (
              <Chip
                key={days}
                selected={defaultCadence === days}
                onPress={() => handleCadenceChange(days)}
                style={defaultCadence === days ? { backgroundColor: orbitTheme.colors.primaryContainer } : {}}
                textStyle={defaultCadence === days ? { color: orbitTheme.colors.onPrimaryContainer } : {}}
              >
                {CADENCE_LABELS[days] ?? `${days} days`}
              </Chip>
            ))}
          </View>
        </Card.Content>
      </Card>

      {/* Feedback */}
      <Card>
        <Card.Content style={{ gap: 12 }}>
          <Text variant="titleMedium">Feedback &amp; Features</Text>
          <Text variant="bodySmall" style={{ color: '#666', marginTop: -6 }}>
            Found a bug or want something new? Let us know below.
          </Text>

          {/* Type selector */}
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {FEEDBACK_TYPES.map((t) => (
              <Chip
                key={t.value}
                selected={feedbackType === t.value}
                onPress={() => setFeedbackType(t.value)}
                style={feedbackType === t.value ? { backgroundColor: orbitTheme.colors.primaryContainer } : {}}
                textStyle={feedbackType === t.value ? { color: orbitTheme.colors.onPrimaryContainer } : {}}
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
              style={{ flex: 1 }}
            >
              Save locally
            </Button>
            <Button
              mode="outlined"
              onPress={handleEmailFeedback}
              disabled={!feedbackMessage.trim()}
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
                  borderBottomColor: '#E5E7EB',
                }}
              >
                <View style={{ flex: 1, gap: 2 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text variant="labelSmall" style={{ color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                      {item.type}
                    </Text>
                    <Text variant="bodySmall" style={{ color: '#9CA3AF' }}>
                      {timeAgo(item.created_at)}
                    </Text>
                  </View>
                  <Text variant="bodyMedium" style={{ lineHeight: 20 }}>{item.message}</Text>
                </View>
                <IconButton
                  icon="close"
                  size={16}
                  onPress={() => handleDeleteFeedback(item.id)}
                  style={{ margin: 0 }}
                />
              </View>
            ))}
          </Card.Content>
        </Card>
      )}

      {/* Data */}
      <Card>
        <Card.Content style={{ gap: 12 }}>
          <Text variant="titleMedium">Data</Text>
          <Text variant="bodySmall" style={{ color: '#666' }}>
            All your data lives on this device. Resetting clears everything — contacts, interaction history, and settings.
          </Text>
          <Button
            mode="outlined"
            icon="delete-outline"
            textColor={orbitTheme.colors.error}
            style={{ borderColor: orbitTheme.colors.error }}
            onPress={handleResetData}
            loading={isResetting}
          >
            Reset all data
          </Button>
        </Card.Content>
      </Card>

      {/* About */}
      <Card>
        <Card.Content style={{ gap: 8 }}>
          <Text variant="titleMedium">About Orbit</Text>
          <Text variant="bodySmall" style={{ color: '#666' }}>
            Version 1.0.0{'\n'}
            Your data is stored locally on this device and never leaves it.
          </Text>
        </Card.Content>
      </Card>
    </ScrollView>
  );
}
