import { TryoutRepository, PlainTryout, TryoutListParams, TryoutListResult } from "./tryout.repository";
import { ScoringQuestionRepository, PlainScoringQuestion } from "../scoring-question/scoring-question.repository";
import { NotFoundError, ForbiddenError, BadRequestError } from "../../shared/errors/domain.errors";
import logger from "../../shared/utils/logger";

const scoringQuestions = new ScoringQuestionRepository();

/** Segments are embedded sub-docs and usually carry no id; key by id-or-name. */
function segmentKey(segment: { id?: string; name: string }): string {
  return segment.id ?? segment.name;
}

export class TryoutService {
  constructor(private readonly repo: TryoutRepository) {}

  /**
   * Lists tryouts for the authenticated user's club with pagination, filters, and sort.
   */
  async listByClub(clubId: string, params: TryoutListParams = {}): Promise<TryoutListResult> {
    return this.repo.findByClub(clubId, params);
  }

  /**
   * Returns a single tryout by ID.
   */
  async getById(id: string, clubId: string, isTest?: boolean): Promise<PlainTryout> {
    const tryout = await this.repo.findById(id, isTest);
    if (!tryout) throw new NotFoundError("Tryout not found");
    // if (tryout.clubId !== clubId) throw new ForbiddenError('Access denied');
    return tryout;
  }

  /**
   * Creates a new tryout.
   */
  async create(data: Omit<PlainTryout, "_id" | "createdAt" | "updatedAt">): Promise<PlainTryout> {
    const created = await this.repo.create(data);
    logger.info({ tryoutId: created._id, clubId: data.clubId }, "tryout.created");
    return created;
  }

  /**
   * Updates an existing tryout.
   */
  async update(id: string, clubId: string, data: Partial<Omit<PlainTryout, "_id" | "createdAt" | "updatedAt">>): Promise<PlainTryout> {
    const existing = await this.repo.findById(id);
    if (!existing) throw new NotFoundError("Tryout not found");
    // if (existing.clubId !== clubId) throw new ForbiddenError('Access denied');

    const updated = await this.repo.update(id, data);
    if (!updated) throw new NotFoundError("Tryout not found");

    logger.info({ tryoutId: id, clubId }, "tryout.updated");
    return updated;
  }

  /**
   * Deletes a tryout.
   */
  async delete(id: string, clubId: string): Promise<void> {
    const existing = await this.repo.findById(id);
    if (!existing) throw new NotFoundError("Tryout not found");

    await this.repo.delete(id);
    logger.info({ tryoutId: id, clubId }, "tryout.deleted");
  }

  /**
   * Lists all active tryouts for public landing page (no authentication required).
   */
  async listActive(params: TryoutListParams = {}): Promise<TryoutListResult> {
    return this.repo.list({ ...params, status: "open" });
  }

  /**
   * Returns a single active tryout by ID for public landing page (no auth required).
   */
  async getPublicById(id: string, isTest?: boolean): Promise<PlainTryout> {
    const tryout = await this.repo.findById(id, isTest);
    if (!tryout) throw new NotFoundError("Tryout not found");
    if (tryout.status !== "open") throw new NotFoundError("Tryout not available");
    return tryout;
  }

  /**
   * Loads a tryout and enforces club access (super admins bypass).
   * Throws NotFound for both "missing" and "other club" to avoid leaking existence.
   */
  private async loadAccessibleTryout(tryoutId: string, clubId: string, isSuperAdmin: boolean): Promise<PlainTryout> {
    const tryout = await this.repo.findById(tryoutId);
    if (!tryout) throw new NotFoundError("Tryout not found");
    if (!isSuperAdmin && clubId && tryout.clubId.toString() !== clubId) {
      throw new NotFoundError("Tryout not found");
    }
    return tryout;
  }

  /**
   * The club-bank evaluation questions each segment is scored against, resolved
   * to full question objects. Every segment is returned (empty when unset) so
   * callers can render an explicit "not configured" state.
   */
  async getSegmentQuestions(
    tryoutId: string,
    clubId: string,
    isSuperAdmin: boolean,
  ): Promise<{ segmentId: string; questions: PlainScoringQuestion[] }[]> {
    const tryout = await this.loadAccessibleTryout(tryoutId, clubId, isSuperAdmin);
    const links = await this.repo.findSegmentQuestionRows(tryoutId);

    const questionIds = Array.from(new Set(links.map((link) => link.questionId.toString())));
    const questions = await scoringQuestions.findByIds(questionIds);
    const byId = new Map(questions.map((question) => [question._id.toString(), question]));

    const bySegment = new Map<string, PlainScoringQuestion[]>();
    for (const link of links) {
      const question = byId.get(link.questionId.toString());
      // Skip questions removed from the bank — they simply stop rendering.
      if (!question) continue;
      const list = bySegment.get(link.segmentId) ?? [];
      list.push(question);
      bySegment.set(link.segmentId, list);
    }

    return (tryout.segments ?? []).map((segment) => ({
      segmentId: segmentKey(segment),
      questions: bySegment.get(segmentKey(segment)) ?? [],
    }));
  }

  /**
   * Replace every segment's question selection for a tryout. Validates that the
   * segments belong to the tryout and the questions belong to its club.
   */
  async saveSegmentQuestions(
    tryoutId: string,
    selections: { segmentId: string; questionIds: string[] }[],
    clubId: string,
    isSuperAdmin: boolean,
  ): Promise<{ segmentId: string; questions: PlainScoringQuestion[] }[]> {
    const tryout = await this.loadAccessibleTryout(tryoutId, clubId, isSuperAdmin);
    const segmentKeys = new Set((tryout.segments ?? []).map(segmentKey));

    const normalized = selections.map((selection) => {
      if (!segmentKeys.has(selection.segmentId)) {
        throw new BadRequestError(`Segment ${selection.segmentId} does not belong to this tryout`);
      }
      return {
        segmentId: selection.segmentId,
        questionIds: Array.from(new Set(selection.questionIds)),
      };
    });

    const questionIds = Array.from(new Set(normalized.flatMap((s) => s.questionIds)));
    if (questionIds.length > 0) {
      const questions = await scoringQuestions.findByIds(questionIds);
      const found = new Map(questions.map((question) => [question._id.toString(), question]));
      for (const id of questionIds) {
        const question = found.get(id);
        if (!question) throw new BadRequestError(`Scoring question ${id} not found`);
        if (question.clubId.toString() !== tryout.clubId.toString()) {
          throw new BadRequestError(`Scoring question ${id} does not belong to this club`);
        }
      }
    }

    await this.repo.replaceSegmentQuestions(tryoutId, normalized);
    logger.info({ tryoutId, segments: normalized.length }, "tryout.segment-questions.saved");
    return this.getSegmentQuestions(tryoutId, clubId, isSuperAdmin);
  }
}
