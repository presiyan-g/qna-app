'use server';

import { getSession } from '@/services/auth';
import {
  createPresignedUpload,
  UploadValidationError,
  type PresignedUpload,
  type UploadScope,
} from '@/services/uploads';

export type RequestImageUploadInput = {
  scope: UploadScope;
  contentType: string;
  sizeBytes: number;
  communityId: string | null;
};

export type RequestImageUploadResult =
  | { ok: true; data: PresignedUpload }
  | {
      ok: false;
      formError?: string;
      fieldErrors?: Record<string, string>;
    };

export async function requestImageUploadAction(
  input: RequestImageUploadInput,
): Promise<RequestImageUploadResult> {
  const session = await getSession();
  if (!session) {
    return { ok: false, formError: 'Sign in to upload images.' };
  }

  try {
    const presigned = await createPresignedUpload({
      scope: input.scope,
      userId: session.sub,
      communityId: input.communityId,
      contentType: input.contentType,
      sizeBytes: input.sizeBytes,
    });
    return { ok: true, data: presigned };
  } catch (err) {
    if (err instanceof UploadValidationError) {
      return { ok: false, fieldErrors: err.fieldErrors };
    }
    throw err;
  }
}
