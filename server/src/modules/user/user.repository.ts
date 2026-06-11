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

  async findAll(
    filters: { role?: UserRole; clubId?: string; search?: string } = {},
    pagination: { page: number; limit: number } = { page: 1, limit: 20 },
  ): Promise<{ users: PlainUser[]; total: number; page: number; limit: number; totalPages: number }> {
    const query: Record<string, unknown> = { status: { $ne: 'suspended' } };
    if (filters.role) query['role'] = filters.role;
    if (filters.clubId) query['clubId'] = new mongoose.Types.ObjectId(filters.clubId);
    if (filters.search) {
      const re = new RegExp(filters.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      query['$or'] = [{ email: re }, { firstName: re }, { lastName: re }];
    }
    const { page, limit } = pagination;
    const skip = (page - 1) * limit;
    const [users, total] = await Promise.all([
      UserModel.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean<PlainUser[]>().exec(),
      UserModel.countDocuments(query).exec(),
    ]);
    return { users, total, page, limit, totalPages: Math.ceil(total / limit) };
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

  async changeRole(userId: string, role: UserRole): Promise<PlainUser | null> {
    return UserModel.findByIdAndUpdate(userId, { $set: { role } }, { new: true })
      .lean<PlainUser>()
      .exec();
  }

  async removeFromClub(userId: string): Promise<PlainUser | null> {
    return UserModel.findByIdAndUpdate(
      userId,
      { $set: { clubId: null, status: 'suspended' } },
      { new: true },
    )
      .lean<PlainUser>()
      .exec();
  }
}
