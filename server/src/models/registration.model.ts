import mongoose, { Schema, Document, Model } from 'mongoose';

// ─── Interface ────────────────────────────────────────────────────────────────

export interface IRegistration extends Document {
  tryoutId: mongoose.Types.ObjectId;
  swimmerId: mongoose.Types.ObjectId;
  parentId: mongoose.Types.ObjectId;
  
  // References to separate collections
  sessionId: mongoose.Types.ObjectId;
  slotId: mongoose.Types.ObjectId;
  segmentId: string;

  // Swimmer details captured at registration time
  swimmerDetails: {
    firstName: string;
    lastName: string;
    dob: string;
    ageOnTryoutDay: number;
    hasUsaMembership: boolean;
    usaMembershipId?: string;
    clubName?: string;
    swimTime50Free?: string;
    swimTime100Free?: string;
    strokes: string[];
    starts: string[];
    turns: string[];
    guardianName: string;
    guardianEmail: string;
  };
  
  // Registration Management
  status: 'registered' | 'waitlisted' | 'offered' | 'rejected' | 'cancelled';
  waitlistPosition?: number;
  registeredAt: Date;
  
  // USA-S Verification
  usaVerificationStatus?: 'pending' | 'needs_review' | 'verified' | 'rejected';

  // Scores
  scores?: {
    safetyEntryExit?: boolean;
    safetyFloat?: boolean;
    freestyle?: number;
    backstroke?: number;
    breaststroke?: number;
    butterfly?: number;
    totalScore?: number;
  };

  // Communication
  emailSent: boolean;
  lastCommunicationAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}

// ─── Schema ───────────────────────────────────────────────────────────────────

const registrationSchema = new Schema<IRegistration>(
  {
    tryoutId: {
      type: Schema.Types.ObjectId,
      ref: 'Tryout',
      required: true,
      index: true,
    },
    swimmerId: {
      type: Schema.Types.ObjectId,
      ref: 'Swimmer',
      required: true,
      index: true,
    },
    parentId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    sessionId: {
      type: Schema.Types.ObjectId,
      ref: 'TryoutSession',
      required: true,
      index: true,
    },
    slotId: {
      type: Schema.Types.ObjectId,
      ref: 'TryoutSlot',
      required: true,
      index: true,
    },
    segmentId: {
      type: String,
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['registered', 'waitlisted', 'offered', 'rejected', 'cancelled'],
      default: 'registered',
      index: true,
    },
    waitlistPosition: {
      type: Number,
    },
    registeredAt: {
      type: Date,
      default: Date.now,
    },
    emailSent: {
      type: Boolean,
      default: false,
    },
    lastCommunicationAt: {
      type: Date,
    },
    usaVerificationStatus: {
      type: String,
      enum: ['pending', 'needs_review', 'verified', 'rejected'],
      default: 'pending',
    },
    scores: {
      safetyEntryExit: { type: Boolean },
      safetyFloat:     { type: Boolean },
      freestyle:       { type: Number },
      backstroke:      { type: Number },
      breaststroke:    { type: Number },
      butterfly:       { type: Number },
      totalScore:      { type: Number },
    },
    swimmerDetails: {
      firstName: { type: String, required: true },
      lastName: { type: String, required: true },
      dob: { type: String, required: true },
      ageOnTryoutDay: { type: Number, required: true },
      hasUsaMembership: { type: Boolean, default: false },
      usaMembershipId: { type: String },
      clubName: { type: String },
      swimTime50Free: { type: String },
      swimTime100Free: { type: String },
      strokes: [{ type: String }],
      starts: [{ type: String }],
      turns: [{ type: String }],
      guardianName: { type: String, required: true },
      guardianEmail: { type: String, required: true },
    },
  },
  {
    collection: 'registrations',
    timestamps: true,
  },
);

// ─── Indexes ────────────────────────────────────────────────────────────────────

// Unique constraint: one active registration per swimmer per tryout
registrationSchema.index(
  { tryoutId: 1, swimmerId: 1 },
  { 
    unique: true,
    partialFilterExpression: { 
      status: { $nin: ['cancelled'] }
    }
  }
);

// Parent can find their swimmer's registrations
registrationSchema.index({ parentId: 1, status: 1 });

// Waitlist ordering
registrationSchema.index({ tryoutId: 1, status: 1, waitlistPosition: 1 });

// Session and segment lookups
registrationSchema.index({ sessionId: 1, segmentId: 1 });

// ─── Export ─────────────────────────────────────────────────────────────────────

export const RegistrationModel: Model<IRegistration> = mongoose.model<IRegistration>('Registration', registrationSchema);
