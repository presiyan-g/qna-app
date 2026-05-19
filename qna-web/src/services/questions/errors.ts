export class QuestionPermissionError extends Error {
  constructor() {
    super('Only community creators can manage questions.');
    this.name = 'QuestionPermissionError';
  }
}

export class QuestionNotFoundError extends Error {
  constructor() {
    super('Question not found.');
    this.name = 'QuestionNotFoundError';
  }
}
