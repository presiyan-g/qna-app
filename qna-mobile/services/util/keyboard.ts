export function getKeyboardAvoidingBehavior(platform: string): 'padding' | 'height' | undefined {
  if (platform === 'ios') return 'padding';
  if (platform === 'android') return 'height';
  return undefined;
}
