import mongoose, { Schema, Document, Model } from "mongoose";

// ─── Interface ────────────────────────────────────────────────────────────────

export interface IEmailVerification extends Document {
  email: string;
  role?: string;
  tokenHash: string;
  expiresAt: Date;
  usedAt: Date | null;
  createdAt: Date;
}

// ─── Schema ───────────────────────────────────────────────────────────────────

const emailVerificationSchema = new Schema<IEmailVerification>(
  {
    email: {
      type: String,
      required: true,
      lowercase: true,
    },
    role: {
      type: String,
    },
    tokenHash: {
      type: String,
      required: true,
      unique: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    usedAt: {
      type: Date,
      default: null,
    },
  },
  {
    collection: "email_verifications",
    timestamps: { createdAt: true, updatedAt: false },
  },
);

// Auto-delete expired verification documents
emailVerificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
emailVerificationSchema.index({ email: 1 });

export const EmailVerificationModel: Model<IEmailVerification> = mongoose.model<IEmailVerification>("EmailVerification", emailVerificationSchema);
