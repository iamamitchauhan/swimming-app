import mongoose, { Schema, Document, Model } from 'mongoose';

// ─── Types ────────────────────────────────────────────────────────────────────

export type QuestionType = 'text' | 'textarea' | 'radio' | 'checkbox';

export interface IRegistrationQuestion {
  categoryId: string;
  category: string;
  questionIndex: number;
  type: QuestionType;
  label: string;
  required: boolean;
  placeholder?: string;
  options?: string[];
}

export interface ITryoutRegistrationQuestion extends Document {
  tryoutId: mongoose.Types.ObjectId;
  questions: IRegistrationQuestion[];
  createdAt: Date;
  updatedAt: Date;
}

// ─── Sub-schema ───────────────────────────────────────────────────────────────

const RegistrationQuestionSchema = new Schema<IRegistrationQuestion>(
  {
    categoryId: { type: String, required: true },
    category: { type: String, required: true },
    questionIndex: { type: Number, required: true },
    type: {
      type: String,
      enum: ['text', 'textarea', 'radio', 'checkbox'],
      required: true,
    },
    label: { type: String, required: true, trim: true },
    required: { type: Boolean, default: false },
    placeholder: { type: String, default: null },
    options: { type: [String], default: undefined },
  },
  { _id: false },
);

// ─── Main schema ──────────────────────────────────────────────────────────────

const TryoutRegistrationQuestionSchema = new Schema<ITryoutRegistrationQuestion>(
  {
    tryoutId: {
      type: Schema.Types.ObjectId,
      ref: 'Tryout',
      required: true,
      unique: true,
      index: true,
    },
    questions: {
      type: [RegistrationQuestionSchema],
      default: [],
    },
  },
  {
    collection: 'tryout_registration_questions',
    timestamps: true,
  },
);

// ─── Export ───────────────────────────────────────────────────────────────────

export const TryoutRegistrationQuestionModel: Model<ITryoutRegistrationQuestion> =
  mongoose.model<ITryoutRegistrationQuestion>(
    'TryoutRegistrationQuestion',
    TryoutRegistrationQuestionSchema,
  );
