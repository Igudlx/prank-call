import { NextResponse } from 'next/server';
import { sql } from '../../../../lib/db';
import { getSessionUser, verifyPassword, hashPassword } from '../../../../lib/auth';

export const runtime = 'nodejs';

export async function POST(req) {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { currentPassword, newEmail, newPassword } = body;

  const rows = await sql`SELECT id, email, password_hash FROM users WHERE id = ${session.userId}`;
  const user = rows[0];
  if (!user) return NextResponse.json({ error: 'Account not found.' }, { status: 404 });

  const ok = await verifyPassword(currentPassword || '', user.password_hash);
  if (!ok) {
    return NextResponse.json({ error: 'Current password is incorrect.' }, { status: 401 });
  }

  const email = newEmail ? newEmail.trim().toLowerCase() : user.email;
  if (newEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Enter a valid email address.' }, { status: 400 });
  }
  if (newPassword && newPassword.length < 6) {
    return NextResponse.json({ error: 'New password must be at least 6 characters.' }, { status: 400 });
  }

  if (newEmail && email !== user.email) {
    const dupe = await sql`SELECT id FROM users WHERE email = ${email} AND id != ${user.id}`;
    if (dupe.length > 0) {
      return NextResponse.json({ error: 'That email is already in use.' }, { status: 409 });
    }
  }

  const passwordHash = newPassword ? await hashPassword(newPassword) : user.password_hash;
  await sql`UPDATE users SET email = ${email}, password_hash = ${passwordHash} WHERE id = ${user.id}`;

  return NextResponse.json({ ok: true, email });
}
