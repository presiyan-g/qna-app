import 'server-only';
import { randomBytes } from 'node:crypto';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { getR2Client } from './client';
import { getR2Config } from './env';
import { buildObjectKey } from './key';
import { validateUploadRequest, type UploadScope } from './validation';

const PRESIGN_EXPIRES_IN_SECONDS = 5 * 60;

export type CreatePresignedUploadInput = {
  scope: UploadScope;
  userId: string;
  communityId: string | null;
  contentType: string;
  sizeBytes: number;
};

export type PresignedUpload = {
  key: string;
  uploadUrl: string;
  publicUrl: string;
  expiresInSeconds: number;
};

export async function createPresignedUpload(
  input: CreatePresignedUploadInput,
): Promise<PresignedUpload> {
  const validated = validateUploadRequest({
    scope: input.scope,
    contentType: input.contentType,
    sizeBytes: input.sizeBytes,
  });

  const config = getR2Config();
  const randomId = randomBytes(12).toString('hex');
  const key = buildObjectKey({
    scope: validated.scope,
    userId: input.userId,
    communityId: input.communityId,
    extension: validated.extension,
    randomId,
  });

  const uploadUrl = await getSignedUrl(
    getR2Client(),
    new PutObjectCommand({
      Bucket: config.bucket,
      Key: key,
      ContentType: validated.contentType,
      ContentLength: validated.sizeBytes,
    }),
    { expiresIn: PRESIGN_EXPIRES_IN_SECONDS },
  );

  return {
    key,
    uploadUrl,
    publicUrl: `${config.publicUrl}/${key}`,
    expiresInSeconds: PRESIGN_EXPIRES_IN_SECONDS,
  };
}
