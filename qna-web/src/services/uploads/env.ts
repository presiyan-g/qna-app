import 'server-only';
import { UploadConfigError } from './errors';

export type R2Config = {
  endpoint: string;
  bucket: string;
  publicUrl: string;
  accessKeyId: string;
  secretAccessKey: string;
  region: 'auto';
};

let cached: R2Config | null = null;

export function getR2Config(): R2Config {
  if (cached) return cached;

  const endpoint = requireEnv('R2_ENDPOINT');
  const bucket = requireEnv('R2_BUCKET');
  const publicUrl = requireEnv('R2_PUBLIC_URL');
  const accessKeyId = requireEnv('R2_ACCESS_KEY_ID');
  const secretAccessKey = requireEnv('R2_SECRET_ACCESS_KEY');

  cached = {
    endpoint: endpoint.replace(/\/$/, ''),
    bucket,
    publicUrl: publicUrl.replace(/\/$/, ''),
    accessKeyId,
    secretAccessKey,
    region: 'auto',
  };
  return cached;
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value || !value.trim()) {
    throw new UploadConfigError(`${name} is not set`);
  }
  return value.trim();
}
