export type GradeAnswerInput = {
  isCorrect: boolean;
  closesAt: Date;
  answeredAt: Date;
  points: number;
};

export type GradeAnswerResult = {
  isLate: boolean;
  pointsAwarded: number;
};

export function gradeAnswer({
  isCorrect,
  closesAt,
  answeredAt,
  points,
}: GradeAnswerInput): GradeAnswerResult {
  const isLate = answeredAt.getTime() > closesAt.getTime();
  return {
    isLate,
    pointsAwarded: isCorrect && !isLate ? points : 0,
  };
}
