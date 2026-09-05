import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { verifyToken } from '../../lib/auth';
import { sql } from '../../lib/db';
import Dashboard from '../../components/Dashboard';

export default async function AppPage() {
  const token = cookies().get('session')?.value;
  const payload = token ? await verifyToken(token) : null;
  if (!payload) redirect('/login');

  const rows = await sql`SELECT id, email, phone_number FROM users WHERE id = ${payload.userId}`;
  const user = rows[0];
  if (!user) redirect('/login');
  if (!user.phone_number) redirect('/choose-number');

  return (
    <Dashboard
      user={{ id: user.id, email: user.email, phoneNumber: user.phone_number }}
    />
  );
}
