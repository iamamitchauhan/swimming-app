import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { AgentsRepository } from './agents.repository';
import { AgentsService } from './agents.service';
import { AgentsController } from './agents.controller';

const repository = new AgentsRepository();
const service = new AgentsService(repository);
const controller = new AgentsController(service);

/**
 * Agents router — mounted at /api/v1/agents by app.ts.
 *
 * GET  /           — list all agent configurations
 * GET  /activity   — list recent agent activity (query: agentId?, limit?)
 * PATCH /:agentId  — update an agent configuration (admin only)
 *
 * All routes require a valid JWT (authenticate middleware).
 */
const agentsRouter = Router();

agentsRouter.use(authenticate);

agentsRouter.get('/', controller.getConfigs);
agentsRouter.get('/activity', controller.getActivity);
agentsRouter.patch('/:agentId', controller.updateConfig);

export { agentsRouter };
