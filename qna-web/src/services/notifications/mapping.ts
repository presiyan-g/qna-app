export type QuestionNotification = {
  questionId: string;
  prompt: string;
  publishedAt: Date;
  closesAt: Date | null;
  communitySlug: string;
  communityName: string;
  communityEmoji: string;
  isUnread: boolean;
  hasAnswered: boolean;
  isClosed: boolean;
};

export type QuestionNotificationRow = {
  questionId: string;
  prompt: string;
  publishedAt: Date;
  closesAt: Date | null;
  communitySlug: string;
  communityName: string;
  communityEmoji: string;
  hasAnswered: boolean;
};

export type ListQuestionNotificationsResult = {
  items: QuestionNotification[];
  unreadCount: number;
};

export const NOTIFICATIONS_LIMIT = 20;

/**
 * Maps a raw row from the bell query into a `QuestionNotification`, computing
 * the derived `isUnread` and `isClosed` flags. Pure function so the derivation
 * can be unit-tested without a database.
 */
export function toQuestionNotification(
  row: QuestionNotificationRow,
  ctx: { now: Date; lastSeenNotificationsAt: Date | null },
): QuestionNotification {
  return {
    questionId: row.questionId,
    prompt: row.prompt,
    publishedAt: row.publishedAt,
    closesAt: row.closesAt,
    communitySlug: row.communitySlug,
    communityName: row.communityName,
    communityEmoji: row.communityEmoji,
    hasAnswered: row.hasAnswered,
    isUnread:
      ctx.lastSeenNotificationsAt === null ||
      row.publishedAt > ctx.lastSeenNotificationsAt,
    isClosed: row.closesAt !== null && row.closesAt <= ctx.now,
  };
}
