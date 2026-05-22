import type { UploadScope } from './validation';

export type BuildObjectKeyInput = {
  scope: UploadScope;
  userId: string;
  communityId: string | null;
  extension: 'jpg' | 'png' | 'webp';
  randomId: string;
};

export function buildObjectKey(input: BuildObjectKeyInput): string {
  const { scope, userId, communityId, extension, randomId } = input;
  switch (scope) {
    case 'community-cover':
      return communityId
        ? `communities/${communityId}/cover/${randomId}.${extension}`
        : `communities/_pending/${userId}/cover/${randomId}.${extension}`;
    case 'question-prompt':
      if (!communityId) throw new Error('communityId is required for question-prompt');
      return `communities/${communityId}/questions/${userId}/${randomId}.${extension}`;
    case 'question-choice':
      if (!communityId) throw new Error('communityId is required for question-choice');
      return `communities/${communityId}/questions/${userId}/choices/${randomId}.${extension}`;
    case 'broadcast':
      if (!communityId) throw new Error('communityId is required for broadcast');
      return `communities/${communityId}/broadcasts/${userId}/${randomId}.${extension}`;
  }
}
