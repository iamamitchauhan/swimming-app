import { config } from "../../config/env";
import { AuthRepository, PlainUser } from "../auth/auth.repository";
import { ConflictError, NotFoundError } from "../../shared/errors/domain.errors";
import { generateSecureToken, hashToken } from "../../shared/utils/token";
import { USER_ROLES } from "../../shared/constants/roles";
import { sendEmailVerification, sendOtp } from "../../shared/utils/mailer";
import { ParentRegisterInput } from "./parent.validation";
import crypto from "crypto";
import logger from "../../shared/utils/logger";
import jwt from "jsonwebtoken";

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

function signToken(payload: { id: string; email: string; role: string; clubId: string | null }): string {
  return jwt.sign(payload, config.JWT_SECRET, {
    expiresIn: config.JWT_EXPIRES_IN as jwt.SignOptions["expiresIn"],
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
    const existing = await this.repository.findUserByEmailAndRole(email, USER_ROLES.PARENT);

    if (existing?.emailVerified) {
      throw new ConflictError("An account with this email already exists.");
    }

    if (!existing) {
      // Parent registrations get parent role
      await this.repository.createUser({
        email,
        firstName,
        lastName,
        role: USER_ROLES.PARENT,
      });
    } else {
      // Update existing user with firstName and lastName if they weren't set
      await this.repository.updateUser(existing._id.toString(), { firstName, lastName });
    }

    const plainToken = generateSecureToken();
    const tokenHash = hashToken(plainToken);
    const expiresAt = new Date(Date.now() + config.EMAIL_VERIFY_EXPIRES_HOURS * 60 * 60 * 1000);

    await this.repository.createEmailVerification({ email, role: USER_ROLES.PARENT, tokenHash, expiresAt });

    // Parent registrations redirect to landing app (port 8000)
    const verifyUrl = `${config.LANDING_BASE_URL}/auth/verify-email?token=${plainToken}`;
    await sendEmailVerification({ to: email, verifyUrl });

    logger.info({ email, verifyUrl: verifyUrl.substring(0, 50) + "..." }, "parent.register.verification_sent");
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
      throw new ConflictError("Invalid or expired verification link.");
    }

    const role = (record.role as (typeof USER_ROLES)[keyof typeof USER_ROLES]) || USER_ROLES.PARENT;

    await this.repository.markEmailVerificationUsed(record._id.toString());
    await this.repository.markEmailVerifiedByRole(record.email, role);

    const user = await this.repository.findUserByEmailAndRole(record.email, role);
    if (!user) throw new NotFoundError("User not found");

    const publicUser = toPublicUser(user);
    const authToken = signToken({
      id: publicUser.id,
      email: publicUser.email,
      role: publicUser.role,
      clubId: publicUser.clubId,
    });

    logger.info({ email: record.email }, "parent.email.verified");

    return { token: authToken, user: publicUser };
  }

  /**
   * Sends a 6-digit OTP to the parent's email for login.
   * Throws NotFoundError if the email is not registered and verified.
   */
  async requestLoginOtp(email: string): Promise<void> {
    const user = await this.repository.findUserByEmailAndRole(email, USER_ROLES.PARENT);

    if (!user || !user.emailVerified) {
      throw new NotFoundError("No verified account found with this email address.");
    }

    const otp = crypto.randomInt(100000, 999999).toString();
    const codeHash = hashToken(otp);
    const expiresAt = new Date(Date.now() + config.OTP_EXPIRES_MINUTES * 60 * 1000);
    // render email and otp for dev server
    console.log("Email:", email);
    console.log("OTP:", otp);

    await this.repository.createOtp({ email, codeHash, purpose: "login", expiresAt });
    await sendOtp({ to: email, otp });

    logger.info({ email }, "parent.login.otp_sent");
  }

  /**
   * Verifies the OTP and returns a JWT + public user profile on success.
   * Tracks attempts and rejects after too many failures.
   */
  async verifyLoginOtp(email: string, otp: string): Promise<{ token: string; user: PublicUser }> {
    const record = await this.repository.findValidOtp(email, "login");

    if (!record) {
      throw new ConflictError("OTP is invalid or has expired. Please request a new one.");
    }

    const attempts = await this.repository.incrementOtpAttempts(record._id.toString());
    if (attempts > 5) {
      throw new ConflictError("Too many failed attempts. Please request a new OTP.");
    }

    const isValid = config.NODE_ENV === "development" ? true : hashToken(otp) === record.codeHash;
    if (!isValid) {
      throw new ConflictError("Incorrect OTP. Please try again.");
    }

    await this.repository.markOtpUsed(record._id.toString());

    const user = await this.repository.findUserByEmailAndRole(email, USER_ROLES.PARENT);
    if (!user) throw new NotFoundError("User not found.");

    const publicUser = toPublicUser(user);
    const authToken = signToken({
      id: publicUser.id,
      email: publicUser.email,
      role: publicUser.role,
      clubId: publicUser.clubId,
    });

    logger.info({ email }, "parent.login.otp_verified");

    return { token: authToken, user: publicUser };
  }
}
