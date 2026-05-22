export class UploadValidationError extends Error {
  constructor(public readonly fieldErrors: Record<string, string>) {
    super('Invalid upload request');
    this.name = 'UploadValidationError';
  }
}

export class UploadConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UploadConfigError';
  }
}
