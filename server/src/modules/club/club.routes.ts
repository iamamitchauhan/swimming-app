import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { authorize } from '../../middleware/authorize.middleware';
import { USER_ROLES } from '../../shared/constants/roles';
import { ClubRepository } from './club.repository';
import { ClubService } from './club.service';
import { ClubController } from './club.controller';

const repo = new ClubRepository();
const service = new ClubService(repo);
const controller = new ClubController(service);

/**
 * Club router — mounted at /api/v1/clubs by app.ts.
 *
 * GET  /pending          — list pending clubs (super_admin)
 * GET  /                 — list all clubs (super_admin)
 * GET  /my               — get own club (admin)
 * GET  /:clubId          — get club by ID (super_admin)
 * PUT  /:clubId/approve  — approve club (super_admin)
 * PUT  /:clubId/reject   — reject club with reason (super_admin)
 */
const clubRouter = Router();

clubRouter.get(
  '/pending',
  authenticate,
  authorize(USER_ROLES.SUPER_ADMIN),
  controller.getPending,
);

clubRouter.get(
  '/',
  authenticate,
  authorize(USER_ROLES.SUPER_ADMIN),
  controller.getAll,
);

clubRouter.get(
  '/my',
  authenticate,
  authorize(USER_ROLES.ADMIN),
  controller.getMyClub,
);

clubRouter.get(
  '/:clubId',
  authenticate,
  authorize(USER_ROLES.SUPER_ADMIN),
  controller.getById,
);

clubRouter.put(
  '/:clubId/approve',
  authenticate,
  authorize(USER_ROLES.SUPER_ADMIN),
  controller.approve,
);

clubRouter.put(
  '/:clubId/reject',
  authenticate,
  authorize(USER_ROLES.SUPER_ADMIN),
  controller.reject,
);

export { clubRouter };
