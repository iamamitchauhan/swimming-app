import { Request, Response, NextFunction } from "express";
import { GroupService } from "./group.service";
import { HTTP_STATUS } from "../../shared/constants/httpStatus";
import { MESSAGES } from "../../shared/constants/messages";
import { sendSuccess } from "../../shared/utils/response";
import { BadRequestError } from "../../shared/errors/domain.errors";
import { EmailTemplateService } from "../email-template/email-template.service";

export class GroupController {
  constructor(
    private readonly service: GroupService,
    private readonly emailTemplateService: EmailTemplateService,
  ) {}

  listByClub = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const clubId = req.user?.clubId;
      if (!clubId) throw new BadRequestError("clubId is required");

      const data = await this.service.listByClub(clubId);
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
      const data = await this.service.getById(req.params["id"]!);
      sendSuccess(res, { group: data }, MESSAGES.SUCCESS, HTTP_STATUS.OK);
    } catch (err) {
      next(err);
    }
  };

  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { userId, clubId } = this.getUserIds(req);
      const { name, color, description } = req.body as { name?: string; color?: string; description?: string };
      if (!name?.trim()) throw new BadRequestError("name is required");

      const data = await this.service.create(clubId, userId, name, color ?? "", description ?? "");

      const subject = `Congratulations – Team Offer for {{swimmer_name}}`;
      const body = `
      Dear {{parent_name}},
      
I am pleased to officially offer {{swimmer_name}} a spot on the {{group_name}} following a great performance at the {{tryout_name}} tryout.
We are thrilled to have {{swimmer_name}} join {{club_name}}! I will be sending a separate email shortly with all the registration details, practice schedules, and next steps.
Congratulations again—we look forward to seeing {{swimmer_name}} on deck!

Best regards,
{{sender_name}}
{{club_name}}`;

      // save email template
      // TODO: save email template
      await this.emailTemplateService.create({
        clubId,
        userId,
        subject,
        body,
        groupId: data._id.toString(),
        type: "offer",
        createdBy: userId,
        updatedBy: userId,
      });
      sendSuccess(res, { group: data }, "Group created", HTTP_STATUS.CREATED);
    } catch (err) {
      next(err);
    }
  };

  update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { userId } = this.getUserIds(req);
      const { name, color, description } = req.body as { name?: string; color?: string; description?: string };
      if (!name?.trim()) throw new BadRequestError("name is required");

      const data = await this.service.update(req.params["id"]!, userId, name, color ?? "", description ?? "");
      sendSuccess(res, { group: data }, "Group updated", HTTP_STATUS.OK);
    } catch (err) {
      next(err);
    }
  };

  delete = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { userId } = this.getUserIds(req);
      await this.service.delete(req.params["id"]!, userId);
      sendSuccess(res, null, "Group deleted", HTTP_STATUS.OK);
    } catch (err) {
      next(err);
    }
  };
}
