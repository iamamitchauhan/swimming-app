import { Request, Response, NextFunction } from "express";
import { WaitlistService } from "./waitlist.service";
import { HTTP_STATUS } from "../../shared/constants/httpStatus";
import { MESSAGES } from "../../shared/constants/messages";
import { sendSuccess } from "../../shared/utils/response";
import { joinWaitlistSchema } from "./waitlist.validation";

export class WaitlistController {
  constructor(private readonly service: WaitlistService) {}

  /**
   * POST /waitlist/:tryoutId
   * Adds a parent/swimmer to the waitlist for a tryout. Public — no auth required.
   */
  join = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { tryoutId } = req.params;
      const parentId = req.user?.id;
      const input = joinWaitlistSchema.parse(req.body);

      const entry = await this.service.join(tryoutId, input, parentId);

      sendSuccess(
        res,
        { waitlist: { position: entry.waitlistPosition, joinedAt: entry.joinedAt } },
        "Added to waitlist successfully",
        HTTP_STATUS.CREATED,
      );
    } catch (err) {
      next(err);
    }
  };

  /**
   * GET /waitlist/tryout/:tryoutId
   * Returns a paginated, searchable, sortable waitlist for a tryout. Auth required.
   */
  listByTryout = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { tryoutId } = req.params;
      const page = parseInt(req.query["page"] as string) || 1;
      const limit = parseInt(req.query["limit"] as string) || 10;
      const search = (req.query["search"] as string) || undefined;
      const sortBy = req.query["sortBy"] as string as "waitlistPosition" | "swimmerFirstName" | "guardianEmail" | "joinedAt" | undefined;
      const sortOrder = req.query["sortOrder"] as string as "asc" | "desc" | undefined;

      const result = await this.service.listByTryout(tryoutId, { page, limit, search, sortBy, sortOrder });
      sendSuccess(res, result, "Waitlist fetched");
    } catch (err) {
      next(err);
    }
  };

  /**
   * GET /waitlist/entry/:id
   * Returns a single waitlist entry by ID. Public — used to pre-fill registration form.
   */
  getEntry = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const entry = await this.service.getEntry(id);
      sendSuccess(res, { entry }, "Waitlist entry fetched");
    } catch (err) {
      next(err);
    }
  };

  /**
   * DELETE /waitlist/entry/:id
   * Removes a waitlist entry after successful registration.
   */
  removeEntry = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      await this.service.removeEntry(id);
      sendSuccess(res, {}, "Waitlist entry removed");
    } catch (err) {
      next(err);
    }
  };
}
