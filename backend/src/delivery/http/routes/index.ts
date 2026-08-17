import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth.middleware';
import { PropertyController } from '../controllers/property.controller';
import { ViewingController } from '../controllers/viewing.controller';
import { AdminController } from '../controllers/admin.controller';
import { PropertyUsecase } from '../../../usecase/property.usecase';
import { ViewingUsecase } from '../../../usecase/viewing.usecase';
import { AdminUsecase } from '../../../usecase/admin.usecase';
import { SupabasePropertyRepository } from '../../../repository/property.repository';
import { PgViewingRepository } from '../../../repository/viewing.repository';
import { SupabaseAdminRepository } from '../../../repository/admin.repository';

/**
 * Composition root: concrete repository implementations are instantiated
 * here (the only place infrastructure and domain/usecase code meet) and
 * injected into usecases, which are injected into controllers. Swapping
 * Supabase for another Postgres provider, or wiring in a fake repository
 * for tests, only touches this file.
 */
const propertyRepo = new SupabasePropertyRepository();
const viewingRepo = new PgViewingRepository();
const adminRepo = new SupabaseAdminRepository();

const propertyUsecase = new PropertyUsecase(propertyRepo);
const viewingUsecase = new ViewingUsecase(viewingRepo, propertyRepo);
const adminUsecase = new AdminUsecase(adminRepo);

const propertyController = new PropertyController(propertyUsecase);
const viewingController = new ViewingController(viewingUsecase);
const adminController = new AdminController(adminUsecase);

export const router = Router();

// ---- Properties ---------------------------------------------------------
// Public: browse listings, no auth required.
router.get('/properties/search', propertyController.searchNearby);
router.get('/properties/:id', propertyController.getById);

// Authenticated: agent-only mutations.
router.post('/properties', authenticate, requireRole('agent', 'admin'), propertyController.create);
router.post('/properties/:id/publish', authenticate, requireRole('agent', 'admin'), propertyController.publish);
router.get('/properties/mine/list', authenticate, requireRole('agent', 'admin'), propertyController.listMine);
router.delete('/properties/:id', authenticate, requireRole('agent', 'admin'), propertyController.remove);

// ---- Viewings (Appointment Booking) -------------------------------------
// All viewing endpoints require authentication.
router.post('/viewings', authenticate, requireRole('client', 'agent', 'admin'), viewingController.request);
router.post('/viewings/:id/confirm', authenticate, requireRole('agent', 'admin'), viewingController.confirm);
router.post('/viewings/:id/cancel', authenticate, viewingController.cancel);
router.get('/viewings/property/:propertyId', authenticate, viewingController.listForProperty);
router.get('/viewings/mine/list', authenticate, viewingController.listMine);

// ---- Admin ---------------------------------------------------------------
// Every route here is admin-only: user management and unrestricted
// property visibility/moderation.
router.get('/admin/users', authenticate, requireRole('admin'), adminController.listUsers);
router.patch('/admin/users/:id/role', authenticate, requireRole('admin'), adminController.updateUserRole);
router.get('/admin/properties', authenticate, requireRole('admin'), adminController.listAllProperties);
