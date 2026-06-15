import mongoose from 'mongoose';
import { SwimmerModel } from '../../models/swimmer.model';

// ─── Plain domain types ───────────────────────────────────────────────────────

export type PlainSwimmer = {
  _id: string;
  parentId: string;
  firstName: string;
  lastName: string;
  birthDate: Date;
  usaMembershipId?: string;
  clubName?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type SwimmerListParams = {
  page?: number;
  limit?: number;
  search?: string;
  isActive?: boolean;
  sortBy?: 'firstName' | 'lastName' | 'birthDate' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
};

export type SwimmerListResult = {
  swimmers: PlainSwimmer[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

// ─── Repository ───────────────────────────────────────────────────────────────

/**
 * Data-access layer for swimmers.
 * Returns lean plain objects; no Mongoose document overhead exposed to services.
 */
export class SwimmerRepository {

  // ─── CRUD operations ────────────────────────────────────────────────────────

  async findById(id: string): Promise<PlainSwimmer | null> {
    return SwimmerModel.findById(id).lean<PlainSwimmer>().exec();
  }

  async findByParent(parentId: string, params: SwimmerListParams = {}): Promise<SwimmerListResult> {
    const {
      page = 1,
      limit = 10,
      search,
      isActive = true,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = params;

    // Build filter
    const filter: any = { parentId };
    if (isActive !== undefined) {
      filter.isActive = isActive;
    }
    if (search) {
      filter.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } }
      ];
    }

    // Build sort
    const sort: any = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Execute query with pagination
    const skip = (page - 1) * limit;
    const [swimmers, total] = await Promise.all([
      SwimmerModel.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean<PlainSwimmer[]>()
        .exec(),
      SwimmerModel.countDocuments(filter).exec()
    ]);

    return {
      swimmers,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  }

  async create(data: Omit<PlainSwimmer, '_id' | 'createdAt' | 'updatedAt'>): Promise<PlainSwimmer> {
    const doc = await new SwimmerModel(data).save();
    const plain = await SwimmerModel.findById(doc._id).lean<PlainSwimmer>().exec();
    if (!plain) throw new Error('Failed to retrieve created swimmer');
    return plain;
  }

  async update(
    id: string,
    data: Partial<Omit<PlainSwimmer, '_id' | 'parentId' | 'createdAt' | 'updatedAt'>>,
  ): Promise<PlainSwimmer | null> {
    return SwimmerModel.findByIdAndUpdate(id, { $set: data }, { new: true })
      .lean<PlainSwimmer>()
      .exec();
  }

  async deactivate(id: string): Promise<void> {
    await SwimmerModel.findByIdAndUpdate(id, { isActive: false }).exec();
  }

  // ─── Utility methods ─────────────────────────────────────────────────────

  async existsById(id: string): Promise<boolean> {
    const count = await SwimmerModel.countDocuments({ _id: id }).exec();
    return count > 0;
  }

  async findByParentAndBirthDate(parentId: string, birthDate: Date): Promise<PlainSwimmer | null> {
    return SwimmerModel.findOne({ parentId, birthDate })
      .lean<PlainSwimmer>()
      .exec();
  }
}
