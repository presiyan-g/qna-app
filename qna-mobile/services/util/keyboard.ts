export function getKeyboardAvoidingBehavior(platform: string): 'padding' | undefined {
  return platform === 'ios' ? 'padding' : undefined;
}
