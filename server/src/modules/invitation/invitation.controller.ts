import { Request, Response, NextFunction } from "express";
import { InvitationService } from "./invitation.service";
import { HTTP_STATUS } from "../../shared/constants/httpStatus";
import { MESSAGES } from "../../shared/constants/messages";
import { sendSuccess } from "../../shared/utils/response";
import { sendInvitationSchema, acceptInvitationSchema } from "./invitation.validation";
import { UnauthorizedError, ForbiddenError, BadRequestError } from "../../shared/errors/domain.errors";
import { UserRole } from "../../shared/constants/roles";

export class InvitationController {
  constructor(private readonly service: InvitationService) {}

  /**
   * POST /invitations
   * Send an invitation to a new user with a specified role.
   */
  sendInvitation = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      req.step?.("received", { params: req.params, query: req.query, body: req.body });
      const user = req.user;
      if (!user) return next(new UnauthorizedError());
      if (!user.clubId) return next(new ForbiddenError("You must belong to a club to send invitations."));

      const { email, role } = sendInvitationSchema.parse(req.body);
      req.step?.("validated");
      req.step?.("delegating to service");
      const invitation = await this.service.sendInvitation(user.id, user.role, user.clubId, email, role as UserRole);
      req.step?.("responding", { status: HTTP_STATUS.CREATED });
      sendSuccess(res, { invitation }, MESSAGES.INVITATION_SENT, HTTP_STATUS.CREATED);
    } catch (err) {
      next(err);
    }
  };

  /**
   * POST /invitations/accept
   * Accept an invitation using the token from the invite email.
   */
  acceptInvitation = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      req.step?.("received", { params: req.params, query: req.query, body: req.body });
      const { token, firstName, lastName } = acceptInvitationSchema.parse(req.body);
      req.step?.("validated");
      req.step?.("delegating to service");
      const result = await this.service.acceptInvitation(token, firstName, lastName);
      req.step?.("responding", { status: HTTP_STATUS.CREATED });
      sendSuccess(res, result, MESSAGES.INVITATION_ACCEPTED, HTTP_STATUS.CREATED);
    } catch (err) {
      next(err);
    }
  };

  /**
   * GET /invitations/my
   * List invitations sent by the authenticated user.
   */
  listMySent = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      req.step?.("received", { params: req.params, query: req.query, body: req.body });
      const userId = req.user?.id;
      if (!userId) return next(new UnauthorizedError());
      req.step?.("validated");
      req.step?.("delegating to service");
      const invitations = await this.service.listMySentInvitations(userId);
      req.step?.("responding", { status: HTTP_STATUS.OK });
      sendSuccess(res, { invitations }, MESSAGES.SUCCESS, HTTP_STATUS.OK);
    } catch (err) {
      next(err);
    }
  };

  /**
   * GET /invitations/club/:clubId
   * List all invitations for a club (admin of that club or super_admin).
   */
  listClub = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      req.step?.("received", { params: req.params, query: req.query, body: req.body });
      const { clubId } = req.params;
      if (!clubId) return next(new BadRequestError("clubId is required"));
      req.step?.("validated");
      req.step?.("delegating to service");
      const invitations = await this.service.listClubInvitations(clubId);
      req.step?.("responding", { status: HTTP_STATUS.OK });
      sendSuccess(res, { invitations }, MESSAGES.SUCCESS, HTTP_STATUS.OK);
    } catch (err) {
      next(err);
    }
  };

  /**
   * POST /invitations/:invitationId/resend
   * Resend an invitation with a new token and extended expiry.
   */
  resendInvitation = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      req.step?.("received", { params: req.params, query: req.query, body: req.body });
      const { invitationId } = req.params;
      if (!invitationId) return next(new BadRequestError("invitationId is required"));
      req.step?.("validated");
      req.step?.("delegating to service");
      const invitation = await this.service.resendInvitation(invitationId);
      req.step?.("responding", { status: HTTP_STATUS.OK });
      sendSuccess(res, { invitation }, MESSAGES.INVITATION_SENT, HTTP_STATUS.OK);
    } catch (err) {
      next(err);
    }
  };

  /**
   * DELETE /invitations/:invitationId
   * Cancel (delete) an invitation.
   */
  cancelInvitation = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      req.step?.("received", { params: req.params, query: req.query, body: req.body });
      const { invitationId } = req.params;
      if (!invitationId) return next(new BadRequestError("invitationId is required"));
      req.step?.("validated");
      req.step?.("delegating to service");
      await this.service.cancelInvitation(invitationId);
      req.step?.("responding", { status: HTTP_STATUS.OK });
      sendSuccess(res, null, MESSAGES.DELETED, HTTP_STATUS.OK);
    } catch (err) {
      next(err);
    }
  };
}
