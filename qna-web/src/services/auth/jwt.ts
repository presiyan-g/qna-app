import { SignJWT, jwtVerify } from 'jose';

const ALG = 'HS256';
const EXPIRES_IN = '30d';
let secretBytes: Uint8Array | null = null;

export type SessionPayload = {
  sub: string;
  role: 'member' | 'admin';
};

export async function signSessionToken(payload: SessionPayload): Promise<string> {
  return new SignJWT({ role: payload.role })
    .setProtectedHeader({ alg: ALG })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(EXPIRES_IN)
    .sign(getSecretBytes());
}

export async function verifySessionToken(
  token: string,
): Promise<SessionPayload> {
  const { payload } = await jwtVerify(token, getSecretBytes(), {
    algorithms: [ALG],
  });
  if (typeof payload.sub !== 'string') {
    throw new Error('Invalid session: missing sub');
  }
  const role = payload.role;
  if (role !== 'member' && role !== 'admin') {
    throw new Error('Invalid session: bad role claim');
  }
  return { sub: payload.sub, role };
}

function getSecretBytes(): Uint8Array {
  if (secretBytes) return secretBytes;
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not set');
  }
  secretBytes = new TextEncoder().encode(secret);
  return secretBytes;
}
