import { TryoutSessionModel, PlainTryoutSession } from '../../models/tryout-session.model';

export class TryoutSessionRepository {
  async findByTryout(tryoutId: string): Promise<PlainTryoutSession[]> {
    return TryoutSessionModel.find({ tryoutId })
      .sort({ date: 1, startTime: 1 })
      .lean<PlainTryoutSession[]>()
      .exec();
  }

  async findById(id: string): Promise<PlainTryoutSession | null> {
    return TryoutSessionModel.findById(id).lean<PlainTryoutSession>().exec();
  }

  async createMany(
    sessions: Omit<PlainTryoutSession, '_id' | 'createdAt' | 'updatedAt'>[],
  ): Promise<PlainTryoutSession[]> {
    const docs = await TryoutSessionModel.insertMany(sessions);
    return docs.map((d) => d.toObject<PlainTryoutSession>());
  }

  async deleteByTryout(tryoutId: string): Promise<void> {
    await TryoutSessionModel.deleteMany({ tryoutId }).exec();
  }
}
