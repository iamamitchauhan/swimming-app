import mongoose from 'mongoose';
import { UserModel } from '../../models/user.model';
import { UserRole } from '../../shared/constants/roles';

export type PlainClub = {
  _id: string;
  name: string;
  address: string;
  phone: string;
  logoUrl: string | null;
  status: string;
};

export type PlainUser = {
  _id: string;
  email: string;
  role: string;
  status: string;
  clubId: string | PlainClub | null;
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
    const match: Record<string, unknown> = { status: { $ne: 'suspended' } };
    if (filters.role) match['role'] = filters.role;
    if (filters.clubId) match['clubId'] = new mongoose.Types.ObjectId(filters.clubId);
    if (filters.search) {
      const re = new RegExp(filters.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      match['$or'] = [{ email: re }, { firstName: re }, { lastName: re }];
    }
    const { page, limit } = pagination;
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      UserModel.aggregate([
        { $match: match },
        {
          $lookup: {
            from: 'clubs',
            localField: 'clubId',
            foreignField: '_id',
            as: 'club',
            pipeline: [
              {
                $project: {
                  _id: 1,
                  name: 1,
                  address: 1,
                  phone: 1,
                  logoUrl: 1,
                  status: 1,
                },
              },
            ],
          },
        },
        { $unwind: { path: '$club', preserveNullAndEmptyArrays: true } },
        {
          $addFields: {
            clubId: { $ifNull: ['$club._id', '$clubId'] },
          },
        },
        { $sort: { createdAt: -1 } },
        { $skip: skip },
        { $limit: limit },
        {
          $project: {
            _id: { $toString: '$_id' },
            email: 1,
            role: 1,
            status: 1,
            clubId: { $toString: '$clubId' },
            club: 1,
            onboardingStep: 1,
            emailVerified: 1,
            firstName: 1,
            lastName: 1,
            createdAt: 1,
            updatedAt: 1,
          },
        },
      ]).exec(),
      UserModel.countDocuments(match).exec(),
    ]);

    return { users: users as PlainUser[], total, page, limit, totalPages: Math.ceil(total / limit) };
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
