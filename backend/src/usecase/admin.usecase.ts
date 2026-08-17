import { IAdminRepository, AdminUserSummary } from '../domain/repositories/admin.repository.interface';
import { Property } from '../domain/entities/property.entity';
import { UserRole } from '../domain/entities/profile.entity';
import { ForbiddenError } from '../delivery/http/middleware/error.middleware';

export class AdminUsecase {
  constructor(private readonly adminRepo: IAdminRepository) {}

  listUsers(): Promise<AdminUserSummary[]> {
    return this.adminRepo.listUsers();
  }

  async updateUserRole(
    targetUserId: string,
    newRole: UserRole,
    requestingAdminId: string,
  ): Promise<AdminUserSummary> {
    // Guard against an admin removing their own admin role, which could
    // lock the account (and potentially the whole team, if they're the
    // only admin) out of the admin panel with no way back in short of a
    // direct database edit. Demoting a DIFFERENT admin is still allowed.
    if (targetUserId === requestingAdminId && newRole !== 'admin') {
      throw new ForbiddenError('You cannot remove your own admin role.');
    }
    return this.adminRepo.updateUserRole(targetUserId, newRole);
  }

  listAllProperties(): Promise<Property[]> {
    return this.adminRepo.listAllProperties();
  }
}
