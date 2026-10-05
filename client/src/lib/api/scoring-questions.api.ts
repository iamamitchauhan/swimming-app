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
