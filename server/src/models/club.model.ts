import mongoose, { Schema, Document, Model } from 'mongoose';

// ─── Club Status ──────────────────────────────────────────────────────────────

export const CLUB_STATUSES = ['draft', 'pending_review', 'approved', 'rejected'] as const;
export type ClubStatus = (typeof CLUB_STATUSES)[number];

// ─── Interface ────────────────────────────────────────────────────────────────

export interface IClub extends Document {
  name: string;
  address: string;
  phone: string;
  logoUrl: string | null;
  ownerId: mongoose.Types.ObjectId;
  status: ClubStatus;
  rejectionReason: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Schema ───────────────────────────────────────────────────────────────────

const clubSchema = new Schema<IClub>(
  {
    name: {
      type: String,
      trim: true,
      default: '',
    },
    address: {
      type: String,
      trim: true,
      default: '',
    },
    phone: {
      type: String,
      trim: true,
      default: '',
    },
    logoUrl: {
      type: String,
      default: null,
    },
    ownerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: CLUB_STATUSES,
      default: 'draft',
      index: true,
    },
    rejectionReason: {
      type: String,
      default: null,
    },
  },
  {
    collection: 'clubs',
    timestamps: true,
  },
);

clubSchema.index({ status: 1, createdAt: -1 });

export const ClubModel: Model<IClub> = mongoose.model<IClub>('Club', clubSchema);
