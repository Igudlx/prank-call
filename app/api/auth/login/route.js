import { NextResponse } from 'next/server';
import { sql } from '../../../../lib/db';
import { verifyPassword, signToken, SESSION_COOKIE_NAME } from '../../../../lib/auth';

export const runtime = 'nodejs';

export async function POST(req) {
  const body = await req.json().catch(() => ({}));
  const email = (body.email || '').trim().toLowerCase();
  const password = body.password || '';

  if (!email || !password) {
    return NextResponse.json({ error: 'Enter your email and password.' }, { status: 400 });
  }

  const rows = await sql`SELECT id, email, password_hash, phone_number FROM users WHERE email = ${email}`;
  const user = rows[0];
  if (!user) {
    return NextResponse.json({ error: 'Incorrect email or password.' }, { status: 401 });
  }
  const ok = await verifyPassword(password, user.password_hash);
  if (!ok) {
    return NextResponse.json({ error: 'Incorrect email or password.' }, { status: 401 });
  }

  const token = await signToken({ userId: user.id, email: user.email });
  const res = NextResponse.json({
    user: { id: user.id, email: user.email, phoneNumber: user.phone_number },
  });
  res.cookies.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}
