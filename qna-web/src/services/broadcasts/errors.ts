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
