import { Stack } from 'expo-router';

import { palette } from '@/constants/theme';

/**
 * Stack navigator for public user profile routes (`/users/[username]`). Lives
 * inside the (tabs) layout so the bottom tab bar stays visible when navigating
 * to a profile from a community member list or similar entry points. Headers
 * are hidden — the screen renders its own back link inside the content area.
 */
export default function UsersStackLayout() {
  return (
    <Stack
      screenOptions={{
        contentStyle: { backgroundColor: palette.paper },
        headerShown: false,
      }}
    >
      <Stack.Screen name="[username]" />
    </Stack>
  );
}
