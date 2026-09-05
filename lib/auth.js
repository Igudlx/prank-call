import { SignJWT, jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';

const SESSION_COOKIE = 'session';
const secretKey = new TextEncoder().encode(
  process.env.JWT_SECRET || 'dev-only-insecure-secret-change-me'
);

export async function hashPassword(password) {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash);
}

export async function signToken(payload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(secretKey);
}

export async function verifyToken(token) {
  try {
    const { payload } = await jwtVerify(token, secretKey);
    return payload;
  } catch {
    return null;
  }
}

export const SESSION_COOKIE_NAME = SESSION_COOKIE;

// Server-only helper for API routes / server components (Node runtime).
export async function getSessionUser() {
  const { cookies } = await import('next/headers');
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifyToken(token);
}
