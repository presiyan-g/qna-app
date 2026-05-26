import { Stack } from 'expo-router';

import { palette } from '@/constants/theme';

/**
 * Stack navigator for the Discover tab and its detail sub-routes
 * (community detail + question detail). Lives inside the (tabs) layout so the
 * bottom tab bar stays visible across pushes within this stack.
 *
 * Headers are hidden — each screen renders its own back link inside the
 * content area. Note: navigating to `/communities/[slug]` from another tab
 * (e.g. Home) will switch the tab indicator to Discover, because that route
 * lives inside this tab's stack. This is an accepted trade-off in exchange
 * for keeping the bottom tab bar visible during deep navigation.
 */
export default function CommunitiesStackLayout() {
  return (
    <Stack
      screenOptions={{
        contentStyle: { backgroundColor: palette.paper },
        headerShown: false,
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="[slug]" />
      <Stack.Screen name="[slug]/questions/[id]" />
    </Stack>
  );
}
