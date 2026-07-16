import { Router } from "express";
import { authenticate } from "../../middleware/auth.middleware";
import { authorize } from "../../middleware/authorize.middleware";
import { clubIsolation } from "../../middleware/clubIsolation.middleware";
import { USER_ROLES } from "../../shared/constants/roles";
import { UserRepository } from "./user.repository";
import { UserService } from "./user.service";
import { UserController } from "./user.controller";

const repo = new UserRepository();
const service = new UserService(repo);
const controller = new UserController(service);

/**
 * User router — mounted at /api/v1/users by app.ts.
 *
 * GET  /me              — return own profile (any authenticated)
 * PUT  /me              — update own profile (any authenticated)
 * GET  /club/:clubId    — list users in a club (admin, coach of club or super_admin)
 * GET  /                — list all users (super_admin)
 * GET  /:userId         — get user by ID (super_admin)
 */
const userRouter = Router();

userRouter.get("/me", authenticate, controller.getMe);
userRouter.put("/me", authenticate, controller.updateMe);

userRouter.get(
  "/club/:clubId",
  authenticate,
  authorize(USER_ROLES.ADMIN, USER_ROLES.COACH, USER_ROLES.SUPER_ADMIN),
  clubIsolation,
  controller.getByClub,
);

userRouter.patch("/:userId/role", authenticate, authorize(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN), controller.changeRole);

userRouter.delete("/:userId/club", authenticate, authorize(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN), controller.removeFromClub);

userRouter.get("/", authenticate, authorize(USER_ROLES.SUPER_ADMIN), controller.listAll);

userRouter.get("/:userId", authenticate, authorize(USER_ROLES.SUPER_ADMIN), controller.getById);

export { userRouter };
