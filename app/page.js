import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { verifyToken } from '../lib/auth';

export default async function Home() {
  const token = cookies().get('session')?.value;
  const payload = token ? await verifyToken(token) : null;
  redirect(payload ? '/app' : '/login');
}
