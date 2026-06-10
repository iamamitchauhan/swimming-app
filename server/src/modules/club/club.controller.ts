import { Request, Response, NextFunction } from 'express';
import { ClubService } from './club.service';
import { HTTP_STATUS } from '../../shared/constants/httpStatus';
import { MESSAGES } from '../../shared/constants/messages';
import { sendSuccess } from '../../shared/utils/response';
import { rejectClubSchema } from './club.validation';
import { UnauthorizedError } from '../../shared/errors/domain.errors';

export class ClubController {
  constructor(private readonly service: ClubService) {}

  /**
   * GET /clubs/pending
   * List clubs awaiting approval (super_admin only).
   */
  getPending = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const clubs = await this.service.getPendingClubs();
      sendSuccess(res, { clubs }, MESSAGES.SUCCESS, HTTP_STATUS.OK);
    } catch (err) {
      next(err);
    }
  };

  /**
   * GET /clubs
   * List all clubs (super_admin only).
   */
  getAll = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const clubs = await this.service.getAllClubs();
      sendSuccess(res, { clubs }, MESSAGES.SUCCESS, HTTP_STATUS.OK);
    } catch (err) {
      next(err);
    }
  };

  /**
   * GET /clubs/my
   * Return the club owned by the authenticated admin.
   */
  getMyClub = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.id;
      if (!userId) return next(new UnauthorizedError());
      const club = await this.service.getMyClub(userId);
      sendSuccess(res, { club }, MESSAGES.SUCCESS, HTTP_STATUS.OK);
    } catch (err) {
      next(err);
    }
  };

  /**
   * GET /clubs/:clubId
   * Return a single club by ID (super_admin only).
   */
  getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { clubId } = req.params;
      const club = await this.service.getClubById(clubId!);
      sendSuccess(res, { club }, MESSAGES.SUCCESS, HTTP_STATUS.OK);
    } catch (err) {
      next(err);
    }
  };

  /**
   * PUT /clubs/:clubId/approve
   * Approve a pending club (super_admin only).
   */
  approve = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { clubId } = req.params;
      const club = await this.service.approveClub(clubId!);
      sendSuccess(res, { club }, MESSAGES.CLUB_APPROVED, HTTP_STATUS.OK);
    } catch (err) {
      next(err);
    }
  };

  /**
   * PUT /clubs/:clubId/reject
   * Reject a pending club with a reason (super_admin only).
   */
  reject = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { clubId } = req.params;
      const { reason } = rejectClubSchema.parse(req.body);
      const club = await this.service.rejectClub(clubId!, reason);
      sendSuccess(res, { club }, MESSAGES.CLUB_REJECTED, HTTP_STATUS.OK);
    } catch (err) {
      next(err);
    }
  };
}
