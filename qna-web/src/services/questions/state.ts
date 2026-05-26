export type QuestionLifecycleState =
  | 'draft'
  | 'scheduled'
  | 'live'
  | 'closed'
  | 'deleted';

export type QuestionStateTimestamps = {
  scheduledFor: Date | null;
  publishedAt: Date | null;
  closesAt: Date | null;
  deletedAt?: Date | null;
};

export function getQuestionLifecycleState(
  question: QuestionStateTimestamps,
  now = new Date(),
): QuestionLifecycleState {
  if (question.deletedAt) return 'deleted';
  if (!question.scheduledFor && !question.publishedAt && !question.closesAt) {
    return 'draft';
  }
  if (
    (question.publishedAt && question.publishedAt.getTime() > now.getTime()) ||
    (question.scheduledFor && question.scheduledFor.getTime() > now.getTime())
  ) {
    return 'scheduled';
  }
  if (question.closesAt && question.closesAt.getTime() <= now.getTime()) {
    return 'closed';
  }
  return 'live';
}

export function canManageUnpublishedQuestion(
  question: QuestionStateTimestamps,
  now = new Date(),
): boolean {
  const state = getQuestionLifecycleState(question, now);
  return state === 'draft' || state === 'scheduled';
}
