import { WaitlistModel } from "../../models/waitlist.model";

// ─── Plain domain type ────────────────────────────────────────────────────────

export type PlainWaitlistEntry = {
  _id: string;
  tryoutId: string;
  parentId?: string;
  swimmerFirstName: string;
  swimmerLastName: string;
  ageOnTryoutDay: number;
  segmentId?: string;
  guardianName: string;
  guardianEmail: string;
  waitlistPosition: number;
  notifiedAt?: Date;
  joinedAt: Date;
  createdAt: Date;
  updatedAt: Date;
};

// ─── List params / result ─────────────────────────────────────────────────────

export interface WaitlistListParams {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: "waitlistPosition" | "swimmerFirstName" | "guardianEmail" | "joinedAt";
  sortOrder?: "asc" | "desc";
}

export interface WaitlistListResult {
  entries: PlainWaitlistEntry[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ─── Repository ───────────────────────────────────────────────────────────────

export class WaitlistRepository {
  async findByTryoutAndEmail(tryoutId: string, guardianEmail: string): Promise<PlainWaitlistEntry | null> {
    return WaitlistModel.findOne({ tryoutId, guardianEmail }).lean<PlainWaitlistEntry>().exec();
  }

  async getMaxPosition(tryoutId: string): Promise<number> {
    const result = await WaitlistModel.findOne({ tryoutId }).sort({ waitlistPosition: -1 }).lean<{ waitlistPosition: number }>().exec();
    return result?.waitlistPosition ?? 0;
  }

  async create(data: Omit<PlainWaitlistEntry, "_id" | "createdAt" | "updatedAt">): Promise<PlainWaitlistEntry> {
    const doc = await new WaitlistModel(data).save();
    return doc.toObject() as unknown as PlainWaitlistEntry;
  }

  async findByTryout(tryoutId: string): Promise<PlainWaitlistEntry[]> {
    return WaitlistModel.find({ tryoutId }).sort({ waitlistPosition: 1 }).lean<PlainWaitlistEntry[]>().exec();
  }

  async listByTryout(tryoutId: string, params: WaitlistListParams = {}): Promise<WaitlistListResult> {
    const { page = 1, limit = 10, search, sortBy = "waitlistPosition", sortOrder = "asc" } = params;
    const filter: Record<string, unknown> = { tryoutId };

    if (search) {
      const re = new RegExp(search, "i");
      filter["$or"] = [{ swimmerFirstName: re }, { swimmerLastName: re }, { guardianName: re }, { guardianEmail: re }];
    }

    const sortDir = sortOrder === "asc" ? 1 : -1;
    const skip = (page - 1) * limit;

    const [entries, total] = await Promise.all([
      WaitlistModel.find(filter)
        .sort({ [sortBy]: sortDir })
        .skip(skip)
        .limit(limit)
        .lean<PlainWaitlistEntry[]>()
        .exec(),
      WaitlistModel.countDocuments(filter).exec(),
    ]);

    return { entries, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findById(id: string): Promise<PlainWaitlistEntry | null> {
    return WaitlistModel.findById(id).lean<PlainWaitlistEntry>().exec();
  }

  async deleteById(id: string): Promise<boolean> {
    const result = await WaitlistModel.findByIdAndDelete(id).exec();
    return result !== null;
  }

  async markAllNotified(tryoutId: string, notifiedAt: Date): Promise<void> {
    await WaitlistModel.updateMany({ tryoutId }, { $set: { notifiedAt } }).exec();
  }
}
