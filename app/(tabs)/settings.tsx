import { ScrollView } from 'react-native';
import { Card, List, Switch, Text } from 'react-native-paper';
import { settingsService } from '@/features/settings/settingsService';

export default function SettingsScreen() {
  const defaults = settingsService.getDefaults();

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
      <Text variant="headlineSmall">Settings</Text>
      <Card>
        <List.Item title="Default cadence" description={`${defaults.defaultCadenceDays} days`} />
        <List.Item
          title="Notifications"
          description="Local reminders are live on supported Expo builds once permissions are granted"
          right={() => <Switch value={defaults.notificationsEnabled} disabled />}
        />
        <List.Item
          title="Developer seed data"
          description="Enabled in development for faster iteration"
          right={() => <Switch value={defaults.developerSeedsEnabled} disabled />}
        />
      </Card>
    </ScrollView>
  );
}
