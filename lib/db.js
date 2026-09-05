import { neon } from '@neondatabase/serverless';

let _sql = null;

function getSql() {
  if (!_sql) {
    const url = process.env.DATABASE_URL;
    if (!url) {
      throw new Error(
        '[prank-call] DATABASE_URL is not set. Add it in your Vercel project settings (Settings -> Environment Variables), or in .env.local for local dev. See README.'
      );
    }
    _sql = neon(url);
  }
  return _sql;
}

// Tagged-template SQL client, created lazily on first real query — so a
// missing DATABASE_URL only fails an actual request, never the build itself.
// Usage is unchanged: await sql`SELECT * FROM users WHERE id = ${id}`
export const sql = (...args) => getSql()(...args);
