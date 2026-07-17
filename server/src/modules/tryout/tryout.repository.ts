import mongoose from "mongoose";
import { TryoutModel } from "../../models/tryout.model";
import { RegistrationModel } from "../../models/registration.model";

export type PlainTryout = {
  _id: string;
  name: string;
  location: string;
  description: string;
  theme: string;
  bannerUrl: string;
  slotDuration: number;
  swimmersPerSlot: number;
  lanesAvailable: number;
  laneDetails: Array<{
    _id: string;
    name: string;
    order: number;
  }>;
  coachAssignments: Array<{
    _id: string;
    coachId: string;
    role: "Lead Coach" | "Assistant Coach" | "Evaluator";
    segmentIds: string[];
    laneIds: string[];
  }>;
  swimmersPerLane: number;
  ctaLabel: string;
  highlights: string;
  additionalInstructions: string;
  status: string;
  segments: Array<{
    id?: string;
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
  isTest: boolean;
  createdAt: Date;
  updatedAt: Date;
  startAt?: Date | null;
  endAt?: Date | null;
  // Computed aggregation fields (only present in list results)
  sessionCount?: number;
  startDate?: string | null;
  totalSlots?: number;
  registeredCount?: number;
};

export type TryoutSortField = "name" | "status" | "createdAt" | "updatedAt";
export type SortOrder = "asc" | "desc";

export interface TryoutListParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  sortBy?: TryoutSortField;
  sortOrder?: SortOrder;
  clubId?: string;
  minAge?: number;
  maxAge?: number;
  isTest?: boolean;
}

export interface TryoutListResult {
  tryouts: PlainTryout[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export class TryoutRepository {
  async findById(id: string, isTest?: boolean): Promise<PlainTryout | null> {
    try {
      const matchStage: any = {
        _id: new mongoose.Types.ObjectId(id),
      };
      if (isTest !== undefined) {
        matchStage.isTest = isTest ? true : { $ne: true };
      }

      const data = await TryoutModel.aggregate([
        {
          $addFields: {
            status: {
              $cond: [
                { $eq: ["$status", "draft"] },
                "draft",
                { $cond: [{ $gt: [new Date(), "$endAt"] }, "completed", { $cond: [{ $gt: ["$startAt", new Date()] }, "open", "closed"] }] },
              ],
            },
          },
        },
        {
          $match: matchStage,
        },
        {
          $lookup: {
            from: "registrations",
            let: { tid: "$_id" },
            pipeline: [
              {
                $match: {
                  $expr: { $eq: ["$tryoutId", "$$tid"] },
                  status: { $nin: ["cancelled"] },
                },
              },
              { $count: "count" },
            ],
            as: "_regCount",
          },
        },
        {
          $addFields: {
            registeredCount: { $ifNull: [{ $arrayElemAt: ["$_regCount.count", 0] }, 0] },
          },
        },
        {
          $project: { _regCount: 0 },
        },
      ]);

      return data[0] || null;
    } catch (error) {
      console.error("Error finding tryout by ID:", error);
      return null;
    }
  }

  async findByClub(clubId: string, params: TryoutListParams = {}): Promise<TryoutListResult> {
    const { page = 1, limit = 10, search, status = "all", dateFrom, dateTo, sortBy = "createdAt", sortOrder = "desc", isTest } = params;

    const matchStage: any = {
      clubId: new mongoose.Types.ObjectId(clubId),
    };

    if (isTest !== undefined) {
      matchStage.isTest = isTest ? true : { $ne: true };
    }

    // Search filter
    if (search) {
      const regex = new RegExp(search, "i");
      matchStage["$or"] = [{ name: { $regex: regex } }, { description: { $regex: regex } }, { location: { $regex: regex } }];
    }

    // Status filter
    if (status && status !== "all") {
      matchStage["status"] = status;
    }

    // Date range filter
    if (dateFrom || dateTo) {
      matchStage["createdAt"] = {};
      if (dateFrom) matchStage["createdAt"]["$gte"] = new Date(dateFrom);
      if (dateTo) {
        const end = new Date(dateTo);
        end.setHours(23, 59, 59, 999);
        matchStage["createdAt"]["$lte"] = end;
      }
    }

    const sortDir: 1 | -1 = sortOrder === "asc" ? 1 : -1;
    const skip = (page - 1) * limit;

    const pipeline: any[] = [
      {
        $addFields: {
          status: {
            $cond: [
              { $eq: ["$status", "draft"] },
              "draft",
              { $cond: [{ $gt: [new Date(), "$endAt"] }, "completed", { $cond: [{ $gt: ["$startAt", new Date()] }, "open", "closed"] }] },
            ],
          },
        },
      },
      { $match: matchStage },
      { $sort: { [sortBy]: sortDir } },
      {
        $facet: {
          tryouts: [
            { $skip: skip },
            { $limit: limit },
            {
              $lookup: {
                from: "tryout_sessions",
                localField: "_id",
                foreignField: "tryoutId",
                as: "_sessions",
              },
            },
            {
              $lookup: {
                from: "tryout_slots",
                localField: "_id",
                foreignField: "tryoutId",
                as: "_slots",
              },
            },
            {
              $lookup: {
                from: "clubs",
                localField: "clubId",
                foreignField: "_id",
                as: "_club",
              },
            },
            {
              $project: {
                _id: 1,
                name: 1,
                location: 1,
                description: 1,
                theme: 1,
                bannerUrl: 1,
                slotDuration: 1,
                swimmersPerSlot: 1,
                lanesAvailable: 1,
                laneDetails: 1,
                swimmersPerLane: 1,
                ctaLabel: 1,
                highlights: 1,
                additionalInstructions: 1,
                status: 1,
                segments: 1,
                steps: 1,
                faqs: 1,
                clubId: 1,
                clubName: { $arrayElemAt: ["$_club.name", 0] },
                createdBy: 1,
                isTest: 1,
                createdAt: 1,
                updatedAt: 1,
                startAt: 1,
                endAt: 1,
                sessionCount: { $size: "$_sessions" },
                startDate: { $min: "$_sessions.date" },
                totalSlots: { $size: "$_slots" },
                totalCapacity: { $sum: "$_slots.capacity" },
                registeredCount: { $sum: "$_slots.registeredCount" },
              },
            },
          ],
          totalCount: [{ $count: "count" }],
        },
      },
    ];

    const [result] = await TryoutModel.aggregate(pipeline).exec();

    const tryouts = result.tryouts || [];
    const total = result.totalCount.length > 0 ? result.totalCount[0].count : 0;

    return {
      tryouts,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async create(data: Omit<PlainTryout, "_id" | "createdAt" | "updatedAt">): Promise<PlainTryout> {
    const created = await TryoutModel.create(data);
    return created.toObject<PlainTryout>();
  }

  async update(id: string, data: Partial<Omit<PlainTryout, "_id" | "createdAt" | "updatedAt">>): Promise<PlainTryout | null> {
    return TryoutModel.findByIdAndUpdate(id, { $set: data }, { new: true }).lean<PlainTryout>().exec();
  }

  async delete(id: string): Promise<PlainTryout | null> {
    return TryoutModel.findByIdAndDelete(id).lean<PlainTryout>().exec();
  }

  async list(params: TryoutListParams = {}): Promise<TryoutListResult> {
    const {
      page = 1,
      limit = 10,
      search,
      status,
      dateFrom,
      dateTo,
      sortBy = "createdAt",
      sortOrder = "desc",
      clubId,
      minAge,
      maxAge,
      isTest,
    } = params;

    const matchStage: any = {};

    if (isTest !== undefined) {
      matchStage.isTest = isTest ? true : { $ne: true };
    }

    // Search filter
    if (search) {
      const regex = new RegExp(search, "i");
      matchStage["$or"] = [{ name: { $regex: regex } }, { description: { $regex: regex } }, { location: { $regex: regex } }];
    }

    // Status filter
    if (status && status !== "all") {
      matchStage["status"] = status;
    }

    // Club filter
    if (clubId && mongoose.Types.ObjectId.isValid(clubId)) {
      matchStage["clubId"] = new mongoose.Types.ObjectId(clubId);
    }

    // Age group filter — match tryouts that have at least one segment overlapping the requested range
    if (minAge !== undefined || maxAge !== undefined) {
      const ageFilter: any = {};
      if (minAge !== undefined) ageFilter["segments.maxAge"] = { $gte: minAge };
      if (maxAge !== undefined) ageFilter["segments.minAge"] = { $lte: maxAge };
      Object.assign(matchStage, ageFilter);
    }

    // Date range filter
    if (dateFrom || dateTo) {
      matchStage["createdAt"] = {};
      if (dateFrom) matchStage["createdAt"]["$gte"] = new Date(dateFrom);
      if (dateTo) {
        const end = new Date(dateTo);
        end.setHours(23, 59, 59, 999);
        matchStage["createdAt"]["$lte"] = end;
      }
    }

    const sortDir: 1 | -1 = sortOrder === "asc" ? 1 : -1;
    const skip = (page - 1) * limit;

    const pipeline: any[] = [
      {
        $addFields: {
          status: {
            $cond: [
              { $eq: ["$status", "draft"] },
              "draft",
              { $cond: [{ $gt: [new Date(), "$endAt"] }, "completed", { $cond: [{ $gt: ["$startAt", new Date()] }, "open", "closed"] }] },
            ],
          },
        },
      },
      { $match: matchStage },
      { $sort: { [sortBy]: sortDir } },
      {
        $facet: {
          tryouts: [
            { $skip: skip },
            { $limit: limit },
            {
              $lookup: {
                from: "tryout_sessions",
                localField: "_id",
                foreignField: "tryoutId",
                as: "_sessions",
              },
            },
            {
              $lookup: {
                from: "tryout_slots",
                localField: "_id",
                foreignField: "tryoutId",
                as: "_slots",
              },
            },
            {
              $lookup: {
                from: "clubs",
                localField: "clubId",
                foreignField: "_id",
                as: "_club",
              },
            },
            {
              $project: {
                _id: 1,
                name: 1,
                location: 1,
                description: 1,
                theme: 1,
                bannerUrl: 1,
                slotDuration: 1,
                swimmersPerSlot: 1,
                lanesAvailable: 1,
                laneDetails: 1,
                swimmersPerLane: 1,
                ctaLabel: 1,
                highlights: 1,
                additionalInstructions: 1,
                status: 1,
                segments: 1,
                steps: 1,
                faqs: 1,
                clubId: 1,
                clubName: { $arrayElemAt: ["$_club.name", 0] },
                createdBy: 1,
                isTest: 1,
                createdAt: 1,
                updatedAt: 1,
                startAt: 1,
                endAt: 1,
                sessionCount: { $size: "$_sessions" },
                startDate: { $min: "$_sessions.date" },
                totalSlots: { $size: "$_slots" },
                totalCapacity: { $sum: "$_slots.capacity" },
                registeredCount: { $sum: "$_slots.registeredCount" },
              },
            },
          ],
          totalCount: [{ $count: "count" }],
        },
      },
    ];

    const [result] = await TryoutModel.aggregate(pipeline).exec();

    const tryouts = result.tryouts || [];
    const total = result.totalCount.length > 0 ? result.totalCount[0].count : 0;

    return {
      tryouts,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findByStatus(status: string, params: TryoutListParams = {}): Promise<any> {
    return this.list({ ...params, status });
  }

  async updateRegistrationCounts(tryoutId: string): Promise<void> {
    // This would typically update registration counts on the tryout
    // For now, this is a placeholder that would be implemented with actual registration counting
    // This method is called when registrations are created/updated
  }

  async getRegistrationStats(tryoutId: string): Promise<{
    registeredCount: number;
    waitlistCount: number;
    totalCount: number;
  }> {
    // This would typically get actual registration stats from the database
    // For now, return placeholder values
    return {
      registeredCount: 0,
      waitlistCount: 0,
      totalCount: 0,
    };
  }

  async findDistinctClubs(isTest?: boolean): Promise<{ id: string; name: string }[]> {
    const matchStage: any = { status: "open" };
    if (isTest !== undefined) {
      matchStage.isTest = isTest ? true : { $ne: true };
    }
    const pipeline: any[] = [
      {
        $addFields: {
          status: {
            $cond: [
              { $eq: ["$status", "draft"] },
              "draft",
              { $cond: [{ $gt: [new Date(), "$endAt"] }, "completed", { $cond: [{ $gt: ["$startAt", new Date()] }, "open", "closed"] }] },
            ],
          },
        },
      },
      { $match: matchStage },
      {
        $lookup: {
          from: "clubs",
          localField: "clubId",
          foreignField: "_id",
          as: "_club",
        },
      },
      { $unwind: "$_club" },
      { $group: { _id: "$_club._id", name: { $first: "$_club.name" } } },
      { $sort: { name: 1 } },
    ];
    const result = await TryoutModel.aggregate(pipeline).exec();
    return result.map((r) => ({ id: String(r._id), name: r.name as string }));
  }

  async getPlatformStats(isTest?: boolean): Promise<{
    openTryouts: number;
    availableSlots: number;
    registeredFamilies: number;
    participatingClubs: number;
  }> {
    const statsMatch: any = { status: "open" };
    if (isTest !== undefined) {
      statsMatch.isTest = isTest ? true : { $ne: true };
    }
    const [statsResult, familiesResult] = await Promise.all([
      TryoutModel.aggregate([
        {
          $addFields: {
            status: {
              $cond: [
                { $eq: ["$status", "draft"] },
                "draft",
                {
                  $cond: [{ $gt: [new Date(), "$endAt"] }, "completed", { $cond: [{ $gt: ["$startAt", new Date()] }, "open", "closed"] }],
                },
              ],
            },
          },
        },
        { $match: statsMatch },
        {
          $lookup: {
            from: "tryout_slots",
            localField: "_id",
            foreignField: "tryoutId",
            as: "_slots",
          },
        },
        {
          $group: {
            _id: null,
            openTryouts: { $sum: 1 },
            totalCapacity: { $sum: { $sum: "$_slots.capacity" } },
            totalRegistered: { $sum: { $sum: "$_slots.registeredCount" } },
            clubIds: { $addToSet: "$clubId" },
          },
        },
      ]).exec(),
      RegistrationModel.distinct("parentId", { status: { $nin: ["cancelled"] } }).exec(),
    ]);

    const stats = statsResult[0];
    const totalCapacity = stats?.totalCapacity ?? 0;
    const totalRegistered = stats?.totalRegistered ?? 0;

    return {
      openTryouts: stats?.openTryouts ?? 0,
      availableSlots: Math.max(0, totalCapacity - totalRegistered),
      registeredFamilies: familiesResult.length,
      participatingClubs: stats?.clubIds?.length ?? 0,
    };
  }
}
