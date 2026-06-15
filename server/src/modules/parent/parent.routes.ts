import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { ParentController } from './parent.controller';
import { AuthRepository } from '../auth/auth.repository';
import { ParentService } from './parent.service';
import { HTTP_STATUS } from '../../shared/constants/httpStatus';
import { MESSAGES } from '../../shared/constants/messages';
import { sendError } from '../../shared/utils/response';

const router = Router();
const repository = new AuthRepository();
const service = new ParentService(repository);
const controller = new ParentController(service);

const otpRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  statusCode: HTTP_STATUS.TOO_MANY_REQUESTS,
  handler: (_req, res) =>
    sendError(res, MESSAGES.RATE_LIMIT_EXCEEDED, HTTP_STATUS.TOO_MANY_REQUESTS, 'RATE_LIMIT_EXCEEDED'),
});

/**
 * Parent authentication routes
 * POST /parent/auth/register — register parent (send verification email)
 * GET /parent/auth/verify-email — verify parent email with token
 */

router.post('/auth/register', otpRateLimiter, controller.register);
router.get('/auth/verify-email', controller.verifyEmail);
router.post('/auth/login', otpRateLimiter, controller.login);
router.post('/auth/verify-otp', otpRateLimiter, controller.verifyOtp);

export { router as parentRouter };
