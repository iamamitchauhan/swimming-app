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
 * GET  /:id/registrations        — get all registrations for a tryout (admin, coach)
 * GET  /:id/leaderboard          — get scored leaderboard (admin, coach)
 * PUT  /:id/registrations/:regId/decision — update status to offered/rejected
 * PUT  /:id/registrations/:regId/promote  — promote from waitlist
 * PUT  /:id/registrations/:regId/verify   — update USA-S verification
 * PUT  /:id/registrations/:regId/score    — update scores
 * POST /:id/comms                — send bulk communication
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
tryoutRouter.get('/:id/registrations', authenticate, authorize(USER_ROLES.ADMIN, USER_ROLES.COACH), controller.getRegistrations);
tryoutRouter.get('/:id/leaderboard', authenticate, authorize(USER_ROLES.ADMIN, USER_ROLES.COACH), controller.getLeaderboard);
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

tryoutRouter.patch(
  '/:id/publish',
  authenticate,
  authorize(USER_ROLES.ADMIN, USER_ROLES.COACH),
  controller.publish,
);

tryoutRouter.delete(
  '/:id',
  authenticate,
  authorize(USER_ROLES.ADMIN, USER_ROLES.COACH),
  controller.delete,
);

// ─── Admin registration actions ───────────────────────────────────────────────

tryoutRouter.put(
  '/:id/registrations/:regId/decision',
  authenticate,
  authorize(USER_ROLES.ADMIN, USER_ROLES.COACH),
  controller.decision,
);

tryoutRouter.put(
  '/:id/registrations/:regId/promote',
  authenticate,
  authorize(USER_ROLES.ADMIN, USER_ROLES.COACH),
  controller.promoteWaitlist,
);

tryoutRouter.put(
  '/:id/registrations/:regId/verify',
  authenticate,
  authorize(USER_ROLES.ADMIN, USER_ROLES.COACH),
  controller.verifyUsa,
);

tryoutRouter.put(
  '/:id/registrations/:regId/score',
  authenticate,
  authorize(USER_ROLES.ADMIN, USER_ROLES.COACH),
  controller.updateScore,
);

tryoutRouter.post(
  '/:id/comms',
  authenticate,
  authorize(USER_ROLES.ADMIN, USER_ROLES.COACH),
  controller.sendComms,
);

export { tryoutRouter };
