import { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import { TryoutService } from "./tryout.service";
import { TryoutSlotRepository } from "./tryout-slot.repository";
import { TryoutSessionRepository } from "./tryout-session.repository";
import { RegistrationRepository } from "../registration/registration.repository";
import { HTTP_STATUS } from "../../shared/constants/httpStatus";
import { MESSAGES } from "../../shared/constants/messages";
import { sendSuccess } from "../../shared/utils/response";
import { NotFoundError, ForbiddenError, BadRequestError } from "../../shared/errors/domain.errors";
import multer from "multer";
import { RegistrationModel } from "../../models/registration.model";
import { SwimmerModel } from "../../models/swimmer.model";
import { UserModel } from "../../models/user.model";
import { TryoutRegistrationQuestionModel } from "../../models/tryout-registration-question.model";
import { EmailTemplateModel } from "../../models/email-template.model";
import { GroupModel } from "../../models/group.model";
import { ClubModel } from "../../models/club.model";
import { sendRegistrationOffer, sendRegistrationReject, sendBulkTemplateEmail, previewTemplateEmail } from "../../shared/utils/mailer";
import type { SentEmailResult } from "../../shared/utils/mailer";
import { EmailAuditLogModel } from "../../models/email-audit-log.model";
import { UserService } from "../user/user.service";
import { TryoutSlotModel } from "../../models/tryout-slot.model";
import logger from "../../shared/utils/logger";
import { isTestUser } from "../../shared/constants/testUsers";
import { config } from "../../config/env";

// ─── Email audit logging helper ──────────────────────────────────────────────

/**
 * Best-effort write of a single audit-log row for the default-fallback
 * offer/reject email path. Never throws — failures are logged only.
 */
async function writeSingleAuditLog(args: {
  clubId: string;
  tryoutId: string;
  registrationId: string;
  recipientEmail: string;
  swimmerName: string;
  parentName: string;
  action: "offered" | "rejected";
  templateType: "custom" | "default";
  senderId?: string;
  senderName?: string;
  result: SentEmailResult;
}): Promise<void> {
  try {
    await EmailAuditLogModel.create({
      clubId: args.clubId,
      tryoutId: args.tryoutId,
      registrationId: args.registrationId,
      recipientEmail: args.recipientEmail,
      swimmerName: args.swimmerName,
      parentName: args.parentName,
      action: args.action,
      mode: "single",
      templateType: args.templateType,
      subject: args.result.subject,
      body: args.result.body,
      html: args.result.html,
      status: "sent",
      messageId: args.result.messageId,
      senderId: args.senderId,
      senderName: args.senderName,
      sentAt: new Date(),
    });
  } catch (err) {
    logger.error({ err, recipient: args.recipientEmail, action: args.action }, "decision.audit_log.write_failed");
  }
}

// ─── Time helpers ─────────────────────────────────────────────────────────────

/** Parse a 12h or 24h time string into { hours24, minute } */
function parseTimeString(input: string): { hours24: number; minute: number } | null {
  if (!input) return null;
  const trimmed = input.trim();
  if (!trimmed) return null;

  const twelve = trimmed.match(/^(\d{1,2}):(\d{2})\s*([AaPp][Mm])$/);
  if (twelve) {
    let h = parseInt(twelve[1], 10);
    const m = parseInt(twelve[2], 10);
    const period = twelve[3].toUpperCase() as "AM" | "PM";
    if (h < 1 || h > 12 || m < 0 || m > 59) return null;
    if (period === "AM") h = h === 12 ? 0 : h;
    else h = h === 12 ? 12 : h + 12;
    return { hours24: h, minute: m };
  }

  const twentyFour = trimmed.match(/^(\d{1,2}):(\d{2})$/);
  if (twentyFour) {
    const h = parseInt(twentyFour[1], 10);
    const m = parseInt(twentyFour[2], 10);
    if (h < 0 || h > 23 || m < 0 || m > 59) return null;
    return { hours24: h, minute: m };
  }

  return null;
}

function timeToIsoString(time: string): string | null {
  const parsed = parseTimeString(time);
  if (!parsed) return null;
  const { hours24, minute } = parsed;
  return `${String(hours24).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

// ─── Slot helpers ─────────────────────────────────────────────────────────────

function calcSlots(startTime: string, endTime: string, slotDuration: number): number {
  if (!startTime || !endTime || !slotDuration) return 0;
  const start = parseTimeString(startTime);
  const end = parseTimeString(endTime);
  if (!start || !end) return 0;
  const durationMin = end.hours24 * 60 + end.minute - (start.hours24 * 60 + start.minute);
  if (durationMin <= 0) return 0;
  return Math.floor(durationMin / slotDuration);
}

const slotRepo = new TryoutSlotRepository();
const sessionRepo = new TryoutSessionRepository();

function createLaneDetails(lanesAvailable: number): Array<{ _id: string; name: string; order: number }> {
  return Array.from({ length: lanesAvailable }, (_, index) => ({
    _id: new mongoose.Types.ObjectId().toString(),
    name: `Lane ${index + 1}`,
    order: index + 1,
  }));
}

function computeTryoutBounds(rawSessions: Array<{ date: string; startTime: string; endTime: string }>): { startAt: Date | null; endAt: Date | null } {
  if (!rawSessions || rawSessions.length === 0) {
    return { startAt: null, endAt: null };
  }

  const sorted = [...rawSessions].sort((a, b) => {
    const ad = a.date.localeCompare(b.date);
    if (ad !== 0) return ad;
    return a.startTime.localeCompare(b.startTime);
  });

  const first = sorted[0];
  const last = sorted[sorted.length - 1];

  const startIso = timeToIsoString(first.startTime);
  const endIso = timeToIsoString(last.endTime);
  const startAt = startIso ? new Date(`${first.date}T${startIso}`) : null;
  const endAt = endIso ? new Date(`${last.date}T${endIso}`) : null;

  return { startAt, endAt };
}

async function syncSessionsAndSlots(
  tryoutId: string,
  rawSessions: Array<{ date: string; startTime: string; endTime: string; label: string }>,
  slotDuration: number,
  swimmersPerSlot: number,
): Promise<void> {
  await slotRepo.deleteByTryout(tryoutId);
  await sessionRepo.deleteByTryout(tryoutId);

  const sessionDocs = rawSessions.map((s) => ({
    tryoutId,
    date: s.date,
    startTime: s.startTime,
    endTime: s.endTime,
    label: s.label,
    slotDuration,
    swimmersPerSlot,
    totalSlots: calcSlots(s.startTime, s.endTime, slotDuration),
  }));

  if (sessionDocs.length === 0) return;
  const createdSessions = await sessionRepo.createMany(sessionDocs);

  const slots = createdSessions.flatMap((session) => {
    const parsed = parseTimeString(session.startTime);
    if (!parsed) return [];
    const sessionStartMin = parsed.hours24 * 60 + parsed.minute;

    return Array.from({ length: session.totalSlots }, (_, i) => {
      const slotStartMin = sessionStartMin + i * slotDuration;
      const slotEndMin = slotStartMin + slotDuration;
      const sh = Math.floor(slotStartMin / 60) % 24;
      const sm = slotStartMin % 60;
      const eh = Math.floor(slotEndMin / 60) % 24;
      const em = slotEndMin % 60;

      return {
        tryoutId,
        sessionId: session._id,
        sessionDate: session.date,
        startTime: `${String(sh).padStart(2, "0")}:${String(sm).padStart(2, "0")}`,
        endTime: `${String(eh).padStart(2, "0")}:${String(em).padStart(2, "0")}`,
        label: `${session.label} · Slot ${i + 1}`,
        slotIndex: i,
        capacity: swimmersPerSlot,
        registeredCount: 0,
      };
    });
  });

  if (slots.length > 0) await slotRepo.createMany(slots);
}

// ─── Multer config for banner upload ──────────────────────────────────────────

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
  fileFilter: (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"));
    }
  },
});

export class TryoutController {
  constructor(private readonly service: TryoutService) {}

  /**
   * Returns the segment IDs assigned to a coach, or null if the user is not a coach
   * or has no assignment for this tryout.
   * Admin/super_admin always get null (meaning: no filtering).
   */
  private getCoachSegmentIds(tryout: any, user: { id: string; role: string } | undefined): string[] | null {
    if (!user) return null;
    if (user.role === "admin" || user.role === "super_admin") return null;
    if (user.role !== "coach") return null;
    const assignment = (tryout.coachAssignments || []).find((a: any) => a.coachId === user.id);
    if (!assignment) return [];
    return assignment.segmentIds || [];
  }

  /**
   * Fetches a paginated page of registrations for a tryout, honouring the
   * requested sort field and order.
   *
   * For the standard sort fields (swimmer_name, swimmer_age, status) a simple
   * `find().sort().populate()` is used. For `session_time` — which requires
   * data from the `tryout_slots` collection (sessionDate + startTime) — a
   * MongoDB aggregation pipeline with `$lookup` is used so the sort is
   * performed server-side and pagination stays correct.
   */
  private async fetchRegistrationsPage(filter: Record<string, any>, sortBy: string, sortOrder: 1 | -1, page: number, limit: number): Promise<any[]> {
    if (sortBy === "session_time") {
      // Mongoose's find() auto-casts string IDs to ObjectIds based on the
      // schema, but aggregate() does NOT. We must manually cast every
      // ObjectId field in the filter before $match, otherwise the pipeline
      // returns zero documents.
      const aggFilter: Record<string, any> = { ...filter };
      if (aggFilter["tryoutId"] && typeof aggFilter["tryoutId"] === "string") {
        aggFilter["tryoutId"] = new mongoose.Types.ObjectId(aggFilter["tryoutId"]);
      }
      if (aggFilter["_id"]) {
        if (aggFilter["_id"] instanceof mongoose.Types.ObjectId) {
          // already cast — nothing to do
        } else if (typeof aggFilter["_id"] === "string") {
          aggFilter["_id"] = new mongoose.Types.ObjectId(aggFilter["_id"]);
        } else if (aggFilter["_id"]["$in"]) {
          aggFilter["_id"] = {
            $in: aggFilter["_id"]["$in"].map((v: any) => (v instanceof mongoose.Types.ObjectId ? v : new mongoose.Types.ObjectId(v))),
          };
        }
      }

      // Nulls always sort last regardless of direction.
      const nullDateVal = sortOrder === 1 ? "9999-99-99" : "0000-00-00";
      const nullTimeVal = sortOrder === 1 ? "99:99" : "00:00";

      return await RegistrationModel.aggregate([
        { $match: aggFilter },
        // Lookup the slot for its sessionDate + startTime
        {
          $lookup: {
            from: "tryout_slots",
            let: { slotId: "$slotId" },
            pipeline: [{ $match: { $expr: { $eq: ["$_id", "$$slotId"] } } }, { $project: { sessionDate: 1, startTime: 1, endTime: 1 } }],
            as: "_sortSlot",
          },
        },
        { $unwind: { path: "$_sortSlot", preserveNullAndEmptyArrays: true } },
        {
          $addFields: {
            _sortSessionDate: { $ifNull: ["$_sortSlot.sessionDate", nullDateVal] },
            _sortSlotStartTime: { $ifNull: ["$_sortSlot.startTime", nullTimeVal] },
          },
        },
        {
          $sort: {
            _sortSessionDate: sortOrder,
            _sortSlotStartTime: sortOrder,
            registeredAt: sortOrder,
          },
        },
        { $skip: (page - 1) * limit },
        { $limit: limit },
        // Populate swimmer (same shape as .populate("swimmerId", "firstName lastName birthDate"))
        {
          $lookup: {
            from: "swimmers",
            let: { swimmerId: "$swimmerId" },
            pipeline: [{ $match: { $expr: { $eq: ["$_id", "$$swimmerId"] } } }, { $project: { firstName: 1, lastName: 1, birthDate: 1 } }],
            as: "swimmerId",
          },
        },
        { $unwind: { path: "$swimmerId", preserveNullAndEmptyArrays: true } },
        // Populate parent (same shape as .populate("parentId", "firstName lastName email"))
        {
          $lookup: {
            from: "users",
            let: { parentId: "$parentId" },
            pipeline: [{ $match: { $expr: { $eq: ["$_id", "$$parentId"] } } }, { $project: { firstName: 1, lastName: 1, email: 1 } }],
            as: "parentId",
          },
        },
        { $unwind: { path: "$parentId", preserveNullAndEmptyArrays: true } },
        // Replace slotId with the slot document (same as .populate("slotId", "startTime endTime"))
        { $addFields: { slotId: { _id: "$_sortSlot._id", startTime: "$_sortSlot.startTime", endTime: "$_sortSlot.endTime" } } },
        // Remove temp sort fields
        { $project: { _sortSlot: 0, _sortSessionDate: 0, _sortSlotStartTime: 0 } },
      ]);
    }

    // Standard sort fields
    const sortFieldMap: Record<string, string> = {
      swimmer_name: "swimmerDetails.firstName",
      swimmer_age: "swimmerDetails.ageOnTryoutDay",
      status: "status",
    };
    const mongoSortField = sortFieldMap[sortBy] ?? "swimmerDetails.firstName";
    const mongoSort: Record<string, 1 | -1> = { [mongoSortField]: sortOrder };

    return await RegistrationModel.find(filter)
      .sort(mongoSort)
      .skip((page - 1) * limit)
      .limit(limit)
      .populate("swimmerId", "firstName lastName birthDate")
      .populate("parentId", "firstName lastName email")
      .populate("slotId", "startTime endTime")
      .lean()
      .exec();
  }

  /**
   * GET /tryouts
   * Lists tryouts for the authenticated user's club with pagination, filters, and sort.
   */
  list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      req.step?.("received", { params: req.params, query: req.query, body: req.body });
      const clubId = req.user?.clubId;
      if (!clubId) return next(new ForbiddenError("No club associated with user"));
      req.step?.("validated");

      const page = Math.max(1, parseInt(req.query["page"] as string) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(req.query["limit"] as string) || 10));
      const search = (req.query["search"] as string | undefined)?.trim() || undefined;
      const status = (req.query["status"] as string | undefined)?.trim() || undefined;
      const dateFrom = (req.query["dateFrom"] as string | undefined)?.trim() || undefined;
      const dateTo = (req.query["dateTo"] as string | undefined)?.trim() || undefined;
      const sortBy = (["name", "status", "createdAt", "updatedAt"].includes(req.query["sortBy"] as string) ? req.query["sortBy"] : "createdAt") as
        | "name"
        | "status"
        | "createdAt"
        | "updatedAt";
      const sortOrder = (req.query["sortOrder"] === "asc" ? "asc" : "desc") as "asc" | "desc";

      req.step?.("delegating to service");
      const result = await this.service.listByClub(clubId, {
        page,
        limit,
        search,
        status,
        dateFrom,
        dateTo,
        sortBy,
        sortOrder,
        isTest: isTestUser(req.user?.id),
      });

      req.step?.("responding", { status: HTTP_STATUS.OK });
      sendSuccess(res, result, MESSAGES.SUCCESS, HTTP_STATUS.OK);
    } catch (err) {
      next(err);
    }
  };

  /**
   * GET /tryouts/:id
   * Returns a single tryout by ID.
   */
  getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      req.step?.("received", { params: req.params, query: req.query, body: req.body });
      const { id } = req.params;
      const clubId = req.user?.clubId;
      if (!clubId) return next(new ForbiddenError("No club associated with user"));
      req.step?.("validated");

      req.step?.("delegating to service");
      const tryout = await this.service.getById(id, clubId, isTestUser(req.user?.id));
      const sessions = await sessionRepo.findByTryout(id);
      req.step?.("responding", { status: HTTP_STATUS.OK });
      sendSuccess(res, { tryout: { ...tryout, sessions } }, MESSAGES.SUCCESS, HTTP_STATUS.OK);
    } catch (err) {
      next(err);
    }
  };

  /**
   * POST /tryouts
   * Creates a new tryout. Supports multipart/form-data for banner upload.
   */
  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      req.step?.("received", { params: req.params, query: req.query, body: req.body });
      const clubId = req.user?.clubId;
      const userId = req.user?.id;
      if (!clubId || !userId) return next(new ForbiddenError("No club or user associated"));
      req.step?.("validated");

      // Parse JSON fields from form data
      const slotDuration = parseInt(req.body.slotDuration) || 30;
      const lanesAvailable = parseInt(req.body.lanesAvailable) || 6;
      const swimmersPerLane = parseInt(req.body.swimmersPerLane) || 4;
      const swimmersPerSlot = parseInt(req.body.swimmersPerSlot) || lanesAvailable * swimmersPerLane;
      const rawSessions: Array<{ date: string; startTime: string; endTime: string; label: string }> = req.body.sessions
        ? JSON.parse(req.body.sessions)
        : [];
      const segments = req.body.segments ? JSON.parse(req.body.segments) : [];
      const steps = req.body.steps ? JSON.parse(req.body.steps) : [];
      const faqs = req.body.faqs ? JSON.parse(req.body.faqs) : [];

      // TODO: Upload banner file to S3/cloud storage and get URL
      let bannerUrl = req.body.bannerUrl || "";
      // if (req.file) { bannerUrl = await uploadToS3(req.file); }

      const { startAt, endAt } = computeTryoutBounds(rawSessions);

      req.step?.("delegating to service");
      const tryout = await this.service.create({
        name: req.body.name,
        location: req.body.location || "",
        description: req.body.description || "",
        theme: req.body.theme || "ocean",
        bannerUrl,
        slotDuration,
        swimmersPerSlot,
        lanesAvailable,
        laneDetails: createLaneDetails(lanesAvailable),
        coachAssignments: [],
        swimmersPerLane,
        ctaLabel: req.body.ctaLabel || "Sign up today",
        highlights: req.body.highlights || "",
        additionalInstructions: req.body.additionalInstructions || "",
        status: req.body.status || "draft",
        segments,
        steps,
        faqs,
        startAt,
        endAt,
        clubId,
        createdBy: userId,
        isTest: isTestUser(userId),
      });

      await syncSessionsAndSlots(tryout._id.toString(), rawSessions, slotDuration, swimmersPerSlot);

      req.step?.("responding", { status: HTTP_STATUS.CREATED });
      sendSuccess(res, { tryout }, MESSAGES.CREATED, HTTP_STATUS.CREATED);
    } catch (err) {
      next(err);
    }
  };

  /**
   * PUT /tryouts/:id
   * Updates an existing tryout. Supports multipart/form-data for banner upload.
   */
  update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      req.step?.("received", { params: req.params, query: req.query, body: req.body });
      const { id } = req.params;
      const clubId = req.user?.clubId;
      if (!clubId) return next(new ForbiddenError("No club associated with user"));
      req.step?.("validated");

      // Parse JSON fields from form data if present
      const slotDuration = req.body.slotDuration !== undefined ? parseInt(req.body.slotDuration) : undefined;
      const lanesAvailable = req.body.lanesAvailable !== undefined ? parseInt(req.body.lanesAvailable) : undefined;
      const swimmersPerLane = req.body.swimmersPerLane !== undefined ? parseInt(req.body.swimmersPerLane) : undefined;
      const swimmersPerSlot = req.body.swimmersPerSlot !== undefined ? parseInt(req.body.swimmersPerSlot) : undefined;
      const rawSessions: Array<{ date: string; startTime: string; endTime: string; label: string }> | undefined = req.body.sessions
        ? JSON.parse(req.body.sessions)
        : undefined;
      const segments = req.body.segments ? JSON.parse(req.body.segments) : undefined;
      const steps = req.body.steps ? JSON.parse(req.body.steps) : undefined;
      const faqs = req.body.faqs ? JSON.parse(req.body.faqs) : undefined;
      const laneDetails = req.body.laneDetails ? JSON.parse(req.body.laneDetails) : undefined;
      const coachAssignments = req.body.coachAssignments ? JSON.parse(req.body.coachAssignments) : undefined;

      // TODO: Upload banner file to S3/cloud storage and get URL
      let bannerUrl = req.body.bannerUrl;
      // if (req.file) { bannerUrl = await uploadToS3(req.file); }

      const { startAt, endAt } = rawSessions !== undefined ? computeTryoutBounds(rawSessions) : { startAt: undefined, endAt: undefined };

      req.step?.("delegating to service");
      const tryout = await this.service.update(id, clubId, {
        ...(req.body.name !== undefined && { name: req.body.name }),
        ...(req.body.location !== undefined && { location: req.body.location }),
        ...(req.body.description !== undefined && { description: req.body.description }),
        ...(req.body.theme !== undefined && { theme: req.body.theme }),
        ...(bannerUrl !== undefined && { bannerUrl }),
        ...(slotDuration !== undefined && { slotDuration }),
        ...(swimmersPerSlot !== undefined && { swimmersPerSlot }),
        ...(lanesAvailable !== undefined && { lanesAvailable }),
        ...(laneDetails !== undefined ? { laneDetails } : lanesAvailable !== undefined ? { laneDetails: createLaneDetails(lanesAvailable) } : {}),
        ...(coachAssignments !== undefined && { coachAssignments }),
        ...(swimmersPerLane !== undefined && { swimmersPerLane }),
        ...(req.body.ctaLabel !== undefined && { ctaLabel: req.body.ctaLabel }),
        ...(req.body.highlights !== undefined && { highlights: req.body.highlights }),
        ...(req.body.additionalInstructions !== undefined && { additionalInstructions: req.body.additionalInstructions }),
        ...(req.body.status !== undefined && { status: req.body.status }),
        ...(segments !== undefined && { segments }),
        ...(steps !== undefined && { steps }),
        ...(faqs !== undefined && { faqs }),
        ...(startAt !== undefined && { startAt }),
        ...(endAt !== undefined && { endAt }),
      });

      if (tryout && rawSessions !== undefined) {
        const effectiveSlotDuration = slotDuration ?? tryout.slotDuration;
        const effectiveSwimmersPerSlot =
          swimmersPerSlot ??
          (lanesAvailable !== undefined && swimmersPerLane !== undefined ? lanesAvailable * swimmersPerLane : tryout.swimmersPerSlot);
        await syncSessionsAndSlots(id, rawSessions, effectiveSlotDuration, effectiveSwimmersPerSlot);
      }

      const sessions = await sessionRepo.findByTryout(id);
      req.step?.("responding", { status: HTTP_STATUS.OK });
      sendSuccess(res, { tryout: { ...tryout, sessions } }, MESSAGES.UPDATED, HTTP_STATUS.OK);
    } catch (err) {
      next(err);
    }
  };

  /**
   * PATCH /tryouts/:id/publish
   * Publishes a draft tryout by setting status to 'open'.
   */
  publish = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      req.step?.("received", { params: req.params, query: req.query, body: req.body });
      const { id } = req.params;
      const clubId = req.user?.clubId;
      if (!clubId) return next(new ForbiddenError("No club associated with user"));
      req.step?.("validated");

      req.step?.("delegating to service");
      const tryout = await this.service.update(id, clubId, { status: "open" });
      req.step?.("responding", { status: HTTP_STATUS.OK });
      sendSuccess(res, { tryout }, MESSAGES.UPDATED, HTTP_STATUS.OK);
    } catch (err) {
      next(err);
    }
  };

  /**
   * DELETE /tryouts/:id
   * Deletes a tryout.
   */
  delete = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      req.step?.("received", { params: req.params, query: req.query, body: req.body });
      const { id } = req.params;
      const clubId = req.user?.clubId;
      if (!clubId) return next(new ForbiddenError("No club associated with user"));
      req.step?.("validated");

      req.step?.("delegating to service");
      await this.service.delete(id, clubId);
      req.step?.("responding", { status: HTTP_STATUS.OK });
      sendSuccess(res, null, MESSAGES.DELETED, HTTP_STATUS.OK);
    } catch (err) {
      next(err);
    }
  };

  /**
   * GET /tryouts/:id/sessions
   * Returns all sessions for a tryout.
   */
  getSessions = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      req.step?.("received", { params: req.params, query: req.query, body: req.body });
      const { id } = req.params;
      const sessions = await sessionRepo.findByTryout(id);
      req.step?.("responding", { status: HTTP_STATUS.OK });
      sendSuccess(res, { sessions }, MESSAGES.SUCCESS, HTTP_STATUS.OK);
    } catch (err) {
      next(err);
    }
  };

  /**
   * GET /tryouts/:id/slots or /tryouts/public/:id/slots
   * Returns slots for a tryout (optionally filtered by sessionId query param).
   */
  getSlots = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      req.step?.("received", { params: req.params, query: req.query, body: req.body });
      const { id } = req.params;
      const sessionId = req.query["sessionId"] as string | undefined;
      const slots = sessionId ? await slotRepo.findBySession(sessionId) : await slotRepo.findByTryout(id);
      req.step?.("responding", { status: HTTP_STATUS.OK });
      sendSuccess(res, { slots }, MESSAGES.SUCCESS, HTTP_STATUS.OK);
    } catch (err) {
      next(err);
    }
  };

  /**
   * GET /tryouts/public/:id
   * Returns a single active tryout by ID for public landing page (no auth required).
   * Includes sessions with their slots, capacity, and available slot counts.
   */
  getPublicById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      req.step?.("received", { params: req.params, query: req.query, body: req.body });
      const { id } = req.params;
      req.step?.("delegating to service");
      const tryout = await this.service.getPublicById(id, isTestUser(req.user?.id) ? undefined : false);

      const sessions = await sessionRepo.findByTryout(id);
      const sessionsWithSlots = await Promise.all(
        sessions.map(async (session) => {
          const slots = await slotRepo.findBySession(session._id);
          return {
            ...session,
            slots: slots.map((slot) => ({
              ...slot,
              availableSlots: Math.max(0, slot.capacity - slot.registeredCount),
            })),
          };
        }),
      );

      req.step?.("responding", { status: HTTP_STATUS.OK });
      sendSuccess(res, { ...tryout, sessions: sessionsWithSlots }, MESSAGES.SUCCESS, HTTP_STATUS.OK);
    } catch (err) {
      next(err);
    }
  };

  /**
   * GET /tryouts/public
   * Lists all active tryouts for public landing page (no authentication required).
   */
  listPublic = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      req.step?.("received", { params: req.params, query: req.query, body: req.body });
      const page = Math.max(1, parseInt(req.query["page"] as string) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(req.query["limit"] as string) || 10));
      const search = (req.query["search"] as string | undefined)?.trim() || undefined;
      const sortBy = (["name", "createdAt", "updatedAt"].includes(req.query["sortBy"] as string) ? req.query["sortBy"] : "createdAt") as
        | "name"
        | "createdAt"
        | "updatedAt";
      const sortOrder = (req.query["sortOrder"] === "asc" ? "asc" : "desc") as "asc" | "desc";
      const clubId = (req.query["clubId"] as string | undefined)?.trim() || undefined;
      const minAge = req.query["minAge"] !== undefined ? parseInt(req.query["minAge"] as string) : undefined;
      const maxAge = req.query["maxAge"] !== undefined ? parseInt(req.query["maxAge"] as string) : undefined;

      req.step?.("delegating to service");
      const result = await this.service.listActive({
        page,
        limit,
        search,
        sortBy,
        sortOrder,
        clubId,
        minAge: isNaN(minAge as number) ? undefined : minAge,
        maxAge: isNaN(maxAge as number) ? undefined : maxAge,
        isTest: isTestUser(req.user?.id) ? undefined : false,
      });

      req.step?.("responding", { status: HTTP_STATUS.OK });
      sendSuccess(res, result, MESSAGES.SUCCESS, HTTP_STATUS.OK);
    } catch (err) {
      next(err);
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════════
  //  Admin registration management endpoints
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * GET /tryouts/:id/registrations
   * Returns paginated, filtered, and sorted registrations for a tryout.
   *
   * Query params:
   *   page        — page number (default 1)
   *   limit       — page size (default 20)
   *   search      — swimmer name or parent/guardian email (case-insensitive)
   *   status      — one of: registered | waitlisted | offered | rejected | cancelled
   *   segmentId   — filter by segmentId value
   *   coachRecommendations — comma-separated list of coach recommendation values
   *                  (group ObjectId strings and/or the "__rejected__" sentinel)
   *   sortBy      — swimmer_name | swimmer_age | status | session_time (default: swimmer_name)
   *                 session_time sorts by the slot's sessionDate + startTime (ascending = earliest first).
   *   sortOrder   — asc | desc (default: asc)
   */
  getRegistrations = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      req.step?.("received", { params: req.params, query: req.query, body: req.body });
      const { id } = req.params;

      // ── Parse query params ────────────────────────────────────────────────
      const page = Math.max(1, parseInt(req.query["page"] as string) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(req.query["limit"] as string) || 20));
      const search = ((req.query["search"] as string) || "").trim().toLowerCase();
      const statusFilter = (req.query["status"] as string) || "";
      const segmentIdFilter = (req.query["segmentId"] as string) || "";
      const coachRecommendationFilter = ((req.query["coachRecommendations"] as string) || "")
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean);
      const registerId = ((req.query["registerId"] as string) || "").trim();
      const registerIds = ((req.query["registerIds"] as string) || "")
        .split(",")
        .map((value) => value.trim())
        .filter((value) => mongoose.Types.ObjectId.isValid(value));
      const sortBy = (req.query["sortBy"] as string) || "swimmer_name";
      const sortOrder = req.query["sortOrder"] === "desc" ? -1 : 1;

      // ── Build MongoDB filter ──────────────────────────────────────────────
      const mongoFilter: Record<string, any> = { tryoutId: id };
      if (statusFilter) mongoFilter["status"] = statusFilter;
      if (segmentIdFilter) mongoFilter["segmentId"] = segmentIdFilter;
      if (coachRecommendationFilter.length > 0) {
        // Values may be group ObjectId strings and/or the "__rejected__" sentinel.
        // Both are stored verbatim on the registration's `coachRecommendation` field.
        mongoFilter["coachRecommendation"] = { $in: coachRecommendationFilter };
      }
      if (registerId && mongoose.Types.ObjectId.isValid(registerId)) {
        mongoFilter["_id"] = new mongoose.Types.ObjectId(registerId);
      } else if (registerIds.length > 0) {
        mongoFilter["_id"] = {
          $in: registerIds.map((value) => new mongoose.Types.ObjectId(value)),
        };
      }

      // Search by swimmer name (first, last, or combined) or guardian email.
      // Split into tokens so "John Doe" matches firstName="John" AND lastName="Doe".
      if (search) {
        const tokens = search.split(/\s+/).filter(Boolean);
        if (tokens.length === 1) {
          // Single token — match against firstName, lastName, or guardianEmail
          mongoFilter["$or"] = [
            { "swimmerDetails.firstName": { $regex: tokens[0], $options: "i" } },
            { "swimmerDetails.lastName": { $regex: tokens[0], $options: "i" } },
            { "swimmerDetails.guardianEmail": { $regex: tokens[0], $options: "i" } },
          ];
        } else {
          // Multiple tokens — each token must appear somewhere in first or last name
          mongoFilter["$and"] = tokens.map((token) => ({
            $or: [{ "swimmerDetails.firstName": { $regex: token, $options: "i" } }, { "swimmerDetails.lastName": { $regex: token, $options: "i" } }],
          }));
          // Also allow the full string to match guardianEmail
          mongoFilter["$or"] = [{ "swimmerDetails.guardianEmail": { $regex: search, $options: "i" } }, { $and: mongoFilter["$and"] }];
          delete mongoFilter["$and"];
        }
      }

      // ── Build sort ────────────────────────────────────────────────────────
      // session_time is handled via aggregation in fetchRegistrationsPage;
      // the other fields use a simple indexed sort.

      // ── Count total (for pagination) ──────────────────────────────────────
      const total = await RegistrationModel.countDocuments(mongoFilter);

      // ── Fetch page ────────────────────────────────────────────────────────
      const registrations = await this.fetchRegistrationsPage(mongoFilter, sortBy, sortOrder as 1 | -1, page, limit);

      // ── Enrich with session/slot/segment data ─────────────────────────────
      req.step?.("delegating to service");
      const tryout = await this.service.getById(id, req.user?.clubId ?? "");

      // ── Coach segment scoping ───────────────────────────────────────────
      const coachSegmentIds = this.getCoachSegmentIds(tryout, req.user);
      if (coachSegmentIds !== null) {
        if (coachSegmentIds.length === 0) {
          sendSuccess(res, { registrations: [], total: 0, page, limit, totalPages: 0 }, MESSAGES.SUCCESS, HTTP_STATUS.OK);
          return;
        }
        // If the coach selected a specific segment, verify it's within their assigned segments
        if (segmentIdFilter && !coachSegmentIds.includes(segmentIdFilter)) {
          sendSuccess(res, { registrations: [], total: 0, page, limit, totalPages: 0 }, MESSAGES.SUCCESS, HTTP_STATUS.OK);
          return;
        }
        // Only apply $in filter when no specific segment is selected
        if (!segmentIdFilter) {
          mongoFilter["segmentId"] = { $in: coachSegmentIds };
        }
        // Re-count with the updated filter
        const scopedTotal = await RegistrationModel.countDocuments(mongoFilter);
        const scopedRegistrations = await this.fetchRegistrationsPage(mongoFilter, sortBy, sortOrder as 1 | -1, page, limit);
        const sessions = await sessionRepo.findByTryout(id);
        const slots = await slotRepo.findByTryout(id);
        const segmentMap = new Map((tryout.segments || []).map((s: any) => [s.id || s.name, s.name]));
        const sessionMap = new Map(sessions.map((s) => [s._id.toString(), s]));
        const slotMap = new Map(slots.map((s) => [s._id.toString(), s]));
        const scopedData = scopedRegistrations.map((r: any) => {
          const swimmer = r.swimmerId as any;
          const parent = r.parentId as any;
          const swimmerSlot = r.slotId as any;
          const session = sessionMap.get(r.sessionId?.toString?.() ?? r.sessionId);
          const slot = slotMap.get(r.slotId?.toString?.() ?? r.slotId);
          const scores = r.scores || {};
          return {
            id: r._id.toString(),
            swimmer_name: swimmer ? `${swimmer.firstName} ${swimmer.lastName}` : "Unknown",
            swimmer_age: r.swimmerDetails?.ageOnTryoutDay ?? 0,
            segment_name: segmentMap.get(r.segmentId) || r.segmentId,
            segment_id: r.segmentId,
            session_date: session?.date,
            slot_start: slot?.startTime,
            slot_end: slot?.endTime,
            slot_id: r.slotId,
            startTime: swimmerSlot?.startTime,
            endTime: swimmerSlot?.endTime,
            usa_membership_id: r.swimmerDetails?.usaMembershipId || null,
            usa_verification_status: r.usaVerificationStatus || "pending",
            club_name: r.swimmerDetails?.clubName || null,
            guardian_name: r.swimmerDetails?.guardianName || null,
            guardian_email: r.swimmerDetails?.guardianEmail || null,
            parent_name: parent ? `${parent.firstName} ${parent.lastName}` : null,
            parent_email: parent?.email || null,
            status: r.status,
            notes: r.notes || null,
            waitlist_position: r.waitlistPosition,
            safety_entry_exit: scores.safetyEntryExit ?? null,
            safety_float: scores.safetyFloat ?? null,
            freestyle: scores.freestyle ?? null,
            backstroke: scores.backstroke ?? null,
            breaststroke: scores.breaststroke ?? null,
            butterfly: scores.butterfly ?? null,
            total_score: scores.totalScore ?? null,
            detailed_scores: r.detailedScores || {},
            coach_recommendation: r.coachRecommendation || null,
          };
        });
        sendSuccess(
          res,
          { registrations: scopedData, total: scopedTotal, page, limit, totalPages: Math.ceil(scopedTotal / limit) },
          MESSAGES.SUCCESS,
          HTTP_STATUS.OK,
        );
        return;
      }

      const sessions = await sessionRepo.findByTryout(id);
      const slots = await slotRepo.findByTryout(id);

      const segmentMap = new Map((tryout.segments || []).map((s: any) => [s.id || s.name, s.name]));
      const sessionMap = new Map(sessions.map((s) => [s._id.toString(), s]));
      const slotMap = new Map(slots.map((s) => [s._id.toString(), s]));

      const data = registrations.map((r: any) => {
        const swimmer = r.swimmerId as any;
        const parent = r.parentId as any;
        const swimmerSlot = r.slotId as any;
        const session = sessionMap.get(r.sessionId?.toString?.() ?? r.sessionId);
        const slot = slotMap.get(r.slotId?.toString?.() ?? r.slotId);
        const scores = r.scores || {};

        return {
          id: r._id.toString(),
          swimmer_name: swimmer ? `${swimmer.firstName} ${swimmer.lastName}` : "Unknown",
          swimmer_age: r.swimmerDetails?.ageOnTryoutDay ?? 0,
          segment_name: segmentMap.get(r.segmentId) || r.segmentId,
          segment_id: r.segmentId,
          session_date: session?.date,
          slot_start: slot?.startTime,
          slot_end: slot?.endTime,
          slot_id: r.slotId,
          startTime: swimmerSlot?.startTime,
          endTime: swimmerSlot?.endTime,
          usa_membership_id: r.swimmerDetails?.usaMembershipId || null,
          usa_verification_status: r.usaVerificationStatus || "pending",
          club_name: r.swimmerDetails?.clubName || null,
          guardian_name: r.swimmerDetails?.guardianName || null,
          guardian_email: r.swimmerDetails?.guardianEmail || null,
          parent_name: parent ? `${parent.firstName} ${parent.lastName}` : null,
          parent_email: parent?.email || null,
          status: r.status,
          notes: r.notes || null,
          waitlist_position: r.waitlistPosition,
          safety_entry_exit: scores.safetyEntryExit ?? null,
          safety_float: scores.safetyFloat ?? null,
          freestyle: scores.freestyle ?? null,
          backstroke: scores.backstroke ?? null,
          breaststroke: scores.breaststroke ?? null,
          butterfly: scores.butterfly ?? null,
          total_score: scores.totalScore ?? null,
          detailed_scores: r.detailedScores || {},
          coach_recommendation: r.coachRecommendation || null,
        };
      });

      req.step?.("responding", { status: HTTP_STATUS.OK });
      sendSuccess(
        res,
        {
          registrations: data,
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
        MESSAGES.SUCCESS,
        HTTP_STATUS.OK,
      );
    } catch (err) {
      next(err);
    }
  };

  /**
   * GET /tryouts/:id/leaderboard
   * Returns scored swimmers sorted by totalScore, grouped by segment.
   */
  getLeaderboard = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      req.step?.("received", { params: req.params, query: req.query, body: req.body });
      const { id } = req.params;
      const registrations = await RegistrationModel.find({
        tryoutId: id,
        status: { $nin: ["cancelled"] },
        $or: [{ "scores.totalScore": { $exists: true, $ne: null } }, { detailedScores: { $exists: true, $ne: {}, $type: "object" } }],
      })
        .populate("swimmerId", "firstName lastName birthDate")
        .lean()
        .exec();

      req.step?.("delegating to service");
      const tryout = await this.service.getById(id, req.user?.clubId ?? "");

      // ── Coach segment scoping ───────────────────────────────────────────
      const coachSegmentIds = this.getCoachSegmentIds(tryout, req.user);
      let scopedRegistrations = registrations;
      if (coachSegmentIds !== null) {
        if (coachSegmentIds.length === 0) {
          sendSuccess(res, [], MESSAGES.SUCCESS, HTTP_STATUS.OK);
          return;
        }
        scopedRegistrations = registrations.filter((r: any) => coachSegmentIds.includes(r.segmentId));
      }

      const segmentMap = new Map((tryout.segments || []).map((s: any) => [s.id || s.name, s.name]));

      const groupIds = scopedRegistrations
        .map((r: any) => r.coachRecommendation)
        .filter((gid: any) => gid && String(gid).trim() && mongoose.Types.ObjectId.isValid(gid));
      const groups =
        groupIds.length > 0
          ? await GroupModel.find({ _id: { $in: groupIds } })
              .lean()
              .exec()
          : [];
      const groupNameMap = new Map<string, string>(groups.map((g) => [g._id.toString(), g.name]));

      const data = scopedRegistrations.map((r: any) => {
        const swimmer = r.swimmerId as any;
        const groupId = r.coachRecommendation ? String(r.coachRecommendation) : "";
        return {
          registration_id: r._id.toString(),
          swimmer_name: swimmer ? `${swimmer.firstName} ${swimmer.lastName}` : "Unknown",
          swimmer_age: r.swimmerDetails?.ageOnTryoutDay ?? 0,
          segment_name: segmentMap.get(r.segmentId) || r.segmentId,
          age_segment: r.segmentId,
          total_score:
            r.scores?.totalScore ??
            (() => {
              const nums = Object.values(r.detailedScores ?? {})
                .map((v: any) => (typeof v === "string" ? Number(v) : v))
                .filter((v: any): v is number => typeof v === "number" && !isNaN(v) && v > 0);
              return nums.length > 0 ? parseFloat(nums.reduce((a, b) => a + b, 0).toFixed(1)) : 0;
            })(),
          status: r.status,
          detailed_scores: r.detailedScores || {},
          coach_recommendation: groupId || null,
          coach_recommendation_name: groupId ? (groupNameMap.get(groupId) ?? null) : null,
        };
      });

      data.sort((a: any, b: any) => parseFloat(String(b.total_score)) - parseFloat(String(a.total_score)));

      req.step?.("responding", { status: HTTP_STATUS.OK });
      sendSuccess(res, data, MESSAGES.SUCCESS, HTTP_STATUS.OK);
    } catch (err) {
      next(err);
    }
  };

  /**
   * PUT /tryouts/:id/registrations/:regId/decision
   * Update registration status to offered or rejected.
   */
  decision = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      req.step?.("received", { params: req.params, query: req.query, body: req.body });
      const { regId } = req.params;
      const { status } = req.body;
      if (!["offered", "rejected"].includes(status)) {
        throw new BadRequestError("status must be offered or rejected");
      }
      req.step?.("validated");

      const updated = await RegistrationModel.findByIdAndUpdate(regId, { $set: { status } }, { new: true }).lean().exec();
      if (!updated) throw new NotFoundError("Registration not found");

      logger.info({ regId, swimmerDetails: updated.swimmerDetails, tryoutId: updated.tryoutId }, "decision.registration_loaded");

      const users = await UserModel.find({ _id: updated.parentId }).lean().exec();
      const user = users[0];

      if (user) {
        const emailType = status === "offered" ? "offered" : "rejected";
        let groupId: string | null = null;
        if (status === "offered" && updated.coachRecommendation && mongoose.Types.ObjectId.isValid(updated.coachRecommendation)) {
          groupId = updated.coachRecommendation;
        }

        const clubId = req.user?.clubId;
        if (!clubId) {
          sendSuccess(res, { registration: updated }, MESSAGES.UPDATED, HTTP_STATUS.OK);
          return;
        }

        req.step?.("delegating to service");
        const [tryout, group, template, club, sender] = await Promise.all([
          this.service.getById(updated.tryoutId.toString(), clubId),
          groupId ? GroupModel.findById(groupId).lean().exec() : Promise.resolve(null),
          EmailTemplateModel.findOne({ clubId, groupId, type: emailType }).lean().exec(),
          clubId ? ClubModel.findById(clubId).lean().exec() : Promise.resolve(null),
          req.user?.id ? UserModel.findById(req.user.id).lean().exec() : Promise.resolve(null),
        ]);

        const swimmerName = `${updated.swimmerDetails.firstName} ${updated.swimmerDetails.lastName}`.trim();
        const parentName = `${user.firstName} ${user.lastName}`.trim();
        const parentEmail = user.email;
        const senderName = sender ? `${sender.firstName ?? ""} ${sender.lastName ?? ""}`.trim() : "";

        logger.info({ regId, swimmerName, parentEmail, templateSubject: template?.subject, templateBody: template?.body }, "decision.email_sending");

        try {
          let emailSentSuccessfully = false;
          if (template) {
            const result = await sendBulkTemplateEmail({
              recipients: [
                {
                  to: parentEmail,
                  swimmer_name: swimmerName,
                  parent_name: parentName,
                  parent_email: parentEmail,
                  club_name: club?.name ?? "",
                  tryout_name: tryout.name,
                  group_name: group?.name ?? "",
                  sender_name: senderName,
                  note: updated.notes ?? "",
                  registrationId: regId,
                },
              ],
              subjectTemplate: template.subject,
              bodyTemplate: template.body,
              auditContext: {
                clubId,
                tryoutId: updated.tryoutId.toString(),
                action: emailType as "offered" | "rejected",
                mode: "single",
                templateType: "custom",
                senderId: req.user?.id,
                senderName,
              },
            });
            emailSentSuccessfully = result.sent > 0;
          } else {
            // Fallback to default emails when no saved template exists
            if (status === "offered") {
              const slot = await TryoutSlotModel.findById({ _id: updated.slotId }).lean();
              const result = await sendRegistrationOffer({
                to: parentEmail,
                swimmerName,
                parentName,
                tryoutName: tryout.name,
                location: tryout.location ?? "",
                sessionDate: slot?.sessionDate || "",
                startTime: slot?.startTime || "",
                endTime: slot?.endTime || "",
                clubName: club?.name ?? "",
              });
              await writeSingleAuditLog({
                clubId,
                tryoutId: updated.tryoutId.toString(),
                registrationId: regId,
                recipientEmail: parentEmail,
                swimmerName,
                parentName,
                action: "offered",
                templateType: "default",
                senderId: req.user?.id,
                senderName,
                result,
              });
            } else {
              const result = await sendRegistrationReject({
                to: parentEmail,
                swimmerName,
                parentName,
                tryoutName: tryout.name,
                sessionDate: "",
                clubName: club?.name ?? "",
              });
              await writeSingleAuditLog({
                clubId,
                tryoutId: updated.tryoutId.toString(),
                registrationId: regId,
                recipientEmail: parentEmail,
                swimmerName,
                parentName,
                action: "rejected",
                templateType: "default",
                senderId: req.user?.id,
                senderName,
                result,
              });
            }
            // Default-path functions throw on failure, so reaching here means success
            emailSentSuccessfully = true;
          }

          // Only mark the registration as emailed on a successful send
          if (emailSentSuccessfully) {
            await RegistrationModel.updateOne({ _id: regId }, { $set: { emailSent: true, lastCommunicationAt: new Date() } });
            logger.info({ regId }, "decision.email_sent.registration_updated");
          }
        } catch (emailErr: any) {
          logger.error({ err: emailErr, regId, status }, "decision.email.failed");
          // Best-effort audit row for the failed default-path send
          try {
            await EmailAuditLogModel.create({
              clubId,
              tryoutId: updated.tryoutId,
              registrationId: regId,
              recipientEmail: parentEmail,
              swimmerName,
              parentName,
              action: emailType as "offered" | "rejected",
              mode: "single",
              templateType: "default",
              subject: "",
              body: "",
              html: "",
              status: "failed",
              errorMessage: emailErr?.message ?? String(emailErr),
              senderId: req.user?.id,
              senderName,
              sentAt: new Date(),
            });
          } catch (auditErr) {
            logger.error({ err: auditErr, regId }, "decision.audit_log.write_failed");
          }
        }
      }

      req.step?.("responding", { status: HTTP_STATUS.OK });
      sendSuccess(res, { registration: updated }, MESSAGES.UPDATED, HTTP_STATUS.OK);
    } catch (err) {
      next(err);
    }
  };

  /**
   * GET /tryouts/:id/registrations/:regId/email-preview?status=offered|rejected
   * Returns a preview of the email that would be sent for an offer/reject
   * decision — subject, plain-text body, and full HTML — WITHOUT actually
   * sending anything. Uses the exact same template lookup, interpolation, and
   * renderLayout() as the real decision handler.
   */
  emailPreview = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      req.step?.("received", { params: req.params, query: req.query });
      const { id, regId } = req.params;
      const status = String(req.query.status ?? "");
      if (!["offered", "rejected"].includes(status)) {
        throw new BadRequestError("status query param must be 'offered' or 'rejected'");
      }
      const clubId = req.user?.clubId;
      if (!clubId) {
        return next(new ForbiddenError("No club associated with user"));
      }
      req.step?.("validated");

      // Verify tryout belongs to user's club
      req.step?.("delegating to service");
      const tryout = await this.service.getById(id, clubId);

      const registration = await RegistrationModel.findOne({ _id: regId, tryoutId: id })
        .populate("swimmerId", "firstName lastName birthDate")
        .populate("parentId", "firstName lastName email")
        .lean()
        .exec();
      if (!registration) throw new NotFoundError("Registration not found");

      // Coach segment scoping
      const coachSegmentIds = this.getCoachSegmentIds(tryout, req.user);
      if (coachSegmentIds !== null && !coachSegmentIds.includes(registration.segmentId)) {
        throw new ForbiddenError("You do not have access to this registration");
      }

      const user = registration.parentId as any;
      const emailType = status === "offered" ? "offered" : "rejected";

      // ── First, try to return the actual last-sent email from the audit log.
      // This makes the "Sent Email Preview" faithful to what the parent
      // actually received (including the exact template version at send time),
      // rather than a fresh re-render of the current template. If no email has
      // been sent yet (pre-send preview), fall through to template rendering.
      const lastSent = await EmailAuditLogModel.findOne({
        registrationId: regId,
        action: emailType,
        status: "sent",
      })
        .sort({ sentAt: -1 })
        .lean()
        .exec();

      if (lastSent) {
        sendSuccess(
          res,
          {
            subject: lastSent.subject,
            text: lastSent.body,
            html: lastSent.html,
            isCustom: lastSent.templateType === "custom",
            fromName: config.SES_FROM_NAME,
            fromEmail: config.SES_FROM_EMAIL,
            sentAt: lastSent.sentAt,
          },
          MESSAGES.RETRIEVED,
          HTTP_STATUS.OK,
        );
        return;
      }

      if (!user) {
        sendSuccess(
          res,
          { subject: "", text: "", html: "", isCustom: false, fromName: config.SES_FROM_NAME, fromEmail: config.SES_FROM_EMAIL },
          MESSAGES.RETRIEVED,
          HTTP_STATUS.OK,
        );
        return;
      }
      let groupId: string | null = null;
      if (status === "offered" && registration.coachRecommendation && mongoose.Types.ObjectId.isValid(registration.coachRecommendation)) {
        groupId = registration.coachRecommendation;
      }

      const [group, template, club, sender] = await Promise.all([
        groupId ? GroupModel.findById(groupId).lean().exec() : Promise.resolve(null),
        EmailTemplateModel.findOne({ clubId, groupId, type: emailType }).lean().exec(),
        clubId ? ClubModel.findById(clubId).lean().exec() : Promise.resolve(null),
        req.user?.id ? UserModel.findById(req.user.id).lean().exec() : Promise.resolve(null),
      ]);

      const swimmerName = `${registration.swimmerDetails.firstName} ${registration.swimmerDetails.lastName}`.trim();
      const parentName = `${user.firstName} ${user.lastName}`.trim();
      const parentEmail = user.email;
      const senderName = sender ? `${sender.firstName ?? ""} ${sender.lastName ?? ""}`.trim() : "";

      // If a custom template exists, preview it with the exact same code path
      // as sendBulkTemplateEmail. Otherwise return a flag so the client knows
      // to use its own fallback rendering.
      if (template) {
        const preview = previewTemplateEmail({
          recipient: {
            to: parentEmail,
            swimmer_name: swimmerName,
            parent_name: parentName,
            parent_email: parentEmail,
            club_name: club?.name ?? "",
            tryout_name: tryout.name,
            group_name: group?.name ?? "",
            sender_name: senderName,
            note: registration.notes ?? "",
          },
          subjectTemplate: template.subject,
          bodyTemplate: template.body,
        });
        req.step?.("responding", { status: HTTP_STATUS.OK });
        sendSuccess(
          res,
          { ...preview, isCustom: true, fromName: config.SES_FROM_NAME, fromEmail: config.SES_FROM_EMAIL },
          MESSAGES.RETRIEVED,
          HTTP_STATUS.OK,
        );
        return;
      }

      // No custom template — return the interpolation variables so the client
      // can render the default template (which is defined client-side for the
      // fallback case). We also return the interpolated default from the
      // server's DEFAULT_EMAIL_TEMPLATES for convenience.
      const { DEFAULT_EMAIL_TEMPLATES } = await import("../../shared/constants/email-templates");
      const defaultTpl = DEFAULT_EMAIL_TEMPLATES[emailType as keyof typeof DEFAULT_EMAIL_TEMPLATES];
      const preview = previewTemplateEmail({
        recipient: {
          to: parentEmail,
          swimmer_name: swimmerName,
          parent_name: parentName,
          parent_email: parentEmail,
          club_name: club?.name ?? "",
          tryout_name: tryout.name,
          group_name: group?.name ?? "",
          sender_name: senderName,
          note: registration.notes ?? "",
        },
        subjectTemplate: defaultTpl.subject,
        bodyTemplate: defaultTpl.body,
      });
      req.step?.("responding", { status: HTTP_STATUS.OK });
      sendSuccess(
        res,
        { ...preview, isCustom: false, fromName: config.SES_FROM_NAME, fromEmail: config.SES_FROM_EMAIL },
        MESSAGES.RETRIEVED,
        HTTP_STATUS.OK,
      );
    } catch (err) {
      next(err);
    }
  };

  /**
   * PUT /tryouts/:id/registrations/:regId/promote
   * Promote a waitlisted swimmer to registered.
   */
  promoteWaitlist = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      req.step?.("received", { params: req.params, query: req.query, body: req.body });
      const { regId } = req.params;
      const updated = await RegistrationModel.findByIdAndUpdate(regId, { $set: { status: "registered", waitlistPosition: null } }, { new: true })
        .lean()
        .exec();
      if (!updated) throw new NotFoundError("Registration not found");
      req.step?.("responding", { status: HTTP_STATUS.OK });
      sendSuccess(res, { registration: updated }, MESSAGES.UPDATED, HTTP_STATUS.OK);
    } catch (err) {
      next(err);
    }
  };

  /**
   * PUT /tryouts/:id/registrations/:regId/verify
   * Update USA-S verification status.
   */
  verifyUsa = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      req.step?.("received", { params: req.params, query: req.query, body: req.body });
      const { regId } = req.params;
      const { status } = req.body;
      const updated = await RegistrationModel.findByIdAndUpdate(regId, { $set: { usaVerificationStatus: status } }, { new: true })
        .lean()
        .exec();
      if (!updated) throw new NotFoundError("Registration not found");
      req.step?.("responding", { status: HTTP_STATUS.OK });
      sendSuccess(res, { registration: updated }, MESSAGES.UPDATED, HTTP_STATUS.OK);
    } catch (err) {
      next(err);
    }
  };

  /**
   * PUT /tryouts/:id/registrations/:regId/score
   * Update swimmer scores.
   */
  updateScore = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      req.step?.("received", { params: req.params, query: req.query, body: req.body });
      const { regId } = req.params;
      const body = req.body;

      const scoreUpdate: any = {};
      if (body.safety_entry_exit !== undefined) scoreUpdate["scores.safetyEntryExit"] = body.safety_entry_exit;
      if (body.safety_float !== undefined) scoreUpdate["scores.safetyFloat"] = body.safety_float;
      if (body.freestyle !== undefined) scoreUpdate["scores.freestyle"] = Number(body.freestyle) || null;
      if (body.backstroke !== undefined) scoreUpdate["scores.backstroke"] = Number(body.backstroke) || null;
      if (body.breaststroke !== undefined) scoreUpdate["scores.breaststroke"] = Number(body.breaststroke) || null;
      if (body.butterfly !== undefined) scoreUpdate["scores.butterfly"] = Number(body.butterfly) || null;

      const strokes = ["freestyle", "backstroke", "breaststroke", "butterfly"] as const;
      const scores: number[] = [];
      for (const k of strokes) {
        if (body[k] !== undefined && body[k] !== "" && !isNaN(Number(body[k]))) {
          scores.push(Number(body[k]));
        }
      }
      if (scores.length > 0) {
        const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
        scoreUpdate["scores.totalScore"] = parseFloat(avg.toFixed(1));
      }

      if (body.notes !== undefined) {
        scoreUpdate["notes"] = body.notes;
      }

      if (body.detailed_scores !== undefined) {
        // Merge with existing detailed_scores instead of replacing the whole object
        const existing = await RegistrationModel.findById(regId).lean().exec();
        const merged = { ...(existing?.detailedScores ?? {}), ...body.detailed_scores };
        scoreUpdate["detailedScores"] = merged;

        // Compute totalScore from numeric values in detailed_scores
        const numericScores = Object.values(merged)
          .map((v) => (typeof v === "string" ? Number(v) : v))
          .filter((v): v is number => typeof v === "number" && !isNaN(v) && v > 0);
        if (numericScores.length > 0) {
          scoreUpdate["scores.totalScore"] = parseFloat(numericScores.reduce((a, b) => a + b, 0).toFixed(1));
        }
      }

      if (body.coach_recommendation !== undefined) {
        scoreUpdate["coachRecommendation"] = body.coach_recommendation;
      }

      const updated = await RegistrationModel.findByIdAndUpdate(regId, { $set: scoreUpdate }, { new: true }).lean().exec();
      if (!updated) throw new NotFoundError("Registration not found");
      req.step?.("responding", { status: HTTP_STATUS.OK });
      sendSuccess(res, { registration: updated }, MESSAGES.UPDATED, HTTP_STATUS.OK);
    } catch (err) {
      next(err);
    }
  };

  /**
   * DELETE /tryouts/:id/registrations/:regId/score
   * Reset (clear) all scores for a registration.
   */
  resetScore = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      req.step?.("received", { params: req.params, query: req.query, body: req.body });
      const { regId } = req.params;

      const updated = await RegistrationModel.findByIdAndUpdate(
        regId,
        {
          $set: { "scores.totalScore": null },
          $unset: {
            "scores.safetyEntryExit": "",
            "scores.safetyFloat": "",
            "scores.freestyle": "",
            "scores.backstroke": "",
            "scores.breaststroke": "",
            "scores.butterfly": "",
            detailedScores: "",
            notes: "",
          },
        },
        { new: true },
      )
        .lean()
        .exec();
      if (!updated) throw new NotFoundError("Registration not found");
      req.step?.("responding", { status: HTTP_STATUS.OK });
      sendSuccess(res, { registration: updated }, MESSAGES.UPDATED, HTTP_STATUS.OK);
    } catch (err) {
      next(err);
    }
  };

  /**
   * GET /tryouts/public/:id/registration-questions
   * Returns the custom registration questions for a tryout (no auth required).
   */
  getPublicRegistrationQuestions = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      req.step?.("received", { params: req.params, query: req.query, body: req.body });
      const { id } = req.params;
      const doc = await TryoutRegistrationQuestionModel.findOne({ tryoutId: id }).lean().exec();
      const questions = doc?.questions ?? [];
      req.step?.("responding", { status: HTTP_STATUS.OK });
      sendSuccess(res, { questions }, MESSAGES.SUCCESS, HTTP_STATUS.OK);
    } catch (err) {
      next(err);
    }
  };

  /**
   * PUT /tryouts/:id/registration-questions
   * Upserts the registration question list for a tryout (admin/coach only).
   */
  upsertRegistrationQuestions = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      req.step?.("received", { params: req.params, query: req.query, body: req.body });
      const { id } = req.params;
      const clubId = req.user?.clubId;
      if (!clubId) return next(new ForbiddenError("No club associated with user"));
      req.step?.("validated");

      // Verify tryout belongs to user's club
      req.step?.("delegating to service");
      const tryout = await this.service.getById(id, clubId);
      if (!tryout) return next(new NotFoundError("Tryout not found"));

      const questions = Array.isArray(req.body.questions) ? req.body.questions : [];

      const doc = await TryoutRegistrationQuestionModel.findOneAndUpdate(
        { tryoutId: id },
        { $set: { tryoutId: id, questions } },
        { upsert: true, new: true },
      )
        .lean()
        .exec();

      req.step?.("responding", { status: HTTP_STATUS.OK });
      sendSuccess(res, { questions: doc?.questions ?? [] }, MESSAGES.UPDATED, HTTP_STATUS.OK);
    } catch (err) {
      next(err);
    }
  };

  /**
   * POST /tryouts/:id/comms
   * Send bulk communication to a filtered group of registrants.
   */
  sendComms = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      req.step?.("received", { params: req.params, query: req.query, body: req.body });
      const { id } = req.params;
      const { audience, subject, body } = req.body;

      const statusFilter = audience === "all" ? ["registered", "offered", "rejected", "waitlisted"] : [audience];
      const registrations = await RegistrationModel.find({
        tryoutId: id,
        status: { $in: statusFilter },
      })
        .lean()
        .exec();

      // TODO: integrate with actual email service (SendGrid, AWS SES, etc.)
      // For now, just mark lastCommunicationAt
      await RegistrationModel.updateMany(
        { tryoutId: id, status: { $in: statusFilter } },
        { $set: { lastCommunicationAt: new Date(), emailSent: true } },
      );

      req.step?.("responding", { status: HTTP_STATUS.OK });
      sendSuccess(res, { sentCount: registrations.length, audience, subject }, "Communication sent successfully", HTTP_STATUS.OK);
    } catch (err) {
      next(err);
    }
  };

  /**
   * POST /tryouts/:id/bulk-email
   * Accepts { registrationIds, subject, body }.
   * Resolves swimmer/parent/club/tryout data for each registration,
   * interpolates template variables, and sends emails non-blocking (responds 202 immediately).
   */
  bulkEmail = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      req.step?.("received", { params: req.params, query: req.query, body: req.body });
      const { id } = req.params;
      const clubId = req.user?.clubId;
      if (!clubId) return next(new ForbiddenError("No club associated with user"));

      const { registrationIds, subject, body, action } = req.body as {
        registrationIds: string[];
        subject: string;
        body: string;
        action: "offered" | "rejected";
      };

      if (action !== "offered" && action !== "rejected") {
        res.status(HTTP_STATUS.BAD_REQUEST).json({ message: "action must be 'offered' or 'rejected'" });
        return;
      }

      if (!Array.isArray(registrationIds) || registrationIds.length === 0) {
        res.status(HTTP_STATUS.BAD_REQUEST).json({ message: "registrationIds must be a non-empty array" });
        return;
      }
      if (!subject?.trim() || !body?.trim()) {
        res.status(HTTP_STATUS.BAD_REQUEST).json({ message: "subject and body are required" });
        return;
      }
      req.step?.("validated");

      req.step?.("delegating to service");
      const tryout = await this.service.getById(id, clubId);

      const registrations = await RegistrationModel.find({
        _id: { $in: registrationIds },
        tryoutId: id,
      })
        .populate<{ swimmerId: { firstName: string; lastName: string } }>("swimmerId", "firstName lastName")
        .populate<{ parentId: { firstName: string; lastName: string; email: string } }>("parentId", "firstName lastName email")
        .lean()
        .exec();

      logger.info({ registrationIds, count: registrations.length }, "bulk-email.registrations_found");

      // Fetch sender (calling user) name
      const sender = await UserModel.findById(req.user!.id).lean().exec();
      const senderName = sender ? `${sender.firstName ?? ""} ${sender.lastName ?? ""}`.trim() : "";

      console.info("senderName => ", senderName);

      // Batch-fetch group names for all coachRecommendation group IDs
      const groupIds = registrations.map((r: any) => r.coachRecommendation).filter((gid: any) => gid && String(gid).trim());
      const groups =
        groupIds.length > 0
          ? await GroupModel.find({ _id: { $in: groupIds } })
              .lean()
              .exec()
          : [];
      const groupNameMap = new Map<string, string>(groups.map((g) => [g._id.toString(), g.name]));

      const recipients = registrations
        .map((reg: any) => {
          const swimmerDoc = reg.swimmerId as any;
          const parentDoc = reg.parentId as any;
          const swimmerName = swimmerDoc
            ? `${swimmerDoc.firstName ?? ""} ${swimmerDoc.lastName ?? ""}`.trim()
            : reg.swimmerDetails?.firstName
              ? `${reg.swimmerDetails.firstName} ${reg.swimmerDetails.lastName}`.trim()
              : "";
          const parentName = parentDoc ? `${parentDoc.firstName ?? ""} ${parentDoc.lastName ?? ""}`.trim() : (reg.swimmerDetails?.guardianName ?? "");
          const parentEmail = parentDoc?.email ?? reg.swimmerDetails?.guardianEmail ?? "";
          const clubName = (tryout as any).club?.name ?? (tryout as any).clubName ?? "";
          const tryoutName = (tryout as any).name ?? "";

          const groupId = reg.coachRecommendation ? String(reg.coachRecommendation) : "";
          const groupName = groupId ? (groupNameMap.get(groupId) ?? "") : "";

          logger.info({ regId: reg._id, swimmerId: reg.swimmerId?._id ?? reg.swimmerId, swimmerName, parentEmail }, "bulk-email.recipient_resolved");

          return {
            to: parentEmail,
            swimmer_name: swimmerName,
            parent_name: parentName,
            parent_email: parentEmail,
            club_name: clubName,
            tryout_name: tryoutName,
            group_name: groupName,
            sender_name: senderName,
            note: reg.notes ?? "",
            registrationId: String(reg._id),
          };
        })
        .filter((r) => !!r.to);

      logger.info(
        { recipientCount: recipients.length, recipients: recipients.map((r) => ({ to: r.to, swimmer_name: r.swimmer_name })) },
        "bulk-email.recipients_final",
      );

      req.step?.("responding", { status: 202 });
      sendSuccess(res, { queued: recipients.length }, "Bulk email queued", 202);

      setImmediate(async () => {
        try {
          const result = await sendBulkTemplateEmail({
            recipients,
            subjectTemplate: subject,
            bodyTemplate: body,
            auditContext: {
              clubId,
              tryoutId: id,
              action,
              mode: "bulk",
              templateType: "custom",
              senderId: req.user!.id,
              senderName,
            },
          });
          // Only update registrations whose email was actually sent successfully
          if (result.sentRegistrationIds.length > 0) {
            await RegistrationModel.updateMany(
              { _id: { $in: result.sentRegistrationIds } },
              { $set: { status: action, emailSent: true, lastCommunicationAt: new Date() } },
            );
          }
          logger.info({ tryoutId: id, ...result }, "bulk-email.completed");
        } catch (err) {
          logger.error({ err, tryoutId: id }, "bulk-email.background.failed");
        }
      });
    } catch (err) {
      next(err);
    }
  };

  /**
   * GET /tryouts/:id/registrations/:regId
   * Returns a single registration with full details for admin/coach.
   */
  getRegistrationDetail = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      req.step?.("received", { params: req.params, query: req.query, body: req.body });
      const { id, regId } = req.params;
      const clubId = req.user?.clubId;
      if (!clubId) return next(new ForbiddenError("No club associated with user"));
      req.step?.("validated");

      // Verify tryout belongs to user's club
      req.step?.("delegating to service");
      const tryout = await this.service.getById(id, clubId);

      const registration = await RegistrationModel.findOne({ _id: regId, tryoutId: id })
        .populate("swimmerId", "firstName lastName birthDate")
        .populate("parentId", "firstName lastName email")
        .lean()
        .exec();

      if (!registration) throw new NotFoundError("Registration not found");

      // ── Coach segment scoping ───────────────────────────────────────────
      const coachSegmentIds = this.getCoachSegmentIds(tryout, req.user);
      if (coachSegmentIds !== null && !coachSegmentIds.includes(registration.segmentId)) {
        throw new ForbiddenError("You do not have access to this registration");
      }

      req.step?.("responding", { status: HTTP_STATUS.OK });
      sendSuccess(res, { registration }, MESSAGES.RETRIEVED, HTTP_STATUS.OK);
    } catch (err) {
      next(err);
    }
  };
}

export { upload };
