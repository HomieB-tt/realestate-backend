import { UserRole } from '../entities/profile.entity';
import { Property } from '../entities/property.entity';

export interface AdminUserSummary {
  id: string;
  email: string | null;
  fullName: string;
  role: UserRole;
  createdAt: Date;
}

/**
 * Admin-only data access. Kept as its own interface rather than bolting
 * onto IProfileRepository/IPropertyRepository, since these operations
 * (list every user, list every property regardless of owner/status)
 * intentionally bypass the scoping those interfaces are built around —
 * mixing them in would make it easy to accidentally call an
 * admin-unrestricted method from a non-admin code path.
 */
export interface IAdminRepository {
  listUsers(): Promise<AdminUserSummary[]>;
  updateUserRole(userId: string, role: UserRole): Promise<AdminUserSummary>;
  listAllProperties(): Promise<Property[]>;
}
