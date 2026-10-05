import { ScoringQuestionModel, ScoringQuestionType } from "../../models/scoring-question.model";

// ─── Plain types ──────────────────────────────────────────────────────────────

export type PlainScoringQuestion = {
  _id: string;
  clubId: string;
  category: string | null;
  sourceFileName: string | null;
  label: string;
  type: ScoringQuestionType;
  orderIndex: number;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  createdBy: string | null;
  updatedBy: string | null;
  deletedBy: string | null;
};

export type CreateScoringQuestionData = {
  clubId: string;
  category: string | null;
  sourceFileName?: string | null;
  label: string;
  type: ScoringQuestionType;
  orderIndex: number;
  createdBy?: string | null;
};

// ─── Repository ───────────────────────────────────────────────────────────────

export class ScoringQuestionRepository {
  /** Every live question in a club's bank, in display order. */
  async findByClub(clubId: string): Promise<PlainScoringQuestion[]> {
    return ScoringQuestionModel.find({ clubId, isDeleted: false })
      .sort({ orderIndex: 1, createdAt: 1 })
      .lean<PlainScoringQuestion[]>()
      .exec();
  }

  /** Live questions by id (used to resolve per-segment selections). */
  async findByIds(ids: string[]): Promise<PlainScoringQuestion[]> {
    if (ids.length === 0) return [];
    return ScoringQuestionModel.find({ _id: { $in: ids }, isDeleted: false })
      .lean<PlainScoringQuestion[]>()
      .exec();
  }

  async findById(id: string): Promise<PlainScoringQuestion | null> {
    return ScoringQuestionModel.findOne({ _id: id, isDeleted: false })
      .lean<PlainScoringQuestion>()
      .exec();
  }

  /**
   * Highest order index currently used by a club (or -1 when the bank is empty).
   * Counts soft-deleted rows too, so indexes are never reused.
   */
  async maxOrderIndex(clubId: string): Promise<number> {
    const top = await ScoringQuestionModel.findOne({ clubId })
      .sort({ orderIndex: -1 })
      .select({ orderIndex: 1 })
      .lean<{ orderIndex: number }>()
      .exec();
    return top?.orderIndex ?? -1;
  }

  async createMany(rows: CreateScoringQuestionData[]): Promise<PlainScoringQuestion[]> {
    if (rows.length === 0) return [];
    const created = await ScoringQuestionModel.insertMany(rows);
    return created.map((doc) => doc.toObject<PlainScoringQuestion>());
  }

  /** Soft-delete one of a club's live questions. */
  async softDelete(clubId: string, id: string, deletedBy?: string): Promise<boolean> {
    const result = await ScoringQuestionModel.updateOne(
      { _id: id, clubId, isDeleted: false },
      { $set: { isDeleted: true, deletedAt: new Date(), deletedBy: deletedBy ?? null } },
    ).exec();
    return result.modifiedCount > 0;
  }

  /** Soft-delete several of a club's live questions; returns how many changed. */
  async softDeleteMany(clubId: string, ids: string[], deletedBy?: string): Promise<number> {
    if (ids.length === 0) return 0;
    const result = await ScoringQuestionModel.updateMany(
      { _id: { $in: ids }, clubId, isDeleted: false },
      { $set: { isDeleted: true, deletedAt: new Date(), deletedBy: deletedBy ?? null } },
    ).exec();
    return result.modifiedCount;
  }
}
