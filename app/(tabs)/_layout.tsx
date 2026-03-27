import { View, StyleSheet } from 'react-native';
import { Tabs } from 'expo-router';
import { orbitTheme } from '@/lib/theme';

export default function TabsLayout() {
  return (
    <View style={styles.container}>
      {/* Colored top strip */}
      <View style={styles.topStrip} />
      <Tabs
        screenOptions={{
          headerTitleAlign: 'left',
          tabBarStyle: styles.tabBar,
          tabBarActiveTintColor: orbitTheme.colors.primary,
          tabBarInactiveTintColor: '#9CA3AF',
          tabBarLabelStyle: styles.tabLabel,
          headerStyle: styles.header,
          headerTitleStyle: styles.headerTitle,
          headerTintColor: '#FFFFFF',
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Home',
            tabBarLabel: 'Home',
            headerTitle: 'Orbit',
          }}
        />
        <Tabs.Screen
          name="people"
          options={{
            title: 'People',
            tabBarLabel: 'People',
            headerTitle: 'People',
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            title: 'Settings',
            tabBarLabel: 'Settings',
            headerTitle: 'Settings',
          }}
        />
      </Tabs>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: orbitTheme.colors.primary,
  },
  topStrip: {
    height: 4,
    backgroundColor: orbitTheme.colors.primary,
  },
  tabBar: {
    backgroundColor: '#FFFFFF',
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
    backgroundColor: orbitTheme.colors.primary,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontWeight: '700' as const,
    fontSize: 18,
  },
});
