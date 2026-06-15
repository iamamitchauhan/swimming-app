import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { ClaimsRepository } from './claims.repository';
import { ClaimsService } from './claims.service';
import { ClaimsController } from './claims.controller';

const repository = new ClaimsRepository();
const service = new ClaimsService(repository);
const controller = new ClaimsController(service);

/**
 * Claims router — mounted at /api/v1/claims by app.ts.
 *
 * GET    /           — list paginated claims for the authenticated firm
 * GET    /:id        — get a single claim by id
 * POST   /           — create a new claim
 * PATCH  /:id        — partially update a claim
 * DELETE /:id        — soft-delete a claim
 * PATCH  /:id/status — transition a claim to a new status
 *
 * All routes require a valid JWT (authenticate middleware).
 */
const claimsRouter = Router();

claimsRouter.use(authenticate);

claimsRouter.get('/', controller.list);
claimsRouter.get('/:id', controller.getOne);
claimsRouter.post('/', controller.create);
claimsRouter.patch('/:id/status', controller.updateStatus);
claimsRouter.patch('/:id', controller.update);
claimsRouter.delete('/:id', controller.remove);

export { claimsRouter };
