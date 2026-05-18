export class AuthConflictError extends Error {
  readonly field: 'email' | 'username';
  constructor(field: 'email' | 'username', message?: string) {
    super(message ?? `That ${field} is already in use.`);
    this.name = 'AuthConflictError';
    this.field = field;
  }
}

export class AuthValidationError extends Error {
  readonly fieldErrors: Record<string, string>;
  constructor(fieldErrors: Record<string, string>) {
    super('Validation failed');
    this.name = 'AuthValidationError';
    this.fieldErrors = fieldErrors;
  }
}
