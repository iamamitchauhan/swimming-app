import { Request, Response, NextFunction } from "express";
import { ParentService } from "./parent.service";
import { ParentRegisterInput, ParentLoginInput, ParentVerifyOtpInput } from "./parent.validation";
import { sendSuccess } from "../../shared/utils/response";
import { HTTP_STATUS } from "../../shared/constants/httpStatus";
import { MESSAGES } from "../../shared/constants/messages";
import logger from "../../shared/utils/logger";

/**
 * Parent authentication controller.
 * Handles parent registration and email verification.
 */
export class ParentController {
  constructor(private service: ParentService) {}

  /**
   * POST /parent/auth/register — send verification email for parent registration
   */
  register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { email, firstName, lastName, redirectUrl } = req.body as ParentRegisterInput;

      await this.service.register(email, firstName, lastName, redirectUrl);

      sendSuccess(res, null, MESSAGES.EMAIL_SENT, HTTP_STATUS.CREATED);
    } catch (err) {
      next(err);
    }
  };

  /**
   * GET /parent/auth/verify-email?token= — verify email token and auto-login parent
   */
  verifyEmail = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { token } = req.query;

      if (!token || typeof token !== "string") {
        res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: "Verification token is required",
          error: "MISSING_TOKEN",
          data: null,
        });
        return;
      }

      const result = await this.service.verifyEmail(token);

      sendSuccess(res, result, MESSAGES.INVITATION_ACCEPTED, HTTP_STATUS.OK);
    } catch (err) {
      next(err);
    }
  };

  /**
   * POST /parent/auth/login — send OTP to parent email
   */
  login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { email } = req.body as ParentLoginInput;
      await this.service.requestLoginOtp(email);
      sendSuccess(res, null, MESSAGES.EMAIL_SENT, HTTP_STATUS.OK);
    } catch (err) {
      next(err);
    }
  };

  /**
   * POST /parent/auth/verify-otp — verify OTP and return JWT
   */
  verifyOtp = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { email, otp } = req.body as ParentVerifyOtpInput;
      const result = await this.service.verifyLoginOtp(email, otp);
      sendSuccess(res, result, "Login successful.", HTTP_STATUS.OK);
    } catch (err) {
      next(err);
    }
  };
}
