import { Request, Response, NextFunction } from "express";
import { GroupService } from "./group.service";
import { HTTP_STATUS } from "../../shared/constants/httpStatus";
import { MESSAGES } from "../../shared/constants/messages";
import { sendSuccess } from "../../shared/utils/response";
import { BadRequestError } from "../../shared/errors/domain.errors";
import { EmailTemplateService } from "../email-template/email-template.service";
import { DEFAULT_EMAIL_TEMPLATES } from "../../shared/constants/email-templates";

export class GroupController {
  constructor(
    private readonly service: GroupService,
    private readonly emailTemplateService: EmailTemplateService,
  ) {}

  listByClub = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      req.step?.("received", { params: req.params, query: req.query, body: req.body });
      const clubId = req.user?.clubId;
      if (!clubId) throw new BadRequestError("clubId is required");
      req.step?.("validated");

      req.step?.("delegating to service");
      const data = await this.service.listByClub(clubId);
      req.step?.("responding", { status: HTTP_STATUS.OK });
      sendSuccess(res, { groups: data }, MESSAGES.SUCCESS, HTTP_STATUS.OK);
    } catch (err) {
      next(err);
    }
  };

  private getUserIds(req: Request): { userId: string; clubId: string } {
    const userId = req.user?.id;
    const clubId = req.user?.clubId;
    if (!userId) throw new BadRequestError("userId is required");
    if (!clubId) throw new BadRequestError("clubId is required");
    return { userId, clubId };
  }

  getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      req.step?.("received", { params: req.params, query: req.query, body: req.body });
      req.step?.("delegating to service");
      const data = await this.service.getById(req.params["id"]!);
      req.step?.("responding", { status: HTTP_STATUS.OK });
      sendSuccess(res, { group: data }, MESSAGES.SUCCESS, HTTP_STATUS.OK);
    } catch (err) {
      next(err);
    }
  };

  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      req.step?.("received", { params: req.params, query: req.query, body: req.body });
      const { userId, clubId } = this.getUserIds(req);
      const { name, color, description } = req.body as { name?: string; color?: string; description?: string };
      if (!name?.trim()) throw new BadRequestError("name is required");
      req.step?.("validated");

      req.step?.("delegating to service");
      const data = await this.service.create(clubId, userId, name, color ?? "", description ?? "");

      // save email template
      await this.emailTemplateService.create({
        clubId,
        userId,
        subject: DEFAULT_EMAIL_TEMPLATES.offered.subject,
        body: DEFAULT_EMAIL_TEMPLATES.offered.body,
        groupId: data._id.toString(),
        type: "offered",
        createdBy: userId,
        updatedBy: userId,
      });
      req.step?.("responding", { status: HTTP_STATUS.CREATED });
      sendSuccess(res, { group: data }, "Group created", HTTP_STATUS.CREATED);
    } catch (err) {
      next(err);
    }
  };

  update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      req.step?.("received", { params: req.params, query: req.query, body: req.body });
      const { userId, clubId } = this.getUserIds(req);
      const { name, color, description } = req.body as { name?: string; color?: string; description?: string };
      if (!name?.trim()) throw new BadRequestError("name is required");
      req.step?.("validated");

      req.step?.("delegating to service");
      const data = await this.service.update(req.params["id"]!, userId, name, color ?? "", description ?? "");

      const groupId = data._id.toString();
      const existingTemplate = await this.emailTemplateService.findByGroupAndType(groupId, "offered");
      if (!existingTemplate) {
        await this.emailTemplateService.create({
          clubId,
          userId,
          subject: DEFAULT_EMAIL_TEMPLATES.offered.subject,
          body: DEFAULT_EMAIL_TEMPLATES.offered.body,
          groupId,
          type: "offered",
          createdBy: userId,
          updatedBy: userId,
        });
      }

      req.step?.("responding", { status: HTTP_STATUS.OK });
      sendSuccess(res, { group: data }, "Group updated", HTTP_STATUS.OK);
    } catch (err) {
      next(err);
    }
  };

  delete = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      req.step?.("received", { params: req.params, query: req.query, body: req.body });
      const { userId } = this.getUserIds(req);
      req.step?.("validated");

      req.step?.("delegating to service");
      await this.service.delete(req.params["id"]!, userId);
      req.step?.("responding", { status: HTTP_STATUS.OK });
      sendSuccess(res, null, "Group deleted", HTTP_STATUS.OK);
    } catch (err) {
      next(err);
    }
  };
}
