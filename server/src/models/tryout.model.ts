import mongoose, { Schema, Document } from "mongoose";

// ─── Subdocument schemas ───────────────────────────────────────────────────────

const SegmentSchema = new Schema(
  {
    id: { type: String },
    name: { type: String, required: true },
    minAge: { type: Number, required: true },
    maxAge: { type: Number, required: true },
    level: { type: String, default: "" },
  },
  { _id: false },
);

const StepSchema = new Schema(
  {
    title: { type: String, default: "" },
    description: { type: String, default: "" },
  },
  { _id: false },
);

const FaqSchema = new Schema(
  {
    question: { type: String, default: "" },
    answer: { type: String, default: "" },
  },
  { _id: false },
);

const LaneDetailSchema = new Schema({
  name: { type: String, required: true },
  order: { type: Number, required: true },
});

const CoachAssignmentSchema = new Schema(
  {
    coachId: { type: String, required: true },
    role: { type: String, enum: ["Lead Coach", "Assistant Coach", "Evaluator"], required: true },
    segmentIds: { type: [String], default: [] },
    laneIds: { type: [String], default: [] },
  },
  { _id: true },
);

// ─── Main schema ───────────────────────────────────────────────────────────────

const TryoutSchema = new Schema(
  {
    name: { type: String, required: true },
    location: { type: String, default: "" },
    description: { type: String, default: "" },
    theme: {
      type: String,
      enum: ["ocean", "sunset", "forest", "midnight", "coral"],
      default: "ocean",
    },
    bannerUrl: { type: String, default: "" },
    slotDuration: { type: Number, default: 30 },
    swimmersPerSlot: { type: Number, default: 4 },
    lanesAvailable: { type: Number, default: 6 },
    laneDetails: { type: [LaneDetailSchema], default: [] },
    coachAssignments: { type: [CoachAssignmentSchema], default: [] },
    swimmersPerLane: { type: Number, default: 4 },
    ctaLabel: { type: String, default: "Sign up today" },
    highlights: { type: String, default: "" },
    additionalInstructions: { type: String, default: "" },
    status: { type: String, enum: ["draft", "open", "closed"], default: "draft" },

    // Computed from sessions
    startAt: { type: Date, default: null },
    endAt: { type: Date, default: null },

    // Registration tracking
    registrationCount: { type: Number, default: 0 },
    waitlistCount: { type: Number, default: 0 },

    segments: { type: [SegmentSchema], default: [] },
    steps: { type: [StepSchema], default: [] },
    faqs: { type: [FaqSchema], default: [] },
    clubId: { type: Schema.Types.ObjectId, ref: "Club", required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true },
);

// ─── Indexes ────────────────────────────────────────────────────────────────────

TryoutSchema.index({ clubId: 1, createdAt: -1 });
TryoutSchema.index({ createdBy: 1 });

// ─── Export ─────────────────────────────────────────────────────────────────────

export const TryoutModel = mongoose.model("Tryout", TryoutSchema);

export type TryoutDocument = Document & {
  _id: string;
  name: string;
  location: string;
  description: string;
  theme: string;
  bannerUrl: string;
  slotDuration: number;
  swimmersPerSlot: number;
  lanesAvailable: number;
  laneDetails: Array<{
    _id: string;
    name: string;
    order: number;
  }>;
  coachAssignments: Array<{
    _id: string;
    coachId: string;
    role: "Lead Coach" | "Assistant Coach" | "Evaluator";
    segmentIds: string[];
    laneIds: string[];
  }>;
  swimmersPerLane: number;
  ctaLabel: string;
  highlights: string;
  additionalInstructions: string;
  status: string;
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
  startAt: Date | null;
  endAt: Date | null;
  clubId: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
};
