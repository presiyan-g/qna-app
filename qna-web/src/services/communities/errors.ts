export class CommunityValidationError extends Error {
  constructor(public readonly fieldErrors: Record<string, string>) {
    super('Invalid community input');
    this.name = 'CommunityValidationError';
  }
}

export class CommunityConflictError extends Error {
  constructor(public readonly field: 'slug') {
    super('A community with this name already exists.');
    this.name = 'CommunityConflictError';
  }
}

export class CommunityNotFoundError extends Error {
  constructor() {
    super('Community not found.');
    this.name = 'CommunityNotFoundError';
  }
}

export class CommunityMembershipError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CommunityMembershipError';
  }
}
