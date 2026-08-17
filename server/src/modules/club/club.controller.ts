import { Request, Response, NextFunction } from "express";
import { ClubService } from "./club.service";
import { HTTP_STATUS } from "../../shared/constants/httpStatus";
import { MESSAGES } from "../../shared/constants/messages";
import { sendSuccess } from "../../shared/utils/response";
import { rejectClubSchema } from "./club.validation";
import { UnauthorizedError } from "../../shared/errors/domain.errors";

export class ClubController {
  constructor(private readonly service: ClubService) {}

  /**
   * GET /clubs/pending
   * List clubs awaiting approval (super_admin only).
   */
  getPending = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      req.step?.("received", { params: req.params, query: req.query, body: req.body });
      req.step?.("delegating to service");
      const clubs = await this.service.getPendingClubs();
      req.step?.("responding", { status: HTTP_STATUS.OK });
      sendSuccess(res, { clubs }, MESSAGES.SUCCESS, HTTP_STATUS.OK);
    } catch (err) {
      next(err);
    }
  };

  /**
   * GET /clubs
   * List all clubs (super_admin only).
   */
  getAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      req.step?.("received", { params: req.params, query: req.query, body: req.body });
      req.step?.("delegating to service");
      const clubs = await this.service.getAllClubs();
      req.step?.("responding", { status: HTTP_STATUS.OK });
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
      req.step?.("received", { params: req.params, query: req.query, body: req.body });
      const userId = req.user?.id;
      if (!userId) return next(new UnauthorizedError());
      req.step?.("validated");
      req.step?.("delegating to service");
      const club = await this.service.getMyClub(userId);
      req.step?.("responding", { status: HTTP_STATUS.OK });
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
      req.step?.("received", { params: req.params, query: req.query, body: req.body });
      const { clubId } = req.params;
      req.step?.("delegating to service");
      const club = await this.service.getClubById(clubId!);
      req.step?.("responding", { status: HTTP_STATUS.OK });
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
      req.step?.("received", { params: req.params, query: req.query, body: req.body });
      const { clubId } = req.params;
      req.step?.("delegating to service");
      const club = await this.service.approveClub(clubId!);
      req.step?.("responding", { status: HTTP_STATUS.OK });
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
      req.step?.("received", { params: req.params, query: req.query, body: req.body });
      const { clubId } = req.params;
      const { reason } = rejectClubSchema.parse(req.body);
      req.step?.("validated");
      req.step?.("delegating to service");
      const club = await this.service.rejectClub(clubId!, reason);
      req.step?.("responding", { status: HTTP_STATUS.OK });
      sendSuccess(res, { club }, MESSAGES.CLUB_REJECTED, HTTP_STATUS.OK);
    } catch (err) {
      next(err);
    }
  };

  /**
   * GET /clubs/coaches
   * Returns all coaches for the authenticated user's club.
   */
  getCoaches = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      req.step?.("received", { params: req.params, query: req.query, body: req.body });
      const clubId = req.user?.clubId;
      if (!clubId) return next(new UnauthorizedError());
      req.step?.("validated");
      req.step?.("delegating to service");
      const coaches = await this.service.getCoaches(clubId as string);
      req.step?.("responding", { status: HTTP_STATUS.OK });
      sendSuccess(res, { coaches }, MESSAGES.SUCCESS, HTTP_STATUS.OK);
    } catch (err) {
      next(err);
    }
  };

  /**
   * GET /clubs/admin-state
   * Returns super-admin dashboard overview stats.
   */
  getSuperAdminState = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      req.step?.("received", { params: req.params, query: req.query, body: req.body });
      req.step?.("delegating to service");
      const state = await this.service.getSuperAdminState();
      req.step?.("responding", { status: HTTP_STATUS.OK });
      sendSuccess(res, state, MESSAGES.SUCCESS, HTTP_STATUS.OK);
    } catch (err) {
      next(err);
    }
  };

  /**
   * GET /clubs/state
   * Returns club overview stats for the authenticated user's club.
   */
  getClubState = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      req.step?.("received", { params: req.params, query: req.query, body: req.body });
      const clubId = req.user?.clubId;
      if (!clubId) return next(new UnauthorizedError());
      req.step?.("validated");
      req.step?.("delegating to service");
      const state = await this.service.getClubState(clubId as string);
      req.step?.("responding", { status: HTTP_STATUS.OK });
      sendSuccess(res, state, MESSAGES.SUCCESS, HTTP_STATUS.OK);
    } catch (err) {
      next(err);
    }
  };
}
