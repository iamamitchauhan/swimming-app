import { Request, Response, NextFunction } from 'express';
import { TryoutRepository } from '../tryout/tryout.repository';
import { HTTP_STATUS } from '../../shared/constants/httpStatus';
import { MESSAGES } from '../../shared/constants/messages';
import { sendSuccess } from '../../shared/utils/response';
import { NotFoundError } from '../../shared/errors/domain.errors';
import {
  publicTryoutListParamsSchema,
  publicTryoutIdSchema,
} from './public.validation';

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
      const result = await this.tryoutRepo.findByStatus('open', params);
      
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
      
      const tryout = await this.tryoutRepo.findById(id);
      if (!tryout) throw new NotFoundError('Tryout not found');
      
      // Only allow viewing of open tryouts
      if (tryout.status !== 'open') {
        throw new NotFoundError('Tryout not available');
      }

      // Get registration stats for availability display
      const stats = await this.tryoutRepo.getRegistrationStats(id);
      
      const response = {
        tryout: {
          ...tryout,
          registrationStats: stats
        }
      };
      
      sendSuccess(res, response, MESSAGES.RETRIEVED, HTTP_STATUS.OK);
    } catch (err) {
      next(err);
    }
  };
}
