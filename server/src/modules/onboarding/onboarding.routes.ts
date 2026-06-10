import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { authorize } from '../../middleware/authorize.middleware';
import { USER_ROLES } from '../../shared/constants/roles';
import { OnboardingRepository } from './onboarding.repository';
import { OnboardingService } from './onboarding.service';
import { OnboardingController } from './onboarding.controller';
import { InvitationRepository } from '../invitation/invitation.repository';

const onboardingRepo = new OnboardingRepository();
const invitationRepo = new InvitationRepository();
const service = new OnboardingService(onboardingRepo, invitationRepo);
const controller = new OnboardingController(service);

/**
 * Onboarding router — mounted at /api/v1/onboarding by app.ts.
 * All routes require authentication. Only admin role can onboard a club.
 *
 * GET  /status    — return current step + saved club data
 * PUT  /step/1    — save club info
 * PUT  /step/2    — invite coaches (optional)
 * PUT  /step/3    — submit club for review
 */
const onboardingRouter = Router();

onboardingRouter.use(authenticate, authorize(USER_ROLES.ADMIN));

onboardingRouter.get('/status', controller.getStatus);
onboardingRouter.put('/step/1', controller.saveStep1);
onboardingRouter.put('/step/2', controller.saveStep2);
onboardingRouter.put('/step/3', controller.submitClub);

export { onboardingRouter };
