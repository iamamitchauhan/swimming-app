import { UserModel } from "../../models/user.model";
import { OtpModel } from "../../models/otp.model";
import { EmailVerificationModel } from "../../models/email-verification.model";
import { UserRole } from "../../shared/constants/roles";

// ─── Plain domain types ───────────────────────────────────────────────────────

export type PlainUser = {
  _id: string;
  email: string;
  role: string;
  status: string;
  clubId: string | null;
  onboardingStep: number;
  emailVerified: boolean;
  firstName: string;
  lastName: string;
};

export type PlainOtp = {
  _id: string;
  email: string;
  codeHash: string;
  purpose: string;
  attempts: number;
  expiresAt: Date;
  usedAt: Date | null;
};

export type PlainEmailVerification = {
  _id: string;
  email: string;
  role?: string;
  tokenHash: string;
  expiresAt: Date;
  usedAt: Date | null;
};

// ─── Repository ───────────────────────────────────────────────────────────────

/**
 * Data-access layer for auth entities (users, OTPs, email verifications).
 * Returns lean plain objects; no Mongoose document overhead exposed to services.
 */
export class AuthRepository {
  // ─── User ────────────────────────────────────────────────────────────────

  async findUserByEmail(email: string): Promise<PlainUser | null> {
    return UserModel.findOne({ email }).lean<PlainUser>().exec();
  }

  async findUserByEmailAndRole(email: string, role: UserRole): Promise<PlainUser | null> {
    return UserModel.findOne({ email, role }).lean<PlainUser>().exec();
  }

  async findUserByEmailAndRoles(email: string, roles: UserRole[]): Promise<PlainUser | null> {
    return UserModel.findOne({ email, role: { $in: roles } })
      .lean<PlainUser>()
      .exec();
  }

  async findUserById(id: string): Promise<PlainUser | null> {
    return UserModel.findById(id).lean<PlainUser>().exec();
  }

  async createUser(data: { email: string; firstName: string; lastName: string; role: UserRole; status?: string }): Promise<PlainUser> {
    const doc = await new UserModel(data).save();
    const plain = await UserModel.findById(doc._id).lean<PlainUser>().exec();
    if (!plain) throw new Error("Failed to retrieve created user");
    return plain;
  }

  async markEmailVerified(email: string): Promise<void> {
    await UserModel.updateOne({ email }, { $set: { emailVerified: true, status: "active" } }).exec();
  }

  async markEmailVerifiedByRole(email: string, role: UserRole): Promise<void> {
    await UserModel.updateOne({ email, role }, { $set: { emailVerified: true, status: "active" } }).exec();
  }

  async updateUser(
    id: string,
    data: Partial<{
      firstName: string;
      lastName: string;
      status: string;
      onboardingStep: number;
      clubId: string | null;
      emailVerified: boolean;
    }>,
  ): Promise<PlainUser | null> {
    return UserModel.findByIdAndUpdate(id, { $set: data }, { new: true }).lean<PlainUser>().exec();
  }

  // ─── OTP ─────────────────────────────────────────────────────────────────

  async createOtp(data: { email: string; codeHash: string; purpose: string; expiresAt: Date }): Promise<void> {
    await OtpModel.deleteMany({ email: data.email, purpose: data.purpose }).exec();
    await new OtpModel(data).save();
  }

  async findValidOtp(email: string, purpose: string): Promise<PlainOtp | null> {
    return OtpModel.findOne({
      email,
      purpose,
      usedAt: null,
      expiresAt: { $gt: new Date() },
    })
      .lean<PlainOtp>()
      .exec();
  }

  async markOtpUsed(id: string): Promise<void> {
    await OtpModel.findByIdAndUpdate(id, { $set: { usedAt: new Date() } }).exec();
  }

  async incrementOtpAttempts(id: string): Promise<number> {
    const doc = await OtpModel.findByIdAndUpdate(id, { $inc: { attempts: 1 } }, { new: true }).exec();
    return doc?.attempts ?? 0;
  }

  // ─── Email Verification ───────────────────────────────────────────────────

  async createEmailVerification(data: { email: string; role: UserRole; tokenHash: string; expiresAt: Date }): Promise<void> {
    await EmailVerificationModel.deleteMany({ email: data.email, role: data.role, usedAt: null }).exec();
    await new EmailVerificationModel(data).save();
  }

  async findValidEmailVerification(tokenHash: string): Promise<PlainEmailVerification | null> {
    return EmailVerificationModel.findOne({
      tokenHash,
      usedAt: null,
      expiresAt: { $gt: new Date() },
    })
      .lean<PlainEmailVerification>()
      .exec();
  }

  async markEmailVerificationUsed(id: string): Promise<void> {
    await EmailVerificationModel.findByIdAndUpdate(id, { $set: { usedAt: new Date() } }).exec();
  }
}
