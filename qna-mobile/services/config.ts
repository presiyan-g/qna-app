import Constants from 'expo-constants';
import { useMemo } from 'react';

export function getRuntimeApiUrl() {
  const extra = Constants.expoConfig?.extra;
  const value = extra && typeof extra === 'object' ? extra.qnaApiUrl : null;

  return typeof value === 'string' && value.trim() ? value.trim() : 'http://localhost:3000/api';
}

export function useRuntimeApiUrl() {
  return useMemo(() => getRuntimeApiUrl(), []);
}
