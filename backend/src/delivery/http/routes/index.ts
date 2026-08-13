import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth.middleware';
import { PropertyController } from '../controllers/property.controller';
import { ViewingController } from '../controllers/viewing.controller';
import { PropertyUsecase } from '../../../usecase/property.usecase';
import { ViewingUsecase } from '../../../usecase/viewing.usecase';
import { SupabasePropertyRepository } from '../../../repository/property.repository';
import { PgViewingRepository } from '../../../repository/viewing.repository';

/**
 * Composition root: concrete repository implementations are instantiated
 * here (the only place infrastructure and domain/usecase code meet) and
 * injected into usecases, which are injected into controllers. Swapping
 * Supabase for another Postgres provider, or wiring in a fake repository
 * for tests, only touches this file.
 */
const propertyRepo = new SupabasePropertyRepository();
const viewingRepo = new PgViewingRepository();

const propertyUsecase = new PropertyUsecase(propertyRepo);
const viewingUsecase = new ViewingUsecase(viewingRepo, propertyRepo);

const propertyController = new PropertyController(propertyUsecase);
const viewingController = new ViewingController(viewingUsecase);

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
