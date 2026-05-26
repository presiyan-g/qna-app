import { Stack } from 'expo-router';
import { Platform, StyleSheet } from 'react-native';

import { HeaderBackButton } from '@/components/HeaderBackButton';
import { fonts, palette } from '@/constants/theme';

/**
 * Stack navigator for public user profile routes (`/users/[username]`). Lives
 * inside the (tabs) layout so the bottom tab bar stays visible when navigating
 * to a profile from a community member list or similar entry points.
 */
export default function UsersStackLayout() {
  return (
    <Stack
      screenOptions={{
        contentStyle: { backgroundColor: palette.paper },
        headerBackTitle: 'Back',
        ...(Platform.OS === 'web'
          ? {
              headerLeft: () => <HeaderBackButton />,
              headerLeftContainerStyle: { paddingLeft: 16 },
            }
          : null),
        headerShadowVisible: false,
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
      }}
    >
      <Stack.Screen name="[username]" options={{ title: 'Profile' }} />
    </Stack>
  );
}
