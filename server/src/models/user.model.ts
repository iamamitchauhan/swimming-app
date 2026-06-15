import mongoose, { Schema, Document, Model } from 'mongoose';
import { USER_ROLES, UserRole } from '../shared/constants/roles';

// ─── User Status ──────────────────────────────────────────────────────────────

export const USER_STATUSES = ['pending_verification', 'active', 'suspended'] as const;
export type UserStatus = (typeof USER_STATUSES)[number];

// ─── Interface ────────────────────────────────────────────────────────────────

export interface IUser extends Document {
  email: string;
  role: UserRole;
  status: UserStatus;
  clubId: mongoose.Types.ObjectId | null;
  onboardingStep: number;
  emailVerified: boolean;
  firstName: string;
  lastName: string;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Schema ───────────────────────────────────────────────────────────────────

const userSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    role: {
      type: String,
      enum: Object.values(USER_ROLES),
      required: true,
    },
    status: {
      type: String,
      enum: USER_STATUSES,
      default: 'pending_verification',
    },
    clubId: {
      type: Schema.Types.ObjectId,
      ref: 'Club',
      default: null,
    },
    onboardingStep: {
      type: Number,
      default: 0,
      min: 0,
      max: 3,
    },
    emailVerified: {
      type: Boolean,
      default: false,
    },
    firstName: {
      type: String,
      trim: true,
      default: '',
    },
    lastName: {
      type: String,
      trim: true,
      default: '',
    },
  },
  {
    collection: 'users',
    timestamps: true,
  },
);

userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ clubId: 1, role: 1 });

export const UserModel: Model<IUser> = mongoose.model<IUser>('User', userSchema);
