import mongoose from 'mongoose';
import { ClubModel } from '../../models/club.model';
import { UserModel } from '../../models/user.model';

export type PlainClub = {
  _id: string;
  name: string;
  address: string;
  phone: string;
  logoUrl: string | null;
  ownerId: string;
  status: string;
  rejectionReason: string | null;
  clubSize: string | null;
  region: string | null;
};

export class OnboardingRepository {
  async findClubByOwner(ownerId: string): Promise<PlainClub | null> {
    return ClubModel.findOne({ ownerId: new mongoose.Types.ObjectId(ownerId) })
      .lean<PlainClub>()
      .exec();
  }

  async findClubById(id: string): Promise<PlainClub | null> {
    return ClubModel.findById(id).lean<PlainClub>().exec();
  }

  async upsertClubDraft(
    ownerId: string,
    data: Partial<{ name: string; address: string; phone: string; logoUrl: string; clubSize: string; region: string }>,
  ): Promise<PlainClub> {
    const club = await ClubModel.findOneAndUpdate(
      { ownerId: new mongoose.Types.ObjectId(ownerId), status: 'draft' },
      { $set: data },
      { new: true, upsert: true },
    )
      .lean<PlainClub>()
      .exec();
    if (!club) throw new Error('Failed to upsert club draft');
    return club;
  }

  async submitClub(clubId: string): Promise<PlainClub | null> {
    return ClubModel.findByIdAndUpdate(
      clubId,
      { $set: { status: 'pending_review' } },
      { new: true },
    )
      .lean<PlainClub>()
      .exec();
  }

  async setUserOnboardingStep(userId: string, step: number): Promise<void> {
    await UserModel.findByIdAndUpdate(userId, { $set: { onboardingStep: step } }).exec();
  }

  async setUserClub(userId: string, clubId: string): Promise<void> {
    await UserModel.findByIdAndUpdate(userId, {
      $set: { clubId: new mongoose.Types.ObjectId(clubId) },
    }).exec();
  }

  async getUserOnboardingStep(userId: string): Promise<number> {
    const user = await UserModel.findById(userId).select('onboardingStep').lean().exec();
    return (user as { onboardingStep?: number } | null)?.onboardingStep ?? 0;
  }
}
