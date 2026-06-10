import { Request, Response, NextFunction } from 'express';
import { UserService } from './user.service';
import { HTTP_STATUS } from '../../shared/constants/httpStatus';
import { MESSAGES } from '../../shared/constants/messages';
import { sendSuccess } from '../../shared/utils/response';
import { updateProfileSchema } from './user.validation';
import { UnauthorizedError } from '../../shared/errors/domain.errors';
import { UserRole } from '../../shared/constants/roles';

export class UserController {
  constructor(private readonly service: UserService) {}

  /**
   * GET /users/me
   * Returns the authenticated user's full profile.
   */
  getMe = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.id;
      if (!userId) return next(new UnauthorizedError());
      const user = await this.service.getMe(userId);
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
      const userId = req.user?.id;
      if (!userId) return next(new UnauthorizedError());
      const input = updateProfileSchema.parse(req.body);
      const user = await this.service.updateMe(userId, input);
      sendSuccess(res, { user }, MESSAGES.UPDATED, HTTP_STATUS.OK);
    } catch (err) {
      next(err);
    }
  };

  /**
   * GET /users
   * Lists all users (super_admin only). Supports ?role= and ?clubId= filters.
   */
  listAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const role = req.query['role'] as UserRole | undefined;
      const clubId = req.query['clubId'] as string | undefined;
      const users = await this.service.listAll({ role, clubId });
      sendSuccess(res, { users }, MESSAGES.SUCCESS, HTTP_STATUS.OK);
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
      const { userId } = req.params;
      const user = await this.service.getById(userId!);
      sendSuccess(res, { user }, MESSAGES.SUCCESS, HTTP_STATUS.OK);
    } catch (err) {
      next(err);
    }
  };

  /**
   * GET /users/club/:clubId
   * Returns all users of a specific club (admin of that club or super_admin).
   */
  getByClub = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { clubId } = req.params;
      const users = await this.service.getByClub(clubId!);
      sendSuccess(res, { users }, MESSAGES.SUCCESS, HTTP_STATUS.OK);
    } catch (err) {
      next(err);
    }
  };
}
