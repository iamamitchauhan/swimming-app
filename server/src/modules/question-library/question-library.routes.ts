import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { authorize } from '../../middleware/authorize.middleware';
import { USER_ROLES } from '../../shared/constants/roles';
import { QuestionLibraryRepository } from './question-library.repository';
import { QuestionLibraryService } from './question-library.service';
import { QuestionLibraryController } from './question-library.controller';

const repo = new QuestionLibraryRepository();
const service = new QuestionLibraryService(repo);
const controller = new QuestionLibraryController(service);

/**
 * Question Library router — mounted at /api/v1/question-library by app.ts.
 *
 * GET    /                        — list all categories (admin, coach)
 * GET    /:id                     — get single category (admin, coach)
 * POST   /                        — create category (admin only)
 * PUT    /:id                     — replace category / questions (admin only)
 * DELETE /:id                     — delete category (admin only)
 * POST   /:id/questions           — append a question to a category (admin only)
 * PATCH  /:id/questions/:index    — update a question by index (admin only)
 * DELETE /:id/questions/:index    — remove a question by index (admin only)
 */
const questionLibraryRouter = Router();

questionLibraryRouter.get(
  '/',
  authenticate,
  authorize(USER_ROLES.ADMIN, USER_ROLES.COACH),
  controller.listAll,
);

questionLibraryRouter.get(
  '/:id',
  authenticate,
  authorize(USER_ROLES.ADMIN, USER_ROLES.COACH),
  controller.getById,
);

questionLibraryRouter.post(
  '/',
  authenticate,
  authorize(USER_ROLES.ADMIN),
  controller.create,
);

questionLibraryRouter.put(
  '/:id',
  authenticate,
  authorize(USER_ROLES.ADMIN),
  controller.update,
);

questionLibraryRouter.delete(
  '/:id',
  authenticate,
  authorize(USER_ROLES.ADMIN),
  controller.delete,
);

questionLibraryRouter.post(
  '/:id/questions',
  authenticate,
  authorize(USER_ROLES.ADMIN),
  controller.addQuestion,
);

questionLibraryRouter.patch(
  '/:id/questions/:index',
  authenticate,
  authorize(USER_ROLES.ADMIN),
  controller.updateQuestion,
);

questionLibraryRouter.delete(
  '/:id/questions/:index',
  authenticate,
  authorize(USER_ROLES.ADMIN),
  controller.removeQuestion,
);

export { questionLibraryRouter };
