import { TryoutSlotModel, PlainTryoutSlot } from '../../models/tryout-slot.model';

export class TryoutSlotRepository {
  async findByTryout(tryoutId: string): Promise<PlainTryoutSlot[]> {
    return TryoutSlotModel.find({ tryoutId })
      .sort({ sessionDate: 1, slotIndex: 1 })
      .lean<PlainTryoutSlot[]>()
      .exec();
  }

  async findById(id: string): Promise<PlainTryoutSlot | null> {
    return TryoutSlotModel.findById(id).lean<PlainTryoutSlot>().exec();
  }

  async findBySession(sessionId: string): Promise<PlainTryoutSlot[]> {
    return TryoutSlotModel.find({ sessionId })
      .sort({ slotIndex: 1 })
      .lean<PlainTryoutSlot[]>()
      .exec();
  }

  async createMany(slots: Omit<PlainTryoutSlot, '_id' | 'createdAt' | 'updatedAt'>[]): Promise<PlainTryoutSlot[]> {
    const docs = await TryoutSlotModel.insertMany(slots);
    return docs.map((d) => d.toObject<PlainTryoutSlot>());
  }

  async deleteByTryout(tryoutId: string): Promise<void> {
    await TryoutSlotModel.deleteMany({ tryoutId }).exec();
  }

  async deleteBySession(sessionId: string): Promise<void> {
    await TryoutSlotModel.deleteMany({ sessionId }).exec();
  }

  async incrementRegisteredCount(slotId: string): Promise<void> {
    await TryoutSlotModel.findByIdAndUpdate(slotId, { $inc: { registeredCount: 1 } }).exec();
  }

  async decrementRegisteredCount(slotId: string): Promise<void> {
    await TryoutSlotModel.findByIdAndUpdate(slotId, { $inc: { registeredCount: -1 } }).exec();
  }
}
