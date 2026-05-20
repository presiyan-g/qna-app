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

export class QuestionImmutableError extends Error {
  constructor() {
    super('Published questions cannot be changed in this dashboard slice.');
    this.name = 'QuestionImmutableError';
  }
}
