import { Viewing } from '../entities/viewing.entity';

/**
 * Contract for viewing/booking persistence.
 *
 * `bookSlot` is intentionally distinct from a generic `create` — it names
 * the ACID-sensitive operation explicitly so implementers are forced to
 * think about the transaction/locking strategy (BEGIN; SELECT ... FOR
 * UPDATE; INSERT; COMMIT / ROLLBACK) rather than accidentally treating
 * booking like a plain insert.
 */
export interface IViewingRepository {
  findById(id: string): Promise<Viewing | null>;

  findByPropertyId(propertyId: string): Promise<Viewing[]>;

  findByClientId(clientId: string): Promise<Viewing[]>;

  /**
   * Atomically books a viewing slot. MUST:
   *  1. Open an explicit transaction (BEGIN).
   *  2. Lock competing rows for the same property/time window (SELECT ... FOR UPDATE).
   *  3. Re-check for overlap inside the transaction (the DB EXCLUDE
   *     constraint is the final safety net, not the primary check).
   *  4. INSERT the new viewing and COMMIT, or ROLLBACK on conflict.
   *
   * Throws ViewingSlotConflictError (see domain/entities/viewing.entity.ts)
   * if the slot is unavailable.
   */
  bookSlot(viewing: Viewing): Promise<Viewing>;

  updateStatus(viewing: Viewing): Promise<Viewing>;
}
