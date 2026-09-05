import { NextResponse } from 'next/server';
import { sql } from '../../../../lib/db';
import { getSessionUser } from '../../../../lib/auth';

export const runtime = 'nodejs';

export async function GET() {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });

  const rows = await sql`
    SELECT direction, other_number, status, duration_seconds, created_at
    FROM calls
    WHERE user_id = ${session.userId}
    ORDER BY created_at DESC
    LIMIT 300
  `;

  return NextResponse.json({ calls: rows });
}
