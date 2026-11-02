import bcrypt from 'bcryptjs';
import { SignJWT, jwtVerify } from 'jose';

function getSigningKey() {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error('Configure JWT_SECRET com pelo menos 32 caracteres.');
  }
  return new TextEncoder().encode(secret);
}

export interface SessionPayload {
  sub: string;       // User ID
  userId?: string;   // Convenience alias
  email: string;
  name: string;
  role: string;
  [key: string]: unknown;
}

/**
 * Realiza o hash seguro de senha utilizando bcryptjs com 10 rounds de salt.
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

/**
 * Valida a senha informada contra o hash armazenado.
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export const comparePassword = verifyPassword;

/**
 * Cria e assina digitalmente um token JWT de sessão (7 dias de validade).
 */
export async function createSessionToken(payload: SessionPayload): Promise<string> {
  return new SignJWT({
    ...payload,
    userId: payload.userId || payload.sub,
    sub: payload.sub || payload.userId || '',
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(getSigningKey());
}

export const signSessionToken = createSessionToken;

/**
 * Decodifica e verifica a integridade do token JWT de sessão.
 */
export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSigningKey(), { algorithms: ['HS256'] });
    const session = payload as unknown as SessionPayload;
    if (!session.sub && session.userId) {
      session.sub = session.userId;
    }
    return session;
  } catch {
    return null;
  }
}
