import { NextResponse } from 'next/server';
import { sql } from '../../../../lib/db';
import { getSessionUser } from '../../../../lib/auth';

export const runtime = 'nodejs';

export async function GET() {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ user: null }, { status: 401 });

  const rows = await sql`SELECT id, email, phone_number FROM users WHERE id = ${session.userId}`;
  const user = rows[0];
  if (!user) return NextResponse.json({ user: null }, { status: 401 });

  return NextResponse.json({
    user: { id: user.id, email: user.email, phoneNumber: user.phone_number },
  });
}
