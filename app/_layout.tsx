import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { ActivityIndicator, View, Text, useColorScheme } from 'react-native';
import { PaperProvider } from 'react-native-paper';
import { runMigrations } from '@/db/client';
import { seedDevData } from '@/db/repositories/devSeed';
import { reminderService } from '@/features/reminders/reminderService';
import { orbitTheme, orbitDarkTheme } from '@/lib/theme';
import { useUiStore } from '@/store/ui';

export default function RootLayout() {
  const [isReady, setIsReady] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  const systemColorScheme = useColorScheme();
  const themeMode = useUiStore((s) => s.themeMode);

  const isDark =
    themeMode === 'dark' || (themeMode === 'system' && systemColorScheme === 'dark');
  const activeTheme = isDark ? orbitDarkTheme : orbitTheme;

  useEffect(() => {
    reminderService.configure();

    runMigrations()
      .then(async () => {
        if (__DEV__) {
          try {
            seedDevData();
          } catch (e) {
            console.warn('Seed data error:', e);
          }
        }
        try {
          await reminderService.syncNotifications();
        } catch (e) {
          console.warn('Notification sync error:', e);
        }
        setIsReady(true);
      })
      .catch((err) => {
        console.error('Initialization error:', err);
        // On web, DB may not be available — still show the app
        if (typeof window !== 'undefined' && 'fetch' in window) {
          setIsReady(true);
          setInitError('Web preview: database not available. Test on iOS/Android for full experience.');
        } else {
          setInitError(err instanceof Error ? err.message : 'Failed to initialize');
        }
      });
  }, []);

  if (initError) {
    return (
      <PaperProvider theme={activeTheme}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <Text style={{ color: activeTheme.colors.onSurfaceVariant, fontSize: 14, textAlign: 'center' }}>{initError}</Text>
        </View>
      </PaperProvider>
    );
  }

  if (!isReady) {
    return (
      <PaperProvider theme={activeTheme}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator />
        </View>
      </PaperProvider>
    );
  }

  return (
    <PaperProvider theme={activeTheme}>
      <Stack
        screenOptions={{
          headerTitleAlign: 'left',
          headerStyle: {
            backgroundColor: activeTheme.colors.primary,
          },
          headerTitleStyle: {
            color: activeTheme.colors.onPrimary,
            fontWeight: '700' as const,
            fontSize: 18,
          },
          headerTintColor: activeTheme.colors.onPrimary,
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="contact/new" options={{ title: 'New person' }} />
        <Stack.Screen name="contact/[id]" options={{ title: 'Person' }} />
        <Stack.Screen name="contact/edit/[id]" options={{ title: 'Edit person' }} />
        <Stack.Screen name="interaction/new" options={{ title: 'Log interaction' }} />
      </Stack>
    </PaperProvider>
  );
}
