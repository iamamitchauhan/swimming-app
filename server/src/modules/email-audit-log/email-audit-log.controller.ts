import { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import { EmailAuditLogModel } from "../../models/email-audit-log.model";
import { USER_ROLES } from "../../shared/constants/roles";
import { HTTP_STATUS } from "../../shared/constants/httpStatus";
import { MESSAGES } from "../../shared/constants/messages";
import { sendSuccess } from "../../shared/utils/response";
import { BadRequestError, ForbiddenError } from "../../shared/errors/domain.errors";

/**
 * Controller for the email audit log read API.
 *
 * GET /api/v1/email-audit-logs
 *   - super_admin: may pass any clubId filter
 *   - admin/coach: auto-scoped to their own clubId
 *
 * Supported query params:
 *   clubId, tryoutId, registrationId, action, status,
 *   recipientEmail, senderId, from, to, page, limit
 */
export class EmailAuditLogController {
  list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const role = req.user?.role;
      const userClubId = req.user?.clubId;

      // Scope: non-super_admin users are restricted to their own club.
      if (role !== USER_ROLES.SUPER_ADMIN) {
        if (!userClubId) {
          throw new ForbiddenError("No club associated with user");
        }
      }

      const filter: Record<string, unknown> = {};

      // clubId: super_admin may pass it; everyone else is forced to their own.
      const clubId = role === USER_ROLES.SUPER_ADMIN ? (req.query.clubId as string | undefined) : userClubId;
      if (clubId) {
        if (!mongoose.Types.ObjectId.isValid(String(clubId))) {
          throw new BadRequestError("clubId is not a valid ObjectId");
        }
        filter.clubId = new mongoose.Types.ObjectId(String(clubId));
      }

      if (req.query.tryoutId) {
        if (!mongoose.Types.ObjectId.isValid(String(req.query.tryoutId))) {
          throw new BadRequestError("tryoutId is not a valid ObjectId");
        }
        filter.tryoutId = new mongoose.Types.ObjectId(String(req.query.tryoutId));
      }

      if (req.query.registrationId) {
        if (!mongoose.Types.ObjectId.isValid(String(req.query.registrationId))) {
          throw new BadRequestError("registrationId is not a valid ObjectId");
        }
        filter.registrationId = new mongoose.Types.ObjectId(String(req.query.registrationId));
      }

      if (req.query.senderId) {
        if (!mongoose.Types.ObjectId.isValid(String(req.query.senderId))) {
          throw new BadRequestError("senderId is not a valid ObjectId");
        }
        filter.senderId = new mongoose.Types.ObjectId(String(req.query.senderId));
      }

      if (req.query.action) {
        const action = String(req.query.action);
        if (action !== "offered" && action !== "rejected") {
          throw new BadRequestError("action must be 'offered' or 'rejected'");
        }
        filter.action = action;
      }

      if (req.query.status) {
        const status = String(req.query.status);
        if (status !== "sent" && status !== "failed") {
          throw new BadRequestError("status must be 'sent' or 'failed'");
        }
        filter.status = status;
      }

      if (req.query.mode) {
        const mode = String(req.query.mode);
        if (mode !== "single" && mode !== "bulk") {
          throw new BadRequestError("mode must be 'single' or 'bulk'");
        }
        filter.mode = mode;
      }

      if (req.query.templateType) {
        const templateType = String(req.query.templateType);
        if (templateType !== "custom" && templateType !== "default") {
          throw new BadRequestError("templateType must be 'custom' or 'default'");
        }
        filter.templateType = templateType;
      }

      if (req.query.recipientEmail) {
        // Substring, case-insensitive match
        filter.recipientEmail = { $regex: String(req.query.recipientEmail), $options: "i" };
      }

      // Date range on sentAt
      const sentAtFilter: Record<string, Date> = {};
      if (req.query.from) {
        const from = new Date(String(req.query.from));
        if (isNaN(from.getTime())) {
          throw new BadRequestError("from must be a valid ISO date");
        }
        sentAtFilter.$gte = from;
      }
      if (req.query.to) {
        const to = new Date(String(req.query.to));
        if (isNaN(to.getTime())) {
          throw new BadRequestError("to must be a valid ISO date");
        }
        sentAtFilter.$lte = to;
      }
      if (Object.keys(sentAtFilter).length > 0) {
        filter.sentAt = sentAtFilter;
      }

      // Pagination
      let page = parseInt(String(req.query.page ?? "1"), 10);
      if (!Number.isFinite(page) || page < 1) page = 1;
      let limit = parseInt(String(req.query.limit ?? "50"), 10);
      if (!Number.isFinite(limit) || limit < 1) limit = 50;
      if (limit > 100) limit = 100;
      const skip = (page - 1) * limit;

      const [items, total] = await Promise.all([
        EmailAuditLogModel.find(filter).sort({ sentAt: -1 }).skip(skip).limit(limit).lean().exec(),
        EmailAuditLogModel.countDocuments(filter).exec(),
      ]);

      sendSuccess(res, { items, total, page, limit }, MESSAGES.RETRIEVED, HTTP_STATUS.OK);
    } catch (err) {
      next(err);
    }
  };
}
