import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const TOKEN_KEY = 'qna.authToken';

export const tokenStorage = {
  async get() {
    if (Platform.OS === 'web') {
      return getWebStorage()?.getItem(TOKEN_KEY) ?? null;
    }

    return SecureStore.getItemAsync(TOKEN_KEY);
  },

  async set(token: string) {
    if (Platform.OS === 'web') {
      getWebStorage()?.setItem(TOKEN_KEY, token);
      return;
    }

    await SecureStore.setItemAsync(TOKEN_KEY, token);
  },

  async clear() {
    if (Platform.OS === 'web') {
      getWebStorage()?.removeItem(TOKEN_KEY);
      return;
    }

    await SecureStore.deleteItemAsync(TOKEN_KEY);
  },
};

function getWebStorage() {
  if (typeof window === 'undefined') return null;

  return window.localStorage;
}
