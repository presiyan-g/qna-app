export class AnswerPermissionError extends Error {
  constructor() {
    super('You must be a member of this community to answer questions.');
    this.name = 'AnswerPermissionError';
  }
}

export class AnswerUnavailableError extends Error {
  constructor() {
    super('This question is not open for answers yet.');
    this.name = 'AnswerUnavailableError';
  }
}

export class AnswerValidationError extends Error {
  fieldErrors: Partial<Record<'choiceId', string>>;

  constructor(fieldErrors: Partial<Record<'choiceId', string>>) {
    super('Invalid answer input.');
    this.name = 'AnswerValidationError';
    this.fieldErrors = fieldErrors;
  }
}
