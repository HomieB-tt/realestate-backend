import { PoolClient } from 'pg';
import { pool, withTransaction } from '../config/db';
import { Viewing, ViewingSlotConflictError, ViewingProps } from '../domain/entities/viewing.entity';
import { IViewingRepository } from '../domain/repositories/viewing.repository.interface';

interface ViewingRow {
  id: string;
  property_id: string;
  client_id: string;
  agent_id: string;
  scheduled_at: string;
  duration_mins: number;
  status: ViewingProps['status'];
  notes: string | null;
  created_at: string;
  updated_at: string;
}

function rowToEntity(row: ViewingRow): Viewing {
  return Viewing.create({
    id: row.id,
    propertyId: row.property_id,
    clientId: row.client_id,
    agentId: row.agent_id,
    scheduledAt: new Date(row.scheduled_at),
    durationMins: row.duration_mins,
    status: row.status,
    notes: row.notes,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  });
}

export class PgViewingRepository implements IViewingRepository {
  async findById(id: string): Promise<Viewing | null> {
    const { rows } = await pool.query<ViewingRow>(
      `select * from public.viewings where id = $1`,
      [id],
    );
    return rows[0] ? rowToEntity(rows[0]) : null;
  }

  async findByPropertyId(propertyId: string): Promise<Viewing[]> {
    const { rows } = await pool.query<ViewingRow>(
      `select * from public.viewings where property_id = $1 order by scheduled_at asc`,
      [propertyId],
    );
    return rows.map(rowToEntity);
  }

  async findByClientId(clientId: string): Promise<Viewing[]> {
    const { rows } = await pool.query<ViewingRow>(
      `select * from public.viewings where client_id = $1 order by scheduled_at desc`,
      [clientId],
    );
    return rows.map(rowToEntity);
  }

  /**
   * ACID-compliant slot booking.
   *
   * Concurrency strategy (defense in depth):
   *  1. Explicit transaction via `withTransaction`.
   *  2. `SELECT ... FOR UPDATE` locks any existing active bookings for
   *     this property that overlap the requested window, so a second
   *     concurrent request for the same slot blocks until the first
   *     transaction commits or rolls back — eliminating the
   *     check-then-insert race condition.
   *  3. After acquiring the lock, we re-check for overlap in application
   *     code and raise ViewingSlotConflictError if the slot is taken.
   *  4. The DB-level `no_overlapping_active_viewings` EXCLUDE constraint
   *     (see migration 001) is the final, unconditional safety net in
   *     case this code path is ever bypassed (e.g. a future direct
   *     Supabase client-side insert) — its violation is caught and
   *     mapped to the same domain error.
   */
  async bookSlot(viewing: Viewing): Promise<Viewing> {
    const v = viewing.toJSON();

    return withTransaction(async (client: PoolClient) => {
      // Step 1: lock any overlapping ACTIVE bookings for this property.
      // The range comparison mirrors the generated `time_range` column.
      const lockResult = await client.query(
        `
        select id
        from public.viewings
        where property_id = $1
          and status in ('requested', 'confirmed')
          and tstzrange(scheduled_at, scheduled_at + make_interval(mins => duration_mins), '[)')
              && tstzrange($2::timestamptz, $2::timestamptz + make_interval(mins => $3::int), '[)')
        for update
        `,
        [v.propertyId, v.scheduledAt.toISOString(), v.durationMins],
      );

      if (lockResult.rows.length > 0) {
        throw new ViewingSlotConflictError(v.propertyId, v.scheduledAt);
      }

      // Step 2: insert. If a concurrent transaction slipped past the lock
      // window somehow, the EXCLUDE constraint below throws Postgres error
      // code 23P01 (exclusion_violation), which we translate to the same
      // domain error.
      try {
        const insertResult = await client.query<ViewingRow>(
          `
          insert into public.viewings
            (id, property_id, client_id, agent_id, scheduled_at, duration_mins, status, notes)
          values ($1, $2, $3, $4, $5, $6, $7, $8)
          returning *
          `,
          [
            v.id,
            v.propertyId,
            v.clientId,
            v.agentId,
            v.scheduledAt.toISOString(),
            v.durationMins,
            v.status,
            v.notes,
          ],
        );
        const insertedRow = insertResult.rows[0];
        if (!insertedRow) {
          throw new Error('bookSlot insert returned no row');
        }
        return rowToEntity(insertedRow);
      } catch (err: unknown) {
        if (isExclusionViolation(err)) {
          throw new ViewingSlotConflictError(v.propertyId, v.scheduledAt);
        }
        throw err;
      }
    });
  }

  async updateStatus(viewing: Viewing): Promise<Viewing> {
    const v = viewing.toJSON();
    const { rows } = await pool.query<ViewingRow>(
      `
      update public.viewings
      set status = $2, updated_at = now()
      where id = $1
      returning *
      `,
      [v.id, v.status],
    );
    if (!rows[0]) {
      throw new Error(`updateStatus failed: viewing ${v.id} not found`);
    }
    return rowToEntity(rows[0]);
  }
}

function isExclusionViolation(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code: string }).code === '23P01'
  );
}
