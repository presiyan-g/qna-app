import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { Platform, StyleSheet } from 'react-native';

import { fonts, palette } from '@/constants/theme';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: palette.primary,
        tabBarInactiveTintColor: palette.muted,
        tabBarStyle: {
          backgroundColor: palette.paper,
          borderTopColor: palette.line,
          borderTopWidth: StyleSheet.hairlineWidth,
          // Heights tuned for label visibility across platforms.
          // iOS gets extra bottom inset for the home indicator.
          height: Platform.OS === 'ios' ? 88 : 72,
          paddingTop: 8,
          paddingBottom: Platform.OS === 'ios' ? 28 : 12,
        },
        tabBarLabelStyle: {
          fontFamily: fonts.sans,
          fontSize: 11,
          fontWeight: '700',
          marginTop: 2,
        },
        headerStyle: {
          backgroundColor: palette.paper,
          borderBottomColor: palette.line,
          borderBottomWidth: StyleSheet.hairlineWidth,
        },
        headerTintColor: palette.primary,
        headerTitleStyle: {
          color: palette.primary,
          fontFamily: fonts.sans,
          fontSize: 17,
          fontWeight: '800',
        },
        headerShadowVisible: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          // Header shows brand name; tab label stays "Home".
          title: 'Quorum',
          tabBarLabel: 'Home',
          tabBarIcon: ({ color, focused, size }) => (
            <Ionicons
              name={focused ? 'home' : 'home-outline'}
              size={size}
              color={color}
            />
          ),
        }}
      />
      {/* Discover tab — its content is the Stack inside (tabs)/communities/.
          The Stack hides its header on `index` so we don't double-up with the
          tab header. */}
      <Tabs.Screen
        name="communities"
        options={{
          title: 'Discover',
          // Hide the Tabs-level header on this tab; the Stack inside owns
          // headers for the list (hidden) + detail screens.
          headerShown: false,
          tabBarIcon: ({ color, focused, size }) => (
            <Ionicons
              name={focused ? 'compass' : 'compass-outline'}
              size={size}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="live-questions"
        options={{
          title: 'Live',
          tabBarIcon: ({ color, focused, size }) => (
            <Ionicons
              name={focused ? 'radio' : 'radio-outline'}
              size={size}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, focused, size }) => (
            <Ionicons
              name={focused ? 'person-circle' : 'person-circle-outline'}
              size={size}
              color={color}
            />
          ),
        }}
      />

      {/* `users/[username]` lives in its own Stack at (tabs)/users/. Hide the
          directory from the tab bar — it's only reachable via navigation. */}
      <Tabs.Screen
        name="users"
        options={{ href: null, headerShown: false }}
      />
    </Tabs>
  );
}
