import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { authorize } from '../../middleware/authorize.middleware';
import { USER_ROLES } from '../../shared/constants/roles';
import { RegistrationRepository } from './registration.repository';
import { TryoutRepository } from '../tryout/tryout.repository';
import { TryoutSessionRepository } from '../tryout/tryout-session.repository';
import { TryoutSlotRepository } from '../tryout/tryout-slot.repository';
import { SwimmerRepository } from '../swimmer/swimmer.repository';
import { RegistrationService } from './registration.service';
import { RegistrationController } from './registration.controller';

const repository = new RegistrationRepository();
const tryoutRepository = new TryoutRepository();
const sessionRepository = new TryoutSessionRepository();
const slotRepository = new TryoutSlotRepository();
const swimmerRepository = new SwimmerRepository();
const service = new RegistrationService(repository, tryoutRepository, sessionRepository, slotRepository, swimmerRepository);
const controller = new RegistrationController(service);

/**
 * Registration router — mounted at /api/v1/registrations by app.ts
 *
 * Authentication required for all endpoints
 * Only parents can manage their own registrations
 *
 * POST /registrations           — Create registration
 * GET  /registrations/my-kids   — List parent's registrations
 * GET  /registrations/:id       — Get registration details
 * PUT  /registrations/:id       — Update registration status
 */
const registrationRouter = Router();

// All registration routes require authentication
registrationRouter.use(authenticate);

// Only parents can access registration endpoints
registrationRouter.use(authorize(USER_ROLES.PARENT));

registrationRouter.post('/', controller.create);
registrationRouter.get('/my-kids', controller.listByParent);
registrationRouter.get('/:id', controller.getById);
registrationRouter.put('/:id', controller.updateStatus);

export { registrationRouter };
