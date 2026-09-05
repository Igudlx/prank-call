import { NextResponse } from 'next/server';
import { sql } from '../../../../lib/db';
import { getSessionUser } from '../../../../lib/auth';

export const runtime = 'nodejs';

const VALID_STATUS = ['completed', 'no_answer', 'declined', 'busy', 'canceled'];
const VALID_DIRECTION = ['outgoing', 'incoming'];

export async function POST(req) {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { direction, otherNumber, status, durationSeconds } = body;

  if (!VALID_DIRECTION.includes(direction) || !VALID_STATUS.includes(status) || !otherNumber) {
    return NextResponse.json({ error: 'Invalid call record.' }, { status: 400 });
  }

  await sql`
    INSERT INTO calls (user_id, direction, other_number, status, duration_seconds)
    VALUES (${session.userId}, ${direction}, ${otherNumber}, ${status}, ${Math.max(0, durationSeconds | 0)})
  `;

  return NextResponse.json({ ok: true });
}
