import mongoose from 'mongoose';
import { TryoutModel } from '../../models/tryout.model';

export type PlainTryout = {
  _id: string;
  name: string;
  location: string;
  description: string;
  theme: string;
  bannerUrl: string;
  slotDuration: number;
  swimmersPerSlot: number;
  ctaLabel: string;
  highlights: string;
  additionalInstructions: string;
  status: string;
  sessions: Array<{
    date: string;
    startTime: string;
    endTime: string;
    label: string;
  }>;
  segments: Array<{
    name: string;
    minAge: number;
    maxAge: number;
    level: string;
  }>;
  steps: Array<{
    title: string;
    description: string;
  }>;
  faqs: Array<{
    question: string;
    answer: string;
  }>;
  clubId: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
};

export type TryoutSortField = 'name' | 'status' | 'createdAt' | 'updatedAt';
export type SortOrder = 'asc' | 'desc';

export interface TryoutListParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  sortBy?: TryoutSortField;
  sortOrder?: SortOrder;
}

export interface TryoutListResult {
  tryouts: PlainTryout[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export class TryoutRepository {
  async findById(id: string): Promise<PlainTryout | null> {
    return TryoutModel.findById(id).lean<PlainTryout>().exec();
  }

  async findByClub(clubId: string, params: TryoutListParams = {}): Promise<TryoutListResult> {
    const {
      page = 1,
      limit = 10,
      search,
      status,
      dateFrom,
      dateTo,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = params;

    const filter: mongoose.FilterQuery<typeof TryoutModel> = {
      clubId: new mongoose.Types.ObjectId(clubId),
    };

    if (search) {
      const regex = new RegExp(search, 'i');
      filter['$or'] = [{ name: regex }, { description: regex }, { location: regex }];
    }

    if (status && status !== 'all') {
      filter['status'] = status;
    }

    if (dateFrom || dateTo) {
      filter['createdAt'] = {};
      if (dateFrom) filter['createdAt']['$gte'] = new Date(dateFrom);
      if (dateTo) {
        const end = new Date(dateTo);
        end.setHours(23, 59, 59, 999);
        filter['createdAt']['$lte'] = end;
      }
    }

    const sortDir = sortOrder === 'asc' ? 1 : -1;
    const sort: Record<string, 1 | -1> = { [sortBy]: sortDir };

    const skip = (page - 1) * limit;

    const [tryouts, total] = await Promise.all([
      TryoutModel.find(filter).sort(sort).skip(skip).limit(limit).lean<PlainTryout[]>().exec(),
      TryoutModel.countDocuments(filter).exec(),
    ]);

    return {
      tryouts,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async create(data: Omit<PlainTryout, '_id' | 'createdAt' | 'updatedAt'>): Promise<PlainTryout> {
    const created = await TryoutModel.create(data);
    return created.toObject<PlainTryout>();
  }

  async update(
    id: string,
    data: Partial<Omit<PlainTryout, '_id' | 'createdAt' | 'updatedAt'>>,
  ): Promise<PlainTryout | null> {
    return TryoutModel.findByIdAndUpdate(id, { $set: data }, { new: true })
      .lean<PlainTryout>()
      .exec();
  }

  async delete(id: string): Promise<PlainTryout | null> {
    return TryoutModel.findByIdAndDelete(id).lean<PlainTryout>().exec();
  }
}
