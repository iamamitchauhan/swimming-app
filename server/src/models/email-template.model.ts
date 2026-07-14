import mongoose, { Schema, Document, Model, Types } from "mongoose";

// ─── Interface ────────────────────────────────────────────────────────────────

export interface IEmailTemplate extends Document {
  clubId: Types.ObjectId;
  groupId: string;
  subject: string;
  body: string;
  createdBy: Types.ObjectId;
  updatedBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Schema ─────────────────────────────────────────────────────────────────────

const EmailTemplateSchema = new Schema<IEmailTemplate>(
  {
    clubId: {
      type: Schema.Types.ObjectId,
      ref: "Club",
      required: true,
      index: true,
    },
    groupId: {
      type: String,
      required: true,
      trim: true,
    },
    subject: {
      type: String,
      required: true,
      trim: true,
    },
    body: {
      type: String,
      required: true,
      trim: true,
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
  },
  {
    timestamps: true,
  },
);

// ─── Indexes ────────────────────────────────────────────────────────────────────

EmailTemplateSchema.index({ clubId: 1, groupId: 1 }, { unique: true });

// ─── Export ─────────────────────────────────────────────────────────────────────

export const EmailTemplateModel: Model<IEmailTemplate> = mongoose.model<IEmailTemplate>(
  "EmailTemplate",
  EmailTemplateSchema,
);
