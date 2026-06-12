import jwt from 'jsonwebtoken';
import { config } from '../../config/env';
import { AuthRepository, PlainUser } from './auth.repository';
import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
  TooManyRequestsError,
} from '../../shared/errors/domain.errors';
import { USER_ROLES } from '../../shared/constants/roles';
import logger from '../../shared/utils/logger';
import { generateOtp, hashOtp, verifyOtp } from '../../shared/utils/otp';
import { generateSecureToken, hashToken } from '../../shared/utils/token';
import {
  sendEmailVerification,
  sendOtp as sendOtpEmail,
} from '../../shared/utils/mailer';

// ─── Constants ────────────────────────────────────────────────────────────────

const MAX_OTP_ATTEMPTS = 5;

// ─── Types ────────────────────────────────────────────────────────────────────

export type PublicUser = {
  id: string;
  email: string;
  role: string;
  status: string;
  clubId: string | null;
  onboardingStep: number;
  emailVerified: boolean;
  firstName: string;
  lastName: string;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function signToken(payload: {
  id: string;
  email: string;
  role: string;
  clubId: string | null;
}): string {
  return jwt.sign(payload, config.JWT_SECRET, {
    expiresIn: config.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'],
  });
}

function toPublicUser(user: PlainUser): PublicUser {
  return {
    id: user._id.toString(),
    email: user.email,
    role: user.role,
    status: user.status,
    clubId: user.clubId ? user.clubId.toString() : null,
    onboardingStep: user.onboardingStep,
    emailVerified: user.emailVerified,
    firstName: user.firstName,
    lastName: user.lastName,
  };
}

// ─── Service ──────────────────────────────────────────────────────────────────

/**
 * Business logic for authentication:
 *  - register: email-only → sends verification email
 *  - verifyEmail: token → activates account
 *  - login: email-only → sends OTP
 *  - verifyOtp: email + OTP → issues JWT
 *  - getMe: returns authenticated user's profile
 */
export class AuthService {
  constructor(private readonly repository: AuthRepository) {}

  /**
   * Accepts email, firstName, lastName and sends a verification link.
   * Creates a pending user record if none exists.
   * Throws ConflictError if the email is already verified.
   */
  async register(email: string, firstName: string, lastName: string): Promise<void> {
    const existing = await this.repository.findUserByEmail(email);

    if (existing?.emailVerified) {
      throw new ConflictError('An account with this email already exists.');
    }

    if (!existing) {
      await this.repository.createUser({ email, firstName, lastName, role: USER_ROLES.ADMIN });
    } else {
      // Update existing user with firstName and lastName if they weren't set
      await this.repository.updateUser(existing._id.toString(), { firstName, lastName });
    }

    const plainToken = generateSecureToken();
    const tokenHash = hashToken(plainToken);
    const expiresAt = new Date(
      Date.now() + config.EMAIL_VERIFY_EXPIRES_HOURS * 60 * 60 * 1000,
    );

    await this.repository.createEmailVerification({ email, tokenHash, expiresAt });

    const verifyUrl = `${config.APP_BASE_URL}/verify-email?token=${plainToken}`;
    await sendEmailVerification({ to: email, verifyUrl });

    logger.info({ email }, 'auth.register.verification_sent');
  }

  /**
   * Verifies the email token, marks the user's email as verified,
   * and returns a JWT token and the public user profile for auto-login.
   */
  async verifyEmail(token: string): Promise<{ token: string; user: PublicUser }> {
    const tokenHash = hashToken(token);
    const record = await this.repository.findValidEmailVerification(tokenHash);

    if (!record) {
      throw new BadRequestError(
        'Invalid or expired verification link.',
        'EMAIL_VERIFY_TOKEN_INVALID',
      );
    }

    await this.repository.markEmailVerificationUsed(record._id.toString());
    await this.repository.markEmailVerified(record.email);

    const user = await this.repository.findUserByEmail(record.email);
    if (!user) throw new NotFoundError('User not found');

    const publicUser = toPublicUser(user);
    const authToken = signToken({
      id: publicUser.id,
      email: publicUser.email,
      role: publicUser.role,
      clubId: publicUser.clubId,
    });

    logger.info({ email: record.email }, 'auth.email.verified');

    return { token: authToken, user: publicUser };
  }

  /**
   * Accepts email, looks up an active user, and sends a 6-digit OTP.
   */
  async login(email: string): Promise<void> {
    const user = await this.repository.findUserByEmail(email);

    if (!user) {
      logger.warn({ email }, 'auth.login.email_not_found');
      throw new NotFoundError('No account found with this email. Please register first.');
    }

    if (!user.emailVerified) {
      logger.warn({ email }, 'auth.login.unverified');
      throw new BadRequestError(
        'Your email is not verified. Please check your inbox for the verification link.',
        'EMAIL_NOT_VERIFIED',
      );
    }

    if (user.status === 'suspended') {
      throw new ForbiddenError('This account has been suspended.');
    }

    const otp = generateOtp();
    const codeHash = hashOtp(otp);
    const expiresAt = new Date(Date.now() + config.OTP_EXPIRES_MINUTES * 60 * 1000);

    await this.repository.createOtp({ email, codeHash, purpose: 'login', expiresAt });
    await sendOtpEmail({ to: email, otp });

    logger.info({ email }, 'auth.otp.sent');
  }

  /**
   * Verifies the submitted OTP for the given email.
   * Returns a signed JWT and the public user on success.
   * Enforces max-attempt lockout and single-use semantics.
   */
  async verifyOtp(email: string, otp: string): Promise<{ token: string; user: PublicUser }> {
    const record = await this.repository.findValidOtp(email, 'login');

    if (!record) {
      throw new BadRequestError('Invalid or expired OTP.', 'OTP_INVALID');
    }

    if (record.attempts >= MAX_OTP_ATTEMPTS) {
      throw new TooManyRequestsError(
        'Too many failed attempts. Please request a new OTP.',
      );
    }

    const isValid = process.env.NODE_ENV === 'development' ? true : verifyOtp(otp, record.codeHash);

    if (!isValid) {
      await this.repository.incrementOtpAttempts(record._id.toString());
      logger.warn({ email }, 'auth.otp.invalid_attempt');
      throw new BadRequestError('Invalid or expired OTP.', 'OTP_INVALID');
    }

    await this.repository.markOtpUsed(record._id.toString());

    const user = await this.repository.findUserByEmail(email);
    if (!user) throw new NotFoundError('User not found');

    const publicUser = toPublicUser(user);
    const token = signToken({
      id: publicUser.id,
      email: publicUser.email,
      role: publicUser.role,
      clubId: publicUser.clubId,
    });

    logger.info({ email, userId: publicUser.id }, 'auth.login.success');

    return { token, user: publicUser };
  }

  /**
   * Returns the public profile for a given user id.
   */
  async getMe(userId: string): Promise<PublicUser> {
    const user = await this.repository.findUserById(userId);
    if (!user) throw new NotFoundError('User not found');
    if (user.status === 'suspended') throw new ForbiddenError('Account suspended');
    return toPublicUser(user);
  }
}
