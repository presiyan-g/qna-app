import { HeaderBackButton as NavHeaderBackButton } from '@react-navigation/elements';
import { type Href, useRouter } from 'expo-router';

import { palette } from '@/constants/theme';

export function HeaderBackButton() {
  const router = useRouter();

  function handlePress() {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    // Cast: Expo Router's typed routes don't expose `'/'` as a literal once
    // the home screen lives inside a group folder (e.g. `(tabs)/`), even
    // though `'/'` still resolves there at runtime.
    router.replace('/' as Href);
  }

  return (
    <NavHeaderBackButton
      displayMode="minimal"
      onPress={handlePress}
      tintColor={palette.primary}
    />
  );
}
