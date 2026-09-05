import { neon } from '@neondatabase/serverless';

if (!process.env.DATABASE_URL) {
  console.warn(
    '[prank-call] DATABASE_URL is not set. Set it in .env.local (see .env.example) or Vercel project settings.'
  );
}

// Tagged-template SQL client. Usage: await sql`SELECT * FROM users WHERE id = ${id}`
export const sql = neon(process.env.DATABASE_URL);
