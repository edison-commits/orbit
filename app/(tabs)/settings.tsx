import { useState } from 'react';
import { ScrollView, View, StyleSheet, Alert } from 'react-native';
import { Button, Card, Chip, Divider, Text } from 'react-native-paper';
import { settingsService } from '@/features/settings/settingsService';
import { CADENCE_OPTIONS_DAYS } from '@/lib/constants';
import { orbitTheme } from '@/lib/theme';

const CADENCE_LABELS: Record<number, string> = {
  7: '1 week',
  14: '2 weeks',
  30: '1 month',
  60: '2 months',
  90: '3 months',
};

export default function SettingsScreen() {
  const [defaultCadence, setDefaultCadence] = useState(settingsService.getDefaultCadence());
  const [isResetting, setIsResetting] = useState(false);

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
