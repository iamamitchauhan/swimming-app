import { Router } from "express";
import { authenticate } from "../../middleware/auth.middleware";
import { authorize } from "../../middleware/authorize.middleware";
import { clubIsolation } from "../../middleware/clubIsolation.middleware";
import { USER_ROLES } from "../../shared/constants/roles";
import { ScoringQuestionRepository } from "./scoring-question.repository";
import { ScoringQuestionService } from "./scoring-question.service";
import { ScoringQuestionController, upload } from "./scoring-question.controller";

const repo = new ScoringQuestionRepository();
const service = new ScoringQuestionService(repo);
const controller = new ScoringQuestionController(service);

const STAFF = [USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN, USER_ROLES.COACH] as const;
const ADMINS = [USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN] as const;

/**
 * Club-wide evaluation-question bank — mounted at
 * /api/v1/clubs/:clubId/scoring-questions by app.ts.
 *
 * GET    /                — list the bank (staff)
 * GET    /template        — download the starter CSV (staff)
 * POST   /preview         — dry-run parse a sheet (admins)
 * POST   /import          — append-only import (admins)
 * DELETE /bulk            — soft-delete several questions (admins)
 * DELETE /:questionId     — soft-delete one question (admins)
 */
const scoringQuestionRouter = Router({ mergeParams: true });

scoringQuestionRouter.get(
  "/",
  authenticate,
  authorize(...STAFF),
  clubIsolation,
  controller.list,
);

// Declared before /:questionId so "template" is never read as an id.
scoringQuestionRouter.get(
  "/template",
  authenticate,
  authorize(...STAFF),
  clubIsolation,
  controller.downloadTemplate,
);

scoringQuestionRouter.post(
  "/preview",
  authenticate,
  authorize(...ADMINS),
  clubIsolation,
  upload.single("file"),
  controller.preview,
);

scoringQuestionRouter.post(
  "/import",
  authenticate,
  authorize(...ADMINS),
  clubIsolation,
  upload.single("file"),
  controller.import,
);

// Bulk delete must be registered before /:questionId so "bulk" isn't captured.
scoringQuestionRouter.delete(
  "/bulk",
  authenticate,
  authorize(...ADMINS),
  clubIsolation,
  controller.removeMany,
);

scoringQuestionRouter.delete(
  "/:questionId",
  authenticate,
  authorize(...ADMINS),
  clubIsolation,
  controller.remove,
);

export { scoringQuestionRouter };
