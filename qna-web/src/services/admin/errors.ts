export class AdminPermissionError extends Error {
  constructor(message = 'Admin access required.') {
    super(message);
    this.name = 'AdminPermissionError';
  }
}

export class AdminInvariantError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AdminInvariantError';
  }
}

export class AdminNotFoundError extends Error {
  constructor(message = 'Admin target not found.') {
    super(message);
    this.name = 'AdminNotFoundError';
  }
}

export class AdminValidationError extends Error {
  constructor(
    public fieldErrors: Partial<
      Record<
        'reason' | 'q' | 'status' | 'featuredRank' | 'directoryRank',
        string
      >
    >,
  ) {
    super('Invalid admin input.');
    this.name = 'AdminValidationError';
  }
}

export class AccountSuspendedError extends Error {
  constructor(message = 'Your account is suspended for this action.') {
    super(message);
    this.name = 'AccountSuspendedError';
  }
}
