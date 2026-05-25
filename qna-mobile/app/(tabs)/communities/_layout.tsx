import { Stack } from 'expo-router';
import { Platform, StyleSheet } from 'react-native';

import { HeaderBackButton } from '@/components/HeaderBackButton';
import { fonts, palette } from '@/constants/theme';

/**
 * Stack navigator for the Discover tab and its detail sub-routes
 * (community detail + question detail). Lives inside the (tabs) layout so the
 * bottom tab bar stays visible across pushes within this stack.
 */
export default function CommunitiesStackLayout() {
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
      {/* This Stack owns headers for all screens in the Discover tab. The
          Tabs.Screen for `communities` sets `headerShown: false` so we don't
          double-up. */}
      <Stack.Screen name="index" options={{ title: 'Discover' }} />
      <Stack.Screen name="[slug]" options={{ title: 'Community' }} />
      <Stack.Screen
        name="[slug]/questions/[id]"
        options={{ title: 'Question' }}
      />
    </Stack>
  );
}
