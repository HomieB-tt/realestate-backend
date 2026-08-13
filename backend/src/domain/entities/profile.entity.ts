/**
 * Domain Entity: Profile
 *
 * Mirrors public.profiles. Pure data + invariants — no persistence,
 * no HTTP, no Supabase SDK types leak in here. This keeps the domain
 * layer testable and independent of infrastructure choices.
 */

export type UserRole = 'client' | 'agent' | 'admin';

export interface ProfileProps {
  id: string; // uuid, shared with auth.users.id
  fullName: string;
  phone: string | null;
  role: UserRole;
  avatarUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export class Profile {
  private constructor(private readonly props: ProfileProps) {}

  static create(props: ProfileProps): Profile {
    if (!props.id) {
      throw new DomainValidationError('Profile.id is required');
    }
    if (!props.fullName || props.fullName.trim().length === 0) {
      // Not fatal at signup time (name may be filled later), but flag via warning-level invariant.
      // We do NOT throw here because Supabase auto-creates profiles with empty names on signup.
    }
    return new Profile(props);
  }

  get id(): string {
    return this.props.id;
  }

  get role(): UserRole {
    return this.props.role;
  }

  get fullName(): string {
    return this.props.fullName;
  }

  isAgent(): boolean {
    return this.props.role === 'agent' || this.props.role === 'admin';
  }

  isAdmin(): boolean {
    return this.props.role === 'admin';
  }

  toJSON(): ProfileProps {
    return { ...this.props };
  }
}

export class DomainValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DomainValidationError';
  }
}
