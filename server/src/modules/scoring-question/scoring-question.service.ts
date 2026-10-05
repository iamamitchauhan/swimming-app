import {
  ScoringQuestionRepository,
  PlainScoringQuestion,
} from "./scoring-question.repository";
import {
  parseScoringQuestionSheet,
  ParsedScoringQuestionRow,
  ScoringQuestionImportError,
} from "./scoring-question.parser";
import { buildTemplateCSV } from "./scoring-question.template";
import { NotFoundError } from "../../shared/errors/domain.errors";
import logger from "../../shared/utils/logger";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ScoringQuestionPreview {
  totalRows: number;
  valid: number;
  /** Rows whose label already exists in the club bank (would be skipped). */
  duplicates: number;
  errors: ScoringQuestionImportError[];
  rows: ParsedScoringQuestionRow[];
}

export interface ScoringQuestionImportResult {
  totalRows: number;
  created: number;
  skipped: number;
  questions: PlainScoringQuestion[];
  errors: ScoringQuestionImportError[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Case/whitespace-insensitive key used for append-only dedup. */
function normalizeLabel(label: string): string {
  return label.trim().toLowerCase().replace(/\s+/g, " ");
}

// ─── Service ──────────────────────────────────────────────────────────────────

export class ScoringQuestionService {
  constructor(private readonly repo: ScoringQuestionRepository) {}

  async listByClub(clubId: string): Promise<PlainScoringQuestion[]> {
    return this.repo.findByClub(clubId);
  }

  /** CSV template with the import parser's columns and example rows. */
  getTemplateCSV(): string {
    return buildTemplateCSV();
  }

  /** Dry-run parse: reports valid rows, errors and duplicates without writing. */
  async preview(
    clubId: string,
    file: Express.Multer.File,
  ): Promise<ScoringQuestionPreview> {
    const { rows, errors } = await parseScoringQuestionSheet(
      file.buffer,
      file.mimetype,
      file.originalname,
    );
    const existing = await this.repo.findByClub(clubId);
    const existingLabels = new Set(existing.map((q) => normalizeLabel(q.label)));

    const seen = new Set<string>();
    let duplicates = 0;
    for (const row of rows) {
      const key = normalizeLabel(row.label);
      if (existingLabels.has(key) || seen.has(key)) duplicates++;
      else seen.add(key);
    }

    return {
      totalRows: rows.length + errors.length,
      valid: rows.length - duplicates,
      duplicates,
      errors,
      rows,
    };
  }

  /**
   * Append-only import: adds questions not already present in the club bank
   * (matched by normalized label, both against the bank and within the file).
   */
  async import(
    clubId: string,
    file: Express.Multer.File,
    userId?: string,
  ): Promise<ScoringQuestionImportResult> {
    const { rows, errors } = await parseScoringQuestionSheet(
      file.buffer,
      file.mimetype,
      file.originalname,
    );
    const existing = await this.repo.findByClub(clubId);
    const existingLabels = new Set(existing.map((q) => normalizeLabel(q.label)));

    const seen = new Set<string>();
    const toCreate = rows.filter((row) => {
      const key = normalizeLabel(row.label);
      if (existingLabels.has(key) || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    const skipped = rows.length - toCreate.length;

    const startIndex = (await this.repo.maxOrderIndex(clubId)) + 1;
    const questions = await this.repo.createMany(
      toCreate.map((row, i) => ({
        clubId,
        category: row.category,
        sourceFileName: file.originalname ? file.originalname.slice(0, 255) : null,
        label: row.label,
        type: row.type,
        orderIndex: startIndex + i,
        createdBy: userId ?? null,
      })),
    );

    logger.info(
      { clubId, created: questions.length, skipped, errors: errors.length },
      "scoring-question.imported",
    );
    return {
      totalRows: rows.length + errors.length,
      created: questions.length,
      skipped,
      questions,
      errors,
    };
  }

  async remove(clubId: string, questionId: string, userId?: string): Promise<void> {
    const question = await this.repo.findById(questionId);
    if (!question || question.clubId.toString() !== clubId) {
      throw new NotFoundError(`Scoring question ${questionId} not found`);
    }
    await this.repo.softDelete(clubId, questionId, userId);
    logger.info({ clubId, questionId }, "scoring-question.removed");
  }

  /** Soft-delete several questions from the club bank; returns how many were removed. */
  async removeMany(clubId: string, questionIds: string[], userId?: string): Promise<number> {
    const deleted = await this.repo.softDeleteMany(clubId, questionIds, userId);
    logger.info({ clubId, deleted }, "scoring-question.removed-many");
    return deleted;
  }
}
