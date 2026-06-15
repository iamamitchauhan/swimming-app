import mongoose, { Schema, Document } from 'mongoose';

// ─── Subdocument schemas ───────────────────────────────────────────────────────

const SessionSchema = new Schema(
  {
    id: { type: String, required: true }, // Stable ID for references
    date: { type: String, required: true },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    label: { type: String, default: '' },
  },
  { _id: false },
);

const SegmentSchema = new Schema(
  {
    id: { type: String, required: true }, // Stable ID for references
    name: { type: String, required: true },
    minAge: { type: Number, required: true },
    maxAge: { type: Number, required: true },
    level: { type: String, default: '' },
  },
  { _id: false },
);

const StepSchema = new Schema(
  {
    title: { type: String, default: '' },
    description: { type: String, default: '' },
  },
  { _id: false },
);

const FaqSchema = new Schema(
  {
    question: { type: String, default: '' },
    answer: { type: String, default: '' },
  },
  { _id: false },
);

// ─── Main schema ───────────────────────────────────────────────────────────────

const TryoutSchema = new Schema(
  {
    name: { type: String, required: true },
    location: { type: String, default: '' },
    description: { type: String, default: '' },
    theme: {
      type: String,
      enum: ['ocean', 'sunset', 'forest', 'midnight', 'coral'],
      default: 'ocean',
    },
    bannerUrl: { type: String, default: '' },
    slotDuration: { type: Number, default: 30 },
    swimmersPerSlot: { type: Number, default: 4 },
    ctaLabel: { type: String, default: 'Sign up today' },
    highlights: { type: String, default: '' },
    additionalInstructions: { type: String, default: '' },
    status: { type: String, enum: ['draft', 'open', 'closed'], default: 'draft' },
    
    // Registration tracking
    registrationCount: { type: Number, default: 0 },
    waitlistCount: { type: Number, default: 0 },
    
    sessions: { type: [SessionSchema], default: [] },
    segments: { type: [SegmentSchema], default: [] },
    steps: { type: [StepSchema], default: [] },
    faqs: { type: [FaqSchema], default: [] },
    clubId: { type: Schema.Types.ObjectId, ref: 'Club', required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true },
);

// ─── Indexes ────────────────────────────────────────────────────────────────────

TryoutSchema.index({ clubId: 1, createdAt: -1 });
TryoutSchema.index({ createdBy: 1 });

// ─── Export ─────────────────────────────────────────────────────────────────────

export const TryoutModel = mongoose.model('Tryout', TryoutSchema);

export type TryoutDocument = Document & {
  _id: string;
  name: string;
  location: string;
  description: string;
  theme: string;
  bannerUrl: string;
  slotDuration: number;
  swimmersPerSlot: number;
  ctaLabel: string;
  highlights: string;
  additionalInstructions: string;
  status: string;
  sessions: Array<{
    date: string;
    startTime: string;
    endTime: string;
    label: string;
  }>;
  segments: Array<{
    name: string;
    minAge: number;
    maxAge: number;
    level: string;
  }>;
  steps: Array<{
    title: string;
    description: string;
  }>;
  faqs: Array<{
    question: string;
    answer: string;
  }>;
  clubId: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
};
