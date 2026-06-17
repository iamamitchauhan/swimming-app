import mongoose, { Schema, Document, Model } from 'mongoose';

// ─── Constants ────────────────────────────────────────────────────────────────

export const QUESTION_TYPES = ['text', 'textarea', 'radio', 'checkbox'] as const;
export type QuestionType = (typeof QUESTION_TYPES)[number];

// ─── Interfaces ───────────────────────────────────────────────────────────────

export interface IQuestion {
  type: QuestionType;
  label: string;
  required: boolean;
  placeholder?: string;
  options?: string[];
}

export interface IQuestionCategory extends Document {
  category: string;
  questions: IQuestion[];
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Sub-schema ───────────────────────────────────────────────────────────────

const QuestionSchema = new Schema<IQuestion>(
  {
    type: {
      type: String,
      enum: QUESTION_TYPES,
      required: true,
    },
    label: {
      type: String,
      required: true,
      trim: true,
    },
    required: {
      type: Boolean,
      default: false,
    },
    placeholder: {
      type: String,
      default: null,
    },
    options: {
      type: [String],
      default: undefined,
    },
  },
  { _id: false },
);

// ─── Main schema ──────────────────────────────────────────────────────────────

const QuestionCategorySchema = new Schema<IQuestionCategory>(
  {
    category: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    questions: {
      type: [QuestionSchema],
      default: [],
    },
    sortOrder: {
      type: Number,
      default: 0,
    },
  },
  {
    collection: 'question_library',
    timestamps: true,
  },
);

// ─── Indexes ──────────────────────────────────────────────────────────────────

QuestionCategorySchema.index({ sortOrder: 1 });

// ─── Export ───────────────────────────────────────────────────────────────────

export const QuestionLibraryModel: Model<IQuestionCategory> =
  mongoose.model<IQuestionCategory>('QuestionLibrary', QuestionCategorySchema);
