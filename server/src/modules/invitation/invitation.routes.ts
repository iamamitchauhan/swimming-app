import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { authorize } from '../../middleware/authorize.middleware';
import { clubIsolation } from '../../middleware/clubIsolation.middleware';
import { USER_ROLES } from '../../shared/constants/roles';
import { InvitationRepository } from './invitation.repository';
import { InvitationService } from './invitation.service';
import { InvitationController } from './invitation.controller';

const repo = new InvitationRepository();
const service = new InvitationService(repo);
const controller = new InvitationController(service);

/**
 * Invitation router — mounted at /api/v1/invitations by app.ts.
 *
 * POST /               — send an invitation (admin or coach)
 * POST /accept         — accept an invitation (public, token-based)
 * GET  /my             — list invitations sent by authenticated user
 * GET  /club/:clubId   — list all invitations for a club
 */
const invitationRouter = Router();

invitationRouter.post(
  '/',
  authenticate,
  authorize(USER_ROLES.ADMIN, USER_ROLES.COACH),
  controller.sendInvitation,
);

invitationRouter.post('/accept', controller.acceptInvitation);

invitationRouter.get(
  '/my',
  authenticate,
  authorize(USER_ROLES.ADMIN, USER_ROLES.COACH),
  controller.listMySent,
);

invitationRouter.get(
  '/club/:clubId',
  authenticate,
  authorize(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
  clubIsolation,
  controller.listClub,
);

export { invitationRouter };
