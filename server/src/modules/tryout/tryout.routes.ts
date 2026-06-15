import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { authorize } from '../../middleware/authorize.middleware';
import { clubIsolation } from '../../middleware/clubIsolation.middleware';
import { USER_ROLES } from '../../shared/constants/roles';
import { TryoutRepository } from './tryout.repository';
import { TryoutService } from './tryout.service';
import { TryoutController, upload } from './tryout.controller';

const repo = new TryoutRepository();
const service = new TryoutService(repo);
const controller = new TryoutController(service);

/**
 * Tryout router — mounted at /api/v1/tryouts by app.ts.
 *
 * GET  /public                  — list all active tryouts (no auth)
 * GET  /public/:id               — get single active tryout (no auth)
 * GET  /public/:id/sessions      — get sessions for a tryout (no auth)
 * GET  /public/:id/slots         — get slots for a tryout, optional ?sessionId= (no auth)
 * GET  /                         — list tryouts for user's club (admin, coach)
 * GET  /:id                      — get tryout by ID (admin, coach)
 * GET  /:id/sessions             — get sessions for a tryout (admin, coach)
 * GET  /:id/slots                — get slots for a tryout (admin, coach)
 * POST /                         — create tryout (admin, coach)
 * PUT  /:id                      — update tryout (admin, coach)
 * DELETE /:id                    — delete tryout (admin, coach)
 */
const tryoutRouter = Router();

tryoutRouter.get('/public', controller.listPublic);
tryoutRouter.get('/public/:id/sessions', controller.getSessions);
tryoutRouter.get('/public/:id/slots', controller.getSlots);
tryoutRouter.get('/public/:id', controller.getPublicById);
tryoutRouter.get('/', authenticate, authorize(USER_ROLES.ADMIN, USER_ROLES.COACH), controller.list);
tryoutRouter.get('/:id/sessions', authenticate, authorize(USER_ROLES.ADMIN, USER_ROLES.COACH), controller.getSessions);
tryoutRouter.get('/:id/slots', authenticate, authorize(USER_ROLES.ADMIN, USER_ROLES.COACH), controller.getSlots);
tryoutRouter.get('/:id', authenticate, authorize(USER_ROLES.ADMIN, USER_ROLES.COACH), controller.getById);

tryoutRouter.post(
  '/',
  authenticate,
  authorize(USER_ROLES.ADMIN, USER_ROLES.COACH),
  upload.single('banner'),
  controller.create,
);

tryoutRouter.put(
  '/:id',
  authenticate,
  authorize(USER_ROLES.ADMIN, USER_ROLES.COACH),
  upload.single('banner'),
  controller.update,
);

tryoutRouter.delete(
  '/:id',
  authenticate,
  authorize(USER_ROLES.ADMIN, USER_ROLES.COACH),
  controller.delete,
);

export { tryoutRouter };
