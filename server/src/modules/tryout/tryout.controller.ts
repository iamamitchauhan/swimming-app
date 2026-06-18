import { Request, Response, NextFunction } from "express";
import { TryoutService } from "./tryout.service";
import { TryoutSlotRepository } from "./tryout-slot.repository";
import { TryoutSessionRepository } from "./tryout-session.repository";
import { RegistrationRepository } from "../registration/registration.repository";
import { HTTP_STATUS } from "../../shared/constants/httpStatus";
import { MESSAGES } from "../../shared/constants/messages";
import { sendSuccess } from "../../shared/utils/response";
import { NotFoundError, ForbiddenError } from "../../shared/errors/domain.errors";
import multer from "multer";
import { RegistrationModel } from "../../models/registration.model";
import { SwimmerModel } from "../../models/swimmer.model";
import { UserModel } from "../../models/user.model";
import { TryoutRegistrationQuestionModel } from "../../models/tryout-registration-question.model";
import { sendRegistrationOffer, sendRegistrationReject } from "../../shared/utils/mailer";
import { UserService } from "../user/user.service";
import { TryoutSlotModel } from "../../models/tryout-slot.model";

// ─── Slot helpers ─────────────────────────────────────────────────────────────

function calcSlots(startTime: string, endTime: string, slotDuration: number): number {
  if (!startTime || !endTime || !slotDuration) return 0;
  const [sh, sm] = startTime.split(":").map(Number);
  const [eh, em] = endTime.split(":").map(Number);
  const durationMin = eh * 60 + em - (sh * 60 + sm);
  if (durationMin <= 0) return 0;
  return Math.floor(durationMin / slotDuration);
}

const slotRepo = new TryoutSlotRepository();
const sessionRepo = new TryoutSessionRepository();

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

  const startAt = new Date(`${first.date}T${first.startTime}`);
  const endAt = new Date(`${last.date}T${last.endTime}`);

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

  const slots = createdSessions.flatMap((session) =>
    Array.from({ length: session.totalSlots }, (_, i) => ({
      tryoutId,
      sessionId: session._id,
      sessionDate: session.date,
      startTime: session.startTime,
      endTime: session.endTime,
      label: session.label,
      slotIndex: i,
      capacity: swimmersPerSlot,
      registeredCount: 0,
    })),
  );

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
   * GET /tryouts
   * Lists tryouts for the authenticated user's club with pagination, filters, and sort.
   */
  list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const clubId = req.user?.clubId;
      if (!clubId) return next(new ForbiddenError("No club associated with user"));

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

      const result = await this.service.listByClub(clubId, {
        page,
        limit,
        search,
        status,
        dateFrom,
        dateTo,
        sortBy,
        sortOrder,
      });

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
      const { id } = req.params;
      const clubId = req.user?.clubId;
      if (!clubId) return next(new ForbiddenError("No club associated with user"));

      const tryout = await this.service.getById(id, clubId);
      const sessions = await sessionRepo.findByTryout(id);
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
      const clubId = req.user?.clubId;
      const userId = req.user?.id;
      if (!clubId || !userId) return next(new ForbiddenError("No club or user associated"));

      // Parse JSON fields from form data
      const slotDuration = parseInt(req.body.slotDuration) || 30;
      const swimmersPerSlot = parseInt(req.body.swimmersPerSlot) || 4;
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

      const tryout = await this.service.create({
        name: req.body.name,
        location: req.body.location || "",
        description: req.body.description || "",
        theme: req.body.theme || "ocean",
        bannerUrl,
        slotDuration,
        swimmersPerSlot,
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
      });

      await syncSessionsAndSlots(tryout._id.toString(), rawSessions, slotDuration, swimmersPerSlot);

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
      const { id } = req.params;
      const clubId = req.user?.clubId;
      if (!clubId) return next(new ForbiddenError("No club associated with user"));

      // Parse JSON fields from form data if present
      const slotDuration = req.body.slotDuration !== undefined ? parseInt(req.body.slotDuration) : undefined;
      const swimmersPerSlot = req.body.swimmersPerSlot !== undefined ? parseInt(req.body.swimmersPerSlot) : undefined;
      const rawSessions: Array<{ date: string; startTime: string; endTime: string; label: string }> | undefined = req.body.sessions
        ? JSON.parse(req.body.sessions)
        : undefined;
      const segments = req.body.segments ? JSON.parse(req.body.segments) : undefined;
      const steps = req.body.steps ? JSON.parse(req.body.steps) : undefined;
      const faqs = req.body.faqs ? JSON.parse(req.body.faqs) : undefined;

      // TODO: Upload banner file to S3/cloud storage and get URL
      let bannerUrl = req.body.bannerUrl;
      // if (req.file) { bannerUrl = await uploadToS3(req.file); }

      const { startAt, endAt } = rawSessions !== undefined ? computeTryoutBounds(rawSessions) : { startAt: undefined, endAt: undefined };

      const tryout = await this.service.update(id, clubId, {
        ...(req.body.name !== undefined && { name: req.body.name }),
        ...(req.body.location !== undefined && { location: req.body.location }),
        ...(req.body.description !== undefined && { description: req.body.description }),
        ...(req.body.theme !== undefined && { theme: req.body.theme }),
        ...(bannerUrl !== undefined && { bannerUrl }),
        ...(slotDuration !== undefined && { slotDuration }),
        ...(swimmersPerSlot !== undefined && { swimmersPerSlot }),
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
        const effectiveSwimmersPerSlot = swimmersPerSlot ?? tryout.swimmersPerSlot;
        await syncSessionsAndSlots(id, rawSessions, effectiveSlotDuration, effectiveSwimmersPerSlot);
      }

      const sessions = await sessionRepo.findByTryout(id);
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
      const { id } = req.params;
      const clubId = req.user?.clubId;
      if (!clubId) return next(new ForbiddenError("No club associated with user"));

      const tryout = await this.service.update(id, clubId, { status: "open" });
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
      const { id } = req.params;
      const clubId = req.user?.clubId;
      if (!clubId) return next(new ForbiddenError("No club associated with user"));

      await this.service.delete(id, clubId);
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
      const { id } = req.params;
      const sessions = await sessionRepo.findByTryout(id);
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
      const { id } = req.params;
      const sessionId = req.query["sessionId"] as string | undefined;
      const slots = sessionId ? await slotRepo.findBySession(sessionId) : await slotRepo.findByTryout(id);
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
      const { id } = req.params;
      const tryout = await this.service.getPublicById(id);

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
      const page = Math.max(1, parseInt(req.query["page"] as string) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(req.query["limit"] as string) || 10));
      const search = (req.query["search"] as string | undefined)?.trim() || undefined;
      const sortBy = (["name", "createdAt", "updatedAt"].includes(req.query["sortBy"] as string) ? req.query["sortBy"] : "createdAt") as
        | "name"
        | "createdAt"
        | "updatedAt";
      const sortOrder = (req.query["sortOrder"] === "asc" ? "asc" : "desc") as "asc" | "desc";

      const result = await this.service.listActive({
        page,
        limit,
        search,
        sortBy,
        sortOrder,
      });

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
   * Returns all registrations for a tryout with enriched swimmer/parent/session data.
   */
  getRegistrations = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const registrations = await RegistrationModel.find({ tryoutId: id })
        .populate("swimmerId", "firstName lastName birthDate")
        .populate("parentId", "firstName lastName email")
        .lean()
        .exec();

      const tryout = await this.service.getById(id, req.user?.clubId ?? "");
      const sessions = await sessionRepo.findByTryout(id);
      const slots = await slotRepo.findByTryout(id);

      const segmentMap = new Map((tryout.segments || []).map((s: any) => [s.id || s.name, s.name]));
      const sessionMap = new Map(sessions.map((s) => [s._id.toString(), s]));
      const slotMap = new Map(slots.map((s) => [s._id.toString(), s]));

      const data = registrations.map((r: any) => {
        const swimmer = r.swimmerId as any;
        const parent = r.parentId as any;
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
          usa_membership_id: r.swimmerDetails?.usaMembershipId || null,
          usa_verification_status: r.usaVerificationStatus || "pending",
          club_name: r.swimmerDetails?.clubName || null,
          guardian_name: r.swimmerDetails?.guardianName || null,
          guardian_email: r.swimmerDetails?.guardianEmail || null,
          parent_name: parent ? `${parent.firstName} ${parent.lastName}` : null,
          parent_email: parent?.email || null,
          status: r.status,
          waitlist_position: r.waitlistPosition,
          safety_entry_exit: scores.safetyEntryExit ?? null,
          safety_float: scores.safetyFloat ?? null,
          freestyle: scores.freestyle ?? null,
          backstroke: scores.backstroke ?? null,
          breaststroke: scores.breaststroke ?? null,
          butterfly: scores.butterfly ?? null,
          total_score: scores.totalScore ?? null,
        };
      });

      sendSuccess(res, data, MESSAGES.SUCCESS, HTTP_STATUS.OK);
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
      const { id } = req.params;
      const registrations = await RegistrationModel.find({
        tryoutId: id,
        status: { $nin: ["cancelled"] },
        "scores.totalScore": { $exists: true, $ne: null },
      })
        .populate("swimmerId", "firstName lastName birthDate")
        .lean()
        .exec();

      const tryout = await this.service.getById(id, req.user?.clubId ?? "");
      const segmentMap = new Map((tryout.segments || []).map((s: any) => [s.id || s.name, s.name]));

      const data = registrations.map((r: any) => {
        const swimmer = r.swimmerId as any;
        return {
          registration_id: r._id.toString(),
          swimmer_name: swimmer ? `${swimmer.firstName} ${swimmer.lastName}` : "Unknown",
          swimmer_age: r.swimmerDetails?.ageOnTryoutDay ?? 0,
          segment_name: segmentMap.get(r.segmentId) || r.segmentId,
          age_segment: r.segmentId,
          total_score: r.scores?.totalScore ?? 0,
          status: r.status,
        };
      });

      data.sort((a: any, b: any) => parseFloat(String(b.total_score)) - parseFloat(String(a.total_score)));

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
      const { regId } = req.params;
      const { status } = req.body;
      const updated = await RegistrationModel.findByIdAndUpdate(regId, { $set: { status } }, { new: true }).lean().exec();
      if (!updated) throw new NotFoundError("Registration not found");

      const users = await UserModel.find({ _id: updated.parentId }).lean().exec();
      const user = users[0];

      if (user) {
        // send mail based on status
        const swimmerName = `${updated.swimmerDetails.firstName} ${updated.swimmerDetails.lastName}`.trim();
        const parentName = `${user.firstName} ${user.lastName}`.trim();
        const parentEmail = user.email;

        switch (status) {
          case "offered": {
            // fetch tryout detail by Id

            const tryout = await this.service.getPublicById(updated.tryoutId.toString());
            // fetch slot detail by slot Id
            const slot = await TryoutSlotModel.findById({ _id: updated.slotId }).lean();

            await sendRegistrationOffer({
              to: parentEmail,
              swimmerName,
              parentName,
              tryoutName: tryout.name,
              location: tryout.location,
              sessionDate: slot?.sessionDate || "",
              startTime: slot?.startTime || "",
              endTime: slot?.endTime || "",
            });
            break;
          }

          case "rejected":
            await sendRegistrationReject({
              to: parentEmail,
              swimmerName,
              parentName,
            });
            break;

          default:
            break;
        }
      }

      sendSuccess(res, { registration: updated }, MESSAGES.UPDATED, HTTP_STATUS.OK);
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
      const { regId } = req.params;
      const updated = await RegistrationModel.findByIdAndUpdate(regId, { $set: { status: "registered", waitlistPosition: null } }, { new: true })
        .lean()
        .exec();
      if (!updated) throw new NotFoundError("Registration not found");
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
      const { regId } = req.params;
      const { status } = req.body;
      const updated = await RegistrationModel.findByIdAndUpdate(regId, { $set: { usaVerificationStatus: status } }, { new: true })
        .lean()
        .exec();
      if (!updated) throw new NotFoundError("Registration not found");
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

      const updated = await RegistrationModel.findByIdAndUpdate(regId, { $set: scoreUpdate }, { new: true }).lean().exec();
      if (!updated) throw new NotFoundError("Registration not found");
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
      const { id } = req.params;
      const doc = await TryoutRegistrationQuestionModel.findOne({ tryoutId: id }).lean().exec();
      const questions = doc?.questions ?? [];
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
      const { id } = req.params;
      const clubId = req.user?.clubId;
      if (!clubId) return next(new ForbiddenError("No club associated with user"));

      // Verify tryout belongs to user's club
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

      sendSuccess(res, { sentCount: registrations.length, audience, subject }, "Communication sent successfully", HTTP_STATUS.OK);
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
      const { id, regId } = req.params;
      const clubId = req.user?.clubId;
      if (!clubId) return next(new ForbiddenError("No club associated with user"));

      // Verify tryout belongs to user's club
      await this.service.getById(id, clubId);

      const registration = await RegistrationModel.findOne({ _id: regId, tryoutId: id })
        .populate("swimmerId", "firstName lastName birthDate")
        .populate("parentId", "firstName lastName email")
        .lean()
        .exec();

      if (!registration) throw new NotFoundError("Registration not found");

      sendSuccess(res, { registration }, MESSAGES.RETRIEVED, HTTP_STATUS.OK);
    } catch (err) {
      next(err);
    }
  };
}

export { upload };
