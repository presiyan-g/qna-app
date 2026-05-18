import { SignJWT, jwtVerify } from 'jose';

const SECRET = process.env.JWT_SECRET;
if (!SECRET) {
  throw new Error('JWT_SECRET is not set');
}
const SECRET_BYTES = new TextEncoder().encode(SECRET);

const ALG = 'HS256';
const EXPIRES_IN = '30d';

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
    .sign(SECRET_BYTES);
}

export async function verifySessionToken(
  token: string,
): Promise<SessionPayload> {
  const { payload } = await jwtVerify(token, SECRET_BYTES, {
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
