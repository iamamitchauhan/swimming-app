import mongoose, { Schema, Document, Model } from "mongoose";

// ─── Constants ────────────────────────────────────────────────────────────────

// Answer formats for an evaluation question:
// YESNO → pass/fail, RATING → 1–5 scale, TEXT → free-text answer.
export const SCORING_QUESTION_TYPES = ["YESNO", "RATING", "TEXT"] as const;
export type ScoringQuestionType = (typeof SCORING_QUESTION_TYPES)[number];

// ─── Interfaces ───────────────────────────────────────────────────────────────

export interface IScoringQuestion extends Document {
  clubId: mongoose.Types.ObjectId;
  category: string | null;
  sourceFileName: string | null;
  label: string;
  type: ScoringQuestionType;
  orderIndex: number;
  isDeleted: boolean;
  deletedAt: Date | null;
  createdBy: string | null;
  updatedBy: string | null;
  deletedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Main schema ──────────────────────────────────────────────────────────────

const ScoringQuestionSchema = new Schema<IScoringQuestion>(
  {
    clubId: {
      type: Schema.Types.ObjectId,
      ref: "Club",
      required: true,
      index: true,
    },
    // Optional grouping carried over from the sheet's `category` column.
    category: { type: String, default: null, maxlength: 255 },
    // Filename of the sheet this question was imported from (display only).
    sourceFileName: { type: String, default: null, maxlength: 255 },
    // The question text. Re-imports dedup against this (normalized) value.
    label: { type: String, required: true, trim: true, maxlength: 500 },
    type: { type: String, enum: SCORING_QUESTION_TYPES, required: true },
    orderIndex: { type: Number, required: true },
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
    createdBy: { type: String, default: null },
    updatedBy: { type: String, default: null },
    deletedBy: { type: String, default: null },
  },
  {
    collection: "club_scoring_questions",
    timestamps: true,
  },
);

// ─── Indexes ──────────────────────────────────────────────────────────────────

ScoringQuestionSchema.index({ clubId: 1, isDeleted: 1, orderIndex: 1 });
// Safety net for append-only imports; partial so a soft-deleted question can be
// re-imported later.
ScoringQuestionSchema.index(
  { clubId: 1, label: 1 },
  { unique: true, partialFilterExpression: { isDeleted: false } },
);

// ─── Export ───────────────────────────────────────────────────────────────────

export const ScoringQuestionModel: Model<IScoringQuestion> = mongoose.model<IScoringQuestion>(
  "ScoringQuestion",
  ScoringQuestionSchema,
);
