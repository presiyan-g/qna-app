import 'server-only';
import { S3Client } from '@aws-sdk/client-s3';
import { getR2Config } from './env';

let cached: S3Client | null = null;

export function getR2Client(): S3Client {
  if (cached) return cached;
  const config = getR2Config();
  cached = new S3Client({
    region: config.region,
    endpoint: config.endpoint,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
    forcePathStyle: true,
  });
  return cached;
}
