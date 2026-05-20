export function describeErrorChain(err: unknown, maxDepth = 5): string {
  const parts: string[] = [];
  let current: unknown = err;
  for (let depth = 0; depth < maxDepth && current instanceof Error; depth++) {
    parts.push(current.message);
    current = current.cause;
  }
  return parts.join(' | ');
}
