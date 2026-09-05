import { NextResponse } from 'next/server';
import { sql } from '../../../../lib/db';
import { getSessionUser } from '../../../../lib/auth';
import { generateFakeNumber } from '../../../../lib/phoneNumbers';

export const runtime = 'nodejs';

export async function GET() {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });

  const chosen = new Set();
  let attempts = 0;

  while (chosen.size < 5 && attempts < 10) {
    attempts++;
    const batch = Array.from({ length: 15 }, () => generateFakeNumber());
    const rows = await sql`SELECT phone_number FROM users WHERE phone_number = ANY(${batch})`;
    const taken = new Set(rows.map((r) => r.phone_number));
    for (const n of batch) {
      if (!taken.has(n) && !chosen.has(n)) {
        chosen.add(n);
        if (chosen.size === 5) break;
      }
    }
  }

  return NextResponse.json({ numbers: Array.from(chosen) });
}
