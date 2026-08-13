import { DomainValidationError } from './profile.entity';

export type ViewingStatus = 'requested' | 'confirmed' | 'cancelled' | 'completed' | 'no_show';

export interface ViewingProps {
  id: string;
  propertyId: string;
  clientId: string;
  agentId: string;
  scheduledAt: Date;
  durationMins: number;
  status: ViewingStatus;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export type NewViewingInput = Omit<
  ViewingProps,
  'id' | 'status' | 'createdAt' | 'updatedAt'
>;

/**
 * Domain rules for the booking lifecycle. The actual overlap prevention
 * (race-condition safety) lives in the repository layer via
 * `SELECT ... FOR UPDATE` + a DB-level EXCLUDE constraint (belt & suspenders).
 * This entity enforces the *business* rules that don't require concurrency
 * control: valid transitions, minimum lead time, etc.
 */
export class Viewing {
  private constructor(private readonly props: ViewingProps) {}

  static create(props: ViewingProps): Viewing {
    if (props.durationMins <= 0) {
      throw new DomainValidationError('Viewing duration must be positive');
    }
    if (props.scheduledAt.getTime() <= Date.now()) {
      throw new DomainValidationError('Viewing must be scheduled in the future');
    }
    return new Viewing(props);
  }

  static fromNewInput(id: string, input: NewViewingInput): Viewing {
    const now = new Date();
    return Viewing.create({
      ...input,
      id,
      status: 'requested',
      createdAt: now,
      updatedAt: now,
    });
  }

  get id(): string {
    return this.props.id;
  }

  get propertyId(): string {
    return this.props.propertyId;
  }

  get status(): ViewingStatus {
    return this.props.status;
  }

  get scheduledAt(): Date {
    return this.props.scheduledAt;
  }

  get durationMins(): number {
    return this.props.durationMins;
  }

  /** Agent confirms a requested viewing. */
  confirm(): Viewing {
    if (this.props.status !== 'requested') {
      throw new DomainValidationError(
        `Cannot confirm viewing in status "${this.props.status}"; must be "requested"`,
      );
    }
    return new Viewing({ ...this.props, status: 'confirmed', updatedAt: new Date() });
  }

  cancel(): Viewing {
    if (this.props.status === 'completed' || this.props.status === 'cancelled') {
      throw new DomainValidationError(`Cannot cancel viewing already in status "${this.props.status}"`);
    }
    return new Viewing({ ...this.props, status: 'cancelled', updatedAt: new Date() });
  }

  toJSON(): ViewingProps {
    return { ...this.props };
  }
}

/** Thrown by the repository layer when a requested slot overlaps an existing active booking. */
export class ViewingSlotConflictError extends Error {
  constructor(propertyId: string, scheduledAt: Date) {
    super(`Requested slot for property ${propertyId} at ${scheduledAt.toISOString()} conflicts with an existing booking`);
    this.name = 'ViewingSlotConflictError';
  }
}
