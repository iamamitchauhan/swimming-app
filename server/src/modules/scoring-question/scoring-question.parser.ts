import { parse as parseCsv } from "csv-parse/sync";
import ExcelJS from "exceljs";
import { BadRequestError } from "../../shared/errors/domain.errors";
import type { ScoringQuestionType } from "../../models/scoring-question.model";

// ─── Types ────────────────────────────────────────────────────────────────────

/** A row parsed from an uploaded sheet, before persistence. */
export interface ParsedScoringQuestionRow {
  /** 1-based row number in the source sheet (including the header). */
  row: number;
  category: string | null;
  label: string;
  type: ScoringQuestionType;
}

export interface ScoringQuestionImportError {
  row: number;
  message: string;
}

// ─── Type aliases ─────────────────────────────────────────────────────────────

// Accepted `type` spellings, keyed by the normalized value (lowercased, with
// spaces/underscores/hyphens stripped). Canonical values are also accepted.
const TYPE_ALIASES: Record<string, ScoringQuestionType> = {
  yesno: "YESNO",
  yes: "YESNO",
  y: "YESNO",
  yn: "YESNO",
  boolean: "YESNO",
  bool: "YESNO",
  passfail: "YESNO",
  rating: "RATING",
  rate: "RATING",
  rate15: "RATING",
  scale: "RATING",
  star: "RATING",
  stars: "RATING",
  "15": "RATING",
  text: "TEXT",
  free: "TEXT",
  freetext: "TEXT",
  string: "TEXT",
  note: "TEXT",
  notes: "TEXT",
};

// Recognized header names for each logical column (post-normalization).
const LABEL_KEYS = ["question", "label", "text", "question_text"];
const TYPE_KEYS = ["type", "answer_type", "format", "answer"];
const CATEGORY_KEYS = ["category", "group", "section"];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function normalizeKey(key: string): string {
  return key.trim().toLowerCase().replace(/\s+/g, "_");
}

function normalizeType(raw: string): ScoringQuestionType | null {
  const key = raw
    .trim()
    .toLowerCase()
    .replace(/[\s_\-/]+/g, "");
  return TYPE_ALIASES[key] ?? null;
}

function pick(row: Record<string, string>, keys: string[]): string {
  for (const key of keys) {
    const value = row[key];
    if (value) return value;
  }
  return "";
}

/** ExcelJS cells can be primitives, formulas, rich text or hyperlinks. */
function cellToString(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "object") {
    const v = value as { text?: unknown; result?: unknown; richText?: { text: string }[] };
    if (typeof v.text === "string") return v.text;
    if (v.result !== undefined && v.result !== null) return String(v.result);
    if (Array.isArray(v.richText)) return v.richText.map((r) => r.text).join("");
    return "";
  }
  return String(value);
}

async function readXlsxRows(buffer: Buffer): Promise<Record<string, unknown>[]> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as unknown as ArrayBuffer);
  const sheet = workbook.worksheets[0];
  if (!sheet) return [];

  const header: string[] = [];
  const rows: Record<string, unknown>[] = [];

  sheet.eachRow((row, rowNumber) => {
    // `row.values` is 1-indexed with an empty slot at index 0.
    const values = (row.values as unknown[]).slice(1);
    if (rowNumber === 1) {
      values.forEach((value) => header.push(cellToString(value).trim()));
      return;
    }
    const obj: Record<string, unknown> = {};
    header.forEach((key, index) => {
      obj[key] = values[index] ?? "";
    });
    rows.push(obj);
  });

  return rows;
}

function readCsvRows(buffer: Buffer): Record<string, unknown>[] {
  return parseCsv(buffer, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    // Ragged rows (missing/extra columns) are reported per-row below instead of
    // aborting the whole parse.
    relax_column_count: true,
  }) as Record<string, unknown>[];
}

function isXlsx(mimetype: string, fileName: string): boolean {
  return (
    mimetype === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
    mimetype === "application/vnd.ms-excel" ||
    /\.xlsx?$/i.test(fileName)
  );
}

async function readRows(buffer: Buffer, mimetype: string, fileName: string): Promise<Record<string, unknown>[]> {
  if (isXlsx(mimetype, fileName)) return readXlsxRows(buffer);
  try {
    return readCsvRows(buffer);
  } catch {
    throw new BadRequestError(`Unsupported file type: ${mimetype || fileName}. Please upload CSV or XLSX.`);
  }
}

// ─── Parser ───────────────────────────────────────────────────────────────────

/**
 * Parse a CSV/XLSX scoring-question sheet into normalized rows.
 *
 * Expected columns: `question` (required), `type` (required — yesno | rating |
 * text), `category` (optional). Column names are matched case/whitespace
 * insensitively, with a few aliases. Fully-empty rows are skipped; malformed
 * rows are reported in `errors` rather than throwing.
 */
export async function parseScoringQuestionSheet(
  buffer: Buffer,
  mimetype: string,
  fileName: string,
): Promise<{ rows: ParsedScoringQuestionRow[]; errors: ScoringQuestionImportError[] }> {
  const raw = await readRows(buffer, mimetype, fileName);
  const rows: ParsedScoringQuestionRow[] = [];
  const errors: ScoringQuestionImportError[] = [];

  raw.forEach((source, idx) => {
    // Row 1 is the header, so the first data row is 2.
    const rowNum = idx + 2;

    const normalized: Record<string, string> = {};
    for (const [key, value] of Object.entries(source)) {
      normalized[normalizeKey(key)] = cellToString(value).trim();
    }

    const label = pick(normalized, LABEL_KEYS);
    const rawType = pick(normalized, TYPE_KEYS);
    const category = pick(normalized, CATEGORY_KEYS);

    // Silently skip trailing/blank rows.
    if (!label && !rawType && !category) return;

    if (!label) {
      errors.push({ row: rowNum, message: 'Missing "question" text' });
      return;
    }

    const type = normalizeType(rawType);
    if (!type) {
      errors.push({
        row: rowNum,
        message: `Invalid or missing "type" (${rawType || "blank"}); expected yesno, rating or text`,
      });
      return;
    }

    rows.push({
      row: rowNum,
      category: category.length > 0 ? category.slice(0, 255) : null,
      label: label.slice(0, 500),
      type,
    });
  });

  return { rows, errors };
}
