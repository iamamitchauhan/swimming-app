import { Router } from "express";
import { authenticate } from "../../middleware/auth.middleware";
import { authorize } from "../../middleware/authorize.middleware";
import { USER_ROLES } from "../../shared/constants/roles";
import { GroupRepository } from "./group.repository";
import { GroupService } from "./group.service";
import { GroupController } from "./group.controller";
import { EmailTemplateRepository } from "../email-template/email-template.repository";
import { EmailTemplateService } from "../email-template/email-template.service";

const repo = new GroupRepository();
const service = new GroupService(repo);
const emailTemplateRepo = new EmailTemplateRepository();
const emailTemplateService = new EmailTemplateService(emailTemplateRepo);
const controller = new GroupController(service, emailTemplateService);

/**
 * Group router — mounted at /api/v1/groups by app.ts.
 *
 * GET    /        — list groups for the user's club (admin, coach)
 * GET    /:id     — get a single group (admin, coach)
 * POST   /        — create a group (admin, coach)
 * PUT    /:id     — update a group's name, color and description (admin, coach)
 * DELETE /:id     — soft-delete a group (admin, coach)
 */
const groupRouter = Router();

groupRouter.get("/", authenticate, authorize(USER_ROLES.ADMIN, USER_ROLES.COACH), controller.listByClub);

groupRouter.get("/:id", authenticate, authorize(USER_ROLES.ADMIN, USER_ROLES.COACH), controller.getById);

groupRouter.post("/", authenticate, authorize(USER_ROLES.ADMIN, USER_ROLES.COACH), controller.create);

groupRouter.put("/:id", authenticate, authorize(USER_ROLES.ADMIN, USER_ROLES.COACH), controller.update);

groupRouter.delete("/:id", authenticate, authorize(USER_ROLES.ADMIN, USER_ROLES.COACH), controller.delete);

export { groupRouter };
