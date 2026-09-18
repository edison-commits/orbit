import { useEffect, useRef, useState } from 'react';
import { Stack, usePathname } from 'expo-router';
import { ActivityIndicator, View, Text, StatusBar, useColorScheme } from 'react-native';
import { PaperProvider } from 'react-native-paper';
import { runMigrations } from '@/db/client';
import { seedDevData } from '@/db/repositories/devSeed';
import { reminderService } from '@/features/reminders/reminderService';
import { createAppInitializationController } from '@/lib/appInitialization';
import { orbitTheme, orbitDarkTheme } from '@/lib/theme';
import { useUiStore } from '@/store/ui';

const PUBLIC_ROUTE_PATHS = new Set(['/landing', '/privacy', '/support', '/contact']);

export default function RootLayout() {
  const [isReady, setIsReady] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  const systemColorScheme = useColorScheme();
  const themeMode = useUiStore((s) => s.themeMode);
  const pathname = usePathname();
  const isPublicRoute = PUBLIC_ROUTE_PATHS.has(pathname);
  const isAppRouteActive = useRef(!isPublicRoute);
  isAppRouteActive.current = !isPublicRoute;
  const initialization = useRef<ReturnType<typeof createAppInitializationController> | null>(null);

  initialization.current ??= createAppInitializationController({
    isAppRouteActive: () => isAppRouteActive.current,
    configure: () => reminderService.configure(),
    migrate: runMigrations,
    seed: __DEV__ ? seedDevData : undefined,
    syncNotifications: () => reminderService.syncNotifications(),
    onSeedError: (error) => console.warn('Seed data error:', error),
    onSyncError: (error) => console.warn('Notification sync error:', error),
  });
  const appInitialization = initialization.current;

  const isDark =
    themeMode === 'dark' || (themeMode === 'system' && systemColorScheme === 'dark');
  const activeTheme = isDark ? orbitDarkTheme : orbitTheme;

  // Dark mode: use surface-colored headers for a native feel;
  // Light mode: keep the branded purple header
  const headerBg = isDark ? activeTheme.colors.surface : activeTheme.colors.primary;
  const headerText = isDark ? activeTheme.colors.onSurface : activeTheme.colors.onPrimary;

  useEffect(() => {
    useUiStore.getState().hydrate();
  }, []);

  useEffect(() => {
    if (isPublicRoute) return;

    let cancelled = false;
    appInitialization.initialize()
      .then((result) => {
        if (!cancelled && isAppRouteActive.current && result === 'ready') {
          setIsReady(true);
        }
      })
      .catch((err) => {
        if (cancelled || !isAppRouteActive.current) return;
        const isWebPreview = typeof window !== 'undefined' && 'fetch' in window;
        // On web, DB may not be available — still show the app without a scary console error.
        if (isWebPreview) {
          console.warn('Web preview storage unavailable:', err);
          setIsReady(true);
          setInitError('Web preview: database not available. Test on iOS/Android for full experience.');
        } else {
          console.error('Initialization error:', err);
          setInitError(err instanceof Error ? err.message : 'Failed to initialize');
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isPublicRoute]);

  if (!isPublicRoute && initError) {
    return (
      <PaperProvider theme={activeTheme}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <Text style={{ color: activeTheme.colors.onSurfaceVariant, fontSize: 14, textAlign: 'center' }}>{initError}</Text>
        </View>
      </PaperProvider>
    );
  }

  if (!isPublicRoute && !isReady) {
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
      <StatusBar
        barStyle="light-content"
        backgroundColor={headerBg}
      />
      <Stack
        screenOptions={{
          headerTitleAlign: 'left',
          headerStyle: {
            backgroundColor: headerBg,
          },
          headerTitleStyle: {
            color: headerText,
            fontWeight: '700' as const,
            fontSize: 18,
          },
          headerTintColor: headerText,
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
