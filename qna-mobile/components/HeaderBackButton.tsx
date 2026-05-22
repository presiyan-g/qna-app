import { HeaderBackButton as NavHeaderBackButton } from '@react-navigation/elements';
import { useRouter } from 'expo-router';

import { palette } from '@/constants/theme';

export function HeaderBackButton() {
  const router = useRouter();

  function handlePress() {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace('/');
  }

  return (
    <NavHeaderBackButton
      displayMode="minimal"
      onPress={handlePress}
      tintColor={palette.primary}
    />
  );
}
