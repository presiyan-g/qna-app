export type BroadcastTextToken =
  | { type: 'text'; value: string }
  | { type: 'link'; value: string };

const URL_PATTERN = /https?:\/\/[^\s]+/g;

export function tokenizeBroadcastText(value: string): BroadcastTextToken[] {
  const tokens: BroadcastTextToken[] = [];
  let lastIndex = 0;

  for (const match of value.matchAll(URL_PATTERN)) {
    const url = match[0];
    const index = match.index ?? 0;
    if (index > lastIndex) {
      tokens.push({ type: 'text', value: value.slice(lastIndex, index) });
    }
    tokens.push({ type: 'link', value: url });
    lastIndex = index + url.length;
  }

  if (lastIndex < value.length) {
    tokens.push({ type: 'text', value: value.slice(lastIndex) });
  }

  return tokens.length > 0 ? tokens : [{ type: 'text', value }];
}
