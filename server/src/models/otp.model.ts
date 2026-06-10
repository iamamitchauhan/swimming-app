import mongoose, { Schema, Document, Model } from 'mongoose';

// ─── OTP Purpose ─────────────────────────────────────────────────────────────

export const OTP_PURPOSES = ['login'] as const;
export type OtpPurpose = (typeof OTP_PURPOSES)[number];

// ─── Interface ────────────────────────────────────────────────────────────────

export interface IOtp extends Document {
  email: string;
  codeHash: string;
  purpose: OtpPurpose;
  attempts: number;
  expiresAt: Date;
  usedAt: Date | null;
  createdAt: Date;
}

// ─── Schema ───────────────────────────────────────────────────────────────────

const otpSchema = new Schema<IOtp>(
  {
    email: {
      type: String,
      required: true,
      lowercase: true,
    },
    codeHash: {
      type: String,
      required: true,
    },
    purpose: {
      type: String,
      enum: OTP_PURPOSES,
      required: true,
    },
    attempts: {
      type: Number,
      default: 0,
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
    collection: 'otps',
    timestamps: { createdAt: true, updatedAt: false },
  },
);

// Auto-delete expired OTP documents
otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
otpSchema.index({ email: 1, purpose: 1 });

export const OtpModel: Model<IOtp> = mongoose.model<IOtp>('Otp', otpSchema);
