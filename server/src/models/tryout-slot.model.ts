import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ITryoutSlot extends Document {
  tryoutId: mongoose.Types.ObjectId;
  sessionId: mongoose.Types.ObjectId;
  sessionDate: string;
  startTime: string;
  endTime: string;
  label: string;
  slotIndex: number;
  capacity: number;
  registeredCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const TryoutSlotSchema = new Schema<ITryoutSlot>(
  {
    tryoutId: {
      type: Schema.Types.ObjectId,
      ref: 'Tryout',
      required: true,
      index: true,
    },
    sessionId: {
      type: Schema.Types.ObjectId,
      ref: 'TryoutSession',
      required: true,
      index: true,
    },
    sessionDate: { type: String, required: true },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    label: { type: String, default: '' },
    slotIndex: { type: Number, required: true },
    capacity: { type: Number, required: true },
    registeredCount: { type: Number, default: 0 },
  },
  {
    collection: 'tryout_slots',
    timestamps: true,
  },
);

TryoutSlotSchema.index({ tryoutId: 1, sessionDate: 1, slotIndex: 1 });
TryoutSlotSchema.index({ sessionId: 1, slotIndex: 1 });

export type PlainTryoutSlot = {
  _id: string;
  tryoutId: string;
  sessionId: string;
  sessionDate: string;
  startTime: string;
  endTime: string;
  label: string;
  slotIndex: number;
  capacity: number;
  registeredCount: number;
  createdAt: Date;
  updatedAt: Date;
};

export const TryoutSlotModel: Model<ITryoutSlot> = mongoose.model<ITryoutSlot>(
  'TryoutSlot',
  TryoutSlotSchema,
);
