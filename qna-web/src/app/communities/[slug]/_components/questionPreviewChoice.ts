export type ViewerAnswerSummary = {
  selectedChoiceId: string;
  isCorrect: boolean;
};

export type ChoiceClassification = 'correct' | 'wrong-pick' | 'neutral';

export function classifyChoice({
  choiceId,
  viewerAnswer,
  revealedCorrectChoiceId,
}: {
  choiceId: string;
  viewerAnswer: ViewerAnswerSummary | null;
  revealedCorrectChoiceId: string | null;
}): ChoiceClassification {
  if (revealedCorrectChoiceId === choiceId) return 'correct';
  if (viewerAnswer?.selectedChoiceId === choiceId) return 'wrong-pick';
  return 'neutral';
}
