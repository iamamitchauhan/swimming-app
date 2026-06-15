import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ITryoutSession extends Document {
  tryoutId: mongoose.Types.ObjectId;
  date: string;
  startTime: string;
  endTime: string;
  label: string;
  slotDuration: number;
  swimmersPerSlot: number;
  totalSlots: number;
  createdAt: Date;
  updatedAt: Date;
}

const TryoutSessionSchema = new Schema<ITryoutSession>(
  {
    tryoutId: {
      type: Schema.Types.ObjectId,
      ref: 'Tryout',
      required: true,
      index: true,
    },
    date: { type: String, required: true },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    label: { type: String, default: '' },
    slotDuration: { type: Number, required: true },
    swimmersPerSlot: { type: Number, required: true },
    totalSlots: { type: Number, required: true },
  },
  {
    collection: 'tryout_sessions',
    timestamps: true,
  },
);

TryoutSessionSchema.index({ tryoutId: 1, date: 1 });

export type PlainTryoutSession = {
  _id: string;
  tryoutId: string;
  date: string;
  startTime: string;
  endTime: string;
  label: string;
  slotDuration: number;
  swimmersPerSlot: number;
  totalSlots: number;
  createdAt: Date;
  updatedAt: Date;
};

export const TryoutSessionModel: Model<ITryoutSession> = mongoose.model<ITryoutSession>(
  'TryoutSession',
  TryoutSessionSchema,
);
