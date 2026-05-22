export function formatNewQuestionsLabel(count: number): string {
  return count === 1 ? '1 new question' : `${count} new questions`;
}

export function formatNewBroadcastsLabel(count: number): string {
  return count === 1 ? '1 new broadcast' : `${count} new broadcasts`;
}
