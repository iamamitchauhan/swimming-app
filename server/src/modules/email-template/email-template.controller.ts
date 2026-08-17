import { Request, Response, NextFunction } from "express";
import { EmailTemplateService } from "./email-template.service";
import { HTTP_STATUS } from "../../shared/constants/httpStatus";
import { MESSAGES } from "../../shared/constants/messages";
import { sendSuccess } from "../../shared/utils/response";
import { BadRequestError } from "../../shared/errors/domain.errors";

export class EmailTemplateController {
  constructor(private readonly service: EmailTemplateService) {}

  listByClub = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      req.step?.("received", { params: req.params, query: req.query, body: req.body });
      const clubId = req.user?.clubId;
      if (!clubId) throw new BadRequestError("clubId is required");
      req.step?.("validated");

      req.step?.("delegating to service");
      const data = await this.service.listByClub(clubId);
      req.step?.("responding", { status: HTTP_STATUS.OK });
      sendSuccess(res, { templates: data }, MESSAGES.SUCCESS, HTTP_STATUS.OK);
    } catch (err) {
      next(err);
    }
  };

  bulkUpsert = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      req.step?.("received", { params: req.params, query: req.query, body: req.body });
      const clubId = req.user?.clubId;
      const userId = req.user?.id;
      if (!clubId) throw new BadRequestError("clubId is required");
      if (!userId) throw new BadRequestError("userId is required");

      const { templates } = req.body as { templates?: unknown[] };
      if (!Array.isArray(templates) || templates.length === 0) {
        throw new BadRequestError("templates must be a non-empty array");
      }
      req.step?.("validated");

      req.step?.("delegating to service");
      const data = await this.service.bulkUpsert(clubId, userId, templates as any);
      req.step?.("responding", { status: HTTP_STATUS.OK });
      sendSuccess(res, { templates: data }, "Email templates saved", HTTP_STATUS.OK);
    } catch (err) {
      next(err);
    }
  };
}
