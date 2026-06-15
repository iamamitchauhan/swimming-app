import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { authorize } from '../../middleware/authorize.middleware';
import { USER_ROLES } from '../../shared/constants/roles';
import { SwimmerRepository } from './swimmer.repository';
import { SwimmerService } from './swimmer.service';
import { SwimmerController } from './swimmer.controller';

const repository = new SwimmerRepository();
const service = new SwimmerService(repository);
const controller = new SwimmerController(service);

/**
 * Swimmer router — mounted at /api/v1/swimmers by app.ts
 *
 * Authentication required for all endpoints
 * Only parents can manage their own swimmers
 *
 * POST   /swimmers              — Create swimmer
 * GET    /swimmers              — List parent's swimmers
 * GET    /swimmers/:id          — Get swimmer details
 * PUT    /swimmers/:id          — Update swimmer
 * DELETE /swimmers/:id          — Deactivate swimmer
 */
const swimmerRouter = Router();

// All swimmer routes require authentication
swimmerRouter.use(authenticate);

// Only parents can access swimmer endpoints
swimmerRouter.use(authorize(USER_ROLES.PARENT));

swimmerRouter.post('/', controller.create);
swimmerRouter.get('/', controller.list);
swimmerRouter.get('/:id', controller.getById);
swimmerRouter.put('/:id', controller.update);
swimmerRouter.delete('/:id', controller.deactivate);

export { swimmerRouter };
