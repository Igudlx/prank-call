import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { verifyToken } from '../../lib/auth';
import { sql } from '../../lib/db';
import ChooseNumberForm from '../../components/ChooseNumberForm';

export default async function ChooseNumberPage() {
  const token = cookies().get('session')?.value;
  const payload = token ? await verifyToken(token) : null;
  if (!payload) redirect('/login');

  const rows = await sql`SELECT phone_number FROM users WHERE id = ${payload.userId}`;
  if (rows[0]?.phone_number) redirect('/app');

  return <ChooseNumberForm />;
}
