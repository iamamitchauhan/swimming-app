import mongoose, { Schema, Document, Model, Types } from "mongoose";

// ─── Interface ────────────────────────────────────────────────────────────────

export interface IGroup extends Document {
  name: string;
  color: string;
  description: string;
  clubId: Types.ObjectId;
  createdBy: Types.ObjectId;
  updatedBy: Types.ObjectId;
  deletedBy: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

// ─── Schema ─────────────────────────────────────────────────────────────────────

const GroupSchema = new Schema<IGroup>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    color: {
      type: String,
      default: "",
      trim: true,
    },
    description: {
      type: String,
      default: "",
      trim: true,
    },
    clubId: {
      type: Schema.Types.ObjectId,
      ref: "Club",
      required: true,
      index: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    deletedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

// ─── Indexes ────────────────────────────────────────────────────────────────────

GroupSchema.index({ clubId: 1, name: 1 });
GroupSchema.index({ deletedAt: 1 });

// ─── Export ─────────────────────────────────────────────────────────────────────

export const GroupModel: Model<IGroup> = mongoose.model<IGroup>("Group", GroupSchema);
