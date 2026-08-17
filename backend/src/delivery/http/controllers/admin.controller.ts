import { Request, Response } from 'express';
import { AdminUsecase } from '../../../usecase/admin.usecase';
import { asyncHandler } from '../middleware/error.middleware';
import { UserRole } from '../../../domain/entities/profile.entity';

const VALID_ROLES: UserRole[] = ['client', 'agent', 'admin'];

export class AdminController {
  constructor(private readonly usecase: AdminUsecase) {}

  listUsers = asyncHandler(async (_req: Request, res: Response) => {
    const users = await this.usecase.listUsers();
    res.status(200).json({ data: users });
  });

  updateUserRole = asyncHandler(async (req: Request, res: Response) => {
    const targetUserId = requireParam(req.params.id, 'id');
    const { role } = req.body as { role?: string };

    if (!role || !VALID_ROLES.includes(role as UserRole)) {
      res.status(400).json({
        error: 'validation_error',
        message: `role must be one of: ${VALID_ROLES.join(', ')}`,
      });
      return;
    }

    const updated = await this.usecase.updateUserRole(targetUserId, role as UserRole, req.auth!.userId);
    res.status(200).json({ data: updated });
  });

  listAllProperties = asyncHandler(async (_req: Request, res: Response) => {
    const properties = await this.usecase.listAllProperties();
    res.status(200).json({ data: properties.map((p) => p.toJSON()) });
  });
}

function requireParam(value: string | undefined, name: string): string {
  if (!value) {
    throw new Error(`Missing required route parameter: ${name}`);
  }
  return value;
}
