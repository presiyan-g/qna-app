import Constants from 'expo-constants';
import { getExpoGoProjectConfig } from 'expo';
import { useMemo } from 'react';
import { Platform } from 'react-native';

import { resolveRuntimeApiUrl } from './config-url';

export function getRuntimeApiUrl() {
  const extra = Constants.expoConfig?.extra;
  const value = extra && typeof extra === 'object' ? extra.qnaApiUrl : null;

  return resolveRuntimeApiUrl({
    configuredApiUrl: value,
    expoDebuggerHost: getExpoGoProjectConfig()?.debuggerHost,
    expoHostUri: Constants.expoConfig?.hostUri ?? Constants.platform?.hostUri,
    platform: Platform.OS,
  });
}

export function useRuntimeApiUrl() {
  return useMemo(() => getRuntimeApiUrl(), []);
}
