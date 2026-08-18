import { Request, Response, NextFunction } from "express";
import { UserService } from "./user.service";
import { HTTP_STATUS } from "../../shared/constants/httpStatus";
import { MESSAGES } from "../../shared/constants/messages";
import { sendSuccess } from "../../shared/utils/response";
import { updateProfileSchema } from "./user.validation";
import { UnauthorizedError } from "../../shared/errors/domain.errors";
import { UserRole } from "../../shared/constants/roles";

export class UserController {
  constructor(private readonly service: UserService) {}

  /**
   * GET /users/me
   * Returns the authenticated user's full profile.
   */
  getMe = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      req.step?.("received", { params: req.params, query: req.query, body: req.body });
      const userId = req.user?.id;
      if (!userId) return next(new UnauthorizedError());
      req.step?.("validated");
      req.step?.("delegating to service");
      const user = await this.service.getMe(userId);
      req.step?.("responding", { status: HTTP_STATUS.OK });
      sendSuccess(res, { user }, MESSAGES.SUCCESS, HTTP_STATUS.OK);
    } catch (err) {
      next(err);
    }
  };

  /**
   * PUT /users/me
   * Updates the authenticated user's first and/or last name.
   */
  updateMe = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      req.step?.("received", { params: req.params, query: req.query, body: req.body });
      const userId = req.user?.id;
      if (!userId) return next(new UnauthorizedError());
      const input = updateProfileSchema.parse(req.body);
      req.step?.("validated");
      req.step?.("delegating to service");
      const user = await this.service.updateMe(userId, input);
      req.step?.("responding", { status: HTTP_STATUS.OK });
      sendSuccess(res, { user }, MESSAGES.UPDATED, HTTP_STATUS.OK);
    } catch (err) {
      next(err);
    }
  };

  /**
   * GET /users
   * Lists all users (super_admin only). Supports ?role=, ?roles=, ?statuses=, and ?clubId= filters.
   */
  listAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      req.step?.("received", { params: req.params, query: req.query, body: req.body });
      const role = req.query["role"] as UserRole | undefined;
      const roles = ((req.query["roles"] as string) || "")
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean) as UserRole[];
      const statuses = ((req.query["statuses"] as string) || "")
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean);
      const clubId = req.query["clubId"] as string | undefined;
      const search = (req.query["search"] as string | undefined)?.trim() || undefined;
      const page = Math.max(1, parseInt(req.query["page"] as string) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(req.query["limit"] as string) || 20));
      req.step?.("delegating to service");
      const result = await this.service.listAll({ role, roles, statuses, clubId, search }, { page, limit });
      req.step?.("responding", { status: HTTP_STATUS.OK });
      sendSuccess(res, result, MESSAGES.SUCCESS, HTTP_STATUS.OK);
    } catch (err) {
      next(err);
    }
  };

  /**
   * GET /users/:userId
   * Returns a single user by ID (super_admin only).
   */
  getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      req.step?.("received", { params: req.params, query: req.query, body: req.body });
      const { userId } = req.params;
      req.step?.("delegating to service");
      const user = await this.service.getById(userId!);
      req.step?.("responding", { status: HTTP_STATUS.OK });
      sendSuccess(res, { user }, MESSAGES.SUCCESS, HTTP_STATUS.OK);
    } catch (err) {
      next(err);
    }
  };

  /**
   * PATCH /users/:userId/role
   * Changes the role of a club member.
   */
  changeRole = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      req.step?.("received", { params: req.params, query: req.query, body: req.body });
      const { userId } = req.params;
      const { role } = req.body;
      if (!["admin", "coach"].includes(role)) {
        res.status(400).json({ message: "Invalid role. Must be admin or coach." });
        return;
      }
      req.step?.("validated");
      req.step?.("delegating to service");
      const user = await this.service.changeRole(userId!, role as UserRole);
      req.step?.("responding", { status: HTTP_STATUS.OK });
      sendSuccess(res, { user }, MESSAGES.UPDATED, HTTP_STATUS.OK);
    } catch (err) {
      next(err);
    }
  };

  /**
   * DELETE /users/:userId/club
   * Removes a user from the club (soft delete).
   */
  removeFromClub = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      req.step?.("received", { params: req.params, query: req.query, body: req.body });
      const { userId } = req.params;
      req.step?.("delegating to service");
      await this.service.removeFromClub(userId!);
      req.step?.("responding", { status: HTTP_STATUS.OK });
      sendSuccess(res, null, MESSAGES.DELETED, HTTP_STATUS.OK);
    } catch (err) {
      next(err);
    }
  };

  /**
   * GET /users/club/:clubId
   * Returns all users of a specific club plus pending invitations (admin of that club or super_admin).
   */
  getByClub = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      req.step?.("received", { params: req.params, query: req.query, body: req.body });
      const { clubId } = req.params;
      req.step?.("delegating to service");
      const result = await this.service.getByClub(clubId!);
      req.step?.("responding", { status: HTTP_STATUS.OK });
      sendSuccess(res, result, MESSAGES.SUCCESS, HTTP_STATUS.OK);
    } catch (err) {
      next(err);
    }
  };
}
