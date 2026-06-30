import { useColorScheme } from 'react-native';
import { View, StyleSheet } from 'react-native';
import { Tabs } from 'expo-router';
import { useTheme, Icon, Text } from 'react-native-paper';
import { orbitTheme, orbitDarkTheme } from '@/lib/theme';
import { useUiStore } from '@/store/ui';

export default function TabsLayout() {
  const { colors } = useTheme();
  const systemColorScheme = useColorScheme();
  const themeMode = useUiStore((s) => s.themeMode);
  const isDark =
    themeMode === 'dark' || (themeMode === 'system' && systemColorScheme === 'dark');

  // Dark mode: surface-colored header; Light mode: branded purple header
  const headerBg = isDark ? colors.surface : colors.primary;
  const headerText = isDark ? colors.onSurface : colors.onPrimary;

  return (
    <View style={[styles.container, { backgroundColor: headerBg }]}>
      {/* Colored top strip — only in light mode */}
      {!isDark && <View style={[styles.topStrip, { backgroundColor: colors.primary }]} />}
      <Tabs
        screenOptions={{
          headerTitleAlign: 'left',
          tabBarStyle: [styles.tabBar, { backgroundColor: colors.surface }],
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.onSurfaceVariant,
          tabBarLabelStyle: styles.tabLabel,
          headerStyle: [styles.header, { backgroundColor: headerBg }],
          headerTitleStyle: [styles.headerTitle, { color: headerText }],
          headerTintColor: headerText,
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Home',
            tabBarLabel: 'Home',
            headerTitle: 'Orbit',
            tabBarIcon: ({ color, size }) => (
              <Icon source="home" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="people"
          options={{
            title: 'People',
            tabBarLabel: 'People',
            headerTitle: 'People',
            tabBarIcon: ({ color, size }) => (
              <Icon source="account-group" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            title: 'Settings',
            tabBarLabel: 'Settings',
            headerTitle: 'Settings',
            tabBarIcon: ({ color, size }) => (
              <Icon source="cog" size={size} color={color} />
            ),
          }}
        />
      </Tabs>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topStrip: {
    height: 4,
  },
  tabBar: {
    borderTopWidth: 0,
    elevation: 0,
    shadowOpacity: 0,
    height: 56,
    paddingBottom: 6,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  header: {
  },
  headerTitle: {
    fontWeight: '700' as const,
    fontSize: 18,
  },
});
