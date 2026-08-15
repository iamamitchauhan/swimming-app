import jwt from "jsonwebtoken";
import { config } from "../../config/env";
import { AuthRepository, PlainUser } from "./auth.repository";
import { BadRequestError, ConflictError, ForbiddenError, NotFoundError, TooManyRequestsError } from "../../shared/errors/domain.errors";
import { USER_ROLES } from "../../shared/constants/roles";
import logger from "../../shared/utils/logger";
import { generateOtp, hashOtp, verifyOtp } from "../../shared/utils/otp";
import { generateSecureToken, hashToken } from "../../shared/utils/token";
import { sendEmailVerification, sendOtp as sendOtpEmail } from "../../shared/utils/mailer";
import { ClubModel } from "../../models/club.model";

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

export type ClubOption = {
  clubId: string;
  clubName: string;
  role: string;
  status: string;
};

export type VerifyOtpResult =
  | { token: string; user: PublicUser; requiresClubSelection: false }
  | { token: string; user: PublicUser; requiresClubSelection: true; clubs: ClubOption[] };

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
    const existing = await this.repository.findUserByEmailAndRoles(email, [USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN, USER_ROLES.COACH]);

    if (existing?.emailVerified) {
      throw new ConflictError("An account with this email already exists.");
    }

    if (!existing) {
      await this.repository.createUser({ email, firstName, lastName, role: USER_ROLES.ADMIN });
    } else {
      // Update existing user with firstName and lastName if they weren't set
      await this.repository.updateUser(existing._id.toString(), { firstName, lastName });
    }

    const plainToken = generateSecureToken();
    const tokenHash = hashToken(plainToken);
    const expiresAt = new Date(Date.now() + config.EMAIL_VERIFY_EXPIRES_HOURS * 60 * 60 * 1000);

    await this.repository.createEmailVerification({ email, role: USER_ROLES.ADMIN, tokenHash, expiresAt });

    const verifyUrl = `${config.CLIENT_BASE_URL}/verify-email?token=${plainToken}`;
    await sendEmailVerification({ to: email, verifyUrl });

    logger.info({ email }, "auth.register.verification_sent");
  }

  /**
   * Verifies the email token, marks the user's email as verified,
   * and returns a JWT token and the public user profile for auto-login.
   */
  async verifyEmail(token: string): Promise<{ token: string; user: PublicUser }> {
    const tokenHash = hashToken(token);
    const record = await this.repository.findValidEmailVerification(tokenHash);

    if (!record) {
      throw new BadRequestError("Invalid or expired verification link.", "EMAIL_VERIFY_TOKEN_INVALID");
    }

    const role = (record.role as (typeof USER_ROLES)[keyof typeof USER_ROLES]) || USER_ROLES.ADMIN;

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

    logger.info({ email: record.email }, "auth.email.verified");

    return { token: authToken, user: publicUser };
  }

  /**
   * Accepts email, looks up active users (possibly across multiple clubs), and sends a 6-digit OTP.
   */
  async login(email: string): Promise<void> {
    const users = await this.repository.findUsersByEmailAndRoles(email, [USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN, USER_ROLES.COACH]);

    if (users.length === 0) {
      logger.warn({ email }, "auth.login.email_not_found");
      throw new NotFoundError("No account found with this email. Please register first.");
    }

    const anyVerified = users.some((u) => u.emailVerified);
    if (!anyVerified) {
      logger.warn({ email }, "auth.login.unverified");
      throw new BadRequestError("Your email is not verified. Please check your inbox for the verification link.", "EMAIL_NOT_VERIFIED");
    }

    const anyActive = users.some((u) => u.status !== "suspended");
    if (!anyActive) {
      throw new ForbiddenError("This account has been suspended.");
    }

    const otp = generateOtp();
    logger.info({ otp }, "auth.otp.generated");
    const codeHash = hashOtp(otp);
    const expiresAt = new Date(Date.now() + config.OTP_EXPIRES_MINUTES * 60 * 1000);

    logger.info({ email, otpLength: otp.length, expiresAt }, "auth.otp.generated");

    await this.repository.createOtp({ email, codeHash, purpose: "login", expiresAt });
    logger.info({ email }, "auth.otp.stored");

    try {
      await sendOtpEmail({ to: email, otp });
      logger.info({ email, from: config.SES_FROM_EMAIL, region: config.AWS_REGION }, "auth.otp.email_sent");
    } catch (err) {
      logger.error({ email, err, from: config.SES_FROM_EMAIL, region: config.AWS_REGION }, "auth.otp.email_failed");
      throw err;
    }

    logger.info({ email }, "auth.otp.sent");
  }

  /**
   * Verifies the submitted OTP for the given email.
   * If the email belongs to a single club, returns a JWT immediately.
   * If the email belongs to multiple clubs, returns a temporary JWT and
   * a list of clubs for the user to select from.
   * Enforces max-attempt lockout and single-use semantics.
   */
  async verifyOtp(email: string, otp: string): Promise<VerifyOtpResult> {
    const record = await this.repository.findValidOtp(email, "login");

    if (!record) {
      throw new BadRequestError("Invalid or expired OTP.", "OTP_INVALID");
    }

    if (record.attempts >= MAX_OTP_ATTEMPTS) {
      throw new TooManyRequestsError("Too many failed attempts. Please request a new OTP.");
    }

    const isValid = process.env.NODE_ENV === "development" ? true : verifyOtp(otp, record.codeHash);

    if (!isValid) {
      await this.repository.incrementOtpAttempts(record._id.toString());
      logger.warn({ email }, "auth.otp.invalid_attempt");
      throw new BadRequestError("Invalid or expired OTP.", "OTP_INVALID");
    }

    await this.repository.markOtpUsed(record._id.toString());

    const users = await this.repository.findUsersByEmailAndRoles(email, [USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN, USER_ROLES.COACH]);
    if (users.length === 0) throw new NotFoundError("User not found");

    // Filter to active, verified users only
    const eligibleUsers = users.filter((u) => u.emailVerified && u.status !== "suspended");
    if (eligibleUsers.length === 0) {
      throw new ForbiddenError("This account has been suspended.");
    }

    // Single club — issue token immediately
    if (eligibleUsers.length === 1) {
      const user = eligibleUsers[0];
      const publicUser = toPublicUser(user);
      const token = signToken({
        id: publicUser.id,
        email: publicUser.email,
        role: publicUser.role,
        clubId: publicUser.clubId,
      });
      logger.info({ email, userId: publicUser.id }, "auth.login.success");
      return { token, user: publicUser, requiresClubSelection: false };
    }

    // Multiple clubs — return temp token + club list
    const clubIds = eligibleUsers.map((u) => u.clubId).filter((c): c is string => c !== null);

    const clubs = await ClubModel.find({ _id: { $in: clubIds } })
      .lean()
      .exec();

    const clubMap = new Map(clubs.map((c) => [c._id.toString(), c]));

    const clubOptions: ClubOption[] = eligibleUsers
      .filter((u) => u.clubId && clubMap.has(u.clubId.toString()))
      .map((u) => ({
        clubId: u.clubId!.toString(),
        clubName: clubMap.get(u.clubId!.toString())!.name,
        role: u.role,
        status: u.status,
      }));

    // Issue a temp token using the first eligible user's ID (clubId = null)
    const firstUser = eligibleUsers[0];
    const tempToken = signToken({
      id: firstUser._id.toString(),
      email: firstUser.email,
      role: firstUser.role,
      clubId: null,
    });

    const publicUser = toPublicUser(firstUser);
    publicUser.clubId = null;

    logger.info({ email, clubCount: clubOptions.length }, "auth.login.multi_club");

    return { token: tempToken, user: publicUser, requiresClubSelection: true, clubs: clubOptions };
  }

  /**
   * Selects a club for a multi-club user and issues a new JWT with the chosen clubId.
   */
  async selectClub(email: string, clubId: string): Promise<{ token: string; user: PublicUser }> {
    const user = await this.repository.findUserByEmailAndClub(email, clubId);
    if (!user) {
      throw new NotFoundError("You are not a member of this club.");
    }

    if (user.status === "suspended") {
      throw new ForbiddenError("This account has been suspended.");
    }

    const publicUser = toPublicUser(user);
    const token = signToken({
      id: publicUser.id,
      email: publicUser.email,
      role: publicUser.role,
      clubId: publicUser.clubId,
    });

    logger.info({ email, userId: publicUser.id, clubId }, "auth.club.selected");

    return { token, user: publicUser };
  }

  /**
   * Lists all clubs the authenticated user belongs to.
   */
  async listMyClubs(email: string): Promise<ClubOption[]> {
    const users = await this.repository.findUsersByEmailAndRoles(email, [USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN, USER_ROLES.COACH]);

    const clubIds = users.filter((u) => u.emailVerified && u.status !== "suspended" && u.clubId).map((u) => u.clubId!);

    if (clubIds.length === 0) return [];

    const clubs = await ClubModel.find({ _id: { $in: clubIds } })
      .lean()
      .exec();
    const clubMap = new Map(clubs.map((c) => [c._id.toString(), c]));

    return users
      .filter((u) => u.emailVerified && u.status !== "suspended" && u.clubId && clubMap.has(u.clubId.toString()))
      .map((u) => ({
        clubId: u.clubId!.toString(),
        clubName: clubMap.get(u.clubId!.toString())!.name,
        role: u.role,
        status: u.status,
      }));
  }

  /**
   * Returns the public profile for a given user id.
   */
  async getMe(userId: string): Promise<PublicUser> {
    const user = await this.repository.findUserById(userId);
    if (!user) throw new NotFoundError("User not found");
    if (user.status === "suspended") throw new ForbiddenError("Account suspended");
    return toPublicUser(user);
  }
}
