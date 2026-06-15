import mongoose, { Schema, Document, Model } from 'mongoose';
import { USER_ROLES, UserRole } from '../shared/constants/roles';

// ─── Invitation Status ────────────────────────────────────────────────────────

export const INVITATION_STATUSES = ['pending', 'accepted', 'expired'] as const;
export type InvitationStatus = (typeof INVITATION_STATUSES)[number];

// ─── Invitable roles ─────────────────────────────────────────────────────────

export const INVITABLE_ROLES_LIST: UserRole[] = [USER_ROLES.ADMIN, USER_ROLES.COACH];

// ─── Interface ────────────────────────────────────────────────────────────────

export interface IInvitation extends Document {
  email: string;
  role: UserRole;
  clubId: mongoose.Types.ObjectId;
  invitedBy: mongoose.Types.ObjectId;
  tokenHash: string;
  status: InvitationStatus;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Schema ───────────────────────────────────────────────────────────────────

const invitationSchema = new Schema<IInvitation>(
  {
    email: {
      type: String,
      required: true,
      lowercase: true,
    },
    role: {
      type: String,
      enum: INVITABLE_ROLES_LIST,
      required: true,
    },
    clubId: {
      type: Schema.Types.ObjectId,
      ref: 'Club',
      required: true,
    },
    invitedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    tokenHash: {
      type: String,
      required: true,
      unique: true,
    },
    status: {
      type: String,
      enum: INVITATION_STATUSES,
      default: 'pending',
    },
    expiresAt: {
      type: Date,
      required: true,
    },
  },
  {
    collection: 'invitations',
    timestamps: true,
  },
);

// Auto-delete after expiry
invitationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
invitationSchema.index({ email: 1, clubId: 1, status: 1 });

export const InvitationModel: Model<IInvitation> =
  mongoose.model<IInvitation>('Invitation', invitationSchema);
