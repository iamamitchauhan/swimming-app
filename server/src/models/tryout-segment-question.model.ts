import mongoose, { Schema, Document, Model } from "mongoose";

// ─── Interfaces ───────────────────────────────────────────────────────────────

export interface ITryoutSegmentQuestion extends Document {
  tryoutId: mongoose.Types.ObjectId;
  // `segment.id ?? segment.name` — segments are embedded sub-docs and usually
  // carry no id, matching the convention used across the tryout module.
  segmentId: string;
  questionId: mongoose.Types.ObjectId;
  orderIndex: number;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Main schema ──────────────────────────────────────────────────────────────

const TryoutSegmentQuestionSchema = new Schema<ITryoutSegmentQuestion>(
  {
    tryoutId: {
      type: Schema.Types.ObjectId,
      ref: "Tryout",
      required: true,
      index: true,
    },
    segmentId: { type: String, required: true, index: true },
    questionId: {
      type: Schema.Types.ObjectId,
      ref: "ScoringQuestion",
      required: true,
    },
    orderIndex: { type: Number, required: true },
  },
  {
    collection: "tryout_segment_questions",
    timestamps: true,
  },
);

// ─── Indexes ──────────────────────────────────────────────────────────────────

TryoutSegmentQuestionSchema.index(
  { tryoutId: 1, segmentId: 1, questionId: 1 },
  { unique: true },
);

// ─── Export ───────────────────────────────────────────────────────────────────

export const TryoutSegmentQuestionModel: Model<ITryoutSegmentQuestion> =
  mongoose.model<ITryoutSegmentQuestion>("TryoutSegmentQuestion", TryoutSegmentQuestionSchema);
