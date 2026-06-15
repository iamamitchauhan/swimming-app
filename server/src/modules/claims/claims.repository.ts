import mongoose from 'mongoose';
import { ClaimModel, ClaimStatus } from './claims.schema';
import { generateClaimNumber as atomicGenerateClaimNumber } from './claims.counter';
import { PaginatedResponse, PaginationQuery } from '../../shared/types/index';

// ─── Domain types ─────────────────────────────────────────────────────────────

export type ClaimFilters = {
  state?: string;
  status?: string;
  assignedTo?: string;
  search?: string;
};

export type CreateClaimData = {
  state: string;
  firmId: string;
  claimNumber: string;
  claimant: {
    name: string;
    dateOfBirth?: Date;
    phone?: string;
    email?: string;
  };
  dateOfAccident: Date;
  insurer: {
    name: string;
    policyNumber?: string;
    claimNumber?: string;
  };
  assignedTo?: string;
};

export type UpdateClaimData = {
  claimant?: {
    name: string;
    dateOfBirth?: Date;
    phone?: string;
    email?: string;
  };
  insurer?: {
    name: string;
    policyNumber?: string;
    claimNumber?: string;
  };
  assignedTo?: string | null;
  dateOfAccident?: Date;
};

export type TimelineEvent = {
  event: string;
  description: string;
  performedBy: string;
};

export type Claim = {
  _id: mongoose.Types.ObjectId | string;
  claimNumber: string;
  state: string;
  firmId: mongoose.Types.ObjectId | string;
  assignedTo: mongoose.Types.ObjectId | string | null;
  status: ClaimStatus;
  claimant: {
    name: string;
    dateOfBirth?: Date;
    phone?: string;
    email?: string;
  };
  dateOfAccident: Date;
  insurer: {
    name: string;
    policyNumber?: string;
    claimNumber?: string;
  };
  documents: Array<{ name: string; url: string; type: string; uploadedAt: Date }>;
  deadlines: Array<{
    type: string;
    dueDate: Date;
    isCompleted: boolean;
    completedAt?: Date;
  }>;
  validationResult: {
    isValid: boolean;
    checkedAt: Date;
    issues: Array<{ ruleId: string; message: string; severity: string }>;
  } | null;
  arbitration: {
    provider: string;
    filingDate?: Date;
    caseNumber?: string;
    status?: string;
    hearingDate?: Date;
  } | null;
  timeline: Array<{
    event: string;
    description: string;
    performedBy: mongoose.Types.ObjectId | string;
    performedAt: Date;
  }>;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
};

// ─── Repository ───────────────────────────────────────────────────────────────

/**
 * Data-access layer for claims.
 * All queries enforce tenant isolation via firmId.
 * Returns plain objects via .lean(); hides all ORM details from services.
 */
export class ClaimsRepository {
  /**
   * Generates a unique claim number atomically using a per-state-per-year counter.
   *
   * @param state - Two-letter state code (e.g. 'NY')
   * @returns Unique claim number string
   */
  async generateClaimNumber(state: string): Promise<string> {
    return atomicGenerateClaimNumber(state);
  }

  /**
   * Returns a paginated list of claims for a given firm, with optional filters.
   * Uses _id cursor-based pagination for consistent results on large datasets.
   *
   * @param firmId - The owning firm's id (tenant isolation)
   * @param filters - Optional field filters and search term
   * @param pagination - Cursor and limit for paging
   * @returns Paginated result with items, nextCursor, and hasMore flag
   */
  async findAll(
    firmId: string,
    filters: ClaimFilters,
    pagination: PaginationQuery,
  ): Promise<PaginatedResponse<Claim>> {
    if (!mongoose.Types.ObjectId.isValid(firmId)) {
      return { items: [], nextCursor: null, hasMore: false };
    }

    const limit = pagination.limit ?? 20;

    const query: Record<string, unknown> = {
      firmId: new mongoose.Types.ObjectId(firmId),
      isDeleted: false,
    };

    if (filters.state) query['state'] = filters.state;
    if (filters.status) query['status'] = filters.status;
    if (filters.assignedTo && mongoose.Types.ObjectId.isValid(filters.assignedTo)) {
      query['assignedTo'] = new mongoose.Types.ObjectId(filters.assignedTo);
    }

    if (filters.search) {
      const escapedSearch = filters.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escapedSearch, 'i');
      query['$or'] = [{ claimNumber: regex }, { 'claimant.name': regex }];
    }

    if (pagination.cursor && mongoose.Types.ObjectId.isValid(pagination.cursor)) {
      query['_id'] = { $gt: new mongoose.Types.ObjectId(pagination.cursor) };
    }

    const docs = await ClaimModel.find(query)
      .sort({ _id: 1 })
      .limit(limit + 1)
      .lean<Claim[]>()
      .exec();

    const hasMore = docs.length > limit;
    const items = hasMore ? docs.slice(0, limit) : docs;
    const lastItem = items[items.length - 1];
    const nextCursor =
      hasMore && lastItem ? lastItem._id.toString() : null;

    return { items, nextCursor, hasMore };
  }

  /**
   * Finds a single non-deleted claim by id, scoped to the owning firm.
   *
   * @param id - The claim's MongoDB ObjectId string
   * @param firmId - The owning firm's id (tenant isolation)
   * @returns Plain claim object or null if not found / not owned by firm
   */
  async findById(id: string, firmId: string): Promise<Claim | null> {
    if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(firmId)) {
      return null;
    }

    const doc = await ClaimModel.findOne({
      _id: new mongoose.Types.ObjectId(id),
      firmId: new mongoose.Types.ObjectId(firmId),
      isDeleted: false,
    })
      .lean<Claim>()
      .exec();

    return doc ?? null;
  }

  /**
   * Inserts a new claim document into the database.
   *
   * @param data - Fields required to create the claim
   * @returns The created claim as a plain object
   * @throws {Error} When the re-fetch finds no document (should never occur in practice)
   */
  async create(data: CreateClaimData): Promise<Claim> {
    if (!mongoose.Types.ObjectId.isValid(data.firmId)) {
      throw new Error('Invalid firmId');
    }

    const doc = await new ClaimModel({
      ...data,
      firmId: new mongoose.Types.ObjectId(data.firmId),
      ...(data.assignedTo && { assignedTo: new mongoose.Types.ObjectId(data.assignedTo) }),
    }).save();

    const plain = await ClaimModel.findById(doc._id).lean<Claim>().exec();
    if (!plain) throw new Error('Failed to retrieve created claim');
    return plain;
  }

  /**
   * Partially updates a claim, scoped to the owning firm.
   *
   * @param id - The claim's MongoDB ObjectId string
   * @param firmId - The owning firm's id (tenant isolation)
   * @param data - Fields to update
   * @returns Updated plain claim object or null if not found
   */
  async update(id: string, firmId: string, data: UpdateClaimData): Promise<Claim | null> {
    if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(firmId)) {
      return null;
    }

    const updateFields: Record<string, unknown> = {};

    if (data.claimant !== undefined) updateFields['claimant'] = data.claimant;
    if (data.insurer !== undefined) updateFields['insurer'] = data.insurer;
    if (data.dateOfAccident !== undefined) updateFields['dateOfAccident'] = data.dateOfAccident;
    if (data.assignedTo !== undefined) {
      updateFields['assignedTo'] =
        data.assignedTo ? new mongoose.Types.ObjectId(data.assignedTo) : null;
    }

    const doc = await ClaimModel.findOneAndUpdate(
      {
        _id: new mongoose.Types.ObjectId(id),
        firmId: new mongoose.Types.ObjectId(firmId),
        isDeleted: false,
      },
      { $set: updateFields },
      { new: true },
    )
      .lean<Claim>()
      .exec();

    return doc ?? null;
  }

  /**
   * Soft-deletes a claim by setting isDeleted to true.
   *
   * @param id - The claim's MongoDB ObjectId string
   * @param firmId - The owning firm's id (tenant isolation)
   * @returns True if the document was found and updated; false otherwise
   */
  async softDelete(id: string, firmId: string): Promise<boolean> {
    if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(firmId)) {
      return false;
    }

    const result = await ClaimModel.updateOne(
      {
        _id: new mongoose.Types.ObjectId(id),
        firmId: new mongoose.Types.ObjectId(firmId),
        isDeleted: false,
      },
      { $set: { isDeleted: true } },
    ).exec();

    return result.modifiedCount > 0;
  }

  /**
   * Appends a single entry to the claim's timeline array.
   * Scoped to the owning firm to ensure tenant isolation.
   *
   * @param id - The claim's MongoDB ObjectId string
   * @param firmId - The owning firm's id (tenant isolation)
   * @param event - Timeline event data to push
   */
  async addTimelineEvent(id: string, firmId: string, event: TimelineEvent): Promise<void> {
    if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(firmId)) {
      return;
    }

    await ClaimModel.updateOne(
      { _id: new mongoose.Types.ObjectId(id), firmId: new mongoose.Types.ObjectId(firmId), isDeleted: false },
      {
        $push: {
          timeline: {
            ...event,
            performedBy: new mongoose.Types.ObjectId(event.performedBy),
            performedAt: new Date(),
          },
        },
      },
    ).exec();
  }

  /**
   * Updates the status field of a claim, scoped to the owning firm.
   *
   * @param id - The claim's MongoDB ObjectId string
   * @param firmId - The owning firm's id (tenant isolation)
   * @param status - The new ClaimStatus value
   * @returns Updated plain claim object or null if not found
   */
  async updateStatus(id: string, firmId: string, status: ClaimStatus): Promise<Claim | null> {
    if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(firmId)) {
      return null;
    }

    const doc = await ClaimModel.findOneAndUpdate(
      {
        _id: new mongoose.Types.ObjectId(id),
        firmId: new mongoose.Types.ObjectId(firmId),
        isDeleted: false,
      },
      { $set: { status } },
      { new: true },
    )
      .lean<Claim>()
      .exec();

    return doc ?? null;
  }
}
