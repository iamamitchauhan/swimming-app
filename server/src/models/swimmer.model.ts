import mongoose, { Schema, Document, Model } from "mongoose";

// ─── Interface ────────────────────────────────────────────────────────────────

export interface ISwimmer extends Document {
  parentId: mongoose.Types.ObjectId;
  firstName: string;
  lastName: string;
  birthDate?: Date;

  // USA Swimming (Optional)
  usaMembershipId?: string;
  clubName?: string;

  // Status
  isActive: boolean;

  createdAt: Date;
  updatedAt: Date;
}

// ─── Schema ───────────────────────────────────────────────────────────────────

const swimmerSchema = new Schema<ISwimmer>(
  {
    parentId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    firstName: {
      type: String,
      required: true,
      trim: true,
    },
    lastName: {
      type: String,
      required: true,
      trim: true,
    },
    birthDate: {
      type: Date,
      required: false,
    },
    usaMembershipId: {
      type: String,
      trim: true,
    },
    clubName: {
      type: String,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    collection: "swimmers",
    timestamps: true,
  },
);

// ─── Indexes ────────────────────────────────────────────────────────────────────

// Parent can quickly find their active swimmers
swimmerSchema.index({ parentId: 1, isActive: 1 });

// Birth date index for age-based queries
swimmerSchema.index({ birthDate: 1 });

// Unique constraint to prevent duplicate swimmers for same parent
swimmerSchema.index({ parentId: 1, firstName: 1, lastName: 1, birthDate: 1 }, { unique: true });

// ─── Export ─────────────────────────────────────────────────────────────────────

export const SwimmerModel: Model<ISwimmer> = mongoose.model<ISwimmer>("Swimmer", swimmerSchema);
