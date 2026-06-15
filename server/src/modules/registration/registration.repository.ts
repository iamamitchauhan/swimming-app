import mongoose from 'mongoose';
import { RegistrationModel } from '../../models/registration.model';

// ─── Plain domain types ───────────────────────────────────────────────────────

export type SwimmerDetails = {
  firstName: string;
  lastName: string;
  dob: string;
  ageOnTryoutDay: number;
  hasUsaMembership: boolean;
  usaMembershipId?: string;
  clubName?: string;
  swimTime50Free?: string;
  swimTime100Free?: string;
  strokes: string[];
  starts: string[];
  turns: string[];
  guardianName: string;
  guardianEmail: string;
};

export type PlainRegistration = {
  _id: string;
  tryoutId: string;
  swimmerId: string;
  parentId: string;
  sessionId: string;
  slotId: string;
  segmentId: string;
  swimmerDetails: SwimmerDetails;
  status: 'registered' | 'waitlisted' | 'offered' | 'rejected' | 'cancelled';
  waitlistPosition?: number;
  registeredAt: Date;
  emailSent: boolean;
  lastCommunicationAt?: Date;
  createdAt: Date;
  updatedAt: Date;
};

export type RegistrationListParams = {
  page?: number;
  limit?: number;
  status?: string;
  tryoutId?: string;
  sortBy?: 'registeredAt' | 'status' | 'waitlistPosition';
  sortOrder?: 'asc' | 'desc';
};

export type RegistrationListResult = {
  registrations: PlainRegistration[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

// ─── Repository ───────────────────────────────────────────────────────────────

/**
 * Data-access layer for registrations.
 * Returns lean plain objects; no Mongoose document overhead exposed to services.
 */
export class RegistrationRepository {

  // ─── CRUD operations ────────────────────────────────────────────────────────

  async findById(id: string): Promise<PlainRegistration | null> {
    return RegistrationModel.findById(id)
      .populate('tryoutId', 'name status')
      .populate('swimmerId', 'firstName lastName birthDate')
      .lean<PlainRegistration>()
      .exec();
  }

  async findByParent(parentId: string, params: RegistrationListParams = {}): Promise<RegistrationListResult> {
    const {
      page = 1,
      limit = 10,
      status,
      tryoutId,
      sortBy = 'registeredAt',
      sortOrder = 'desc'
    } = params;

    // Build filter
    const filter: any = { parentId };
    if (status) filter.status = status;
    if (tryoutId) filter.tryoutId = tryoutId;

    // Build sort
    const sort: any = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Execute query with pagination
    const skip = (page - 1) * limit;
    const [registrations, total] = await Promise.all([
      RegistrationModel.find(filter)
        .populate('tryoutId', 'name status location')
        .populate('swimmerId', 'firstName lastName birthDate')
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean<PlainRegistration[]>()
        .exec(),
      RegistrationModel.countDocuments(filter).exec()
    ]);

    return {
      registrations,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  }

  async create(data: Omit<PlainRegistration, '_id' | 'createdAt' | 'updatedAt'>): Promise<PlainRegistration> {
    const doc = await new RegistrationModel(data).save();
    const plain = await RegistrationModel.findById(doc._id)
      .populate('tryoutId', 'name status')
      .populate('swimmerId', 'firstName lastName birthDate')
      .lean<PlainRegistration>()
      .exec();
    if (!plain) throw new Error('Failed to retrieve created registration');
    return plain;
  }

  async update(
    id: string,
    data: Partial<Omit<PlainRegistration, '_id' | 'tryoutId' | 'swimmerId' | 'parentId' | 'sessionId' | 'segmentId' | 'createdAt' | 'updatedAt'>>,
  ): Promise<PlainRegistration | null> {
    return RegistrationModel.findByIdAndUpdate(id, { $set: data }, { new: true })
      .populate('tryoutId', 'name status')
      .populate('swimmerId', 'firstName lastName birthDate')
      .lean<PlainRegistration>()
      .exec();
  }

  // ─── Business logic queries ─────────────────────────────────────────────────

  async findByTryoutAndSwimmer(tryoutId: string, swimmerId: string): Promise<PlainRegistration | null> {
    return RegistrationModel.findOne({ 
      tryoutId, 
      swimmerId, 
      status: { $nin: ['cancelled'] }
    })
    .lean<PlainRegistration>()
    .exec();
  }

  async countBySessionAndStatus(tryoutId: string, sessionId: string, status: string): Promise<number> {
    return RegistrationModel.countDocuments({
      tryoutId,
      sessionId,
      status
    }).exec();
  }

  async getMaxWaitlistPosition(tryoutId: string): Promise<number> {
    const result = await RegistrationModel.findOne({ 
      tryoutId, 
      status: 'waitlisted' 
    })
    .sort({ waitlistPosition: -1 })
    .lean<{ waitlistPosition: number }>()
    .exec();
    
    return result?.waitlistPosition || 0;
  }

  async getRegistrationStats(tryoutId: string): Promise<{
    registeredCount: number;
    waitlistCount: number;
    totalCount: number;
  }> {
    const [registeredCount, waitlistCount] = await Promise.all([
      RegistrationModel.countDocuments({ tryoutId, status: 'registered' }),
      RegistrationModel.countDocuments({ tryoutId, status: 'waitlisted' })
    ]);

    return {
      registeredCount,
      waitlistCount,
      totalCount: registeredCount + waitlistCount
    };
  }

  async findByTryout(tryoutId: string, params: RegistrationListParams = {}): Promise<RegistrationListResult> {
    const {
      page = 1,
      limit = 10,
      status,
      sortBy = 'registeredAt',
      sortOrder = 'desc'
    } = params;

    // Build filter
    const filter: any = { tryoutId };
    if (status) filter.status = status;

    // Build sort
    const sort: any = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Execute query with pagination
    const skip = (page - 1) * limit;
    const [registrations, total] = await Promise.all([
      RegistrationModel.find(filter)
        .populate('swimmerId', 'firstName lastName birthDate')
        .populate('parentId', 'firstName lastName email')
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean<PlainRegistration[]>()
        .exec(),
      RegistrationModel.countDocuments(filter).exec()
    ]);

    return {
      registrations,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  }
}
