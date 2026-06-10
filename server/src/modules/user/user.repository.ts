import mongoose from 'mongoose';
import { UserModel } from '../../models/user.model';
import { UserRole } from '../../shared/constants/roles';

export type PlainUser = {
  _id: string;
  email: string;
  role: string;
  status: string;
  clubId: string | null;
  onboardingStep: number;
  emailVerified: boolean;
  firstName: string;
  lastName: string;
  createdAt: Date;
  updatedAt: Date;
};

export class UserRepository {
  async findById(id: string): Promise<PlainUser | null> {
    return UserModel.findById(id).lean<PlainUser>().exec();
  }

  async findByEmail(email: string): Promise<PlainUser | null> {
    return UserModel.findOne({ email }).lean<PlainUser>().exec();
  }

  async findAll(filters: { role?: UserRole; clubId?: string } = {}): Promise<PlainUser[]> {
    const query: Record<string, unknown> = {};
    if (filters.role) query['role'] = filters.role;
    if (filters.clubId) query['clubId'] = new mongoose.Types.ObjectId(filters.clubId);
    return UserModel.find(query).sort({ createdAt: -1 }).lean<PlainUser[]>().exec();
  }

  async findByClub(clubId: string): Promise<PlainUser[]> {
    return UserModel.find({ clubId: new mongoose.Types.ObjectId(clubId) })
      .sort({ createdAt: -1 })
      .lean<PlainUser[]>()
      .exec();
  }

  async update(
    id: string,
    data: Partial<{ firstName: string; lastName: string }>,
  ): Promise<PlainUser | null> {
    return UserModel.findByIdAndUpdate(id, { $set: data }, { new: true })
      .lean<PlainUser>()
      .exec();
  }
}
