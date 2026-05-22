import { NextResponse, type NextRequest } from 'next/server';
import { corsOptionsResponse, withCors } from '../../_utils/cors';
import { getApiSession } from '@/services/auth/api-session';
import {
  createPresignedUpload,
  UploadValidationError,
  type UploadScope,
} from '@/services/uploads';

export function OPTIONS(request: NextRequest) {
  return corsOptionsResponse(request.headers.get('origin'));
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get('origin');
  const session = await getApiSession(request);
  if (!session) {
    return withCors(
      NextResponse.json({ error: 'Authentication required.' }, { status: 401 }),
      origin,
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return withCors(
      NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 }),
      origin,
    );
  }

  const raw = body && typeof body === 'object' ? (body as Record<string, unknown>) : {};

  try {
    const presigned = await createPresignedUpload({
      scope: raw.scope as UploadScope,
      userId: session.sub,
      communityId:
        typeof raw.communityId === 'string' && raw.communityId.length > 0
          ? raw.communityId
          : null,
      contentType: typeof raw.contentType === 'string' ? raw.contentType : '',
      sizeBytes: typeof raw.sizeBytes === 'number' ? raw.sizeBytes : -1,
    });
    return withCors(NextResponse.json(presigned), origin);
  } catch (err) {
    if (err instanceof UploadValidationError) {
      return withCors(
        NextResponse.json(
          { error: 'Invalid upload request.', fieldErrors: err.fieldErrors },
          { status: 422 },
        ),
        origin,
      );
    }
    throw err;
  }
}
