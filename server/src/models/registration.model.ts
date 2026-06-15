import mongoose, { Schema, Document, Model } from 'mongoose';

// ─── Interface ────────────────────────────────────────────────────────────────

export interface IRegistration extends Document {
  tryoutId: mongoose.Types.ObjectId;
  swimmerId: mongoose.Types.ObjectId;
  parentId: mongoose.Types.ObjectId;
  
  // References to embedded objects
  sessionId: string;
  segmentId: string;
  
  // Registration Management
  status: 'registered' | 'waitlisted' | 'offered' | 'rejected' | 'cancelled';
  waitlistPosition?: number;
  registeredAt: Date;
  
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
      type: String,
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
