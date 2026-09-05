import { NextResponse } from 'next/server';
import { sql } from '../../../../lib/db';
import { getSessionUser } from '../../../../lib/auth';

export const runtime = 'nodejs';

export async function POST(req) {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const phoneNumber = body.phoneNumber;
  if (!phoneNumber) {
    return NextResponse.json({ error: 'No phone number was provided.' }, { status: 400 });
  }

  const mine = await sql`SELECT phone_number FROM users WHERE id = ${session.userId}`;
  if (mine[0]?.phone_number) {
    return NextResponse.json({ error: 'Your account already has a number.' }, { status: 409 });
  }

  const taken = await sql`SELECT id FROM users WHERE phone_number = ${phoneNumber}`;
  if (taken.length > 0) {
    return NextResponse.json(
      { error: 'That number was just claimed by someone else. Please pick another.' },
      { status: 409 }
    );
  }

  const rows = await sql`
    UPDATE users SET phone_number = ${phoneNumber}
    WHERE id = ${session.userId} AND phone_number IS NULL
    RETURNING id, email, phone_number
  `;
  const user = rows[0];
  if (!user) {
    return NextResponse.json({ error: 'Could not claim that number. Please try again.' }, { status: 409 });
  }

  return NextResponse.json({ user: { id: user.id, email: user.email, phoneNumber: user.phone_number } });
}
