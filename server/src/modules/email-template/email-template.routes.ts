import { Router } from "express";
import { authenticate } from "../../middleware/auth.middleware";
import { authorize } from "../../middleware/authorize.middleware";
import { USER_ROLES } from "../../shared/constants/roles";
import { EmailTemplateRepository } from "./email-template.repository";
import { EmailTemplateService } from "./email-template.service";
import { EmailTemplateController } from "./email-template.controller";

const repo = new EmailTemplateRepository();
const service = new EmailTemplateService(repo);
const controller = new EmailTemplateController(service);

/**
 * Email Template router — mounted at /api/v1/email-templates by app.ts.
 *
 * GET  /                — list templates for the authenticated user's club (admin, coach)
 * POST /bulk            — bulk upsert templates for the authenticated user's club (admin, coach)
 */
const emailTemplateRouter = Router();

emailTemplateRouter.get(
  "/",
  authenticate,
  authorize(USER_ROLES.ADMIN, USER_ROLES.COACH),
  controller.listByClub,
);

emailTemplateRouter.post(
  "/bulk",
  authenticate,
  authorize(USER_ROLES.ADMIN, USER_ROLES.COACH),
  controller.bulkUpsert,
);

export { emailTemplateRouter };
