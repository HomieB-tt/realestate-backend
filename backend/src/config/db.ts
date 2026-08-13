import { Pool, PoolClient } from 'pg';
import { env } from './env';

/**
 * Shared connection pool. Used specifically where we need explicit
 * transaction control (BEGIN / COMMIT / ROLLBACK, SELECT ... FOR UPDATE)
 * that the Supabase JS client does not expose — most notably, the
 * viewing-booking flow.
 */
export const pool = new Pool({
  connectionString: env.databaseUrl,
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
});

pool.on('error', (err) => {
  // Idle client errors should never crash the process silently.
  // eslint-disable-next-line no-console
  console.error('[db] Unexpected error on idle Postgres client', err);
});

/**
 * Runs `fn` inside an explicit transaction. Commits on success,
 * rolls back on any thrown error (including domain errors like
 * ViewingSlotConflictError), and always releases the client back
 * to the pool.
 */
export async function withTransaction<T>(
  fn: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
