import { sql } from '../../../../lib/db';
import { getSessionUser } from '../../../../lib/auth';

export const runtime = 'nodejs';

function formatDuration(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s}s`;
}

function statusLabel(status) {
  return {
    completed: 'Completed',
    no_answer: 'No answer',
    declined: 'Declined',
    busy: 'Busy',
    canceled: 'Canceled',
  }[status] || status;
}

export async function GET() {
  const session = await getSessionUser();
  if (!session) {
    return new Response('Not signed in.', { status: 401 });
  }

  const rows = await sql`
    SELECT direction, other_number, status, duration_seconds, created_at
    FROM calls
    WHERE user_id = ${session.userId}
    ORDER BY created_at DESC
  `;

  const lines = [
    'PRANK CALL - CALL HISTORY',
    `Exported: ${new Date().toISOString()}`,
    '='.repeat(60),
    '',
  ];

  if (rows.length === 0) {
    lines.push('No calls yet.');
  } else {
    for (const row of rows) {
      const dir = row.direction === 'outgoing' ? 'Called' : 'Received from';
      const when = new Date(row.created_at).toLocaleString();
      lines.push(
        `${when} | ${dir} ${row.other_number} | ${statusLabel(row.status)} | ${formatDuration(
          row.duration_seconds
        )}`
      );
    }
  }

  const body = lines.join('\n');

  return new Response(body, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Content-Disposition': 'attachment; filename="Prank Call - call history.txt"',
    },
  });
}
