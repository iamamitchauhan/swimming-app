import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { authenticate } from '../../middleware/auth.middleware';
import { HTTP_STATUS } from '../../shared/constants/httpStatus';
import { MESSAGES } from '../../shared/constants/messages';
import { sendError } from '../../shared/utils/response';
import { AuthRepository } from './auth.repository';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';

const repository = new AuthRepository();
const service = new AuthService(repository);
const controller = new AuthController(service);

const otpRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  statusCode: HTTP_STATUS.TOO_MANY_REQUESTS,
  handler: (_req, res) =>
    sendError(res, MESSAGES.RATE_LIMIT_EXCEEDED, HTTP_STATUS.TOO_MANY_REQUESTS, 'RATE_LIMIT_EXCEEDED'),
});

/**
 * Auth router — mounted at /api/v1/auth by app.ts.
 *
 * POST /register          — submit email, receive verification email
 * GET  /verify-email      — verify email token from query string
 * POST /login             — submit email, receive OTP via email
 * POST /verify-otp        — submit email + OTP, receive JWT
 * POST /logout            — stateless logout (client discards token)
 * GET  /me                — return authenticated user's profile (requires JWT)
 */
const authRouter = Router();

authRouter.post('/register', otpRateLimiter, controller.register);
authRouter.get('/verify-email', controller.verifyEmail);
authRouter.post('/login', otpRateLimiter, controller.login);
authRouter.post('/verify-otp', otpRateLimiter, controller.verifyOtp);
authRouter.post('/logout', authenticate, controller.logout);
authRouter.get('/me', authenticate, controller.getMe);

export { authRouter };
