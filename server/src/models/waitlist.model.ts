import mongoose, { Schema, Document, Model } from "mongoose";

// ─── Interface ────────────────────────────────────────────────────────────────

export interface IWaitlist extends Document {
  tryoutId: mongoose.Types.ObjectId;
  parentId?: mongoose.Types.ObjectId;
  swimmerFirstName: string;
  swimmerLastName: string;
  ageOnTryoutDay: number;
  segmentId?: string;
  guardianName: string;
  guardianEmail: string;
  waitlistPosition: number;
  notifiedAt?: Date;
  joinedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Schema ───────────────────────────────────────────────────────────────────

const waitlistSchema = new Schema<IWaitlist>(
  {
    tryoutId: {
      type: Schema.Types.ObjectId,
      ref: "Tryout",
      required: true,
      index: true,
    },
    parentId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },
    swimmerFirstName: {
      type: String,
      required: true,
    },
    swimmerLastName: {
      type: String,
      required: true,
    },
    ageOnTryoutDay: {
      type: Number,
      required: true,
    },
    segmentId: {
      type: String,
    },
    guardianName: {
      type: String,
      required: true,
    },
    guardianEmail: {
      type: String,
      required: true,
    },
    waitlistPosition: {
      type: Number,
      required: true,
    },
    notifiedAt: {
      type: Date,
    },
    joinedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    collection: "waitlists",
    timestamps: true,
  },
);

// ─── Indexes ─────────────────────────────────────────────────────────────────

waitlistSchema.index({ tryoutId: 1, guardianEmail: 1 }, { unique: true });

waitlistSchema.index({ tryoutId: 1, waitlistPosition: 1 });

// ─── Export ──────────────────────────────────────────────────────────────────

export const WaitlistModel: Model<IWaitlist> = mongoose.model<IWaitlist>("Waitlist", waitlistSchema);
