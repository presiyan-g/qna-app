import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { Platform, StyleSheet } from 'react-native';

import { fonts, palette } from '@/constants/theme';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        // No persistent header anywhere — each screen renders its own
        // back link and title inside the content area.
        headerShown: false,
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
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused, size }) => (
            <Ionicons
              name={focused ? 'home' : 'home-outline'}
              size={size}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="communities"
        options={{
          title: 'Discover',
          // Reset the Discover inner stack to the communities list whenever
          // the tab loses focus, so coming back always lands on the list
          // (matches the user expectation that Discover never "remembers"
          // a deep community/question route across tab switches).
          popToTopOnBlur: true,
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
      <Tabs.Screen name="users" options={{ href: null, popToTopOnBlur: true }} />
    </Tabs>
  );
}
