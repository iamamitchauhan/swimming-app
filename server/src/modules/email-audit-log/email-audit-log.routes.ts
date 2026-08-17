import { Router } from "express";
import { authenticate } from "../../middleware/auth.middleware";
import { authorize } from "../../middleware/authorize.middleware";
import { USER_ROLES } from "../../shared/constants/roles";
import { EmailAuditLogController } from "./email-audit-log.controller";

const controller = new EmailAuditLogController();

/**
 * Email audit log router — mounted at /api/v1/email-audit-logs by app.ts.
 *
 * GET / — list audit log rows with filters and pagination (admin, coach, super_admin)
 */
const emailAuditLogRouter = Router();

emailAuditLogRouter.get(
  "/",
  authenticate,
  authorize(USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN, USER_ROLES.COACH),
  controller.list,
);

export { emailAuditLogRouter };
