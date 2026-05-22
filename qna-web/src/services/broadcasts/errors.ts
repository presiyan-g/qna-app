export class BroadcastPermissionError extends Error {
  constructor(message = 'Only community creators can manage broadcasts.') {
    super(message);
    this.name = 'BroadcastPermissionError';
  }
}

export class BroadcastNotFoundError extends Error {
  constructor() {
    super('Broadcast not found.');
    this.name = 'BroadcastNotFoundError';
  }
}

export class BroadcastValidationError extends Error {
  constructor(
    public readonly fieldErrors: Partial<Record<'body' | 'imageUrl', string>>,
  ) {
    super('Invalid broadcast input.');
    this.name = 'BroadcastValidationError';
  }
}

export class BroadcastAuthenticationRequiredError extends Error {
  constructor() {
    super('Authentication required.');
    this.name = 'BroadcastAuthenticationRequiredError';
  }
}

export class BroadcastMembershipRequiredError extends Error {
  constructor() {
    super('Join this community to see broadcasts.');
    this.name = 'BroadcastMembershipRequiredError';
  }
}
