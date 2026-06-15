import { config } from '../../config/env';
import { AuthRepository, PlainUser } from '../auth/auth.repository';
import { ConflictError, NotFoundError } from '../../shared/errors/domain.errors';
import { generateSecureToken, hashToken } from '../../shared/utils/token';
import { USER_ROLES } from '../../shared/constants/roles';
import { sendEmailVerification } from '../../shared/utils/mailer';
import { ParentRegisterInput } from './parent.validation';
import logger from '../../shared/utils/logger';
import jwt from 'jsonwebtoken';

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
    clubId: user.clubId,
    onboardingStep: user.onboardingStep,
    emailVerified: user.emailVerified,
    firstName: user.firstName,
    lastName: user.lastName,
  };
}

/**
 * Parent-specific authentication service.
 * Handles parent registration with dedicated email verification flow.
 */
export class ParentService {
  constructor(private repository: AuthRepository) {}

  /**
   * Accepts email, firstName, lastName and sends a verification link for parent registration.
   * Creates a pending user record with PARENT role if none exists.
   * Throws ConflictError if the email is already verified.
   */
  async register(email: string, firstName: string, lastName: string): Promise<void> {
    const existing = await this.repository.findUserByEmail(email);

    if (existing?.emailVerified) {
      throw new ConflictError('An account with this email already exists.');
    }

    if (!existing) {
      // Parent registrations get parent role
      await this.repository.createUser({ 
        email, 
        firstName, 
        lastName, 
        role: USER_ROLES.PARENT 
      });
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

    // Parent registrations redirect to landing app (port 3000)
    const verifyUrl = `${config.LANDING_BASE_URL}/auth/verify-email?token=${plainToken}`;
    await sendEmailVerification({ to: email, verifyUrl });

    logger.info({ email }, 'parent.register.verification_sent');
  }

  /**
   * Verifies the email token for parent registration, marks the user's email as verified,
   * and returns a JWT token and the public user profile for auto-login.
   * Reuses the same verification logic as auth service but ensures parent context.
   */
  async verifyEmail(token: string): Promise<{ token: string; user: PublicUser }> {
    const tokenHash = hashToken(token);
    const record = await this.repository.findValidEmailVerification(tokenHash);

    if (!record) {
      throw new ConflictError('Invalid or expired verification link.');
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

    logger.info({ email: record.email }, 'parent.email.verified');

    return { token: authToken, user: publicUser };
  }
}
