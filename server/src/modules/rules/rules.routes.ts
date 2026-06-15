import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { RulesRepository } from './rules.repository';
import { RulesService } from './rules.service';
import { RulesController } from './rules.controller';

const repository = new RulesRepository();
const service = new RulesService(repository);
const controller = new RulesController(service);

/**
 * Rules router — mounted at /api/v1/rules by app.ts.
 *
 * GET /           — list all state rules
 * GET /:state     — get rule for a specific state
 * PUT /:state     — create or update rule for a state (admin only)
 *
 * All routes require a valid JWT (authenticate middleware).
 */
const rulesRouter = Router();

rulesRouter.use(authenticate);

rulesRouter.get('/', controller.getAll);
rulesRouter.get('/:state', controller.getByState);
rulesRouter.put('/:state', controller.updateRule);

export { rulesRouter };
