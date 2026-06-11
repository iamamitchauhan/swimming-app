import { Request, Response, NextFunction } from 'express';
import { AuthService } from './auth.service';
import { HTTP_STATUS } from '../../shared/constants/httpStatus';
import { MESSAGES } from '../../shared/constants/messages';
import { sendSuccess } from '../../shared/utils/response';
import {
  registerSchema,
  verifyEmailSchema,
  loginSchema,
  verifyOtpSchema,
} from './auth.validation';
import { UnauthorizedError } from '../../shared/errors/domain.errors';

// ─── Controller ───────────────────────────────────────────────────────────────

/**
 * Handles HTTP layer for auth endpoints.
 * Validates input, delegates to AuthService, shapes responses.
 * Contains no business logic.
 */
export class AuthController {
  constructor(private readonly service: AuthService) {}

  /**
   * POST /auth/register
   * Accepts email, firstName, lastName, creates a pending user, sends a verification email.
   */
  register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { email, firstName, lastName } = registerSchema.parse(req.body);
      await this.service.register(email, firstName, lastName);
      sendSuccess(res, null, MESSAGES.EMAIL_SENT, HTTP_STATUS.OK);
    } catch (err) {
      next(err);
    }
  };

  /**
   * GET /auth/verify-email?token=<token>
   * Validates the email verification token, activates the account, and returns a JWT for auto-login.
   */
  verifyEmail = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { token } = verifyEmailSchema.parse(req.query);
      const result = await this.service.verifyEmail(token);
      sendSuccess(res, result, MESSAGES.OTP_VERIFIED, HTTP_STATUS.OK);
    } catch (err) {
      next(err);
    }
  };

  /**
   * POST /auth/login
   * Accepts email, sends a 6-digit OTP.
   */
  login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { email } = loginSchema.parse(req.body);
      await this.service.login(email);
      sendSuccess(res, null, MESSAGES.OTP_SENT, HTTP_STATUS.OK);
    } catch (err) {
      next(err);
    }
  };

  /**
   * POST /auth/verify-otp
   * Validates the OTP and returns a signed JWT + public user.
   */
  verifyOtp = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { email, otp } = verifyOtpSchema.parse(req.body);
      const result = await this.service.verifyOtp(email, otp);
      sendSuccess(res, result, MESSAGES.OTP_VERIFIED, HTTP_STATUS.OK);
    } catch (err) {
      next(err);
    }
  };

  /**
   * POST /auth/logout
   * Stateless JWT logout — client is responsible for discarding the token.
   */
  logout = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      sendSuccess(res, null, MESSAGES.SUCCESS, HTTP_STATUS.OK);
    } catch (err) {
      next(err);
    }
  };

  /**
   * GET /auth/me
   * Returns the authenticated user's public profile.
   */
  getMe = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.id;
      if (!userId) return next(new UnauthorizedError());
      const user = await this.service.getMe(userId);
      sendSuccess(res, { user }, MESSAGES.SUCCESS, HTTP_STATUS.OK);
    } catch (err) {
      next(err);
    }
  };
}
