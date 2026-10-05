# Scoring Questions Tab — Implementation Plan (port lanepath → swimming-app)

> **For agentic workers:** This is a self-contained implementation plan. Work task-by-task.
> Steps use checkbox (`- [ ]`) syntax for tracking. There is **no test runner configured** in
> this repo (jest is declared but has no config and no tests exist), so each task ends with a
> concrete verification step (TypeScript build, curl, or a UI check) instead of unit tests.

**Goal:** Port the lanepath "Scoring questions" tab into `swimming-app`: a club-wide evaluation
question bank imported from CSV/XLSX, and a per-tryout, per-age-group assignment UI shown as a
question-centric table on the tryout dashboard.

**Architecture:** Two new Mongoose collections — `club_scoring_questions` (the club bank) and
`tryout_segment_questions` (the per-tryout assignment links) — plus a new `scoring-question`
module (routes/controller/service/repository/parser/template/validation) and two new endpoints on
the existing tryout module (`GET`/`PUT /tryouts/:id/segment-questions`). The client gets a new API
module, a new hooks file, and a tab split into one orchestrator + four focused components, wired
into the existing tryout dashboard tab container.

**Tech Stack:** Server — Node ≥18, Express 4, TypeScript 5 (strict, CommonJS, `esModuleInterop`),
Mongoose 8, Zod, multer (memory), exceljs, pino. Client — React 19, TypeScript, Vite 7,
`react-router-dom` 7, TanStack Query v5, axios, Tailwind v4, shadcn/Radix, sonner.

## Source of truth (the feature being ported)

The lanepath implementation and its approved design spec/plan are:

- Design: `lanepath/docs/superpowers/specs/2026-10-02-tryout-questions-tab-redesign-design.md`
- Plan: `lanepath/docs/superpowers/plans/2026-10-02-tryout-questions-tab-redesign.md`
- Server module: `lanepath/server/modules/scoringQuestion/*`
- Server tryout additions: `lanepath/server/modules/tryout/tryout.{types,schema,repository,service,controller,routes}.ts`
- DB schema: `lanepath/server/db/schema/scoringQuestions.ts`, `.../tryouts.ts` (`tryoutSegmentQuestions`)
- Client tab: `lanepath/client/src/pages/club-admin/tryout/tabs/SegmentQuestionsTab.tsx`
  and `.../tabs/questions/{QuestionsDropzone,QuestionsTable,QuestionTypeIndicator,AddToGroupsDialog,ManageBankDialog}.tsx`
- Client API/hooks: `lanepath/client/src/api/endpoints/scoringQuestion.api.ts`,
  `lanepath/client/src/hooks/useScoringQuestions.ts`

**Copy this plan's code; do not copy lanepath file paths or stack idioms** (lanepath is Postgres +
Drizzle + UUIDs; swimming-app is MongoDB + Mongoose + ObjectIds).

## Global Constraints

- Server is **CommonJS + strict TS + esModuleInterop** (`server/tsconfig.json`). Use `import X from`
  for CJS default exports (exceljs) and named imports for `csv-parse/sync`.
- IDs are Mongo `_id` strings (24-hex ObjectId). Client exposes them as `_id` — **not** `id`.
- Auth: `authenticate` → `authorize(...roles)` → `clubIsolation` (club routes only). Roles are
  `super_admin | admin | coach | parent` (`src/shared/constants/roles.ts`). `super_admin` bypasses
  `clubIsolation` and has `clubId === null`.
- Response envelope: always use `sendSuccess(res, data, message, statusCode)` from
  `src/shared/utils/response.ts`. Errors: throw the classes in `src/shared/errors/domain.errors.ts`
  (`NotFoundError`, `BadRequestError`, `ConflictError`, `ForbiddenError`, …).
- Module layout mirrors `src/modules/question-library/`: routes wire
  `new Repo() → new Service(repo) → new Controller(service)`; controllers are classes with
  arrow-function handlers that `try { ... } catch (err) { next(err); }`; repositories return
  `.lean<PlainType>()`; services `logger.info({...}, 'domain.event')`.
- Models live in `src/models/*.model.ts` and are imported by the module repository.
- **Every new/changed endpoint MUST be documented in `server/src/docs/*.yaml`** in the same change
  (project rule). Component schemas go in `src/config/swagger.ts`.
- Do NOT add or remove comments beyond what this plan specifies.
- Client API calls go through the shared `apiClient`/`api` from `@/lib/api/client`; hooks use
  TanStack Query + `toast` from sonner.

## Explicit adaptations vs lanepath (read before coding)

1. **Mongo, not Postgres.** Collections + `_id` ObjectIds; no migrations.
2. **Segment key is `segment.id ?? segment.name`.** Swimming-app segments are embedded sub-docs and
   usually have **no `id`** (`SegmentSchema` in `src/models/tryout.model.ts` declares `id: String`
   with no default; the wizard appends `{name,minAge,maxAge,level}` only). The whole repo already
   keys a segment by `seg.id ?? seg.name` (see `tryout.controller.ts` `s.id || s.name` and
   `ManageCoachesDialog.tsx` `segmentKey()`). Store that same string as `segmentId` in
   `tryout_segment_questions`. Document the trade-off: renaming a segment breaks its assignment
   (pre-existing repo behaviour).
3. **Write permissions include `super_admin`.** The `authorize()` factory is an exact role list, so
   pass `USER_ROLES.SUPER_ADMIN` explicitly where lanepath allowed `SUPER_ADMIN`.
4. **CSV parsing needs a dependency.** `exceljs` is already installed (used for xlsx export);
   `csv-parse` must be added for CSV. Use `csv-parse/sync` for CSV and `exceljs` for XLSX.
5. **UI primitives differ.** This repo's `Table` has no `containerClassName` prop and its header is
   dark by default; there is **no** `confirm-dialog` component — use `@/components/ui/alert-dialog`.
6. **No test infra.** Verification is build + curl + manual UI flow.

## File map

**Server — create**
- `server/src/models/scoring-question.model.ts`
- `server/src/models/tryout-segment-question.model.ts`
- `server/src/modules/scoring-question/scoring-question.parser.ts`
- `server/src/modules/scoring-question/scoring-question.template.ts`
- `server/src/modules/scoring-question/scoring-question.repository.ts`
- `server/src/modules/scoring-question/scoring-question.validation.ts`
- `server/src/modules/scoring-question/scoring-question.service.ts`
- `server/src/modules/scoring-question/scoring-question.controller.ts`
- `server/src/modules/scoring-question/scoring-question.routes.ts`
- `server/src/docs/scoring-questions.yaml`

**Server — modify**
- `server/src/app.ts` (mount the club router)
- `server/src/config/swagger.ts` (component schemas + tag)
- `server/src/modules/tryout/tryout.repository.ts` (segment-question reads/writes)
- `server/src/modules/tryout/tryout.service.ts` (get/save segment questions)
- `server/src/modules/tryout/tryout.controller.ts` (two handlers)
- `server/src/modules/tryout/tryout.routes.ts` (two routes)
- `server/package.json` (add `csv-parse`)

**Client — create**
- `client/src/lib/api/scoring-questions.api.ts`
- `client/src/hooks/use-scoring-questions.ts`
- `client/src/routes/_app/tryout-view/SegmentQuestionsTab.tsx`
- `client/src/routes/_app/tryout-view/questions/QuestionTypeIndicator.tsx`
- `client/src/routes/_app/tryout-view/questions/QuestionsDropzone.tsx`
- `client/src/routes/_app/tryout-view/questions/QuestionsTable.tsx`
- `client/src/routes/_app/tryout-view/questions/AddToGroupsDialog.tsx`
- `client/src/routes/_app/tryout-view/questions/ManageBankDialog.tsx`

**Client — modify**
- `client/src/lib/api/tryouts.api.ts` (segment-questions types + 2 methods)
- `client/src/routes/_app/tryouts.view.$id.tsx` (register the tab)

## API contract (final)

Base: `/api/v1`. Envelope: `{ success, message, data, error }`.

| Method | Path | Roles | Body / notes |
| --- | --- | --- | --- |
| GET | `/clubs/:clubId/scoring-questions` | super_admin, admin, coach | bank in display order |
| GET | `/clubs/:clubId/scoring-questions/template` | super_admin, admin, coach | `text/csv` attachment |
| POST | `/clubs/:clubId/scoring-questions/preview` | super_admin, admin | `multipart/form-data`, field `file`; dry-run |
| POST | `/clubs/:clubId/scoring-questions/import` | super_admin, admin | `multipart/form-data`, field `file`; append-only; 201 |
| DELETE | `/clubs/:clubId/scoring-questions/bulk` | super_admin, admin | JSON `{ ids: string[] }`; soft delete |
| DELETE | `/clubs/:clubId/scoring-questions/:questionId` | super_admin, admin | soft delete |
| GET | `/tryouts/:id/segment-questions` | super_admin, admin, coach | every segment, with resolved questions |
| PUT | `/tryouts/:id/segment-questions` | super_admin, admin | `{ segments: [{ segmentId, questionIds }] }`; replaces all |

**Payloads**

```jsonc
// ScoringQuestion
{ "_id": "…", "clubId": "…", "category": "Freestyle" | null, "sourceFileName": "sheet.csv" | null,
  "label": "Bilateral breathing", "type": "YESNO" | "RATING" | "TEXT",
  "orderIndex": 0, "createdAt": "…", "updatedAt": "…" }

// preview → data
{ "totalRows": 25, "valid": 22, "duplicates": 2, "errors": [{ "row": 7, "message": "…" }],
  "rows": [{ "row": 2, "category": null, "label": "Circle swim", "type": "YESNO" }] }

// import → data
{ "totalRows": 25, "created": 22, "skipped": 3,
  "questions": [ /* ScoringQuestion[] */ ], "errors": [ /* {row,message}[] */ ] }

// bulk delete → data
{ "deleted": 3 }

// GET/PUT segment-questions → data
[ { "segmentId": "8&U", "questions": [ /* ScoringQuestion[] */ ] } ]
```

---

## Phase 1 — Server data models

### Task 1: `ScoringQuestion` model (the club bank)

**Files:** Create `server/src/models/scoring-question.model.ts`

- [ ] **Step 1: Write the model**

```ts
import mongoose, { Schema, Document, Model } from "mongoose";

// ─── Constants ────────────────────────────────────────────────────────────────

// Answer formats for an evaluation question:
// YESNO → pass/fail, RATING → 1–5 scale, TEXT → free-text answer.
export const SCORING_QUESTION_TYPES = ["YESNO", "RATING", "TEXT"] as const;
export type ScoringQuestionType = (typeof SCORING_QUESTION_TYPES)[number];

// ─── Interfaces ───────────────────────────────────────────────────────────────

export interface IScoringQuestion extends Document {
  clubId: mongoose.Types.ObjectId;
  category: string | null;
  sourceFileName: string | null;
  label: string;
  type: ScoringQuestionType;
  orderIndex: number;
  isDeleted: boolean;
  deletedAt: Date | null;
  createdBy: string | null;
  updatedBy: string | null;
  deletedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Main schema ──────────────────────────────────────────────────────────────

const ScoringQuestionSchema = new Schema<IScoringQuestion>(
  {
    clubId: {
      type: Schema.Types.ObjectId,
      ref: "Club",
      required: true,
      index: true,
    },
    // Optional grouping carried over from the sheet's `category` column.
    category: { type: String, default: null, maxlength: 255 },
    // Filename of the sheet this question was imported from (display only).
    sourceFileName: { type: String, default: null, maxlength: 255 },
    // The question text. Re-imports dedup against this (normalized) value.
    label: { type: String, required: true, trim: true, maxlength: 500 },
    type: { type: String, enum: SCORING_QUESTION_TYPES, required: true },
    orderIndex: { type: Number, required: true },
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
    createdBy: { type: String, default: null },
    updatedBy: { type: String, default: null },
    deletedBy: { type: String, default: null },
  },
  {
    collection: "club_scoring_questions",
    timestamps: true,
  },
);

// ─── Indexes ──────────────────────────────────────────────────────────────────

ScoringQuestionSchema.index({ clubId: 1, isDeleted: 1, orderIndex: 1 });
// Safety net for append-only imports; partial so a soft-deleted question can be
// re-imported later.
ScoringQuestionSchema.index(
  { clubId: 1, label: 1 },
  { unique: true, partialFilterExpression: { isDeleted: false } },
);

// ─── Export ───────────────────────────────────────────────────────────────────

export const ScoringQuestionModel: Model<IScoringQuestion> = mongoose.model<IScoringQuestion>(
  "ScoringQuestion",
  ScoringQuestionSchema,
);
```

- [ ] **Step 2: Verify it compiles**

Run: `cd /home/amit/TRT/swimming-app/server && npx tsc --noEmit`
Expected: exit 0 (no errors from this file).

- [ ] **Step 3: Commit**

```bash
git add server/src/models/scoring-question.model.ts
git commit -m "feat(server): add club scoring-question model"
```

### Task 2: `TryoutSegmentQuestion` model (the assignment links)

**Files:** Create `server/src/models/tryout-segment-question.model.ts`

**Interfaces produced:** `TryoutSegmentQuestionModel` with fields
`{ tryoutId: ObjectId, segmentId: string, questionId: ObjectId, orderIndex: number }`.

- [ ] **Step 1: Write the model**

```ts
import mongoose, { Schema, Document, Model } from "mongoose";

// ─── Interfaces ───────────────────────────────────────────────────────────────

export interface ITryoutSegmentQuestion extends Document {
  tryoutId: mongoose.Types.ObjectId;
  // `segment.id ?? segment.name` — segments are embedded sub-docs and usually
  // carry no id, matching the convention used across the tryout module.
  segmentId: string;
  questionId: mongoose.Types.ObjectId;
  orderIndex: number;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Main schema ──────────────────────────────────────────────────────────────

const TryoutSegmentQuestionSchema = new Schema<ITryoutSegmentQuestion>(
  {
    tryoutId: {
      type: Schema.Types.ObjectId,
      ref: "Tryout",
      required: true,
      index: true,
    },
    segmentId: { type: String, required: true, index: true },
    questionId: {
      type: Schema.Types.ObjectId,
      ref: "ScoringQuestion",
      required: true,
    },
    orderIndex: { type: Number, required: true },
  },
  {
    collection: "tryout_segment_questions",
    timestamps: true,
  },
);

// ─── Indexes ──────────────────────────────────────────────────────────────────

TryoutSegmentQuestionSchema.index(
  { tryoutId: 1, segmentId: 1, questionId: 1 },
  { unique: true },
);

// ─── Export ───────────────────────────────────────────────────────────────────

export const TryoutSegmentQuestionModel: Model<ITryoutSegmentQuestion> =
  mongoose.model<ITryoutSegmentQuestion>("TryoutSegmentQuestion", TryoutSegmentQuestionSchema);
```

- [ ] **Step 2: Verify it compiles**

Run: `cd /home/amit/TRT/swimming-app/server && npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add server/src/models/tryout-segment-question.model.ts
git commit -m "feat(server): add tryout segment-question link model"
```

---

## Phase 2 — Server `scoring-question` module

### Task 3: Add the `csv-parse` dependency

**Files:** Modify `server/package.json`

- [ ] **Step 1: Install**

Run: `cd /home/amit/TRT/swimming-app/server && npm install csv-parse@^5.5.6`
Expected: `csv-parse` added under `dependencies`. (5.5.6 is well past the 7-day vetting window and
has no known advisory. Do not install SheetJS `xlsx` — `exceljs` already covers XLSX.)

- [ ] **Step 2: Commit**

```bash
git add server/package.json server/package-lock.json
git commit -m "chore(server): add csv-parse for scoring-question import"
```

### Task 4: Sheet parser (CSV + XLSX)

**Files:** Create `server/src/modules/scoring-question/scoring-question.parser.ts`

**Interfaces produced:**
- `ParsedScoringQuestionRow { row: number; category: string | null; label: string; type: ScoringQuestionType }`
- `ScoringQuestionImportError { row: number; message: string }`
- `parseScoringQuestionSheet(buffer, mimetype, fileName): Promise<{ rows; errors }>` (async)

- [ ] **Step 1: Write the parser**

```ts
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
  return parseCsv(buffer, { columns: true, skip_empty_lines: true, trim: true }) as Record<
    string,
    unknown
  >[];
}

function isXlsx(mimetype: string, fileName: string): boolean {
  return (
    mimetype === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
    mimetype === "application/vnd.ms-excel" ||
    /\.xlsx?$/i.test(fileName)
  );
}

async function readRows(
  buffer: Buffer,
  mimetype: string,
  fileName: string,
): Promise<Record<string, unknown>[]> {
  if (isXlsx(mimetype, fileName)) return readXlsxRows(buffer);
  try {
    return readCsvRows(buffer);
  } catch {
    throw new BadRequestError(
      `Unsupported file type: ${mimetype || fileName}. Please upload CSV or XLSX.`,
    );
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
```

- [ ] **Step 2: Verify it compiles**

Run: `cd /home/amit/TRT/swimming-app/server && npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add server/src/modules/scoring-question/scoring-question.parser.ts
git commit -m "feat(server): parse scoring-question CSV/XLSX sheets"
```

### Task 5: CSV template builder

**Files:** Create `server/src/modules/scoring-question/scoring-question.template.ts`

**Interfaces produced:** `buildTemplateCSV(): string`.

- [ ] **Step 1: Write the template builder**

```ts
// The starter sheet offered by the Questions tab's empty state. Column names
// match the import parser (see scoring-question.parser.ts).

const HEADERS = ["category", "question", "type"];

const EXAMPLE_ROWS: string[][] = [
  ["General deck & fundamentals", "Circle swim", "yesno"],
  ["Freestyle", "Bilateral breathing", "yesno"],
  ["Freestyle", "Legs straight (not kicking from knees)", "rating"],
  ["Starts & Underwaters", "Headfirst dive from the block", "yesno"],
  ["General deck & fundamentals", "Coach comments", "text"],
];

/** A ready-to-fill CSV: header row plus example rows. */
export function buildTemplateCSV(): string {
  return [HEADERS, ...EXAMPLE_ROWS].map((row) => row.join(",")).join("\n");
}
```

- [ ] **Step 2: Commit**

```bash
git add server/src/modules/scoring-question/scoring-question.template.ts
git commit -m "feat(server): add scoring-question CSV template builder"
```

### Task 6: Repository

**Files:** Create `server/src/modules/scoring-question/scoring-question.repository.ts`

**Interfaces produced:**
- `PlainScoringQuestion`, `CreateScoringQuestionData`
- `ScoringQuestionRepository` with `findByClub`, `findByIds`, `findById`, `maxOrderIndex`,
  `createMany`, `softDelete`, `softDeleteMany`

- [ ] **Step 1: Write the repository**

```ts
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
```

- [ ] **Step 2: Verify it compiles**

Run: `cd /home/amit/TRT/swimming-app/server && npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add server/src/modules/scoring-question/scoring-question.repository.ts
git commit -m "feat(server): add scoring-question repository"
```

### Task 7: Validation schemas

**Files:** Create `server/src/modules/scoring-question/scoring-question.validation.ts`

**Interfaces produced:** `objectIdSchema`, `clubIdParamsSchema`, `questionParamsSchema`,
`bulkDeleteSchema`.

- [ ] **Step 1: Write the schemas**

```ts
import { z } from "zod";

const objectIdSchema = z
  .string()
  .regex(/^[0-9a-fA-F]{24}$/, "Invalid id");

export const clubIdParamsSchema = z.object({
  clubId: objectIdSchema,
});

export const questionParamsSchema = z.object({
  clubId: objectIdSchema,
  questionId: objectIdSchema,
});

export const bulkDeleteSchema = z.object({
  ids: z
    .array(objectIdSchema)
    .min(1, "At least one question id is required")
    .max(100, "At most 100 question ids can be deleted at once"),
});

export { objectIdSchema };
```

- [ ] **Step 2: Commit**

```bash
git add server/src/modules/scoring-question/scoring-question.validation.ts
git commit -m "feat(server): add scoring-question validation schemas"
```

### Task 8: Service

**Files:** Create `server/src/modules/scoring-question/scoring-question.service.ts`

**Interfaces produced:** `ScoringQuestionService` with `listByClub`, `getTemplateCSV`, `preview`,
`import`, `remove`, `removeMany`.

- [ ] **Step 1: Write the service**

```ts
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
```

> Note: `logger` default import path matches `question-library.service.ts`
> (`../../shared/utils/logger`). Verify that file exists; if the logger is named, adjust the import.

- [ ] **Step 2: Verify it compiles**

Run: `cd /home/amit/TRT/swimming-app/server && npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add server/src/modules/scoring-question/scoring-question.service.ts
git commit -m "feat(server): add scoring-question service"
```

### Task 9: Controller

**Files:** Create `server/src/modules/scoring-question/scoring-question.controller.ts`

**Interfaces produced:** `upload` (multer instance) and `ScoringQuestionController` with `list`,
`downloadTemplate`, `preview`, `import`, `remove`, `removeMany`.

- [ ] **Step 1: Write the controller**

```ts
import { Request, Response, NextFunction } from "express";
import multer from "multer";
import { ScoringQuestionService } from "./scoring-question.service";
import { HTTP_STATUS } from "../../shared/constants/httpStatus";
import { MESSAGES } from "../../shared/constants/messages";
import { sendSuccess } from "../../shared/utils/response";
import { BadRequestError } from "../../shared/errors/domain.errors";
import { clubIdParamsSchema, questionParamsSchema, bulkDeleteSchema } from "./scoring-question.validation";

// ─── Multer config for sheet upload ───────────────────────────────────────────

const ACCEPTED_MIME_TYPES = new Set([
  "text/csv",
  "application/csv",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);

export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
  fileFilter: (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    const extensionOk = /\.(csv|xlsx|xls)$/i.test(file.originalname);
    if (ACCEPTED_MIME_TYPES.has(file.mimetype) || extensionOk) {
      cb(null, true);
    } else {
      cb(new BadRequestError("Unsupported file type. Please upload a CSV or Excel file."));
    }
  },
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function requireFile(req: Request): Express.Multer.File {
  const file = req.file as Express.Multer.File | undefined;
  if (!file) {
    throw new BadRequestError(
      'No file uploaded. Attach a CSV or XLSX file under the "file" field.',
    );
  }
  return file;
}

// ─── Controller ───────────────────────────────────────────────────────────────

export class ScoringQuestionController {
  constructor(private readonly service: ScoringQuestionService) {}

  /**
   * GET /api/v1/clubs/:clubId/scoring-questions
   * Lists the club's live scoring-question bank in display order.
   */
  list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      req.step?.("received", { params: req.params });
      const { clubId } = clubIdParamsSchema.parse(req.params);
      const data = await this.service.listByClub(clubId);
      sendSuccess(res, data, MESSAGES.SUCCESS, HTTP_STATUS.OK);
    } catch (err) {
      next(err);
    }
  };

  /**
   * GET /api/v1/clubs/:clubId/scoring-questions/template
   * Returns the starter CSV sheet.
   */
  downloadTemplate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      req.step?.("received", { params: req.params });
      clubIdParamsSchema.parse(req.params);
      const csv = this.service.getTemplateCSV();
      res.setHeader("Content-Type", "text/csv");
      res.setHeader(
        "Content-Disposition",
        'attachment; filename="scoring-questions-template.csv"',
      );
      res.status(HTTP_STATUS.OK).send(csv);
    } catch (err) {
      next(err);
    }
  };

  /**
   * POST /api/v1/clubs/:clubId/scoring-questions/preview
   * Dry-run parse of an uploaded sheet (writes nothing).
   */
  preview = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      req.step?.("received", { params: req.params });
      const { clubId } = clubIdParamsSchema.parse(req.params);
      const data = await this.service.preview(clubId, requireFile(req));
      sendSuccess(res, data, MESSAGES.SUCCESS, HTTP_STATUS.OK);
    } catch (err) {
      next(err);
    }
  };

  /**
   * POST /api/v1/clubs/:clubId/scoring-questions/import
   * Append-only import into the club bank.
   */
  import = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      req.step?.("received", { params: req.params });
      const { clubId } = clubIdParamsSchema.parse(req.params);
      const data = await this.service.import(clubId, requireFile(req), req.user?.id);
      sendSuccess(res, data, "Scoring questions imported", HTTP_STATUS.CREATED);
    } catch (err) {
      next(err);
    }
  };

  /**
   * DELETE /api/v1/clubs/:clubId/scoring-questions/:questionId
   * Soft-deletes a single bank question.
   */
  remove = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      req.step?.("received", { params: req.params });
      const { clubId, questionId } = questionParamsSchema.parse(req.params);
      await this.service.remove(clubId, questionId, req.user?.id);
      sendSuccess(res, null, "Scoring question removed", HTTP_STATUS.OK);
    } catch (err) {
      next(err);
    }
  };

  /**
   * DELETE /api/v1/clubs/:clubId/scoring-questions/bulk
   * Soft-deletes several bank questions.
   */
  removeMany = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      req.step?.("received", { params: req.params, body: req.body });
      const { clubId } = clubIdParamsSchema.parse(req.params);
      const { ids } = bulkDeleteSchema.parse(req.body);
      const deleted = await this.service.removeMany(clubId, ids, req.user?.id);
      sendSuccess(res, { deleted }, MESSAGES.SUCCESS, HTTP_STATUS.OK);
    } catch (err) {
      next(err);
    }
  };
}
```

> `req.step` and `req.user` are declared on the global Express `Request` type in this repo (used by
> `question-library.controller.ts`). If `req.step` is not on the type, remove those calls — they are
> optional tracing hooks, not required.

- [ ] **Step 2: Verify it compiles**

Run: `cd /home/amit/TRT/swimming-app/server && npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add server/src/modules/scoring-question/scoring-question.controller.ts
git commit -m "feat(server): add scoring-question controller"
```

### Task 10: Routes

**Files:** Create `server/src/modules/scoring-question/scoring-question.routes.ts`

**Interfaces produced:** `scoringQuestionRouter`.

- [ ] **Step 1: Write the routes**

```ts
import { Router } from "express";
import { authenticate } from "../../middleware/auth.middleware";
import { authorize } from "../../middleware/authorize.middleware";
import { clubIsolation } from "../../middleware/clubIsolation.middleware";
import { USER_ROLES } from "../../shared/constants/roles";
import { ScoringQuestionRepository } from "./scoring-question.repository";
import { ScoringQuestionService } from "./scoring-question.service";
import { ScoringQuestionController, upload } from "./scoring-question.controller";

const repo = new ScoringQuestionRepository();
const service = new ScoringQuestionService(repo);
const controller = new ScoringQuestionController(service);

const STAFF = [USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN, USER_ROLES.COACH] as const;
const ADMINS = [USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN] as const;

/**
 * Club-wide evaluation-question bank — mounted at
 * /api/v1/clubs/:clubId/scoring-questions by app.ts.
 *
 * GET    /                — list the bank (staff)
 * GET    /template        — download the starter CSV (staff)
 * POST   /preview         — dry-run parse a sheet (admins)
 * POST   /import          — append-only import (admins)
 * DELETE /bulk            — soft-delete several questions (admins)
 * DELETE /:questionId     — soft-delete one question (admins)
 */
const scoringQuestionRouter = Router({ mergeParams: true });

scoringQuestionRouter.get(
  "/",
  authenticate,
  authorize(...STAFF),
  clubIsolation,
  controller.list,
);

// Declared before /:questionId so "template" is never read as an id.
scoringQuestionRouter.get(
  "/template",
  authenticate,
  authorize(...STAFF),
  clubIsolation,
  controller.downloadTemplate,
);

scoringQuestionRouter.post(
  "/preview",
  authenticate,
  authorize(...ADMINS),
  clubIsolation,
  upload.single("file"),
  controller.preview,
);

scoringQuestionRouter.post(
  "/import",
  authenticate,
  authorize(...ADMINS),
  clubIsolation,
  upload.single("file"),
  controller.import,
);

// Bulk delete must be registered before /:questionId so "bulk" isn't captured.
scoringQuestionRouter.delete(
  "/bulk",
  authenticate,
  authorize(...ADMINS),
  clubIsolation,
  controller.removeMany,
);

scoringQuestionRouter.delete(
  "/:questionId",
  authenticate,
  authorize(...ADMINS),
  clubIsolation,
  controller.remove,
);

export { scoringQuestionRouter };
```

- [ ] **Step 2: Commit**

```bash
git add server/src/modules/scoring-question/scoring-question.routes.ts
git commit -m "feat(server): add scoring-question routes"
```

### Task 11: Mount the router

**Files:** Modify `server/src/app.ts`

- [ ] **Step 1: Import and mount**

Add the import next to the other module imports (after the `questionLibraryRouter` import on line 27):

```ts
import { scoringQuestionRouter } from "./modules/scoring-question/scoring-question.routes";
```

Add the mount **before** `app.use(`${API_PREFIX}/clubs`, clubRouter);` (line 137), so the more
specific path wins:

```ts
  // Club-wide evaluation-question bank for tryout segment scoring.
  app.use(`${API_PREFIX}/clubs/:clubId/scoring-questions`, scoringQuestionRouter);
  app.use(`${API_PREFIX}/clubs`, clubRouter);
```

- [ ] **Step 2: Verify it compiles and boots**

Run: `cd /home/amit/TRT/swimming-app/server && npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add server/src/app.ts
git commit -m "feat(server): mount scoring-question router under /clubs/:clubId"
```

---

## Phase 3 — Tryout segment-question endpoints

### Task 12: Repository reads/writes

**Files:** Modify `server/src/modules/tryout/tryout.repository.ts`

- [ ] **Step 1: Add the model import**

At the top, next to the existing model imports:

```ts
import { TryoutSegmentQuestionModel } from "../../models/tryout-segment-question.model";
```

- [ ] **Step 2: Add the plain type and methods**

Add the type near the other exported types:

```ts
export type PlainSegmentQuestionRow = {
  segmentId: string;
  questionId: string;
  orderIndex: number;
};
```

Add these methods inside the `TryoutRepository` class (e.g. after the registration-questions
methods):

```ts
  /** Raw segment→question links for a tryout, in display order. */
  async findSegmentQuestionRows(tryoutId: string): Promise<PlainSegmentQuestionRow[]> {
    return TryoutSegmentQuestionModel.find({ tryoutId })
      .sort({ orderIndex: 1 })
      .lean<PlainSegmentQuestionRow[]>()
      .exec();
  }

  /** Replace every segment's question selection for a tryout. */
  async replaceSegmentQuestions(
    tryoutId: string,
    selections: { segmentId: string; questionIds: string[] }[],
  ): Promise<void> {
    await TryoutSegmentQuestionModel.deleteMany({ tryoutId });
    const docs = selections.flatMap((selection) =>
      selection.questionIds.map((questionId, index) => ({
        tryoutId,
        segmentId: selection.segmentId,
        questionId,
        orderIndex: index,
      })),
    );
    if (docs.length > 0) {
      await TryoutSegmentQuestionModel.insertMany(docs);
    }
  }
```

- [ ] **Step 3: Verify it compiles**

Run: `cd /home/amit/TRT/swimming-app/server && npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 4: Commit**

```bash
git add server/src/modules/tryout/tryout.repository.ts
git commit -m "feat(server): add tryout segment-question repository methods"
```

### Task 13: Service methods

**Files:** Modify `server/src/modules/tryout/tryout.service.ts`

- [ ] **Step 1: Add imports**

At the top of the file:

```ts
import { ScoringQuestionRepository, PlainScoringQuestion } from "../scoring-question/scoring-question.repository";
import { BadRequestError } from "../../shared/errors/domain.errors";
```

(`NotFoundError` is already imported; do not duplicate it.)

- [ ] **Step 2: Add the shared repo instance and segment key helper**

Above the `TryoutService` class:

```ts
const scoringQuestions = new ScoringQuestionRepository();

/** Segments are embedded sub-docs and usually carry no id; key by id-or-name. */
function segmentKey(segment: { id?: string; name: string }): string {
  return segment.id ?? segment.name;
}
```

- [ ] **Step 3: Add the two service methods**

Add these to `TryoutService` (e.g. after `upsertRegistrationQuestions`):

```ts
  /**
   * Loads a tryout and enforces club access (super admins bypass).
   * Throws NotFound for both "missing" and "other club" to avoid leaking existence.
   */
  private async loadAccessibleTryout(
    tryoutId: string,
    clubId: string,
    isSuperAdmin: boolean,
  ): Promise<PlainTryout> {
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
```

- [ ] **Step 4: Verify it compiles**

Run: `cd /home/amit/TRT/swimming-app/server && npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 5: Commit**

```bash
git add server/src/modules/tryout/tryout.service.ts
git commit -m "feat(server): add tryout segment-question service methods"
```

### Task 14: Controller handlers

**Files:** Modify `server/src/modules/tryout/tryout.controller.ts`

- [ ] **Step 1: Add the handlers**

Add these two methods to `TryoutController` (next to the other admin handlers). They use the same
`id` param and `req.user` shape as the rest of the file:

```ts
  /**
   * GET /tryouts/:id/segment-questions
   * Returns each segment with the club-bank questions it is scored against.
   */
  getSegmentQuestions = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      req.step?.("received", { params: req.params });
      const data = await this.service.getSegmentQuestions(
        req.params["id"]!,
        req.user?.clubId ?? "",
        req.user?.role === "super_admin",
      );
      sendSuccess(res, data, MESSAGES.SUCCESS, HTTP_STATUS.OK);
    } catch (err) {
      next(err);
    }
  };

  /**
   * PUT /tryouts/:id/segment-questions
   * Replaces every segment's question selection.
   */
  saveSegmentQuestions = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      req.step?.("received", { params: req.params, body: req.body });
      const { segments } = req.body as {
        segments?: { segmentId?: string; questionIds?: string[] }[];
      };
      if (!Array.isArray(segments)) {
        throw new BadRequestError("segments must be an array");
      }
      const normalized = segments.map((selection, index) => {
        if (!selection?.segmentId || typeof selection.segmentId !== "string") {
          throw new BadRequestError(`segments[${index}].segmentId is required`);
        }
        if (!Array.isArray(selection.questionIds)) {
          throw new BadRequestError(`segments[${index}].questionIds must be an array`);
        }
        return { segmentId: selection.segmentId, questionIds: selection.questionIds };
      });

      const data = await this.service.saveSegmentQuestions(
        req.params["id"]!,
        normalized,
        req.user?.clubId ?? "",
        req.user?.role === "super_admin",
      );
      sendSuccess(res, data, "Segment questions saved", HTTP_STATUS.OK);
    } catch (err) {
      next(err);
    }
  };
```

> `BadRequestError`, `sendSuccess`, `MESSAGES`, `HTTP_STATUS`, `Request`, `Response`, `NextFunction`
> are already imported at the top of `tryout.controller.ts` (verify before adding duplicate imports).

- [ ] **Step 2: Verify it compiles**

Run: `cd /home/amit/TRT/swimming-app/server && npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add server/src/modules/tryout/tryout.controller.ts
git commit -m "feat(server): add tryout segment-question handlers"
```

### Task 15: Tryout routes

**Files:** Modify `server/src/modules/tryout/tryout.routes.ts`

- [ ] **Step 1: Add the routes**

Add after the existing `PUT /:id/registration-questions` line (line 80):

```ts
// Club-bank evaluation questions each segment is scored against. Read is open to
// staff (the scoring UI resolves a segment's questions); write is admin-only.
tryoutRouter.get(
  "/:id/segment-questions",
  authenticate,
  authorize(USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN, USER_ROLES.COACH),
  controller.getSegmentQuestions,
);

tryoutRouter.put(
  "/:id/segment-questions",
  authenticate,
  authorize(USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN),
  controller.saveSegmentQuestions,
);
```

Also update the router doc comment block at the top of the file to mention the two new routes:

```
 * GET  /:id/segment-questions    — segment → bank-question assignments (admin, coach)
 * PUT  /:id/segment-questions    — replace all segment assignments (admin)
```

- [ ] **Step 2: Verify it compiles**

Run: `cd /home/amit/TRT/swimming-app/server && npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add server/src/modules/tryout/tryout.routes.ts
git commit -m "feat(server): register tryout segment-question routes"
```

---

## Phase 4 — Swagger documentation (project rule)

### Task 16: Component schemas + paths YAML

**Files:** Modify `server/src/config/swagger.ts`; create `server/src/docs/scoring-questions.yaml`

- [ ] **Step 1: Add component schemas**

Inside `components.schemas` in `server/src/config/swagger.ts` (e.g. after the `Tryout` schema), add:

```ts
        // ─── Scoring questions ────────────────────────────────────────────────
        ScoringQuestion: {
          type: "object",
          description:
            "A club-wide evaluation question. type selects the answer control: YESNO (pass/fail), RATING (1-5) or TEXT (free text).",
          properties: {
            _id: { type: "string", example: "665f1a2b3c4d5e6f7a8b9c20" },
            clubId: { type: "string", example: "665f1a2b3c4d5e6f7a8b9c0e" },
            category: { type: "string", nullable: true, example: "Freestyle" },
            sourceFileName: { type: "string", nullable: true, example: "scoring-questions-sample.csv" },
            label: { type: "string", maxLength: 500, example: "Bilateral breathing" },
            type: { type: "string", enum: ["YESNO", "RATING", "TEXT"], example: "YESNO" },
            orderIndex: { type: "integer", example: 0 },
            createdAt: { type: "string", format: "date-time", nullable: true },
            updatedAt: { type: "string", format: "date-time", nullable: true },
          },
        },
        ScoringQuestionPreview: {
          type: "object",
          description: "Dry-run result of parsing a scoring-question sheet (nothing written).",
          properties: {
            totalRows: { type: "integer", example: 25 },
            valid: { type: "integer", example: 22 },
            duplicates: { type: "integer", example: 2 },
            errors: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  row: { type: "integer", example: 7 },
                  message: { type: "string", example: 'Invalid or missing "type"' },
                },
              },
            },
            rows: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  row: { type: "integer" },
                  category: { type: "string", nullable: true },
                  label: { type: "string" },
                  type: { type: "string", enum: ["YESNO", "RATING", "TEXT"] },
                },
              },
            },
          },
        },
        ScoringQuestionImportResult: {
          type: "object",
          properties: {
            totalRows: { type: "integer", example: 25 },
            created: { type: "integer", example: 22 },
            skipped: { type: "integer", example: 3 },
            questions: {
              type: "array",
              items: { $ref: "#/components/schemas/ScoringQuestion" },
            },
            errors: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  row: { type: "integer" },
                  message: { type: "string" },
                },
              },
            },
          },
        },
        TryoutSegmentQuestions: {
          type: "object",
          properties: {
            segmentId: {
              type: "string",
              description: "segment.id ?? segment.name",
              example: "8&U",
            },
            questions: {
              type: "array",
              items: { $ref: "#/components/schemas/ScoringQuestion" },
            },
          },
        },
```

Also add a tag to the `tags` array:

```ts
      { name: "Scoring Questions", description: "Club-wide evaluation question bank for tryout segment scoring" },
```

- [ ] **Step 2: Create the paths YAML**

Create `server/src/docs/scoring-questions.yaml`:

```yaml
paths:
  /clubs/{clubId}/scoring-questions:
    get:
      tags: [Scoring Questions]
      summary: List a club's scoring-question bank
      description: >-
        Club-wide bank of evaluation questions imported from a CSV/XLSX sheet.
        Readable by any staff member of the club (the scoring UI resolves the
        questions for the segments it renders).
      security: [{ bearerAuth: [] }]
      parameters:
        - { name: clubId, in: path, required: true, schema: { type: string } }
      responses:
        "200":
          description: Bank questions in display order
          content:
            application/json:
              schema:
                allOf:
                  - { $ref: "#/components/schemas/SuccessResponse" }
                  - type: object
                    properties:
                      data:
                        type: array
                        items: { $ref: "#/components/schemas/ScoringQuestion" }
        "401": { $ref: "#/components/responses/Unauthorized" }
        "403": { $ref: "#/components/responses/Forbidden" }

  /clubs/{clubId}/scoring-questions/template:
    get:
      tags: [Scoring Questions]
      summary: Download the scoring-question CSV template
      description: >-
        Returns a ready-to-fill CSV with the import parser's columns
        (category, question, type) and example rows. Readable by club staff.
      security: [{ bearerAuth: [] }]
      parameters:
        - { name: clubId, in: path, required: true, schema: { type: string } }
      responses:
        "200":
          description: CSV template
          content:
            text/csv:
              schema: { type: string, format: binary }
        "401": { $ref: "#/components/responses/Unauthorized" }
        "403": { $ref: "#/components/responses/Forbidden" }

  /clubs/{clubId}/scoring-questions/preview:
    post:
      tags: [Scoring Questions]
      summary: Dry-run a scoring-question import sheet
      description: >-
        super_admin and admin only. Parses and validates a CSV or XLSX file
        without writing anything. Expected columns: question (required), type
        (required — yesno | rating | text) and category (optional). Returns valid
        rows, per-row errors, and a count of rows whose label already exists in
        the club bank.
      security: [{ bearerAuth: [] }]
      parameters:
        - { name: clubId, in: path, required: true, schema: { type: string } }
      requestBody:
        required: true
        content:
          multipart/form-data:
            schema:
              type: object
              properties:
                file: { type: string, format: binary }
              required: [file]
      responses:
        "200":
          description: Preview result
          content:
            application/json:
              schema:
                allOf:
                  - { $ref: "#/components/schemas/SuccessResponse" }
                  - type: object
                    properties:
                      data: { $ref: "#/components/schemas/ScoringQuestionPreview" }
        "400":
          description: Bad request (empty file, unsupported type, etc.)
          content:
            application/json:
              schema: { $ref: "#/components/schemas/ErrorResponse" }
        "401": { $ref: "#/components/responses/Unauthorized" }
        "403": { $ref: "#/components/responses/Forbidden" }

  /clubs/{clubId}/scoring-questions/import:
    post:
      tags: [Scoring Questions]
      summary: Import scoring questions into a club's bank (append only)
      description: >-
        super_admin and admin only. Adds questions not already present in the
        club bank; duplicates (matched case/whitespace-insensitively by question
        text, against the bank and within the file) are skipped.
      security: [{ bearerAuth: [] }]
      parameters:
        - { name: clubId, in: path, required: true, schema: { type: string } }
      requestBody:
        required: true
        content:
          multipart/form-data:
            schema:
              type: object
              properties:
                file: { type: string, format: binary }
              required: [file]
      responses:
        "201":
          description: Import completed
          content:
            application/json:
              schema:
                allOf:
                  - { $ref: "#/components/schemas/SuccessResponse" }
                  - type: object
                    properties:
                      data: { $ref: "#/components/schemas/ScoringQuestionImportResult" }
        "400":
          description: Bad request (empty file, unsupported type, etc.)
          content:
            application/json:
              schema: { $ref: "#/components/schemas/ErrorResponse" }
        "401": { $ref: "#/components/responses/Unauthorized" }
        "403": { $ref: "#/components/responses/Forbidden" }

  /clubs/{clubId}/scoring-questions/bulk:
    delete:
      tags: [Scoring Questions]
      summary: Remove several scoring questions from a club's bank
      description: super_admin and admin only. Soft-deletes the given questions.
      security: [{ bearerAuth: [] }]
      parameters:
        - { name: clubId, in: path, required: true, schema: { type: string } }
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [ids]
              properties:
                ids:
                  type: array
                  minItems: 1
                  maxItems: 100
                  items: { type: string }
      responses:
        "200":
          description: Number of questions removed
          content:
            application/json:
              schema:
                allOf:
                  - { $ref: "#/components/schemas/SuccessResponse" }
                  - type: object
                    properties:
                      data:
                        type: object
                        properties:
                          deleted: { type: integer, example: 3 }
        "401": { $ref: "#/components/responses/Unauthorized" }
        "403": { $ref: "#/components/responses/Forbidden" }

  /clubs/{clubId}/scoring-questions/{questionId}:
    delete:
      tags: [Scoring Questions]
      summary: Remove a scoring question from a club's bank
      description: super_admin and admin only. Soft-deletes the question.
      security: [{ bearerAuth: [] }]
      parameters:
        - { name: clubId, in: path, required: true, schema: { type: string } }
        - { name: questionId, in: path, required: true, schema: { type: string } }
      responses:
        "200":
          description: Removed
          content:
            application/json:
              schema: { $ref: "#/components/schemas/SuccessResponse" }
        "401": { $ref: "#/components/responses/Unauthorized" }
        "403": { $ref: "#/components/responses/Forbidden" }
        "404":
          description: Question not found
          content:
            application/json:
              schema: { $ref: "#/components/schemas/ErrorResponse" }

  /tryouts/{id}/segment-questions:
    get:
      tags: [Scoring Questions]
      summary: Get the scoring questions each segment is evaluated against
      description: >-
        Returns every segment of the tryout with the club-bank evaluation
        questions it is scored against (empty array when unset). Readable by any
        staff member.
      security: [{ bearerAuth: [] }]
      parameters:
        - { name: id, in: path, required: true, schema: { type: string } }
      responses:
        "200":
          description: Segment question selections
          content:
            application/json:
              schema:
                allOf:
                  - { $ref: "#/components/schemas/SuccessResponse" }
                  - type: object
                    properties:
                      data:
                        type: array
                        items: { $ref: "#/components/schemas/TryoutSegmentQuestions" }
        "401": { $ref: "#/components/responses/Unauthorized" }
        "403": { $ref: "#/components/responses/Forbidden" }
        "404":
          description: Tryout not found
          content:
            application/json:
              schema: { $ref: "#/components/schemas/ErrorResponse" }
    put:
      tags: [Scoring Questions]
      summary: Replace the scoring-question selection for every segment
      description: >-
        super_admin and admin only. Replaces the whole selection for the tryout.
        Every segment must belong to the tryout and every question must belong to
        the tryout's club.
      security: [{ bearerAuth: [] }]
      parameters:
        - { name: id, in: path, required: true, schema: { type: string } }
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [segments]
              properties:
                segments:
                  type: array
                  items:
                    type: object
                    required: [segmentId, questionIds]
                    properties:
                      segmentId: { type: string, example: "8&U" }
                      questionIds:
                        type: array
                        items: { type: string }
      responses:
        "200":
          description: Selection saved
          content:
            application/json:
              schema:
                allOf:
                  - { $ref: "#/components/schemas/SuccessResponse" }
                  - type: object
                    properties:
                      data:
                        type: array
                        items: { $ref: "#/components/schemas/TryoutSegmentQuestions" }
        "400":
          description: A segment or question does not belong to this tryout/club
          content:
            application/json:
              schema: { $ref: "#/components/schemas/ErrorResponse" }
        "401": { $ref: "#/components/responses/Unauthorized" }
        "403": { $ref: "#/components/responses/Forbidden" }
```

> The existing docs use inline response bodies rather than `#/components/responses/*`. If this repo
> does **not** define `Unauthorized`/`Forbidden` response components, replace those two `$ref`s with
> the inline `401`/`403` blocks used in `tryouts.yaml`. Check first:
> `grep -n "components:" -A5 src/docs/*.yaml` and `grep -n "responses:" src/config/swagger.ts`.

- [ ] **Step 3: Verify the spec builds**

Run: `cd /home/amit/TRT/swimming-app/server && npx tsc --noEmit`
Then boot and check: `npm run dev` and open `http://localhost:5000/api-docs.json` — confirm the new
paths are present and there are no YAML parse errors.

- [ ] **Step 4: Commit**

```bash
git add server/src/config/swagger.ts server/src/docs/scoring-questions.yaml
git commit -m "docs(server): document scoring-question and segment-question endpoints"
```

---

## Phase 5 — Client

### Task 17: Scoring-question API module

**Files:** Create `client/src/lib/api/scoring-questions.api.ts`

**Interfaces produced:** `ScoringQuestionType`, `ScoringQuestion`, `ScoringQuestionPreview`,
`ScoringQuestionImportResult`, `scoringQuestionsApi`.

- [ ] **Step 1: Write the API module**

```ts
import { apiClient, api } from "./client";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ScoringQuestionType = "YESNO" | "RATING" | "TEXT";

/**
 * A club-wide evaluation question imported from a CSV/XLSX sheet. `type` selects
 * the answer control: YESNO (pass/fail), RATING (1–5) or TEXT.
 */
export interface ScoringQuestion {
  _id: string;
  clubId: string;
  category: string | null;
  sourceFileName: string | null;
  label: string;
  type: ScoringQuestionType;
  orderIndex: number;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface ScoringQuestionImportError {
  row: number;
  message: string;
}

export interface ParsedScoringQuestionRow {
  row: number;
  category: string | null;
  label: string;
  type: ScoringQuestionType;
}

export interface ScoringQuestionPreview {
  totalRows: number;
  valid: number;
  duplicates: number;
  errors: ScoringQuestionImportError[];
  rows: ParsedScoringQuestionRow[];
}

export interface ScoringQuestionImportResult {
  totalRows: number;
  created: number;
  skipped: number;
  questions: ScoringQuestion[];
  errors: ScoringQuestionImportError[];
}

// ─── API ──────────────────────────────────────────────────────────────────────

export const scoringQuestionsApi = {
  /** GET /clubs/:clubId/scoring-questions — the club bank, in display order. */
  list: (clubId: string): Promise<ScoringQuestion[]> =>
    api<ScoringQuestion[]>(apiClient.get(`/clubs/${clubId}/scoring-questions`)),

  /** GET /clubs/:clubId/scoring-questions/template — starter CSV. */
  template: async (clubId: string): Promise<Blob> => {
    const res = await apiClient.get(`/clubs/${clubId}/scoring-questions/template`, {
      responseType: "blob",
    });
    return res.data as Blob;
  },

  /** POST /clubs/:clubId/scoring-questions/preview — dry-run parse (writes nothing). */
  preview: (clubId: string, file: File): Promise<ScoringQuestionPreview> => {
    const formData = new FormData();
    formData.append("file", file);
    return api<ScoringQuestionPreview>(
      apiClient.post(`/clubs/${clubId}/scoring-questions/preview`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      }),
    );
  },

  /** POST /clubs/:clubId/scoring-questions/import — append-only import. */
  import: (clubId: string, file: File): Promise<ScoringQuestionImportResult> => {
    const formData = new FormData();
    formData.append("file", file);
    return api<ScoringQuestionImportResult>(
      apiClient.post(`/clubs/${clubId}/scoring-questions/import`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      }),
    );
  },

  /** DELETE /clubs/:clubId/scoring-questions/:questionId — soft delete. */
  remove: (clubId: string, questionId: string): Promise<null> =>
    api<null>(apiClient.delete(`/clubs/${clubId}/scoring-questions/${questionId}`)),

  /** DELETE /clubs/:clubId/scoring-questions/bulk — soft-delete several questions. */
  removeMany: (clubId: string, ids: string[]): Promise<{ deleted: number }> =>
    api<{ deleted: number }>(
      apiClient.delete(`/clubs/${clubId}/scoring-questions/bulk`, { data: { ids } }),
    ),
};
```

- [ ] **Step 2: Commit**

```bash
git add client/src/lib/api/scoring-questions.api.ts
git commit -m "feat(client): add scoring-questions API module"
```

### Task 18: Segment-questions methods on the tryout API

**Files:** Modify `client/src/lib/api/tryouts.api.ts`

- [ ] **Step 1: Add the import**

At the top, next to the existing `SelectedQuestion` import:

```ts
import type { ScoringQuestion } from "./scoring-questions.api";
```

- [ ] **Step 2: Add the types**

After the `Tryout` interface (or near `SelectedQuestion` usages):

```ts
/** The club-bank evaluation questions a single tryout segment is scored against. */
export interface TryoutSegmentQuestions {
  segmentId: string;
  questions: ScoringQuestion[];
}

/** A per-segment selection sent when saving. */
export interface SaveTryoutSegmentQuestionsInput {
  segmentId: string;
  questionIds: string[];
}
```

- [ ] **Step 3: Add the methods**

Inside the `tryoutsApi` object, after `saveRegistrationQuestions`:

```ts
  /**
   * GET /tryouts/:id/segment-questions
   * Returns each segment with the club-bank questions it is scored against.
   */
  getSegmentQuestions: (id: string): Promise<TryoutSegmentQuestions[]> =>
    api<TryoutSegmentQuestions[]>(apiClient.get(`/tryouts/${id}/segment-questions`)),

  /**
   * PUT /tryouts/:id/segment-questions
   * Replaces every segment's question selection.
   */
  saveSegmentQuestions: (
    id: string,
    segments: SaveTryoutSegmentQuestionsInput[],
  ): Promise<TryoutSegmentQuestions[]> =>
    api<TryoutSegmentQuestions[]>(
      apiClient.put(`/tryouts/${id}/segment-questions`, { segments }),
    ),
```

- [ ] **Step 4: Verify typecheck**

Run: `cd /home/amit/TRT/swimming-app/client && npm run build` (or `npx tsc -b --noEmit`)
Expected: exit 0.

- [ ] **Step 5: Commit**

```bash
git add client/src/lib/api/tryouts.api.ts
git commit -m "feat(client): add tryout segment-questions API methods"
```

### Task 19: Query + mutation hooks

**Files:** Create `client/src/hooks/use-scoring-questions.ts`

**Interfaces produced:** `scoringQuestionKeys`; `useScoringQuestionBankQuery`,
`useSegmentQuestionsQuery`, `useScoringQuestionPreviewMutation`,
`useScoringQuestionImportMutation`, `useDeleteScoringQuestionMutation`,
`useDeleteScoringQuestionsMutation`, `useSaveSegmentQuestionsMutation`,
`useDownloadScoringQuestionTemplateMutation`.

- [ ] **Step 1: Write the hooks**

```ts
/**
 * Scoring-question hooks
 *
 * useScoringQuestionBankQuery(clubId)   → GET /clubs/:clubId/scoring-questions
 * useSegmentQuestionsQuery(tryoutId)    → GET /tryouts/:id/segment-questions
 * useScoringQuestionPreviewMutation()   → POST .../preview
 * useScoringQuestionImportMutation()    → POST .../import   + invalidate bank
 * useDeleteScoringQuestionMutation()    → DELETE .../:questionId + invalidate bank
 * useDeleteScoringQuestionsMutation()   → DELETE .../bulk + invalidate bank
 * useSaveSegmentQuestionsMutation()     → PUT /tryouts/:id/segment-questions
 * useDownloadScoringQuestionTemplateMutation() → GET .../template
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { scoringQuestionsApi } from "../lib/api/scoring-questions.api";
import {
  tryoutsApi,
  type SaveTryoutSegmentQuestionsInput,
} from "../lib/api/tryouts.api";
import { tryoutKeys } from "./use-tryouts";

// ─── Query keys ───────────────────────────────────────────────────────────────

export const scoringQuestionKeys = {
  bank: (clubId: string) => ["scoring-questions", clubId] as const,
  segmentQuestions: (tryoutId: string) =>
    ["tryouts", tryoutId, "segment-questions"] as const,
};

// ─── Queries ──────────────────────────────────────────────────────────────────

export function useScoringQuestionBankQuery(clubId: string | undefined) {
  return useQuery({
    queryKey: scoringQuestionKeys.bank(clubId ?? ""),
    queryFn: () => scoringQuestionsApi.list(clubId as string),
    enabled: !!clubId,
    staleTime: 60_000,
  });
}

export function useSegmentQuestionsQuery(tryoutId: string | undefined) {
  return useQuery({
    queryKey: scoringQuestionKeys.segmentQuestions(tryoutId ?? ""),
    queryFn: () => tryoutsApi.getSegmentQuestions(tryoutId as string),
    enabled: !!tryoutId,
    staleTime: 60_000,
  });
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export function useScoringQuestionPreviewMutation(clubId: string) {
  return useMutation({
    mutationFn: (file: File) => scoringQuestionsApi.preview(clubId, file),
  });
}

export function useScoringQuestionImportMutation(clubId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => scoringQuestionsApi.import(clubId, file),
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: scoringQuestionKeys.bank(clubId) });
      const skipped =
        result.skipped > 0
          ? ` (${result.skipped} duplicate${result.skipped === 1 ? "" : "s"} skipped)`
          : "";
      toast.success(
        `Imported ${result.created} question${result.created === 1 ? "" : "s"}${skipped}.`,
      );
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : "Failed to import questions."),
  });
}

export function useDeleteScoringQuestionMutation(clubId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (questionId: string) => scoringQuestionsApi.remove(clubId, questionId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: scoringQuestionKeys.bank(clubId) });
      toast.success("Question removed.");
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : "Failed to remove question."),
  });
}

export function useDeleteScoringQuestionsMutation(clubId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ids: string[]) => scoringQuestionsApi.removeMany(clubId, ids),
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: scoringQuestionKeys.bank(clubId) });
      toast.success(
        `Removed ${result.deleted} question${result.deleted === 1 ? "" : "s"} from the bank.`,
      );
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : "Failed to remove questions."),
  });
}

export function useSaveSegmentQuestionsMutation(tryoutId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (segments: SaveTryoutSegmentQuestionsInput[]) =>
      tryoutsApi.saveSegmentQuestions(tryoutId, segments),
    onSuccess: (data) => {
      qc.setQueryData(scoringQuestionKeys.segmentQuestions(tryoutId), data);
      qc.invalidateQueries({ queryKey: tryoutKeys.detail(tryoutId) });
      toast.success("Segment questions saved.");
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : "Failed to save segment questions."),
  });
}

export function useDownloadScoringQuestionTemplateMutation() {
  return useMutation({
    mutationFn: (clubId: string) => scoringQuestionsApi.template(clubId),
  });
}
```

- [ ] **Step 2: Verify typecheck**

Run: `cd /home/amit/TRT/swimming-app/client && npx tsc -b --noEmit`
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add client/src/hooks/use-scoring-questions.ts
git commit -m "feat(client): add scoring-question hooks"
```

### Task 20: `QuestionTypeIndicator`

**Files:** Create `client/src/routes/_app/tryout-view/questions/QuestionTypeIndicator.tsx`

- [ ] **Step 1: Write the component**

```tsx
import { Badge } from "@/components/ui/badge";
import type { ScoringQuestion } from "@/lib/api/scoring-questions.api";

/** Read-only type indicator: YESNO/RATING show both pills, the active one filled. */
export function QuestionTypeIndicator({ type }: { type: ScoringQuestion["type"] }) {
  if (type === "TEXT") {
    return (
      <Badge variant="outline" className="whitespace-nowrap text-[10px] font-normal">
        Text
      </Badge>
    );
  }
  const isYesNo = type === "YESNO";
  return (
    <div className="inline-flex shrink-0 items-center gap-1">
      <Badge
        variant={isYesNo ? "default" : "outline"}
        className="whitespace-nowrap text-[10px] font-normal"
      >
        Y/N
      </Badge>
      <Badge
        variant={isYesNo ? "outline" : "default"}
        className="whitespace-nowrap text-[10px] font-normal"
      >
        1-5
      </Badge>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add client/src/routes/_app/tryout-view/questions/QuestionTypeIndicator.tsx
git commit -m "feat(client): add question type indicator"
```

### Task 21: `QuestionsDropzone` (empty state)

**Files:** Create `client/src/routes/_app/tryout-view/questions/QuestionsDropzone.tsx`

- [ ] **Step 1: Write the component**

```tsx
import { useState, type DragEvent } from "react";
import { Download, FileSpreadsheet, Loader2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface QuestionsDropzoneProps {
  onSelectFile: (file: File) => void;
  onPickFile: () => void;
  onDownloadTemplate: () => void;
  isPreviewing: boolean;
  isDownloading: boolean;
  error: string | null;
}

/** Empty-state uploader shown when the club question bank has no questions. */
export function QuestionsDropzone({
  onSelectFile,
  onPickFile,
  onDownloadTemplate,
  isPreviewing,
  isDownloading,
  error,
}: QuestionsDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false);

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);
    const file = event.dataTransfer.files?.[0];
    if (file) onSelectFile(file);
  }

  return (
    <div className="space-y-4">
      <div
        onDrop={onDrop}
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={(event) => {
          event.preventDefault();
          setIsDragging(false);
        }}
        className={cn(
          "rounded-xl border-2 border-dashed px-6 py-14 text-center transition-colors",
          isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/25",
        )}
      >
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
          <FileSpreadsheet className="h-7 w-7" />
        </div>
        <h2 className="mt-4 text-xl font-semibold">Drop your CSV or Excel file here</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Upload your file to get started, or browse from your device.
        </p>
        <Button className="mt-5" onClick={onPickFile} disabled={isPreviewing}>
          {isPreviewing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Upload className="h-4 w-4" />
          )}
          Choose file
        </Button>
        <p className="mt-3 text-sm text-muted-foreground">or drag and drop · .csv, .xlsx, .xls</p>
        {error && (
          <p role="alert" className="mt-3 text-sm text-destructive">
            {error}
          </p>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-muted/50 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-background text-primary">
            <FileSpreadsheet className="h-5 w-5" />
          </div>
          <div>
            <p className="font-semibold">Download CSV template</p>
            <p className="text-sm text-muted-foreground">
              A ready-made file with the required columns and example rows.
            </p>
          </div>
        </div>
        <Button variant="outline" onClick={onDownloadTemplate} disabled={isDownloading}>
          {isDownloading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
          Download
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add client/src/routes/_app/tryout-view/questions/QuestionsDropzone.tsx
git commit -m "feat(client): add questions dropzone empty state"
```

### Task 22: `AddToGroupsDialog`

**Files:** Create `client/src/routes/_app/tryout-view/questions/AddToGroupsDialog.tsx`

- [ ] **Step 1: Write the component**

```tsx
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Segment } from "@/lib/api/tryouts.api";

interface AddToGroupsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  questionCount: number;
  segments: Segment[];
  countsBySegment: Record<string, number>;
  onSave: (segmentIds: string[]) => void;
  isSaving: boolean;
}

/** Assigns the selected bank questions to one or more of the tryout's age groups. */
export function AddToGroupsDialog({
  open,
  onOpenChange,
  questionCount,
  segments,
  countsBySegment,
  onSave,
  isSaving,
}: AddToGroupsDialogProps) {
  const [checked, setChecked] = useState<Set<string>>(new Set());

  function handleOpenChange(next: boolean) {
    if (!next) setChecked(new Set());
    if (!isSaving) onOpenChange(next);
  }

  function toggle(segmentId: string) {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(segmentId)) next.delete(segmentId);
      else next.add(segmentId);
      return next;
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            Add {questionCount} question{questionCount === 1 ? "" : "s"} to…
          </DialogTitle>
          <DialogDescription>Choose one or more age groups.</DialogDescription>
        </DialogHeader>

        {segments.length === 0 ? (
          <p className="py-4 text-sm text-muted-foreground">
            This tryout has no age groups yet. Add segments in the wizard first.
          </p>
        ) : (
          <ul className="space-y-1 py-2">
            {segments.map((segment) => {
              const key = segment.id ?? segment.name;
              const count = countsBySegment[key] ?? 0;
              return (
                <li key={key}>
                  <label className="flex cursor-pointer items-center justify-between gap-3 rounded-lg px-3 py-2.5 hover:bg-muted/50">
                    <span className="flex items-center gap-3">
                      <Checkbox
                        checked={checked.has(key)}
                        onCheckedChange={() => toggle(key)}
                      />
                      <span className="font-medium">{segment.name}</span>
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {count} question{count === 1 ? "" : "s"}
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={() => onSave([...checked])} disabled={isSaving || checked.size === 0}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add client/src/routes/_app/tryout-view/questions/AddToGroupsDialog.tsx
git commit -m "feat(client): add add-to-groups dialog"
```

### Task 23: `ManageBankDialog`

**Files:** Create `client/src/routes/_app/tryout-view/questions/ManageBankDialog.tsx`

- [ ] **Step 1: Write the component**

```tsx
import { useState } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ScoringQuestion } from "@/lib/api/scoring-questions.api";
import { QuestionTypeIndicator } from "./QuestionTypeIndicator";

interface ManageBankDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  questions: ScoringQuestion[];
  onDelete: (ids: string[]) => void;
  isDeleting: boolean;
}

/** Secondary affordance: multi-select and delete questions from the club-wide bank. */
export function ManageBankDialog({
  open,
  onOpenChange,
  questions,
  onDelete,
  isDeleting,
}: ManageBankDialogProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  function handleOpenChange(next: boolean) {
    if (!next) setSelectedIds(new Set());
    if (!isDeleting) onOpenChange(next);
  }

  function toggle(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  // Ignore ids that no longer exist (e.g. after a delete refetch).
  const selected = questions
    .filter((question) => selectedIds.has(question._id))
    .map((question) => question._id);
  const allSelected = questions.length > 0 && selected.length === questions.length;
  const someSelected = selected.length > 0 && !allSelected;

  function toggleAll() {
    setSelectedIds(allSelected ? new Set() : new Set(questions.map((q) => q._id)));
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Manage question bank</DialogTitle>
          <DialogDescription>
            Delete questions from the club bank. This removes them from every tryout that uses them.
          </DialogDescription>
        </DialogHeader>

        {questions.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">The bank is empty.</p>
        ) : (
          <div className="overflow-hidden rounded-lg border">
            <div className="max-h-80 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      <Checkbox
                        checked={allSelected ? true : someSelected ? "indeterminate" : false}
                        onCheckedChange={toggleAll}
                        aria-label="Select all questions"
                      />
                    </TableHead>
                    <TableHead>Question</TableHead>
                    <TableHead className="w-28 whitespace-nowrap">Type</TableHead>
                    <TableHead className="w-52 whitespace-nowrap">Category</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {questions.map((question) => {
                    const isSelected = selectedIds.has(question._id);
                    return (
                      <TableRow key={question._id} data-state={isSelected ? "selected" : undefined}>
                        <TableCell>
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggle(question._id)}
                            aria-label={`Select ${question.label}`}
                          />
                        </TableCell>
                        <TableCell className="font-medium">{question.label}</TableCell>
                        <TableCell>
                          <QuestionTypeIndicator type={question.type} />
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-muted-foreground">
                          {question.category ?? "—"}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-sm text-muted-foreground">
            {selected.length > 0
              ? `${selected.length} selected`
              : `${questions.length} question${questions.length === 1 ? "" : "s"}`}
          </span>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={isDeleting}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => onDelete(selected)}
              disabled={isDeleting || selected.length === 0}
            >
              {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              Delete{selected.length > 0 ? ` ${selected.length}` : ""}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add client/src/routes/_app/tryout-view/questions/ManageBankDialog.tsx
git commit -m "feat(client): add manage-bank dialog"
```

### Task 24: `QuestionsTable` (populated state)

**Files:** Create `client/src/routes/_app/tryout-view/questions/QuestionsTable.tsx`

- [ ] **Step 1: Write the component**

```tsx
import { Upload, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ScoringQuestion } from "@/lib/api/scoring-questions.api";
import type { Segment } from "@/lib/api/tryouts.api";
import { QuestionTypeIndicator } from "./QuestionTypeIndicator";

interface QuestionsTableProps {
  questions: ScoringQuestion[];
  segments: Segment[];
  assignment: Map<string, Set<string>>;
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onToggleAll: () => void;
  onRemoveQuestion: (id: string) => void;
  onAddToGroups: () => void;
  onRemoveSelected: () => void;
  onRemoveAll: () => void;
  onUploadMore: () => void;
  onManageBank: () => void;
  isSaving: boolean;
}

/** The populated Scoring questions tab: bank questions with their age-group assignments. */
export function QuestionsTable({
  questions,
  segments,
  assignment,
  selectedIds,
  onToggleSelect,
  onToggleAll,
  onRemoveQuestion,
  onAddToGroups,
  onRemoveSelected,
  onRemoveAll,
  onUploadMore,
  onManageBank,
  isSaving,
}: QuestionsTableProps) {
  const allSelected = questions.length > 0 && selectedIds.size === questions.length;
  const someSelected = selectedIds.size > 0 && !allSelected;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold">Uploaded questions</h2>
          <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              {questions.length} ready
            </span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onUploadMore} disabled={isSaving}>
            <Upload className="h-4 w-4" /> Upload more
          </Button>
          <Button variant="ghost" size="sm" onClick={onRemoveAll} disabled={isSaving}>
            Remove all
          </Button>
          <Button variant="ghost" size="sm" onClick={onManageBank}>
            Manage bank
          </Button>
        </div>
      </div>

      {selectedIds.size > 0 && (
        <div className="flex items-center justify-between gap-3 rounded-lg bg-primary/10 px-4 py-2">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium">{selectedIds.size} selected</span>
            <Button size="sm" onClick={onAddToGroups} disabled={isSaving}>
              Add to groups…
            </Button>
          </div>
          <Button variant="destructive" size="sm" onClick={onRemoveSelected} disabled={isSaving}>
            Remove {selectedIds.size}
          </Button>
        </div>
      )}

      <div className="overflow-hidden rounded-lg border">
        <div className="max-h-[32rem] overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox
                    checked={allSelected ? true : someSelected ? "indeterminate" : false}
                    onCheckedChange={onToggleAll}
                    aria-label="Select all questions"
                  />
                </TableHead>
                <TableHead>Question</TableHead>
                <TableHead className="w-24 whitespace-nowrap">Type</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Added to age groups</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {questions.map((question) => {
                const segmentIds = assignment.get(question._id) ?? new Set<string>();
                const names = segments
                  .filter((segment) => segmentIds.has(segment.id ?? segment.name))
                  .map((segment) => segment.name);
                const isSelected = selectedIds.has(question._id);

                return (
                  <TableRow key={question._id} data-state={isSelected ? "selected" : undefined}>
                    <TableCell>
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => onToggleSelect(question._id)}
                        aria-label={`Select ${question.label}`}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{question.label}</TableCell>
                    <TableCell>
                      <QuestionTypeIndicator type={question.type} />
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {question.category ?? "—"}
                    </TableCell>
                    <TableCell>
                      {names.length === 0 ? (
                        <span className="text-muted-foreground">—</span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {names.map((name) => (
                            <Badge
                              key={name}
                              variant="outline"
                              className="border-primary/30 bg-primary/10 text-[10px] font-normal text-primary"
                            >
                              {name}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {segmentIds.size > 0 && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          onClick={() => onRemoveQuestion(question._id)}
                          disabled={isSaving}
                          aria-label={`Remove ${question.label} from this tryout`}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add client/src/routes/_app/tryout-view/questions/QuestionsTable.tsx
git commit -m "feat(client): add questions table"
```

### Task 25: `SegmentQuestionsTab` (orchestrator)

**Files:** Create `client/src/routes/_app/tryout-view/SegmentQuestionsTab.tsx`

**Interfaces consumed:** `tryout: Tryout` (needs `_id`, `clubId`, `segments`).

- [ ] **Step 1: Write the orchestrator**

```tsx
import { useMemo, useRef, useState, type ChangeEvent } from "react";
import { Loader2, Upload } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  useDeleteScoringQuestionsMutation,
  useDownloadScoringQuestionTemplateMutation,
  useSaveSegmentQuestionsMutation,
  useScoringQuestionBankQuery,
  useScoringQuestionImportMutation,
  useScoringQuestionPreviewMutation,
  useSegmentQuestionsQuery,
} from "@/hooks/use-scoring-questions";
import type { ScoringQuestionPreview } from "@/lib/api/scoring-questions.api";
import type { Tryout } from "@/lib/api/tryouts.api";
import { QuestionsDropzone } from "./questions/QuestionsDropzone";
import { QuestionsTable } from "./questions/QuestionsTable";
import { AddToGroupsDialog } from "./questions/AddToGroupsDialog";
import { ManageBankDialog } from "./questions/ManageBankDialog";

const ACCEPTED_EXTENSIONS = [".csv", ".xlsx", ".xls"];
const MAX_FILE_SIZE = 10 * 1024 * 1024;

const TYPE_LABEL = {
  YESNO: "Yes / No",
  RATING: "Rate 1–5",
  TEXT: "Text",
} as const;

function validateSheetFile(file: File): string | null {
  const ext = "." + (file.name.split(".").pop()?.toLowerCase() ?? "");
  if (!ACCEPTED_EXTENSIONS.includes(ext)) {
    return `File type ${ext} is not supported. Please upload a CSV or Excel file.`;
  }
  if (file.size > MAX_FILE_SIZE) {
    return `File size exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit.`;
  }
  return null;
}

/** Question-centric view of the club bank, with per-tryout age-group assignment. */
export function SegmentQuestionsTab({ tryout }: { tryout: Tryout }) {
  const clubId = tryout.clubId;
  const segments = tryout.segments ?? [];

  const { data: bank = [], isLoading: bankLoading } = useScoringQuestionBankQuery(clubId);
  const { data: segmentQuestions = [], isLoading: selectionsLoading } =
    useSegmentQuestionsQuery(tryout._id);

  const previewMutation = useScoringQuestionPreviewMutation(clubId);
  const importMutation = useScoringQuestionImportMutation(clubId);
  const removeFromBankMutation = useDeleteScoringQuestionsMutation(clubId);
  const saveMutation = useSaveSegmentQuestionsMutation(tryout._id);
  const templateMutation = useDownloadScoringQuestionTemplateMutation();

  const assignment = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const entry of segmentQuestions) {
      for (const question of entry.questions) {
        const set = map.get(question._id) ?? new Set<string>();
        set.add(entry.segmentId);
        map.set(question._id, set);
      }
    }
    return map;
  }, [segmentQuestions]);

  const countsBySegment = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const entry of segmentQuestions) counts[entry.segmentId] = entry.questions.length;
    return counts;
  }, [segmentQuestions]);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [addToGroupsOpen, setAddToGroupsOpen] = useState(false);
  const [manageBankOpen, setManageBankOpen] = useState(false);
  const [pendingRemoval, setPendingRemoval] = useState<string[] | null>(null);
  const [pendingBankRemoval, setPendingBankRemoval] = useState<string[] | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ScoringQuestionPreview | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);

  function pickFile() {
    fileInputRef.current?.click();
  }

  function handleFileInputChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) handleSelectFile(file);
  }

  function handleSelectFile(file: File) {
    const error = validateSheetFile(file);
    if (error) {
      setFileError(error);
      return;
    }
    setFileError(null);
    setPendingFile(file);
    previewMutation.mutate(file, {
      onSuccess: (data) => {
        setPreview(data);
        setPreviewOpen(true);
      },
      onError: (err) =>
        setFileError(err instanceof Error ? err.message : "Failed to read the file."),
    });
  }

  function confirmImport() {
    if (!pendingFile) return;
    importMutation.mutate(pendingFile, {
      onSuccess: () => {
        setPreviewOpen(false);
        setPendingFile(null);
        setPreview(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
      },
    });
  }

  function downloadTemplate() {
    templateMutation.mutate(clubId, {
      onSuccess: (blob) => {
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = "scoring-questions-template.csv";
        document.body.appendChild(anchor);
        anchor.click();
        document.body.removeChild(anchor);
        URL.revokeObjectURL(url);
      },
    });
  }

  function persist(next: Map<string, Set<string>>) {
    saveMutation.mutate(
      segments.map((segment) => {
        const key = segment.id ?? segment.name;
        return {
          segmentId: key,
          questionIds: bank
            .filter((question) => next.get(question._id)?.has(key))
            .map((question) => question._id),
        };
      }),
    );
  }

  function addSelectedToSegments(segmentIds: string[]) {
    const next = new Map(assignment);
    for (const id of selectedIds) {
      const set = new Set(next.get(id) ?? []);
      for (const segmentId of segmentIds) set.add(segmentId);
      next.set(id, set);
    }
    persist(next);
    setAddToGroupsOpen(false);
    setSelectedIds(new Set());
  }

  function unassign(questionIds: string[]) {
    const next = new Map(assignment);
    for (const id of questionIds) next.delete(id);
    persist(next);
    setPendingRemoval(null);
    setSelectedIds(new Set());
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    setSelectedIds((prev) =>
      prev.size === bank.length ? new Set() : new Set(bank.map((question) => question._id)),
    );
  }

  if (bankLoading || selectionsLoading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading…
      </div>
    );
  }

  const isBusy = previewMutation.isPending || importMutation.isPending;

  return (
    <div className="space-y-5 p-5">
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,.xlsx,.xls"
        className="hidden"
        onChange={handleFileInputChange}
      />

      {bank.length === 0 ? (
        <QuestionsDropzone
          onSelectFile={handleSelectFile}
          onPickFile={pickFile}
          onDownloadTemplate={downloadTemplate}
          isPreviewing={isBusy}
          isDownloading={templateMutation.isPending}
          error={fileError}
        />
      ) : (
        <QuestionsTable
          questions={bank}
          segments={segments}
          assignment={assignment}
          selectedIds={selectedIds}
          onToggleSelect={toggleSelect}
          onToggleAll={toggleSelectAll}
          onRemoveQuestion={(id) => setPendingRemoval([id])}
          onAddToGroups={() => setAddToGroupsOpen(true)}
          onRemoveSelected={() => setPendingRemoval([...selectedIds])}
          onRemoveAll={() => setPendingRemoval(bank.map((question) => question._id))}
          onUploadMore={pickFile}
          onManageBank={() => setManageBankOpen(true)}
          isSaving={saveMutation.isPending}
        />
      )}

      <AddToGroupsDialog
        open={addToGroupsOpen}
        onOpenChange={setAddToGroupsOpen}
        questionCount={selectedIds.size}
        segments={segments}
        countsBySegment={countsBySegment}
        onSave={addSelectedToSegments}
        isSaving={saveMutation.isPending}
      />

      <ManageBankDialog
        open={manageBankOpen}
        onOpenChange={setManageBankOpen}
        questions={bank}
        onDelete={(ids) => setPendingBankRemoval(ids)}
        isDeleting={removeFromBankMutation.isPending}
      />

      <AlertDialog
        open={pendingBankRemoval !== null}
        onOpenChange={(next) => !next && setPendingBankRemoval(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingBankRemoval && pendingBankRemoval.length > 1
                ? `Delete ${pendingBankRemoval.length} questions from the bank?`
                : "Delete question from the bank?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              This removes them from the club bank everywhere, including other tryouts that use
              them. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={removeFromBankMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={removeFromBankMutation.isPending}
              onClick={() => {
                if (!pendingBankRemoval) return;
                removeFromBankMutation.mutate(pendingBankRemoval, {
                  onSuccess: () => {
                    setPendingBankRemoval(null);
                    setManageBankOpen(false);
                  },
                });
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={pendingRemoval !== null}
        onOpenChange={(next) => !next && setPendingRemoval(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingRemoval && pendingRemoval.length > 1
                ? `Remove ${pendingRemoval.length} questions?`
                : "Remove question?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              This only removes them from this tryout's age groups. The questions stay in the club
              bank.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saveMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={saveMutation.isPending}
              onClick={() => pendingRemoval && unassign(pendingRemoval)}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog
        open={previewOpen}
        onOpenChange={(next) => !importMutation.isPending && setPreviewOpen(next)}
      >
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Import preview</DialogTitle>
            <DialogDescription>
              Review the sheet before adding questions to the club bank. Duplicates are skipped.
            </DialogDescription>
          </DialogHeader>

          {preview && (
            <div className="space-y-3 py-2">
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">{preview.totalRows} row(s)</Badge>
                <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700">
                  {preview.valid} new
                </Badge>
                <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700">
                  {preview.duplicates} duplicate(s)
                </Badge>
                {preview.errors.length > 0 && (
                  <Badge variant="outline" className="border-rose-200 bg-rose-50 text-rose-700">
                    {preview.errors.length} error(s)
                  </Badge>
                )}
              </div>

              {preview.rows.length > 0 && (
                <ul className="max-h-56 space-y-1 overflow-auto rounded-lg border p-2 text-sm">
                  {preview.rows.map((row) => (
                    <li key={row.row} className="flex items-center justify-between gap-2 px-1">
                      <span className="min-w-0 truncate">{row.label}</span>
                      <Badge variant="outline" className="shrink-0 text-[10px] font-normal">
                        {TYPE_LABEL[row.type]}
                      </Badge>
                    </li>
                  ))}
                </ul>
              )}

              {preview.errors.length > 0 && (
                <ul className="max-h-40 space-y-1 overflow-auto rounded-lg border border-rose-200 bg-rose-50/50 p-2 text-xs text-rose-700">
                  {preview.errors.map((error) => (
                    <li key={`${error.row}-${error.message}`}>
                      Row {error.row}: {error.message}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setPreviewOpen(false)}
              disabled={importMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={confirmImport}
              disabled={importMutation.isPending || !preview || preview.valid === 0}
            >
              {importMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              Import {preview?.valid ?? 0} question{preview?.valid === 1 ? "" : "s"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
```

- [ ] **Step 2: Verify typecheck**

Run: `cd /home/amit/TRT/swimming-app/client && npx tsc -b --noEmit`
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add client/src/routes/_app/tryout-view/SegmentQuestionsTab.tsx
git commit -m "feat(client): add scoring questions tab orchestrator"
```

### Task 26: Register the tab

**Files:** Modify `client/src/routes/_app/tryouts.view.$id.tsx`

- [ ] **Step 1: Import the tab**

Add after the `CommsTab` import (line 14):

```ts
import { SegmentQuestionsTab } from "./tryout-view/SegmentQuestionsTab";
```

- [ ] **Step 2: Add the tab to `TABS`**

Inside the `TABS` array, add an admin-only entry (the file already computes
`canManageCoaches` for `admin`/`super_admin`):

```ts
    ...(canManageCoaches ? [{ key: "questions", label: "Scoring questions" }] : []),
    ...(canManageCoaches ? [{ key: "comms", label: "Comms" }] : []),
```

- [ ] **Step 3: Render the tab**

In the content block, add:

```tsx
        {tab === "questions" && canManageCoaches && <SegmentQuestionsTab tryout={tryout} />}
```

- [ ] **Step 4: Verify**

Run: `cd /home/amit/TRT/swimming-app/client && npm run build`
Expected: exit 0.

- [ ] **Step 5: Commit**

```bash
git add client/src/routes/_app/tryouts.view.$id.tsx
git commit -m "feat(client): add Scoring questions tab to tryout dashboard"
```

---

## Phase 6 — Verification

### Task 27: End-to-end verification

- [ ] **Step 1: Build both packages**

```bash
cd /home/amit/TRT/swimming-app/server && npx tsc --noEmit
cd /home/amit/TRT/swimming-app/client && npm run build
```
Expected: both exit 0.

- [ ] **Step 2: Boot the server and smoke-test the API**

```bash
cd /home/amit/TRT/swimming-app/server && npm run dev
```

In another shell (replace `$TOKEN`, `$CLUB`, `$TRYOUT`):

```bash
# list (empty bank initially)
curl -s -H "Authorization: Bearer $TOKEN" \
  http://localhost:5000/api/v1/clubs/$CLUB/scoring-questions | jq

# template download
curl -s -H "Authorization: Bearer $TOKEN" \
  http://localhost:5000/api/v1/clubs/$CLUB/scoring-questions/template

# preview + import a CSV
printf 'category,question,type\nFreestyle,Bilateral breathing,yesno\nFreestyle,Legs straight,rating\n' > /tmp/q.csv
curl -s -H "Authorization: Bearer $TOKEN" -F "file=@/tmp/q.csv" \
  http://localhost:5000/api/v1/clubs/$CLUB/scoring-questions/preview | jq
curl -s -H "Authorization: Bearer $TOKEN" -F "file=@/tmp/q.csv" \
  http://localhost:5000/api/v1/clubs/$CLUB/scoring-questions/import | jq

# segment questions (empty selections for every segment)
curl -s -H "Authorization: Bearer $TOKEN" \
  http://localhost:5000/api/v1/tryouts/$TRYOUT/segment-questions | jq
```
Expected: preview reports `valid:2`, import `created:2`, and the GET returns one entry per segment.

- [ ] **Step 3: Manual UI flow (the acceptance test)**

Run `cd client && npm run dev`, log in as a club **admin**, open a tryout →
`/tryouts/view/:id?tab=questions`. Verify, in order:

1. **Empty state** — dashed dropzone, "Download CSV template" card, drag/drop + "Choose file".
2. Download the template → a CSV file downloads.
3. Choose/drop a CSV → **Import preview** dialog shows rows/valid/duplicates/errors; **Import N**
   disabled when `valid === 0`; confirming toasts and switches to the table.
4. **Populated table** — columns checkbox / Question / Type / Category / Added to age groups / ×;
   header shows "N ready" plus **Upload more**, **Remove all**, **Manage bank**.
5. Select rows → bulk bar appears → **Add to groups…** → tick one or more age groups → **Save** →
   toast "Segment questions saved." and the age-group badges appear in the table.
6. Row `×` / **Remove N** / **Remove all** → confirmation → unassign only (bank untouched).
7. **Manage bank** → select → **Delete N** → confirmation → question disappears from the table
   (and from other tryouts using it).
8. As a **coach**, the "Scoring questions" tab is not rendered.

- [ ] **Step 4: Final commit (if any cleanup remains)**

```bash
git add -A
git commit -m "chore: verify scoring questions tab port"
```

---

## Acceptance criteria

- [ ] A club admin can upload a CSV/XLSX of questions and see them in a question-centric table.
- [ ] Questions can be assigned to one or more age groups; assignments persist and render as badges.
- [ ] Removing an assignment does not delete from the club bank; deleting from the bank removes it
      everywhere (with confirmation).
- [ ] Coaches can read but not mutate; the tab is hidden for non-admins.
- [ ] All eight endpoints are documented in Swagger and the spec builds without YAML errors.
- [ ] Server and client both typecheck/build clean.

## Out of scope

- No tryout-scoping of questions (bank stays club-wide).
- No changes to the Scoring tab or how answers are stored (`registration.detailedScores`).
- No reordering/drag-and-drop of questions.
- No stable segment ids (segments keep the `id ?? name` key convention).
