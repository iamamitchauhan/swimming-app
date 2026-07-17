import { Request, Response, NextFunction } from "express";
import { TryoutRepository } from "../tryout/tryout.repository";
import { HTTP_STATUS } from "../../shared/constants/httpStatus";
import { MESSAGES } from "../../shared/constants/messages";
import { sendSuccess } from "../../shared/utils/response";
import { NotFoundError } from "../../shared/errors/domain.errors";
import { publicTryoutListParamsSchema, publicTryoutIdSchema } from "./public.validation";
import { isTestUser } from "../../shared/constants/testUsers";

export class PublicController {
  constructor(private readonly tryoutRepo: TryoutRepository) {}

  /**
   * GET /public/tryouts
   * Lists open tryouts available for public browsing
   */
  listTryouts = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const params = publicTryoutListParamsSchema.parse(req.query);

      // Only show open tryouts to the public
      const result = await this.tryoutRepo.findByStatus("open", { ...params, isTest: isTestUser(req.user?.id) ? undefined : false });

      sendSuccess(res, result, MESSAGES.RETRIEVED, HTTP_STATUS.OK);
    } catch (err) {
      next(err);
    }
  };

  /**
   * GET /public/tryouts/:id
   * Returns tryout details for public viewing
   */
  getTryoutById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = publicTryoutIdSchema.parse(req.params);

      const tryout = await this.tryoutRepo.findById(id, isTestUser(req.user?.id) ? undefined : false);
      if (!tryout) throw new NotFoundError("Tryout not found");

      // Only allow viewing of open tryouts
      if (tryout.status !== "open") {
        throw new NotFoundError("Tryout not available");
      }

      // Get registration stats for availability display
      const stats = await this.tryoutRepo.getRegistrationStats(id);

      const response = {
        tryout: {
          ...tryout,
          registrationStats: stats,
        },
      };

      sendSuccess(res, response, MESSAGES.RETRIEVED, HTTP_STATUS.OK);
    } catch (err) {
      next(err);
    }
  };

  /**
   * GET /public/clubs
   * Returns unique club names that have open tryouts
   */
  getClubs = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const clubs = await this.tryoutRepo.findDistinctClubs(isTestUser(req.user?.id) ? undefined : false);
      sendSuccess(res, { clubs }, MESSAGES.RETRIEVED, HTTP_STATUS.OK);
    } catch (err) {
      next(err);
    }
  };

  /**
   * GET /public/stats
   * Returns platform-wide stats for the public landing page
   */
  getStats = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const stats = await this.tryoutRepo.getPlatformStats(isTestUser(req.user?.id) ? undefined : false);
      sendSuccess(res, stats, MESSAGES.RETRIEVED, HTTP_STATUS.OK);
    } catch (err) {
      next(err);
    }
  };
}
