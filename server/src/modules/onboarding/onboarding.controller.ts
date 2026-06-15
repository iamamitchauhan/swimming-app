import { Request, Response, NextFunction } from 'express';
import { OnboardingService } from './onboarding.service';
import { HTTP_STATUS } from '../../shared/constants/httpStatus';
import { MESSAGES } from '../../shared/constants/messages';
import { sendSuccess } from '../../shared/utils/response';
import { step1Schema, step2Schema } from './onboarding.validation';
import { UnauthorizedError } from '../../shared/errors/domain.errors';

export class OnboardingController {
  constructor(private readonly service: OnboardingService) {}

  /**
   * GET /onboarding/status
   * Returns the user's current onboarding step and saved club data.
   */
  getStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.id;
      if (!userId) return next(new UnauthorizedError());
      const status = await this.service.getStatus(userId);
      sendSuccess(res, status, MESSAGES.SUCCESS, HTTP_STATUS.OK);
    } catch (err) {
      next(err);
    }
  };

  /**
   * PUT /onboarding/step/1
   * Save club info: name, address, phone, optional logo URL.
   */
  saveStep1 = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.id;
      if (!userId) return next(new UnauthorizedError());
      const input = step1Schema.parse(req.body);
      const club = await this.service.saveStep1(userId, input);
      sendSuccess(res, { club }, MESSAGES.ONBOARDING_STEP_SAVED, HTTP_STATUS.OK);
    } catch (err) {
      next(err);
    }
  };

  /**
   * PUT /onboarding/step/2
   * Invite coaches (optional). Accepts { coachEmails: string[] }.
   */
  saveStep2 = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.id;
      if (!userId) return next(new UnauthorizedError());
      const { coachEmails } = step2Schema.parse(req.body);
      const result = await this.service.saveStep2(userId, coachEmails);
      sendSuccess(res, result, MESSAGES.ONBOARDING_STEP_SAVED, HTTP_STATUS.OK);
    } catch (err) {
      next(err);
    }
  };

  /**
   * PUT /onboarding/step/3
   * Submit the club application for review.
   */
  submitClub = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.id;
      if (!userId) return next(new UnauthorizedError());
      const club = await this.service.submitClub(userId);
      sendSuccess(res, { club }, MESSAGES.CLUB_SUBMITTED, HTTP_STATUS.OK);
    } catch (err) {
      next(err);
    }
  };
}
